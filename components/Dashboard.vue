<template>
  <div v-if="auth.isAuthenticated && auth.user.value" class="dashboard">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Moje Projekty</h1>
          <p class="text-gray-500 mt-1">Správa všech vašich projektů a úkolů</p>
        </div>
        <UButton
          icon="i-heroicons-plus"
          size="lg"
          @click="handleNewProjectClick"
        >
          Nový Projekt
        </UButton>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 rounded-lg">
            <div class="i-heroicons-folder text-2xl text-blue-600"></div>
          </div>
          <div>
            <div class="text-2xl font-bold">{{ projectsStore.activeProjects.length }}</div>
            <div class="text-sm text-gray-500">Aktivní projekty</div>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 rounded-lg">
            <div class="i-heroicons-check-circle text-2xl text-green-600"></div>
          </div>
          <div>
            <div class="text-2xl font-bold">{{ totalTasks }}</div>
            <div class="text-sm text-gray-500">Celkem úkolů</div>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-purple-100 rounded-lg">
            <div class="i-heroicons-archive-box text-2xl text-purple-600"></div>
          </div>
          <div>
            <div class="text-2xl font-bold">{{ projectsStore.archivedProjects.length }}</div>
            <div class="text-sm text-gray-500">Archivované</div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading State -->
    <div v-if="projectsStore.isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p class="text-gray-500">Načítám projekty...</p>
      </div>
    </div>

    <!-- Projects List -->
    <div v-else>
      <div v-if="projectsStore.activeProjects.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Aktivní projekty</h2>
        <div class="space-y-3">
          <ProjectCard
            v-for="project in projectsStore.activeProjects"
            :key="project.id"
            :project="project"
            @click="openProject(project)"
            @edit="editProject(project)"
            @archive="archiveProject(project.id)"
            @delete="deleteProject(project.id)"
          />
        </div>
      </div>

      <div v-if="projectsStore.archivedProjects.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-500">Archivované projekty</h2>
        <div class="space-y-3">
          <ProjectCard
            v-for="project in projectsStore.archivedProjects"
            :key="project.id"
            :project="project"
            @click="openProject(project)"
            @edit="editProject(project)"
            @unarchive="unarchiveProject(project.id)"
            @delete="deleteProject(project.id)"
          />
        </div>
      </div>

      <div
        v-if="projectsStore.projects.length === 0"
        class="text-center py-20"
      >
        <div class="text-6xl mb-4">📂</div>
        <h3 class="text-xl font-semibold mb-2">Žádné projekty</h3>
        <p class="text-gray-500 mb-6">Začněte vytvořením prvního projektu</p>
        <UButton
          icon="i-heroicons-plus"
          @click="handleNewProjectClick"
        >
          Vytvořit První Projekt
        </UButton>
      </div>
    </div>

    <!-- Add/Edit Project Modal -->
    <UModal v-model="showAddProjectModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ editingProject ? 'Upravit Projekt' : 'Nový Projekt' }}
          </h3>
        </template>

        <UForm
          id="projectForm"
          :state="projectForm"
          @submit="saveProject"
          class="space-y-4"
        >
          <UFormGroup label="Název projektu" name="name" required>
            <UInput
              v-model="projectForm.name"
              placeholder="Např. Webová aplikace, Marketing kampaň..."
              autofocus
              :disabled="isSaving"
            />
          </UFormGroup>

          <UFormGroup label="Popis" name="description">
            <UTextarea
              v-model="projectForm.description"
              placeholder="Krátký popis projektu..."
              rows="3"
              :disabled="isSaving"
            />
          </UFormGroup>

          <UFormGroup label="Barva">
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in availableColors"
                :key="color"
                type="button"
                class="w-10 h-10 rounded-lg border-2 transition-all"
                :class="[
                  projectForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                ]"
                :style="{ backgroundColor: color }"
                @click="projectForm.color = color"
              />
            </div>
          </UFormGroup>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="closeProjectModal" :disabled="isSaving">
              Zrušit
            </UButton>
            <UButton
              form="projectForm"
              type="submit"
              :disabled="!projectForm.name.trim() || isSaving"
              :loading="isSaving"
            >
              {{ editingProject ? 'Uložit' : 'Vytvořit projekt' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <AuthModal v-model="showAuthModal" />
  </div>
</template>

<script setup lang="ts">
import type { Project } from '~/types';

const projectsStore = useProjectsStore();
const firestoreProjects = useFirestoreProjects();
const auth = useAuth();
const router = useRouter();
const route = useRoute();

const showAddProjectModal = ref(false);
const showAuthModal = ref(false);
const editingProject = ref<Project | null>(null);
const pendingProjectCreation = ref(false);
const isSaving = ref(false);

const projectForm = ref<{
  name: string;
  description: string;
  color: string;
  status: 'active' | 'archived';
}>({
  name: '',
  description: '',
  color: '#3b82f6',
  status: 'active'
});

const availableColors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#6366f1', '#a855f7',
];

const totalTasks = computed(() => {
  return projectsStore.projects.reduce((sum, project) => sum + (project.taskCount || 0), 0);
});

function handleNewProjectClick() {
  if (!auth.isAuthenticated || !auth.user.value) {
    pendingProjectCreation.value = true;
    showAuthModal.value = true;
    return;
  }
  showAddProjectModal.value = true;
}

async function saveProject() {
  const name = projectForm.value.name?.trim();
  if (!name) return;

  if (!auth.isAuthenticated || !auth.user.value) {
    showAddProjectModal.value = false;
    showAuthModal.value = true;
    return;
  }

  isSaving.value = true;
  const toast = useToast();

  try {
    if (editingProject.value) {
      const ok = await firestoreProjects.updateProject(editingProject.value.id, {
        name,
        description: projectForm.value.description?.trim() || '',
        color: projectForm.value.color,
        status: projectForm.value.status
      });
      if (ok) {
        closeProjectModal();
        toast.add({ title: 'Projekt byl upraven', color: 'green' });
      } else {
        toast.add({ title: 'Nepodařilo se uložit změny', color: 'red' });
      }
    } else {
      const id = await firestoreProjects.addProject({
        name,
        description: projectForm.value.description?.trim() || '',
        color: projectForm.value.color,
        status: projectForm.value.status
      });
      if (id) {
        closeProjectModal();
        toast.add({ title: 'Projekt byl vytvořen', color: 'green' });
        router.push(`/projects/${id}`);
      } else {
        toast.add({ title: 'Nepodařilo se vytvořit projekt', color: 'red' });
      }
    }
  } catch (error: any) {
    console.error('[Dashboard] Error saving project:', error);
    toast.add({ title: error.message || 'Chyba při ukládání projektu', color: 'red' });
  } finally {
    isSaving.value = false;
  }
}

function editProject(project: Project) {
  editingProject.value = project;
  projectForm.value = {
    name: project.name,
    description: project.description || '',
    color: project.color,
    status: project.status
  };
  showAddProjectModal.value = true;
}

function closeProjectModal() {
  showAddProjectModal.value = false;
  editingProject.value = null;
  projectForm.value = {
    name: '',
    description: '',
    color: '#3b82f6',
    status: 'active'
  };
}

function openProject(project: Project) {
  projectsStore.setCurrentProject(project);
  router.push(`/projects/${project.id}`);
}

async function archiveProject(projectId: string) {
  if (!confirm('Opravdu chcete archivovat tento projekt?')) return;
  const ok = await firestoreProjects.archiveProject(projectId);
  if (ok) {
    const toast = useToast();
    toast.add({ title: 'Projekt byl archivován', color: 'green' });
  } else {
    alert('Nepodařilo se archivovat projekt.');
  }
}

async function unarchiveProject(projectId: string) {
  const ok = await firestoreProjects.unarchiveProject(projectId);
  if (ok) {
    const toast = useToast();
    toast.add({ title: 'Projekt byl obnoven', color: 'green' });
  } else {
    alert('Nepodařilo se obnovit projekt.');
  }
}

async function deleteProject(projectId: string) {
  const project = projectsStore.getProjectById(projectId);
  if (!project) return;
  if (!confirm(`Opravdu chcete smazat projekt "${project.name}"? Tato akce je nevratná.`)) return;

  const ok = await firestoreProjects.deleteProject(projectId);
  if (ok) {
    if (projectsStore.currentProject?.id === projectId) {
      projectsStore.setCurrentProject(null);
      if (route.path.startsWith('/projects/')) {
        router.push('/');
      }
    }
    const toast = useToast();
    toast.add({ title: 'Projekt byl smazán', color: 'green' });
  } else {
    alert('Nepodařilo se smazat projekt.');
  }
}

onMounted(() => {
  if (auth.isAuthenticated && auth.user.value) {
    firestoreProjects.startListening();
  }
});

watch(() => auth.isAuthenticated, (isAuth) => {
  if (isAuth && auth.user.value) {
    firestoreProjects.startListening();
  } else {
    firestoreProjects.stopListening();
    projectsStore.clearProjects();
  }
});

watch(() => auth.user.value?.uid, (newUid, oldUid) => {
  if (oldUid && newUid && oldUid !== newUid) {
    projectsStore.clearProjects();
    firestoreProjects.startListening();
  }
});

watch(() => auth.isAuthenticated, (isAuth) => {
  if (isAuth && pendingProjectCreation.value) {
    pendingProjectCreation.value = false;
    showAuthModal.value = false;
    nextTick(() => {
      showAddProjectModal.value = true;
    });
  }
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
}
</style>
