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

/** Palabras con significado, sin acentos y en singular aproximado. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3)
    .map((w) => {
      let s = w;
      if (s.length > 4 && s.endsWith("s")) s = s.slice(0, -1);
      if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
      return s;
    });
}

/**
 * ¿La publicación es el mismo tipo de producto? Además de compartir palabras
 * clave, el título tiene que *empezar* por algo que se buscó: así "Mochila …
 * Camiseta" no pasa por "Camiseta", ni "Parrilla + Kit" por "Kit parrillero".
 */
export function isRelevant(title: string, query: string): boolean {
  const q = tokens(query);
  if (q.length === 0) return true;
  const t = tokens(title);
  if (t.length === 0) return false;
  const titleWords = new Set(t);
  const hits = q.filter((w) => titleWords.has(w)).length;
  return hits >= Math.max(1, Math.floor(q.length / 2)) && q.includes(t[0]);
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
//
// Medido en la cuenta real (sep-2026): muchos productos del catálogo no
// tienen vendedores activos ("No winners found"), así que se consultan
// varios productos relevantes (y variantes) en paralelo y se juntan ofertas.

const CATALOG_PRODUCTS = 8;
const CATALOG_IDS_MAX = 12;

interface CatalogProduct {
  id: string;
  name: string;
  pictures?: { url: string }[];
  children_ids?: string[];
}

interface CatalogItem {
  item_id: string;
  price: number;
  currency_id?: string;
  seller_id: number;
  condition?: string;
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

/**
 * Precio razonable respecto de lo que estimó la IA: descarta accesorios o
 * repuestos baratos y combos/packs muy caros que comparten nombre.
 */
export function withinPriceBand(price: number, referencePrice?: number): boolean {
  if (!referencePrice || referencePrice <= 0) return true;
  return price >= referencePrice * 0.35 && price <= referencePrice * 2.5;
}

async function itemsOf(productId: string, token: string): Promise<CatalogItem[]> {
  try {
    const data = await mlGet<{ results?: CatalogItem[] }>(`/products/${productId}/items?limit=5`, token);
    return data.results ?? [];
  } catch {
    return []; // 404 "No winners found": producto sin vendedores activos
  }
}

async function viaCatalog(
  query: string,
  token: string,
  referencePrice?: number
): Promise<ProductOffer[]> {
  const search = await mlGet<{ results?: CatalogProduct[] }>(
    `/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}&limit=10`,
    token
  );
  const products = (search.results ?? [])
    .filter((p) => isRelevant(p.name, query))
    .slice(0, CATALOG_PRODUCTS);
  if (products.length === 0) return [];

  // Producto + hasta 2 variantes, heredando nombre e imagen del padre.
  const targets = products
    .flatMap((p) =>
      [p.id, ...(p.children_ids ?? []).slice(0, 2)].map((id) => ({ id, product: p }))
    )
    .slice(0, CATALOG_IDS_MAX);

  const found = await Promise.all(
    targets.map(async ({ id, product }) => ({ product, items: await itemsOf(id, token) }))
  );

  const candidates = found.flatMap(({ product, items }) =>
    items
      .filter((i) => i.price > 0 && (i.condition ?? "new") === "new")
      .filter((i) => withinPriceBand(i.price, referencePrice))
      .map((i) => ({
        sellerId: i.seller_id,
        sellerKey: String(i.seller_id),
        store: "",
        title: product.name,
        price: Math.round(i.price),
        currency: i.currency_id ?? "ARS",
        url: itemUrl(i.item_id),
        imageUrl: toHttps(product.pictures?.[0]?.url),
        freeShipping: Boolean(i.shipping?.free_shipping),
        available: true,
      }))
  );

  const best = pickBest(candidates);
  // Nombres de vendedor solo para las ofertas que se muestran.
  const names = await Promise.all(
    best.map((offer) => {
      const candidate = candidates.find((c) => c.url === offer.url);
      return candidate ? sellerName(candidate.sellerId, token) : "Vendedor en Mercado Libre";
    })
  );
  return best.map((offer, index) => ({ ...offer, store: names[index] }));
}

export type MercadoLibreStrategy = "site-search" | "catalog";

/** Si la búsqueda de publicaciones está bloqueada para la app, no insistir. */
let siteSearchBlockedUntil = 0;

/**
 * Mejores ofertas reales para un producto. Prueba la búsqueda y, si ML la
 * bloquea (401/403), el catálogo. Lanza error solo si fallan ambas.
 * `referencePrice` (estimación de la IA) filtra ofertas de otro rango.
 */
export async function findOffers(
  query: string,
  referencePrice?: number
): Promise<{ offers: ProductOffer[]; strategy: MercadoLibreStrategy }> {
  const token = await getAccessToken();
  if (Date.now() >= siteSearchBlockedUntil) {
    try {
      const offers = (await viaSiteSearch(query, token)).filter((o) =>
        withinPriceBand(o.price, referencePrice)
      );
      if (offers.length > 0) return { offers, strategy: "site-search" };
    } catch (error) {
      if (!(error instanceof MercadoLibreError) || ![401, 403].includes(error.status)) {
        throw error;
      }
      siteSearchBlockedUntil = Date.now() + 60 * 60 * 1000;
    }
  }
  return { offers: await viaCatalog(query, token, referencePrice), strategy: "catalog" };
}
