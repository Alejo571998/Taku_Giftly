import type { GiftType } from "@/lib/types";

export interface StoreSearchLink {
  store: string;
  url: string;
  hint: string;
}

function mlSlug(query: string): string {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Links de búsqueda reales para comparar precios en tiendas. No muestran
 * precios inventados: llevan a la búsqueda del producto en cada tienda.
 */
export function storeSearchLinks(query: string, giftType: GiftType): StoreSearchLink[] {
  const q = encodeURIComponent(query);
  if (giftType === "experience" || giftType === "service") {
    return [
      {
        store: "Google",
        url: `https://www.google.com/search?q=${q}+Argentina`,
        hint: "Proveedores y reseñas",
      },
      {
        store: "Mercado Libre",
        url: `https://listado.mercadolibre.com.ar/${mlSlug(query)}`,
        hint: "Vouchers y experiencias",
      },
    ];
  }
  return [
    {
      store: "Mercado Libre",
      url: `https://listado.mercadolibre.com.ar/${mlSlug(query)}`,
      hint: "Envíos a todo el país",
    },
    {
      store: "Google Shopping",
      url: `https://www.google.com/search?tbm=shop&gl=ar&q=${q}`,
      hint: "Compará varias tiendas",
    },
  ];
}
