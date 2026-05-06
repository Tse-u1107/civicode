import { CloudClient } from "chromadb";

const CHROMA_API_KEY = process.env.CHROMA_API_KEY ?? "ck-FXJCn7ot9XN8kjEitQyynGmCdwNX4ubg9jfia92Jm7q3";
const CHROMA_TENANT = process.env.CHROMA_TENANT ?? "0d81d23a-db4e-4fa3-a520-84ecddf1560e";
const CHROMA_DATABASE = process.env.CHROMA_DATABASE ?? "zoning_policy";
const DEFAULT_COLLECTION_NAME = process.env.CHROMA_COLLECTION ?? "municode_step5";

export const chromaClient = new CloudClient({
  apiKey: CHROMA_API_KEY,
  tenant: CHROMA_TENANT,
  database: CHROMA_DATABASE,
});

export async function getOrCreateChromaCollection(name = DEFAULT_COLLECTION_NAME) {
  return chromaClient.getOrCreateCollection({ name, embeddingFunction: null });
}
