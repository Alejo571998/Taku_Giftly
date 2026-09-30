import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildGiftOptions, sessionToInput } from "@/lib/recommendations/build-gift-options";
import { LIMITS, checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { resolveUserId, jsonError } from "@/lib/server-auth";

/** Tope de ideas por búsqueda: más que esto ya no ayuda a decidir. */
const MAX_OPTIONS_PER_SESSION = 15;

/**
 * "Mostrame otras ideas": genera ideas nuevas para la misma búsqueda sin
 * repetir las anteriores y las suma. Si hay un grupo votando, entran a la
 * votación; si ya se decidió, no se agregan.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/more">) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const [ipLimit, ipWindow] = LIMITS.recommendPerIp;
  const perIp = checkRateLimit(`recommend:ip:${clientIp(req)}`, ipLimit, ipWindow);
  const perUser = checkRateLimit(`more:user:${userId}`, LIMITS.recommendPerUser, LIMITS.recommendPerUserWindowMs);
  if (!perIp.ok || !perUser.ok) {
    return tooManyRequests(
      "Pediste muchas ideas seguidas. Esperá un ratito y volvé a intentar.",
      Math.max(perIp.retryAfterSeconds, perUser.retryAfterSeconds)
    );
  }

  const { id } = await ctx.params;
  const store = getDataStore();
  const data = await store.getSessionWithOptions(id);
  if (!data) return jsonError(404, "No encontramos esa búsqueda de regalos.");
  if (data.session.creatorId !== userId) {
    return jsonError(403, "Solo quien creó la búsqueda puede pedir más ideas.");
  }
  if (data.options.length >= MAX_OPTIONS_PER_SESSION) {
    return jsonError(409, "Ya hay muchas ideas en esta búsqueda. Probá ajustando las respuestas.");
  }
  const group = await store.getGroupBySession(id);
  if (group?.status === "finished") {
    return jsonError(409, "Esta búsqueda ya tiene un regalo elegido en grupo.");
  }

  try {
    const exclude = data.options.map((o) => o.name);
    const { options } = await buildGiftOptions(sessionToInput(data.session), exclude);
    const room = MAX_OPTIONS_PER_SESSION - data.options.length;
    const fresh = options.slice(0, room);
    if (fresh.length === 0) {
      return jsonError(409, "No se me ocurren ideas nuevas con estas respuestas. Probá ajustándolas.");
    }
    const saved = await store.addOptions(id, fresh);
    return Response.json({ options: saved, newIds: saved.map((o) => o.id) });
  } catch (error) {
    console.error("[more] Error:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}
