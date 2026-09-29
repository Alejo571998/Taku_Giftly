import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { resolveUserId, jsonError } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const sessions = await getDataStore().listUserSessions(userId);
  return Response.json({ sessions });
}