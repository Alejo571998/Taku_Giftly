const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatARS(value: number): string {
  return arsFormatter.format(value);
}

export function formatBudgetRange(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${formatARS(min)} – ${formatARS(max)}`;
  if (min != null) return `desde ${formatARS(min)}`;
  if (max != null) return `hasta ${formatARS(max)}`;
  return "sin límite";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function pluralize(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural;
}

export function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
