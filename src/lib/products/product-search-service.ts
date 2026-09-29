import type { GiftType, ProductInfo } from "@/lib/types";
import { env } from "@/lib/env";
import { findOffers } from "@/lib/products/mercadolibre";

const CATEGORY_BASE_PRICE: Record<string, number> = {
  tecnologia: 180_000,
  gaming: 120_000,
  deportes: 110_000,
  musica: 100_000,
  cine: 60_000,
  libros: 45_000,
  cocina: 130_000,
  cafe: 60_000,
  moda: 90_000,
  belleza: 70_000,
  viajes: 150_000,
  fitness: 100_000,
  fotografia: 160_000,
  autos: 140_000,
  arte: 90_000,
  videojuegos: 80_000,
  experiencias: 160_000,
  gastronomia: 150_000,
  otros: 100_000,
};

function roundToNice(value: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.round(value / magnitude) * magnitude;
}

function roundToThousands(value: number): number {
  return Math.max(1000, Math.round(value / 1000) * 1000);
}

/**
 * Precio estimado: una banda plausible según categoría y presupuesto,
 * siempre etiquetado como estimado. Nunca se presenta como precio real.
 */
export function estimatePrice(
  category: string,
  budgetMin: number | null,
  budgetMax: number | null
): number {
  let base = CATEGORY_BASE_PRICE[category] ?? CATEGORY_BASE_PRICE.otros;
  if (budgetMin != null && budgetMin > 0 && base < budgetMin) base = budgetMin;
  if (budgetMax != null && budgetMax > 0 && base > budgetMax) base = Math.round(budgetMax * 0.92);
  return roundToNice(base);
}

export interface ProductSearchInput {
  query: string;
  category: string;
  giftType: GiftType;
  budgetMin: number | null;
  budgetMax: number | null;
  /** Precio que sugirió la IA para este producto (si lo hay). */
  hintPrice?: number;
}

export class ProductSearchService {
  /**
   * Busca las mejores ofertas reales (Mercado Libre). Si no hay credenciales,
   * el producto es una experiencia/servicio o no hay resultados relevantes,
   * devuelve un precio estimado con isEstimated=true y sin ofertas.
   */
  static async search(input: ProductSearchInput): Promise<ProductInfo> {
    const physical = input.giftType === "physical" || input.giftType === "giftcard";
    if (env.hasMercadolibre && physical) {
      try {
        const { offers, strategy } = await findOffers(input.query);
        if (offers.length > 0) {
          const best = offers[0];
          return {
            price: best.price,
            currency: best.currency,
            imageUrl: best.imageUrl,
            productUrl: best.url,
            storeName: best.store,
            isEstimated: false,
            offers,
            pricesUpdatedAt: new Date().toISOString(),
          };
        }
        console.warn(`[ProductSearchService] Sin ofertas (${strategy}) para:`, input.query);
      } catch (error) {
        console.error("[ProductSearchService] Mercado Libre falló, uso estimado:", error);
      }
    }

    // Sin tienda: estimación de la IA para ESTE producto, etiquetada.
    return {
      price:
        input.hintPrice && input.hintPrice > 0
          ? roundToThousands(input.hintPrice)
          : estimatePrice(input.category, input.budgetMin, input.budgetMax),
      currency: "ARS",
      imageUrl: null,
      productUrl: null,
      storeName: null,
      isEstimated: true,
      offers: [],
      pricesUpdatedAt: null,
    };
  }
}
