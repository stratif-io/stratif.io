import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "@stratif-io/design-system/index.css",
        replacement: path.resolve(
          __dirname,
          "../../packages/design-system/index.css",
        ),
      },
      {
        find: "@stratif-io/design-system",
        replacement: path.resolve(
          __dirname,
          "../../packages/design-system/index.ts",
        ),
      },
    ],
  },
});
