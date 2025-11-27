<script setup lang="ts">
const auth = useFreeloAuth();
const showAuthModal = ref(false);

// Force remount Dashboard when user changes
const dashboardKey = ref('initial');

// Použijeme přímo auth.isAuthenticated pro lepší reaktivitu

watch(() => auth.user.value?.email, (newEmail) => {
  console.log('[Index Page] User email changed:', newEmail);
  dashboardKey.value = newEmail || `no-user-${Date.now()}`;
}, { immediate: true });

watch(() => auth.isAuthenticated, (isAuth) => {
  console.log('[Index Page] Auth status changed:', isAuth);
  
  // Automaticky zavřít modal po úspěšném přihlášení
  if (isAuth && showAuthModal.value) {
    console.log('[Index Page] User authenticated, closing auth modal');
    showAuthModal.value = false;
  }
});

// Watch pro user změny - také zavřít modal
watch(() => auth.user.value, (newUser) => {
  if (newUser && showAuthModal.value) {
    console.log('[Index Page] User logged in, closing auth modal');
    showAuthModal.value = false;
  }
});

// Debug on mount
onMounted(() => {
  console.log('[Index Page] Mounted:', {
    loading: auth.loading.value,
    user: auth.user.value,
    isAuthenticated: auth.isAuthenticated
  });
  
  // Zkontrolovat, zda je uživatel přihlášen
  if (auth.isAuthenticated) {
    console.log('[Index Page] User is authenticated:', auth.user.value?.email);
  } else {
    console.log('[Index Page] User is not authenticated');
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
    <Dashboard 
      :key="dashboardKey"
    />
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

  <!-- Auth Modal -->
  <AuthModal v-model="showAuthModal" />
</template>
