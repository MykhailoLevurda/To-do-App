<script setup lang="ts">
import {
  FolderIcon,
  CalendarIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  PencilSquareIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'

const auth = useAuth()
const projectsStore = useProjectsStore()
const firestoreProjects = useFirestoreProjects()
const route = useRoute()

// Načítat projekty globálně pro celou aplikaci (sidebar, stránka Uživatelé, atd.) – jen na klientu
onMounted(() => {
  if (auth.isAuthenticated && auth.user.value) {
    firestoreProjects.startListening()
  }
})
watch(() => auth.isAuthenticated, (isAuth) => {
  if (import.meta.client) {
    if (isAuth && auth.user.value) {
      firestoreProjects.startListening()
    } else {
      firestoreProjects.stopListening()
      projectsStore.clearProjects()
    }
  }
}, { immediate: false })
const showAuthModal = ref(false)
const showUserProfileModal = ref(false)

const handleSignOut = async () => {
  await auth.signOut()
}

// User menu dropdown items
const userMenuItems = computed(() => {
  if (!auth.user.value) return []
  
  return [
    [
      {
        label: 'Nastavení profilu',
        icon: 'i-heroicons-cog-6-tooth',
        click: () => {
          showUserProfileModal.value = true
        }
      }
    ],
    [
      {
        label: 'Odhlásit se',
        icon: 'i-heroicons-arrow-left-on-rectangle',
        click: handleSignOut,
        class: 'text-red-600 dark:text-red-400'
      }
    ]
  ]
})

// Check if project is active
const isProjectActive = (projectId: string) => {
  return route.params.id === projectId
}

// Zobrazit timer v headeru jen když je otevřený projekt (stránka /projects/:id)
const isProjectPage = computed(() => /^\/projects\/[^/]+$/.test(route.path))
// projectId z path (spolehlivé) – params.id může být někdy nedostupné v layoutu
const projectId = computed(() => {
  if (!isProjectPage.value) return ''
  const id = route.params.id
  if (id && typeof id === 'string') return id
  const m = route.path.match(/^\/projects\/([^/]+)/)
  return m ? m[1] : ''
})

const projectTime = useProjectTime()

// Celkový čas z Firestore (aktivita přihlášeného uživatele u tohoto projektu)
const storedTotalSeconds = ref(0)
// Běžící session – čas od posledního Spustit
const currentSessionSeconds = ref(0)
const timerRunning = ref(false)
const timerLoading = ref(false) // načítání uloženého času / ukládání
let timerInterval: ReturnType<typeof setInterval> | null = null

// Zobrazený čas = uložený celkem + aktuální session
const displayTotalSeconds = computed(() => storedTotalSeconds.value + currentSessionSeconds.value)

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Načíst uložený celkový čas při otevření projektu
watch([projectId, () => auth.user.value?.uid], async ([pid, uid]) => {
  if (!pid || !uid) {
    storedTotalSeconds.value = 0
    return
  }
  timerLoading.value = true
  try {
    storedTotalSeconds.value = await projectTime.getTotalSeconds(pid as string)
  } finally {
    timerLoading.value = false
  }
}, { immediate: true })

async function toggleTimer() {
  if (timerRunning.value) {
    timerRunning.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    const toSave = currentSessionSeconds.value
    const pid = projectId.value
    if (toSave > 0 && pid) {
      timerLoading.value = true
      try {
        const ok = await projectTime.addTime(pid, toSave)
        if (ok) storedTotalSeconds.value += toSave
        else useToast().add({ title: 'Čas se nepodařilo uložit', color: 'red' })
      } finally {
        timerLoading.value = false
      }
    }
    currentSessionSeconds.value = 0
  } else {
    timerRunning.value = true
    currentSessionSeconds.value = 0
    timerInterval = setInterval(() => {
      currentSessionSeconds.value += 1
    }, 1000)
  }
}

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <UApp>
    <AuthModal v-model="showAuthModal" />
    <UserProfileModal v-model="showUserProfileModal" />
    <div class="min-h-screen grid grid-cols-[260px_1fr]">
      <aside class="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 flex flex-col justify-between">
      <div>
        <NuxtLink to="/" class="block mb-6">
          <h1 class="font-bold text-lg hover:text-primary transition-colors cursor-pointer">
            Scrum Board
          </h1>
        </NuxtLink>
          <nav v-if="auth.user.value" class="flex flex-col gap-2">
            <NuxtLink 
              to="/" 
              class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderIcon class="w-5 h-5" />
              Projekty
            </NuxtLink>

            <!-- Projects List -->
            <div v-if="projectsStore.activeProjects.length > 0" class="ml-2 mt-1 space-y-1 max-h-[400px] overflow-y-auto">
              <NuxtLink
                v-for="project in projectsStore.activeProjects"
                :key="project.id"
                :to="`/projects/${project.id}`"
                class="flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors"
                :class="[
                  isProjectActive(project.id)
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                ]"
              >
                <div 
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: project.color }"
                ></div>
                <span class="truncate">{{ project.name }}</span>
              </NuxtLink>
            </div>

            <NuxtLink
              to="/activity"
              class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              :class="route.path === '/activity' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-700 dark:text-gray-300'"
            >
              <ClockIcon class="w-5 h-5" />
              Aktivita
            </NuxtLink>

            <button class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
              <CalendarIcon class="w-5 h-5" />
              Kalendář (brzy)
            </button>

            <button class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
              <PencilSquareIcon class="w-5 h-5" />
              Poznámky (brzy)
            </button>

            <NuxtLink 
              to="/users" 
              class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <UsersIcon class="w-5 h-5" />
              Uživatelé
            </NuxtLink>

            <button class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
              <ChatBubbleLeftIcon class="w-5 h-5" />
              Diskuze (brzy)
            </button>

            <button class="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
              <ChartBarIcon class="w-5 h-5" />
              Aktivity (brzy)
            </button>
          </nav>

      </div>
    </aside>
      <main class="flex flex-col min-h-screen">
        <header class="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 gap-4">
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <span v-if="auth.user.value" class="font-medium shrink-0">
              Vítejte, {{ auth.user.value.displayName || auth.user.value.email }}
            </span>
            <!-- Timer: jen na stránce projektu, jen pro přihlášeného uživatele – celkový čas u projektu -->
            <div v-if="isProjectPage && auth.user.value" class="flex items-center gap-2 shrink-0">
              <UButton
                :icon="timerRunning ? 'i-heroicons-stop' : 'i-heroicons-play'"
                :color="timerRunning ? 'red' : 'primary'"
                variant="soft"
                size="sm"
                :loading="timerLoading"
                :disabled="timerLoading"
                @click="toggleTimer"
              >
                {{ timerRunning ? 'Zastavit' : 'Spustit' }}
              </UButton>
              <span class="font-mono text-sm tabular-nums min-w-[4rem]" :title="'Celkový čas u tohoto projektu'">
                {{ formatTimer(displayTotalSeconds) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Color Mode Toggle -->
            <UButton
              :icon="$colorMode.preference === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
              variant="ghost"
              size="sm"
              @click="$colorMode.preference = $colorMode.preference === 'dark' ? 'light' : 'dark'"
              v-if="$colorMode"
              :title="$colorMode.preference === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'"
            />
            
            <!-- Auth Buttons -->
            <UButton
              v-if="!auth.user.value"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="showAuthModal = true"
            >
              Přihlásit se
            </UButton>
            
            <!-- User Profile Dropdown -->
            <UDropdown
              v-if="auth.user.value"
              :items="userMenuItems"
              :popper="{ placement: 'bottom-end' }"
            >
              <UButton
                icon="i-heroicons-user-circle"
                variant="ghost"
                size="sm"
                :title="auth.user.value.displayName || auth.user.value.email || 'Nastavení uživatele'"
              />
            </UDropdown>
          </div>
        </header>
        <div class="p-6">
          <slot />
        </div>
      </main>
    </div>
  </UApp>
  
</template>
