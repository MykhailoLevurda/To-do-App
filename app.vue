<script setup lang="ts">
const config = useRuntimeConfig()
useHead({ titleTemplate: (t?: string) => t ? `${t} · ${config.public.appName}` : config.public.appName })
</script>
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Komponenta pro zobrazení toastů (useToast()) – Nuxt UI v2 -->
  <UNotifications />
</template>
