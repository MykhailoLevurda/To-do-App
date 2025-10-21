import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@pinia/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/color-mode",
    "nuxt-vuefire"
  ],
  pinia: { autoImports: ["defineStore"] },
  vuefire: {
    auth: false, // Disable server-side auth to avoid firebase-admin dependency
    config: {
      apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID
    }
  },
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
