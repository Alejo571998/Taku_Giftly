import { describe, expect, it } from "vitest";
import { computeBudgetFit, computeCompatibilityScore } from "@/lib/scoring/compatibility-score";
import { makeCandidate, makeInput } from "./helpers";

describe("computeCompatibilityScore", () => {
  it("un regalo alineado con gustos y presupuesto puntúa alto", () => {
    const { total } = computeCompatibilityScore(makeCandidate(), makeInput());
    expect(total).toBeGreaterThanOrEqual(65);
  });

  it("responder a una pista suma 20 puntos", () => {
    const input = makeInput();
    const base = computeCompatibilityScore(makeCandidate(), input).total;
    const withHint = computeCompatibilityScore(makeCandidate({ matchesHint: true }), input).total;
    expect(withHint - base).toBe(20);
  });

  it("marcar más intereses no castiga a un regalo que coincide", () => {
    const one = computeCompatibilityScore(makeCandidate(), makeInput({ interests: ["cocina"] })).total;
    const many = computeCompatibilityScore(
      makeCandidate(),
      makeInput({ interests: ["cocina", "deportes", "tecnologia", "musica"] })
    ).total;
    expect(many).toBe(one);
  });

  it("un interés relacionado (gastronomía ~ cocina) cuenta parcialmente", () => {
    const direct = computeCompatibilityScore(makeCandidate(), makeInput({ interests: ["cocina"] })).total;
    const related = computeCompatibilityScore(makeCandidate(), makeInput({ interests: ["gastronomia"] })).total;
    const none = computeCompatibilityScore(makeCandidate(), makeInput({ interests: ["moda"] })).total;
    expect(related).toBeLessThan(direct);
    expect(related).toBeGreaterThan(none);
  });

  it("algo de 'cosas a evitar' se descuenta fuerte", () => {
    const input = makeInput({ thingsToAvoid: "ya tiene un kit parrillero" });
    const { avoidancePenalty, total } = computeCompatibilityScore(makeCandidate(), input);
    expect(avoidancePenalty).toBe(35);
    expect(total).toBeLessThan(50);
  });

  it("pasarse del presupuesto baja el puntaje", () => {
    const input = makeInput();
    const inBudget = computeCompatibilityScore(makeCandidate(), input).total;
    const over = computeCompatibilityScore(makeCandidate({ estimatedPrice: 400_000 }), input).total;
    expect(over).toBeLessThan(inBudget);
  });

  it("siempre queda entre 0 y 100", () => {
    const low = computeCompatibilityScore(
      makeCandidate({ tags: [], category: "moda" }),
      makeInput({ interests: ["libros"], thingsToAvoid: "kit" })
    ).total;
    const high = computeCompatibilityScore(
      makeCandidate({ matchesHint: true, tags: ["cocina", "deportes"] }),
      makeInput({ interests: ["cocina", "deportes"] })
    ).total;
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });
});

describe("computeBudgetFit", () => {
  it("clasifica dentro, arriba y abajo del presupuesto", () => {
    expect(computeBudgetFit(150_000, 100_000, 200_000)).toBe("within");
    expect(computeBudgetFit(250_000, 100_000, 200_000)).toBe("over");
    expect(computeBudgetFit(50_000, 100_000, 200_000)).toBe("under");
    expect(computeBudgetFit(900_000, 500_000, null)).toBe("within");
  });
});

describe("cosas a evitar (frases naturales)", () => {
  const penaltyFor = (thingsToAvoid: string, name: string, tags: string[] = []) =>
    computeCompatibilityScore(
      makeCandidate({ name, tags, category: "belleza" }),
      makeInput({ thingsToAvoid })
    ).avoidancePenalty;

  it("detecta plurales y frases: 'Ya tiene muchos perfumes' → Perfume", () => {
    expect(penaltyFor("Ya tiene muchos perfumes", "Perfume importado")).toBe(35);
  });

  it("ignora acentos y plural: 'relojes' → 'Reloj clásico'", () => {
    expect(penaltyFor("no quiere más relojes", "Reloj clásico de pulsera")).toBe(35);
  });

  it("no penaliza por palabras de relleno", () => {
    expect(penaltyFor("ya tiene muchas cosas", "Set de cuchillos", ["cocina"])).toBe(0);
  });
});
