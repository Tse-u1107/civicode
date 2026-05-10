import { retrieveMunicodeContent } from "@/lib/municode";
import { get_clients_by_state } from "../api";

type RetrieveRequestBody = {
  input?: unknown;
};

const EXPECTED_PART_COUNT = 3;
const INPUT_FORMAT_HELP =
  "Please enter exactly 3 values separated by commas: state_abbr, municipality_name, query. Example: VA, Norfolk, foundation vent";
const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
] as const;

function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function keepOnlyStepFive(result: Awaited<ReturnType<typeof retrieveMunicodeContent>>) {
  const stepFive = result.steps.find((step) => step.step === 5);
  return {
    ...result,
    steps: stepFive ? [stepFive] : [],
  };
}

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
    step3Query: query,
    step4Query: query,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateAbbr = (searchParams.get("stateAbbr") ?? "").trim().toUpperCase();

    if (!stateAbbr) {
      return Response.json({ states: US_STATES });
    }

    const clients = await get_clients_by_state(stateAbbr);
    const municipalities = Array.isArray(clients)
      ? clients
          .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            id: typeof item.ClientID === "number" ? item.ClientID : null,
            name: readStringField(item, "ClientName"),
          }))
          .filter((item) => item.name.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    return Response.json({ municipalities });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RetrieveRequestBody;
    const rawInput = typeof body.input === "string" ? body.input.trim() : "";

    if (!rawInput) {
      return Response.json({ error: INPUT_FORMAT_HELP }, { status: 400 });
    }

    const parsed = parseRetrieveInput(rawInput);
    if (!parsed) {
      return Response.json({ error: INPUT_FORMAT_HELP }, { status: 400 });
    }

    const result = await retrieveMunicodeContent(parsed);
    return Response.json(keepOnlyStepFive(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
