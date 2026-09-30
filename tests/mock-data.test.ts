import { describe, expect, it } from "vitest";
import { buildMockCandidates } from "@/lib/ai/mock-data";
import { makeInput } from "./helpers";

// Frases que asumen que la persona "dijo" o "pidió" algo.
const INVENTED_HINT = /pista|dijo|coment|mencion|pidió|quería/i;

describe("buildMockCandidates (IA de respaldo)", () => {
  it("sin pistas, nunca inventa que la persona dijo algo", () => {
    for (const interests of [["cocina"], ["gaming"], ["viajes", "fotografia"], ["cafe", "libros"]]) {
      const candidates = buildMockCandidates(makeInput({ interests }));
      for (const c of candidates) {
        expect(c.whyItFits, c.name).not.toMatch(INVENTED_HINT);
        for (const pro of c.pros) expect(pro, c.name).not.toMatch(INVENTED_HINT);
        expect(c.matchesHint).toBe(false);
      }
    }
  });

  it("con una pista que coincide, la cita textualmente", () => {
    const hint = "dijo que quería renovar los accesorios de la parrilla";
    const candidates = buildMockCandidates(makeInput({ recentHints: hint }));
    const matched = candidates.filter((c) => c.matchesHint);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched[0].whyItFits).toContain(hint);
  });

  it("no propone gaming por la relación o la edad si no le gusta", () => {
    const candidates = buildMockCandidates(
      makeInput({ recipientRelationship: "amigo", ageRange: "25-34", interests: ["cafe", "libros"] })
    );
    for (const c of candidates) expect(["gaming", "videojuegos"]).not.toContain(c.category);
  });

  it("los precios son positivos y plausibles para 'hasta $50.000'", () => {
    const candidates = buildMockCandidates(
      makeInput({ interests: ["cafe"], budgetMin: 0, budgetMax: 50_000 })
    );
    for (const c of candidates) {
      expect(c.estimatedPrice).toBeGreaterThanOrEqual(20_000);
      expect(c.estimatedPrice).toBeLessThanOrEqual(50_000);
    }
  });

  it("con exclusiones propone ideas distintas", () => {
    const input = makeInput({ interests: ["gaming"], recipientRelationship: "hermano", ageRange: "18-24" });
    const first = buildMockCandidates(input).map((c) => c.name);
    const second = buildMockCandidates(input, first).map((c) => c.name);
    expect(second.length).toBeGreaterThanOrEqual(3);
    for (const name of second) expect(first).not.toContain(name);
  });
});
