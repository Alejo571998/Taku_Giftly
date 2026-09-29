import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { resolveUserId, jsonError } from "@/lib/server-auth";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/groups/[code]/vote">
) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const { code } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    giftOptionId?: string;
    score?: number;
  } | null;

  const score = body?.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return jsonError(400, "El puntaje debe ser un número del 1 al 5.");
  }
  if (typeof body?.giftOptionId !== "string" || !body.giftOptionId) {
    return jsonError(400, "Falta el regalo a votar.");
  }

  const bundle = await getDataStore().getGroupByCode(code);
  if (!bundle) return jsonError(404, "No encontramos ese grupo. Revisá el código.");

  if (bundle.group.status === "finished") {
    return jsonError(400, "La votación de este grupo ya finalizó.");
  }

  const participant = bundle.participants.find((p) => p.userId === userId);
  if (!participant) {
    return jsonError(403, "Primero uníte al grupo para poder votar.");
  }

  const optionExists = bundle.options.some((o) => o.id === body.giftOptionId);
  if (!optionExists) {
    return jsonError(400, "Ese regalo no pertenece a este grupo.");
  }

  try {
    const vote = await getDataStore().upsertVote(
      bundle.group.id,
      body.giftOptionId,
      participant.id,
      score
    );
    return Response.json({ vote });
  } catch (error) {
    console.error("[vote] Error:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}