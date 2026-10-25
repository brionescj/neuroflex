import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Solo para `npm run dev`: la pagina (5173) reenvia /api al servidor local (npm run dev:server),
  // asi comparten origen y la cookie de sesion funciona. Vercel no usa esto.
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },

  resolve: {
    tsconfigPaths: true,
  },

  test: {
    environment: "node",
  },
});