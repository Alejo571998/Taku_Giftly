"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, RefreshCw, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { GiftImage } from "@/components/gift-image";
import { PriceTag } from "@/components/price-tag";
import { CreateGroupDialog } from "@/components/results/create-group-dialog";
import { TakuImage } from "@/components/taku/taku-image";
import { TakuLoader } from "@/components/taku/taku-loader";
import { TakuSpot } from "@/components/taku/taku-spot";
import { useTaku } from "@/components/taku/taku-provider";
import { apiRequest } from "@/lib/client-auth";
import { interestLabel, occasionLabel, recipientPhrase } from "@/lib/catalog";
import { formatBudgetRange } from "@/lib/format";
import type { GiftOption, GiftSession, Group } from "@/lib/types";

interface SessionPayload {
  session: GiftSession;
  options: GiftOption[];
  group: Group | null;
}

function useSessionData(sessionId: string | null, reloadKey: number) {
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<SessionPayload>(`/api/sessions/${sessionId}`);
        if (!cancelled) setData(result);
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
  }, [sessionId, reloadKey]);

  return { data, error, loading, setData };
}

export function ResultsPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [reloadKey, setReloadKey] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const { data, error, loading, setData } = useSessionData(sessionId, reloadKey);
  const { say, sayOnce } = useTaku();
  const [moreLoading, setMoreLoading] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  /** "Mostrame otras ideas": nuevas ideas sin repetir, sumadas a las actuales. */
  async function handleMoreIdeas() {
    if (!data) return;
    setMoreLoading(true);
    try {
      const result = await apiRequest<{ options: GiftOption[]; newIds: string[] }>(
        `/api/sessions/${data.session.id}/more`,
        { method: "POST" }
      );
      const merged = [...data.options, ...result.options].sort(
        (a, b) => b.compatibilityScore - a.compatibilityScore
      );
      setData({ ...data, options: merged });
      setNewIds(new Set(result.newIds));
      say({
        text: `¡Te traje ${result.options.length} ideas nuevas! Las marqué con “Nueva”.`,
        mood: "celebrate",
      });
      if (data.group) toast.success("Las ideas nuevas también se sumaron a la votación.");
      requestAnimationFrame(() =>
        document.getElementById("ideas")?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "No pude traer más ideas.";
      say({ text: message, mood: "sad" });
    } finally {
      setMoreLoading(false);
    }
  }

  const who = data ? recipientPhrase(data.session.recipientRelationship, data.session.recipientName) : "";
  const count = data?.options.length ?? 0;

  useEffect(() => {
    if (!sessionId || count === 0) return;
    sayOnce(`results-${sessionId}`, {
      text: `¡Listo! Encontré ${count} ideas para ${who}. La primera es mi favorita.`,
      mood: "celebrate",
    });
  }, [sessionId, count, who, sayOnce]);

  if (!sessionId) {
    return (
      <TakuSpot mood="curious" title="Me falta saber qué búsqueda abrir" className="px-4 py-20">
        <p className="mt-2 text-muted-foreground">
          Entrá desde &quot;Mis regalos&quot; o empezá una búsqueda nueva.
        </p>
        <Button className="mt-6 rounded-full" render={<Link href="/regalo" />}>
          Encontrar un regalo
        </Button>
      </TakuSpot>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10" aria-busy="true">
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 h-10 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-8 h-72 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <TakuSpot mood="sad" title={error ?? "No encontré esa búsqueda"} className="px-4 py-20">
        <p className="mt-2 text-muted-foreground">
          Revisá el link o volvé a generar las recomendaciones.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} className="rounded-full">
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Button className="rounded-full" render={<Link href="/regalo" />}>
            Volver a empezar
          </Button>
        </div>
      </TakuSpot>
    );
  }

  const { session, options, group } = data;

  if (options.length === 0) {
    return (
      <TakuSpot mood="sad" title="Esta vez no encontré ideas" className="px-4 py-20">
        <p className="mt-2 text-muted-foreground">
          Probá sumando gustos o ampliando el presupuesto.
        </p>
        <Button className="mt-6 rounded-full" render={<Link href="/regalo" />}>
          Ajustar respuestas
        </Button>
      </TakuSpot>
    );
  }

  const showSourceBadge = process.env.NODE_ENV === "development";
  const [top, ...rest] = options;
  const occasion = occasionLabel(session.occasion);
  const interests = session.interests.map(interestLabel).join(", ");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary-ink">Tus ideas</p>
        <h1 className="mt-1 font-heading text-4xl tracking-tight text-balance sm:text-5xl">
          {options.length} regalos para {who}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[occasion, formatBudgetRange(session.budgetMin, session.budgetMax), interests]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {session.aiSource === "mock" && (
          // Modo demo: se dice claramente que las ideas no son de la IA.
          <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl bg-gold/20 px-4 py-3 text-sm text-gold-ink">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Versión demo:</strong> estas ideas
              son ejemplos que Taku armó con tus respuestas, todavía sin IA. Los
              precios de Mercado Libre sí son reales.
            </span>
          </p>
        )}
        {showSourceBadge && session.aiSource && session.aiSource !== "mock" && (
          <p className="mt-2 inline-flex rounded-full border border-dashed border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            IA: {session.aiSource} · solo visible en desarrollo
          </p>
        )}
      </div>

      {/* La recomendación principal, con más jerarquía */}
      <Link
        href={`/regalo/${top.id}`}
        className="group grid overflow-hidden rounded-3xl border-2 border-primary/30 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg md:grid-cols-[1fr_1.15fr]"
      >
        <GiftImage
          imageUrl={top.imageUrl}
          category={top.category}
          alt={top.name}
          className="h-56 w-full md:h-full md:min-h-72"
        />
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/25 py-0.5 pr-3 pl-0.5 text-xs font-bold text-gold-ink">
              <TakuImage size={24} className="size-6 animate-none!" />
              La favorita de Taku
            </span>
            <span className="flex items-center gap-1.5">
              {newIds.has(top.id) && <NewBadge />}
              <CompatibilityBadge score={top.compatibilityScore} showLabel />
            </span>
          </div>
          <h2 className="font-heading text-3xl leading-tight">{top.name}</h2>
          <p className="text-pretty text-foreground/80">{top.whyItFits}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            <span>
              <PriceTag price={top.estimatedPrice} isEstimated={top.isPriceEstimated} size="lg" />
              {top.offers.length > 1 && (
                <span className="block text-xs font-medium text-accent-ink">
                  Mejor precio entre {top.offers.length} vendedores
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-ink group-hover:underline">
              Ver por qué y dónde comprarlo
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>

      {rest.length > 0 && (
        <>
          <h2 id="ideas" className="mt-10 scroll-mt-24 font-heading text-2xl">Otras buenas ideas</h2>
          <ol className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((option) => (
              <li key={option.id} className="flex">
                <Link
                  href={`/regalo/${option.id}`}
                  className="group flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <GiftImage
                    imageUrl={option.imageUrl}
                    category={option.category}
                    alt={option.name}
                    className="h-40 w-full"
                  />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-xl leading-snug">
                        {newIds.has(option.id) && <NewBadge className="mr-1.5 align-middle" />}
                        {option.name}
                      </h3>
                      <CompatibilityBadge score={option.compatibilityScore} className="shrink-0" />
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{option.whyItFits}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <PriceTag price={option.estimatedPrice} isEstimated={option.isPriceEstimated} />
                      <ArrowRight
                        className="size-4 shrink-0 text-primary-ink transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* ¿Ninguna convence? Más ideas sin empezar de cero */}
      {moreLoading && <TakuLoader recipient={who} />}
      {group?.status !== "finished" && (
        <section className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-dashed border-border p-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="font-heading text-2xl">¿Ninguna te convence?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedile a Taku ideas distintas con las mismas respuestas, o cambiá lo que quieras.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {options.length < 15 && (
              <Button
                variant="outline"
                onClick={handleMoreIdeas}
                disabled={moreLoading}
                className="h-11 rounded-full px-5 font-semibold"
              >
                <Sparkles className="size-4 text-primary-ink" aria-hidden="true" />
                Mostrame otras ideas
              </Button>
            )}
            <Button
              variant="ghost"
              className="h-11 rounded-full px-5"
              render={<Link href={`/regalo?desde=${session.id}`} />}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Ajustar respuestas
            </Button>
          </div>
        </section>
      )}

      {/* Siguiente paso: decidir en grupo */}
      <section className="mt-10 flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-secondary p-6 text-center sm:flex-row sm:p-8 sm:text-left">
        <TakuImage size={112} mood="curious" className="size-24 shrink-0 sm:size-28" />
        <div className="flex-1">
          <h2 className="font-heading text-2xl">
            {group ? "La votación ya está en marcha" : "¿No te decidís? Que decida el grupo"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {group
              ? `Entrá a “${group.name}” para ver cómo va el ranking.`
              : "Compartí un link con tu familia o amigos: cada uno puntúa las ideas y gana la más votada."}
          </p>
        </div>
        {group ? (
          <Button className="h-12 rounded-full px-6 font-semibold" render={<Link href={`/grupo/${group.inviteCode}`} />}>
            Ir a la votación
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={() => setGroupOpen(true)} className="h-12 rounded-full px-6 font-semibold">
            <Users className="size-4" aria-hidden="true" />
            Armar grupo para votar
          </Button>
        )}
      </section>

      <CreateGroupDialog
        sessionId={session.id}
        suggestedName={`Regalo para ${who}`}
        open={groupOpen}
        onOpenChange={setGroupOpen}
      />
    </div>
  );
}

function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-gold/30 px-2 py-0.5 font-sans text-xs font-bold text-gold-ink ${className ?? ""}`}
    >
      Nueva
    </span>
  );
}
