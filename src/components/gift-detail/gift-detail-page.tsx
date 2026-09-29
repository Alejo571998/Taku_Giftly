"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { GiftImage } from "@/components/gift-image";
import { PriceTag } from "@/components/price-tag";
import { CreateGroupDialog } from "@/components/results/create-group-dialog";
import { TakuImage } from "@/components/taku/taku-image";
import { TakuSpot } from "@/components/taku/taku-spot";
import { apiRequest } from "@/lib/client-auth";
import { interestLabel, recipientPhrase } from "@/lib/catalog";
import { PriceComparison } from "@/components/gift-detail/price-comparison";
import { formatARS, formatBudgetRange } from "@/lib/format";
import { storeSearchLinks } from "@/lib/products/store-links";
import type { GiftOption, GiftSession, Group } from "@/lib/types";

interface OptionPayload {
  option: GiftOption;
  session: GiftSession;
  group: Group | null;
}

export function GiftDetailPage() {
  const params = useParams<{ id: string }>();
  const optionId = params.id;

  const [data, setData] = useState<OptionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<OptionPayload>(`/api/options/${optionId}`);
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
  }, [optionId]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.option.name ?? "Un regalo que encontré en Giftly",
          text: data?.option.whyItFits ?? "",
          url,
        });
        return;
      } catch {
        // el usuario canceló; seguimos con clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin clipboard disponible
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy="true">
        <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-72 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <TakuSpot mood="sad" title={error ?? "No encontré ese regalo"} className="px-4 py-20">
        <Button className="mt-6 rounded-full" render={<Link href="/mis-regalos" />}>
          Ver mis regalos
        </Button>
      </TakuSpot>
    );
  }

  const { option, session, group } = data;
  const who = recipientPhrase(session.recipientRelationship, session.recipientName);
  const overBudget =
    option.estimatedPrice != null &&
    session.budgetMax != null &&
    option.estimatedPrice > session.budgetMax;
  const hasVerifiedOffer = option.offers.length > 0 || (!option.isPriceEstimated && option.productUrl != null);
  const searchLinks = storeSearchLinks(option.name, option.giftType);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href={`/resultados?session=${session.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a las ideas
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(0,1fr)_1.1fr]">
        <GiftImage
          imageUrl={option.imageUrl}
          category={option.category}
          alt={option.name}
          className="h-64 w-full rounded-3xl sm:h-full sm:min-h-72"
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{interestLabel(option.category)}</Badge>
            <CompatibilityBadge score={option.compatibilityScore} showLabel />
          </div>
          <h1 className="font-heading text-4xl leading-tight tracking-tight">{option.name}</h1>
          <PriceTag price={option.estimatedPrice} isEstimated={option.isPriceEstimated} size="lg" />
          <p className="text-sm text-muted-foreground">
            Tu presupuesto: {formatBudgetRange(session.budgetMin, session.budgetMax)}
          </p>
          {overBudget && (
            <p className="flex items-start gap-2 rounded-xl bg-gold/20 px-3 py-2 text-sm text-gold-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Supera tu tope de {formatARS(session.budgetMax!)}. Te lo mostramos
              porque encaja muy bien.
            </p>
          )}
          <p className="text-sm text-foreground/80">{option.description}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-11 rounded-full px-5"
            >
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Link copiado
                </>
              ) : (
                <>
                  <Share2 className="size-4" aria-hidden="true" />
                  Compartir
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* El porqué, en boca de Taku */}
      <section className="mt-8 flex items-end gap-3">
        <TakuImage size={72} mood="happy" className="size-16 shrink-0 sm:size-18" />
        <div className="relative flex-1 rounded-3xl rounded-bl-md border border-border bg-card p-5">
          <h2 className="font-heading text-2xl">Por qué se lo recomiendo</h2>
          <p className="mt-2 text-pretty text-foreground/85">{option.whyItFits}</p>
        </div>
      </section>

      {(option.pros.length > 0 || option.cons.length > 0) && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {option.pros.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-xl">
                <Plus className="size-4 text-accent-ink" aria-hidden="true" />
                A favor
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-foreground/80">
                {option.pros.map((pro) => (
                  <li key={pro} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden="true" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {option.cons.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-xl">
                <Minus className="size-4 text-primary-ink" aria-hidden="true" />
                A tener en cuenta
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-foreground/80">
                {option.cons.map((con) => (
                  <li key={con} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Comparación de precios / dónde comprarlo */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6" aria-labelledby="donde-comprar">
        <h2 id="donde-comprar" className="flex items-center gap-2 font-heading text-2xl">
          <ShoppingBag className="size-5 text-primary-ink" aria-hidden="true" />
          Dónde comprarlo
        </h2>

        <PriceComparison
          option={option}
          onUpdated={(updated) => setData((d) => (d ? { ...d, option: updated } : d))}
        />

        <p className="mt-5 text-sm font-semibold">
          {hasVerifiedOffer ? "Compará en otras tiendas" : "Buscar en tiendas"}
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {searchLinks.map((link) => (
            <li key={link.store}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-secondary"
              >
                <span>
                  <span className="block text-sm font-semibold">{link.store}</span>
                  <span className="block text-xs text-muted-foreground">{link.hint}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <details className="group mt-6 rounded-3xl border border-dashed border-border p-6">
        <summary className="cursor-pointer list-none font-heading text-xl marker:hidden">
          ¿Cómo se calcula el {option.compatibilityScore}%?
          <span className="ml-2 font-sans text-sm text-muted-foreground group-open:hidden">Ver</span>
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Combina cuatro señales con un peso fijo: coincidencia con sus gustos,
          ajuste al presupuesto, si responde a una pista que nos diste y qué
          tan típico es para la relación y la edad. Si aparece algo de “cosas
          a evitar”, se descuenta fuerte.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">40% gustos</Badge>
          <Badge variant="secondary">25% presupuesto</Badge>
          <Badge variant="secondary">20% pista</Badge>
          <Badge variant="secondary">15% relación y edad</Badge>
        </div>
      </details>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {group ? (
          <Button
            className="h-12 flex-1 rounded-full text-base font-semibold"
            render={<Link href={`/grupo/${group.inviteCode}`} />}
          >
            Ir a la votación del grupo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={() => setGroupOpen(true)}
            className="h-12 flex-1 rounded-full text-base font-semibold"
          >
            <Users className="size-4" aria-hidden="true" />
            Decidirlo en grupo
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 rounded-full"
          render={<Link href={`/resultados?session=${session.id}`} />}
        >
          Ver las otras ideas
        </Button>
      </div>

      <CreateGroupDialog
        sessionId={session.id}
        suggestedName={`Regalo para ${who}`}
        open={groupOpen}
        onOpenChange={setGroupOpen}
      />
    </div>
  );
}
