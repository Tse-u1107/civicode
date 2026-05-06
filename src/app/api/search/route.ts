// app/api/search/route.ts
import { getState, getClientByName, searchMunidocs } from "@/lib/municode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "Norfolk";
  const state = searchParams.get("state") ?? "VA";

  const [stateInfo, clientInfo] = await Promise.all([
    getState(state),
    getClientByName(city, state),
  ]);

  const results = await searchMunidocs(
    clientInfo.ClientID,
    stateInfo.StateId,
    query,
  );

  return Response.json(results);
}