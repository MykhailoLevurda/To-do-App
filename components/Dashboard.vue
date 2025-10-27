<template>
  <div class="dashboard">
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
          @click="showAddProjectModal = true"
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
      <!-- Active Projects -->
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

      <!-- Archived Projects -->
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

      <!-- Empty State -->
      <div 
        v-if="projectsStore.projects.length === 0"
        class="text-center py-20"
      >
        <div class="text-6xl mb-4">📂</div>
        <h3 class="text-xl font-semibold mb-2">Žádné projekty</h3>
        <p class="text-gray-500 mb-6">Začněte vytvořením prvního projektu</p>
        <UButton
          icon="i-heroicons-plus"
          @click="showAddProjectModal = true"
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
          <UFormGroup label="Název projektu" required>
            <UInput 
              v-model="projectForm.name" 
              placeholder="Např. Webová aplikace, Marketing kampaň..."
              autofocus
            />
          </UFormGroup>

          <UFormGroup label="Popis">
            <UTextarea 
              v-model="projectForm.description" 
              placeholder="Krátký popis projektu..."
              rows="3"
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
              ></button>
            </div>
          </UFormGroup>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="closeProjectModal">
              Zrušit
            </UButton>
            <UButton 
              form="projectForm" 
              type="submit" 
              :disabled="!projectForm.name"
            >
              {{ editingProject ? 'Uložit' : 'Vytvořit' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '~/types';

const projectsStore = useProjectsStore();
const firestoreProjects = useFirestoreProjects();
const auth = useAuth();
const router = useRouter();

// Modal states
const showAddProjectModal = ref(false);
const editingProject = ref<Project | null>(null);

// Form data
const projectForm = ref({
  name: '',
  description: '',
  color: '#3b82f6',
  status: 'active' as 'active' | 'archived'
});

// Available colors
const availableColors = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // violet
];

// Computed
const totalTasks = computed(() => {
  return projectsStore.projects.reduce((sum, project) => sum + (project.taskCount || 0), 0);
});

// Methods
async function saveProject() {
  if (!projectForm.value.name) return;
  
  if (editingProject.value) {
    // Update existing project
    await firestoreProjects.updateProject(editingProject.value.id, {
      name: projectForm.value.name,
      description: projectForm.value.description,
      color: projectForm.value.color
    });
  } else {
    // Create new project
    await firestoreProjects.addProject({
      name: projectForm.value.name,
      description: projectForm.value.description,
      color: projectForm.value.color,
      status: 'active',
      createdBy: auth.user.value?.uid || ''
    });
  }
  
  closeProjectModal();
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
  if (confirm('Opravdu chcete archivovat tento projekt?')) {
    await firestoreProjects.archiveProject(projectId);
  }
}

async function unarchiveProject(projectId: string) {
  await firestoreProjects.unarchiveProject(projectId);
}

async function deleteProject(projectId: string) {
  if (confirm('Opravdu chcete smazat tento projekt? Tato akce je nevratná a smaže i všechny úkoly v projektu.')) {
    await firestoreProjects.deleteProject(projectId);
  }
}

// Lifecycle
onMounted(() => {
  console.log('[Dashboard] Component mounted, auth status:', unref(auth.isAuthenticated));
  console.log('[Dashboard] User:', auth.user.value?.uid);
  console.log('[Dashboard] Cached projects:', projectsStore.projects.length);
  
  if (auth.isAuthenticated && auth.user.value) {
    console.log('[Dashboard] Starting projects listener on mount');
    firestoreProjects.startListening();
  } else {
    console.warn('[Dashboard] Not authenticated on mount, waiting for auth state');
  }
});

onUnmounted(() => {
  console.log('[Dashboard] Component unmounting, stopping listener');
  firestoreProjects.stopListening();
});

// Watch for authentication changes
watch(() => auth.isAuthenticated, (isAuth, wasAuth) => {
  console.log('[Dashboard] Auth changed:', { wasAuth, isAuth, userId: auth.user.value?.uid });
  if (isAuth && auth.user.value) {
    console.log('[Dashboard] User logged in, starting listener');
    nextTick(() => {
      firestoreProjects.startListening();
    });
  } else {
    console.log('[Dashboard] User logged out, stopping listener and clearing projects');
    firestoreProjects.stopListening();
    projectsStore.clearProjects();
  }
});

// Watch for user changes (different user logs in)
watch(() => auth.user.value?.uid, (newUid, oldUid) => {
  console.log('[Dashboard] User UID changed:', { oldUid, newUid });
  if (oldUid && newUid && oldUid !== newUid) {
    console.log('[Dashboard] Different user detected, switching context');
    // Different user logged in - clear old projects and restart listener
    projectsStore.clearProjects();
    firestoreProjects.stopListening();
    nextTick(() => {
      firestoreProjects.startListening();
    });
  }
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
}
</style>

