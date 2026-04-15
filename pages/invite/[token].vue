<template>
  <div class="invite-page flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
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

        <div v-if="auth.isAuthenticated && inviteData.email && auth.user?.email && inviteData.email.toLowerCase() !== auth.user.email.toLowerCase()" class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
          Přihlášeni jste jako <strong>{{ auth.user.email }}</strong>, ale pozvánka byla odeslána na <strong>{{ inviteData.email }}</strong>. Pro přijetí pozvánky se odhlaste a přihlaste účtem {{ inviteData.email }}.
        </div>

        <div v-if="!auth.isAuthenticated" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            Pro přijetí pozvánky se přihlaste nebo si vytvořte účet s emailem <strong>{{ inviteData.email }}</strong>.
          </p>
          <UButton
            block
            size="lg"
            @click="showAuthModal = true"
          >
            Přihlásit se pro přijetí pozvánky
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <UButton
            v-if="!autoAccepting"
            block
            size="lg"
            @click="acceptInvite"
            :loading="isAccepting"
            :disabled="!!(inviteData.email && auth.user?.email && inviteData.email.toLowerCase() !== auth.user.email.toLowerCase())"
          >
            {{ isAccepting ? 'Připojuji se...' : 'Připojit se k projektu' }}
          </UButton>
          <div v-else class="text-center py-4">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p class="text-sm text-gray-500">Přijímám pozvánku...</p>
          </div>
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
const autoAccepting = ref(false);
const showAuthModal = ref(false);
const toast = useToast();

// Dekódovat pozvánkový token (nový formát: payloadB64.hmacSig nebo starý plain base64)
function decodeInviteToken(token: string): any | null {
  try {
    // Nový formát: payload.sig – odstraň podpis, dekóduj pouze payload
    const dotIdx = token.lastIndexOf('.');
    const payloadPart = dotIdx !== -1 ? token.slice(0, dotIdx) : token;

    const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

    const json = atob(base64);
    const data = JSON.parse(json);

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
    toast.add({
      title: 'Nesprávný účet',
      description: `Pro přijetí pozvánky se přihlaste účtem ${inviteData.value.email}.`,
      color: 'amber'
    });
    return;
  }

  if (!inviteData.value.projectId) {
    error.value = 'Tato pozvánka je neplatná (chybí projekt). Použijte prosím nový odkaz z emailu.';
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
    const success = await teamMembers.acceptProjectInviteViaApi(
      inviteData.value.projectId,
      inviteData.value.email,
      inviteData.value.role || 'member',
      token.value  // předat raw token pro HMAC ověření na serveru
    );

    if (success) {
      await firestoreProjects.startListening();
      router.push('/projects/' + inviteData.value.projectId);
    } else {
      toast.add({
        title: 'Nepodařilo se připojit',
        description: 'Pozvánka již byla přijata, vypršela nebo nemáte oprávnění.',
        color: 'red'
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Chyba při připojování',
      description: e.message || 'Neznámá chyba',
      color: 'red'
    });
  } finally {
    isAccepting.value = false;
  }
}

// Po přihlášení automaticky přijmout pozvánku (pokud email souhlasí)
watch(() => auth.isAuthenticated, async (isAuth) => {
  if (!isAuth || !inviteData.value) return;

  showAuthModal.value = false;

  const inviteEmail = inviteData.value.email?.toLowerCase();
  const userEmail = auth.user.value?.email?.toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) return;

  // Krátké zpoždění – nechat se ustálit Firebase auth
  autoAccepting.value = true;
  await new Promise((r) => setTimeout(r, 800));

  try {
    toast.add({
      title: 'Byli jste pozváni do projektu',
      description: 'Přijímám pozvánku...',
      color: 'blue'
    });
    await acceptInvite();
  } finally {
    autoAccepting.value = false;
  }
});
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
}
</style>

