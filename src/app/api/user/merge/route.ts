import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { getServiceClient } from "@/lib/supabase";
import { resolveUserId, jsonError } from "@/lib/server-auth";

/**
 * Pasa lo que hizo una identidad anónima de este navegador a la cuenta con
 * la que se acaba de entrar. Exige los dos tokens: el de la cuenta (header)
 * y el de la sesión anónima anterior (body), y que la anterior sea anónima.
 */
export async function POST(req: NextRequest) {
  const client = getServiceClient();
  if (!client) return jsonError(409, "Disponible solo con Supabase configurado.");

  const accountId = await resolveUserId(req);
  if (!accountId) return jsonError(401, "Iniciá sesión para continuar.");

  const body = (await req.json().catch(() => null)) as { previousToken?: string } | null;
  if (!body?.previousToken) return jsonError(400, "Falta la sesión anterior.");

  const { data: account } = await client.auth.getUser(
    req.headers.get("authorization")!.slice(7)
  );
  if (!account.user || account.user.is_anonymous) {
    return jsonError(403, "La sesión actual tiene que ser una cuenta con email.");
  }

  const { data: previous, error } = await client.auth.getUser(body.previousToken);
  if (error || !previous.user) {
    return jsonError(410, "La sesión anterior venció; no pudimos traer esas búsquedas.");
  }
  if (!previous.user.is_anonymous) {
    return jsonError(403, "Solo se pueden traer datos de una sesión anónima.");
  }
  if (previous.user.id === accountId) return Response.json({ merged: false });

  try {
    await getDataStore().reassignUser(previous.user.id, accountId);
    return Response.json({ merged: true });
  } catch (e) {
    console.error("[merge] Error:", e);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}
