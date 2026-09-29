import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TakuSpot } from "@/components/taku/taku-spot";

export default function NotFound() {
  return (
    <TakuSpot mood="curious" title="Busqué por todos lados y no encontré esta página" className="mx-auto max-w-xl px-4 py-20">
      <p className="mt-2 text-muted-foreground">
        El enlace puede estar mal escrito o ya no existe.
      </p>
      <Button className="mt-6 rounded-full" render={<Link href="/" />}>
        Volver al inicio
      </Button>
    </TakuSpot>
  );
}
