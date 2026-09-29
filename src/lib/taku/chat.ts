import type { TakuChatAdapter } from "@/lib/taku/types";

/**
 * Punto único de conexión del chatbot de Taku.
 *
 * Hoy es `null`: el panel muestra el historial y los consejos, con el input
 * deshabilitado ("muy pronto"). Para activar el chat real:
 *
 *   export const takuChatAdapter: TakuChatAdapter = {
 *     async reply({ messages, context }) {
 *       const res = await fetch("/api/taku", {
 *         method: "POST",
 *         headers: { "Content-Type": "application/json" },
 *         body: JSON.stringify({ messages, context }),
 *       });
 *       return res.json(); // { text, mood? }
 *     },
 *   };
 */
export const takuChatAdapter: TakuChatAdapter | null = null;
