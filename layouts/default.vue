<template>
  <UApp>
    <div class="min-h-screen grid grid-cols-[260px_1fr]">
      <aside class="border-r bg-gray-50 dark:bg-gray-900 p-4">
        <div class="font-semibold text-xl">{{ $config.public.appName }}</div>
        <UVerticalNavigation :links="[{ label: 'Dashboard', to: '/' }]" />
      </aside>
      <main class="flex flex-col min-h-screen">
        <header class="flex items-center justify-between px-6 py-3 border-b">
          <div class="font-medium">Welcome</div>
          <UColorModeButton />
        </header>
        <div class="p-6">
          <slot />
        </div>
      </main>
    </div>
  </UApp>
  
</template>
