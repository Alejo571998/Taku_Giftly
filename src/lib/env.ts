export const env = {
  /**
   * 'local' fuerza el modo sin Supabase (JSON en .data/) aunque haya keys:
   * útil si el proyecto de Supabase está pausado o para desarrollar offline.
   */
  get forceLocal() {
    return process.env.NEXT_PUBLIC_GIFTLY_DATA_MODE === 'local';
  },
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  },
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get hasSupabase() {
    return Boolean(
      !this.forceLocal &&
        this.supabaseUrl &&
        this.supabaseAnonKey &&
        this.supabaseServiceRoleKey
    );
  },
  /** El navegador no ve la service role key: solo URL + anon key. */
  get hasSupabaseClient() {
    return Boolean(!this.forceLocal && this.supabaseUrl && this.supabaseAnonKey);
  },
  get openAIKey() {
    return process.env.OPENAI_API_KEY ?? "";
  },
  get hasOpenAIKey() {
    return Boolean(this.openAIKey);
  },
  get groqKey() {
    return process.env.GROQ_API_KEY ?? "";
  },
  get geminiKey() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  /** Hay al menos un proveedor de IA configurado. */
  get hasAI() {
    return Boolean(this.openAIKey || this.groqKey || this.geminiKey);
  },
  get mercadolibreClientId() {
    return process.env.ML_CLIENT_ID ?? "";
  },
  get mercadolibreClientSecret() {
    return process.env.ML_CLIENT_SECRET ?? "";
  },
  get hasMercadolibre() {
    return Boolean(
      this.mercadolibreClientId && this.mercadolibreClientSecret
    );
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  /**
   * URL pública real (links absolutos: previews de WhatsApp, metadata).
   * Tolera valores cargados a mano ("taku.vercel.app", con comillas, con
   * espacios o barra final): un valor mal escrito rompía el build entero.
   * Si queda en localhost en un deploy de Vercel, usa la URL de producción
   * que Vercel expone automáticamente.
   */
  get siteUrl() {
    const configured = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (configured && !isLocalhost(configured)) return configured;
    const vercelHost = normalizeUrl(
      process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
    );
    if (process.env.VERCEL && vercelHost) return vercelHost;
    return configured ?? "http://localhost:3000";
  },
  get isLocalMode() {
    return !this.hasSupabase;
  },
};

/** "taku.vercel.app" / "'https://x.com/'" → "https://taku.vercel.app" (o null si es inválida). */
export function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    value = `${/^(localhost|127\.0\.0\.1)(:|$)/.test(value) ? "http" : "https"}://${value}`;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isLocalhost(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url);
}
