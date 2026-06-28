import { embedTextChunksWithGemini } from "@/lib/gemini";
import { readRuntimeApiSettings } from "@/lib/runtime-api-settings";

export async function GET(request: Request) {
  try {
    const runtimeApiSettings = readRuntimeApiSettings(request.headers);
    const vectors = await embedTextChunksWithGemini(["diagnosis ping"], {
      apiKey: runtimeApiSettings.geminiApiKey,
    });
    const firstVector = Array.isArray(vectors[0]) ? vectors[0] : [];

    return Response.json({
      ok: true,
      message: "Gemini key is accessible.",
      embeddingLength: firstVector.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, message }, { status: 500 });
  }
}
