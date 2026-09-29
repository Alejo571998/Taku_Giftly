"use client";

import { useState } from "react";
import { CloudCheck, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TakuPeek } from "@/components/taku/taku-peek";
import { useTaku } from "@/components/taku/taku-provider";
import {
  saveWithEmail,
  signInWithEmail,
  signOut,
  type AccountState,
} from "@/lib/account";

/**
 * Guardar "Mis regalos" con un email (sin contraseña) o entrar a una cuenta
 * existente desde otro dispositivo. No se muestra en modo local.
 */
export function AccountCard({
  state,
  initialMode = "save",
  onSignedOut,
}: {
  state: AccountState;
  initialMode?: "save" | "signin";
  onSignedOut: () => void;
}) {
  const { say } = useTaku();
  const [mode, setMode] = useState<"save" | "signin">(initialMode);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.kind === "unavailable") return null;

  if (state.kind === "account") {
    return (
      <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent/5 p-5 sm:flex-row sm:items-center">
        <CloudCheck className="size-6 shrink-0 text-accent-ink" aria-hidden="true" />
        <p className="flex-1 text-sm">
          Tus regalos están guardados en{" "}
          <strong className="font-semibold">{state.email}</strong>. Entrá con ese
          email desde cualquier dispositivo.
        </p>
        <Button
          variant="ghost"
          className="rounded-full text-muted-foreground"
          onClick={async () => {
            await signOut();
            onSignedOut();
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </Button>
      </section>
    );
  }

  const pending = sentTo ?? state.pendingEmail;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Revisá que el email esté bien escrito.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "save") await saveWithEmail(value);
      else await signInWithEmail(value);
      setSentTo(value);
      say({
        text: "¡Listo! Te mandé un link. Abrilo desde este mismo dispositivo.",
        mood: "happy",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TakuPeek
      mood="curious"
      size={120}
      className="mt-8"
      message={
        mode === "save"
          ? "Si borrás el navegador, estos regalos se pierden. ¿Los guardamos?"
          : "¿Ya los guardaste antes? Te mando un link."
      }
    >
      <section className="rounded-3xl border border-border bg-card p-5 shadow-md" aria-labelledby="cuenta">
        <h2 id="cuenta" className="font-heading text-2xl">
          {mode === "save" ? "Guardá tus regalos" : "Entrá con tu email"}
        </h2>
        {pending ? (
          <p className="mt-2 flex items-start gap-2 text-sm" role="status">
            <Mail className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <span>
              Te mandamos un link a <strong className="font-semibold">{pending}</strong>.
              Abrilo desde este dispositivo para terminar. Si no llega, revisá spam.
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "save"
              ? "Sin contraseña: te mandamos un link para confirmar y listo."
              : "Te mandamos un link mágico. Lo que hiciste en este navegador se suma a tu cuenta."}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row" noValidate>
          <label htmlFor="account-email" className="sr-only">
            Tu email
          </label>
          <Input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="tu@email.com"
            className="h-11 flex-1 rounded-xl"
            aria-invalid={error != null}
            aria-describedby={error ? "account-error" : undefined}
          />
          <Button type="submit" disabled={busy} className="h-11 rounded-full px-6 font-semibold">
            {busy ? "Enviando..." : pending ? "Reenviar link" : mode === "save" ? "Guardar" : "Mandar link"}
          </Button>
        </form>
        {error && (
          <p id="account-error" role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "save" ? "signin" : "save");
            setError(null);
            setSentTo(null);
          }}
          className="mt-3 text-sm font-medium text-primary-ink underline-offset-2 hover:underline"
        >
          {mode === "save" ? "¿Ya guardaste regalos antes? Entrá con tu email" : "Quiero guardar los de este navegador"}
        </button>
      </section>
    </TakuPeek>
  );
}
