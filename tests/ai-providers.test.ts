import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeInput } from "./helpers";

// Simula el SDK de OpenAI: cada proveedor (por baseURL) responde lo que el
// test define. Nunca se llama a una API real.
type Behavior = { error?: { status: number; code?: string } } | { content: string };
const behaviors = new Map<string, Behavior>();
const calls: string[] = [];

vi.mock("openai", () => {
  class APIError extends Error {
    constructor(public status: number, public code?: string) {
      super(`${status}`);
    }
  }
  class OpenAI {
    static APIError = APIError;
    baseURL: string;
    constructor(opts: { baseURL?: string }) {
      this.baseURL = opts.baseURL ?? "openai";
    }
    chat = {
      completions: {
        create: async () => {
          const key = this.baseURL.includes("groq") ? "groq" : this.baseURL.includes("generativelanguage") ? "gemini" : "openai";
          calls.push(key);
          const b = behaviors.get(key);
          if (!b) throw new APIError(500);
          if ("error" in b && b.error) throw new APIError(b.error.status, b.error.code);
          return { choices: [{ message: { content: (b as { content: string }).content } }] };
        },
      },
    };
  }
  return { default: OpenAI, APIError };
});

const validJson = (names: string[]) =>
  JSON.stringify({
    recommendations: names.map((name) => ({
      name,
      category: "cocina",
      description: "desc",
      why_it_fits: "porque le gusta cocinar",
      tags: ["cocina"],
      estimated_price_hint: 120000,
      gift_type: "physical",
      pros: [],
      cons: [],
      matches_hint: false,
      budget_fit: "within",
    })),
  });

async function load() {
  vi.resetModules();
  const providers = await import("@/lib/ai/providers");
  providers.resetProviderState();
  const { AIRecommendationService } = await import("@/lib/ai/ai-recommendation-service");
  return { AIRecommendationService, providers };
}

describe("cadena de proveedores de IA", () => {
  beforeEach(() => {
    behaviors.clear();
    calls.length = 0;
    process.env.GROQ_API_KEY = "g";
    process.env.GEMINI_API_KEY = "m";
    process.env.OPENAI_API_KEY = "o";
    delete process.env.AI_PROVIDER_ORDER;
  });
  afterEach(() => {
    process.env.GROQ_API_KEY = "";
    process.env.GEMINI_API_KEY = "";
    process.env.OPENAI_API_KEY = "";
  });

  it("usa el primero que responde (Groq)", async () => {
    behaviors.set("groq", { content: validJson(["A", "B", "C"]) });
    const { AIRecommendationService } = await load();
    const result = await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(result.source).toBe("groq");
    expect(calls).toEqual(["groq"]);
  });

  it("si Groq se queda sin cupo, sigue con Gemini", async () => {
    behaviors.set("groq", { error: { status: 429 } });
    behaviors.set("gemini", { content: "```json\n" + validJson(["A", "B", "C"]) + "\n```" });
    const { AIRecommendationService } = await load();
    const result = await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(result.source).toBe("gemini");
    expect(calls).toEqual(["groq", "gemini"]);
  });

  it("si ninguno responde, modo demo con la causa", async () => {
    behaviors.set("groq", { error: { status: 401 } });
    behaviors.set("gemini", { error: { status: 429 } });
    behaviors.set("openai", { error: { status: 429, code: "insufficient_quota" } });
    const { AIRecommendationService } = await load();
    const result = await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(result.source).toBe("mock");
    expect(result.candidates.length).toBeGreaterThanOrEqual(3);
    expect(result.fallbackReason).toContain("Groq");
  });

  it("un proveedor sin crédito queda en pausa y no se reintenta enseguida", async () => {
    behaviors.set("openai", { error: { status: 429, code: "insufficient_quota" } });
    process.env.AI_PROVIDER_ORDER = "openai";
    const { AIRecommendationService } = await load();
    await AIRecommendationService.generateGiftRecommendations(makeInput());
    await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(calls).toEqual(["openai"]);
  });

  it("descarta respuestas con menos de 3 ideas y prueba el siguiente", async () => {
    behaviors.set("groq", { content: validJson(["A"]) });
    behaviors.set("gemini", { content: validJson(["A", "B", "C", "D"]) });
    const { AIRecommendationService } = await load();
    const result = await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(result.source).toBe("gemini");
    expect(result.candidates).toHaveLength(4);
  });

  it("sin keys no llama a nadie (modo demo)", async () => {
    process.env.GROQ_API_KEY = "";
    process.env.GEMINI_API_KEY = "";
    process.env.OPENAI_API_KEY = "";
    const { AIRecommendationService } = await load();
    const result = await AIRecommendationService.generateGiftRecommendations(makeInput());
    expect(result.source).toBe("mock");
    expect(calls).toEqual([]);
  });
});

describe("cooldownFor", () => {
  it("pausa más tiempo por falta de crédito o key inválida que por límite por minuto", async () => {
    const { cooldownFor } = await import("@/lib/ai/providers");
    expect(cooldownFor({ status: 429, code: "insufficient_quota" })).toBe(30 * 60_000);
    expect(cooldownFor({ status: 401 })).toBe(30 * 60_000);
    expect(cooldownFor({ status: 429 })).toBe(60_000);
    expect(cooldownFor({ status: 500 })).toBe(0);
  });
});
