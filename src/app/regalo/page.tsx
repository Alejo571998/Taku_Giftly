import { Suspense } from "react";
import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/wizard";
import { RELATIONSHIP_KEYS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Encontrar un regalo",
  description:
    "Contanos quién es la persona, qué le gusta y cuánto querés gastar: la IA te propone ideas con un porqué concreto.",
};

const UUID = /^[0-9a-f-]{36}$/i;

export default async function RegaloPage({
  searchParams,
}: {
  searchParams: Promise<{ relacion?: string; desde?: string }>;
}) {
  const { relacion, desde } = await searchParams;
  const initial =
    typeof relacion === "string" && RELATIONSHIP_KEYS.includes(relacion)
      ? relacion
      : undefined;
  // "Ajustar respuestas": precargar una búsqueda anterior.
  const fromSessionId = typeof desde === "string" && UUID.test(desde) ? desde : undefined;

  return (
    <Suspense fallback={null}>
      <Wizard initialRelationship={initial} fromSessionId={fromSessionId} />
    </Suspense>
  );
}
