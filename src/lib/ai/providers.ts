import { env } from "@/lib/env";

/**
 * Proveedores de IA compatibles con la API de OpenAI. Se prueban en orden:
 * si uno falla o se queda sin cupo, se pasa al siguiente; si ninguno
 * responde, Giftly usa ideas de ejemplo (modo demo).
 *
 * Groq y Gemini tienen plan gratuito sin tarjeta (sep-2026).
 */

export type AIProviderId = "groq" | "gemini" | "openai";

export interface AIProvider {
  id: AIProviderId;
  label: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  /** Tokens de salida (en modelos con razonamiento incluye el razonamiento). */
  maxTokens: number;
  /** Parámetros extra del proveedor (ej. esfuerzo de razonamiento). */
  extra?: Record<string, unknown>;
}

const DEFAULT_ORDER: AIProviderId[] = ["groq", "gemini", "openai"];

function build(id: AIProviderId): AIProvider | null {
  switch (id) {
    case "groq":
      if (!env.groqKey) return null;
      return {
        id,
        label: "Groq",
        apiKey: env.groqKey,
        baseURL: "https://api.groq.com/openai/v1",
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        maxTokens: 4000,
        extra: { reasoning_effort: "low" },
      };
    case "gemini":
      if (!env.geminiKey) return null;
      return {
        id,
        label: "Gemini",
        apiKey: env.geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
        maxTokens: 4000,
        extra: { reasoning_effort: "low" },
      };
    case "openai":
      if (!env.openAIKey) return null;
      return {
        id,
        label: "OpenAI",
        apiKey: env.openAIKey,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        maxTokens: 1800,
      };
  }
}

/** Proveedores con key, en el orden de AI_PROVIDER_ORDER (o el default). */
export function configuredProviders(): AIProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AIProviderId => DEFAULT_ORDER.includes(s as AIProviderId));
  const ids = order.length > 0 ? order : DEFAULT_ORDER;
  return ids.map(build).filter((p): p is AIProvider => p !== null);
}

// ---------- "Fusible" por proveedor ----------
// Un proveedor sin crédito o con la key mal no se vuelve a intentar por un
// rato, para no sumar segundos de espera a cada búsqueda.

const skipUntil = new Map<AIProviderId, number>();

export function isAvailable(id: AIProviderId, now = Date.now()): boolean {
  return (skipUntil.get(id) ?? 0) <= now;
}

/** Cuánto tiempo saltear un proveedor según el error (0 = no saltear). */
export function cooldownFor(error: unknown): number {
  const e = error as { status?: number; code?: string; type?: string } | null;
  const status = e?.status;
  const code = `${e?.code ?? ""} ${e?.type ?? ""}`;
  if (/insufficient_quota|credit|billing/i.test(code)) return 30 * 60_000; // sin crédito
  if (status === 401 || status === 403) return 30 * 60_000; // key inválida
  if (status === 429) return 60_000; // límite por minuto
  return 0;
}

export function markFailure(id: AIProviderId, error: unknown, now = Date.now()): void {
  const ms = cooldownFor(error);
  if (ms > 0) skipUntil.set(id, now + ms);
}

/** Solo para tests. */
export function resetProviderState(): void {
  skipUntil.clear();
}

/**
 * Prueba mínima de un proveedor para /api/health?deep=1: un pedido corto que
 * confirma key, modelo y cupo. Devuelve "ok" o el código de error.
 */
export async function pingProvider(provider: AIProvider): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL, maxRetries: 0 });
  const started = Date.now();
  try {
    await client.chat.completions.create(
      {
        model: provider.model,
        messages: [{ role: "user", content: "Respondé solo: ok" }],
        max_tokens: 300,
        ...(provider.extra ?? {}),
      },
      { timeout: 15_000 }
    );
    return `ok · ${provider.model} · ${Date.now() - started}ms`;
  } catch (error) {
    const e = error as { status?: number; code?: string; message?: string };
    return `error ${e.status ?? ""} ${e.code ?? e.message ?? ""}`.trim();
  }
}
