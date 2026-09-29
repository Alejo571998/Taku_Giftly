"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  Lock,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountCard } from "@/components/mis-regalos/account-card";
import { TakuSpot } from "@/components/taku/taku-spot";
import { useTaku } from "@/components/taku/taku-provider";
import { completePendingMerge, getAccountState, type AccountState } from "@/lib/account";
import { apiRequest } from "@/lib/client-auth";
import { occasionLabel, recipientPhrase } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import type { UserSessionSummary } from "@/lib/types";

export function MyGiftsPage() {
  const [sessions, setSessions] = useState<UserSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountState>({ kind: "unavailable" });
  const [reloadKey, setReloadKey] = useState(0);
  const { say } = useTaku();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Volviendo de un link mágico: traer lo hecho en este navegador.
        const merged = await completePendingMerge();
        const [state, result] = await Promise.all([
          getAccountState(),
          apiRequest<{ sessions: UserSessionSummary[] }>("/api/user/sessions"),
        ]);
        if (cancelled) return;
        setAccount(state);
        setSessions(result.sessions);
        if (merged) {
          say({ text: "¡Listo! Sumé a tu cuenta lo que tenías en este navegador.", mood: "celebrate" });
        } else if (state.kind === "account" && window.location.search.includes("cuenta=")) {
          say({ text: "¡Tus regalos quedaron guardados!", mood: "celebrate" });
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, say]);

  const accountCard = (initialMode: "save" | "signin") => (
    <AccountCard
      state={account}
      initialMode={initialMode}
      onSignedOut={() => setReloadKey((k) => k + 1)}
    />
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20">
        <div className="h-8 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-muted" />
          <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <TakuSpot mood="sad" title={error} className="px-4 py-20">
        <Button
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </TakuSpot>
    );
  }

  if ((!sessions || sessions.length === 0) && account.kind !== "unavailable") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="font-heading text-4xl tracking-tight">Mis regalos</h1>
        <p className="mt-2 text-muted-foreground">
          Todavía no hay búsquedas en este navegador. Empezá una nueva o, si ya
          guardaste regalos en otro dispositivo, entrá con tu email.
        </p>
        <Button className="mt-5 h-11 rounded-full px-6 font-semibold" render={<Link href="/regalo" />}>
          Encontrar un regalo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        {accountCard("signin")}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <TakuSpot mood="wave" title="Todavía no buscamos ningún regalo juntos" className="px-4 py-20">
        <p className="mt-2 max-w-md text-muted-foreground">
          Cuando generes ideas o te sumes a un grupo, aparecen acá con su estado.
        </p>
        <Button className="mt-6 h-11 rounded-full px-6 font-semibold" render={<Link href="/regalo" />}>
          Encontrar un regalo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </TakuSpot>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl tracking-tight">
        Mis regalos
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tus búsquedas con su estado actual.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {sessions.map(({ session, optionCount, group, participantCount }) => {
          const status =
            group?.status === "finished"
              ? { label: "Decidido", tone: "accent" as const }
              : group?.status === "active"
                ? { label: "En votación", tone: "primary" as const }
                : { label: "Sin grupo", tone: "muted" as const };

          return (
            <li
              key={session.id}
              className="rounded-3xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-xl leading-snug">
                    Para {recipientPhrase(session.recipientRelationship, session.recipientName)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Gift className="size-3.5" aria-hidden="true" />
                      {occasionLabel(session.occasion) ?? "Sin ocasión"}
                    </span>
                    {session.occasionDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {formatDate(session.occasionDate)}
                      </span>
                    )}
                    <span>{optionCount} ideas</span>
                  </p>
                </div>
                <Badge
                  variant={
                    status.tone === "accent" ? "default" : status.tone === "primary" ? "secondary" : "outline"
                  }
                  className={
                    status.tone === "accent"
                      ? "bg-accent/15 text-accent-ink"
                      : status.tone === "primary"
                        ? "bg-primary/12 text-primary-ink"
                        : undefined
                  }
                >
                  {status.label}
                </Badge>
              </div>

              {group && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" aria-hidden="true" />
                  {participantCount}{" "}
                  {participantCount === 1 ? "participante" : "participantes"}
                  {group.status === "active" && (
                    <>
                      <Ticket className="ml-2 size-4" aria-hidden="true" />
                      <span className="font-mono uppercase">{group.inviteCode}</span>
                    </>
                  )}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full" render={<Link href={`/resultados?session=${session.id}`} />}>
                    Ver ideas
                  </Button>
                {group && (
                  <Button size="sm" variant="outline" className="rounded-full" render={<Link href={`/grupo/${group.inviteCode}`} />}>
                      {group.status === "finished" ? (
                        <>
                          <Lock className="size-3.5" aria-hidden="true" />
                          Ver ganador
                        </>
                      ) : (
                        "Ver grupo"
                      )}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {accountCard("save")}
    </div>
  );
}