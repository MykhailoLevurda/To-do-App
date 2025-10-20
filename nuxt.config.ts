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
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000/api",
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || "ws://localhost:3002",
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
