<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline';
import type { ProjectTimeEntry } from '~/composables/useProjectTime';
import type { Project } from '~/types';

const auth = useAuth();
const projectsStore = useProjectsStore();
const projectTime = useProjectTime();
const firestoreProjects = useFirestoreProjects();

const loading = ref(true);
const error = ref('');

/** Pro majitele: aktivita po projektech (všechny záznamy v jeho projektech). */
const activityByProject = ref<{ project: Project; entries: ProjectTimeEntry[] }[]>([]);
/** Vlastní aktivita – načítáme vždy, aby se čas vždy zobrazil. */
const myActivity = ref<ProjectTimeEntry[]>([]);
const isOwnerView = ref(false);

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

function getUserDisplayName(entry: ProjectTimeEntry, project: Project): string {
  if (auth.user.value && entry.userId === auth.user.value.uid) return 'Vy';
  const member = project.teamMembers?.find((m) => m.userId === entry.userId);
  if (member) return member.displayName || member.email || 'Uživatel';
  return `Uživatel (…${entry.userId.slice(-6)})`;
}

async function loadActivity() {
  if (!auth.user.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await firestoreProjects.startListening();
    const uid = auth.user.value!.uid;
    const owned = projectsStore.projects.filter((p) => p.createdBy === uid);

    const myEntries = await projectTime.getMyActivity();
    myActivity.value = myEntries;

    if (owned.length > 0) {
      isOwnerView.value = true;
      const list: { project: Project; entries: ProjectTimeEntry[] }[] = [];
      for (const project of owned) {
        const entries = await projectTime.getActivityByProjectId(project.id);
        if (entries.length > 0) list.push({ project, entries });
      }
      activityByProject.value = list;
    } else {
      isOwnerView.value = false;
    }
  } catch (e: any) {
    console.warn('[Activity] load failed:', e);
    error.value = e?.message || 'Nepodařilo se načíst aktivitu. Zkontrolujte oprávnění ve Firestore.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadActivity());
watch(() => auth.user.value?.uid, () => loadActivity());
</script>

<template>
  <div class="activity-page">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <ClockIcon class="w-8 h-8" />
          Aktivita
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Čas strávený u projektů (timer v horní liště při otevření projektu).
          {{ isOwnerView ? 'Jako majitel projektů vidíte aktivitu všech uživatelů.' : 'Zobrazuje se pouze vaše aktivita.' }}
        </p>
      </div>
      <UButton
        v-if="auth.user.value && !loading"
        icon="i-heroicons-arrow-path"
        variant="outline"
        size="sm"
        @click="loadActivity"
      >
        Obnovit
      </UButton>
    </div>

    <div v-if="!auth.user.value" class="rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
      Pro zobrazení aktivity se přihlaste.
    </div>

    <div v-else-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="i-heroicons-arrow-path w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p class="text-gray-500">Načítám aktivitu…</p>
      </div>
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300">
      {{ error }}
    </div>

    <!-- Majitel: aktivita po projektech -->
    <div v-else-if="isOwnerView && activityByProject.length > 0" class="space-y-6">
      <UCard v-for="{ project, entries } in activityByProject" :key="project.id">
        <template #header>
          <div class="flex items-center gap-2">
            <div
              class="w-3 h-3 rounded-full shrink-0"
              :style="{ backgroundColor: project.color }"
            />
            <span class="font-semibold">{{ project.name }}</span>
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 pr-4 font-medium">Uživatel</th>
                <th class="text-right py-2 font-medium">Celkový čas</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(entry, i) in entries"
                :key="entry.userId + entry.projectId"
                class="border-b border-gray-100 dark:border-gray-800"
                :class="{ 'bg-primary-50 dark:bg-primary-950/30': entry.userId === auth.user?.uid }"
              >
                <td class="py-2 pr-4">{{ getUserDisplayName(entry, project) }}</td>
                <td class="py-2 text-right font-mono tabular-nums">{{ formatDuration(entry.totalSeconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Nemajitel nebo majitel bez záznamů: vlastní aktivita -->
    <div v-else class="space-y-4">
      <UCard v-if="myActivity.length > 0">
        <template #header>
          <span class="font-semibold">Vaše aktivita</span>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 pr-4 font-medium">Projekt</th>
                <th class="text-right py-2 font-medium">Celkový čas</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in myActivity"
                :key="entry.projectId"
                class="border-b border-gray-100 dark:border-gray-800"
              >
                <td class="py-2 pr-4">
                  {{ projectsStore.getProjectById(entry.projectId)?.name ?? 'Neznámý projekt' }}
                </td>
                <td class="py-2 text-right font-mono tabular-nums">{{ formatDuration(entry.totalSeconds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
      <template v-else>
        <p v-if="isOwnerView" class="text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          V žádném z vašich projektů zatím není zaznamenaná aktivita. Čas se započítá, až někdo v projektu spustí timer a zastaví ho.
        </p>
        <p v-else class="text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          Zatím žádná aktivita. Otevřete projekt a spusťte timer v horní liště.
        </p>
      </template>
    </div>
  </div>
</template>
