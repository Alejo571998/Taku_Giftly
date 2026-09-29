import type { NextRequest } from "next/server";
import type { GiftSessionInput, GiftOption } from "@/lib/types";
import { AIRecommendationService } from "@/lib/ai/ai-recommendation-service";
import { ProductSearchService } from "@/lib/products/product-search-service";
import { computeCompatibilityScore, computeBudgetFit } from "@/lib/scoring/compatibility-score";
import { getDataStore } from "@/lib/data";
import { resolveUserId, jsonError } from "@/lib/server-auth";

function validateInput(body: Partial<GiftSessionInput>): GiftSessionInput | null {
  if (
    typeof body.recipientRelationship !== "string" ||
    !body.recipientRelationship ||
    typeof body.occasion !== "string" ||
    !body.occasion ||
    typeof body.ageRange !== "string" ||
    !body.ageRange ||
    !Array.isArray(body.interests) ||
    body.interests.length === 0 ||
    typeof body.budgetMin !== "number" ||
    (typeof body.budgetMax !== "number" && body.budgetMax !== null)
  ) {
    return null;
  }
  return {
    recipientName: typeof body.recipientName === "string" ? body.recipientName : "",
    recipientRelationship: body.recipientRelationship,
    occasion: body.occasion,
    occasionDate: typeof body.occasionDate === "string" ? body.occasionDate : null,
    ageRange: body.ageRange,
    budgetMin: body.budgetMin,
    budgetMax: body.budgetMax,
    interests: body.interests.map(String),
    recentHints: typeof body.recentHints === "string" ? body.recentHints : "",
    thingsToAvoid: typeof body.thingsToAvoid === "string" ? body.thingsToAvoid : "",
    additionalNotes:
      typeof body.additionalNotes === "string" ? body.additionalNotes : "",
  };
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const body = (await req.json().catch(() => null)) as Partial<GiftSessionInput> | null;
  const input = validateInput(body ?? {});
  if (!input) {
    return jsonError(400, "Faltan datos para generar recomendaciones.");
  }

  try {
    const { candidates, source } =
      await AIRecommendationService.generateGiftRecommendations(input);

    const enriched = await Promise.all(
      candidates.map(async (candidate): Promise<GiftOption> => {
        const product = await ProductSearchService.search(
          candidate.name,
          candidate.category,
          input.budgetMin,
          input.budgetMax,
          candidate.estimatedPrice
        );

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