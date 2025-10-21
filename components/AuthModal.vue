<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            {{ isSignUp ? 'Vytvořit účet' : 'Přihlásit se' }}
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            @click="isOpen = false"
          />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Google Sign In -->
        <UButton
          block
          icon="i-simple-icons-google"
          color="white"
          @click="handleGoogleSignIn"
          :loading="googleLoading"
        >
          {{ isSignUp ? 'Registrovat přes Google' : 'Přihlásit přes Google' }}
        </UButton>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">nebo</span>
          </div>
        </div>

        <!-- Email/Password Form -->
        <UForm :state="form" @submit="handleSubmit" class="space-y-4">
          <UFormGroup
            v-if="isSignUp"
            label="Jméno"
            name="displayName"
          >
            <UInput
              v-model="form.displayName"
              placeholder="Vaše jméno"
              icon="i-heroicons-user"
            />
          </UFormGroup>

          <UFormGroup
            label="Email"
            name="email"
            required
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              icon="i-heroicons-envelope"
              required
            />
          </UFormGroup>

          <UFormGroup
            label="Heslo"
            name="password"
            required
          >
            <UInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              required
            />
          </UFormGroup>

          <UFormGroup
            v-if="isSignUp"
            label="Potvrzení hesla"
            name="confirmPassword"
          >
            <UInput
              v-model="form.confirmPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
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
            {{ isSignUp ? 'Vytvořit účet' : 'Přihlásit se' }}
          </UButton>
        </UForm>

        <div class="text-center text-sm">
          <span class="text-gray-600 dark:text-gray-400">
            {{ isSignUp ? 'Už máte účet?' : 'Nemáte účet?' }}
          </span>
          <UButton
            variant="link"
            @click="toggleMode"
            class="ml-1"
          >
            {{ isSignUp ? 'Přihlásit se' : 'Vytvořit účet' }}
          </UButton>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>();
const auth = useAuth();

const isSignUp = ref(false);
const loading = ref(false);
const googleLoading = ref(false);
const authError = ref<string | null>(null);

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: ''
});

const toggleMode = () => {
  isSignUp.value = !isSignUp.value;
  authError.value = null;
  form.password = '';
  form.confirmPassword = '';
};

const handleSubmit = async () => {
  authError.value = null;

  if (isSignUp.value && form.password !== form.confirmPassword) {
    authError.value = 'Hesla se neshodují';
    return;
  }

  if (form.password.length < 6) {
    authError.value = 'Heslo musí mít alespoň 6 znaků';
    return;
  }

  loading.value = true;

  try {
    if (isSignUp.value) {
      const user = await auth.signUp(form.email, form.password, form.displayName);
      if (user) {
        isOpen.value = false;
        resetForm();
      } else {
        authError.value = auth.error.value;
      }
    } else {
      const user = await auth.signIn(form.email, form.password);
      if (user) {
        isOpen.value = false;
        resetForm();
      } else {
        authError.value = auth.error.value;
      }
    }
  } finally {
    loading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  googleLoading.value = true;
  authError.value = null;

  try {
    const user = await auth.signInWithGoogle();
    if (user) {
      isOpen.value = false;
      resetForm();
    } else {
      authError.value = auth.error.value;
    }
  } finally {
    googleLoading.value = false;
  }
};

const resetForm = () => {
  form.email = '';
  form.password = '';
  form.confirmPassword = '';
  form.displayName = '';
  authError.value = null;
};

watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
</script>
