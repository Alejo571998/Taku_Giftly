/**
 * Taku — la mascota/asistente de Giftly.
 *
 * El personaje se muestra siempre con la imagen original; los "estados"
 * solo cambian su movimiento y lo que dice, nunca su apariencia.
 */

export type TakuMood =
  | "idle" // flota tranquilo
  | "wave" // saluda
  | "curious" // inclina la cabeza (preguntas, pistas)
  | "thinking" // la IA está trabajando
  | "happy" // saltito (acción positiva del usuario)
  | "celebrate" // ganador, grupo creado
  | "sad"; // error, no encontrado

export interface TakuAction {
  label: string;
  href?: string;
  /** Identificador para acciones manejadas por la página (ej: "open-group"). */
  id?: string;
}

export interface TakuLine {
  text: string;
  mood?: TakuMood;
  /** ms visibles antes de auto-ocultarse. Default: según largo del texto. */
  duration?: number;
  action?: TakuAction;
}

/** Mensaje de la conversación con Taku (historial del panel). */
export interface TakuChatMessage {
  id: string;
  role: "taku" | "user";
  text: string;
  createdAt: number;
}

/**
 * Contexto de pantalla que Taku conoce. Hoy alimenta los consejos del panel;
 * mañana se envía al chatbot para que responda sabiendo dónde está el usuario.
 */
export interface TakuPageContext {
  pathname: string;
  /** Datos opcionales que la pantalla quiera compartir (sessionId, grupo...). */
  data?: Record<string, string | number | boolean | null>;
}

/**
 * Contrato para conectar un chatbot real. Implementarlo (por ejemplo contra
 * un route handler /api/taku que llame al modelo) y registrarlo en
 * `src/lib/taku/chat.ts`: el panel de Taku habilita el input automáticamente.
 */
export interface TakuChatAdapter {
  reply(input: {
    messages: TakuChatMessage[];
    context: TakuPageContext;
  }): Promise<{ text: string; mood?: TakuMood }>;
}
