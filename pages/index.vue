<script setup lang="ts">
const auth = useAuth();

// Force remount Dashboard when user changes
const dashboardKey = ref('initial');

watch(() => auth.user.value?.uid, (newUid) => {
  console.log('[Index Page] User UID changed:', newUid);
  dashboardKey.value = newUid || `no-user-${Date.now()}`;
}, { immediate: true });

watch(() => auth.isAuthenticated, (isAuth) => {
  console.log('[Index Page] Auth status changed:', isAuth);
});
</script>
<template>
  <div v-if="!auth.loading.value">
    <Dashboard 
      v-if="auth.isAuthenticated" 
      :key="dashboardKey"
    />
    <div v-else class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="text-6xl mb-4">🔐</div>
        <h2 class="text-2xl font-bold mb-2">Vítejte v Freelo Dashboard</h2>
        <p class="text-gray-500 mb-6">Přihlaste se pro přístup k vašim projektům</p>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p class="text-gray-500">Načítám...</p>
    </div>
  </div>
</template>
