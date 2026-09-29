import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { jsonError } from "@/lib/server-auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/groups/[code]">
) {
  const { code } = await ctx.params;
  const bundle = await getDataStore().getGroupByCode(code);
  if (!bundle) return jsonError(404, "No encontramos ese grupo. Revisá el código.");
  return Response.json(bundle);
}