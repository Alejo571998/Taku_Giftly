import { env } from "@/lib/env";

/**
 * Estado de la configuración (sin exponer keys): sirve para verificar un
 * deploy. Ej: https://tu-app.vercel.app/api/health
 */
export function GET() {
  const onVercel = Boolean(process.env.VERCEL);
  const problems: string[] = [];
  if (!env.hasSupabase) {
    problems.push(
      env.forceLocal
        ? "NEXT_PUBLIC_GIFTLY_DATA_MODE=local está activo: en producción hay que borrarlo."
        : "Faltan variables de Supabase (URL, anon key y/o service role key)."
    );
  }
  if (!env.hasOpenAIKey) problems.push("Falta OPENAI_API_KEY: se usan ideas de ejemplo.");
  if (!env.hasMercadolibre) problems.push("Faltan ML_CLIENT_ID/ML_CLIENT_SECRET: precios estimados.");

  return Response.json(
    {
      ok: !(onVercel && !env.hasSupabase),
      environment: onVercel ? process.env.VERCEL_ENV ?? "vercel" : "local",
      dataMode: env.hasSupabase ? "supabase" : "local",
      supabaseProject: env.supabaseUrl ? new URL(env.supabaseUrl).hostname.split(".")[0].slice(0, 4) + "…" : null,
      openai: env.hasOpenAIKey,
      mercadolibre: env.hasMercadolibre,
      problems,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
