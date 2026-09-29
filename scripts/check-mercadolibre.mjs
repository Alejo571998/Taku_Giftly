// Verifica las credenciales de Mercado Libre de .env y qué búsqueda
// habilita tu app. Uso: npm run check:ml   (nunca imprime las keys)

const API = "https://api.mercadolibre.com";
const id = process.env.ML_CLIENT_ID;
const secret = process.env.ML_CLIENT_SECRET;
const query = process.argv[2] ?? "kit parrillero";

if (!id || !secret) {
  console.error("✗ Faltan ML_CLIENT_ID y/o ML_CLIENT_SECRET en .env");
  process.exit(1);
}

const tokenRes = await fetch(`${API}/oauth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
});
if (!tokenRes.ok) {
  console.error(`✗ Token: HTTP ${tokenRes.status}. Revisá Client ID / Client Secret.`);
  console.error(await tokenRes.text());
  process.exit(1);
}
const { access_token: token } = await tokenRes.json();
console.log("✓ Token de aplicación obtenido");

async function probe(label, path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  const count = body.results?.length ?? 0;
  console.log(`${res.ok ? "✓" : "✗"} ${label}: HTTP ${res.status}${res.ok ? ` · ${count} resultados` : ` · ${body.message ?? ""}`}`);
  return res.ok ? body : null;
}

const q = encodeURIComponent(query);
const site = await probe("Búsqueda de publicaciones (/sites/MLA/search)", `/sites/MLA/search?q=${q}&limit=3`);
site?.results?.slice(0, 3).forEach((r) => console.log(`    $${r.price}  ${r.title}`));

const catalog = await probe("Catálogo (/products/search)", `/products/search?status=active&site_id=MLA&q=${q}&limit=3`);
const productId = catalog?.results?.[0]?.id;
if (productId) {
  const items = await probe(`Vendedores del producto ${productId}`, `/products/${productId}/items?limit=3`);
  items?.results?.forEach((i) => console.log(`    $${i.price}  vendedor ${i.seller_id}`));
}

if (!site && !catalog) {
  console.log("\n✗ Ninguna búsqueda está habilitada para esta app: Giftly va a mostrar precios estimados.");
  console.log("  Revisá los permisos/scopes de la app en developers.mercadolibre.com.ar.");
} else {
  console.log("\n✓ Giftly puede traer precios reales.");
}
