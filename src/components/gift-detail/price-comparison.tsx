"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-auth";
import { formatARS, formatDateTime } from "@/lib/format";
import type { GiftOption, ProductOffer } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];
const STALE_MS = 30 * 60 * 1000;

/** Ofertas guardadas; las opciones viejas solo tienen la oferta principal. */
function offersOf(option: GiftOption): ProductOffer[] {
  if (option.offers.length > 0) return option.offers;
  if (!option.isPriceEstimated && option.productUrl && option.estimatedPrice != null) {
    return [
      {
        store: option.storeName ?? "Mercado Libre",
        title: option.name,
        price: option.estimatedPrice,
        currency: option.currency,
        url: option.productUrl,
        imageUrl: option.imageUrl,
        freeShipping: false,
        available: true,
      },
    ];
  }
  return [];
}

/**
 * "Mejores precios encontrados": podio de tiendas con precio, envío,
 * disponibilidad, fecha de consulta y link real. Sin datos reales, lo dice.
 */
export function PriceComparison({
  option,
  onUpdated,
}: {
  option: GiftOption;
  onUpdated: (option: GiftOption) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  // Momento de apertura de la pantalla (para saber si los precios están viejos).
  const [openedAt] = useState(() => Date.now());
  const offers = offersOf(option);
  const updatedAt = option.pricesUpdatedAt ?? (offers.length > 0 ? option.createdAt : null);
  const stale = !updatedAt || openedAt - Date.parse(updatedAt) > STALE_MS;
  const canSearch = option.giftType === "physical" || option.giftType === "giftcard";

  async function refresh() {
    setRefreshing(true);
    try {
      const result = await apiRequest<{ option: GiftOption; refreshed: boolean }>(
        `/api/options/${option.id}/prices`,
        { method: "POST" }
      );
      onUpdated(result.option);
      toast.success(
        result.refreshed
          ? offersOf(result.option).length > 0
            ? "Precios actualizados."
            : "No encontramos este producto en tiendas todavía."
          : "Los precios ya están al día."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos actualizar los precios.");
    } finally {
      setRefreshing(false);
    }
  }

  if (offers.length === 0) {
    return (
      <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p className="flex-1">
          Todavía no tengo un precio verificado en tienda: el valor de arriba es
          una <strong className="font-semibold text-foreground">estimación</strong>.
        </p>
        {canSearch && (
          <Button variant="outline" onClick={refresh} disabled={refreshing} className="rounded-full">
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
            {refreshing ? "Buscando..." : "Buscar precios reales"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">Mejores precios encontrados</p>
      <ol className="mt-2 grid gap-2">
        {offers.map((offer, index) => (
          <li key={offer.url}>
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-secondary",
                index === 0 ? "border-2 border-accent/50 bg-accent/5" : "border-border"
              )}
            >
              <span className="text-2xl" aria-hidden="true">
                {MEDALS[index]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{offer.store}</span>
                <span className="block truncate text-xs text-muted-foreground" title={offer.title}>
                  {offer.title}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                  {offer.freeShipping && (
                    <span className="inline-flex items-center gap-1 font-medium text-accent-ink">
                      <Truck className="size-3.5" aria-hidden="true" />
                      Envío gratis
                    </span>
                  )}
                  {!offer.available && <span className="text-destructive">Sin stock</span>}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums">{formatARS(offer.price)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-primary-ink">
                  Ver <ExternalLink className="size-3" aria-hidden="true" />
                </span>
              </span>
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {updatedAt ? `Actualizado el ${formatDateTime(updatedAt)}` : ""} · Los precios pueden
          cambiar en la tienda.
        </span>
        {stale && (
          <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing} className="rounded-full">
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden="true" />
            {refreshing ? "Actualizando..." : "Actualizar precios"}
          </Button>
        )}
      </div>
    </div>
  );
}
