"use client";

import { TakuImage } from "@/components/taku/taku-image";
import { useHideTakuDock } from "@/components/taku/taku-provider";
import type { TakuMood } from "@/lib/taku/types";
import { cn } from "@/lib/utils";

/**
 * Taku asomándose por detrás de una tarjeta (formularios de identidad:
 * unirse a un grupo, crear grupo, ingresar código). La tarjeta tapa su
 * cuerpo: se ven la cabeza y las manos (regalo y celular) sobre el borde.
 * Mientras está visible, el dock se oculta: nunca hay dos Takus.
 */
export function TakuPeek({
  children,
  mood = "curious",
  align = "right",
  size = 132,
  message,
  className,
}: {
  children: React.ReactNode;
  mood?: TakuMood;
  align?: "left" | "right";
  size?: number;
  /** Frase corta que Taku dice desde su lugar. */
  message?: string;
  className?: string;
}) {
  useHideTakuDock();
  // ~60% de la imagen queda sobre el borde: cabeza + manos.
  const visible = Math.round(size * 0.6);

  return (
    <div className={cn("relative", className)} style={{ paddingTop: visible }}>
      <div
        aria-hidden="true"
        className={cn(
          "taku-peek absolute top-0 z-0",
          align === "right" ? "right-4 sm:right-8" : "left-4 sm:left-8"
        )}
        style={{ width: size, height: size }}
      >
        <TakuImage size={size} mood={mood} className="size-full" />
      </div>
      {message && (
        <p
          className={cn(
            "taku-bubble absolute top-2 z-10 max-w-[min(15rem,calc(100%-11rem))] rounded-2xl border border-border bg-card px-3 py-2 text-sm leading-snug shadow-md",
            align === "right"
              ? "rounded-br-sm"
              : "rounded-bl-sm"
          )}
          style={
            align === "right"
              ? { right: size + 24, animationDelay: "0.5s" }
              : { left: size + 24, animationDelay: "0.5s" }
          }
        >
          {message}
        </p>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
