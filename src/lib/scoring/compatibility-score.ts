import type { GiftCandidate, GiftSessionInput } from "@/lib/types";

export const GIFT_CATEGORIES = [
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
] as const;

const RELATIONSHIP_ALIASES: Record<string, RelationshipKey> = {
  pareja: "pareja",
  novio: "pareja",
  novia: "pareja",
  esposo: "pareja",
  esposa: "pareja",
  madre: "madre",
  mama: "madre",
  mamá: "madre",
  padre: "padre",
  papa: "padre",
  papá: "padre",
  hijo: "hijo",
  hija: "hijo",
  hermano: "hermano",
  hermana: "hermano",
  amigo: "amigo",
  amiga: "amigo",
  companiero: "companiero",
  compañero: "companiero",
  companiera: "companiero",
  compañera: "companiero",
  otro: "otro",
  otros: "otro",
};

export function normalizeRelationship(input: string): RelationshipKey {
  const key = input.trim().toLowerCase();
  return RELATIONSHIP_ALIASES[key] ?? "otro";
}

type RelationshipKey = "pareja" | "madre" | "padre" | "hijo" | "hermano" | "amigo" | "companiero" | "otro";

const RELATIONSHIP_CATEGORY_FIT: Record<RelationshipKey, Record<string, number>> = {
  pareja: {
    experiencias: 1,
    gastronomia: 1,
    viajes: 1,
    fotografia: 0.9,
    arte: 0.85,
    moda: 0.8,
    belleza: 0.7,
    musica: 0.6,
    libros: 0.55,
    cine: 0.6,
  },
  madre: {
    cocina: 0.9,
    belleza: 0.9,
    libros: 0.75,
    moda: 0.8,
    cafe: 0.75,
    arte: 0.65,
    viajes: 0.6,
    gastronomia: 0.7,
    fitness: 0.6,
  },
  padre: {
    cocina: 0.9,
    deportes: 0.9,
    tecnologia: 0.8,
    gastronomia: 0.85,
    viajes: 0.55,
    experiencias: 0.8,
    autos: 0.8,
    fitness: 0.6,
    libros: 0.6,
  },
  hijo: {
    gaming: 1,
    videojuegos: 1,
    tecnologia: 1,
    deportes: 0.9,
    musica: 0.75,
    otros: 0.8,
    fitness: 0.7,
  },
  hermano: {
    gaming: 0.9,
    tecnologia: 0.9,
    videojuegos: 0.9,
    deportes: 0.8,
    musica: 0.8,
    moda: 0.7,
    cine: 0.7,
    otros: 0.6,
  },
  amigo: {
    experiencias: 0.9,
    gastronomia: 0.85,
    deportes: 0.8,
    musica: 0.75,
    cine: 0.7,
    arte: 0.7,
    libros: 0.6,
    cafe: 0.6,
    otros: 0.6,
  },
  companiero: {
    experiencias: 0.8,
    gastronomia: 0.85,
    cafe: 0.8,
    libros: 0.6,
    belleza: 0.6,
    otros: 0.6,
  },
  otro: {
    otros: 0.6,
  },
};

const YOUNG_CATEGORIES = new Set(["gaming", "videojuegos", "tecnologia"]);
const MATURE_CATEGORIES = new Set([
  "libros",
  "cocina",
  "gastronomia",
  "deportes",
  "cafe",
  "arte",
  "viajes",
  "autos",
]);

function ageFit(category: string, ageRange: string | null): number {
  if (!ageRange) return 1;
  if (ageRange === "menor18" || ageRange === "18-24" || ageRange === "25-34") {
    if (YOUNG_CATEGORIES.has(category)) return 1.2;
  }
  if (ageRange === "55-64" || ageRange === "65+") {
    if (MATURE_CATEGORIES.has(category)) return 1.15;
  }
  return 1;
}

export function relationshipAgeFitScore(
  relationshipInput: string,
  ageRange: string | null,
  category: string
): number {
  const key = normalizeRelationship(relationshipInput);
  const base = RELATIONSHIP_CATEGORY_FIT[key][category] ?? 0.5;
  const adjusted = base * ageFit(category, ageRange);
  return clamp01(adjusted);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Intereses que son "primos": cuentan como coincidencia parcial. */
const RELATED_INTERESTS: Record<string, string[]> = {
  cocina: ["gastronomia", "cafe"],
  gastronomia: ["cocina", "cafe"],
  cafe: ["cocina", "gastronomia"],
  gaming: ["videojuegos", "tecnologia"],
  videojuegos: ["gaming", "tecnologia"],
  tecnologia: ["gaming", "videojuegos", "fotografia"],
  deportes: ["fitness"],
  fitness: ["deportes"],
  cine: ["musica", "arte"],
  musica: ["cine", "arte"],
  arte: ["fotografia", "musica"],
  fotografia: ["arte", "viajes"],
  viajes: ["experiencias", "fotografia"],
  experiencias: ["viajes", "gastronomia"],
};

/** Intereses "primos" de uno dado (ej. cocina → gastronomía, café). */
export function relatedInterests(interest: string): string[] {
  return RELATED_INTERESTS[interest] ?? [];
}

/**
 * Qué tan bien el regalo cubre los gustos. A diferencia de Jaccard, no
 * castiga a quien marcó muchos intereses: con una coincidencia directa el
 * regalo ya es relevante; dos o más lo hacen excelente.
 */
function interestCoverage(interests: string[], tags: string[]): number {
  if (interests.length === 0 || tags.length === 0) return 0;
  const tagSet = new Set(tags);
  const direct = interests.filter((i) => tagSet.has(i)).length;
  if (direct > 0) return Math.min(1, 0.75 + 0.25 * (direct - 1));
  const related = interests.some((i) =>
    (RELATED_INTERESTS[i] ?? []).some((r) => tagSet.has(r))
  );
  return related ? 0.45 : 0;
}

function budgetFitScore(price: number, min: number | null, max: number | null): number {
  if (max != null && price > max) {
    return Math.max(0.3, Math.min(1, max / price));
  }
  if (min != null && min > 0 && price < min) {
    return Math.max(0.35, Math.min(1, price / min));
  }
  return 1;
}

export function computeBudgetFit(
  price: number,
  min: number | null,
  max: number | null
): "within" | "over" | "under" {
  if (max != null && price > max) return "over";
  if (min != null && min > 0 && price < min) return "under";
  return "within";
}

const AVOID_PENALTY = 35;

export function computeAvoidancePenalty(
  name: string,
  category: string,
  tags: string[],
  thingsToAvoid: string | null
): number {
  if (!thingsToAvoid) return 0;
  // Frases naturales ("Ya tiene muchos perfumes"): se comparan palabras
  // con significado, sin acentos y sin plural, contra el regalo.
  const avoid = new Set(meaningfulStems(thingsToAvoid));
  if (avoid.size === 0) return 0;
  const gift = meaningfulStems([name, category, ...tags].join(" "));
  return gift.some((word) => avoid.has(word)) ? AVOID_PENALTY : 0;
}

/** Palabras de relleno frecuentes en "cosas a evitar". */
const AVOID_STOPWORDS = new Set([
  "tiene", "tienen", "tenia", "muchos", "muchas", "mucho", "mucha", "varios",
  "varias", "otro", "otra", "otros", "otras", "nada", "algo", "cosas", "cosa",
  "quiere", "queria", "regalo", "regalos", "regalar", "nunca", "gusta",
  "gustan", "odia", "odian", "porque", "pero", "para", "como", "esta", "este",
  "estos", "estas", "tampoco", "demasiados", "demasiadas", "siempre", "usar",
  "cualquier", "ningun", "ninguno", "ninguna", "sobre", "todo", "todos",
]);

/** Singular aproximado: perfumes/perfume → perfum, relojes/reloj → reloj. */
function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("s")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

function meaningfulStems(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !AVOID_STOPWORDS.has(w))
    .map(stem);
}

export interface CompatibilityBreakdown {
  interestOverlap: number;
  budgetFitScore: number;
  matchesHintBonus: number;
  relationshipAgeFit: number;
  avoidancePenalty: number;
  total: number;
}

/**
 * Función pura y determinística. La IA aporta el candidato y el texto;
 * este cálculo produce el número que se guarda en compatibility_score.
 *
 * score =
 *   40 × overlap(intereses, tags)
 * + 25 × budget_fit
 * + 20 × matches_hint
 * + 15 × relationship_age_fit
 * − 35 si aparece en things_to_avoid
 * clamp 0–100
 */
export function computeCompatibilityScore(
  candidate: GiftCandidate,
  input: Pick<
    GiftSessionInput,
    "interests" | "budgetMin" | "budgetMax" | "recipientRelationship" | "ageRange" | "thingsToAvoid"
  >
): CompatibilityBreakdown {
  const interestOverlap = interestCoverage(
    input.interests.map((i) => i.toLowerCase()),
    candidate.tags.map((t) => t.toLowerCase())
  );

  const budgetScore = budgetFitScore(
    candidate.estimatedPrice,
    input.budgetMin,
    input.budgetMax
  );

  const relAgeFit = relationshipAgeFitScore(
    input.recipientRelationship,
    input.ageRange,
    candidate.category
  );

  const avoidancePenalty = computeAvoidancePenalty(
    candidate.name,
    candidate.category,
    candidate.tags,
    input.thingsToAvoid
  );

  const total = clampScore(
    40 * interestOverlap +
      25 * budgetScore +
      20 * (candidate.matchesHint ? 1 : 0) +
      15 * relAgeFit -
      avoidancePenalty
  );

  return {
    interestOverlap: interestOverlap,
    budgetFitScore: budgetScore,
    matchesHintBonus: candidate.matchesHint ? 1 : 0,
    relationshipAgeFit: relAgeFit,
    avoidancePenalty,
    total,
  };
}

export function describeScoreBreakdown(b: CompatibilityBreakdown): string[] {
  const lines: string[] = [];
  lines.push(
    `Gustos en común: ${Math.round(b.interestOverlap * 100)}% de coincidencia con sus intereses.`
  );
  lines.push(
    b.budgetFitScore >= 1
      ? "Dentro del presupuesto que definiste."
      : b.budgetFitScore > 0.7
        ? "Ajustada al presupuesto, con un margen mínimo."
        : "Fuera del presupuesto: te lo mostramos por su gran ajuste a los gustos."
  );
  if (b.matchesHintBonus) lines.push("Coincide con una pista concreta que te dio.");
  lines.push(
    `Típico para la relación y la edad: ${Math.round(b.relationshipAgeFit * 100)}%.`
  );
  if (b.avoidancePenalty > 0) lines.push("Se descontó por aparecer en 'cosas a evitar'.");
  return lines;
}