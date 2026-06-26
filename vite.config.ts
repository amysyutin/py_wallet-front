import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/auth": "https://pywallet.dev",
      "/wallets": "https://pywallet.dev",
      "/wallet-groups": "https://pywallet.dev",
      "/snapshot": "https://pywallet.dev",
      "/portfolio": "https://pywallet.dev",
      "/assets": "https://pywallet.dev",
      "/binance": "https://pywallet.dev",
      "/demo": "https://pywallet.dev",
      "/health": "https://pywallet.dev",
    },
  },
});
