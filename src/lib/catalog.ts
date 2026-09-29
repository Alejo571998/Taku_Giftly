/**
 * Catálogo único de opciones del wizard y sus etiquetas legibles.
 * Las claves se guardan en la base; las etiquetas se muestran en la UI.
 */

export const RELATIONSHIPS = [
  { key: "pareja", label: "Pareja", possessive: "tu pareja" },
  { key: "madre", label: "Madre", possessive: "tu mamá" },
  { key: "padre", label: "Padre", possessive: "tu papá" },
  { key: "hijo", label: "Hijo/a", possessive: "tu hijo/a" },
  { key: "hermano", label: "Hermano/a", possessive: "tu hermano/a" },
  { key: "amigo", label: "Amigo/a", possessive: "tu amigo/a" },
  { key: "companiero", label: "Compañero/a", possessive: "tu compañero/a" },
  { key: "otro", label: "Otra persona", possessive: "esa persona" },
] as const;

export const OCCASIONS = [
  { key: "cumpleanos", label: "Cumpleaños", hasDate: true },
  { key: "san-valentin", label: "San Valentín", hasDate: false },
  { key: "dia-madre", label: "Día de la Madre", hasDate: false },
  { key: "dia-padre", label: "Día del Padre", hasDate: false },
  { key: "navidad", label: "Navidad", hasDate: false },
  { key: "aniversario", label: "Aniversario", hasDate: true },
  { key: "graduacion", label: "Graduación", hasDate: false },
  { key: "otro", label: "Otra ocasión", hasDate: true },
] as const;

export const AGE_RANGES = [
  { key: "menor18", label: "Menos de 18" },
  { key: "18-24", label: "18 a 24" },
  { key: "25-34", label: "25 a 34" },
  { key: "35-44", label: "35 a 44" },
  { key: "45-54", label: "45 a 54" },
  { key: "55-64", label: "55 a 64" },
  { key: "65+", label: "65 o más" },
] as const;

export const INTERESTS = [
  { key: "tecnologia", label: "Tecnología" },
  { key: "gaming", label: "Gaming" },
  { key: "deportes", label: "Deportes" },
  { key: "musica", label: "Música" },
  { key: "cine", label: "Cine y series" },
  { key: "libros", label: "Libros" },
  { key: "cocina", label: "Cocina" },
  { key: "cafe", label: "Café" },
  { key: "moda", label: "Moda" },
  { key: "belleza", label: "Belleza" },
  { key: "viajes", label: "Viajes" },
  { key: "fitness", label: "Fitness" },
  { key: "fotografia", label: "Fotografía" },
  { key: "autos", label: "Autos" },
  { key: "arte", label: "Arte" },
  { key: "videojuegos", label: "Videojuegos" },
  { key: "experiencias", label: "Experiencias" },
  { key: "gastronomia", label: "Gastronomía" },
  { key: "otros", label: "Otros" },
] as const;

export const RELATIONSHIP_KEYS: string[] = RELATIONSHIPS.map((r) => r.key);

function findLabel(
  list: readonly { key: string; label: string }[],
  key: string | null | undefined
): string | null {
  if (!key) return null;
  return list.find((item) => item.key === key)?.label ?? key;
}

export function relationshipLabel(key: string | null | undefined): string | null {
  return findLabel(RELATIONSHIPS, key);
}

/** "tu papá", "tu pareja"... o el nombre si se cargó. */
export function recipientPhrase(
  relationship: string | null | undefined,
  name?: string | null
): string {
  if (name?.trim()) return name.trim();
  return (
    RELATIONSHIPS.find((r) => r.key === relationship)?.possessive ??
    "esa persona"
  );
}

export function occasionLabel(key: string | null | undefined): string | null {
  return findLabel(OCCASIONS, key);
}

export function ageRangeLabel(key: string | null | undefined): string | null {
  return findLabel(AGE_RANGES, key);
}

export function interestLabel(key: string): string {
  return findLabel(INTERESTS, key) ?? key;
}
