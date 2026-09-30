import type { NextRequest } from "next/server";
import type { GiftOption } from "@/lib/types";
import { AIRecommendationService } from "@/lib/ai/ai-recommendation-service";
import { ProductSearchService } from "@/lib/products/product-search-service";
import { computeCompatibilityScore, computeBudgetFit } from "@/lib/scoring/compatibility-score";
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
    const { candidates, source } =
      await AIRecommendationService.generateGiftRecommendations(input);

    const enriched = await Promise.all(
      candidates.map(async (candidate): Promise<GiftOption> => {
        const product = await ProductSearchService.search({
          query: candidate.name,
          category: candidate.category,
          giftType: candidate.giftType,
          budgetMin: input.budgetMin,
          budgetMax: input.budgetMax,
          hintPrice: candidate.estimatedPrice,
        });

        const priceForScoring = product.isEstimated
          ? candidate.estimatedPrice
          : product.price;

        const scoreInput = {
          ...candidate,
          estimatedPrice: priceForScoring,
          budgetFit: computeBudgetFit(priceForScoring, input.budgetMin, input.budgetMax),
        };
        const breakdown = computeCompatibilityScore(scoreInput, input);

        return {
          id: "",
          giftSessionId: "",
          name: candidate.name,
          category: candidate.category,
          description: candidate.description,
          whyItFits: candidate.whyItFits,
          compatibilityScore: breakdown.total,
          estimatedPrice: product.price,
          currency: product.currency,
          imageUrl: product.imageUrl,
          isPriceEstimated: product.isEstimated,
          productUrl: product.productUrl,
          storeName: product.storeName,
          pros: candidate.pros,
          cons: candidate.cons,
          giftType: candidate.giftType,
          offers: product.offers,
          pricesUpdatedAt: product.pricesUpdatedAt,
          createdAt: "",
        };
      })
    );

    enriched.sort(
      (a, b) => b.compatibilityScore - a.compatibilityScore
    );

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