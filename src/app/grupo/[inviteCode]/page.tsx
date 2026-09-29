import { Suspense } from "react";
import type { Metadata } from "next";
import { GroupPage } from "@/components/group/group-page";

export const metadata: Metadata = {
  title: "Grupo",
  description:
    "Votá junto a tus personas favoritas cuál es el mejor regalo, en vivo.",
};

export default function GrupoRoute() {
  return (
    <Suspense fallback={null}>
      <GroupPage />
    </Suspense>
  );
}