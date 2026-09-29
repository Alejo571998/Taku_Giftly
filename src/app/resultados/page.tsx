import { Suspense } from "react";
import type { Metadata } from "next";
import { ResultsPage } from "@/components/results/results-page";

export const metadata: Metadata = {
  title: "Tus recomendaciones",
  description:
    "Las mejores ideas de regalo ordenadas por compatibilidad, con su porqué y su precio.",
};

export default function ResultadosPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPage />
    </Suspense>
  );
}