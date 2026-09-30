import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIp, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("permite hasta el límite y después bloquea", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 60_000, now).ok).toBe(true);
    const blocked = checkRateLimit("k", 3, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("se reinicia al terminar la ventana", () => {
    checkRateLimit("k", 1, 1_000, 0);
    expect(checkRateLimit("k", 1, 1_000, 500).ok).toBe(false);
    expect(checkRateLimit("k", 1, 1_000, 1_001).ok).toBe(true);
  });

  it("cada clave tiene su propio contador", () => {
    checkRateLimit("a", 1, 60_000, 0);
    expect(checkRateLimit("b", 1, 60_000, 0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("usa la primera IP de x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("cae a 'local' sin headers", () => {
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
