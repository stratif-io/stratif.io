import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: path.resolve(__dirname) + "/" }],
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@radix-ui\//,
        "framer-motion",
        "lucide-react",
        "sonner",
        "tailwind-merge",
        "tailwindcss-animate",
        "class-variance-authority",
        "clsx",
        /^@fontsource/,
      ],
    },
    cssCodeSplit: false,
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
