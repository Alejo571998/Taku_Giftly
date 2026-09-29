const STROKE = "currentColor";

interface IllustrationProps {
  category: string;
  className?: string;
}

/**
 * Ilustraciones fijas por categoría, estilo línea cálida (Dirección A).
 * Se usan cuando no hay imagen real de Mercado Libre: nunca una imagen
 * inventada por la IA presentada como real.
 */
export function GiftIllustration({ category, className }: IllustrationProps) {
  const common = {
    viewBox: "0 0 120 120",
    fill: "none",
    stroke: STROKE,
    strokeWidth: 3.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };

  switch (category) {
    case "gaming":
    case "videojuegos":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M28 66l5-24a8 8 0 0 1 7.8-6h38.4a8 8 0 0 1 7.8 6l5 24" />
          <path d="M28 66a10 10 0 0 0 9.7 12h44.6A10 10 0 0 0 92 66v-4a6 6 0 0 0-6-6H34a6 6 0 0 0-6 6v4z" className="fill-card" />
          <path d="M44 60v8m-4-4h8" />
          <circle cx="76" cy="62" r="3" className="fill-primary" stroke="none" />
          <circle cx="84" cy="70" r="3" className="fill-primary" stroke="none" />
        </svg>
      );
    case "tecnologia":
    case "musica":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M48 74V36l34-7v38" />
          <circle cx="41" cy="76" r="8" className="fill-card" />
          <circle cx="75" cy="69" r="8" className="fill-card" />
          <path d="M41 84v8m34-23v8" className="stroke-primary" />
        </svg>
      );
    case "deportes":
    case "fitness":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <circle cx="60" cy="58" r="18" className="fill-card" />
          <path d="M60 40V22m0 72V76" />
          <path d="M34 78l16-8m36 8l-16-8" />
          <path d="M34 78l16-8m36 8l-16-8" />
          <path d="M42 34l-8-8m44 8l8-8" />
        </svg>
      );
    case "autos":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M30 70l8-20a8 8 0 0 1 7.5-5h29a8 8 0 0 1 7.5 5l8 20" />
          <path d="M30 70v8a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-4h36v4a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-8a6 6 0 0 0-6-6H36a6 6 0 0 0-6 6z" className="fill-card" />
          <circle cx="44" cy="70" r="5" className="fill-primary" stroke="none" />
          <circle cx="76" cy="70" r="5" className="fill-primary" stroke="none" />
        </svg>
      );
    case "cine":
    case "arte":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M38 44h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H38a4 4 0 0 1-4-4V48a4 4 0 0 1 4-4z" className="fill-card" />
          <path d="M46 48v-6a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v6" />
          <circle cx="52" cy="62" r="4" className="fill-primary" stroke="none" />
          <path d="M60 62l14-8v16l-14-8z" className="fill-primary/20" />
        </svg>
      );
    case "libros":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M42 38h30a6 6 0 0 1 6 6v38H48a6 6 0 0 1-6-6V38z" className="fill-card" />
          <path d="M42 38a8 8 0 0 1 8-8h4v50h-4a8 8 0 0 1-8-8V38z" className="fill-primary/10" />
          <path d="M58 44h12m-12 8h12m-12 8h12" />
        </svg>
      );
    case "cocina":
    case "gastronomia":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M42 44h36a2 2 0 0 1 2 2c0 14-9 22-20 22s-20-8-20-22a2 2 0 0 1 2-2z" className="fill-card" />
          <path d="M48 68c-2 6-6 10-10 12m28-12c2 6 6 10 10 12" />
          <path d="M36 44h48" />
          <path d="M52 38v-6m8 6v-6m8 6v-6" />
        </svg>
      );
    case "cafe":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M40 52h32c0 12-6 22-16 22s-16-10-16-22z" className="fill-card" />
          <path d="M72 52h6a8 8 0 0 1 0 16h-8" />
          <path d="M48 44v-6m8 6v-6m8 6v-6" />
          <path d="M36 78h40" />
        </svg>
      );
    case "moda":
    case "belleza":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M38 54l22-18 22 18v26a4 4 0 0 1-4 4H42a4 4 0 0 1-4-4V54z" className="fill-card" />
          <path d="M38 54h44" />
          <path d="M46 54v22m28-22v22" />
          <path d="M54 54l6-14 6 14" className="stroke-primary" />
        </svg>
      );
    case "viajes":
    case "fotografia":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M40 40h14l4-6h12l4 6h6a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6z" className="fill-card" />
          <circle cx="60" cy="62" r="12" />
          <circle cx="60" cy="62" r="5" className="fill-primary" stroke="none" />
          <circle cx="82" cy="46" r="2.5" className="fill-primary" stroke="none" />
        </svg>
      );
    case "experiencias":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M36 52h48v30a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V52z" className="fill-card" />
          <path d="M36 52c0-8 8-12 24-12s24 4 24 12" />
          <path d="M52 44v-6m16 6v-6" className="stroke-primary" />
          <path d="M52 60h16m-16 8h10" />
        </svg>
      );
    case "otros":
    default:
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="42" className="fill-primary/10" />
          <path d="M42 50h36v26a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4V50z" className="fill-card" />
          <path d="M42 50c0-8 8-12 18-12s18 4 18 12" />
          <path d="M52 42v-6m16 6v-6" className="stroke-primary" />
          <path d="M60 50v30" />
          <path d="M50 62h20" />
        </svg>
      );
  }
}