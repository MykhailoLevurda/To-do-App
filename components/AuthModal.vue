<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Přihlásit se do Freelo
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
          title="Přihlášení pomocí Freelo"
          description="Pro přihlášení použijte svůj Freelo email a API klíč. API klíč najdete v nastavení Freelo účtu."
        />

        <!-- Email/API Key Form -->
        <UForm :state="form" @submit="handleSubmit" class="space-y-4">
          <UFormGroup
            label="Freelo Email"
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
            label="API klíč"
            name="apiKey"
            required
            description="API klíč najdete v nastavení Freelo účtu"
          >
            <UInput
              v-model="form.apiKey"
              type="password"
              placeholder="Váš Freelo API klíč"
              icon="i-heroicons-key"
              required
            />
            <template #help>
              <UButton
                variant="link"
                size="xs"
                to="https://app.freelo.io/profil/nastaveni"
                target="_blank"
                external
              >
                Najít API klíč v nastavení →
              </UButton>
            </template>
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
            Přihlásit se
          </UButton>
        </UForm>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>();
const auth = useFreeloAuth();

const loading = ref(false);
const authError = ref<string | null>(null);

const form = reactive({
  email: '',
  apiKey: ''
});

const handleSubmit = async () => {
  authError.value = null;

  if (!form.email || !form.apiKey) {
    authError.value = 'Vyplňte email a API klíč';
    return;
  }

  // Validace emailu
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    authError.value = 'Neplatný formát emailu';
    return;
  }

  loading.value = true;

  try {
    const user = await auth.signIn(form.email, form.apiKey);
    if (user) {
      isOpen.value = false;
      resetForm();
    } else {
      authError.value = auth.error.value || 'Chyba při přihlášení';
    }
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.email = '';
  form.apiKey = '';
  authError.value = null;
};

watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
</script>
