<script setup lang="ts">
const auth = useAuth();
const showAuthModal = ref(false);

const dashboardKey = ref('initial');

watch(() => auth.user.value?.uid, (newUid) => {
  dashboardKey.value = newUid || `no-user-${Date.now()}`;
}, { immediate: true });

watch(() => auth.isAuthenticated, (isAuth) => {
  if (isAuth && showAuthModal.value) {
    showAuthModal.value = false;
  }
});

watch(() => auth.user.value, (newUser) => {
  if (newUser && showAuthModal.value) {
    showAuthModal.value = false;
  }
});
</script>
<template>
  <!-- Loading State -->
  <div v-if="auth.loading.value" class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p class="text-gray-500">Načítám...</p>
    </div>
  </div>

  <!-- Authenticated - Show Dashboard -->
  <template v-else-if="auth.isAuthenticated && auth.user.value">
    <Dashboard :key="dashboardKey" />
  </template>

  <!-- Not Authenticated - Show Login Message -->
  <div v-else class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-3">Musíte být přihlášeni</h2>
      <p class="text-base mb-6">
        Pro zobrazení Scrum Boardu se prosím přihlaste nebo zaregistrujte.
      </p>
      <UButton
        size="lg"
        color="green"
        @click="showAuthModal = true"
      >
        Přihlásit se
      </UButton>
    </div>
  </div>

  <AuthModal v-model="showAuthModal" />
</template>
