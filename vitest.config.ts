import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      globals: true,
    },
  },

  // React/jsdom tests for apps/web
  {
    test: {
      name: "web",
      root: "./apps/web",
      environment: "jsdom",
      setupFiles: ["./apps/web/vitest.setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      globals: true,
    },
  },
]);
