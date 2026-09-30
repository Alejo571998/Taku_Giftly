import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resuelve los alias "@/..." de tsconfig.json
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests siempre offline: modo local, sin IA ni Mercado Libre reales,
    // y datos en una carpeta temporal (nunca en .data/ del proyecto).
    env: {
      NEXT_PUBLIC_GIFTLY_DATA_MODE: "local",
      OPENAI_API_KEY: "",
      ML_CLIENT_ID: "",
      ML_CLIENT_SECRET: "",
      GIFTLY_DATA_DIR: path.join(os.tmpdir(), `giftly-test-${Date.now()}`),
    },
  },
});
