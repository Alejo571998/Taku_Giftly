import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { configuredProviders, isAvailable, pingProvider } from "@/lib/ai/providers";
import { diagnoseMercadoLibre } from "@/lib/products/mercadolibre";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Estado de la configuración (sin exponer keys): sirve para verificar un
 * deploy. Ej: https://tu-app.vercel.app/api/health
 */
export async function GET(req: NextRequest) {
  const onVercel = Boolean(process.env.VERCEL);
  const problems: string[] = [];
  if (!env.hasSupabase) {
    problems.push(
      env.forceLocal
        ? "NEXT_PUBLIC_GIFTLY_DATA_MODE=local está activo: en producción hay que borrarlo."
        : `Faltan variables de Supabase: ${[
            !env.supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
            !env.supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            !env.supabaseServiceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
          ]
            .filter(Boolean)
            .join(", ")}.`
    );
  }
  const providers = configuredProviders();
  if (providers.length === 0) {
    problems.push("No hay IA configurada (GROQ_API_KEY, GEMINI_API_KEY u OPENAI_API_KEY): modo demo.");
  }
  if (onVercel && /localhost/.test(env.appUrl)) {
    problems.push(
      `NEXT_PUBLIC_APP_URL apunta a localhost: se usa ${env.siteUrl} (conviene corregirla en Vercel).`
    );
  }
  if (!env.hasMercadolibre) problems.push("Faltan ML_CLIENT_ID/ML_CLIENT_SECRET: precios estimados.");

  // ?deep=1 prueba IA y Mercado Libre desde este servidor (limitado por IP).
  let mercadolibreCheck: Record<string, string | number> | undefined;
  let aiCheck: Record<string, string> | undefined;
  if (req.nextUrl.searchParams.get("deep") === "1") {
    const rl = checkRateLimit(`health-deep:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      aiCheck = { skipped: "rate limit" };
    } else {
      const [ml, pings] = await Promise.all([
        env.hasMercadolibre ? diagnoseMercadoLibre() : Promise.resolve(undefined),
        Promise.all(providers.map(async (p) => [p.id, await pingProvider(p)] as const)),
      ]);
      mercadolibreCheck = ml;
      aiCheck = Object.fromEntries(pings);
    }
  }

  return Response.json(
    {
      ok: !(onVercel && !env.hasSupabase),
      environment: onVercel ? process.env.VERCEL_ENV ?? "vercel" : "local",
      dataMode: env.hasSupabase ? "supabase" : "local",
      siteUrl: env.siteUrl,
      supabaseProject: env.supabaseUrl ? new URL(env.supabaseUrl).hostname.split(".")[0].slice(0, 4) + "…" : null,
      // Orden en que se prueban; "en pausa" = falló hace poco (sin crédito/límite).
      ai: providers.map((p) => (isAvailable(p.id) ? p.id : `${p.id} (en pausa)`)),
      demoMode: providers.length === 0,
      mercadolibre: env.hasMercadolibre,
      problems,
      ...(aiCheck ? { aiCheck } : {}),
      ...(mercadolibreCheck ? { mercadolibreCheck } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
