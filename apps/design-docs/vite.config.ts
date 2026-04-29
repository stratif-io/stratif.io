import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  server: { port: 5174 },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: path.resolve(__dirname, "../analytics/frontend") + "/",
      },
      {
        find: /^@stratif-io\/design-system$/,
        replacement: path.resolve(__dirname, "../../packages/design-system"),
      },
      {
        find: /^@stratif-io\/design-system\/index\.css$/,
        replacement: path.resolve(
          __dirname,
          "../../packages/design-system/index.css",
        ),
      },
    ],
  },
});
