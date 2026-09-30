import {
  AGE_RANGES,
  INTERESTS,
  OCCASIONS,
  RELATIONSHIPS,
} from "@/lib/catalog";
import type { GiftSessionInput } from "@/lib/types";

/**
 * Validación estricta de lo que llega del wizard. Todo esto termina en el
 * prompt de la IA: solo se aceptan claves del catálogo y textos acotados
 * (menos costo por request y menos margen para manipular el prompt).
 */

export const LIMITS = {
  name: 40,
  freeText: 400,
  maxInterests: 8,
  maxBudget: 50_000_000,
} as const;

const RELATIONSHIP_KEYS = new Set<string>(RELATIONSHIPS.map((r) => r.key));
const OCCASION_KEYS = new Set<string>(OCCASIONS.map((o) => o.key));
const AGE_KEYS = new Set<string>(AGE_RANGES.map((a) => a.key));
const INTEREST_KEYS = new Set<string>(INTERESTS.map((i) => i.key));

export type ValidationResult =
  | { ok: true; input: GiftSessionInput }
  | { ok: false; error: string };

/** Normaliza espacios, quita caracteres de control y recorta. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isMoney(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= LIMITS.maxBudget
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateGiftInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Faltan datos para generar recomendaciones." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.recipientRelationship !== "string" || !RELATIONSHIP_KEYS.has(b.recipientRelationship)) {
    return { ok: false, error: "Elegí para quién es el regalo." };
  }
  if (typeof b.occasion !== "string" || !OCCASION_KEYS.has(b.occasion)) {
    return { ok: false, error: "Elegí la ocasión." };
  }
  if (typeof b.ageRange !== "string" || !AGE_KEYS.has(b.ageRange)) {
    return { ok: false, error: "Elegí un rango de edad." };
  }

  const interests = Array.isArray(b.interests)
    ? [...new Set(b.interests.filter((i): i is string => typeof i === "string" && INTEREST_KEYS.has(i)))]
    : [];
  if (interests.length === 0) {
    return { ok: false, error: "Elegí al menos un interés." };
  }
  if (interests.length > LIMITS.maxInterests) {
    return { ok: false, error: `Elegí hasta ${LIMITS.maxInterests} intereses.` };
  }

  if (!isMoney(b.budgetMin)) {
    return { ok: false, error: "El presupuesto mínimo no es válido." };
  }
  if (b.budgetMax !== null && !isMoney(b.budgetMax)) {
    return { ok: false, error: "El presupuesto máximo no es válido." };
  }
  const budgetMax = b.budgetMax as number | null;
  if (budgetMax !== null && budgetMax > 0 && b.budgetMin > budgetMax) {
    return { ok: false, error: "El mínimo no puede ser mayor al máximo." };
  }

  return {
    ok: true,
    input: {
      recipientName: cleanText(b.recipientName, LIMITS.name),
      recipientRelationship: b.recipientRelationship,
      occasion: b.occasion,
      occasionDate: isIsoDate(b.occasionDate) ? b.occasionDate : null,
      ageRange: b.ageRange,
      budgetMin: b.budgetMin,
      budgetMax: budgetMax === 0 ? null : budgetMax,
      interests,
      recentHints: cleanText(b.recentHints, LIMITS.freeText),
      thingsToAvoid: cleanText(b.thingsToAvoid, LIMITS.freeText),
      additionalNotes: cleanText(b.additionalNotes, LIMITS.freeText),
    },
  };
}
