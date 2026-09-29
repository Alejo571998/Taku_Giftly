"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TakuSpot } from "@/components/taku/taku-spot";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <TakuSpot mood="sad" title="Uy, algo salió mal" className="mx-auto max-w-xl px-4 py-20">
      <p className="mt-2 text-muted-foreground">
        Intentá de nuevo. Si sigue pasando, volvé a empezar desde el inicio.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} className="rounded-full">
          Reintentar
        </Button>
        <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </div>
    </TakuSpot>
  );
}
