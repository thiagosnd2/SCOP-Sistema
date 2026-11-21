import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? "postgresql://scop:scop@localhost:5432/scop_teste",
      JWT_SECRET: "segredo-de-teste-com-mais-de-16",
    },
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
