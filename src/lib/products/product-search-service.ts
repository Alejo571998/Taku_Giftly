import type { ProductInfo } from "@/lib/types";
import { env } from "@/lib/env";

interface MercadoLibreResult {
  id: string;
  title: string;
  price: number | null;
  currency_id?: string;
  thumbnail?: string;
  permalink?: string;
}

interface MercadoLibreResponse {
  results?: MercadoLibreResult[];
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.mercadolibreClientId,
    client_secret: env.mercadolibreClientSecret,
  });

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Mercado Libre token error: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 21_600) * 1000,
  };

  return tokenCache.accessToken;
}

function toHttps(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

async function searchMercadoLibre(query: string): Promise<MercadoLibreResult | null> {
  const token = await getAccessToken();
  const url = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=3`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Mercado Libre search error: ${response.status}`);
  }

  const data = (await response.json()) as MercadoLibreResponse;
  const result = (data.results ?? []).find(
    (r) => r.price != null && r.price > 0
  );
  return result ?? null;
}

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

  if (budgetMin != null && budgetMin > 0 && base < budgetMin) {
    base = budgetMin;
  }
  if (budgetMax != null && budgetMax > 0 && base > budgetMax) {
    base = Math.round(budgetMax * 0.92);
  }

  return roundToNice(base);
}

function roundToThousands(value: number): number {
  return Math.max(1000, Math.round(value / 1000) * 1000);
}

export class ProductSearchService {
  /**
   * Busca precio, imagen y link reales en Mercado Libre.
   * Si no hay credenciales de app o la búsqueda falla/vacía,
   * devuelve un precio estimado con isEstimated=true.
   */
  static async search(
    query: string,
    category: string,
    budgetMin: number | null,
    budgetMax: number | null,
    /** Precio que sugirió la IA para este producto (si lo hay). */
    hintPrice?: number
  ): Promise<ProductInfo> {
    if (env.hasMercadolibre) {
      try {
        const result = await searchMercadoLibre(query);
        if (result && result.price != null) {
          return {
            price: result.price,
            currency: result.currency_id ?? "ARS",
            imageUrl: toHttps(result.thumbnail),
            productUrl: result.permalink ?? null,
            storeName: "Mercado Libre",
            isEstimated: false,
          };
        }
        console.warn(
          "[ProductSearchService] Sin resultados en Mercado Libre para:",
          query
        );
      } catch (error) {
        console.error(
          "[ProductSearchService] Mercado Libre falló, usando precio estimado:",
          error
        );
      }
    }

    // Sin tienda: usamos la estimación de la IA para ESTE producto (no un
    // precio por categoría clavado en el tope del presupuesto). Etiquetado.
    return {
      price:
        hintPrice && hintPrice > 0
          ? roundToThousands(hintPrice)
          : estimatePrice(category, budgetMin, budgetMax),
      currency: "ARS",
      imageUrl: null,
      productUrl: null,
      storeName: null,
      isEstimated: true,
    };
  }
}