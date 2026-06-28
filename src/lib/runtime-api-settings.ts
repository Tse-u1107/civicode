export const GEMINI_API_KEY_HEADER = "x-civicode-gemini-api-key";
export const CHROMA_API_KEY_HEADER = "x-civicode-chroma-api-key";
export const CHROMA_TENANT_HEADER = "x-civicode-chroma-tenant";
export const CHROMA_DATABASE_HEADER = "x-civicode-chroma-database";

export type RuntimeApiSettings = {
  geminiApiKey?: string;
  chromaApiKey?: string;
  chromaTenant?: string;
  chromaDatabase?: string;
};

function readHeaderValue(headers: Headers, key: string): string | undefined {
  const value = headers.get(key)?.trim();
  return value ? value : undefined;
}

export function readRuntimeApiSettings(headers: Headers): RuntimeApiSettings {
  return {
    geminiApiKey: readHeaderValue(headers, GEMINI_API_KEY_HEADER),
    chromaApiKey: readHeaderValue(headers, CHROMA_API_KEY_HEADER),
    chromaTenant: readHeaderValue(headers, CHROMA_TENANT_HEADER),
    chromaDatabase: readHeaderValue(headers, CHROMA_DATABASE_HEADER),
  };
}
