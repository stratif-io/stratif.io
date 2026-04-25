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
        find: "@stratif-io/web/styles.css",
        replacement: path.resolve(__dirname, "../web/frontend/index.css"),
      },
      {
        find: "@stratif-io/web",
        replacement: path.resolve(__dirname, "../web/dist/index.js"),
      },
    ],
  },
});
