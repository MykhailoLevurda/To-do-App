<template>
  <div class="invite-page flex items-center justify-center min-h-screen bg-gray-50">
    <UCard class="max-w-md w-full">
      <template #header>
        <h2 class="text-2xl font-bold text-center">Pozvánka do týmu</h2>
      </template>

      <div v-if="isLoading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p class="text-gray-500">Ověřuji pozvánku...</p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <div class="text-6xl mb-4">❌</div>
        <h3 class="text-xl font-semibold mb-2 text-red-600">Chyba</h3>
        <p class="text-gray-500">{{ error }}</p>
        <UButton class="mt-4" @click="$router.push('/')">
          Zpět na hlavní stránku
        </UButton>
      </div>

        <div v-else-if="inviteData" class="space-y-4">
        <div class="text-center py-4">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-xl font-semibold mb-2">Pozvánka do projektu</h3>
          <p class="text-gray-500">
            Byli jste pozváni na email: <strong>{{ inviteData.email }}</strong>
            <template v-if="inviteData.projectId"> do projektu</template>
          </p>
        </div>

        <div v-if="auth.isAuthenticated && inviteData.email && auth.user?.email && inviteData.email.toLowerCase() !== auth.user.email.toLowerCase()" class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Přihlášeni jste jako <strong>{{ auth.user.email }}</strong>, ale pozvánka byla odeslána na <strong>{{ inviteData.email }}</strong>. Pro přijetí pozvánky se přihlaste účtem s emailem {{ inviteData.email }}.
        </div>

        <div v-if="!auth.isAuthenticated" class="space-y-4">
          <p class="text-sm text-gray-600 text-center">
            Pro připojení k týmu se prosím přihlaste nebo vytvořte účet.
          </p>
          <UButton
            block
            size="lg"
            @click="showAuthModal = true"
          >
            Přihlásit se / Registrovat
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <UButton
            block
            size="lg"
            @click="acceptInvite"
            :loading="isAccepting"
            :disabled="!!(inviteData.email && auth.user?.email && inviteData.email.toLowerCase() !== auth.user.email.toLowerCase())"
          >
            {{ isAccepting ? 'Připojuji se...' : 'Připojit se k projektu' }}
          </UButton>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">Načítám pozvánku...</p>
      </div>
    </UCard>

    <AuthModal v-model="showAuthModal" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const auth = useAuth();

const token = computed(() => route.params.token as string);

const isLoading = ref(true);
const error = ref<string | null>(null);
const inviteData = ref<any>(null);
const isAccepting = ref(false);
const showAuthModal = ref(false);

// Dekódovat pozvánkový token
function decodeInviteToken(token: string): any | null {
  try {
    // Rekonstruovat base64 (vrátit nahradené znaky)
    const padded = token + '='.repeat((4 - (token.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    
    // Použít atob pro dekódování base64 v prohlížeči
    const json = atob(base64);
    const data = JSON.parse(json);
    
    // Kontrola expirace
    if (data.expiresAt && Date.now() > data.expiresAt) {
      return null; // Pozvánka vypršela
    }
    
    return data;
  } catch (e) {
    console.error('[Invite] Token decode error:', e);
    return null;
  }
}

// Načíst pozvánku
onMounted(async () => {
  isLoading.value = true;
  
  try {
    const decoded = decodeInviteToken(token.value);
    
    if (!decoded) {
      error.value = 'Pozvánka je neplatná nebo vypršela';
      isLoading.value = false;
      return;
    }
    
    inviteData.value = decoded;
  } catch (e: any) {
    error.value = 'Chyba při načítání pozvánky: ' + e.message;
  } finally {
    isLoading.value = false;
  }
});

async function acceptInvite() {
  if (!auth.user.value || !inviteData.value) {
    return;
  }

  const inviteEmail = inviteData.value.email?.toLowerCase();
  const userEmail = auth.user.value.email?.toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    alert('Pro přijetí pozvánky se přihlaste účtem s emailem ' + inviteData.value.email);
    return;
  }

  if (!inviteData.value.projectId) {
    alert('Tato pozvánka je neplatná (chybí projekt). Použijte prosím nový odkaz z emailu.');
    return;
  }

  isAccepting.value = true;

  try {
    const firestoreProjects = useFirestoreProjects();
    await firestoreProjects.startListening();
    const projectsStore = useProjectsStore();
    const project = projectsStore.projects.find((p) => p.id === inviteData.value.projectId);
    if (project?.memberIds?.includes(auth.user.value.uid)) {
      router.push('/projects/' + inviteData.value.projectId);
      return;
    }

    const teamMembers = useTeamMembers();
    const success = await teamMembers.acceptProjectInvite(
      inviteData.value.projectId,
      inviteData.value.email,
      inviteData.value.role || 'member'
    );

    if (success) {
      await firestoreProjects.startListening();
      router.push('/projects/' + inviteData.value.projectId);
    } else {
      alert('Nepodařilo se připojit k projektu. Možná již byla pozvánka přijata nebo vypršela.');
    }
  } catch (e: any) {
    alert('Chyba při připojování: ' + e.message);
  } finally {
    isAccepting.value = false;
  }
}

// Watch pro změnu auth stavu
watch(() => auth.isAuthenticated, (isAuth) => {
  if (isAuth && inviteData.value) {
    // Uživatel se přihlásil, můžeme přijmout pozvánku
    showAuthModal.value = false;
  }
});
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
}
</style>

