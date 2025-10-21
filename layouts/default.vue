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
      <aside class="border-r bg-gray-50 dark:bg-gray-900 p-4">
        <div class="font-semibold text-xl">{{ $config.public.appName }}</div>
        <UVerticalNavigation :links="[{ label: 'Dashboard', to: '/' }]" />
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
