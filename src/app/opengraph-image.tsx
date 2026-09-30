import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgBrand, ogAssets } from "@/lib/og";

export const alt = "Giftly: Taku te ayuda a encontrar el regalo ideal";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const { takuSrc, fonts } = await ogAssets();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: OG_COLORS.cream,
          padding: "60px 70px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <OgBrand />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: 40,
              fontFamily: "DM Serif Display",
              fontSize: 92,
              lineHeight: 1.02,
              color: OG_COLORS.charcoal,
            }}
          >
            <span>¿No sabés qué&nbsp;</span>
            <span style={{ color: OG_COLORS.coral }}>regalarle</span>
            <span>?</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: OG_COLORS.gray, lineHeight: 1.35 }}>
            Taku te propone ideas con un porqué, busca dónde comprarlas y tu
            gente vota.
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={takuSrc} width={420} height={420} alt="" />
      </div>
    ),
    { ...size, fonts }
  );
}
