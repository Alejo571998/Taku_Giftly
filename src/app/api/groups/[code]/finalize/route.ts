import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { computeGroupRanking, findTopTie } from "@/lib/group-ranking";
import { resolveUserId, jsonError } from "@/lib/server-auth";

/**
 * Cierra la votación. Si hay empate en el primer puesto responde 409 con
 * las opciones empatadas; quien creó el grupo desempata reenviando
 * `winnerOptionId` (debe ser una de las empatadas).
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/groups/[code]/finalize">
) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const { code } = await ctx.params;
  const bundle = await getDataStore().getGroupByCode(code);
  if (!bundle) return jsonError(404, "No encontramos ese grupo. Revisá el código.");

  if (bundle.group.creatorId !== userId) {
    return jsonError(403, "Solo la persona que creó el grupo puede cerrar la votación.");
  }
  if (bundle.group.status === "finished") {
    return Response.json({ group: bundle.group });
  }
  if (bundle.votes.length === 0) {
    return jsonError(400, "Todavía nadie votó. Compartí el link y esperá algunos votos.");
  }

  const body = (await req.json().catch(() => null)) as {
    winnerOptionId?: string;
  } | null;

  const ranking = computeGroupRanking(bundle.options, bundle.votes);
  const tie = findTopTie(ranking);

  let winnerId = ranking[0].optionId;
  if (tie.length > 0) {
    const chosen = body?.winnerOptionId;
    if (!chosen) {
      return Response.json({ tie }, { status: 409 });
    }
    if (!tie.includes(chosen)) {
      return jsonError(400, "Elegí una de las opciones empatadas.");
    }
    winnerId = chosen;
  }

  try {
    await getDataStore().finalizeGroup(bundle.group.id, userId);
    const group = await getDataStore().setGroupWinner(bundle.group.id, winnerId);
    return Response.json({ group });
  } catch (error) {
    console.error("[finalize] Error:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}
