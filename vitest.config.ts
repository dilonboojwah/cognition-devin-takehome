import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // One SQLite file, so tests share a connection and run one at a time.
    fileParallelism: false,
    env: { DATABASE_URL: "file:./test.db" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
