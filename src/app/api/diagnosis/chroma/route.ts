import { getOrCreateChromaCollection } from "@/lib/chroma";
import { readRuntimeApiSettings } from "@/lib/runtime-api-settings";

const DIAGNOSIS_COLLECTION = "diagnostics_access_check";

export async function GET(request: Request) {
  try {
    const runtimeApiSettings = readRuntimeApiSettings(request.headers);
    const collection = await getOrCreateChromaCollection(DIAGNOSIS_COLLECTION, {
      apiKey: runtimeApiSettings.chromaApiKey,
      tenant: runtimeApiSettings.chromaTenant,
      database: runtimeApiSettings.chromaDatabase,
    });

    let count: number | null = null;
    const withCount = collection as unknown as { count?: () => Promise<number> };
    if (typeof withCount.count === "function") {
      try {
        count = await withCount.count();
      } catch {
        count = null;
      }
    }

    return Response.json({
      ok: true,
      message: "ChromaDB credentials are accessible.",
      collection: DIAGNOSIS_COLLECTION,
      count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, message }, { status: 500 });
  }
}
