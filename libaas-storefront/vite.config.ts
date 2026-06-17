import { defineConfig } from "vite";
// Frontend-only dev/build. The cloud-TTS proxy (server/) runs separately in production.
export default defineConfig({
  build: { target: "es2020", outDir: "dist" },
});
