"use client";

const KEY = "giftly:display-name";

/** Recordamos el nombre para no volver a pedirlo en cada grupo. */
export function savedDisplayName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberDisplayName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    // almacenamiento bloqueado: no pasa nada
  }
}
