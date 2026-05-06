type JsonSchemaPropertyType = "string" | "integer" | "boolean" | "number" | "object" | "array";

interface ToolInputProperty {
  type: JsonSchemaPropertyType;
  description: string;
  default?: string | number | boolean;
}

interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolInputProperty>;
  required: string[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export const tools: AgentToolDefinition[] = [
  {
    name: "get_states_info",
    description: "Get information about a US state by its abbreviation",
    inputSchema: {
      type: "object",
      properties: {
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation (e.g., 'VA', 'TX', 'CA')",
        },
      },
      required: ["state_abbr"],
    },
  },
  {
    name: "list_municipalities",
    description: "List all municipalities in a state that use Municode",
    inputSchema: {
      type: "object",
      properties: {
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation (e.g., 'VA', 'TX', 'CA')",
        },
      },
      required: ["state_abbr"],
    },
  },
  {
    name: "get_municipality_info",
    description: "Get detailed information about a specific municipality",
    inputSchema: {
      type: "object",
      properties: {
        municipality_name: {
          type: "string",
          description: "Name of the city, county, or municipality",
        },
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation",
        },
      },
      required: ["municipality_name", "state_abbr"],
    },
  },
  {
    name: "get_code_structure",
    description: "Get the table of contents structure for a municipality's code",
    inputSchema: {
      type: "object",
      properties: {
        municipality_name: {
          type: "string",
          description: "Name of the city, county, or municipality",
        },
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation",
        },
        node_id: {
          type: "string",
          description: "Optional specific node ID to get children for (defaults to root)",
          default: "10121",
        },
      },
      required: ["municipality_name", "state_abbr"],
    },
  },
  {
    name: "get_code_section",
    description: "Get the content of a specific section of municipal code",
    inputSchema: {
      type: "object",
      properties: {
        municipality_name: {
          type: "string",
          description: "Name of the city, county, or municipality",
        },
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation",
        },
        node_id: {
          type: "string",
          description: "Node ID of the specific code section to retrieve",
        },
      },
      required: ["municipality_name", "state_abbr", "node_id"],
    },
  },
  {
    name: "search_municipal_codes",
    description: "Search through municipal codes and ordinances",
    inputSchema: {
      type: "object",
      properties: {
        municipality_name: {
          type: "string",
          description: "Name of the city, county, or municipality",
        },
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation",
        },
        search_query: {
          type: "string",
          description: "Text to search for in the municipal codes",
        },
        page_size: {
          type: "integer",
          description: "Number of results per page (default: 10)",
          default: 10,
        },
        page_number: {
          type: "integer",
          description: "Page number to retrieve (default: 1)",
          default: 1,
        },
        titles_only: {
          type: "boolean",
          description: "Search only in titles (default: false)",
          default: false,
        },
      },
      required: ["municipality_name", "state_abbr", "search_query"],
    },
  },
  {
    name: "get_municipality_url",
    description: "Get the URL for a municipality's code library page",
    inputSchema: {
      type: "object",
      properties: {
        municipality_name: {
          type: "string",
          description: "Name of the city, county, or municipality",
        },
        state_abbr: {
          type: "string",
          description: "Two-character US state abbreviation",
        },
      },
      required: ["municipality_name", "state_abbr"],
    },
  },
];

export function getTools(): AgentToolDefinition[] {
  return tools;
}
