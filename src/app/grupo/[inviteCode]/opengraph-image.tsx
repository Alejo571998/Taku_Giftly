import { ImageResponse } from "next/og";
import { getDataStore } from "@/lib/data";
import { occasionLabel, recipientPhrase } from "@/lib/catalog";
import { OG_COLORS, OG_SIZE, OgBrand, clip, ogAssets } from "@/lib/og";

export const alt = "Invitación a votar el regalo en Giftly";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Preview del link de invitación (lo que se ve en WhatsApp antes de abrirlo).
 * Solo datos que ya conoce quien recibe el link: nombre del grupo, para
 * quién es y la ocasión. Nunca pistas ni "cosas a evitar".
 */
export default async function Image({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const { takuSrc, fonts } = await ogAssets();

  let title = "Te invitaron a elegir un regalo";
  let subtitle = "Entrá, poné tu nombre y votá. Sin crear cuenta.";
  let badge = "Votación en vivo";
  let badgeColor = OG_COLORS.coral;
  let groupName: string | null = null;

  try {
    const bundle = await getDataStore().getGroupByCode(inviteCode);
    if (bundle) {
      groupName = clip(bundle.group.name, 40);
      const who = bundle.session
        ? recipientPhrase(bundle.session.recipientRelationship, bundle.session.recipientName)
        : null;
      const occasion = bundle.session ? occasionLabel(bundle.session.occasion) : null;
      const winner = bundle.options.find((o) => o.id === bundle.group.winnerOptionId);
      if (bundle.group.status === "finished" && winner) {
        title = "¡Tenemos ganador!";
        subtitle = clip(winner.name, 60);
        badge = "Decidido";
        badgeColor = OG_COLORS.sageInk;
      } else {
        title = who ? `Ayudá a elegir el regalo para ${who}` : title;
        subtitle = [
          occasion,
          `${bundle.options.length} ideas`,
          `${bundle.participants.length} ${bundle.participants.length === 1 ? "persona votando" : "personas votando"}`,
        ]
          .filter(Boolean)
          .join(" · ");
      }
    }
  } catch {
    // Sin datos (grupo inexistente o base caída): imagen genérica.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: OG_COLORS.cream,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <OgBrand />
            <div
              style={{
                display: "flex",
                padding: "6px 18px",
                borderRadius: 999,
                background: badgeColor,
                color: "white",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {badge}
            </div>
          </div>
          {groupName && (
            <div style={{ display: "flex", marginTop: 34, fontSize: 30, color: OG_COLORS.gray }}>
              {groupName}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: groupName ? 8 : 34,
              fontFamily: "DM Serif Display",
              fontSize: 76,
              lineHeight: 1.05,
              color: OG_COLORS.charcoal,
            }}
          >
            {clip(title, 70)}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 32, color: OG_COLORS.gray }}>
            {subtitle}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              alignSelf: "flex-start",
              padding: "14px 30px",
              borderRadius: 999,
              background: OG_COLORS.coral,
              color: "white",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {badge === "Decidido" ? "Ver el regalo elegido" : "Entrá y votá"}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={takuSrc} width={380} height={380} alt="" />
      </div>
    ),
    { ...size, fonts }
  );
}
