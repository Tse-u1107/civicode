import { retrieveMunicodeContent } from "@/lib/municode";

type RetrieveRequestBody = {
  input?: unknown;
};

const EXPECTED_PART_COUNT = 3;
const INPUT_FORMAT_HELP =
  "Please enter exactly 3 values separated by commas: state_abbr, municipality_name, query. Example: VA, Norfolk, foundation vent";

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
