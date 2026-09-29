import Link from "next/link";
import { ArrowRight, Search, Sparkles, ShoppingBag, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JoinGroupDialog } from "@/components/home/join-group-dialog";
import { HeroTaku } from "@/components/home/hero-taku";
import { RELATIONSHIPS } from "@/lib/catalog";

const STEPS = [
  {
    icon: Search,
    title: "Contanos sobre esa persona",
    text: "Quién es, la ocasión, qué le gusta y cuánto querés gastar.",
  },
  {
    icon: Sparkles,
    title: "Taku encuentra ideas",
    text: "Cada recomendación explica por qué le encaja. Nada de listas genéricas.",
  },
  {
    icon: ShoppingBag,
    title: "Comparás dónde comprarlo",
    text: "Precios de tiendas cuando los hay; si es un estimado, lo decimos.",
  },
  {
    icon: Users,
    title: "Compartís y votan",
    text: "Un link para tu gente: cada uno puntúa sin crear cuenta.",
  },
  {
    icon: Trophy,
    title: "Tienen ganador",
    text: "El grupo decide y el regalo queda elegido. Si empatan, lo desempatás vos.",
  },
];

export default function Home() {
  return (
    <div className="paper-grain">
      <section className="mx-auto grid w-full max-w-5xl items-center gap-6 px-4 pt-10 pb-10 sm:pt-16 lg:grid-cols-[1.15fr_1fr]">
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Regalar bien es escuchar
          </p>
          <h1 className="text-balance font-heading text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            ¿No sabés qué{" "}
            <em className="text-primary">regalarle</em>?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground lg:mx-0">
            Contanos quién es esa persona. Taku te propone regalos con un
            porqué concreto, busca dónde comprarlos y te ayuda a decidirlo con
            tu gente.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="lg"
              className="h-12 rounded-full px-8 text-base font-semibold"
              render={<Link href="/regalo" />}
            >
              Encontrar un regalo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <JoinGroupDialog />
          </div>
        </div>
        <HeroTaku />
      </section>

      <section aria-labelledby="para-quien" className="mx-auto w-full max-w-5xl px-4 pb-8">
        <h2 id="para-quien" className="text-center font-heading text-2xl lg:text-left">
          Empezá por la persona
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RELATIONSHIPS.map((relationship) => (
            <Link
              key={relationship.key}
              href={`/regalo?relacion=${relationship.key}`}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
            >
              Para {relationship.possessive}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
              De “no sé qué regalarle” a “¡es este!”
            </h2>
            <p className="mt-3 text-muted-foreground">
              Descubrí, compará, compartí, votá y decidí. Un flujo corto, sin
              registros ni vueltas.
            </p>
            {/* Ejemplo del diferencial: el porqué */}
            <figure className="mt-6 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-heading text-xl">Kit premium para parrilla</p>
                <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent-ink">
                  96% compatible
                </span>
              </div>
              <blockquote className="mt-2 text-sm text-muted-foreground">
                “Le gusta cocinar, disfruta de hacer asados y hace poco comentó
                que quería renovar sus accesorios para la parrilla.”
              </blockquote>
              <figcaption className="mt-3 text-xs font-medium text-muted-foreground">
                Así explica Taku cada recomendación (ejemplo).
              </figcaption>
            </figure>
          </div>
          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-background/60 p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-ink">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">
                    <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
