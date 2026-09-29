import { Suspense } from "react";
import type { Metadata } from "next";
import { GiftDetailPage } from "@/components/gift-detail/gift-detail-page";

export const metadata: Metadata = {
  title: "Detalle del regalo",
  description:
    "Por qué se recomendó este regalo, cuánto cuesta y dónde conseguirlo.",
};

export default function GiftDetailRoute() {
  return (
    <Suspense fallback={null}>
      <GiftDetailPage />
    </Suspense>
  );
}