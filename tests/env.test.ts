import { afterEach, describe, expect, it } from "vitest";
import { env, isLocalhost, normalizeUrl } from "@/lib/env";

describe("normalizeUrl", () => {
  it.each([
    ["https://taku-giftly.vercel.app", "https://taku-giftly.vercel.app"],
    ["taku-giftly.vercel.app", "https://taku-giftly.vercel.app"],
    ["  https://taku-giftly.vercel.app/  ", "https://taku-giftly.vercel.app"],
    ['"https://taku-giftly.vercel.app"', "https://taku-giftly.vercel.app"],
    ["localhost:3000", "http://localhost:3000"],
    ["", null],
    ["https://", null],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeUrl(raw)).toBe(expected);
  });

  it("detecta localhost", () => {
    expect(isLocalhost("http://localhost:3000")).toBe(true);
    expect(isLocalhost("https://taku-giftly.vercel.app")).toBe(false);
  });
});

describe("env.siteUrl", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("en Vercel con la variable en localhost usa la URL de producción", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "taku-giftly.vercel.app";
    expect(env.siteUrl).toBe("https://taku-giftly.vercel.app");
  });

  it("nunca devuelve algo que rompa new URL()", () => {
    for (const raw of ["taku-giftly.vercel.app", "'x.com/'", "basura con espacios", ""]) {
      process.env.NEXT_PUBLIC_APP_URL = raw;
      expect(() => new URL(env.siteUrl)).not.toThrow();
    }
  });
});
