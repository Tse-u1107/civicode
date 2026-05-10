import {
  getCollectionNameForState,
  getExistingChromaCollection,
  getOrCreateChromaCollection,
} from "@/lib/chroma";
import { embedTextChunksWithGemini, generateGroundedReply } from "@/lib/gemini";

type ParsedScopedInput = {
  municipality: string;
  municipality_normalized: string;
  state: string;
  about: string;
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
  if (mapped) {
    return mapped;
  }

  const normalizedSegment = cleaned
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withoutLeadingLabel = normalizedSegment.replace(
    /^(?:the\s+)?(?:state|city|county|land|area|policy|code)\s+of\s+/,
    "",
  );

  const candidates = [normalizedSegment, withoutLeadingLabel];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const exact = US_STATE_ABBR[candidate];
    if (exact) {
      return exact;
    }

    for (const [stateName, stateAbbr] of Object.entries(US_STATE_ABBR)) {
      if (
        candidate === stateName
        || candidate.startsWith(`${stateName} `)
        || candidate.endsWith(` ${stateName}`)
        || candidate.includes(` ${stateName} `)
      ) {
        return stateAbbr;
      }
    }
  }

  return null;
}

function parseScopedInput(message: string): ParsedScopedInput | null {
  const trimmedMessage = message.trim();
  const segments = trimmedMessage
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (segments.length === 3) {
    const [municipality, state, query] = segments;
    if (!municipality || !state || !query) {
      return null;
    }

    const state_abbr = normalizeStateToAbbr(state);
    if (!state_abbr) {
      return null;
    }

    return {
      municipality,
      municipality_normalized: normalizeMunicipalityName(municipality),
      state: state_abbr,
      about: query,
    };
  }

  // Fallback: parse natural phrasing like:
  // - "in arkansas, arkadelphia"
  // - "of arkansas, bentonville"
  // - "for norfolk, virginia"
  const locationMatch = trimmedMessage.match(/\b(?:in|of|for)\s+([^?.!]+?)(?:[?.!]|$)/i);
  if (!locationMatch?.[1]) {
    return null;
  }

  const locationParts = locationMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (locationParts.length < 2) {
    return null;
  }

  const first = locationParts[0] ?? "";
  const second = locationParts[1] ?? "";
  const firstState = normalizeStateToAbbr(first);
  const secondState = normalizeStateToAbbr(second);

  if (firstState && !secondState) {
    return {
      municipality: second,
      municipality_normalized: normalizeMunicipalityName(second),
      state: firstState,
      about: trimmedMessage,
    };
  }

  if (secondState && !firstState) {
    return {
      municipality: first,
      municipality_normalized: normalizeMunicipalityName(first),
      state: secondState,
      about: trimmedMessage,
    };
  }

  return null;
}

type HistoryTurn = {
  role?: unknown;
  text?: unknown;
};

function parseMunicipalityOnlyFollowup(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const whatAboutMatch = trimmed.match(/^(?:what\s+about|how\s+about)\s+([^?.!]+)[?.!]*$/i);
  if (whatAboutMatch?.[1]) {
    return whatAboutMatch[1].trim();
  }

  return null;
}

function extractLastScopedState(history: HistoryTurn[]): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn?.role !== "user" || typeof turn.text !== "string") {
      continue;
    }
    const parsed = parseScopedInput(turn.text);
    if (parsed?.state) {
      return parsed.state;
    }
  }
  return null;
}

function extractExplicitScope(message: string, history: HistoryTurn[]): ParsedScopedInput | null {
  const parsedDirect = parseScopedInput(message);
  if (parsedDirect) {
    return parsedDirect;
  }

  const municipalityOnly = parseMunicipalityOnlyFollowup(message);
  if (!municipalityOnly) {
    return null;
  }

  const inferredState = extractLastScopedState(history);
  if (!inferredState) {
    return null;
  }

  return {
    state: inferredState,
    municipality: municipalityOnly,
    municipality_normalized: normalizeMunicipalityName(municipalityOnly),
    about: message.trim(),
  };
}

function normalizeMunicipalityName(rawMunicipality: string): string {
  return rawMunicipality
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
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

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

function buildLocationLabel(scopedInput: ParsedScopedInput | null): string {
  if (!scopedInput) {
    return "";
  }
  return `${toTitleCase(scopedInput.municipality)}, ${scopedInput.state}`;
}

function formatNeighborLine(neighbor: { title: string; summary: string }): string {
  const title = neighbor.title.trim();
  const summary = neighbor.summary.trim();
  if (!summary || summary === title) {
    return `- ${title}`;
  }
  return `- ${title}: ${summary}`;
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
        municipalityName:
          typeof metadata.municipalityName === "string" ? metadata.municipalityName : "",
        municipalityNameNormalized:
          typeof metadata.municipalityNameNormalized === "string" ? metadata.municipalityNameNormalized : "",
      };
    })
    .filter((item) => item.summary.length > 0);
}

function municipalityMatchesScope(
  neighbor: { municipalityName: string; municipalityNameNormalized: string },
  scopedInput: ParsedScopedInput,
): boolean {
  const candidate = neighbor.municipalityNameNormalized || normalizeMunicipalityName(neighbor.municipalityName);
  if (candidate === scopedInput.municipality_normalized) {
    return true;
  }

  // Backward-compatibility for legacy metadata values like
  // "city of arkadelphia" or "arkadelphia city".
  return candidate.includes(scopedInput.municipality_normalized)
    || scopedInput.municipality_normalized.includes(candidate);
}

const MAX_NEIGHBORS = 6;
const MAX_SCOPED_CANDIDATES = 24;
const STRONG_MATCH_DISTANCE = 0.9;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: unknown; history?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? (body.history as HistoryTurn[]) : [];

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

    const scopedInput = extractExplicitScope(message, history);
    const queryText = scopedInput?.about ?? message;
    const vectors = await embedTextChunksWithGemini([queryText]);
    const queryEmbedding = vectors[0];
    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error("Could not create embedding for query.");
    }

    const collection = scopedInput
      ? await getExistingChromaCollection(getCollectionNameForState(scopedInput.state))
      : await getOrCreateChromaCollection();

    if (scopedInput && !collection) {
      const location = buildLocationLabel(scopedInput);
      return Response.json({
        reply: `I do not have stored code data for ${location} yet. Please fetch it from the Retrieve page first.`,
        retrieveHref: "/retrieve",
        retrieveLabel: "Retrieve",
        sources: [],
      });
    }

    const queryCollection = collection as {
      query: (args: {
        queryEmbeddings: number[][];
        nResults: number;
        include: Array<"documents" | "metadatas" | "distances">;
        where?: Record<string, string>;
      }) => Promise<unknown>;
    };

    const queryResult = await queryCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: scopedInput ? MAX_SCOPED_CANDIDATES : MAX_NEIGHBORS,
      include: ["documents", "metadatas", "distances"],
      where: scopedInput
        ? { municipalityNameNormalized: scopedInput.municipality_normalized }
        : undefined,
    });

    let rawNeighbors = toNearestNeighbors(queryResult);

    // Compatibility fallback: older rows may miss municipalityNameNormalized.
    if (scopedInput && rawNeighbors.length === 0) {
      const fallbackResult = await queryCollection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: MAX_SCOPED_CANDIDATES,
        include: ["documents", "metadatas", "distances"],
      });
      rawNeighbors = toNearestNeighbors(fallbackResult);
    }

    const neighbors = scopedInput
      ? rawNeighbors
          .filter((neighbor) => municipalityMatchesScope(neighbor, scopedInput))
          .slice(0, MAX_NEIGHBORS)
      : rawNeighbors.slice(0, MAX_NEIGHBORS);

    if (scopedInput && neighbors.length === 0) {
      const location = buildLocationLabel(scopedInput);
      return Response.json({
        reply: `I could not find stored code entries for ${location} yet. Please fetch it from the Retrieve page first.`,
        retrieveHref: "/retrieve",
        retrieveLabel: "Retrieve",
        sources: [],
        parsedScope: {
          state: scopedInput.state,
          municipality: scopedInput.municipality,
          about: scopedInput.about,
        },
      });
    }

    const strongMatchExists = neighbors.some(
      (neighbor) => typeof neighbor.distance === "number" && neighbor.distance <= STRONG_MATCH_DISTANCE,
    );

    const location = buildLocationLabel(scopedInput);
    const fallbackLines = neighbors.length
      ? neighbors.map((neighbor) => formatNeighborLine(neighbor))
      : ["- No nearby entries found in the current vector store."];
    const fallbackReply = neighbors.length === 0 || !strongMatchExists
      ? (location
          ? `I could not find a strong match for ${location}, but these are the closest stored sections:\n${fallbackLines.join("\n")}`
          : `I could not find a strong match, but these are the closest stored sections:\n${fallbackLines.join("\n")}`)
      : (location
          ? `For ${location}, these are the most relevant code sections I found:\n${fallbackLines.join("\n")}`
          : `These are the most relevant code sections I found:\n${fallbackLines.join("\n")}`);

    let reply = fallbackReply;
    try {
      reply = await generateGroundedReply({
        question: queryText,
        locationLabel: location,
        strongMatch: strongMatchExists,
        sources: neighbors.map((neighbor) => ({
          title: neighbor.title,
          summary: neighbor.summary,
          distance: neighbor.distance,
        })),
      });
    } catch {
      // Keep existing deterministic fallback output if model generation fails.
    }

    return Response.json({
      reply,
      sources: neighbors,
      parsedScope: scopedInput
        ? {
            state: scopedInput.state,
            municipality: scopedInput.municipality,
            about: scopedInput.about,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
