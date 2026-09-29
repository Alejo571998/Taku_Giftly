import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceTag({
  price,
  isEstimated,
  size = "md",
  className,
}: {
  price: number | null;
  isEstimated: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-bold tabular-nums",
          size === "lg" ? "text-2xl" : "text-lg"
        )}
      >
        {isEstimated && price != null && (
          <span className="mr-0.5 font-medium" aria-hidden="true">
            ~
          </span>
        )}
        {price != null ? formatARS(price) : "Consultar precio"}
      </span>
      {isEstimated && (
        <span
          className="rounded-full border border-dashed border-current/30 px-2 py-0.5 text-xs font-medium opacity-80"
          title="Estimación de Taku: no es un precio verificado en tienda"
        >
          Precio estimado
        </span>
      )}
    </span>
  );
}
