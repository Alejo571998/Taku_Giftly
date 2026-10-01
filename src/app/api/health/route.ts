import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
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
  if (!env.hasOpenAIKey) problems.push("Falta OPENAI_API_KEY: se usan ideas de ejemplo.");
  if (onVercel && /localhost/.test(env.appUrl)) {
    problems.push(
      `NEXT_PUBLIC_APP_URL apunta a localhost: se usa ${env.siteUrl} (conviene corregirla en Vercel).`
    );
  }
  if (!env.hasMercadolibre) problems.push("Faltan ML_CLIENT_ID/ML_CLIENT_SECRET: precios estimados.");

  // ?deep=1 prueba Mercado Libre desde este servidor (limitado por IP).
  let mercadolibreCheck: Record<string, string | number> | undefined;
  if (req.nextUrl.searchParams.get("deep") === "1" && env.hasMercadolibre) {
    const rl = checkRateLimit(`health-deep:${clientIp(req)}`, 5, 10 * 60 * 1000);
    mercadolibreCheck = rl.ok ? await diagnoseMercadoLibre() : { skipped: "rate limit" };
  }

  return Response.json(
    {
      ok: !(onVercel && !env.hasSupabase),
      environment: onVercel ? process.env.VERCEL_ENV ?? "vercel" : "local",
      dataMode: env.hasSupabase ? "supabase" : "local",
      siteUrl: env.siteUrl,
      supabaseProject: env.supabaseUrl ? new URL(env.supabaseUrl).hostname.split(".")[0].slice(0, 4) + "…" : null,
      openai: env.hasOpenAIKey,
      mercadolibre: env.hasMercadolibre,
      problems,
      ...(mercadolibreCheck ? { mercadolibreCheck } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
