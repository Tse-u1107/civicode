import { CloudClient } from "chromadb";

const DEFAULT_COLLECTION_NAME = process.env.CHROMA_COLLECTION ?? "municode_step5";
const FALLBACK_STATE_COLLECTION_NAME = "General";

type ChromaConfigOverrides = {
  apiKey?: string;
  tenant?: string;
  database?: string;
};

function resolveChromaConfig(overrides?: ChromaConfigOverrides) {
  const apiKey = overrides?.apiKey ?? process.env.CHROMA_API_KEY;
  const tenant = overrides?.tenant ?? process.env.CHROMA_TENANT;
  const database = overrides?.database ?? process.env.CHROMA_DATABASE;

  const missing: string[] = [];
  if (!apiKey) {
    missing.push("CHROMA_API_KEY");
  }
  if (!tenant) {
    missing.push("CHROMA_TENANT");
  }
  if (!database) {
    missing.push("CHROMA_DATABASE");
  }

  if (missing.length > 0) {
    throw new Error(`Missing Chroma settings: ${missing.join(", ")}.`);
  }

  return { apiKey, tenant, database };
}

function createChromaClient(overrides?: ChromaConfigOverrides) {
  const config = resolveChromaConfig(overrides);
  return new CloudClient(config);
}

export async function getOrCreateChromaCollection(name = DEFAULT_COLLECTION_NAME, overrides?: ChromaConfigOverrides) {
  const chromaClient = createChromaClient(overrides);
  return chromaClient.getOrCreateCollection({ name, embeddingFunction: null });
}

export async function getExistingChromaCollection(name: string, overrides?: ChromaConfigOverrides) {
  const chromaClient = createChromaClient(overrides);
  const client = chromaClient as unknown as {
    getCollection?: (args: { name: string; embeddingFunction: null }) => Promise<unknown>;
  };

  if (typeof client.getCollection !== "function") {
    return null;
  }

  try {
    return await client.getCollection({ name, embeddingFunction: null });
  } catch {
    return null;
  }
}

export function getCollectionNameForState(stateAbbr: string | null | undefined): string {
  const normalized = typeof stateAbbr === "string" ? stateAbbr.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return FALLBACK_STATE_COLLECTION_NAME;
  }
  return `state_${normalized}`;
}
