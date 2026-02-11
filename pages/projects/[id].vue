<script setup lang="ts">
import { FolderIcon } from '@heroicons/vue/24/solid';
import type { ProjectStatus } from '~/types';

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const firestoreProjects = useFirestoreProjects();
const auth = useAuth();

const projectId = computed(() => route.params.id as string);

const currentProject = computed(() => {
  return projectsStore.getProjectById(projectId.value);
});

const showDeleteModal = ref(false);
const isDeleting = ref(false);
const showEditModal = ref(false);
const showStatusesModal = ref(false);
const editForm = ref({ name: '', description: '', color: '#3b82f6' });

const statusColors = ['#3b82f6', '#eab308', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function generateStatusId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const statusesForm = ref<ProjectStatus[]>([]);

function openEditModal() {
  if (!currentProject.value) return;
  editForm.value = {
    name: currentProject.value.name,
    description: currentProject.value.description || '',
    color: currentProject.value.color
  };
  showEditModal.value = true;
}

function openStatusesModal() {
  if (!currentProject.value) return;
  statusesForm.value = (currentProject.value.statuses && currentProject.value.statuses.length > 0)
    ? currentProject.value.statuses.map((s, i) => ({ ...s, order: i }))
    : [];
  showStatusesModal.value = true;
}

function addStatus() {
  const order = statusesForm.value.length;
  statusesForm.value.push({
    id: generateStatusId(),
    title: '',
    color: statusColors[order % statusColors.length],
    order
  });
}

function removeStatus(index: number) {
  statusesForm.value.splice(index, 1);
}

function moveStatusUp(index: number) {
  if (index <= 0) return;
  const arr = statusesForm.value;
  [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
}

function moveStatusDown(index: number) {
  if (index >= statusesForm.value.length - 1) return;
  const arr = statusesForm.value;
  [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
}

async function saveStatuses() {
  if (!currentProject.value) return;
  const statuses = statusesForm.value
    .filter(s => s.title?.trim())
    .map((s, i) => ({ ...s, title: s.title.trim(), order: i }));
  const ok = await firestoreProjects.updateProject(currentProject.value.id, { statuses });
  if (ok) {
    showStatusesModal.value = false;
    useToast().add({ title: 'Stavy byly uloženy', color: 'green' });
  } else {
    useToast().add({ title: 'Nepodařilo se uložit stavy', color: 'red' });
  }
}

async function saveEdit() {
  if (!currentProject.value) return;
  const ok = await firestoreProjects.updateProject(currentProject.value.id, editForm.value);
  if (ok) {
    showEditModal.value = false;
    const toast = useToast();
    toast.add({ title: 'Projekt byl upraven', color: 'green' });
  } else {
    alert('Nepodařilo se uložit změny.');
  }
}

function openDeleteModal() {
  showDeleteModal.value = true;
}

async function deleteProject() {
  if (!currentProject.value) return;

  isDeleting.value = true;
  try {
    const ok = await firestoreProjects.deleteProject(currentProject.value.id);
    showDeleteModal.value = false;
    if (ok) {
      const toast = useToast();
      toast.add({ title: 'Projekt byl smazán', color: 'green' });
      router.push('/');
    } else {
      alert('Nepodařilo se smazat projekt.');
    }
  } finally {
    isDeleting.value = false;
  }
}

watch(currentProject, (project) => {
  if (!project && !projectsStore.isLoading) {
    router.push('/');
  }
}, { immediate: true });
</script>

<template>
  <div v-if="currentProject">
    <div class="mb-6">
      <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <NuxtLink to="/" class="hover:text-primary">
          <div class="i-heroicons-home" />
        </NuxtLink>
        <div class="i-heroicons-chevron-right text-xs" />
        <span class="font-medium text-gray-900">{{ currentProject.name }}</span>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          :style="{ backgroundColor: currentProject.color }"
        >
          <FolderIcon class="w-5 h-5 text-white" />
        </div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold">{{ currentProject.name }}</h1>
          <p v-if="currentProject.description" class="text-gray-500 text-sm">
            {{ currentProject.description }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-squares-2x2"
            variant="outline"
            @click="openStatusesModal"
            title="Správa stavů úkolů"
          >
            Stavy
          </UButton>
          <UButton
            icon="i-heroicons-pencil"
            variant="outline"
            @click="openEditModal"
          >
            Upravit
          </UButton>
          <UButton
            icon="i-heroicons-trash"
            variant="outline"
            color="red"
            @click="openDeleteModal"
          >
            Smazat
          </UButton>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <TeamMembersRow
        :project="currentProject"
        @member-added="() => {}"
        @member-removed="() => {}"
      />
    </div>

    <ScrumBoard :project-id="projectId" />
  </div>

  <div v-else-if="projectsStore.isLoading" class="flex items-center justify-center py-20">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
      <p class="text-gray-500">Načítám projekt...</p>
    </div>
  </div>

  <!-- Edit Project Modal -->
  <UModal v-model="showEditModal">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Upravit projekt</h3>
      </template>
      <UForm :state="editForm" @submit="saveEdit" class="space-y-4">
        <UFormGroup label="Název" required>
          <UInput v-model="editForm.name" required />
        </UFormGroup>
        <UFormGroup label="Popis">
          <UTextarea v-model="editForm.description" rows="3" />
        </UFormGroup>
        <UFormGroup label="Barva">
          <UInput v-model="editForm.color" type="color" class="h-10 w-20 p-1 cursor-pointer" />
        </UFormGroup>
      </UForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showEditModal = false">Zrušit</UButton>
          <UButton @click="saveEdit">Uložit</UButton>
        </div>
      </template>
    </UCard>
  </UModal>

  <!-- Správa stavů modal -->
  <UModal v-model="showStatusesModal">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Stavy úkolů</h3>
        <p class="text-sm text-gray-500 mt-1">Pořadí sloupců na boardu: první stav = vlevo, poslední = vpravo. Přesouvejte šipkami.</p>
      </template>
      <div class="space-y-3">
        <div
          v-for="(st, idx) in statusesForm"
          :key="st.id"
          class="flex items-center gap-2"
        >
          <div class="flex flex-col gap-0.5 shrink-0">
            <UButton
              icon="i-heroicons-chevron-up"
              size="xs"
              variant="ghost"
              color="gray"
              aria-label="Posunout vlevo"
              :disabled="idx === 0"
              @click="moveStatusUp(idx)"
            />
            <UButton
              icon="i-heroicons-chevron-down"
              size="xs"
              variant="ghost"
              color="gray"
              aria-label="Posunout vpravo"
              :disabled="idx === statusesForm.length - 1"
              @click="moveStatusDown(idx)"
            />
          </div>
          <div
            class="w-8 h-8 rounded flex-shrink-0 border border-gray-300 dark:border-gray-600"
            :style="{ backgroundColor: st.color || '#9ca3af' }"
          />
          <UInput
            v-model="st.title"
            placeholder="Název stavu (např. To Do, Hotovo)"
            class="flex-1 min-w-0"
          />
          <UButton
            icon="i-heroicons-trash"
            size="sm"
            variant="ghost"
            color="red"
            aria-label="Odebrat stav"
            @click="removeStatus(idx)"
          />
        </div>
        <UButton
          icon="i-heroicons-plus"
          variant="soft"
          block
          @click="addStatus"
        >
          Přidat stav
        </UButton>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showStatusesModal = false">Zrušit</UButton>
          <UButton @click="saveStatuses">Uložit stavy</UButton>
        </div>
      </template>
    </UCard>
  </UModal>

  <!-- Delete Project Modal -->
  <UModal v-model="showDeleteModal">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-red-600">Smazat projekt</h3>
      </template>
      <div class="space-y-4">
        <p class="text-gray-700">
          Opravdu chcete smazat projekt <strong>{{ currentProject?.name }}</strong>?
        </p>
        <p class="text-sm text-gray-500">
          Tato akce je nevratná. Smažou se i všechny úkoly v projektu.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteModal = false" :disabled="isDeleting">
            Zrušit
          </UButton>
          <UButton color="red" @click="deleteProject" :loading="isDeleting">
            Smazat projekt
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
