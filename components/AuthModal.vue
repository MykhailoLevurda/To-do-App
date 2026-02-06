<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Přihlásit se
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            @click="isOpen = false"
          />
        </div>
      </template>

      <div class="space-y-4">
        <UAlert
          color="blue"
          variant="soft"
          title="Přihlášení přes Firebase"
          description="Přihlaste se emailem a heslem nebo pomocí Google účtu."
        />

        <!-- Tab: Přihlášení / Registrace -->
        <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <UButton
            :variant="mode === 'signin' ? 'solid' : 'ghost'"
            size="sm"
            @click="mode = 'signin'"
          >
            Přihlásit se
          </UButton>
          <UButton
            :variant="mode === 'signup' ? 'solid' : 'ghost'"
            size="sm"
            @click="mode = 'signup'"
          >
            Registrovat
          </UButton>
        </div>

        <!-- Email/Password Form -->
        <UForm :state="form" @submit="handleSubmit" class="space-y-4">
          <UFormGroup
            label="Email"
            name="email"
            required
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="vas@email.com"
              icon="i-heroicons-envelope"
              required
            />
          </UFormGroup>

          <UFormGroup
            v-if="mode === 'signup'"
            label="Jméno (volitelné)"
            name="displayName"
          >
            <UInput
              v-model="form.displayName"
              placeholder="Vaše jméno"
              icon="i-heroicons-user"
            />
          </UFormGroup>

          <UFormGroup
            label="Heslo"
            name="password"
            required
            :description="mode === 'signup' ? 'Min. 6 znaků' : undefined"
          >
            <UInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              required
            />
          </UFormGroup>

          <UAlert
            v-if="authError"
            color="red"
            variant="soft"
            :title="authError"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
            @close="authError = null"
          />

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ mode === 'signin' ? 'Přihlásit se' : 'Registrovat' }}
          </UButton>
        </UForm>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-white dark:bg-gray-950 px-2 text-gray-500">nebo</span>
          </div>
        </div>

        <UButton
          block
          variant="outline"
          icon="i-simple-icons-google"
          :loading="loadingGoogle"
          @click="handleGoogleSignIn"
        >
          Pokračovat s Google
        </UButton>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>();
const auth = useAuth();

const mode = ref<'signin' | 'signup'>('signin');
const loading = ref(false);
const loadingGoogle = ref(false);
const authError = ref<string | null>(null);

const form = reactive({
  email: '',
  password: '',
  displayName: ''
});

const handleSubmit = async () => {
  authError.value = null;

  if (!form.email || !form.password) {
    authError.value = 'Vyplňte email a heslo';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    authError.value = 'Neplatný formát emailu';
    return;
  }

  if (form.password.length < 6) {
    authError.value = 'Heslo musí mít alespoň 6 znaků';
    return;
  }

  loading.value = true;

  try {
    if (mode.value === 'signin') {
      const user = await auth.signIn(form.email, form.password);
      if (user) {
        isOpen.value = false;
        resetForm();
      } else {
        authError.value = auth.error.value || 'Chyba při přihlášení';
      }
    } else {
      const user = await auth.signUp(form.email, form.password, form.displayName || undefined);
      if (user) {
        isOpen.value = false;
        resetForm();
      } else {
        authError.value = auth.error.value || 'Chyba při registraci';
      }
    }
  } finally {
    loading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  authError.value = null;
  loadingGoogle.value = true;
  try {
    const user = await auth.signInWithGoogle();
    if (user) {
      isOpen.value = false;
      resetForm();
    } else {
      authError.value = auth.error.value || 'Chyba při přihlášení přes Google';
    }
  } finally {
    loadingGoogle.value = false;
  }
};

const resetForm = () => {
  form.email = '';
  form.password = '';
  form.displayName = '';
  authError.value = null;
};

watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
</script>
