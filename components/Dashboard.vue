<template>
  <div v-if="auth.isAuthenticated && auth.user.value" class="dashboard">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Moje Projekty</h1>
          <p class="text-gray-500 mt-1">Správa všech vašich projektů a úkolů</p>
        </div>
        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-link"
            size="lg"
            variant="outline"
            @click="handleAddFreeloProjectClick"
          >
            Přidat z Freelo
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            size="lg"
            @click="handleNewProjectClick"
          >
            Nový Projekt
          </UButton>
        </div>
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
          @click="handleNewProjectClick"
        >
          Vytvořit První Projekt
        </UButton>
      </div>
    </div>

    <!-- Add Freelo Project Modal -->
    <UModal v-model="showAddFreeloProjectModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Přidat projekt z Freelo
          </h3>
        </template>

        <UForm 
          id="freeloProjectForm" 
          :state="freeloProjectForm" 
          @submit="addFreeloProject" 
          class="space-y-4"
        >
          <UFormGroup label="Freelo Project ID" required>
            <UInput 
              v-model="freeloProjectForm.projectId" 
              placeholder="Např. 12345"
              type="number"
              autofocus
            />
            <template #description>
              Zadejte ID projektu z Freelo. ID najdete v URL projektu v Freelo aplikaci.
            </template>
          </UFormGroup>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="closeFreeloProjectModal">
              Zrušit
            </UButton>
            <UButton 
              form="freeloProjectForm" 
              type="submit" 
              :disabled="!freeloProjectForm.projectId || isAddingFreeloProject"
              :loading="isAddingFreeloProject"
            >
              Přidat projekt
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

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

    <!-- Auth Modal -->
    <AuthModal v-model="showAuthModal" />
  </div>
</template>

<script setup lang="ts">
import type { Project } from '~/types';

const projectsStore = useProjectsStore();
const freeloProjects = useFreeloProjects();
const auth = useFreeloAuth();
const router = useRouter();

// Modal states
const showAddProjectModal = ref(false);
const showAddFreeloProjectModal = ref(false);
const showAuthModal = ref(false);
const editingProject = ref<Project | null>(null);
const pendingProjectCreation = ref(false); // Flag pro otevření modalu po přihlášení
const isAddingFreeloProject = ref(false);

// Form data
const projectForm = ref({
  name: '',
  description: '',
  color: '#3b82f6',
  status: 'active' as 'active' | 'archived'
});

const freeloProjectForm = ref({
  projectId: ''
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
function handleNewProjectClick() {
  // Kontrola přihlášení před otevřením modalu
  if (!auth.isAuthenticated || !auth.user.value) {
    pendingProjectCreation.value = true; // Označit, že chce vytvořit projekt
    showAuthModal.value = true;
    return;
  }
  
  showAddProjectModal.value = true;
}

function handleAddFreeloProjectClick() {
  // Kontrola přihlášení před otevřením modalu
  if (!auth.isAuthenticated || !auth.user.value) {
    showAuthModal.value = true;
    return;
  }
  
  showAddFreeloProjectModal.value = true;
}

async function addFreeloProject() {
  if (!freeloProjectForm.value.projectId) return;
  
  const projectId = parseInt(freeloProjectForm.value.projectId);
  if (isNaN(projectId)) {
    alert('Zadejte platné číslo projektu.');
    return;
  }
  
  // Kontrola přihlášení
  if (!auth.isAuthenticated || !auth.user.value) {
    showAddFreeloProjectModal.value = false;
    showAuthModal.value = true;
    alert('Pro přidání projektu se musíte přihlásit.');
    return;
  }
  
  isAddingFreeloProject.value = true;
  
  try {
    // 1. Načíst detail projektu z Freelo API
    const freeloProject = await freeloProjects.fetchProjectById(projectId);
    
    if (!freeloProject) {
      alert('Projekt s ID ' + projectId + ' nebyl nalezen v Freelo.');
      isAddingFreeloProject.value = false;
      return;
    }
    
    // 2. Zkontrolovat, jestli už projekt není v seznamu
    const existingProject = projectsStore.projects.find(
      p => (p as any).freeloId === freeloProject.id || p.id === `freelo-${freeloProject.id}`
    );
    
    if (existingProject) {
      alert('Tento projekt je již v seznamu projektů.');
      isAddingFreeloProject.value = false;
      return;
    }
    
    // 3. Zavřít modal a zobrazit úspěch
    closeFreeloProjectModal();
    alert('Projekt byl úspěšně přidán! Projekty se načítají z Freelo API.');
    
    // 4. Znovu načíst projekty z Freelo API
    await freeloProjects.syncProjects();
    
  } catch (error: any) {
    console.error('[Dashboard] Error adding Freelo project:', error);
    alert(error.message || 'Chyba při přidávání projektu. Zkuste to prosím znovu.');
  } finally {
    isAddingFreeloProject.value = false;
  }
}

function closeFreeloProjectModal() {
  showAddFreeloProjectModal.value = false;
  freeloProjectForm.value = {
    projectId: ''
  };
}

async function saveProject() {
  if (!projectForm.value.name) return;
  
  // Kontrola přihlášení před vytvořením projektu
  if (!auth.isAuthenticated || !auth.user.value) {
    showAddProjectModal.value = false;
    showAuthModal.value = true;
    alert('Pro vytvoření projektu se musíte přihlásit.');
    return;
  }
  
  try {
    // Poznámka: Freelo API neumožňuje vytváření projektů přes API
    // Projekty se musí vytvářet přímo v Freelo aplikaci
    // Uživatel může přidat existující projekt podle ID
    alert('Vytváření projektů je dostupné pouze v Freelo aplikaci. Můžete přidat existující projekt podle ID pomocí tlačítka "Přidat z Freelo".');
    closeProjectModal();
  } catch (error: any) {
    console.error('[Dashboard] Error saving project:', error);
    alert(error.message || 'Chyba při ukládání projektu. Zkuste to prosím znovu.');
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
  alert('Archivace projektů je dostupná pouze v Freelo aplikaci.');
}

async function unarchiveProject(projectId: string) {
  alert('Zrušení archivace projektů je dostupné pouze v Freelo aplikaci.');
}

async function deleteProject(projectId: string) {
  alert('Mazání projektů je dostupné pouze v Freelo aplikaci.');
}

// Lifecycle
onMounted(async () => {
  console.log('[Dashboard] Component mounted, auth status:', unref(auth.isAuthenticated));
  console.log('[Dashboard] User:', auth.user.value?.email);
  console.log('[Dashboard] Cached projects:', projectsStore.projects.length);
  
  if (auth.isAuthenticated && auth.user.value) {
    console.log('[Dashboard] Loading projects from Freelo API');
    try {
      await freeloProjects.syncProjects();
    } catch (error: any) {
      console.error('[Dashboard] Error loading projects:', error);
      alert('Chyba při načítání projektů: ' + (error.message || 'Neznámá chyba'));
    }
  } else {
    console.warn('[Dashboard] Not authenticated on mount, waiting for auth state');
  }
});

// Watch for authentication changes
watch(() => auth.isAuthenticated, (isAuth, wasAuth) => {
  console.log('[Dashboard] Auth changed:', { wasAuth, isAuth, userEmail: auth.user.value?.email });
  if (isAuth && auth.user.value) {
    console.log('[Dashboard] User logged in, loading projects');
    nextTick(async () => {
      try {
        await freeloProjects.syncProjects();
      } catch (error: any) {
        console.error('[Dashboard] Error loading projects after login:', error);
        alert('Chyba při načítání projektů: ' + (error.message || 'Neznámá chyba'));
      }
    });
  } else {
    console.log('[Dashboard] User logged out, clearing projects');
    projectsStore.clearProjects();
  }
});

// Watch for user changes (different user logs in)
watch(() => auth.user.value?.email, (newEmail, oldEmail) => {
  console.log('[Dashboard] User email changed:', { oldEmail, newEmail });
  if (oldEmail && newEmail && oldEmail !== newEmail) {
    console.log('[Dashboard] Different user detected, switching context');
    // Different user logged in - clear old projects and reload
    projectsStore.clearProjects();
    nextTick(async () => {
      try {
        await freeloProjects.syncProjects();
      } catch (error: any) {
        console.error('[Dashboard] Error loading projects for new user:', error);
        alert('Chyba při načítání projektů: ' + (error.message || 'Neznámá chyba'));
      }
    });
  }
});

// Watch for authentication - otevřít modal pro vytvoření projektu po přihlášení
watch(() => auth.isAuthenticated, (isAuth) => {
  if (isAuth && pendingProjectCreation.value) {
    // Uživatel se přihlásil a chtěl vytvořit projekt
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

