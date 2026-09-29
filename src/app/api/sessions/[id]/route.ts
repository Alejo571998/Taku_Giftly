import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { jsonError } from "@/lib/server-auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/sessions/[id]">
) {
  const { id } = await ctx.params;
  const store = getDataStore();
  const data = await store.getSessionWithOptions(id);
  if (!data) return jsonError(404, "No encontramos esa búsqueda de regalos.");
  const group = await store.getGroupBySession(id);
  return Response.json({ ...data, group });
}