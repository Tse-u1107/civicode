import {
  get_client_by_name,
  get_client_content,
  get_clients_by_state,
  get_codes_content,
  get_latest_job,
  get_states,
  get_toc_children,
  search_munidocs,
} from "../api/api";

const MUNICODE_LIBRARY_BASE = "https://library.municode.com";

type ToolArguments = Record<string, unknown>;
type DataObject = Record<string, unknown>;

export interface TextContent {
  type: "text";
  text: string;
}

function textResponse(text: string): TextContent[] {
  return [{ type: "text", text }];
}

function getStringArg(argumentsMap: ToolArguments, key: string): string {
  const value = argumentsMap[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing or invalid argument: ${key}`);
  }
  return value;
}

function getOptionalNumberArg(argumentsMap: ToolArguments, key: string, fallback: number): number {
  const value = argumentsMap[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function getOptionalBooleanArg(
  argumentsMap: ToolArguments,
  key: string,
  fallback: boolean,
): boolean {
  const value = argumentsMap[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return fallback;
}

function asDataObject(value: unknown): DataObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as DataObject;
}

function asDataObjectArray(value: unknown): DataObject[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as DataObject[];
}

function getNumericField(record: DataObject, key: string): number | null {
  const value = record[key];
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

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeText(value: string): string {
  return stripHtml(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function getSearchableHitText(hit: DataObject): string {
  const title = typeof hit.Title === "string" ? hit.Title : "";
  const snippet =
    typeof hit.ContentSnippet === "string"
      ? hit.ContentSnippet
      : typeof hit.ContentFragment === "string"
        ? hit.ContentFragment
        : "";
  return normalizeText(`${title} ${snippet}`);
}

function getQueryTerms(query: string): string[] {
  return Array.from(
    new Set(
      normalizeText(query)
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  );
}

function scoreHitForQuery(hit: DataObject, query: string, terms: string[]): number {
  const text = getSearchableHitText(hit);
  if (!text || terms.length === 0) {
    return 0;
  }

  const missingTerm = terms.some((term) => !text.includes(term));
  if (missingTerm) {
    return 0;
  }

  // Score exact phrase matches higher than token-only matches.
  const normalizedQuery = normalizeText(query);
  const phraseBoost = normalizedQuery && text.includes(normalizedQuery) ? 100 : 0;
  const title = typeof hit.Title === "string" ? normalizeText(hit.Title) : "";
  const titleBoost = normalizedQuery && title.includes(normalizedQuery) ? 20 : 0;

  return phraseBoost + titleBoost + terms.length;
}

function filterAndSortSearchHits(searchResults: DataObject, query: string): DataObject {
  const hits = asDataObjectArray(searchResults.Hits);
  const terms = getQueryTerms(query);
  if (terms.length === 0) {
    return searchResults;
  }

  const scored = hits
    .map((hit) => ({ hit, score: scoreHitForQuery(hit, query, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const filteredHits = scored.map((item) => item.hit);
  return {
    ...searchResults,
    NumberOfHits: filteredHits.length,
    Hits: filteredHits,
    OriginalNumberOfHits: hits.length,
    FilterApplied: "all_query_terms_required",
  };
}

function getCodeProduct(products: DataObject[]): DataObject | null {
  for (const product of products) {
    const productName = typeof product.ProductName === "string" ? product.ProductName.toLowerCase() : "";
    if (productName.includes("code")) {
      return product;
    }
  }
  return null;
}

function getCodeProductIdFromClientContent(payload: unknown): number | null {
  const data = asDataObject(payload);
  if (Object.keys(data).length === 0) {
    return null;
  }

  const codes = data.codes;
  if (!Array.isArray(codes)) {
    return null;
  }

  for (const item of codes) {
    const record = asDataObject(item);
    if (Object.keys(record).length === 0) {
      continue;
    }
    const productId =
      getNumericField(record, "productId") ??
      getNumericField(record, "productID") ??
      getNumericField(record, "ProductId") ??
      getNumericField(record, "ProductID");
    if (productId) {
      return productId;
    }
  }

  return null;
}

async function resolveCodeMeta(clientId: number): Promise<{ jobId: number; productId: number } | null> {
  const clientContentPayload = await get_client_content(clientId);

  const codeProductId = getCodeProductIdFromClientContent(clientContentPayload);
  if (codeProductId) {
    try {
      const latestJob = asDataObject(await get_latest_job(codeProductId));
      const latestJobId =
        getNumericField(latestJob, "Id") ??
        getNumericField(latestJob, "JobId") ??
        getNumericField(latestJob, "JobID");
      const latestProductId =
        getNumericField(latestJob, "ProductId") ??
        getNumericField(latestJob, "ProductID") ??
        codeProductId;

      if (latestJobId && latestProductId) {
        return { jobId: latestJobId, productId: latestProductId };
      }
    } catch {
      // Fall through to legacy product layout.
    }
  }

  const clientContentList = asDataObjectArray(clientContentPayload);
  const codeProduct = getCodeProduct(clientContentList);
  if (!codeProduct) {
    return null;
  }

  const jobId = getNumericField(codeProduct, "Id");
  const productId = getNumericField(codeProduct, "ProductID");
  if (!jobId || !productId) {
    return null;
  }

  return { jobId, productId };
}

export async function handle_call_tool(name: string, argumentsMap: ToolArguments): Promise<TextContent[]> {
  try {
    if (name === "get_states_info") {
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();
      const result = await get_states(state_abbr);
      return textResponse(JSON.stringify(result, null, 2));
    }

    if (name === "list_municipalities") {
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();
      const clients = asDataObjectArray(await get_clients_by_state(state_abbr));

      const formatted_clients = clients.map((client) => ({
        name: client.ClientName ?? "Unknown",
        id: client.ClientID,
        population_range: client.PopRangeId,
        classification: client.ClassificationId,
        website: client.Website,
        city: client.City,
        zip_code: client.ZipCode,
      }));

      return textResponse(
        `Found ${formatted_clients.length} municipalities in ${state_abbr}:\n\n${JSON.stringify(formatted_clients, null, 2)}`,
      );
    }

    if (name === "get_municipality_info") {
      const municipality_name = getStringArg(argumentsMap, "municipality_name");
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();

      const client_info = asDataObject(await get_client_by_name(municipality_name, state_abbr));
      const client_id = getNumericField(client_info, "ClientID");

      if (client_id) {
        const client_content = await get_client_content(client_id);
        return textResponse(
          JSON.stringify(
            {
              client_info,
              available_products: client_content,
            },
            null,
            2,
          ),
        );
      }

      return textResponse(JSON.stringify({ client_info }, null, 2));
    }

    if (name === "get_code_structure") {
      const municipality_name = getStringArg(argumentsMap, "municipality_name");
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();
      const node_id =
        typeof argumentsMap.node_id === "string" && argumentsMap.node_id.trim() !== ""
          ? argumentsMap.node_id
          : "10121";

      const client_info = asDataObject(await get_client_by_name(municipality_name, state_abbr));
      const client_id = getNumericField(client_info, "ClientID");

      if (!client_id) {
        return textResponse(`Municipality '${municipality_name}' not found in ${state_abbr}`);
      }

      const codeMeta = await resolveCodeMeta(client_id);
      if (!codeMeta) {
        return textResponse("No code of ordinances found for this municipality");
      }

      const toc = await get_toc_children(codeMeta.jobId, codeMeta.productId, node_id);
      return textResponse(`Code structure for ${municipality_name}, ${state_abbr}:\n\n${JSON.stringify(toc, null, 2)}`);
    }

    if (name === "get_code_section") {
      const municipality_name = getStringArg(argumentsMap, "municipality_name");
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();
      const node_id = getStringArg(argumentsMap, "node_id");

      const client_info = asDataObject(await get_client_by_name(municipality_name, state_abbr));
      const client_id = getNumericField(client_info, "ClientID");

      if (!client_id) {
        return textResponse(`Municipality '${municipality_name}' not found in ${state_abbr}`);
      }

      const codeMeta = await resolveCodeMeta(client_id);
      if (!codeMeta) {
        return textResponse("No code of ordinances found for this municipality");
      }

      const content = await get_codes_content(codeMeta.jobId, codeMeta.productId, node_id);
      return textResponse(
        `Content for node ${node_id} in ${municipality_name}, ${state_abbr}:\n\n${JSON.stringify(content, null, 2)}`,
      );
    }

    if (name === "search_municipal_codes") {
      const municipality_name = getStringArg(argumentsMap, "municipality_name");
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toUpperCase();
      const search_query = getStringArg(argumentsMap, "search_query");
      const page_size = getOptionalNumberArg(argumentsMap, "page_size", 10);
      const page_number = getOptionalNumberArg(argumentsMap, "page_number", 1);
      const titles_only = getOptionalBooleanArg(argumentsMap, "titles_only", false);

      const state_info = asDataObject(await get_states(state_abbr));
      const state_id =
        getNumericField(state_info, "StateId") ?? getNumericField(state_info, "StateID") ?? getNumericField(state_info, "ID") ?? 0;

      const client_info = asDataObject(await get_client_by_name(municipality_name, state_abbr));
      const client_id = getNumericField(client_info, "ClientID");

      if (!client_id) {
        return textResponse(`Municipality '${municipality_name}' not found in ${state_abbr}`);
      }

      const search_results = await search_munidocs(
        client_id,
        search_query,
        page_number,
        page_size,
        titles_only,
        false,
        state_id,
      );
      const filtered_results = filterAndSortSearchHits(asDataObject(search_results), search_query);

      return textResponse(
        `Search results for '${search_query}' in ${municipality_name}, ${state_abbr}:\n\n${JSON.stringify(filtered_results, null, 2)}`,
      );
    }

    if (name === "get_municipality_url") {
      const municipality_name = getStringArg(argumentsMap, "municipality_name");
      const state_abbr = getStringArg(argumentsMap, "state_abbr").toLowerCase();
      const formatted_name = municipality_name.toLowerCase().replace(/ /g, "_").replace(/,/g, "");
      const url = `${MUNICODE_LIBRARY_BASE}/${state_abbr}/${
        formatted_name
      }/codes/code_of_ordinances`;

      return textResponse(
        `Municode Library URL for ${municipality_name}, ${state_abbr.toUpperCase()}:\n${url}`,
      );
    }

    return textResponse(`Unknown tool: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error in tool ${name}: ${message}`);
    return textResponse(`Error: ${message}`);
  }
}
