import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getServiceClient } from "@/lib/supabase";

/**
 * Resuelve el auth.uid() de la persona que hizo la request.
 * - Con Supabase: verifica el JWT anónimo del header Authorization.
 * - Modo local: usa el uid generado en el navegador (x-user-id).
 */
export async function resolveUserId(
  req: NextRequest
): Promise<string | null> {
  if (env.hasSupabase) {
    const header = req.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    const client = getServiceClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  }
  return req.headers.get("x-user-id");
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}