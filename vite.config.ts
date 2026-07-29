import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env["VITE_DEV_PROXY_TARGET"] || "https://localhost";

  return {
    base: "/publisher/",
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: Number(env["PORT"] || 5174),
      proxy: {
        "/api": { target, changeOrigin: true, secure: false },
        "/media-control": { target, changeOrigin: true, secure: false },
        "/webrtc": { target, changeOrigin: true, secure: false }
      }
    },
    test: { environment: "node" }
  };
});
