import { createHash } from "node:crypto";
import { getCollectionNameForState, getOrCreateChromaCollection } from "@/lib/chroma";
import { embedTextChunksWithGemini } from "@/lib/gemini";
import { readRuntimeApiSettings } from "@/lib/runtime-api-settings";

const INPUT_FORMAT_HELP =
  "Please enter exactly 3 values separated by commas: state_abbr, municipality_name, query. Example: VA, Norfolk, foundation vent";
const EXPECTED_PART_COUNT = 3;
const CHUNK_SIZE = 1000;
const EXPIRY_SECONDS = 90 * 24 * 60 * 60;
const MAX_EMBED_REQUESTS_PER_STORE =
  Number.parseInt(process.env.MAX_EMBED_REQUESTS_PER_STORE ?? "80", 10) || 80;

type StoreRequestBody = {
  input?: unknown;
  result?: unknown;
  startIndex?: unknown;
};

type ChunkHierarchy = {
  title?: string | null;
  parentTitle?: string | null;
};

type CleanedChunk = {
  text?: unknown;
  sourcePath?: unknown;
  chunkIndex?: unknown;
  chunkCount?: unknown;
  hierarchy?: ChunkHierarchy;
};

type CleanedSection = {
  chunks?: unknown;
};

type StepFiveDetail = {
  nodeId?: unknown;
  cleanedSection?: CleanedSection;
};

type StepResult = {
  step?: unknown;
  ok?: unknown;
  details?: unknown;
};

function parseRetrieveInput(rawInput: string) {
  const parts = rawInput
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length !== EXPECTED_PART_COUNT) {
    return null;
  }

  const [stateAbbr, municipalityName, query] = parts;
  if (!stateAbbr || !municipalityName || !query) {
    return null;
  }

  return {
    stateAbbr,
    municipalityName,
    query,
  };
}

function splitByCharacterCount(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += maxChars) {
    const slice = text.slice(index, index + maxChars).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
  }
  return chunks;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeStartIndex(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function buildStableEntryId(base: string): string {
  return createHash("sha256").update(base).digest("hex");
}

function buildDocumentEntries(result: unknown) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + EXPIRY_SECONDS;
  const root = result as { steps?: unknown };
  const steps = Array.isArray(root?.steps) ? (root.steps as StepResult[]) : [];
  const stepFive = steps.find((step) => step.step === 5 && step.ok === true);
  if (!stepFive || !Array.isArray(stepFive.details)) {
    return { expiresAt, entries: [] as Array<Record<string, unknown>> };
  }

  const entries: Array<Record<string, unknown>> = [];
  for (const detailRaw of stepFive.details as StepFiveDetail[]) {
    const detail = detailRaw as StepFiveDetail;
    const nodeId = readString(detail.nodeId);
    const cleanedSection = detail.cleanedSection;
    const chunks = Array.isArray(cleanedSection?.chunks) ? (cleanedSection.chunks as CleanedChunk[]) : [];

    for (const chunk of chunks) {
      const text = readString(chunk.text).trim();
      if (!text) {
        continue;
      }

      const sourcePath = readString(chunk.sourcePath);
      const chunkIndex = readNumber(chunk.chunkIndex);
      const chunkCount = readNumber(chunk.chunkCount);
      const sectionTitle = readString(chunk.hierarchy?.title ?? "");
      const parentTitle = readString(chunk.hierarchy?.parentTitle ?? "");
      const childChunks = splitByCharacterCount(text, CHUNK_SIZE);

      childChunks.forEach((childText, childIndex) => {
        const stableSource = [
          nodeId || "node",
          sourcePath,
          chunkIndex ?? "",
          chunkCount ?? "",
          sectionTitle,
          parentTitle,
          childIndex,
          childText,
        ].join("|");

        entries.push({
          id: buildStableEntryId(stableSource),
          document: childText,
          metadata: {
            expiresAt,
            nodeId,
            sourcePath,
            chunkIndex,
            chunkCount,
            sectionTitle,
            parentTitle,
            splitChunkIndex: childIndex,
            splitChunkCount: childChunks.length,
          },
        });
      });
    }
  }

  return { expiresAt, entries };
}

export async function POST(request: Request) {
  try {
    const runtimeApiSettings = readRuntimeApiSettings(request.headers);
    const body = (await request.json()) as StoreRequestBody;
    const rawInput = typeof body.input === "string" ? body.input.trim() : "";
    if (!rawInput) {
      return Response.json({ error: INPUT_FORMAT_HELP }, { status: 400 });
    }

    const parsedInput = parseRetrieveInput(rawInput);
    if (!parsedInput) {
      return Response.json({ error: INPUT_FORMAT_HELP }, { status: 400 });
    }
    const startIndex = normalizeStartIndex(body.startIndex);

    const { expiresAt, entries } = buildDocumentEntries(body.result);
    if (entries.length === 0) {
      return Response.json(
        { error: "No step 5 content found to store. Run Retrieve successfully first." },
        { status: 400 },
      );
    }

    if (startIndex >= entries.length) {
      return Response.json({
        ok: true,
        storedCount: 0,
        totalChunks: entries.length,
        skippedChunks: 0,
        cappedByQuotaGuard: false,
        hasMore: false,
        nextStartIndex: entries.length,
        expiresAt,
      });
    }

    const endIndex = Math.min(startIndex + MAX_EMBED_REQUESTS_PER_STORE, entries.length);
    const limitedEntries = entries.slice(startIndex, endIndex);
    const skippedChunks = entries.length - endIndex;
    const documents = limitedEntries.map((entry) => entry.document as string);
    const embeddings = await embedTextChunksWithGemini(documents, {
      apiKey: runtimeApiSettings.geminiApiKey,
    });
    const ids = limitedEntries.map((entry) => entry.id as string);
    const metadatas = limitedEntries.map((entry) => {
      const metadata = entry.metadata as Record<string, unknown>;
      const normalizedMunicipality = parsedInput.municipalityName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        ...metadata,
        stateAbbr: parsedInput.stateAbbr,
        municipalityName: parsedInput.municipalityName,
        municipalityNameNormalized: normalizedMunicipality,
        originalQuery: parsedInput.query,
        filename: `${parsedInput.stateAbbr}_${parsedInput.municipalityName}_${String(metadata.nodeId || "unknown")}.txt`,
      };
    });

    const collectionName = getCollectionNameForState(parsedInput.stateAbbr);
    const collection = await getOrCreateChromaCollection(collectionName, {
      apiKey: runtimeApiSettings.chromaApiKey,
      tenant: runtimeApiSettings.chromaTenant,
      database: runtimeApiSettings.chromaDatabase,
    });
    await collection.upsert({
      ids,
      documents,
      embeddings,
      metadatas,
    });

    return Response.json({
      ok: true,
      storedCount: limitedEntries.length,
      totalChunks: entries.length,
      skippedChunks,
      cappedByQuotaGuard: skippedChunks > 0,
      hasMore: endIndex < entries.length,
      nextStartIndex: endIndex,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
