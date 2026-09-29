"use client";

import { useEffect, useRef, useState } from "react";
import { TakuImage } from "@/components/taku/taku-image";
import { useHideTakuDock } from "@/components/taku/taku-provider";

/**
 * Taku protagonista del hero. Mientras está en pantalla se oculta el dock
 * (nunca hay dos Takus); al scrollear, "se muda" a la esquina.
 */
export function HeroTaku() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useHideTakuDock(visible);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto w-fit">
      <span
        aria-hidden="true"
        className="absolute inset-x-8 bottom-4 h-8 rounded-full bg-accent/20 blur-xl"
      />
      <div className="taku-bubble absolute -top-2 left-1/2 z-10 w-max max-w-56 -translate-x-1/2 rounded-2xl rounded-b-sm border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-md sm:-left-10 sm:translate-x-0">
        ¡Hola! Soy Taku. Contame de esa persona y te ayudo a elegir.
      </div>
      <TakuImage
        size={320}
        mood="wave"
        priority
        className="relative mt-12 size-56 sm:size-80"
      />
    </div>
  );
}
