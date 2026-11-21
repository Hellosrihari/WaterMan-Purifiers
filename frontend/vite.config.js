
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "/waterman/",

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,

    allowedHosts: [
      "french-gratified-gigantic.ngrok-free.dev",
    ],


    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      "/waterman/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/waterman/, ""),
      },
    },

  },
});
