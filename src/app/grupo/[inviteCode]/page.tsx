import { Suspense } from "react";
import type { Metadata } from "next";
import { GroupPage } from "@/components/group/group-page";
import { getDataStore } from "@/lib/data";
import { occasionLabel, recipientPhrase } from "@/lib/catalog";

/**
 * Título y descripción del link de invitación (preview de WhatsApp).
 * Solo nombre del grupo, destinatario y ocasión: nunca pistas.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const fallback: Metadata = {
    title: "Votá el regalo",
    description: "Te invitaron a elegir un regalo en grupo. Entrá, poné tu nombre y votá: sin crear cuenta.",
  };
  try {
    const bundle = await getDataStore().getGroupByCode(inviteCode);
    if (!bundle) return fallback;
    const who = bundle.session
      ? recipientPhrase(bundle.session.recipientRelationship, bundle.session.recipientName)
      : "alguien especial";
    const occasion = bundle.session ? occasionLabel(bundle.session.occasion) : null;
    const finished = bundle.group.status === "finished";
    const description = finished
      ? `El grupo ya eligió el regalo para ${who}. Mirá cuál ganó.`
      : `Ayudá a elegir el regalo para ${who}${occasion ? ` (${occasion})` : ""}. Hay ${bundle.options.length} ideas: entrá, poné tu nombre y votá. Sin crear cuenta.`;
    return {
      title: bundle.group.name,
      description,
      openGraph: { title: `${bundle.group.name} · Giftly`, description },
      twitter: { card: "summary_large_image", title: `${bundle.group.name} · Giftly`, description },
      robots: { index: false, follow: false },
    };
  } catch {
    return fallback;
  }
}

export default function GrupoRoute() {
  return (
    <Suspense fallback={null}>
      <GroupPage />
    </Suspense>
  );
}
