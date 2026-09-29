import { Suspense } from "react";
import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/wizard";

export const metadata: Metadata = {
  title: "Encontrar un regalo",
  description:
    "Contanos quién es la persona, qué le gusta y cuánto querés gastar: la IA te propone ideas con un porqué concreto.",
};

export default async function RegaloPage({
  searchParams,
}: {
  searchParams: Promise<{ relacion?: string }>;
}) {
  const { relacion } = await searchParams;
  const validRelationships = [
    "pareja",
    "madre",
    "padre",
    "hermano",
    "amigo",
    "companiero",
    "hijo",
    "otro",
  ];
  const initial =
    typeof relacion === "string" && validRelationships.includes(relacion)
      ? relacion
      : undefined;

  return (
    <Suspense fallback={null}>
      <Wizard initialRelationship={initial} />
    </Suspense>
  );
}