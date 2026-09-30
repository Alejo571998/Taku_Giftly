import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Route = (url: string) => { status: number; body: unknown } | undefined;

function mockFetch(route: Route) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/oauth/token")) {
      return Response.json({ access_token: "test-token", expires_in: 21600 });
    }
    const hit = route(url);
    if (!hit) return Response.json({ message: "not mocked" }, { status: 404 });
    return Response.json(hit.body, { status: hit.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function loadModule() {
  vi.resetModules(); // token cache limpio por test
  return import("@/lib/products/mercadolibre");
}

describe("findOffers (Mercado Libre)", () => {
  beforeEach(() => {
    process.env.ML_CLIENT_ID = "id";
    process.env.ML_CLIENT_SECRET = "secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ML_CLIENT_ID = "";
    process.env.ML_CLIENT_SECRET = "";
  });

  it("usa la búsqueda: filtra irrelevantes, un resultado por vendedor, ordena por precio", async () => {
    mockFetch((url) => {
      if (!url.includes("/sites/MLA/search")) return undefined;
      return {
        status: 200,
        body: {
          results: [
            { id: "1", title: "Set Parrillero Premium 5 piezas", price: 90000, permalink: "https://ml/1", seller: { id: 1 }, available_quantity: 3 },
            { id: "2", title: "Kit Parrillero Acero Inoxidable", price: 70000, permalink: "https://ml/2", seller: { id: 2 }, official_store_name: "Tramontina", shipping: { free_shipping: true } },
            { id: "3", title: "Kit Parrillero Básico", price: 60000, permalink: "https://ml/3", seller: { id: 2 } },
            { id: "4", title: "Funda para celular", price: 5000, permalink: "https://ml/4", seller: { id: 4 } },
            { id: "5", title: "Parrillero de lujo", price: 120000, permalink: "https://ml/5", seller: { id: 5 } },
            { id: "6", title: "Parrillero económico", price: 80000, permalink: "https://ml/6", seller: { id: 6 } },
          ],
        },
      };
    });
    const { findOffers } = await loadModule();
    const { offers, strategy } = await findOffers("Kit parrillero profesional");

    expect(strategy).toBe("site-search");
    expect(offers).toHaveLength(3);
    expect(offers.map((o) => o.price)).toEqual([60000, 80000, 90000]);
    expect(offers.some((o) => o.title.includes("Funda"))).toBe(false);
    // el vendedor 2 aparece una sola vez (su oferta más barata)
    expect(offers.filter((o) => o.url.startsWith("https://ml/2") || o.url === "https://ml/3")).toHaveLength(1);
  });

  it("si la búsqueda da 403, usa el catálogo y sus vendedores", async () => {
    mockFetch((url) => {
      if (url.includes("/sites/MLA/search")) return { status: 403, body: { message: "forbidden" } };
      if (url.includes("/products/search")) {
        return { status: 200, body: { results: [{ id: "MLA999", name: "Auriculares Gamer Inalámbricos X", pictures: [{ url: "http://img/1.jpg" }] }] } };
      }
      if (url.includes("/products/MLA999/items")) {
        return {
          status: 200,
          body: {
            results: [
              { item_id: "MLA111", price: 150000, seller_id: 10 },
              { item_id: "MLA222", price: 140000, seller_id: 20, shipping: { free_shipping: true } },
            ],
          },
        };
      }
      if (url.includes("/users/10")) return { status: 200, body: { nickname: "TIENDA10" } };
      if (url.includes("/users/20")) return { status: 200, body: { nickname: "TIENDA20" } };
      return undefined;
    });
    const { findOffers } = await loadModule();
    const { offers, strategy } = await findOffers("Auriculares gamer inalámbricos");

    expect(strategy).toBe("catalog");
    expect(offers[0]).toMatchObject({
      store: "TIENDA20",
      price: 140000,
      freeShipping: true,
      url: "https://articulo.mercadolibre.com.ar/MLA-222",
      imageUrl: "https://img/1.jpg",
    });
    expect(offers[1].store).toBe("TIENDA10");
  });

  it("un error que no es de permisos se propaga (y el servicio cae a estimado)", async () => {
    mockFetch((url) => (url.includes("/sites/MLA/search") ? { status: 500, body: {} } : undefined));
    const { findOffers } = await loadModule();
    await expect(findOffers("algo")).rejects.toThrow();
  });
});

describe("ProductSearchService", () => {
  it("sin credenciales devuelve un estimado etiquetado y sin ofertas", async () => {
    const { ProductSearchService } = await import("@/lib/products/product-search-service");
    const info = await ProductSearchService.search({
      query: "Kit parrillero",
      category: "cocina",
      giftType: "physical",
      budgetMin: 100_000,
      budgetMax: 200_000,
      hintPrice: 154_321,
    });
    expect(info).toMatchObject({ isEstimated: true, offers: [], price: 154_000, pricesUpdatedAt: null });
  });
});

describe("catálogo: varios productos y filtro de precio", () => {
  beforeEach(() => {
    process.env.ML_CLIENT_ID = "id";
    process.env.ML_CLIENT_SECRET = "secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ML_CLIENT_ID = "";
    process.env.ML_CLIENT_SECRET = "";
  });

  it("salta productos sin vendedores y descarta precios fuera de rango", async () => {
    mockFetch((url) => {
      if (url.includes("/sites/MLA/search")) return { status: 403, body: {} };
      if (url.includes("/products/search")) {
        return {
          status: 200,
          body: {
            results: [
              { id: "P1", name: "Termo Stanley Classic 1L" },
              { id: "P2", name: "Termo Stanley Quencher", children_ids: ["P2A"] },
            ],
          },
        };
      }
      if (url.includes("/products/P1/items")) return { status: 404, body: { message: "No winners found" } };
      if (url.includes("/products/P2/items")) return { status: 404, body: { message: "No winners found" } };
      if (url.includes("/products/P2A/items")) {
        return {
          status: 200,
          body: {
            results: [
              { item_id: "MLA1", price: 5000, seller_id: 1 }, // repuesto: muy barato
              { item_id: "MLA2", price: 120000, seller_id: 2 },
              { item_id: "MLA3", price: 900000, seller_id: 3 }, // pack: muy caro
              { item_id: "MLA4", price: 110000, seller_id: 4, condition: "used" },
            ],
          },
        };
      }
      if (url.includes("/users/")) return { status: 200, body: { nickname: "VENDEDOR" } };
      return undefined;
    });
    const { findOffers } = await loadModule();
    const { offers } = await findOffers("Termo Stanley", 130_000);
    expect(offers.map((o) => o.price)).toEqual([120000]);
    expect(offers[0].title).toBe("Termo Stanley Quencher");
  });
});

describe("isRelevant", () => {
  it.each([
    ["Kit Parrillero Herramientas Parrilla Asador", "Kit parrillero profesional", true],
    ["Parrilla 60x50 + Kit Parrillero", "Kit parrillero profesional", false],
    ["Mochila Footy Camiseta Futbol Carro", "Camiseta de fútbol personalizada", false],
    ["Camiseta Selección Argentina Fútbol", "Camiseta de fútbol personalizada", true],
    ["Auriculares Gamer Inalámbricos Corsair", "Auriculares gamer inalámbricos", true],
    ["Funda para auriculares", "Auriculares gamer inalámbricos", false],
    ["Set Cuchillos Cocina Chef", "Set de cuchillos de chef", true],
  ])("%s ← %s → %s", async (title, query, expected) => {
    const { isRelevant } = await import("@/lib/products/mercadolibre");
    expect(isRelevant(title, query)).toBe(expected);
  });
});
