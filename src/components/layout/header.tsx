import Link from "next/link";
import { TakuImage } from "@/components/taku/taku-image";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-foreground"
          aria-label="Giftly, volver al inicio"
        >
          <TakuImage
            size={40}
            mood="idle"
            className="size-10 animate-none! transition-transform group-hover:-rotate-6"
          />
          <span className="font-heading text-2xl tracking-tight">Giftly</span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <Link
            href="/mis-regalos"
            className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            Mis regalos
          </Link>
          <Link
            href="/regalo"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <span className="sm:hidden">Empezar</span>
            <span className="hidden sm:inline">Encontrar un regalo</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
