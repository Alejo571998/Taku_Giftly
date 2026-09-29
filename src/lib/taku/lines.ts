import type { TakuLine } from "@/lib/taku/types";

/**
 * Todo lo que Taku dice, en un solo lugar (UX writing consistente).
 * Voz: cercana, rioplatense, breve. Ayuda a decidir; nunca rellena.
 */

export const TAKU_WIZARD_TIPS: TakuLine[] = [
  {
    text: "Empecemos por lo básico: ¿para quién es? Si querés, poné su nombre y lo personalizo.",
    mood: "wave",
  },
  {
    text: "La ocasión cambia todo: no es lo mismo un aniversario que un amigo invisible.",
    mood: "curious",
  },
  {
    text: "Con un rango aproximado me alcanza. Nada de adivinar la edad exacta.",
    mood: "idle",
  },
  {
    text: "Tranqui, respeto tu presupuesto. Si algo se pasa, te lo marco.",
    mood: "idle",
  },
  {
    text: "Marcá todo lo que le guste. Cuantos más gustos, mejor afino.",
    mood: "happy",
  },
  {
    text: "Este es mi paso favorito: una frase que haya dicho vale más que diez intereses.",
    mood: "curious",
    duration: 9000,
  },
];

export const TAKU_LOADING_LINES = [
  "Analizando sus gustos...",
  "Pensando ideas que tengan sentido...",
  "Descartando lo que ya tiene...",
  "Comparando opciones y precios...",
  "Eligiendo mi favorita...",
];

export const TAKU_PANEL_TIPS: Record<string, string[]> = {
  "/": [
    "Contame quién es y te propongo ideas con un porqué concreto.",
    "¿Te pasaron un código? Entrá al grupo y votá.",
  ],
  "/regalo": [
    "Las pistas pesan más que todo: “dijo que quería…” es oro.",
    "Si ya tiene algo, anotalo en “cosas a evitar” y no te lo propongo.",
  ],
  "/resultados": [
    "La primera idea es la que mejor encaja. El % explica por qué.",
    "¿No te decidís? Armá un grupo y que voten.",
  ],
  "/regalo/": [
    "Abajo tenés dónde buscarlo y cómo se calculó la compatibilidad.",
    "Los precios estimados están marcados como tales: nunca los invento como reales.",
  ],
  "/grupo/": [
    "Cada uno puntúa de 1 a 5 estrellas y el ranking se mueve en vivo.",
    "Quien creó el grupo cierra la votación cuando todos votaron.",
  ],
  "/mis-regalos": [
    "Acá quedan tus búsquedas y grupos, en este navegador.",
  ],
};

export function panelTipsFor(pathname: string): string[] {
  if (TAKU_PANEL_TIPS[pathname]) return TAKU_PANEL_TIPS[pathname];
  const prefix = Object.keys(TAKU_PANEL_TIPS)
    .filter((key) => key.endsWith("/") && key !== "/" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? TAKU_PANEL_TIPS[prefix] : TAKU_PANEL_TIPS["/"];
}

export function voteReaction(score: number): TakuLine {
  if (score === 5) return { text: "¡Ese te encantó! Anotado.", mood: "celebrate", duration: 3500 };
  if (score === 4) return { text: "Buena elección. Voto guardado.", mood: "happy", duration: 3500 };
  if (score === 3) return { text: "Mmm, puede ser. Anotado.", mood: "curious", duration: 3500 };
  return { text: "Entendido, ese no te convence.", mood: "idle", duration: 3500 };
}
