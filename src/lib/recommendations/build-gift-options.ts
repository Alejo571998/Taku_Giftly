import { AIRecommendationService } from "@/lib/ai/ai-recommendation-service";
import { ProductSearchService } from "@/lib/products/product-search-service";
import { computeBudgetFit, computeCompatibilityScore } from "@/lib/scoring/compatibility-score";
import type { AISource, GiftCandidate, GiftOption, GiftSession, GiftSessionInput } from "@/lib/types";

/**
 * Del pedido a opciones listas para guardar:
 * IA (candidatos + porqué) → tiendas (precio real u estimado) → compatibilidad.
 * Lo usan /api/recommend y "más ideas".
 */
export async function buildGiftOptions(
  input: GiftSessionInput,
  exclude: string[] = []
): Promise<{ options: GiftOption[]; source: AISource }> {
  const { candidates, source } = await AIRecommendationService.generateGiftRecommendations(
    input,
    { exclude }
  );
  const options = await Promise.all(candidates.map((c) => toOption(c, input)));
  options.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return { options, source };
}

async function toOption(candidate: GiftCandidate, input: GiftSessionInput): Promise<GiftOption> {
  const product = await ProductSearchService.search({
    query: candidate.name,
    category: candidate.category,
    giftType: candidate.giftType,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    hintPrice: candidate.estimatedPrice,
  });

  const priceForScoring = product.isEstimated ? candidate.estimatedPrice : product.price;
  const { total } = computeCompatibilityScore(
    {
      ...candidate,
      estimatedPrice: priceForScoring,
      budgetFit: computeBudgetFit(priceForScoring, input.budgetMin, input.budgetMax),
    },
    input
  );

  return {
    id: "",
    giftSessionId: "",
    name: candidate.name,
    category: candidate.category,
    description: candidate.description,
    whyItFits: candidate.whyItFits,
    compatibilityScore: total,
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
}

/** Reconstruye el pedido original a partir de una búsqueda guardada. */
export function sessionToInput(session: GiftSession): GiftSessionInput {
  return {
    recipientName: session.recipientName ?? "",
    recipientRelationship: session.recipientRelationship ?? "otro",
    occasion: session.occasion ?? "otro",
    occasionDate: session.occasionDate,
    ageRange: session.ageRange ?? "25-34",
    budgetMin: session.budgetMin ?? 0,
    budgetMax: session.budgetMax,
    interests: session.interests,
    recentHints: session.recentHints ?? "",
    thingsToAvoid: session.thingsToAvoid ?? "",
    additionalNotes: session.additionalNotes ?? "",
  };
}
