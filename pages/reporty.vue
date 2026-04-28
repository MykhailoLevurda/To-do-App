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

// ─── Sprint metriky ──────────────────────────────────────────────────────────

const sprintProjectId = ref('');
watch(projects, (ps) => {
  if (!sprintProjectId.value && ps.length > 0) sprintProjectId.value = ps[0].id;
}, { immediate: true });

const { sprints: sprintsList, startListening: startSprintsListening } = useSprints(sprintProjectId);
watch(sprintProjectId, (id) => { if (id) startSprintsListening(); }, { immediate: true });

const sprintSelectedProject = computed(() => projects.value.find(p => p.id === sprintProjectId.value) ?? null);
const sprintDoneId = computed(() => sprintSelectedProject.value ? getDoneStatusId(sprintSelectedProject.value) : 'done');
const sprintProjectTasks = computed(() => tasks.value.filter(t => t.projectId === sprintProjectId.value));

// Velocity – uzavřené sprinty, seřazené chronologicky
const closedSprintsSorted = computed(() =>
  [...sprintsList.value]
    .filter(s => s.status === 'closed')
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
);
const velocityBars = computed(() =>
  closedSprintsSorted.value.map(sprint => ({
    name: sprint.name,
    sp: sprintProjectTasks.value
      .filter(t => t.sprintId === sprint.id && t.status === sprintDoneId.value)
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0)
  }))
);
const avgVelocity = computed(() => {
  if (!velocityBars.value.length) return 0;
  return Math.round(velocityBars.value.reduce((s, b) => s + b.sp, 0) / velocityBars.value.length);
});
const maxVelocitySP = computed(() => Math.max(1, ...velocityBars.value.map(b => b.sp), avgVelocity.value));

// Burndown – aktivní sprint
const activeBurndownSprint = computed(() => sprintsList.value.find(s => s.status === 'active') ?? null);
const burndown = computed(() => {
  const sprint = activeBurndownSprint.value;
  if (!sprint) return null;
  const spTasks = sprintProjectTasks.value.filter(t => t.sprintId === sprint.id);
  const totalSP = spTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = spTasks.filter(t => t.status === sprintDoneId.value).reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const remainingSP = totalSP - doneSP;
  const now = Date.now();
  const start = sprint.startDate.getTime();
  const end = sprint.endDate.getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((now - start) / 86400000)));
  return { sprint, totalSP, doneSP, remainingSP, totalDays, elapsedDays };
});

// SVG souřadnice – velocity (viewBox 0 0 430 210, graf 40..395 × 10..170)
const VX1 = 40, VX2 = 395, VY1 = 10, VY2 = 170;
const velocityBarWidth = computed(() => {
  const n = velocityBars.value.length;
  return n ? Math.min(50, (VX2 - VX1) / n - 6) : 0;
});
function vBarX(i: number) { return VX1 + (i + 0.5) * (VX2 - VX1) / velocityBars.value.length; }
function vBarY(sp: number) { return VY2 - (sp / maxVelocitySP.value) * (VY2 - VY1); }
const velocityAvgY = computed(() => vBarY(avgVelocity.value));

// SVG souřadnice – burndown (viewBox 0 0 430 210, graf 40..395 × 10..170)
const burndownCoords = computed(() => {
  const bd = burndown.value;
  const empty = { idealX1: VX1, idealY1: VY1, idealX2: VX2, idealY2: VY2, cx: VX1, cy: VY2, isAhead: true };
  if (!bd || bd.totalSP === 0) return empty;
  const { totalSP, remainingSP, totalDays, elapsedDays } = bd;
  const toX = (d: number) => VX1 + (d / totalDays) * (VX2 - VX1);
  const toY = (sp: number) => VY2 - (sp / totalSP) * (VY2 - VY1);
  const cx = toX(elapsedDays);
  const cy = toY(remainingSP);
  const idealAtNow = totalSP * (1 - elapsedDays / totalDays);
  return {
    idealX1: VX1, idealY1: toY(totalSP), idealX2: VX2, idealY2: toY(0),
    cx, cy, isAhead: remainingSP <= idealAtNow
  };
});

// ─────────────────────────────────────────────────────────────────────────────

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

        <!-- Sprint metriky -->
        <UCard class="mt-6">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Sprint metriky</h2>
              <select
                v-model="sprintProjectId"
                class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              >
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </template>

          <div v-if="!projects.length" class="text-center py-8 text-gray-400 text-sm">Žádné projekty.</div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">

            <!-- Velocity chart -->
            <div>
              <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Velocity <span class="normal-case font-normal">(SP dokončeno za sprint)</span>
              </h3>
              <div v-if="!velocityBars.length" class="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <span class="i-heroicons-chart-bar w-8 h-8 opacity-30" />
                Žádné uzavřené sprinty.<br>Velocity se zobrazí po uzavření prvního sprintu.
              </div>
              <div v-else>
                <svg viewBox="0 0 430 210" class="w-full" aria-label="Velocity chart">
                  <!-- osy -->
                  <line :x1="VX1" :y1="VY1" :x2="VX1" :y2="VY2" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
                  <line :x1="VX1" :y1="VY2" :x2="VX2" :y2="VY2" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
                  <!-- Y popisky -->
                  <text :x="VX1 - 5" :y="VY2 + 3" text-anchor="end" font-size="10" fill="#9ca3af">0</text>
                  <text :x="VX1 - 5" :y="(VY1 + VY2) / 2 + 3" text-anchor="end" font-size="10" fill="#9ca3af">{{ Math.round(maxVelocitySP / 2) }}</text>
                  <text :x="VX1 - 5" :y="VY1 + 3" text-anchor="end" font-size="10" fill="#9ca3af">{{ maxVelocitySP }}</text>
                  <!-- mřížka -->
                  <line :x1="VX1" :y1="(VY1 + VY2) / 2" :x2="VX2" :y2="(VY1 + VY2) / 2" stroke="currentColor" stroke-opacity="0.07" stroke-width="1" stroke-dasharray="4 4"/>
                  <!-- průměrná linie -->
                  <line v-if="avgVelocity > 0" :x1="VX1" :y1="velocityAvgY" :x2="VX2" :y2="velocityAvgY" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="5 3"/>
                  <text v-if="avgVelocity > 0" :x="VX2 + 4" :y="velocityAvgY + 4" font-size="9" fill="#8b5cf6">Ø {{ avgVelocity }}</text>
                  <!-- sloupcové grafy -->
                  <g v-for="(bar, i) in velocityBars" :key="i">
                    <rect
                      :x="vBarX(i) - velocityBarWidth / 2"
                      :y="vBarY(bar.sp)"
                      :width="velocityBarWidth"
                      :height="Math.max(0, VY2 - vBarY(bar.sp))"
                      fill="#3b82f6" fill-opacity="0.85" rx="3"
                    />
                    <text :x="vBarX(i)" :y="vBarY(bar.sp) - 5" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">{{ bar.sp }}</text>
                    <text :x="vBarX(i)" y="190" text-anchor="middle" font-size="9" fill="#9ca3af">{{ bar.name.length > 9 ? bar.name.slice(0, 9) + '…' : bar.name }}</text>
                  </g>
                </svg>
                <div class="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-2.5 rounded-sm bg-blue-500"/>&nbsp;SP dokončeno</span>
                  <span class="flex items-center gap-1.5"><span class="inline-block w-4 border-t-2 border-dashed border-purple-500"/>&nbsp;Průměr ({{ avgVelocity }} SP)</span>
                </div>
              </div>
            </div>

            <!-- Burndown chart -->
            <div>
              <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Burndown <span class="normal-case font-normal">(aktivní sprint)</span>
              </h3>
              <div v-if="!activeBurndownSprint" class="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <span class="i-heroicons-arrow-trending-down w-8 h-8 opacity-30" />
                Žádný aktivní sprint.<br>Spusťte sprint v záložce Sprinty.
              </div>
              <div v-else>
                <div class="flex gap-4 text-xs text-gray-500 mb-2 flex-wrap">
                  <span class="font-medium text-gray-700 dark:text-gray-300">{{ activeBurndownSprint.name }}</span>
                  <span>{{ activeBurndownSprint.startDate.toLocaleDateString('cs-CZ') }} – {{ activeBurndownSprint.endDate.toLocaleDateString('cs-CZ') }}</span>
                </div>
                <svg viewBox="0 0 430 210" class="w-full" aria-label="Burndown chart">
                  <!-- osy -->
                  <line :x1="VX1" :y1="VY1" :x2="VX1" :y2="VY2" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
                  <line :x1="VX1" :y1="VY2" :x2="VX2" :y2="VY2" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
                  <!-- Y popisky -->
                  <text :x="VX1 - 5" :y="VY2 + 3" text-anchor="end" font-size="10" fill="#9ca3af">0</text>
                  <text :x="VX1 - 5" :y="VY1 + 3" text-anchor="end" font-size="10" fill="#9ca3af">{{ burndown?.totalSP }}</text>
                  <!-- X popisky -->
                  <text :x="VX1" y="190" text-anchor="middle" font-size="9" fill="#9ca3af">Den 0</text>
                  <text :x="VX2" y="190" text-anchor="end" font-size="9" fill="#9ca3af">Den {{ burndown?.totalDays }}</text>
                  <!-- ideální linie -->
                  <line
                    :x1="burndownCoords.idealX1" :y1="burndownCoords.idealY1"
                    :x2="burndownCoords.idealX2" :y2="burndownCoords.idealY2"
                    stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="6 3"
                  />
                  <!-- vertikální čára „dnes" -->
                  <line v-if="burndown"
                    :x1="burndownCoords.cx" :y1="VY1"
                    :x2="burndownCoords.cx" :y2="VY2"
                    stroke="#6b7280" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="3 3"
                  />
                  <text v-if="burndown && burndown.elapsedDays > 0 && burndown.elapsedDays < burndown.totalDays"
                    :x="burndownCoords.cx" y="190" text-anchor="middle" font-size="9" fill="#6b7280"
                  >{{ burndown.elapsedDays }}</text>
                  <!-- aktuální bod -->
                  <circle
                    :cx="burndownCoords.cx" :cy="burndownCoords.cy" r="7"
                    :fill="burndownCoords.isAhead ? '#22c55e' : '#ef4444'"
                  />
                  <!-- bublina s hodnotou -->
                  <g v-if="burndown">
                    <rect
                      :x="Math.min(burndownCoords.cx - 38, VX2 - 76)"
                      :y="burndownCoords.cy - 30"
                      width="76" height="22" rx="4"
                      :fill="burndownCoords.isAhead ? '#22c55e' : '#ef4444'"
                      fill-opacity="0.9"
                    />
                    <text
                      :x="Math.min(burndownCoords.cx, VX2 - 38)"
                      :y="burndownCoords.cy - 14"
                      text-anchor="middle" font-size="11" font-weight="600" fill="white"
                    >{{ burndown.remainingSP }} SP zbývá</text>
                  </g>
                </svg>
                <div class="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span class="flex items-center gap-1.5"><span class="inline-block w-4 border-t-2 border-dashed border-gray-400"/>&nbsp;Ideální průběh</span>
                  <span class="flex items-center gap-1.5">
                    <span class="inline-block w-2.5 h-2.5 rounded-full" :class="burndownCoords.isAhead ? 'bg-green-500' : 'bg-red-500'"/>
                    &nbsp;{{ burndownCoords.isAhead ? 'Před plánem' : 'Za plánem' }}
                  </span>
                </div>
                <!-- SP statistiky -->
                <div class="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-2">
                    <div class="text-xl font-bold">{{ burndown?.totalSP }}</div>
                    <div class="text-xs text-gray-500">Celkem SP</div>
                  </div>
                  <div class="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                    <div class="text-xl font-bold text-green-600 dark:text-green-400">{{ burndown?.doneSP }}</div>
                    <div class="text-xs text-gray-500">Hotovo SP</div>
                  </div>
                  <div class="rounded-lg p-2" :class="burndown && burndown.remainingSP > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'">
                    <div class="text-xl font-bold" :class="burndown && burndown.remainingSP > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'">{{ burndown?.remainingSP }}</div>
                    <div class="text-xs text-gray-500">Zbývá SP</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </UCard>

        <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Úkoly se načítají z otevřených projektů. Pro sprint metriky otevřete projekt a záložku Sprinty.
        </p>
      </template>
    </template>
  </div>
</template>
