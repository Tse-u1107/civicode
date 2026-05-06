// lib/municode.ts

import { load } from "cheerio";

const MUNICODE_API_BASE = "https://api.municode.com";

export interface StateInfo {
  StateId: number;
  StateName: string;
  StateAbbreviation: string;
}

export interface ClientInfo {
  ClientID: number;
  ClientName: string;
  Website: string;
}

export interface SearchResult {
  NumberOfHits: number;
  Hits: Array<{
    Title: string;
    ContentSnippet: string;
    NodeId?: string | number;
    NodeID?: string | number;
    Url?: string;
    Link?: string;
  }>;
}

export interface TestStepResult {
  step: number;
  name: string;
  ok: boolean;
  message: string;
  details?: unknown[];
}

export interface TestServerResult {
  title: string;
  completed: boolean;
  steps: TestStepResult[];
}

export interface RetrieveMunicodeInput {
  stateAbbr: string;
  municipalityName: string;
  step3Query: string;
  step4Query: string;
}

interface ClientContentProduct {
  ProductName?: string;
  Id?: number | string;
  ProductID?: number | string;
  ProductId?: number | string;
  productId?: number | string;
  JobId?: number | string;
  JobID?: number | string;
}

type UnknownRecord = Record<string, unknown>;
type HtmlField = {
  path: string;
  html: string;
  contextRecord: UnknownRecord | null;
};

type ChunkHierarchyMetadata = {
  nodeId: string | null;
  title: string | null;
  id: string | null;
  nodeDepth: number | null;
  chunkGroupStartingNodeId: string | null;
  chunkGroupStartingNodeTitle: string | null;
  parentId: string | null;
  parentTitle: string | null;
};

type ChunkFootnote = {
  marker: string;
  text: string;
};

type CleanedChunk = {
  sourcePath: string;
  chunkIndex: number;
  chunkCount: number;
  text: string;
  hierarchy: ChunkHierarchyMetadata;
  footnotes: ChunkFootnote[];
};

type CleanedSection = {
  htmlFieldCount: number;
  textSegmentCount: number;
  chunks: CleanedChunk[];
};

async function municodeFetch(url: string, params: Record<string, any>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, {
    headers: {
      "User-Agent": "MCP-Municode-Server/1.0",
      "Accept": "application/json",
      "Referer": "https://library.municode.com/",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} for ${url}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

export async function getState(stateAbbr: string): Promise<StateInfo> {
  return municodeFetch(`${MUNICODE_API_BASE}/States/abbr`, { stateAbbr });
}

export async function getClientByName(clientName: string, stateAbbr: string): Promise<ClientInfo> {
  return municodeFetch(`${MUNICODE_API_BASE}/Clients/name`, { clientName, stateAbbr });
}

export async function getClientsByState(stateAbbr: string): Promise<ClientInfo[]> {
  return municodeFetch(`${MUNICODE_API_BASE}/Clients/stateAbbr`, { stateAbbr });
}

export async function searchMunidocs(
  clientId: number,
  stateId: number,
  searchText: string,
  pageNum = 1,
  pageSize = 10,
  titlesOnly = false,
  fragmentSize = 200,
  sort = 0,
  mode = "CLIENTMODE",
  contentTypeId = "CODES",
): Promise<SearchResult> {
  return municodeFetch(`${MUNICODE_API_BASE}/search`, {
    clientId,
    stateId,
    searchText,
    pageNum,
    pageSize,
    titlesOnly,
    fragmentSize,
    sort,
    mode,
    contentTypeId,
    isAdvanced: false,
    isAutocomplete: false,
  });
}

async function getClientContent(clientId: number): Promise<unknown> {
  return municodeFetch(`${MUNICODE_API_BASE}/ClientContent/${clientId}`, {});
}

async function getCodeSection(jobId: number, productId: number, nodeId: string) {
  return municodeFetch(`${MUNICODE_API_BASE}/CodesContent`, {
    jobId,
    productId,
    nodeId,
  });
}

async function getLatestJob(jobId: number): Promise<unknown> {
  return municodeFetch(`${MUNICODE_API_BASE}/Jobs/latest/${jobId}`, {});
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStateId(info: StateInfo | UnknownRecord): number | null {
  if (!isRecord(info)) {
    return null;
  }
  return toNumber(info.StateId) ?? toNumber(info.StateID) ?? toNumber(info.ID);
}

function collectRecordsDeep(value: unknown, seen = new Set<unknown>()): UnknownRecord[] {
  if (value === null || value === undefined || seen.has(value)) {
    return [];
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRecordsDeep(item, seen));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nested = Object.values(value).flatMap((child) => collectRecordsDeep(child, seen));
  return [value, ...nested];
}

function getCodeMetaFromRecord(record: ClientContentProduct): { jobId: number; productId: number } | null {
  const productId = toNumber(record.ProductID) ?? toNumber(record.ProductId) ?? toNumber(record.productId);
  const jobId = toNumber(record.JobId) ?? toNumber(record.JobID) ?? toNumber(record.Id);
  if (!jobId || !productId) {
    return null;
  }
  return { jobId, productId };
}

function getProductIdFromCodes(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  const codes = payload.codes;
  if (!Array.isArray(codes)) {
    return null;
  }

  for (const entry of codes) {
    if (!isRecord(entry)) {
      continue;
    }
    const productId =
      toNumber(entry.productId) ?? toNumber(entry.productID) ?? toNumber(entry.ProductId) ?? toNumber(entry.ProductID);
    if (productId) {
      return productId;
    }
  }

  return null;
}

async function getCodeProductMeta(payload: unknown): Promise<{ jobId: number; productId: number } | null> {
  const productIdFromCodes = getProductIdFromCodes(payload);
  if (productIdFromCodes) {
    try {
      const latestJob = await getLatestJob(productIdFromCodes);
      if (isRecord(latestJob)) {
        const latestJobId = toNumber(latestJob.Id) ?? toNumber(latestJob.JobId) ?? toNumber(latestJob.JobID);
        const latestProductId =
          toNumber(latestJob.ProductId) ?? toNumber(latestJob.ProductID) ?? productIdFromCodes;
        if (latestJobId && latestProductId) {
          return { jobId: latestJobId, productId: latestProductId };
        }
      }
    } catch {
      // Fall through to generic metadata extraction.
    }
  }

  const records = collectRecordsDeep(payload) as ClientContentProduct[];

  const namedCodeProducts = records.filter((record) =>
    typeof record.ProductName === "string" ? record.ProductName.toLowerCase().includes("code") : false,
  );

  for (const product of namedCodeProducts) {
    const meta = getCodeMetaFromRecord(product);
    if (meta) {
      return meta;
    }
  }

  for (const record of records) {
    const meta = getCodeMetaFromRecord(record);
    if (meta) {
      return meta;
    }
  }

  return null;
}

function getTopLevelKeys(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  return Object.keys(value);
}

function getNodeIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const queryNodeId = parsed.searchParams.get("nodeId") ?? parsed.searchParams.get("nodeid");
    if (queryNodeId?.trim()) {
      return queryNodeId.trim();
    }
  } catch {
    const match = url.match(/[?&]nodeid?=(\d+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function getNodeIdFromHit(hit: SearchResult["Hits"][number]): string | null {
  const directCandidates = [hit.NodeId, hit.NodeID];
  for (const candidate of directCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim();
    }
  }

  const urlCandidates = [hit.Url, hit.Link];
  for (const candidate of urlCandidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const nodeId = getNodeIdFromUrl(candidate);
      if (nodeId) {
        return nodeId;
      }
    }
  }

  return null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function getField(record: UnknownRecord | null, keys: string[]): unknown {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return null;
}

function extractHierarchyMetadata(record: UnknownRecord | null, nodeIdFallback: string): ChunkHierarchyMetadata {
  return {
    nodeId:
      toNullableString(getField(record, ["NodeId", "NodeID", "nodeId", "nodeID", "Id", "ID"])) ?? nodeIdFallback,
    title: toNullableString(getField(record, ["Title", "title", "Heading", "Header"])),
    id: toNullableString(getField(record, ["Id", "ID", "SectionId", "sectionId"])),
    nodeDepth: toNumber(getField(record, ["NodeDepth", "nodeDepth", "Depth", "depth"])),
    chunkGroupStartingNodeId: toNullableString(
      getField(record, [
        "ChunkGroupStartingNodeId",
        "chunkGroupStartingNodeId",
        "ChunkStartNodeId",
      ]),
    ),
    chunkGroupStartingNodeTitle: toNullableString(
      getField(record, [
        "ChunkGroupStartingNodeTitle",
        "chunkGroupStartingNodeTitle",
        "ChunkStartNodeTitle",
      ]),
    ),
    parentId: toNullableString(getField(record, ["ParentNodeId", "ParentId", "parentNodeId", "parentId"])),
    parentTitle: toNullableString(getField(record, ["ParentTitle", "ParentNodeTitle", "parentTitle"])),
  };
}

function containsHtml(value: string): boolean {
  return /<[^>]+>/.test(value);
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToCleanText(html: string): string {
  const $ = load(`<section id="root">${html}</section>`);
  const root = $("#root");

  root.find("script, style, noscript").remove();
  root.find("br").replaceWith("\n");
  root.find("sup").each((_, element) => {
    const supText = normalizeWhitespace($(element).text());
    if (!supText) {
      $(element).remove();
      return;
    }
    $(element).replaceWith(` [ref:${supText}] `);
  });

  root.find("p, div, section, article, li, tr, td, th, h1, h2, h3, h4, h5, h6").each((_, element) => {
    $(element).append("\n");
  });

  return normalizeWhitespace(root.text());
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  const words = paragraph.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = word;
      continue;
    }
    let remaining = word;
    while (remaining.length > maxChars) {
      chunks.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    current = remaining;
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function chunkPlainText(text: string, maxChars = 1200): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const paragraphPieces = splitLongParagraph(paragraph, maxChars);
    for (const piece of paragraphPieces) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) {
          chunks.push(current);
        }
        current = piece;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function parseFootnotes(value: unknown): ChunkFootnote[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    const cleaned = normalizeWhitespace(htmlToCleanText(value));
    if (!cleaned) {
      return [];
    }

    const regex = /\(([^)]+)\)\s*([\s\S]*?)(?=\s*\([^)]+\)\s*|$)/g;
    const parsed: ChunkFootnote[] = [];
    let match: RegExpExecArray | null = regex.exec(cleaned);
    while (match) {
      const marker = normalizeWhitespace(match[1] ?? "");
      const text = normalizeWhitespace(match[2] ?? "");
      if (marker && text) {
        parsed.push({ marker, text });
      }
      match = regex.exec(cleaned);
    }

    if (parsed.length > 0) {
      return parsed;
    }

    return [{ marker: "general", text: cleaned }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseFootnotes(entry));
  }

  if (isRecord(value)) {
    const marker = toNullableString(
      getField(value, ["Marker", "marker", "Number", "number", "Id", "ID", "FootnoteNumber"]),
    );
    const text = normalizeWhitespace(
      htmlToCleanText(
        toNullableString(getField(value, ["Text", "text", "Content", "content", "Html", "html"])) ?? "",
      ),
    );

    if (marker && text) {
      return [{ marker, text }];
    }

    return Object.values(value).flatMap((entry) => parseFootnotes(entry));
  }

  return [];
}

function getChunkFootnotes(text: string, footnotes: ChunkFootnote[]): ChunkFootnote[] {
  if (footnotes.length === 0) {
    return [];
  }

  const refs = new Set<string>();
  const refRegex = /\[ref:([^\]]+)\]/g;
  let match: RegExpExecArray | null = refRegex.exec(text);
  while (match) {
    const marker = normalizeWhitespace(match[1] ?? "");
    if (marker) {
      refs.add(marker);
    }
    match = refRegex.exec(text);
  }

  if (refs.size === 0) {
    return [];
  }

  return footnotes.filter((footnote) => refs.has(footnote.marker));
}

function collectHtmlFields(
  value: unknown,
  path = "section",
  seen = new Set<unknown>(),
  contextRecord: UnknownRecord | null = null,
): HtmlField[] {
  if (value === null || value === undefined || seen.has(value)) {
    return [];
  }

  if (typeof value === "string") {
    return containsHtml(value) ? [{ path, html: value, contextRecord }] : [];
  }

  if (typeof value !== "object") {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectHtmlFields(item, `${path}[${index}]`, seen, contextRecord));
  }

  const record = value as UnknownRecord;
  return Object.entries(record).flatMap(([key, nested]) =>
    collectHtmlFields(nested, `${path}.${key}`, seen, record),
  );
}

function cleanCodeSection(section: unknown, sectionNodeId: string): CleanedSection {
  const htmlFields = collectHtmlFields(section);
  const chunks: CleanedChunk[] = [];

  for (const field of htmlFields) {
    const cleaned = htmlToCleanText(field.html);
    if (!cleaned) {
      continue;
    }
    const fieldChunks = chunkPlainText(cleaned);
    const hierarchy = extractHierarchyMetadata(field.contextRecord, sectionNodeId);
    const allFootnotes = parseFootnotes(getField(field.contextRecord, ["Footnotes", "footnotes"]));

    fieldChunks.forEach((text, index) => {
      chunks.push({
        sourcePath: field.path,
        chunkIndex: index + 1,
        chunkCount: fieldChunks.length,
        text,
        hierarchy,
        footnotes: getChunkFootnotes(text, allFootnotes),
      });
    });
  }

  return {
    htmlFieldCount: htmlFields.length,
    textSegmentCount: chunks.length,
    chunks,
  };
}

export async function testMunicodeClient(): Promise<TestServerResult> {
  return retrieveMunicodeContent({
    stateAbbr: "VA",
    municipalityName: "Norfolk",
    step3Query: "crawl space ventilation",
    step4Query: "foundation vent",
  });
}

export async function retrieveMunicodeContent(input: RetrieveMunicodeInput): Promise<TestServerResult> {
  const steps: TestStepResult[] = [];
  const stateAbbr = input.stateAbbr.trim().toUpperCase();
  const municipalityName = input.municipalityName.trim();
  const step3Query = input.step3Query.trim();
  const step4Query = input.step4Query.trim();

  try {
    const stateInfo = await getState(stateAbbr);
    const stateId = getStateId(stateInfo);

    steps.push({
      step: 1,
      name: `Getting ${stateAbbr} state information`,
      ok: true,
      message: `Found: ${stateInfo.StateName ?? "Unknown"} (ID: ${stateId ?? "Unknown"})`,
    });

    const municipalityInfo = await getClientByName(municipalityName, stateAbbr);
    const clientId = municipalityInfo.ClientID;

    if (!clientId) {
      steps.push({
        step: 2,
        name: `Getting ${municipalityName}, ${stateAbbr} information`,
        ok: false,
        message: `${municipalityName} not found or no ClientID returned`,
      });

      return {
        title: "Testing Municode API Client",
        completed: false,
        steps,
      };
    }

    steps.push({
      step: 2,
      name: `Getting ${municipalityName}, ${stateAbbr} information`,
      ok: true,
      message: `Found ${municipalityName} (ID: ${clientId})`,
      details: [`Website: ${municipalityInfo.Website ?? "Not available"}`],
    });

    const crawlSpace = await searchMunidocs(
      clientId,
      stateId,
      step3Query,
      1,
      5,
    );
    const crawlHits = crawlSpace.Hits ?? [];

    steps.push({
      step: 3,
      name: `Searching ${municipalityName} codes for '${step3Query}'`,
      ok: true,
      message: `Found ${crawlSpace.NumberOfHits ?? 0} results for '${step3Query}'`,
      details: crawlHits.flatMap((hit, idx) => {
        const lines = [`${idx + 1}. ${hit.Title ?? "Unknown"}`];
        if (hit.ContentSnippet) {
          lines.push(
            hit.ContentSnippet
              .replace(/<em>/g, "")
              .replace(/<\/em>/g, "")
              .trim()
              .slice(0, 150),
          );
        }
        return lines;
      }),
    });

    const foundationVent = await searchMunidocs(
      clientId,
      stateId ?? 0,
      step4Query,
      1,
      3,
    );
    const foundationHits = foundationVent.Hits ?? [];

    steps.push({
      step: 4,
      name: `Searching ${municipalityName} codes for '${step4Query}'`,
      ok: true,
      message: `Found ${foundationVent.NumberOfHits ?? 0} results for '${step4Query}'`,
      details: foundationHits.flatMap((hit, idx) => {
        const lines = [`${idx + 1}. ${hit.Title ?? "Unknown"}`];
        const nodeId = getNodeIdFromHit(hit);
        if (nodeId) {
          lines.push(`Node ID: ${nodeId}`);
        }
        if (hit.ContentSnippet) {
          lines.push(
            hit.ContentSnippet
              .replace(/<em>/g, "")
              .replace(/<\/em>/g, "")
              .trim()
              .slice(0, 150),
          );
        }
        return lines;
      }),
    });

    const clientContentPayload = await getClientContent(clientId);
    const codeMeta = await getCodeProductMeta(clientContentPayload);

    if (!codeMeta) {
      const topLevelKeys = getTopLevelKeys(clientContentPayload);
      steps.push({
        step: 5,
        name: "Retrieving full code content from step 4 results",
        ok: false,
        message: `Could not determine Municode code product metadata for ${municipalityName}`,
        details: topLevelKeys.length > 0 ? [`ClientContent keys: ${topLevelKeys.join(", ")}`] : undefined,
      });
    } else {
      const nodeIds = [...new Set(foundationHits.map(getNodeIdFromHit).filter((id): id is string => Boolean(id)))];

      if (nodeIds.length === 0) {
        steps.push({
          step: 5,
          name: "Retrieving full code content from step 4 results",
          ok: false,
          message: "No code section node IDs were found in step 4 search results",
        });
      } else {
        const sectionResults = await Promise.all(
          nodeIds.map(async (nodeId) => {
            try {
              const section = await getCodeSection(codeMeta.jobId, codeMeta.productId, nodeId);
              return { nodeId, ok: true, section };
            } catch (error) {
              return {
                nodeId,
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          }),
        );

        const succeeded = sectionResults.filter((result) => result.ok).length;
        steps.push({
          step: 5,
          name: "Retrieving full code content from step 4 results",
          ok: succeeded > 0,
          message: `Retrieved full content for ${succeeded}/${sectionResults.length} section(s) from step 4`,
          details: sectionResults.map((result) =>
            result.ok
              ? {
                  nodeId: result.nodeId,
                  cleanedSection: cleanCodeSection(result.section, result.nodeId),
                }
              : {
                  nodeId: result.nodeId,
                  error: result.error,
                },
          ),
        });
      }
    }

    return {
      title: "Testing Municode API Client",
      completed: true,
      steps,
    };
  } catch (error) {
    steps.push({
      step: steps.length + 1,
      name: "Unexpected error",
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      title: "Testing Municode API Client",
      completed: false,
      steps,
    };
  }
}