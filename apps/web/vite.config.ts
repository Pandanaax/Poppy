// apps/web/vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Load environment variables with prefix "VITE_"
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const ORS_KEY = env.VITE_ORS_API_KEY || "";

  return {
    plugins: [react()],

    resolve: {
      alias: {
        // Shortcut to use the shared sources directly during development
        "@poppy/shared": path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts"
        ),
      },
    },

    server: {
      proxy: {
        // Proxy Poppy API requests
        "/poppy/": {
          target: "https://poppy.red",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/poppy\//, "/"),
        },

        // Proxy OpenRouteService requests and inject Authorization header
        "/ors/": {
          target: "https://api.openrouteservice.org",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/ors\//, "/"),
          headers: {
            Authorization: ORS_KEY,
          },
        },
      },
    },

    preview: {
      proxy: {
        "/poppy/": {
          target: "https://poppy.red",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/poppy\//, "/"),
        },
        "/ors/": {
          target: "https://api.openrouteservice.org",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/ors\//, "/"),
          headers: {
            Authorization: ORS_KEY,
          },
        },
      },
    },

    // Vitest configuration
    test: {
      environment: "jsdom",             // Needed for React DOM rendering
      globals: true,                    // Enable describe/it/expect without imports
      setupFiles: "./src/setupTests.ts", // Optional: custom setup (e.g. jest-dom)
    },
  };
});
