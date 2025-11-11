<script setup lang="ts">
import {
  FolderIcon,
  CalendarIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'

const auth = useAuth()
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
            Freelo Dashboard
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
        <header class="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800">
          <div class="font-medium">
            <span v-if="auth.user.value">
              Vítejte, {{ auth.user.value.displayName || auth.user.value.email }}
            </span>
            <span v-else>Welcome</span>
          </div>
          <div class="flex items-center gap-2">
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
