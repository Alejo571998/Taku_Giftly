import { Suspense } from "react";
import type { Metadata } from "next";
import { MyGiftsPage } from "@/components/mis-regalos/my-gifts-page";

export const metadata: Metadata = {
  title: "Mis regalos",
  description:
    "Tus búsquedas de regalos con su estado: en votación, decididos o sin grupo.",
};

export default function MisRegalosPage() {
  return (
    <Suspense fallback={null}>
      <MyGiftsPage />
    </Suspense>
  );
}