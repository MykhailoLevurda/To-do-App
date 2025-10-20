// Use Nuxt's built-in $fetch instead of axios to avoid FormData SSR issues
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  
  // Create a simple HTTP client using $fetch
  const httpClient = {
    async get(url: string) {
      return await $fetch(url, { baseURL: config.public.apiBase });
    },
    async post(url: string, data?: any) {
      return await $fetch(url, { 
        method: 'POST', 
        body: data,
        baseURL: config.public.apiBase 
      });
    },
    async put(url: string, data?: any) {
      return await $fetch(url, { 
        method: 'PUT', 
        body: data,
        baseURL: config.public.apiBase 
      });
    },
    async delete(url: string) {
      return await $fetch(url, { 
        method: 'DELETE',
        baseURL: config.public.apiBase 
      });
    }
  };

  nuxtApp.provide("axios", httpClient);
});



