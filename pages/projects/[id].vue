<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();

const projectId = computed(() => route.params.id as string);

// Get current project
const currentProject = computed(() => {
  return projectsStore.getProjectById(projectId.value);
});

// Redirect if project not found
watch(currentProject, (project) => {
  if (!project && !projectsStore.isLoading) {
    console.warn('[Project Page] Project not found:', projectId.value);
    router.push('/');
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
          📁
        </div>
        <div>
          <h1 class="text-2xl font-bold">{{ currentProject.name }}</h1>
          <p v-if="currentProject.description" class="text-gray-500 text-sm">
            {{ currentProject.description }}
          </p>
        </div>
      </div>
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

