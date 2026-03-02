<template>
  <UDropdown v-if="auth.user.value" :items="dropdownItems" :popper="{ placement: 'bottom-end' }">
    <div class="relative">
      <UButton
        icon="i-heroicons-bell"
        variant="ghost"
        size="sm"
        title="Oznámení"
      />
      <span
        v-if="badgeCount > 0"
        class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-medium text-white"
      >
        {{ badgeCount > 9 ? '9+' : badgeCount }}
      </span>
    </div>
  </UDropdown>
</template>

<script setup lang="ts">
const auth = useAuth();
const route = useRoute();
const notifications = useNotifications();
const router = useRouter();

const badgeCount = computed(() => notifications.pendingInvites.value.length);

const dropdownItems = computed(() => {
  const invites = notifications.pendingInvites.value;
  if (invites.length === 0) {
    return [[{ label: 'Žádná nová oznámení', disabled: true }]];
  }
  return [
    invites.map((inv) => ({
      label: `Pozvání: ${inv.projectName}`,
      icon: 'i-heroicons-user-plus',
      click: () => acceptInvite(inv)
    }))
  ];
});

onMounted(() => {
  if (auth.user.value) {
    notifications.fetchPendingInvites();
  }
});

watch(
  () => auth.user.value,
  (user) => {
    if (user) notifications.fetchPendingInvites();
  },
  { immediate: true }
);

// Obnovit při navigaci (např. po přijetí pozvánky)
watch(() => route.path, () => {
  if (auth.user.value) notifications.fetchPendingInvites();
});

async function acceptInvite(inv: { projectId: string; projectName: string; email: string; role: 'admin' | 'member' }) {
  const teamMembers = useTeamMembers();
  const firestoreProjects = useFirestoreProjects();
  const toast = useToast();

  const success = await teamMembers.acceptProjectInviteViaApi(inv.projectId, inv.email, inv.role);
  if (success) {
    await firestoreProjects.startListening();
    await notifications.fetchPendingInvites();
    toast.add({ title: `Připojeni k projektu ${inv.projectName}`, color: 'green' });
    router.push('/projects/' + inv.projectId);
  } else {
    toast.add({ title: 'Nepodařilo se přijmout pozvánku', color: 'red' });
  }
}
</script>
