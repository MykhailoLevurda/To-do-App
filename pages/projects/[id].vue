<script setup lang="ts">
import { FolderIcon } from '@heroicons/vue/24/solid'

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const freeloProjects = useFreeloProjects();
const auth = useFreeloAuth();

const projectId = computed(() => route.params.id as string);

// Get current project
const currentProject = computed(() => {
  return projectsStore.getProjectById(projectId.value);
});

// Freelo project detail
const freeloProjectDetail = ref<any>(null);
const isLoadingFreeloDetail = ref(false);

// Load Freelo project detail if project has freeloId
const loadFreeloProjectDetail = async () => {
  const project = currentProject.value;
  if (!project) return;
  
  const freeloId = (project as any).freeloId;
  if (!freeloId) {
    // Pokud projekt nemá freeloId, zkusit extrahovat z ID (formát: freelo-123)
    const match = project.id.match(/^freelo-(\d+)$/);
    if (match) {
      const extractedId = parseInt(match[1]);
      await fetchFreeloDetail(extractedId);
    }
    return;
  }
  
  await fetchFreeloDetail(freeloId);
};

const fetchFreeloDetail = async (freeloId: number) => {
  if (!auth.isAuthenticated || !auth.user.value) return;
  
  isLoadingFreeloDetail.value = true;
  try {
    const detail = await freeloProjects.fetchProjectById(freeloId);
    freeloProjectDetail.value = detail;
    console.log('[Project Page] Freelo project detail loaded:', detail);
  } catch (error: any) {
    console.error('[Project Page] Error loading Freelo project detail:', error);
  } finally {
    isLoadingFreeloDetail.value = false;
  }
};

// Load detail when project is available
watch(currentProject, (project) => {
  if (!project && !projectsStore.isLoading) {
    console.warn('[Project Page] Project not found:', projectId.value);
    router.push('/');
    return;
  }
  
  if (project) {
    loadFreeloProjectDetail();
  }
}, { immediate: true });
</script>

<template>
  <div v-if="currentProject">
    <!-- Breadcrumb -->
    <div class="mb-6">
      <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <NuxtLink to="/" class="hover:text-primary">
          <div class="i-heroicons-home"></div>
        </NuxtLink>
        <div class="i-heroicons-chevron-right text-xs"></div>
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
        <div v-if="freeloProjectDetail" class="text-right">
          <UBadge color="blue" variant="soft">
            Freelo Project ID: {{ freeloProjectDetail.id }}
          </UBadge>
        </div>
      </div>
    </div>

    <!-- Freelo Project Detail -->
    <div v-if="freeloProjectDetail" class="mb-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Detail projektu z Freelo API</h3>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div class="text-sm text-gray-500">Vlastník</div>
              <div class="font-medium">{{ freeloProjectDetail.owner?.fullname || 'Neznámý' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Stav</div>
              <div class="font-medium">
                <UBadge :color="freeloProjectDetail.state?.state === 'active' ? 'green' : 'gray'">
                  {{ freeloProjectDetail.state?.state || 'Neznámý' }}
                </UBadge>
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Vytvořeno</div>
              <div class="font-medium">{{ new Date(freeloProjectDetail.date_add).toLocaleDateString('cs-CZ') }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Upraveno</div>
              <div class="font-medium">{{ new Date(freeloProjectDetail.date_edited_at).toLocaleDateString('cs-CZ') }}</div>
            </div>
          </div>
          <div v-if="freeloProjectDetail.budget" class="pt-4 border-t">
            <div class="text-sm text-gray-500 mb-2">Rozpočet</div>
            <div class="font-medium text-lg">
              {{ freeloProjectDetail.budget.amount?.toLocaleString() }} {{ freeloProjectDetail.budget.currency }}
            </div>
          </div>
          <div v-if="freeloProjectDetail.minutes_budget" class="pt-4 border-t">
            <div class="text-sm text-gray-500 mb-2">Rozpočet času</div>
            <div class="font-medium">
              {{ Math.floor(freeloProjectDetail.minutes_budget / 60) }}h {{ freeloProjectDetail.minutes_budget % 60 }}m
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Team Members Row -->
    <div class="mb-6">
      <TeamMembersRow 
        :project="currentProject" 
        @member-added="() => {}"
        @member-removed="() => {}"
      />
    </div>

    <!-- Scrum Board for this project -->
    <ScrumBoard :project-id="projectId" />
  </div>
  
  <div v-else-if="projectsStore.isLoading" class="flex items-center justify-center py-20">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p class="text-gray-500">Načítám projekt...</p>
    </div>
  </div>
</template>

