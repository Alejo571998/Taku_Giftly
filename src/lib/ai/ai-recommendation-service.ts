import OpenAI from "openai";
import type { AISource, GiftCandidate, GiftSessionInput } from "@/lib/types";
import {
  configuredProviders,
  isAvailable,
  markFailure,
  type AIProvider,
} from "@/lib/ai/providers";
import { buildMockCandidates } from "@/lib/ai/mock-data";


const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: {
            type: "string",
            enum: [
              "tecnologia",
              "gaming",
              "deportes",
              "musica",
              "cine",
              "libros",
              "cocina",
              "cafe",
              "moda",
              "belleza",
              "viajes",
              "fitness",
              "fotografia",
              "autos",
              "arte",
              "videojuegos",
              "experiencias",
              "gastronomia",
              "otros",
            ],
          },
          description: { type: "string" },
          why_it_fits: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          estimated_price_hint: { type: "number" },
          gift_type: {
            type: "string",
            enum: ["physical", "experience", "giftcard", "service"],
          },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
          matches_hint: { type: "boolean" },
          budget_fit: {
            type: "string",
            enum: ["within", "over", "under"],
          },
        },
        required: [
          "name",
          "category",
          "description",
          "why_it_fits",
          "tags",
          "estimated_price_hint",
          "gift_type",
          "pros",
          "cons",
          "matches_hint",
          "budget_fit",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
} as const;

export type { AISource } from "@/lib/types";

function buildSystemPrompt(input: GiftSessionInput): string {
  const budget =
    input.budgetMin != null && input.budgetMax != null
      ? `entre $${input.budgetMin.toLocaleString("es-AR")} y $${input.budgetMax.toLocaleString("es-AR")} ARS`
      : input.budgetMax != null
        ? `hasta $${input.budgetMax.toLocaleString("es-AR")} ARS`
        : "sin límite definido";

  // NOTA: AGENTS.md §7.1 no existe en el repo (solo tiene el boilerplate de Next.js).
  // Este prompt es la versión endurecida que respeta interests/recent_hints y evita
  // recomendaciones genéricas, con temperature 0.4 (ver puntos 3 y 4 del pedido).
  return `Sos un experto en regalos para Argentina. Tu tarea es generar recomendaciones
que RESPETEN ESTRICTAMENTE los intereses y las pistas del usuario — no relleno genérico.

Contexto del destinatario:
- Relación: ${input.recipientRelationship}
- Ocasión: ${input.occasion}${input.occasionDate ? ` (fecha: ${input.occasionDate})` : ""}
- Edad: ${input.ageRange}
- Presupuesto: ${budget}
- Intereses (OBLIGATORIO respetar): ${input.interests.join(", ") || "no especificados"}
- Pistas recientes (OBLIGATORIO priorizar si existen): ${input.recentHints || "ninguna"}
- Cosas a evitar (PROHIBIDO recomendar): ${input.thingsToAvoid || "ninguna"}
- Notas adicionales: ${input.additionalNotes || "ninguna"}

Reglas estrictas — incumplimiento = respuesta inválida:
1. CADA recomendación tiene que tener al menos un tag que coincida literalmente con un interés listado, o responder directamente a una pista reciente. Si no podés generar una recomendación que cumpla esto, no la incluyas — es mejor devolver menos de 5 que rellenar con algo que no encaja.
2. Si hay pistas recientes, al menos 2 de las 4-5 recomendaciones deben tener matches_hint=true y why_it_fits debe citar la pista textual (ej: "mencionaste que quiere X").
3. NUNCA recomiendes algo de "cosas a evitar" ni una categoría opuesta a los intereses (ej: si pide tecnología, no devuelvas "experiencia de fútbol" genérica).
4. Respetá el presupuesto: estimated_price_hint debe estar dentro del rango o muy cerca; si no es posible, marcá budget_fit="over"/"under" honestamente.
5. why_it_fits: 2-3 oraciones concretas que conecten interés + pista + ocasión. Prohibido texto genérico tipo "es un gran regalo para sorprender".
6. No inventes precios de tienda: solo estimado plausible en ARS.
7. Devolvé entre 3 y 5 recomendaciones, priorizando calidad de match sobre cantidad.
8. matches_hint=true solo si la recomendación ataca directamente la pista.
9. budget_fit = within/over/under según estimated_price_hint vs presupuesto.`;
}

function mapRawToCandidate(raw: Record<string, unknown>): GiftCandidate {
  return {
    name: String(raw.name ?? ""),
    category: String(raw.category ?? "otros"),
    description: String(raw.description ?? ""),
    whyItFits: String(raw.why_it_fits ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    estimatedPrice: Number(raw.estimated_price_hint ?? 0),
    giftType: (raw.gift_type as GiftCandidate["giftType"]) ?? "physical",
    pros: Array.isArray(raw.pros) ? raw.pros.map(String) : [],
    cons: Array.isArray(raw.cons) ? raw.cons.map(String) : [],
    matchesHint: Boolean(raw.matches_hint),
    budgetFit:
      (raw.budget_fit as GiftCandidate["budgetFit"]) ?? "within",
  };
}

export interface GenerateOptions {
  /** Nombres ya propuestos en esta búsqueda: no repetirlos ("más ideas"). */
  exclude?: string[];
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Saca candidatos repetidos (mismo nombre normalizado) o ya propuestos. */
export function withoutExcluded(candidates: GiftCandidate[], exclude: string[] = []): GiftCandidate[] {
  const seen = new Set(exclude.map(normalizeName));
  return candidates.filter((c) => {
    const key = normalizeName(c.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class AIRecommendationService {
  /**
   * Genera candidatos de regalo probando los proveedores de IA en orden
   * (Groq → Gemini → OpenAI, configurable). Si ninguno responde, usa ideas
   * de ejemplo (modo demo). `source` indica de dónde salieron.
   */
  static async generateGiftRecommendations(
    input: GiftSessionInput,
    options: GenerateOptions = {}
  ): Promise<{ candidates: GiftCandidate[]; source: AISource; fallbackReason?: string }> {
    const exclude = options.exclude ?? [];
    const mock = () => withoutExcluded(buildMockCandidates(input, exclude), exclude);
    const reasons: string[] = [];

    for (const provider of configuredProviders()) {
      if (!isAvailable(provider.id)) {
        reasons.push(`${provider.label}: en pausa`);
        continue;
      }
      try {
        const candidates = withoutExcluded(await this.fromProvider(provider, input, exclude), exclude);
        if (candidates.length >= 3) return { candidates, source: provider.id };
        reasons.push(`${provider.label}: menos de 3 ideas nuevas`);
      } catch (error) {
        markFailure(provider.id, error);
        // Una línea con la causa (ej. "429 insufficient_quota"), sin stack.
        const reason =
          error instanceof OpenAI.APIError
            ? `${error.status} ${error.code ?? error.type ?? ""}`.trim()
            : error instanceof Error
              ? error.message
              : String(error);
        reasons.push(`${provider.label}: ${reason}`);
        console.error(`[AIRecommendationService] ${provider.label} falló (${reason}), probando el siguiente`);
      }
    }

    const fallbackReason = reasons.length > 0 ? reasons.join(" · ") : "sin proveedores de IA configurados";
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[AIRecommendationService] modo demo: ${fallbackReason}`);
    }
    return { candidates: mock(), source: "mock", fallbackReason };
  }

  private static async fromProvider(
    provider: AIProvider,
    input: GiftSessionInput,
    exclude: string[] = []
  ): Promise<GiftCandidate[]> {
    const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL, maxRetries: 0 });

    const completion = await client.chat.completions.create(
      {
        model: provider.model,
        // Un poco más de variedad cuando se piden ideas nuevas.
        temperature: exclude.length > 0 ? 0.8 : 0.4,
        messages: [
          { role: "system", content: buildSystemPrompt(input) },
          {
            role: "user",
            content:
              exclude.length > 0
                ? `Ya propusiste estas ideas y no convencieron: ${exclude.join("; ")}. Generá recomendaciones NUEVAS y distintas (otro tipo de objeto, otro ángulo o una experiencia), respetando las mismas reglas y el esquema pedido. No repitas ni hagas variantes de las anteriores.`
                : "Generá las recomendaciones de regalo siguiendo estrictamente el esquema pedido.",
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "gift_recommendations",
            strict: true,
            schema: RECOMMENDATION_SCHEMA,
          },
        },
        max_tokens: provider.maxTokens,
        ...(provider.extra ?? {}),
      },
      { timeout: 25_000 }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("respuesta vacía");

    const parsed = parseJsonObject(content) as {
      recommendations?: Record<string, unknown>[];
    };
    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("formato inesperado");
    }

    return parsed.recommendations
      .map(mapRawToCandidate)
      .filter((c) => c.name && c.whyItFits);
  }
}

/** Algunos modelos envuelven el JSON en un bloque de código: se toma el objeto. */
export function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1));
    throw new Error("JSON inválido");
  }
}
