"use client";

import { getBrowserClient } from "@/lib/supabase";

export interface Identity {
  userId: string;
  token: string | null;
}

/** Error de API con el status y el cuerpo, para casos como el 409 de empate. */
export class ApiError<T = unknown> extends Error {
  constructor(
    message: string,
    public status: number,
    public data: T | null
  ) {
    super(message);
  }
}

let pendingAnonSignIn: Promise<Identity> | null = null;

/**
 * Garantiza una identidad anónima transparente:
 * - Con Supabase: signInAnonymously() la primera vez (sin pantalla de login).
 *   El token NO se cachea: getSession() lo refresca solo cuando vence.
 * - Modo local: uid persistido en localStorage.
 */
export async function ensureIdentity(): Promise<Identity> {
  const client = getBrowserClient();
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session) {
      return { userId: data.session.user.id, token: data.session.access_token };
    }
    // Evita crear dos usuarios anónimos si varias requests arrancan juntas.
    pendingAnonSignIn ??= client.auth
      .signInAnonymously()
      .then(({ data: anon, error }) => {
        if (error || !anon.session) {
          throw new Error(
            "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo."
          );
        }
        return { userId: anon.session.user.id, token: anon.session.access_token };
      })
      .finally(() => {
        pendingAnonSignIn = null;
      });
    return pendingAnonSignIn;
  }

  let userId = window.localStorage.getItem("giftly:uid");
  if (!userId) {
    userId = crypto.randomUUID();
    window.localStorage.setItem("giftly:uid", userId);
  }
  return { userId, token: null };
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const identity = await ensureIdentity();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-id": identity.userId,
  };
  if (identity.token) {
    headers.Authorization = `Bearer ${identity.token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sin conexión. Revisá tu internet e intentá de nuevo.", 0, null);
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok || !data) {
    throw new ApiError(
      data?.error ?? "Algo salió mal. Intentá nuevamente.",
      response.status,
      data
    );
  }
  return data as T;
}
