import { testMunicodeClient } from "../../../lib/municode";

export async function GET() {
  const result = await testMunicodeClient();
  return Response.json(result);
}
