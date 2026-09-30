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
   * Si NEXT_PUBLIC_APP_URL quedó en localhost en un deploy de Vercel, usa la
   * URL de producción que Vercel expone automáticamente.
   */
  get siteUrl() {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured && !/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured)) {
      return configured.replace(/\/$/, "");
    }
    const vercelHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    if (process.env.VERCEL && vercelHost) return `https://${vercelHost}`;
    return configured ?? "http://localhost:3000";
  },
  get isLocalMode() {
    return !this.hasSupabase;
  },
};