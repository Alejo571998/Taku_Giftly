"use client";

import { useEffect, useState } from "react";
import { TakuImage } from "@/components/taku/taku-image";
import { useHideTakuDock } from "@/components/taku/taku-provider";
import { TAKU_LOADING_LINES } from "@/lib/taku/lines";

/**
 * Pantalla de espera mientras la IA genera las ideas: Taku "piensa" en
 * grande y narra lo que está haciendo, así la espera se siente trabajo.
 */
export function TakuLoader({ recipient }: { recipient: string }) {
  useHideTakuDock();
  const lines = [`Pensando en ${recipient}...`, ...TAKU_LOADING_LINES];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, lines.length - 1));
    }, 2400);
    return () => clearInterval(interval);
  }, [lines.length]);

  return (
    <div
      className="paper-grain fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute inset-6 rounded-full bg-accent/15 blur-2xl"
        />
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="taku-spark absolute top-1/3 left-1/2 size-2.5 rounded-full bg-gold"
            style={
              {
                "--dx": `${[-90, 80, -60, 100][i]}px`,
                "--dy": `${[-70, -90, 40, 20][i]}px`,
                animationDelay: `${i * 0.35}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <TakuImage size={200} mood="thinking" priority className="relative size-40 sm:size-50" />
      </div>
      <p key={index} className="taku-bubble mt-6 font-heading text-2xl sm:text-3xl">
        {lines[index]}
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Taku está armando ideas con un porqué concreto. Tarda unos segundos.
      </p>
      <div className="mt-6 flex gap-1.5" aria-hidden="true">
        {lines.map((line, i) => (
          <span
            key={line}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= index ? "w-6 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
