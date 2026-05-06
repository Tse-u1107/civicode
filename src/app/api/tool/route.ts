import { handle_call_tool } from "@/app/agent_functions/call-tool";

type ToolRequestBody = {
  name?: unknown;
  args?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ToolRequestBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const args = body.args && typeof body.args === "object" ? (body.args as Record<string, unknown>) : {};

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const textParts = await handle_call_tool(name, args);
    const output = textParts.map((part) => part.text).join("\n").trim();

    return Response.json({
      toolName: name,
      args,
      output: output || "No output.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
