import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["api/src/**/*.test.ts"],
    setupFiles: ["api/src/test/setupEnv.ts"],
    fileParallelism: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "api/src/modules/**/*.ts",
        "api/src/middlewares/**/*.ts",
        "api/src/utils/**/*.ts",
        "api/src/integrations/**/*.ts",
      ],
      exclude: [
        "api/src/**/*.test.ts",
        "api/src/test/**",
        "api/src/**/*.model.ts",
        "api/src/**/*.routes.ts",
        "api/src/utils/logger.ts",
        "api/src/integrations/**/*.port.ts",
        "api/src/integrations/index.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 60,
      },
    },
  },
});
