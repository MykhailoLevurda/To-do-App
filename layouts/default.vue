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
            <!-- User Profile Button -->
            <UButton
              v-if="auth.user.value"
              icon="i-heroicons-user-circle"
              variant="ghost"
              size="sm"
              @click="showUserProfileModal = true"
              :title="auth.user.value.displayName || auth.user.value.email || 'Nastavení uživatele'"
            />
            
            <!-- Color Mode Toggle -->
            <UButton
              icon="i-heroicons-sun"
              variant="ghost"
              size="sm"
              :color="$colorMode.preference === 'dark' ? 'gray' : 'primary'"
              @click="$colorMode.preference = 'light'"
              v-if="$colorMode"
            />
            <UButton
              icon="i-heroicons-moon"
              variant="ghost"
              size="sm"
              :color="$colorMode.preference === 'dark' ? 'primary' : 'gray'"
              @click="$colorMode.preference = 'dark'"
              v-if="$colorMode"
            />
            
            <!-- Auth Buttons -->
            <UButton
              v-if="!auth.user.value"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="showAuthModal = true"
            >
              Přihlásit se
            </UButton>
            <UButton
              v-else
              icon="i-heroicons-arrow-left-on-rectangle"
              color="red"
              variant="soft"
              @click="handleSignOut"
            >
              Odhlásit se
            </UButton>
          </div>
        </header>
        <div class="p-6">
          <slot />
        </div>
      </main>
    </div>
  </UApp>
  
</template>
