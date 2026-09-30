import type { NextRequest } from "next/server";
import { buildGiftOptions } from "@/lib/recommendations/build-gift-options";
import { getDataStore } from "@/lib/data";
import { resolveUserId, jsonError } from "@/lib/server-auth";
import { LIMITS, checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { validateGiftInput } from "@/lib/validation/gift-input";

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const body = await req.json().catch(() => null);
  const validation = validateGiftInput(body);
  if (!validation.ok) return jsonError(400, validation.error);
  const input = validation.input;

  // Cada búsqueda llama a la IA (cuesta plata): límite por IP y por usuario.
  const [ipLimit, ipWindow] = LIMITS.recommendPerIp;
  const perIp = checkRateLimit(`recommend:ip:${clientIp(req)}`, ipLimit, ipWindow);
  if (!perIp.ok) {
    return tooManyRequests("Hiciste muchas búsquedas seguidas. Probá de nuevo en un rato.", perIp.retryAfterSeconds);
  }
  const since = new Date(Date.now() - LIMITS.recommendPerUserWindowMs).toISOString();
  const recent = await getDataStore().countSessionsSince(userId, since);
  if (recent >= LIMITS.recommendPerUser) {
    return tooManyRequests(
      "Ya generaste varias búsquedas en pocos minutos. Esperá un ratito y volvé a intentar.",
      LIMITS.recommendPerUserWindowMs / 1000
    );
  }

  try {
    const { options: enriched, source } = await buildGiftOptions(input);

    const { session, options } = await getDataStore().createSessionWithOptions(
      input,
      userId,
      enriched,
      source
    );

    return Response.json({
      sessionId: session.id,
      source,
      options: options.map((o) => ({
        ...o,
        giftSessionId: session.id,
      })),
    });
  } catch (error) {
    console.error("[recommend] Error generando recomendaciones:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}