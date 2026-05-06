const MUNICODE_API_BASE = "https://api.municode.com";
const MUNICODE_LIBRARY_BASE = "https://library.municode.com"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

const DEFAULT_HEADERS: HeadersInit = {
  "User-Agent": "MCP-Municode-Server/1.0",
  Accept: "application/json",
};

async function municode_get(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<unknown> {
  const url = new URL(`${MUNICODE_API_BASE}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Municode request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
}

// Included for parity with the Python client lifecycle.
export async function close(): Promise<void> {
  return Promise.resolve();
}

export async function get_states(state_abbr: string): Promise<JsonObject> {
  return municode_get("/States/abbr", { stateAbbr: state_abbr }) as Promise<JsonObject>;
}

export async function get_clients_by_state(state_abbr: string): Promise<JsonObject[]> {
  return municode_get("/Clients/stateAbbr", { stateAbbr: state_abbr }) as Promise<JsonObject[]>;
}

export async function get_client_by_name(
  client_name: string,
  state_abbr: string,
): Promise<JsonObject> {
  return municode_get("/Clients/name", {
    clientName: client_name,
    stateAbbr: state_abbr,
  }) as Promise<JsonObject>;
}

export async function get_client_content(client_id: number): Promise<JsonObject> {
  return municode_get(`/ClientContent/${client_id}`) as Promise<JsonObject>;
}

export async function get_product_by_name(
  client_id: number,
  product_name: string,
): Promise<JsonObject> {
  return municode_get("/Products/name", {
    clientId: client_id,
    productName: product_name,
  }) as Promise<JsonObject>;
}

export async function get_latest_job(job_id: number): Promise<JsonObject> {
  return municode_get(`/Jobs/latest/${job_id}`) as Promise<JsonObject>;
}

export async function get_toc_children(
  job_id: number,
  product_id: number,
  node_id = "10121",
): Promise<JsonObject[]> {
  return municode_get("/codesToc/children", {
    jobId: job_id,
    productId: product_id,
    nodeId: node_id,
  }) as Promise<JsonObject[]>;
}

export async function get_codes_content(
  job_id: number,
  product_id: number,
  node_id: string,
): Promise<JsonObject> {
  return municode_get("/CodesContent", {
    jobId: job_id,
    productId: product_id,
    nodeId: node_id,
  }) as Promise<JsonObject>;
}

export async function search_munidocs(
  client_id: number,
  search_text: string,
  page_num = 1,
  page_size = 10,
  titles_only = false,
  is_advanced = false,
  state_id = 0,
): Promise<JsonObject> {
  return municode_get("/search", {
    clientId: client_id,
    stateId: state_id,
    searchText: search_text,
    pageNum: page_num,
    pageSize: page_size,
    titlesOnly: titles_only,
    isAdvanced: is_advanced,
    isAutocomplete: false,
    mode: "CLIENTMODE",
    sort: 0,
    fragmentSize: 200,
    contentTypeId: "CODES",
  }) as Promise<JsonObject>;
}
