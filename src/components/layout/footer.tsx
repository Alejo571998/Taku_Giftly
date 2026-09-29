export function Footer() {
  return (
    // pb extra: deja espacio para que Taku (esquina inferior) no tape el texto
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 pt-8 pb-28 text-sm text-muted-foreground sm:pb-10 sm:pl-36">
        <p className="font-heading text-lg text-foreground">Giftly</p>
        <p>
          Descubrí, compará, compartí, votá y decidí. Regalar bien es escuchar.
        </p>
        <p className="text-xs">
          Los precios reales provienen de tiendas online; cuando no hay un
          precio verificado se muestra un estimado, siempre etiquetado como tal.
        </p>
      </div>
    </footer>
  );
}
