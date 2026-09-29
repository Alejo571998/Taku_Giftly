import { TakuImage } from "@/components/taku/taku-image";
import type { TakuMood } from "@/lib/taku/types";
import { cn } from "@/lib/utils";

/**
 * Taku dentro del contenido para estados vacíos, errores y celebraciones.
 * Reemplaza íconos genéricos por el personaje con una frase suya.
 */
export function TakuSpot({
  mood = "idle",
  title,
  children,
  size = 140,
  headingLevel = "h1",
  className,
}: {
  mood?: TakuMood;
  title: string;
  children?: React.ReactNode;
  size?: number;
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <TakuImage size={size} mood={mood} />
      <Heading className="mt-4 font-heading text-3xl text-balance">{title}</Heading>
      {children}
    </div>
  );
}
