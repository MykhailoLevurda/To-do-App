<template>
  <div class="team-members-row">
    <div class="flex items-center gap-2 flex-wrap">
      <div class="text-sm font-medium text-gray-700 mr-2">Tým:</div>
      
      <!-- Vlastník (createdBy) – není v teamMembers -->
      <div
        v-if="ownerDisplay"
        class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full"
      >
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-amber-500"
        >
          {{ getInitials(ownerDisplay) }}
        </div>
        <span class="text-sm text-gray-700">{{ ownerDisplay }}</span>
        <span class="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Vlastník</span>
      </div>

      <!-- Seznam členů týmu (Admin / Člen) -->
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
        <span class="text-xs font-medium px-1.5 py-0.5 rounded"
          :class="member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'"
        >
          {{ member.role === 'admin' ? 'Admin' : 'Člen' }}
        </span>
        <USelectMenu
          v-if="canChangeRoleFor(member)"
          :items="roleOptions"
          :model-value="member.role === 'admin' ? 'admin' : 'member'"
          value-attribute="value"
          @update:model-value="(v: string) => changeRole(member, v as 'admin'|'member')"
        >
          <UButton icon="i-heroicons-cog-6-tooth" size="xs" variant="ghost" color="gray" />
        </USelectMenu>
        <UButton
          v-if="canRemoveMemberFor(member)"
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
          <UFormGroup label="Role">
            <USelectMenu
              v-model="memberForm.role"
              :items="roleOptions"
              value-attribute="value"
            />
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
const teamMembers = useTeamMembers();
const firestoreProjects = useFirestoreProjects();
const { canInviteMembers, canRemoveMembers, canChangeRoles } = useProjectRole(toRef(props, 'project'));

const showAddMemberModal = ref(false);
const memberForm = ref({
  email: '',
  role: 'member' as 'admin' | 'member'
});
const roleOptions = [
  { value: 'member', label: 'Člen' },
  { value: 'admin', label: 'Admin' }
];

const teamMembersList = computed(() => {
  return props.project.teamMembers || [];
});

/** Vlastník projektu – zobrazíme jen pokud máme jméno (např. aktuální uživatel) */
const ownerDisplay = computed(() => {
  if (props.project.createdBy !== auth.user.value?.uid) return null;
  const u = auth.user.value;
  return u?.displayName || u?.email || 'Vlastník';
});

const canAddMember = computed(() => {
  if (props.canAddMember !== undefined) return props.canAddMember;
  return canInviteMembers.value;
});

/** Odebrat může Owner/Admin; u konkrétního člena jen pokud to není Owner (Owner není v seznamu) */
function canRemoveMemberFor(_member: TeamMember) {
  if (props.canRemoveMember !== undefined) return props.canRemoveMember;
  return canRemoveMembers.value;
}

const canRemoveMember = computed(() => canRemoveMembers.value);

function canChangeRoleFor(member: TeamMember) {
  if (!canChangeRoles.value) return false;
  return member.userId !== props.project.createdBy;
}

async function changeRole(member: TeamMember, role: 'admin' | 'member') {
  const ok = await teamMembers.changeMemberRole(props.project.id, member.userId, role);
  if (ok) await firestoreProjects.startListening();
}

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

  const auth = useAuth();
  if (!auth.user.value) {
    alert('Musíte být přihlášeni');
    return;
  }

  try {
    console.log('[TeamMembersRow] Calling POST /api/invite', { email: memberForm.value.email, projectId: props.project.id });
    const inviteResponse = await $fetch('/api/invite', {
      method: 'POST',
      body: {
        email: memberForm.value.email,
        projectId: props.project.id,
        projectName: props.project.name,
        invitedBy: auth.user.value.uid,
        invitedByName: auth.user.value.displayName || auth.user.value.email,
        role: memberForm.value.role
      }
    });

    if (!inviteResponse?.success) {
      alert('Chyba při odesílání pozvánky: ' + (inviteResponse?.error || 'Zkuste to znovu'));
      return;
    }

    const success = await teamMembers.addTeamMember(
      props.project.id,
      memberForm.value.email,
      memberForm.value.role
    );

    if (success) {
      const addedEmail = memberForm.value.email;
      emit('memberAdded', addedEmail);
      memberForm.value.email = '';
      showAddMemberModal.value = false;

      await firestoreProjects.startListening();

      const toast = useToast();
      if (inviteResponse.resendRestriction && inviteResponse.inviteLink) {
        try { await navigator.clipboard.writeText(inviteResponse.inviteLink); } catch (_) {}
        toast.add({
          title: 'Odkaz zkopírován do schránky',
          description: 'Resend v testovacím režimu umožňuje odesílat pouze na váš email. Pošlete odkaz pozvanému ručně.',
          color: 'yellow'
        });
      } else if (inviteResponse.demo) {
        toast.add({ title: 'Člen přidán. Nastavte RESEND_API_KEY pro odesílání pozvánek emailem.', color: 'yellow' });
      } else {
        toast.add({ title: 'Pozvánka odeslána na ' + addedEmail, color: 'green' });
      }
    } else {
      alert('Nepodařilo se přidat člena do týmu');
    }
  } catch (e: any) {
    console.error('[TeamMembersRow] Error:', e);
    alert('Chyba: ' + (e.data?.error || e.message || 'Zkuste to znovu'));
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

