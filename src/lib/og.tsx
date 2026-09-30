import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Piezas compartidas de las imágenes para compartir (WhatsApp, redes).
 * Taku es una copia reducida de la imagen original (mismo arte, 440px) para
 * que la imagen generada pese poco.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  cream: "#fff8f0",
  coral: "#e86a5b",
  coralInk: "#b8483a",
  sage: "#718b72",
  sageInk: "#4b654d",
  charcoal: "#252525",
  gray: "#716d68",
  yellow: "#f4c95d",
  border: "#e9e5df",
};

// Se leen una sola vez por instancia (no dependen del pedido).
const assets = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/DMSerifDisplay-Regular.woff")),
  readFile(join(process.cwd(), "assets/img/Taku-Giftly-440.png")),
]).then(([font, taku]) => ({
  font,
  takuSrc: `data:image/png;base64,${taku.toString("base64")}`,
}));

export async function ogAssets() {
  const { font, takuSrc } = await assets;
  return {
    takuSrc,
    fonts: [{ name: "DM Serif Display", data: font, style: "normal" as const, weight: 400 as const }],
  };
}

/** Marca "Giftly" chica para la esquina. */
export function OgBrand() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "DM Serif Display",
        fontSize: 40,
        color: OG_COLORS.charcoal,
      }}
    >
      Giftly
    </div>
  );
}

/** Recorta textos largos para que entren en la tarjeta. */
export function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
