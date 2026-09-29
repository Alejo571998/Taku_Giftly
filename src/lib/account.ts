"use client";

import { apiRequest, ensureIdentity } from "@/lib/client-auth";
import { getBrowserClient } from "@/lib/supabase";

/**
 * Cuenta opcional con email para no perder "Mis regalos" al cambiar de
 * navegador o dispositivo. Sin contraseñas: todo por link mágico.
 *
 * - Guardar: la identidad anónima se convierte en cuenta (mismo usuario,
 *   no hay que mover datos). Supabase manda un link de confirmación.
 * - Entrar desde otro dispositivo: link mágico al email. Lo que se hizo
 *   de forma anónima en ese navegador se pasa a la cuenta al volver.
 */

export type AccountState =
  | { kind: "unavailable" } // modo local: no hay cuentas
  | { kind: "anonymous"; pendingEmail: string | null }
  | { kind: "account"; email: string };

const MERGE_TOKEN_KEY = "giftly:merge-token";

function redirectTo(flag: string): string {
  return `${window.location.origin}/mis-regalos?cuenta=${flag}`;
}

export async function getAccountState(): Promise<AccountState> {
  const client = getBrowserClient();
  if (!client) return { kind: "unavailable" };
  await ensureIdentity();
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user) return { kind: "anonymous", pendingEmail: null };
  if (!user.is_anonymous && user.email) return { kind: "account", email: user.email };
  return { kind: "anonymous", pendingEmail: user.new_email ?? null };
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("exists")) {
    return "Ese email ya tiene regalos guardados. Usá “Entrar con mi email”.";
  }
  if (m.includes("signups not allowed") || m.includes("not found")) {
    return "No encontramos regalos guardados con ese email. Guardalos primero.";
  }
  if (m.includes("rate") || m.includes("security purposes")) {
    return "Pediste varios links seguidos. Esperá un minuto y probá de nuevo.";
  }
  if (m.includes("invalid")) return "Revisá que el email esté bien escrito.";
  return "No pudimos mandarte el link. Intentá de nuevo en un rato.";
}

/** Convierte la identidad anónima actual en una cuenta con este email. */
export async function saveWithEmail(email: string): Promise<void> {
  const client = getBrowserClient();
  if (!client) throw new Error("Las cuentas no están disponibles en modo local.");
  await ensureIdentity();
  const { error } = await client.auth.updateUser(
    { email },
    { emailRedirectTo: redirectTo("confirmada") }
  );
  if (error) throw new Error(friendlyError(error.message));
}

/** Link mágico para entrar a una cuenta existente desde este navegador. */
export async function signInWithEmail(email: string): Promise<void> {
  const client = getBrowserClient();
  if (!client) throw new Error("Las cuentas no están disponibles en modo local.");
  const { data } = await client.auth.getSession();
  // Guardamos la sesión anónima para traer sus búsquedas a la cuenta.
  if (data.session?.user.is_anonymous) {
    try {
      window.localStorage.setItem(MERGE_TOKEN_KEY, data.session.access_token);
    } catch {
      // sin storage: se entra igual, solo no se traen datos
    }
  }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo("ingreso") },
  });
  if (error) throw new Error(friendlyError(error.message));
}

/**
 * Si se entró a una cuenta desde un navegador que tenía actividad anónima,
 * la pasa a la cuenta. Devuelve true si trajo datos.
 */
export async function completePendingMerge(): Promise<boolean> {
  let previousToken: string | null = null;
  try {
    previousToken = window.localStorage.getItem(MERGE_TOKEN_KEY);
  } catch {
    return false;
  }
  if (!previousToken) return false;

  const state = await getAccountState();
  if (state.kind !== "account") return false;
  try {
    const result = await apiRequest<{ merged: boolean }>("/api/user/merge", {
      method: "POST",
      body: { previousToken },
    });
    return result.merged;
  } catch {
    return false;
  } finally {
    try {
      window.localStorage.removeItem(MERGE_TOKEN_KEY);
    } catch {
      // nada
    }
  }
}

export async function signOut(): Promise<void> {
  const client = getBrowserClient();
  if (!client) return;
  await client.auth.signOut();
}
