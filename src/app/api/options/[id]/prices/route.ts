import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { env } from "@/lib/env";
import { ProductSearchService } from "@/lib/products/product-search-service";
import { resolveUserId, jsonError } from "@/lib/server-auth";

/** No se vuelve a consultar la tienda antes de este tiempo. */
const MIN_REFRESH_MS = 30 * 60 * 1000;

/**
 * Vuelve a buscar los precios de una opción. Si no hay ofertas nuevas se
 * conservan las anteriores (no se pisa un precio real con un estimado).
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/options/[id]/prices">
) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");
  if (!env.hasMercadolibre) {
    return jsonError(409, "La comparación de precios en tiendas todavía no está activada.");
  }

  const { id } = await ctx.params;
  const store = getDataStore();
  const data = await store.getOptionWithSession(id);
  if (!data) return jsonError(404, "No encontramos ese regalo.");
  const { option, session } = data;

  const last = option.pricesUpdatedAt ? Date.parse(option.pricesUpdatedAt) : 0;
  if (Date.now() - last < MIN_REFRESH_MS) {
    return Response.json({ option, refreshed: false });
  }

  try {
    const product = await ProductSearchService.search({
      query: option.name,
      category: option.category,
      giftType: option.giftType,
      budgetMin: session.budgetMin,
      budgetMax: session.budgetMax,
      hintPrice: option.estimatedPrice ?? undefined,
    });
    if (product.isEstimated && !option.isPriceEstimated) {
      return Response.json({ option, refreshed: false });
    }
    const updated = await store.updateOptionPrices(option.id, product);
    return Response.json({ option: updated, refreshed: true });
  } catch (error) {
    console.error("[prices] Error:", error);
    return jsonError(502, "No pudimos consultar las tiendas ahora. Probá en un rato.");
  }
}
