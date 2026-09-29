import OpenAI from "openai";
import type { GiftCandidate, GiftSessionInput } from "@/lib/types";
import { env } from "@/lib/env";
import { buildMockCandidates } from "@/lib/ai/mock-data";

const AI_MODEL = "gpt-4o-mini";

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

export type AISource = "openai" | "mock";

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

export class AIRecommendationService {
  /**
   * Genera candidatos de regalo. Si OpenAI está configurado usa structured
   * outputs (JSON Schema estricto vía response_format); ante cualquier fallo
   * (sin key, error de red, timeout) hace fallback automático a los mocks.
   * Devuelve también `source` para el badge de desarrollo (punto 2).
   */
  static async generateGiftRecommendations(
    input: GiftSessionInput
  ): Promise<{ candidates: GiftCandidate[]; source: AISource; fallbackReason?: string }> {
    if (!env.hasOpenAIKey) {
      console.warn('[AIRecommendationService] sin OPENAI_API_KEY, usando mock');
      return { candidates: buildMockCandidates(input), source: "mock", fallbackReason: "sin OPENAI_API_KEY" };
    }

    try {
      const candidates = await this.fromOpenAI(input);
      if (candidates.length >= 3) return { candidates, source: "openai" };
      return { candidates: buildMockCandidates(input), source: "mock", fallbackReason: "OpenAI devolvió <3 candidatos" };
    } catch (error) {
      console.error("[AIRecommendationService] OpenAI falló, usando mock:", error);
      return { candidates: buildMockCandidates(input), source: "mock", fallbackReason: String(error) };
    }
  }

  private static async fromOpenAI(
    input: GiftSessionInput
  ): Promise<GiftCandidate[]> {
    const client = new OpenAI({ apiKey: env.openAIKey });

    const completion = await client.chat.completions.create(
      {
        model: AI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: buildSystemPrompt(input) },
          {
            role: "user",
            content:
              "Generá las recomendaciones de regalo siguiendo estrictamente el esquema pedido.",
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
        max_tokens: 1800,
      },
      { timeout: 30000 }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Respuesta vacía de OpenAI");

    const parsed = JSON.parse(content) as {
      recommendations?: Record<string, unknown>[];
    };
    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("Formato inesperado en la respuesta de OpenAI");
    }

    return parsed.recommendations
      .map(mapRawToCandidate)
      .filter((c) => c.name && c.whyItFits);
  }
}