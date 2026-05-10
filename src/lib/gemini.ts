import { FunctionCallingConfigMode, GoogleGenAI } from "@google/genai";
import { getTools } from "@/app/agent_functions/tools";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
const EMBED_MAX_RETRIES = 4;
const EMBED_MIN_DELAY_MS = 800;

type ChatTurn = {
  role: "user" | "agent";
  text: string;
};

export type ToolSource = {
  toolName: string;
  args: Record<string, unknown>;
  output: string;
};

export type PlannedToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type GroundedSource = {
  title: string;
  summary: string;
  distance: number | null;
};

type GeminiToolResult = {
  reply: string;
  sources: ToolSource[];
  toolCall: PlannedToolCall | null;
};

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error("Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  return key;
}

function getEmbeddingValues(response: unknown): number[] {
  if (!response || typeof response !== "object") {
    return [];
  }

  const firstLevel = response as Record<string, unknown>;
  if (Array.isArray(firstLevel.embeddings) && firstLevel.embeddings.length > 0) {
    const firstEmbedding = firstLevel.embeddings[0];
    if (firstEmbedding && typeof firstEmbedding === "object") {
      const embeddingObject = firstEmbedding as Record<string, unknown>;
      if (Array.isArray(embeddingObject.values)) {
        return embeddingObject.values.filter((value): value is number => typeof value === "number");
      }
    }
  }

  const candidate = firstLevel.embedding;
  if (candidate && typeof candidate === "object") {
    const candidateObject = candidate as Record<string, unknown>;
    if (Array.isArray(candidateObject.values)) {
      return candidateObject.values.filter((value): value is number => typeof value === "number");
    }
  }

  if (Array.isArray(firstLevel.values)) {
    return firstLevel.values.filter((value): value is number => typeof value === "number");
  }

  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryDelayMs(rawMessage: string): number | null {
  const retryInMatch = rawMessage.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (retryInMatch?.[1]) {
    return Math.ceil(Number.parseFloat(retryInMatch[1]) * 1000);
  }

  const retryDelayMatch = rawMessage.match(/"retryDelay":"(\d+)s"/i);
  if (retryDelayMatch?.[1]) {
    return Number.parseInt(retryDelayMatch[1], 10) * 1000;
  }

  return null;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429")
    || message.includes("RESOURCE_EXHAUSTED")
    || message.includes("quota");
}

async function embedWithRetry(ai: GoogleGenAI, chunk: string, chunkIndex: number): Promise<number[]> {
  let attempt = 0;
  let backoffMs = EMBED_MIN_DELAY_MS;

  while (attempt <= EMBED_MAX_RETRIES) {
    try {
      const response = await ai.models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: chunk,
      });
      const values = getEmbeddingValues(response);
      if (values.length === 0) {
        throw new Error(`Gemini embedding failed for chunk ${chunkIndex + 1}`);
      }
      return values;
    } catch (error) {
      attempt += 1;
      if (!isRateLimitError(error) || attempt > EMBED_MAX_RETRIES) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const retryFromApi = parseRetryDelayMs(message);
      const waitMs = Math.max(retryFromApi ?? backoffMs, EMBED_MIN_DELAY_MS);
      await sleep(waitMs);
      backoffMs *= 2;
    }
  }

  throw new Error(`Gemini embedding failed for chunk ${chunkIndex + 1}`);
}

export async function embedTextChunksWithGemini(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) {
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const vectors: number[][] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const vector = await embedWithRetry(ai, chunks[index], index);
    vectors.push(vector);
  }

  return vectors;
}

function buildConversationContents(history: ChatTurn[], message: string): any[] {
  const previousTurns: any[] = history.map((item) => ({
    role: item.role === "user" ? "user" : "model",
    parts: [{ text: item.text }],
  }));

  return [
    ...previousTurns,
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];
}

function getFunctionDeclarations() {
  return getTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: {
      type: tool.inputSchema.type,
      properties: tool.inputSchema.properties,
      required: tool.inputSchema.required,
    },
  }));
}

export async function generateGeminiReplyWithTools(message: string, history: ChatTurn[]): Promise<GeminiToolResult> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const declarations = getFunctionDeclarations();
  const allowedFunctionNames = declarations.map((item) => item.name).filter(Boolean) as string[];
  const contents: any[] = buildConversationContents(history, message);
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction:
        "You are a municipal code tool router. Use tools only to select the next function call. "
        + "Strict protocol: If a function call is required, emit exactly one function call and stop. "
        + "Do not answer the user's question yet. The server will reply with Continue?. "
        + "For municipal policy questions, prefer search_municipal_codes first unless node_id is already known.",
      tools: [{ functionDeclarations: declarations }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames,
        },
      },
    },
  });

  const responseParts =
    (response.candidates?.[0]?.content?.parts as Array<{
      functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
    }>) ?? [];

  const firstCall = responseParts.find((part) => !!part.functionCall)?.functionCall;
  if (firstCall?.name) {
    return {
      reply: "Continue?",
      sources: [],
      toolCall: {
        name: firstCall.name,
        args: firstCall.args ?? {},
      },
    };
  }

  const reply = (response.text ?? "").trim();
  return {
    reply: reply || "Please provide a municipality and state so I can choose the right tool.",
    sources: [],
    toolCall: null,
  };
}

export async function generateGroundedReply(params: {
  question: string;
  locationLabel: string;
  strongMatch: boolean;
  sources: GroundedSource[];
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const sourcesText = params.sources
    .slice(0, 6)
    .map((source, index) => {
      const distanceLabel = typeof source.distance === "number" ? source.distance.toFixed(4) : "n/a";
      return [
        `[${index + 1}] ${source.title}`,
        `Distance: ${distanceLabel}`,
        `Excerpt: ${source.summary}`,
      ].join("\n");
    })
    .join("\n\n");

  const confidenceInstruction = params.strongMatch
    ? "You have relevant matches. Answer directly and concisely from the provided excerpts."
    : "Matches are weak. Be explicit that confidence is low and ask the user to verify with full ordinance text.";

  const locationLine = params.locationLabel ? `Location scope: ${params.locationLabel}` : "Location scope: not specified";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Question:\n"
              + `${params.question}\n\n`
              + `${locationLine}\n\n`
              + "Retrieved municipal code excerpts:\n"
              + `${sourcesText}\n\n`
              + "Write a short answer (2-5 sentences). Include section titles inline when useful. "
              + "If excerpts are insufficient, say exactly what is missing. Do not invent rules.",
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "You are a municipal code assistant. Use only the provided excerpts as evidence. "
        + confidenceInstruction,
    },
  });

  const reply = (response.text ?? "").trim();
  if (!reply) {
    throw new Error("Empty grounded reply from Gemini.");
  }

  return reply;
}
