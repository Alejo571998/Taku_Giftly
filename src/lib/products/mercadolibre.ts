import { env } from "@/lib/env";
import type { ProductOffer } from "@/lib/types";

/**
 * Cliente mínimo de la API de Mercado Libre (Argentina, MLA).
 *
 * Desde 2025 la búsqueda pública responde 403 sin token, y según la app
 * también con token de aplicación. Por eso hay dos estrategias:
 *   1. /sites/MLA/search  → publicaciones que coinciden con la búsqueda.
 *   2. /products/search + /products/{id}/items → producto de catálogo y
 *      las publicaciones de distintos vendedores que lo ofrecen.
 * Usá `npm run check:ml` para ver cuál funciona con tus credenciales.
 */

const API = "https://api.mercadolibre.com";
const MAX_OFFERS = 3;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

export class MercadoLibreError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.mercadolibreClientId,
    client_secret: env.mercadolibreClientSecret,
  });
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new MercadoLibreError(`token: ${response.status}`, response.status);
  }
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 21_600) * 1000,
  };
  return tokenCache.accessToken;
}

async function mlGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new MercadoLibreError(`${path.split("?")[0]}: ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

function toHttps(url: string | undefined | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

/** Evita accesorios o repuestos: el título tiene que compartir palabras clave. */
function isRelevant(title: string, query: string): boolean {
  const q = tokens(query);
  if (q.length === 0) return true;
  const t = new Set(tokens(title));
  const hits = q.filter((w) => t.has(w)).length;
  return hits >= Math.max(1, Math.floor(q.length / 2));
}

function pickBest(offers: (ProductOffer & { sellerKey: string })[]): ProductOffer[] {
  const seen = new Set<string>();
  return offers
    .filter((o) => o.price > 0)
    .sort((a, b) => Number(b.available) - Number(a.available) || a.price - b.price)
    .filter((o) => {
      if (seen.has(o.sellerKey)) return false;
      seen.add(o.sellerKey);
      return true;
    })
    .slice(0, MAX_OFFERS)
    .map((o) => ({
      store: o.store,
      title: o.title,
      price: o.price,
      currency: o.currency,
      url: o.url,
      imageUrl: o.imageUrl,
      freeShipping: o.freeShipping,
      available: o.available,
    }));
}

// ---------- Estrategia 1: búsqueda de publicaciones ----------

interface SearchItem {
  id: string;
  title: string;
  price: number | null;
  currency_id?: string;
  thumbnail?: string;
  permalink?: string;
  available_quantity?: number;
  official_store_name?: string | null;
  seller?: { id: number; nickname?: string };
  shipping?: { free_shipping?: boolean };
}

async function viaSiteSearch(query: string, token: string): Promise<ProductOffer[]> {
  const data = await mlGet<{ results?: SearchItem[] }>(
    `/sites/MLA/search?q=${encodeURIComponent(query)}&limit=15&condition=new`,
    token
  );
  const offers = (data.results ?? [])
    .filter((r) => r.price && r.permalink && isRelevant(r.title, query))
    .map((r) => ({
      sellerKey: String(r.seller?.id ?? r.id),
      store: r.official_store_name || r.seller?.nickname || "Vendedor en Mercado Libre",
      title: r.title,
      price: r.price!,
      currency: r.currency_id ?? "ARS",
      url: r.permalink!,
      imageUrl: toHttps(r.thumbnail),
      freeShipping: Boolean(r.shipping?.free_shipping),
      available: (r.available_quantity ?? 1) > 0,
    }));
  return pickBest(offers);
}

// ---------- Estrategia 2: catálogo de productos ----------

interface CatalogProduct {
  id: string;
  name: string;
  pictures?: { url: string }[];
}

interface CatalogItem {
  item_id: string;
  price: number;
  currency_id?: string;
  seller_id: number;
  official_store_id?: number | null;
  shipping?: { free_shipping?: boolean };
}

async function sellerName(sellerId: number, token: string): Promise<string> {
  try {
    const user = await mlGet<{ nickname?: string }>(`/users/${sellerId}`, token);
    return user.nickname ?? "Vendedor en Mercado Libre";
  } catch {
    return "Vendedor en Mercado Libre";
  }
}

function itemUrl(itemId: string): string {
  // MLA123456 → https://articulo.mercadolibre.com.ar/MLA-123456
  return `https://articulo.mercadolibre.com.ar/${itemId.replace(/^([A-Z]+)(\d+)$/, "$1-$2")}`;
}

async function viaCatalog(query: string, token: string): Promise<ProductOffer[]> {
  const search = await mlGet<{ results?: CatalogProduct[] }>(
    `/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}&limit=5`,
    token
  );
  const product = (search.results ?? []).find((p) => isRelevant(p.name, query));
  if (!product) return [];

  const items = await mlGet<{ results?: CatalogItem[] }>(
    `/products/${product.id}/items?limit=10`,
    token
  );
  const cheapest = (items.results ?? [])
    .filter((i) => i.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_OFFERS * 2);

  const names = await Promise.all(cheapest.map((i) => sellerName(i.seller_id, token)));
  const image = toHttps(product.pictures?.[0]?.url);
  return pickBest(
    cheapest.map((i, index) => ({
      sellerKey: String(i.seller_id),
      store: names[index],
      title: product.name,
      price: i.price,
      currency: i.currency_id ?? "ARS",
      url: itemUrl(i.item_id),
      imageUrl: image,
      freeShipping: Boolean(i.shipping?.free_shipping),
      available: true,
    }))
  );
}

export type MercadoLibreStrategy = "site-search" | "catalog";

/**
 * Mejores ofertas reales para un producto. Prueba la búsqueda y, si ML la
 * bloquea (401/403), el catálogo. Lanza error solo si fallan ambas.
 */
export async function findOffers(
  query: string
): Promise<{ offers: ProductOffer[]; strategy: MercadoLibreStrategy }> {
  const token = await getAccessToken();
  try {
    const offers = await viaSiteSearch(query, token);
    if (offers.length > 0) return { offers, strategy: "site-search" };
  } catch (error) {
    if (!(error instanceof MercadoLibreError) || ![401, 403].includes(error.status)) {
      throw error;
    }
  }
  return { offers: await viaCatalog(query, token), strategy: "catalog" };
}
