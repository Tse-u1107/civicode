import { getOrCreateChromaCollection } from "@/lib/chroma";
import { embedTextChunksWithGemini } from "@/lib/gemini";

type ParsedScopedInput = {
  municipality_name: string;
  state_abbr: string;
  query: string;
};

const US_STATE_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeStateToAbbr(rawState: string): string | null {
  const cleaned = rawState.trim();
  if (!cleaned) {
    return null;
  }

  if (/^[a-z]{2}$/i.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  const mapped = US_STATE_ABBR[cleaned.toLowerCase()];
  return mapped ?? null;
}

function parseScopedInput(message: string): ParsedScopedInput | null {
  const segments = message
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (segments.length !== 3) {
    return null;
  }

  const [municipality, state, query] = segments;
  if (!municipality || !state || !query) {
    return null;
  }

  const state_abbr = normalizeStateToAbbr(state);
  if (!state_abbr) {
    return null;
  }

  return {
    municipality_name: municipality,
    state_abbr,
    query,
  };
}

function isBasicGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup|what's up|howdy)[!. ]*$/.test(normalized);
}

function summarizeDocument(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 220) {
    return compact;
  }
  return `${compact.slice(0, 220).trimEnd()}...`;
}

function buildSourceTitle(metadata: Record<string, unknown>, fallbackIndex: number): string {
  const sectionTitle = typeof metadata.sectionTitle === "string" ? metadata.sectionTitle.trim() : "";
  const parentTitle = typeof metadata.parentTitle === "string" ? metadata.parentTitle.trim() : "";
  const sourcePath = typeof metadata.sourcePath === "string" ? metadata.sourcePath.trim() : "";
  const nodeId = typeof metadata.nodeId === "string" ? metadata.nodeId.trim() : "";

  if (sectionTitle && parentTitle) {
    return `${parentTitle} > ${sectionTitle}`;
  }
  if (sectionTitle) {
    return sectionTitle;
  }
  if (sourcePath) {
    return sourcePath;
  }
  if (nodeId) {
    return `Node ${nodeId}`;
  }
  return `Neighbor ${fallbackIndex + 1}`;
}

function toNearestNeighbors(queryResult: unknown) {
  const result = queryResult as {
    ids?: string[][];
    documents?: Array<Array<string | null> | null>;
    metadatas?: Array<Array<Record<string, unknown> | null> | null>;
    distances?: Array<Array<number | null> | null>;
  };

  const ids = Array.isArray(result.ids?.[0]) ? result.ids[0] : [];
  const documents = Array.isArray(result.documents?.[0]) ? result.documents[0] : [];
  const metadatas = Array.isArray(result.metadatas?.[0]) ? result.metadatas[0] : [];
  const distances = Array.isArray(result.distances?.[0]) ? result.distances[0] : [];

  return ids
    .map((id, index) => {
      const document = typeof documents[index] === "string" ? documents[index] : "";
      const metadata =
        metadatas[index] && typeof metadatas[index] === "object"
          ? (metadatas[index] as Record<string, unknown>)
          : {};
      const distance = typeof distances[index] === "number" ? distances[index] : null;
      return {
        id,
        title: buildSourceTitle(metadata, index),
        summary: summarizeDocument(document),
        distance,
      };
    })
    .filter((item) => item.summary.length > 0);
}

const MAX_NEIGHBORS = 3;
const STRONG_MATCH_DISTANCE = 0.9;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    if (isBasicGreeting(message)) {
      return Response.json({
        reply:
          "Hi! Ask a municipal code question and I will answer using stored vector knowledge. "
          + "Optional scoped format: Municipality, State, Query.",
        sources: [],
      });
    }

    const scopedInput = parseScopedInput(message);
    const queryText = scopedInput?.query ?? message;
    const vectors = await embedTextChunksWithGemini([queryText]);
    const queryEmbedding = vectors[0];
    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error("Could not create embedding for query.");
    }

    const where = scopedInput
      ? {
          $and: [
            { municipalityName: { $eq: scopedInput.municipality_name } },
            { stateAbbr: { $eq: scopedInput.state_abbr } },
          ],
        }
      : undefined;

    const collection = await getOrCreateChromaCollection();
    const queryResult = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: MAX_NEIGHBORS,
      where,
      include: ["documents", "metadatas", "distances"],
    });

    const neighbors = toNearestNeighbors(queryResult).slice(0, MAX_NEIGHBORS);
    const strongMatchExists = neighbors.some(
      (neighbor) => typeof neighbor.distance === "number" && neighbor.distance <= STRONG_MATCH_DISTANCE,
    );

    if (neighbors.length === 0 || !strongMatchExists) {
      const fallbackLines = neighbors.length
        ? neighbors.map((neighbor, index) => `${index + 1}. ${neighbor.title}: ${neighbor.summary}`)
        : ["1. No neighbors found in the current vector store."];

      return Response.json({
        reply: `I don't know, but here's what I have:\n${fallbackLines.join("\n")}`,
        sources: neighbors,
      });
    }

    const groundedLines = neighbors.map((neighbor, index) => `${index + 1}. ${neighbor.title}: ${neighbor.summary}`);
    return Response.json({
      reply: `Based on the nearest code entries:\n${groundedLines.join("\n")}`,
      sources: neighbors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
