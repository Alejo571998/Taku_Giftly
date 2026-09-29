import Image from "next/image";
import takuImage from "../../../assets/img/Taku-Giftly.png";
import type { TakuMood } from "@/lib/taku/types";
import { cn } from "@/lib/utils";

/**
 * La imagen original de Taku, sin retoques. El estado de ánimo solo
 * cambia la animación (CSS en globals.css, respeta reduced-motion).
 */
export function TakuImage({
  mood = "idle",
  size,
  className,
  priority,
  decorative = true,
}: {
  mood?: TakuMood;
  /** Ancho en px (la imagen es cuadrada). */
  size: number;
  className?: string;
  /** Imagen principal de la pantalla (LCP): carga inmediata. */
  priority?: boolean;
  decorative?: boolean;
}) {
  return (
    <Image
      // key fuerza a reiniciar la animación cuando cambia el estado
      key={mood}
      src={takuImage}
      alt={decorative ? "" : "Taku, el asistente de Giftly"}
      width={size}
      height={size}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={cn(
        "pointer-events-none select-none drop-shadow-[0_6px_10px_rgb(37_37_37/0.12)]",
        `taku-mood-${mood}`,
        className
      )}
    />
  );
}
