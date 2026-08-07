import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/services/**/*.ts",
        "src/utils/**/*.ts",
        "src/store/**/*.tsx",
        "src/hooks/**/*.ts",
      ],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/services/index.ts", "src/store/index.ts", "src/hooks/index.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
