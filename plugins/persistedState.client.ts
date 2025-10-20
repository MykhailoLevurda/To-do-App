import { createPersistedState } from "pinia-plugin-persistedstate";

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia;
  // register only on client
  pinia.use(
    createPersistedState({
      storage: typeof window !== "undefined" ? window.localStorage : undefined
    })
  );
});



