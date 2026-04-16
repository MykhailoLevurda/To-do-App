<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Nastavení uživatele</h3>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            @click="closeModal"
          />
        </div>
      </template>

      <div class="space-y-6">
        <!-- User Info Section -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Informace o účtu</h4>
          
          <!-- Email (read-only) -->
          <UFormGroup label="Email" name="email">
            <UInput
              :model-value="auth.user.value?.email || ''"
              disabled
              icon="i-heroicons-envelope"
            />
            <template #description>
              <span class="text-xs text-gray-500">Email nelze změnit</span>
            </template>
          </UFormGroup>

          <!-- Display Name (editable) -->
          <UFormGroup label="Jméno / Přezdívka" name="displayName">
            <UInput
              v-model="profileForm.displayName"
              placeholder="Vaše jméno"
              icon="i-heroicons-user"
            />
          </UFormGroup>

          <UButton
            @click="updateProfile"
            :loading="updatingProfile"
            block
          >
            Uložit změny
          </UButton>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-800"></div>

        <!-- Password Change Section -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Změna hesla</h4>
          
          <UForm :state="passwordForm" @submit="changePassword" class="space-y-4">
            <!-- Current Password -->
            <UFormGroup
              label="Současné heslo"
              name="currentPassword"
              :error="passwordErrors.currentPassword"
            >
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="Zadejte současné heslo"
                icon="i-heroicons-lock-closed"
                :disabled="changingPassword"
              />
            </UFormGroup>

            <!-- New Password -->
            <UFormGroup
              label="Nové heslo"
              name="newPassword"
              :error="passwordErrors.newPassword"
            >
              <UInput
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="Zadejte nové heslo"
                icon="i-heroicons-lock-closed"
                :disabled="changingPassword"
              />
            </UFormGroup>

            <!-- Confirm New Password -->
            <UFormGroup
              label="Potvrzení nového hesla"
              name="confirmPassword"
              :error="passwordErrors.confirmPassword"
            >
              <UInput
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="Zadejte nové heslo znovu"
                icon="i-heroicons-lock-closed"
                :disabled="changingPassword"
              />
            </UFormGroup>

            <UButton
              type="submit"
              color="primary"
              :loading="changingPassword"
              block
            >
              Změnit heslo
            </UButton>
          </UForm>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const auth = useAuth();
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const profileForm = ref({
  displayName: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const passwordErrors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const updatingProfile = ref(false);
const changingPassword = ref(false);

// Initialize form with current user data
watch(() => auth.user.value, (user) => {
  if (user) {
    profileForm.value.displayName = user.displayName || '';
  }
}, { immediate: true });

// Reset password form when modal opens/closes
watch(isOpen, (open) => {
  if (open) {
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    passwordErrors.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }
});

const closeModal = () => {
  isOpen.value = false;
};

const validatePasswordForm = (): boolean => {
  passwordErrors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  let isValid = true;

  if (!passwordForm.value.currentPassword) {
    passwordErrors.value.currentPassword = 'Současné heslo je povinné';
    isValid = false;
  }

  if (!passwordForm.value.newPassword) {
    passwordErrors.value.newPassword = 'Nové heslo je povinné';
    isValid = false;
  } else if (passwordForm.value.newPassword.length < 6) {
    passwordErrors.value.newPassword = 'Heslo musí mít alespoň 6 znaků';
    isValid = false;
  }

  if (!passwordForm.value.confirmPassword) {
    passwordErrors.value.confirmPassword = 'Potvrzení hesla je povinné';
    isValid = false;
  } else if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordErrors.value.confirmPassword = 'Hesla se neshodují';
    isValid = false;
  }

  if (passwordForm.value.currentPassword === passwordForm.value.newPassword) {
    passwordErrors.value.newPassword = 'Nové heslo musí být jiné než současné heslo';
    isValid = false;
  }

  return isValid;
};

const updateProfile = async () => {
  if (!auth.user.value) return;

  updatingProfile.value = true;
  try {
    await auth.updateDisplayName(profileForm.value.displayName);
    useToast().add({ title: 'Profil byl úspěšně aktualizován', color: 'green' });
  } catch (error: any) {
    console.error('[UserProfile] Error updating profile:', error);
    useToast().add({ title: error.message || 'Chyba při aktualizaci profilu', color: 'red' });
  } finally {
    updatingProfile.value = false;
  }
};

const changePassword = async () => {
  if (!validatePasswordForm()) {
    return;
  }

  changingPassword.value = true;
  try {
    await auth.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    );
    
    // Reset form on success
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    passwordErrors.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    useToast().add({ title: 'Heslo bylo úspěšně změněno', color: 'green' });
  } catch (error: any) {
    console.error('[UserProfile] Error changing password:', error);
    if (error.code === 'auth/wrong-password') {
      passwordErrors.value.currentPassword = 'Nesprávné současné heslo';
    } else if (error.code === 'auth/weak-password') {
      passwordErrors.value.newPassword = 'Heslo je příliš slabé';
    } else {
      useToast().add({ title: error.message || 'Chyba při změně hesla', color: 'red' });
    }
  } finally {
    changingPassword.value = false;
  }
};
</script>

