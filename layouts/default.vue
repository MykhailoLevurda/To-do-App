<script setup lang="ts">
const auth = useAuth();
const showAuthModal = ref(false);

const handleSignOut = async () => {
  await auth.signOut();
};
</script>

<template>
  <UApp>
    <AuthModal v-model="showAuthModal" />
    <div class="min-h-screen grid grid-cols-[260px_1fr]">
      <aside class="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 flex flex-col justify-between">
      <div>
        <NuxtLink to="/" class="block mb-6">
          <h1 class="font-bold text-lg hover:text-primary transition-colors cursor-pointer">
            📊 Freelo Dashboard
          </h1>
        </NuxtLink>
        <nav class="flex flex-col gap-2">
          <NuxtLink 
            to="/" 
            class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            📁 Projekty
          </NuxtLink>
          <button class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
            📅 Kalendář (brzy)
          </button>
          <button class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
            📝 Poznámky (brzy)
          </button>
          <button class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
            👥 Uživatelé (brzy)
          </button>
          <button class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
            💬 Diskuze (brzy)
          </button>
          <button class="text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 opacity-50 cursor-not-allowed" disabled>
            📈 Aktivity (brzy)
          </button>
        </nav>
      </div>
    </aside>
      <main class="flex flex-col min-h-screen">
        <header class="flex items-center justify-between px-6 py-3 border-b">
          <div class="font-medium">
            <span v-if="auth.user.value">
              Vítejte, {{ auth.user.value.displayName || auth.user.value.email }}
            </span>
            <span v-else>Welcome</span>
          </div>
          <div class="flex items-center gap-2">
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
