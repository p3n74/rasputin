import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root,
  base: "/_rasputin/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
