<template>
  <div class="users-page">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Uživatelé</h1>
          <p class="text-gray-500 mt-1">Správa uživatelů týmu</p>
        </div>
        <UButton
          icon="i-heroicons-plus"
          size="lg"
          @click="showAddMemberModal = true"
        >
          Přidat člena
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p class="text-gray-500">Načítám uživatele...</p>
      </div>
    </div>

    <!-- Users List -->
    <div v-else class="space-y-3">
      <UCard
        v-for="user in usersList"
        :key="user.id || user.email"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-4 p-4">
          <!-- Avatar -->
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
            :style="{ backgroundColor: getMemberColor(user.email || user.id) }"
          >
            {{ getInitials(user.displayName || user.email || '?') }}
          </div>

          <!-- User Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-lg font-semibold truncate">
                {{ user.displayName || user.email || 'Neznámý uživatel' }}
              </h3>
              <UBadge 
                v-if="user.isPending" 
                color="yellow" 
                variant="soft"
                size="xs"
              >
                Pozvánka odeslána
              </UBadge>
              <UBadge 
                v-else-if="user.isOnline" 
                color="green" 
                variant="soft"
                size="xs"
              >
                Online
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 truncate">{{ user.email }}</p>
            <p v-if="user.lastSeen" class="text-xs text-gray-400 mt-1">
              Naposledy viděn: {{ formatDate(user.lastSeen) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-trash"
              size="sm"
              color="red"
              variant="ghost"
              @click="removeUser(user)"
            />
          </div>
        </div>
      </UCard>

      <!-- Empty State -->
      <div 
        v-if="usersList.length === 0"
        class="text-center py-20"
      >
        <UsersIcon class="w-16 h-16 mx-auto mb-4 text-gray-700 dark:text-gray-300" />
        <h3 class="text-xl font-semibold mb-2">Žádní uživatelé</h3>
        <p class="text-gray-500 mb-6">Začněte přidáním prvního člena týmu</p>
        <UButton
          icon="i-heroicons-plus"
          @click="showAddMemberModal = true"
        >
          Přidat prvního člena
        </UButton>
      </div>
    </div>

    <!-- Add Member Modal -->
    <UModal v-model="showAddMemberModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Přidat člena týmu</h3>
        </template>

        <UForm id="addMemberForm" :state="memberForm" @submit="addMember" class="space-y-4">
          <UFormGroup label="Email" required>
            <UInput
              v-model="memberForm.email"
              type="email"
              placeholder="uzivatel@example.com"
              autofocus
            />
            <template #description>
              Zadáme email uživatele a pošleme mu pozvánku s odkazem pro připojení k týmu
            </template>
          </UFormGroup>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="closeModal">
              Zrušit
            </UButton>
            <UButton
              form="addMemberForm"
              type="submit"
              :disabled="!memberForm.email || !isValidEmail(memberForm.email) || isSending"
              :loading="isSending"
            >
              {{ isSending ? 'Odesílám pozvánku...' : 'Odeslat pozvánku' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon } from '@heroicons/vue/24/solid'

const auth = useAuth();
const firestoreProjects = useFirestoreProjects();

const isLoading = ref(true);
const showAddMemberModal = ref(false);
const isSending = ref(false);

const memberForm = ref({
  email: ''
});

// Načíst všechny uživatele ze všech projektů
const usersList = ref<any[]>([]);

function getInitials(text: string): string {
  if (!text) return '?';
  const parts = text.split(/[@\s]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.substring(0, 2).toUpperCase();
}

function getMemberColor(email: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#84cc16', '#f59e0b', '#10b981', '#14b8a6'
  ];
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function addMember() {
  if (!memberForm.value.email || !isValidEmail(memberForm.value.email)) {
    return;
  }

  if (!auth.user.value) {
    alert('Musíte být přihlášeni');
    return;
  }

  isSending.value = true;

  try {
    // Zavolej server endpoint pro odeslání pozvánky
    const response = await $fetch('/api/invite', {
      method: 'POST',
      body: {
        email: memberForm.value.email,
        invitedBy: auth.user.value.uid,
        invitedByName: auth.user.value.displayName || auth.user.value.email
      }
    }).catch((error: any) => {
      console.error('[Users] Fetch error:', error);
      throw error;
    });

    if (response.success) {
      // Přidej uživatele do seznamu jako pending
      usersList.value.push({
        id: `pending_${memberForm.value.email}`,
        email: memberForm.value.email,
        displayName: memberForm.value.email.split('@')[0],
        isPending: true,
        addedAt: new Date()
      });

      closeModal();
      
      // Zobrazit success message
      alert('Pozvánka byla úspěšně odeslána na email: ' + memberForm.value.email);
    } else {
      alert('Chyba při odesílání pozvánky: ' + (response.error || 'Neznámá chyba'));
    }
  } catch (error: any) {
    console.error('[Users] Error sending invitation:', error);
    alert('Chyba při odesílání pozvánky: ' + (error.message || 'Zkuste to prosím znovu'));
  } finally {
    isSending.value = false;
  }
}

function closeModal() {
  showAddMemberModal.value = false;
  memberForm.value.email = '';
}

async function removeUser(user: any) {
  if (!confirm(`Opravdu chcete odebrat ${user.email}?`)) {
    return;
  }

  // TODO: Implementovat odebrání uživatele
  usersList.value = usersList.value.filter(u => u.email !== user.email);
}

// Načíst uživatele ze všech projektů
async function loadUsers() {
  isLoading.value = true;
  
  try {
    const projectsStore = useProjectsStore();
    const allProjects = projectsStore.projects;
    
    const usersMap = new Map<string, any>();
    
    // Shromáždit všechny uživatele ze všech projektů
    allProjects.forEach(project => {
      const members = project.teamMembers || [];
      members.forEach((member: any) => {
        if (!usersMap.has(member.email)) {
          usersMap.set(member.email, {
            id: member.userId,
            email: member.email,
            displayName: member.displayName,
            isPending: member.userId?.startsWith('pending_') || false,
            addedAt: member.addedAt,
            lastSeen: member.lastSeen
          });
        }
      });
    });
    
    usersList.value = Array.from(usersMap.values());
  } catch (error) {
    console.error('[Users] Error loading users:', error);
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle
onMounted(async () => {
  if (auth.isAuthenticated && auth.user.value) {
    firestoreProjects.startListening();
    
    // Počkat na načtení projektů (Firestore listener potřebuje čas)
    await nextTick();
    setTimeout(async () => {
      await loadUsers();
    }, 1500);
  }
});

// Watch for projects changes
const projectsStore = useProjectsStore();
watch(() => projectsStore.projects, async () => {
  if (auth.isAuthenticated) {
    await loadUsers();
  }
}, { deep: true });
</script>

<style scoped>
.users-page {
  min-height: 100vh;
}
</style>

