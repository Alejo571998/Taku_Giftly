"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ClipboardCopy,
  Crown,
  Lock,
  LogIn,
  MessageCircle,
  RefreshCw,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GiftImage } from "@/components/gift-image";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { PriceTag } from "@/components/price-tag";
import { TakuImage } from "@/components/taku/taku-image";
import { TakuPeek } from "@/components/taku/taku-peek";
import { TakuSpot } from "@/components/taku/taku-spot";
import { useHideTakuDock, useTaku } from "@/components/taku/taku-provider";
import { ApiError, apiRequest, ensureIdentity } from "@/lib/client-auth";
import { occasionLabel, recipientPhrase } from "@/lib/catalog";
import { rememberDisplayName, savedDisplayName } from "@/lib/display-name";
import { formatDate, initialOf } from "@/lib/format";
import {
  computeGroupRanking,
  countParticipantsDone,
} from "@/lib/group-ranking";
import { voteReaction } from "@/lib/taku/lines";
import { getBrowserClient } from "@/lib/supabase";
import type { GiftOption, GroupBundle } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCORE_LABELS = ["", "No me convence", "Puede ser", "Está bien", "Me gusta", "¡Es este!"];

function useGroupBundle(code: string) {
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBundle = useCallback(async () => {
    const data = await apiRequest<GroupBundle>(`/api/groups/${code}`);
    setBundle(data);
    return data;
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        await fetchBundle();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchBundle, refreshKey]);

  const groupId = bundle?.group?.id;
  const isFinished = bundle?.group.status === "finished";

  // En vivo: Realtime con Supabase; polling liviano en modo local.
  useEffect(() => {
    if (!groupId || isFinished) return;
    const client = getBrowserClient();
    if (!client) {
      const poll = setInterval(() => {
        fetchBundle().catch(() => undefined);
      }, 4000);
      return () => clearInterval(poll);
    }

    const channel = client
      .channel(`group-live-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `group_id=eq.${groupId}` },
        () => fetchBundle().catch(() => undefined)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_participants", filter: `group_id=eq.${groupId}` },
        () => fetchBundle().catch(() => undefined)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        () => fetchBundle().catch(() => undefined)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [fetchBundle, groupId, isFinished]);

  return { bundle, error, loading, reload: () => setRefreshKey((k) => k + 1) };
}

export function GroupPage() {
  const params = useParams<{ inviteCode: string }>();
  const searchParams = useSearchParams();
  const code = params.inviteCode;
  const justCreated = searchParams.get("nuevo") === "1";
  const { bundle, error, loading, reload } = useGroupBundle(code);
  const taku = useTaku();
  const { say, sayOnce } = taku;

  const [identity, setIdentity] = useState<{ userId: string } | null>(null);
  // El formulario se muestra recién con datos cargados (post-hidratación).
  const [displayName, setDisplayName] = useState(savedDisplayName);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [tieOptions, setTieOptions] = useState<string[] | null>(null);
  const [votingOption, setVotingOption] = useState<string | null>(null);

  useEffect(() => {
    ensureIdentity()
      .then((id) => setIdentity(id))
      .catch(() => undefined);
  }, []);

  const myParticipant = useMemo(() => {
    if (!identity || !bundle) return null;
    return bundle.participants.find((p) => p.userId === identity.userId) ?? null;
  }, [identity, bundle]);

  const isCreator = Boolean(identity && bundle?.group.creatorId === identity.userId);
  const isFinished = bundle?.group.status === "finished";

  const ranking = useMemo(
    () => (bundle ? computeGroupRanking(bundle.options, bundle.votes) : []),
    [bundle]
  );
  const maxAverage = ranking[0]?.average ?? 0;

  const myScores = useMemo(() => {
    const map = new Map<string, number>();
    if (!bundle || !myParticipant) return map;
    for (const v of bundle.votes) {
      if (v.participantId === myParticipant.id) map.set(v.giftOptionId, v.score);
    }
    return map;
  }, [bundle, myParticipant]);

  const doneCount = bundle
    ? countParticipantsDone(bundle.participants, bundle.votes, bundle.options.length)
    : 0;
  const everyoneDone =
    bundle != null && bundle.participants.length > 1 && doneCount === bundle.participants.length;

  const winnerOption: GiftOption | null =
    isFinished && bundle?.group.winnerOptionId
      ? bundle.options.find((o) => o.id === bundle.group.winnerOptionId) ?? null
      : null;

  // Con ganador (incluido un desempate del creador), el ganador va primero.
  const displayRanking = winnerOption
    ? [
        ...ranking.filter((r) => r.optionId === winnerOption.id),
        ...ranking.filter((r) => r.optionId !== winnerOption.id),
      ]
    : ranking;

  // En la celebración Taku aparece en grande: el dock se esconde.
  useHideTakuDock(Boolean(winnerOption));

  // Momentos de Taku
  useEffect(() => {
    if (!bundle || !identity) return;
    if (isFinished) return;
    // (A quien llega invitado lo saluda el Taku asomado sobre el formulario.)
    if (justCreated && isCreator) {
      sayOnce(`group-created-${code}`, {
        text: "¡Grupo listo! Ya copié el link: mandáselo a tu gente por WhatsApp.",
        mood: "celebrate",
        duration: 8000,
      });
    }
  }, [bundle, identity, isFinished, justCreated, isCreator, code, sayOnce]);

  useEffect(() => {
    if (everyoneDone && isCreator && !isFinished) {
      sayOnce(`group-all-voted-${code}`, {
        text: "¡Ya votaron todos! Cuando quieras, cerrá la votación y vemos el ganador.",
        mood: "happy",
        duration: 8000,
      });
    }
  }, [everyoneDone, isCreator, isFinished, code, sayOnce]);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    if (name.length < 2) {
      setJoinError("Contanos tu nombre (mínimo 2 caracteres).");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      await apiRequest(`/api/groups/${code}/join`, {
        method: "POST",
        body: { displayName: name },
      });
      rememberDisplayName(name);
      say({ text: `¡Bienvenido/a, ${name}! Puntuá cada idea con estrellas.`, mood: "happy" });
      reload();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente.");
    } finally {
      setJoining(false);
    }
  }

  async function handleVote(optionId: string, score: number) {
    if (!myParticipant || isFinished) return;
    setVotingOption(optionId);
    try {
      await apiRequest(`/api/groups/${code}/vote`, {
        method: "POST",
        body: { giftOptionId: optionId, score },
      });
      say(voteReaction(score));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente.");
    } finally {
      setVotingOption(null);
    }
  }

  async function handleFinalize(winnerOptionId?: string) {
    setFinalizing(true);
    try {
      await apiRequest(`/api/groups/${code}/finalize`, {
        method: "POST",
        body: winnerOptionId ? { winnerOptionId } : {},
      });
      setConfirmFinalize(false);
      setTieOptions(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const data = e.data as { tie?: string[] } | null;
        setConfirmFinalize(false);
        setTieOptions(data?.tie ?? []);
        say({ text: "¡Empate! Te toca desempatar a vos.", mood: "curious" });
      } else {
        toast.error(e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente.");
      }
    } finally {
      setFinalizing(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("¡Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Compartí el código: " + code.toUpperCase());
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: bundle?.group.name ?? "Giftly",
        text: "Ayudame a elegir el regalo: votá en Giftly 🎁",
        url: shareUrl,
      });
    } catch {
      // cancelado
    }
  }

  if (loading && !bundle) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10" aria-busy="true">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-6 h-8 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 space-y-4">
          <div className="h-32 animate-pulse rounded-3xl bg-muted" />
          <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <TakuSpot mood="sad" title={error ?? "No encontré ese grupo"} className="px-4 py-20">
        <p className="mt-2 text-muted-foreground">
          Revisá el código con la persona que te lo compartió.
        </p>
        <Button className="mt-6 rounded-full" render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </TakuSpot>
    );
  }

  const { group, session, options, participants } = bundle;
  // Solo se llega acá con datos cargados en el cliente: window existe.
  const shareUrl = `${window.location.origin}/grupo/${code}`;
  const canNativeShare = typeof navigator.share === "function";
  const who = session ? recipientPhrase(session.recipientRelationship, session.recipientName) : null;
  const subtitle = session
    ? [
        `Regalo para ${who}`,
        occasionLabel(session.occasion),
        session.occasionDate ? formatDate(session.occasionDate) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Grupo de regalos";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Ayudame a elegir el regalo 🎁 Votá acá: ${shareUrl}`
  )}`;
  const showShareCard = !isFinished && (isCreator || Boolean(myParticipant));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* Encabezado del grupo */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{group.name}</h1>
          {isFinished ? (
            <Badge className="bg-accent text-accent-foreground">
              <Lock className="size-3" aria-hidden="true" /> Decidido
            </Badge>
          ) : (
            <Badge className="bg-primary/12 text-primary-ink">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              Votación en vivo
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            {participants.length} {participants.length === 1 ? "persona" : "personas"}
          </span>
          {!isFinished && participants.length > 0 && (
            <span className="text-muted-foreground">
              {doneCount} de {participants.length} ya votaron todo
            </span>
          )}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Participantes">
          {participants.map((p) => (
            <li
              key={p.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm",
                p.id === myParticipant?.id
                  ? "border-primary/50 bg-primary/8 font-semibold"
                  : "border-border bg-background text-foreground/80"
              )}
            >
              <span className="grid size-6 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent-ink">
                {initialOf(p.displayName)}
              </span>
              {p.displayName}
              {p.id === myParticipant?.id && <span className="font-normal text-muted-foreground">(vos)</span>}
              {p.userId === group.creatorId && (
                <Crown className="size-3.5 text-gold-ink" aria-label="creó el grupo" />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Ganador */}
      {winnerOption && (
        <section
          aria-labelledby="ganador"
          className="relative mt-6 overflow-hidden rounded-3xl border-2 border-gold bg-gradient-to-br from-gold/30 via-card to-card p-6 sm:p-8"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="taku-spark absolute size-2.5 rounded-full"
              style={
                {
                  top: `${20 + i * 8}%`,
                  left: `${12 + i * 3}%`,
                  background: i % 2 ? "var(--brand-coral)" : "var(--brand-yellow)",
                  "--dx": `${[-40, 60, -70, 50, 30][i]}px`,
                  "--dy": `${[-60, -40, -30, -70, -50][i]}px`,
                  animationDelay: `${i * 0.3}s`,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <TakuImage size={170} mood="celebrate" priority className="size-36 shrink-0 sm:size-44" />
            <div className="flex-1">
              <p className="text-sm font-bold tracking-wide text-gold-ink uppercase">
                🏆 Tenemos ganador
              </p>
              <h2 id="ganador" className="mt-1 font-heading text-4xl leading-tight">
                {winnerOption.name}
              </h2>
              <p className="mt-2 text-pretty text-foreground/80">{winnerOption.whyItFits}</p>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
                <PriceTag price={winnerOption.estimatedPrice} isEstimated={winnerOption.isPriceEstimated} />
                <Button
                  className="h-11 rounded-full px-6 font-semibold"
                  render={<Link href={`/regalo/${winnerOption.id}`} />}
                >
                  Ver dónde comprarlo
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {isFinished && !winnerOption && (
        <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Esta votación se cerró sin votos, así que no hay ganador.
        </p>
      )}

      {/* Compartir */}
      {showShareCard && (
        <section
          className={cn(
            "mt-6 rounded-3xl border p-5",
            justCreated && isCreator ? "border-primary/40 bg-primary/5" : "border-border bg-card"
          )}
          aria-labelledby="compartir"
        >
          <h2 id="compartir" className="font-heading text-2xl">
            {participants.length <= 1 ? "Invitá a tu gente" : "Sumá a más personas"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Entran con el link, ponen su nombre y votan. Sin cuentas ni contraseñas.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="h-11 rounded-full bg-[#1f7a4d] px-5 font-semibold text-white hover:bg-[#1a6841]"
              render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Compartir por WhatsApp
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="h-11 rounded-full px-5">
              {copied ? (
                <>
                  <Check className="size-4 text-accent-ink" aria-hidden="true" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <ClipboardCopy className="size-4" aria-hidden="true" />
                  Copiar link
                </>
              )}
            </Button>
            {canNativeShare && (
              <Button variant="ghost" onClick={handleNativeShare} className="h-11 rounded-full px-4">
                <Share2 className="size-4" aria-hidden="true" />
                Más opciones
              </Button>
            )}
            <p className="text-sm text-muted-foreground sm:ml-auto">
              Código: <span className="font-mono font-bold tracking-widest text-foreground uppercase">{group.inviteCode}</span>
            </p>
          </div>
        </section>
      )}

      {/* Unirse (identidad liviana, con Taku asomándose) */}
      {!myParticipant && !isFinished && identity && (
        <TakuPeek
          mood="wave"
          size={140}
          className="mt-8"
          message={`¡Hola! Te invitaron a elegir el regalo para ${who ?? "alguien especial"}.`}
        >
          <form
            onSubmit={handleJoin}
            className="rounded-3xl border border-border bg-card p-6 shadow-lg"
          >
            <h2 className="font-heading text-2xl">Sumate a la votación</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Solo tu nombre, para que el grupo sepa quién votó. Sin crear cuenta.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="display-name" className="sr-only">
                Tu nombre
              </label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setJoinError(null);
                }}
                placeholder="Tu nombre"
                className="h-12 flex-1 rounded-xl text-base"
                aria-invalid={joinError != null}
                aria-describedby={joinError ? "join-error" : undefined}
                autoComplete="given-name"
                maxLength={40}
              />
              <Button type="submit" disabled={joining} className="h-12 rounded-full px-6 font-semibold">
                <LogIn className="size-4" aria-hidden="true" />
                {joining ? "Entrando..." : "Entrar y votar"}
              </Button>
            </div>
            {joinError && (
              <p id="join-error" role="alert" className="mt-2 text-sm text-destructive">
                {joinError}
              </p>
            )}
          </form>
        </TakuPeek>
      )}

      {/* Ranking y votación */}
      <div className="mt-10">
        <h2 className="font-heading text-3xl">{isFinished ? "Resultados finales" : "Ranking en vivo"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFinished
            ? "Ordenados por puntaje promedio."
            : myParticipant
              ? "Puntuá cada regalo de 1 a 5 estrellas. Podés cambiar tu voto hasta que se cierre."
              : "Así va la votación. Sumate para puntuar."}
        </p>
      </div>

      <ol className="mt-4 grid gap-4">
        {displayRanking.map((summary, index) => {
          const option = options.find((o) => o.id === summary.optionId)!;
          const isWinner = option.id === winnerOption?.id;
          const myScore = myScores.get(option.id) ?? null;
          const barWidth = maxAverage > 0 ? Math.round((summary.average / 5) * 100) : 0;
          const canVote = Boolean(myParticipant) && !isFinished;

          return (
            <li
              key={option.id}
              className={cn(
                "overflow-hidden rounded-3xl border bg-card transition-shadow",
                isWinner ? "border-gold shadow-md" : "border-border"
              )}
            >
              <div className="flex gap-4 p-4">
                <div className="relative shrink-0">
                  <GiftImage
                    imageUrl={option.imageUrl}
                    category={option.category}
                    alt={option.name}
                    className="size-20 rounded-2xl sm:size-24"
                  />
                  <span
                    className={cn(
                      "absolute -top-2 -left-2 grid size-7 place-items-center rounded-full text-xs font-bold ring-2 ring-card",
                      index === 0 && summary.count > 0 ? "bg-gold text-foreground" : "bg-muted text-muted-foreground"
                    )}
                    aria-label={`Puesto ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/regalo/${option.id}`}
                          className="font-heading text-xl leading-snug hover:underline"
                        >
                          {option.name}
                        </Link>
                        {isWinner && (
                          <Badge className="bg-gold text-foreground">
                            <Crown className="size-3" aria-hidden="true" />
                            Ganador
                          </Badge>
                        )}
                        <CompatibilityBadge score={option.compatibilityScore} className="hidden sm:inline-flex" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{option.whyItFits}</p>
                    </div>
                    <PriceTag price={option.estimatedPrice} isEstimated={option.isPriceEstimated} className="shrink-0" />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {summary.count > 0 ? (
                          <>
                            <Star className="size-3.5 fill-gold text-gold" aria-hidden="true" />
                            <span className="font-semibold text-foreground">{summary.average.toFixed(1)}</span>
                            · {summary.count} voto{summary.count === 1 ? "" : "s"}
                          </>
                        ) : (
                          "Todavía sin votos"
                        )}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={Number(summary.average.toFixed(1))}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      aria-label={`Puntaje promedio de ${option.name}`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          isWinner || (index === 0 && summary.count > 0) ? "bg-gold" : "bg-primary/60"
                        )}
                        style={{ width: `${summary.count > 0 ? Math.max(barWidth, 4) : 0}%` }}
                      />
                    </div>
                  </div>

                  {canVote && (
                    <StarRating
                      optionName={option.name}
                      value={myScore}
                      disabled={votingOption === option.id}
                      onRate={(score) => handleVote(option.id, score)}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {isCreator && !isFinished && (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-3xl border border-border bg-card p-6 text-center">
          <p className="font-heading text-2xl">
            {everyoneDone ? "¡Ya votaron todos!" : "¿Listos para decidir?"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Al cerrar la votación se elige el regalo con mejor puntaje. Si hay
            empate, lo desempatás vos.
          </p>
          <Button
            onClick={() => setConfirmFinalize(true)}
            disabled={bundle.votes.length === 0}
            className="mt-2 h-12 rounded-full px-6 font-semibold"
          >
            <Crown className="size-4" aria-hidden="true" />
            Cerrar votación y ver ganador
          </Button>
          {bundle.votes.length === 0 && (
            <p className="text-xs text-muted-foreground">Se habilita con el primer voto.</p>
          )}
        </div>
      )}

      {!isFinished && (
        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={reload} className="gap-2 rounded-full text-muted-foreground">
            <RefreshCw className="size-4" aria-hidden="true" />
            Actualizar
          </Button>
        </div>
      )}

      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-2xl font-normal">
              ¿Cerrar la votación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {everyoneDone
                ? "Votaron todos. Se elige el regalo con mejor puntaje y nadie podrá votar después."
                : `Todavía faltan votos (${doneCount} de ${participants.length} votaron todo). Si cerrás ahora, nadie más podrá votar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Esperar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleFinalize()}
              disabled={finalizing}
              className="rounded-full"
            >
              {finalizing ? "Cerrando..." : "Sí, ver ganador"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={tieOptions != null} onOpenChange={(open) => !open && setTieOptions(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-2xl font-normal">
              ¡Empate! ¿Cuál gana?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estas ideas quedaron con el mismo puntaje. Como creaste el grupo,
              te toca desempatar. También podés esperar más votos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {(tieOptions ?? []).map((id) => {
              const option = options.find((o) => o.id === id);
              if (!option) return null;
              return (
                <Button
                  key={id}
                  variant="outline"
                  disabled={finalizing}
                  onClick={() => handleFinalize(id)}
                  className="h-auto justify-start rounded-2xl px-4 py-3 text-left whitespace-normal"
                >
                  <Crown className="size-4 text-gold-ink" aria-hidden="true" />
                  {option.name}
                </Button>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Esperar más votos</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StarRating({
  optionName,
  value,
  disabled,
  onRate,
}: {
  optionName: string;
  value: number | null;
  disabled: boolean;
  onRate: (score: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        role="radiogroup"
        aria-label={`Tu puntaje para ${optionName}`}
        className={cn("flex", disabled && "opacity-60")}
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} de 5: ${SCORE_LABELS[score]}`}
            disabled={disabled}
            onMouseEnter={() => setHover(score)}
            onFocus={() => setHover(score)}
            onBlur={() => setHover(null)}
            onClick={() => onRate(score)}
            className="grid size-10 place-items-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                score <= shown ? "fill-gold text-gold" : "text-border"
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground" aria-live="polite">
        {hover ? SCORE_LABELS[hover] : value ? `Tu voto: ${SCORE_LABELS[value]}` : "Sin votar"}
      </span>
    </div>
  );
}
