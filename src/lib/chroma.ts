import { CloudClient } from "chromadb";

const CHROMA_API_KEY = process.env.CHROMA_API_KEY ?? "ck-FXJCn7ot9XN8kjEitQyynGmCdwNX4ubg9jfia92Jm7q3";
const CHROMA_TENANT = process.env.CHROMA_TENANT ?? "0d81d23a-db4e-4fa3-a520-84ecddf1560e";
const CHROMA_DATABASE = process.env.CHROMA_DATABASE ?? "zoning_policy";
const DEFAULT_COLLECTION_NAME = process.env.CHROMA_COLLECTION ?? "municode_step5";
const FALLBACK_STATE_COLLECTION_NAME = "General";

export const chromaClient = new CloudClient({
  apiKey: CHROMA_API_KEY,
  tenant: CHROMA_TENANT,
  database: CHROMA_DATABASE,
});

export async function getOrCreateChromaCollection(name = DEFAULT_COLLECTION_NAME) {
  return chromaClient.getOrCreateCollection({ name, embeddingFunction: null });
}

export async function getExistingChromaCollection(name: string) {
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
