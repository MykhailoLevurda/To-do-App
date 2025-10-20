import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@pinia/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/color-mode"
  ],
  pinia: { autoImports: ["defineStore"] },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || "",
      wsEnabled: process.env.NUXT_PUBLIC_WS_ENABLED === "true" || false,
      appName: process.env.NUXT_PUBLIC_APP_NAME || "Scrum Board"
    }
  },
  vite: {
    define: {
      global: 'globalThis',
    }
  },
  ssr: true,
  nitro: {
    experimental: {
      wasm: true
    }
  },
  devtools: { enabled: true },
  colorMode: {
    classSuffix: "",
    preference: "light",
    fallback: "light"
  },
  typescript: { strict: true }
});
