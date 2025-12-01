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
      appName: process.env.NUXT_PUBLIC_APP_NAME || "Scrum Board",
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      // Freelo API credentials (volitelné, pro vývoj)
      freeloEmail: process.env.NUXT_PUBLIC_FREELO_EMAIL,
      freeloApiKey: process.env.NUXT_PUBLIC_FREELO_API_KEY
    }
  },
  vite: {
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      exclude: ['srvx']
    }
  },
  ssr: true,
  nitro: {
    experimental: {
      wasm: true
    },
    // Zlepšit handling při restartu
    devServer: {
      watch: [],
      port: 3000
    },
    // Workaround pro srvx problém
    compatibilityDate: '2024-01-01',
    // Vypnout některé experimentální funkce, které mohou způsobovat problémy
    preset: 'node-server'
  },
  // Zlepšit handling při restartu dev serveru
  devServer: {
    port: 3000,
    host: 'localhost'
  },
  devtools: { enabled: true },
  colorMode: {
    classSuffix: "",
    preference: "light",
    fallback: "light"
  },
  typescript: { strict: true }
});
