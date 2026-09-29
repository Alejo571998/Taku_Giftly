import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let serviceClient: SupabaseClient | null = null;
let browserClient: SupabaseClient | null = null;

/**
 * Cliente con service role: SOLO se usa en el servidor (API routes).
 * Nunca se expone esta key al cliente.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!env.hasSupabase) return null;
  if (!serviceClient) {
    serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

/**
 * Cliente del navegador con la anon key: para auth anónima transparente
 * y suscripciones Realtime. RLS limita lo que puede leer/escribir.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (!env.hasSupabaseClient) return null;
  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}