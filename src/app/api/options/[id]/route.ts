import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { jsonError } from "@/lib/server-auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/options/[id]">
) {
  const { id } = await ctx.params;
  const store = getDataStore();
  const data = await store.getOptionWithSession(id);
  if (!data) return jsonError(404, "No encontramos ese regalo.");
  const group = await store.getGroupBySession(data.session.id);
  return Response.json({ ...data, group });
}
