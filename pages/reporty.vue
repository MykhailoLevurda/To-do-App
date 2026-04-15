<script setup lang="ts">
import { ChartBarIcon } from '@heroicons/vue/24/outline';
import type { TaskItem } from '~/stores/todos';
import type { Project } from '~/types';
import { DEFAULT_PROJECT_STATUSES } from '~/composables/useFirestoreProjects';

const auth = useAuth();
const projectsStore = useProjectsStore();
const scrumBoard = useScrumBoardStore();
const firestoreTasks = useFirestoreTasks();
const firestoreProjects = useFirestoreProjects();

/** Načíst všechny úkoly uživatele (bez filtru projektu) pro report */
onMounted(() => {
  if (auth.user.value) {
    firestoreProjects.startListening();
    firestoreTasks.startListening();
  }
});
watch(() => auth.user.value?.uid, (uid) => {
  if (uid) {
    firestoreTasks.startListening();
  }
});

const loading = computed(() => scrumBoard.isLoading);

const projects = computed(() => projectsStore.activeProjects);
const tasks = computed(() => scrumBoard.tasks);

/** Id stavu „hotovo“ u projektu (poslední sloupec) */
function getDoneStatusId(project: Project): string {
  const statuses = project.statuses && project.statuses.length > 0
    ? project.statuses
    : DEFAULT_PROJECT_STATUSES;
  return statuses[statuses.length - 1]?.id ?? 'done';
}

function isTaskDone(task: TaskItem, project: Project): boolean {
  return task.status === getDoneStatusId(project);
}

/** Přehledové karty – celková čísla */
const totalProjects = computed(() => projects.value.length);
const totalTasks = computed(() => tasks.value.length);
const doneTasks = computed(() => {
  return tasks.value.filter((t) => {
    const p = projects.value.find((pr) => pr.id === t.projectId);
    return p && isTaskDone(t, p);
  }).length;
});
const totalStoryPoints = computed(() =>
  tasks.value.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
);
const doneStoryPoints = computed(() => {
  return tasks.value
    .filter((t) => {
      const p = projects.value.find((pr) => pr.id === t.projectId);
      return p && isTaskDone(t, p);
    })
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
});

/** Grafy */
const DONUT_R = 48;
const DONUT_C = 2 * Math.PI * DONUT_R; // 301.6

const completionPct = computed(() =>
  totalTasks.value > 0 ? Math.round((doneTasks.value / totalTasks.value) * 100) : 0
);
const donutDash = computed(() => (completionPct.value / 100) * DONUT_C);
const donutGap = computed(() => DONUT_C - donutDash.value);

const priorityCounts = computed(() => ({
  high: tasks.value.filter((t) => t.priority === 'high').length,
  medium: tasks.value.filter((t) => t.priority === 'medium').length,
  low: tasks.value.filter((t) => t.priority === 'low').length
}));

/** Tabulka po projektech */
const reportByProject = computed(() => {
  return projects.value.map((project) => {
    const projectTasks = tasks.value.filter((t) => t.projectId === project.id);
    const doneId = getDoneStatusId(project);
    const done = projectTasks.filter((t) => t.status === doneId);
    const pointsTotal = projectTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    const pointsDone = done.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    return {
      project,
      total: projectTasks.length,
      done: done.length,
      pointsTotal,
      pointsDone,
      progress: projectTasks.length > 0 ? Math.round((done.length / projectTasks.length) * 100) : 0
    };
  });
});

</script>

<template>
  <div class="reporty-page">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <ChartBarIcon class="w-8 h-8" />
          Reporty
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Přehled úkolů, story points a pokroku po projektech.
        </p>
      </div>
    </div>

    <div v-if="!auth.user.value" class="text-center py-12 text-gray-500">
      <p>Pro zobrazení reportů se přihlaste.</p>
    </div>

    <template v-else>
      <div v-if="loading" class="flex justify-center py-12">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>

      <template v-else>
        <!-- Přehledové karty -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold text-primary">{{ totalProjects }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Projektů</div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold">{{ totalTasks }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Celkem úkolů</div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ doneTasks }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Dokončeno</div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold">
                {{ doneStoryPoints }} / {{ totalStoryPoints }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Story points (dokončeno / celkem)</div>
            </div>
          </UCard>
        </div>

        <!-- Grafy -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <!-- Donut: celkový pokrok -->
          <UCard>
            <template #header>
              <h2 class="text-base font-semibold">Celkový pokrok</h2>
            </template>
            <div class="flex items-center justify-center gap-6 py-2">
              <svg width="110" height="110" viewBox="0 0 120 120">
                <circle cx="60" cy="60" :r="DONUT_R" fill="none" stroke="#e5e7eb" stroke-width="14" />
                <circle
                  cx="60" cy="60" :r="DONUT_R"
                  fill="none"
                  stroke="#22c55e"
                  stroke-width="14"
                  stroke-linecap="round"
                  :stroke-dasharray="`${donutDash} ${donutGap}`"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="bold" fill="currentColor">{{ completionPct }}%</text>
                <text x="60" y="72" text-anchor="middle" font-size="11" fill="#9ca3af">hotovo</text>
              </svg>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                  Hotovo: {{ doneTasks }}
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0" />
                  Zbývá: {{ totalTasks - doneTasks }}
                </div>
              </div>
            </div>
          </UCard>

          <!-- Distribuce priorit -->
          <UCard>
            <template #header>
              <h2 class="text-base font-semibold">Distribuce priorit</h2>
            </template>
            <div class="space-y-3 py-2 px-1">
              <div v-for="(item) in [
                { label: 'Vysoká', key: 'high', color: '#ef4444', bg: 'bg-red-500' },
                { label: 'Střední', key: 'medium', color: '#eab308', bg: 'bg-yellow-400' },
                { label: 'Nízká', key: 'low', color: '#22c55e', bg: 'bg-green-500' }
              ]" :key="item.key" class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span>{{ item.label }}</span>
                  <span class="font-medium">{{ priorityCounts[item.key as keyof typeof priorityCounts] }}</span>
                </div>
                <div class="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="item.bg"
                    :style="{ width: totalTasks > 0 ? (priorityCounts[item.key as keyof typeof priorityCounts] / totalTasks * 100) + '%' : '0%' }"
                  />
                </div>
              </div>
              <p v-if="totalTasks === 0" class="text-sm text-gray-400 text-center py-2">Žádné úkoly</p>
            </div>
          </UCard>

          <!-- Pokrok po projektech -->
          <UCard>
            <template #header>
              <h2 class="text-base font-semibold">Pokrok po projektech</h2>
            </template>
            <div class="space-y-3 py-2 px-1">
              <div
                v-for="row in reportByProject.slice(0, 6)"
                :key="row.project.id"
                class="space-y-1"
              >
                <div class="flex justify-between text-sm">
                  <span class="truncate max-w-[140px]" :title="row.project.name">{{ row.project.name }}</span>
                  <span class="font-medium shrink-0 ml-2">{{ row.progress }} %</span>
                </div>
                <div class="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="{ width: row.progress + '%', backgroundColor: row.project.color || '#3b82f6' }"
                  />
                </div>
              </div>
              <p v-if="reportByProject.length === 0" class="text-sm text-gray-400 text-center py-2">Žádné projekty</p>
            </div>
          </UCard>

        </div>

        <!-- Tabulka po projektech -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Přehled po projektech</h2>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-2 pr-4 font-medium">Projekt</th>
                  <th class="pb-2 pr-4 font-medium text-center">Úkolů</th>
                  <th class="pb-2 pr-4 font-medium text-center">Dokončeno</th>
                  <th class="pb-2 pr-4 font-medium text-center">Progress</th>
                  <th class="pb-2 pr-4 font-medium text-right">Story points</th>
                  <th class="pb-2 font-medium text-right">Akce</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in reportByProject"
                  :key="row.project.id"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-4">
                    <NuxtLink
                      :to="`/projects/${row.project.id}`"
                      class="font-medium text-primary hover:underline"
                    >
                      {{ row.project.name }}
                    </NuxtLink>
                  </td>
                  <td class="py-3 pr-4 text-center">{{ row.total }}</td>
                  <td class="py-3 pr-4 text-center">{{ row.done }}</td>
                  <td class="py-3 pr-4 text-center">
                    <span class="text-sm">{{ row.progress }} %</span>
                    <div class="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5 mx-auto">
                      <div
                        class="h-full bg-primary rounded-full transition-all"
                        :style="{ width: row.progress + '%' }"
                      />
                    </div>
                  </td>
                  <td class="py-3 pr-4 text-right">
                    <span class="text-green-600 dark:text-green-400">{{ row.pointsDone }}</span>
                    <span class="text-gray-400"> / </span>
                    {{ row.pointsTotal }}
                  </td>
                  <td class="py-3 text-right">
                    <UButton
                      size="xs"
                      variant="ghost"
                      :to="`/projects/${row.project.id}`"
                    >
                      Otevřít
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="reportByProject.length === 0" class="text-center py-8 text-gray-500">
            Žádné projekty. Vytvořte projekt na přehledu a načtěte úkoly otevřením projektu.
          </p>
        </UCard>

        <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Úkoly se načítají z otevřených projektů. Pro plné reporty včetně sprintů otevřete projekt a záložku Sprinty.
        </p>
      </template>
    </template>
  </div>
</template>
