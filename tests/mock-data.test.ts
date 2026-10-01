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

  it("con 'hasta $50.000' hay opciones dentro del presupuesto", () => {
    const candidates = buildMockCandidates(
      makeInput({ interests: ["cafe"], budgetMin: 0, budgetMax: 50_000 })
    );
    for (const c of candidates) expect(c.estimatedPrice).toBeGreaterThan(0);
    // Hay opciones que entran en el presupuesto (sin inventar precios para forzarlo)
    expect(candidates.some((c) => c.estimatedPrice <= 50_000)).toBe(true);
  });

  it("con exclusiones propone ideas distintas", () => {
    const input = makeInput({ interests: ["gaming"], recipientRelationship: "hermano", ageRange: "18-24" });
    const first = buildMockCandidates(input).map((c) => c.name);
    const second = buildMockCandidates(input, first).map((c) => c.name);
    expect(second.length).toBeGreaterThanOrEqual(3);
    for (const name of second) expect(first).not.toContain(name);
  });
});

describe("modo demo: selección idea por idea", () => {
  it("mamá que cocina y lee: nada de fútbol ni planes románticos", () => {
    const names = buildMockCandidates(
      makeInput({ recipientRelationship: "madre", interests: ["cocina", "libros"], budgetMin: 50_000, budgetMax: 100_000 })
    ).map((c) => c.name);
    expect(names).toContain("Libro de cocina de autor");
    expect(names.some((n) => /fútbol|equipo|romántica|velas/i.test(n))).toBe(false);
  });

  it("las ideas románticas solo aparecen para la pareja", () => {
    const forMom = buildMockCandidates(makeInput({ recipientRelationship: "madre", interests: ["viajes", "fotografia"] }));
    const forPartner = buildMockCandidates(makeInput({ recipientRelationship: "pareja", interests: ["viajes", "fotografia"] }));
    expect(forMom.some((c) => /romántica|velas/i.test(c.name))).toBe(false);
    expect(forPartner.some((c) => /romántica/i.test(c.name))).toBe(true);
  });

  it.each(["tecnologia", "gaming", "deportes", "musica", "cine", "libros", "cocina", "cafe", "moda", "belleza", "viajes", "fitness", "fotografia", "autos", "arte", "videojuegos", "experiencias", "gastronomia"])(
    "con el gusto '%s' la primera idea coincide con ese gusto",
    (interest) => {
      const [first] = buildMockCandidates(makeInput({ recipientRelationship: "amigo", interests: [interest], budgetMin: 0, budgetMax: null }));
      expect(first.tags).toContain(interest);
    }
  );

  it("respeta 'cosas a evitar'", () => {
    const names = buildMockCandidates(
      makeInput({ interests: ["cocina"], thingsToAvoid: "ya tiene cuchillos" })
    ).map((c) => c.name);
    expect(names.some((n) => /cuchillo/i.test(n))).toBe(false);
  });

  it("no inventa precios: las ideas concretas mantienen su precio estimado", () => {
    const [book] = buildMockCandidates(
      makeInput({ recipientRelationship: "madre", interests: ["libros", "cocina"], budgetMin: 100_000, budgetMax: 300_000 })
    ).filter((c) => c.name === "Libro de cocina de autor");
    expect(book?.estimatedPrice).toBe(40_000);
  });

  it("'otros' sin gustos concretos propone ideas abiertas primero", () => {
    const [first] = buildMockCandidates(makeInput({ recipientRelationship: "hijo", interests: ["otros"] }));
    expect(["giftcard", "experience"]).toContain(first.giftType);
  });
});
