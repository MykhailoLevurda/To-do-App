<template>
  <div class="team-members-row">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="text-sm font-medium text-gray-700 mr-2">Tým:</div>
      
      <!-- Seznam členů týmu -->
      <div
        v-for="member in teamMembersList"
        :key="member.email"
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
      >
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          :style="{ backgroundColor: getMemberColor(member.email) }"
        >
          {{ getInitials(member.displayName || member.email) }}
        </div>
        <span class="text-sm text-gray-700">{{ member.displayName || member.email }}</span>
        <UButton
          v-if="canRemoveMember"
          icon="i-heroicons-x-mark"
          size="xs"
          variant="ghost"
          color="gray"
          @click="removeMember(member.email)"
        />
      </div>

      <!-- Přidat člena -->
      <UButton
        v-if="canAddMember"
        icon="i-heroicons-plus"
        size="sm"
        variant="soft"
        @click="showAddMemberModal = true"
      >
        Přidat člena
      </UButton>
    </div>

    <!-- Modal pro přidání člena -->
    <UModal v-model="showAddMemberModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Přidat člena do týmu</h3>
        </template>

        <UForm id="addMemberForm" :state="memberForm" @submit="addMember" class="space-y-4">
          <UFormGroup label="Email" required>
            <UInput
              v-model="memberForm.email"
              type="email"
              placeholder="uzivatel@example.com"
              autofocus
            />
            <template #description>
              Zadejte email uživatele, kterého chcete přidat do týmu
            </template>
          </UFormGroup>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showAddMemberModal = false">
              Zrušit
            </UButton>
            <UButton
              form="addMemberForm"
              type="submit"
              :disabled="!memberForm.email || !isValidEmail(memberForm.email)"
            >
              Přidat
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TeamMember, Project } from '~/types';

const props = defineProps<{
  project: Project;
  canAddMember?: boolean;
  canRemoveMember?: boolean;
}>();

const emit = defineEmits<{
  memberAdded: [email: string];
  memberRemoved: [email: string];
}>();

const auth = useAuth();
const firestoreProjects = useFirestoreProjects();
const teamMembers = useTeamMembers();

const showAddMemberModal = ref(false);
const memberForm = ref({
  email: ''
});

const teamMembersList = computed(() => {
  return props.project.teamMembers || [];
});

const canAddMember = computed(() => {
  if (props.canAddMember !== undefined) return props.canAddMember;
  // Vlastník projektu nebo člen týmu může přidávat
  return props.project.createdBy === auth.user.value?.uid;
});

const canRemoveMember = computed(() => {
  if (props.canRemoveMember !== undefined) return props.canRemoveMember;
  // Vlastník projektu může odebírat
  return props.project.createdBy === auth.user.value?.uid;
});

function getInitials(text: string): string {
  if (!text) return '?';
  const parts = text.split(/[@\s]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.substring(0, 2).toUpperCase();
}

function getMemberColor(email: string): string {
  // Generuj konzistentní barvu podle emailu
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#84cc16', '#f59e0b', '#10b981', '#14b8a6'
  ];
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function addMember() {
  if (!memberForm.value.email || !isValidEmail(memberForm.value.email)) {
    return;
  }

  const success = await teamMembers.addTeamMember(props.project.id, memberForm.value.email);
  
  if (success) {
    emit('memberAdded', memberForm.value.email);
    memberForm.value.email = '';
    showAddMemberModal.value = false;
    
    // Refresh project data
    await firestoreProjects.startListening();
  } else {
    alert('Nepodařilo se přidat člena do týmu');
  }
}

async function removeMember(email: string) {
  if (!confirm(`Opravdu chcete odebrat ${email} z týmu?`)) {
    return;
  }

  const success = await teamMembers.removeTeamMember(props.project.id, email);
  
  if (success) {
    emit('memberRemoved', email);
    // Refresh project data
    await firestoreProjects.startListening();
  } else {
    alert('Nepodařilo se odebrat člena z týmu');
  }
}
</script>

<style scoped>
.team-members-row {
  padding: 0.75rem 0;
}
</style>

