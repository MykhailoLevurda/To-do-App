<template>
  <div class="sprints-view space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Sprinty</h2>
      <UButton icon="i-heroicons-plus" @click="showCreateModal = true">
        Vytvořit sprint
      </UButton>
    </div>

    <!-- Aktivní sprint + report -->
    <div v-if="activeSprint" class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-green-50/50 dark:bg-green-900/10">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-medium flex items-center gap-2">
          <span class="i-heroicons-play-circle w-5 h-5 text-green-600" />
          {{ activeSprint.name }}
        </h3>
        <UButton size="xs" color="neutral" variant="soft" @click="closeSprintConfirm(activeSprint.id)">
          Uzavřít sprint
        </UButton>
      </div>
      <p v-if="activeSprint.goal" class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ activeSprint.goal }}</p>
      <div class="flex flex-wrap gap-4 text-sm mb-4">
        <span>Období: {{ formatDate(activeSprint.startDate) }} – {{ formatDate(activeSprint.endDate) }}</span>
        <span>Úkolů: {{ sprintTasks.length }} (hotových: {{ sprintTasksDone }})</span>
        <span>Story points: {{ sprintPointsTotal }} (dokončeno: {{ sprintPointsDone }})</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="task in sprintTasks"
          :key="task.id"
          class="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
        >
          <span class="flex-1 font-medium truncate">{{ task.title }}</span>
          <UBadge v-if="task.storyPoints" size="xs" color="neutral" variant="soft">{{ task.storyPoints }} b</UBadge>
          <UBadge v-if="isTaskDone(task)" color="success" size="xs">Hotovo</UBadge>
          <UButton size="xs" variant="ghost" icon="i-heroicons-eye" @click="$emit('select-task', task)" />
          <UButton size="xs" variant="ghost" color="red" icon="i-heroicons-x-mark" title="Odebrat ze sprintu" @click="removeFromSprint(task.id)" />
        </div>
      </div>
    </div>

    <!-- Úkoly bez sprintu – přidat do aktivního sprintu -->
    <div v-if="activeSprint && backlogWithoutSprint.length > 0" class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4">
      <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Přidat do sprintu „{{ activeSprint.name }}“</h3>
      <div class="space-y-1">
        <div
          v-for="task in backlogWithoutSprint"
          :key="task.id"
          class="flex items-center gap-2 py-1.5"
        >
          <span class="flex-1 truncate text-sm">{{ task.title }}</span>
          <UButton size="xs" variant="soft" @click="addToSprint(task.id)">
            Přidat do sprintu
          </UButton>
        </div>
      </div>
    </div>

    <!-- Seznam všech sprintů -->
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Všechny sprinty</h3>
      <div
        v-for="sprint in sprints"
        :key="sprint.id"
        class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div>
          <span class="font-medium">{{ sprint.name }}</span>
          <span class="text-sm text-gray-500 ml-2">{{ formatDate(sprint.startDate) }} – {{ formatDate(sprint.endDate) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="sprint.status === 'active' ? 'success' : sprint.status === 'closed' ? 'neutral' : 'primary'"
            variant="soft"
            size="xs"
          >
            {{ statusLabel(sprint.status) }}
          </UBadge>
          <UButton
            v-if="sprint.status === 'planned'"
            size="xs"
            variant="soft"
            @click="startSprint(sprint.id)"
          >
            Spustit
          </UButton>
          <UButton
            v-if="sprint.status === 'active'"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="closeSprintConfirm(sprint.id)"
          >
            Uzavřít
          </UButton>
        </div>
      </div>
      <p v-if="sprints.length === 0" class="text-sm text-gray-500 py-4">Zatím žádné sprinty. Vytvořte první sprint.</p>
    </div>

    <!-- Modal: Vytvořit sprint -->
    <UModal v-model="showCreateModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Nový sprint</h3>
        </template>
        <form class="space-y-4" @submit.prevent="createSprint">
          <UFormGroup label="Název" required>
            <UInput v-model="newSprint.name" placeholder="např. Sprint 1" required />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Začátek" required>
              <input
                v-model="newSprint.startDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </UFormGroup>
            <UFormGroup label="Konec" required>
              <input
                v-model="newSprint.endDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </UFormGroup>
          </div>
          <UFormGroup label="Cíl sprintu (volitelně)">
            <UTextarea v-model="newSprint.goal" placeholder="Čeho chcete ve sprintu dosáhnout?" rows="2" />
          </UFormGroup>
          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" type="button" @click="showCreateModal = false">Zrušit</UButton>
            <UButton type="submit" :loading="isCreating">Vytvořit sprint</UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- Potvrzení uzavření sprintu -->
    <UModal v-model="showCloseConfirm">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Uzavřít sprint</h3>
        </template>
        <p class="text-gray-600 dark:text-gray-400">Opravdu chcete uzavřít tento sprint? Úkoly zůstanou v projektu, jen se odeberou ze sprintu.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showCloseConfirm = false">Zrušit</UButton>
            <UButton color="primary" :loading="isClosing" @click="doCloseSprint">Uzavřít sprint</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Sprint } from '~/types';
import type { TaskItem } from '~/stores/todos';

const props = defineProps<{
  projectId: string;
}>();

defineEmits<{
  'select-task': [task: TaskItem];
}>();

const scrumBoard = useScrumBoardStore();
const firestoreTasks = useFirestoreTasks();
const toast = useToast();

const sprintsApi = useSprints(computed(() => props.projectId));
const { sprints, activeSprint, startListening, stopListening, addSprint, startSprint: apiStartSprint, closeSprint: apiCloseSprint } = sprintsApi;

onMounted(() => {
  if (props.projectId) startListening();
});
onUnmounted(() => {
  stopListening();
});
watch(() => props.projectId, (id) => {
  if (id) startListening();
  else stopListening();
});

const projectTasks = computed(() =>
  scrumBoard.tasks.filter((t) => t.projectId === props.projectId)
);
const sprintTasks = computed(() => {
  const active = activeSprint.value;
  if (!active) return [];
  return projectTasks.value.filter((t) => t.sprintId === active.id);
});
const sprintTasksDone = computed(() => {
  const cols = useProjectsStore().getProjectById(props.projectId)?.statuses;
  const doneId = cols && cols.length > 0 ? cols[cols.length - 1]?.id : 'done';
  return sprintTasks.value.filter((t) => t.status === doneId).length;
});
const sprintPointsTotal = computed(() =>
  sprintTasks.value.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
);
const sprintPointsDone = computed(() => {
  const cols = useProjectsStore().getProjectById(props.projectId)?.statuses;
  const doneId = cols && cols.length > 0 ? cols[cols.length - 1]?.id : 'done';
  return sprintTasks.value
    .filter((t) => t.status === doneId)
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
});

const backlogWithoutSprint = computed(() =>
  projectTasks.value.filter((t) => !t.sprintId || t.sprintId === '')
);

function isTaskDone(task: TaskItem): boolean {
  const cols = useProjectsStore().getProjectById(props.projectId)?.statuses;
  const doneId = cols && cols.length > 0 ? cols[cols.length - 1]?.id : 'done';
  return task.status === doneId;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { planned: 'Plánován', active: 'Aktivní', closed: 'Uzavřen' };
  return map[status] ?? status;
}

const showCreateModal = ref(false);
const isCreating = ref(false);
const newSprint = ref({ name: '', startDate: '', endDate: '', goal: '' });

async function createSprint() {
  if (!newSprint.value.name.trim() || !newSprint.value.startDate || !newSprint.value.endDate) {
    toast.add({ title: 'Vyplňte název a období sprintu', color: 'amber' });
    return;
  }
  isCreating.value = true;
  const id = await addSprint({
    name: newSprint.value.name.trim(),
    startDate: new Date(newSprint.value.startDate),
    endDate: new Date(newSprint.value.endDate),
    goal: newSprint.value.goal?.trim() || undefined
  });
  isCreating.value = false;
  if (id) {
    showCreateModal.value = false;
    newSprint.value = { name: '', startDate: '', endDate: '', goal: '' };
    toast.add({ title: 'Sprint byl vytvořen', color: 'green' });
  } else {
    toast.add({ title: 'Nepodařilo se vytvořit sprint', color: 'red' });
  }
}

async function startSprint(sprintId: string) {
  const ok = await apiStartSprint(sprintId);
  if (ok) toast.add({ title: 'Sprint byl spuštěn', color: 'green' });
  else toast.add({ title: 'Nepodařilo se spustit sprint', color: 'red' });
}

const showCloseConfirm = ref(false);
const sprintToClose = ref<string | null>(null);
const isClosing = ref(false);

function closeSprintConfirm(sprintId: string) {
  sprintToClose.value = sprintId;
  showCloseConfirm.value = true;
}

async function doCloseSprint() {
  if (!sprintToClose.value) return;
  isClosing.value = true;
  const ok = await apiCloseSprint(sprintToClose.value);
  isClosing.value = false;
  showCloseConfirm.value = false;
  sprintToClose.value = null;
  if (ok) toast.add({ title: 'Sprint byl uzavřen', color: 'green' });
  else toast.add({ title: 'Nepodařilo se uzavřít sprint', color: 'red' });
}

async function addToSprint(taskId: string) {
  const active = activeSprint.value;
  if (!active) return;
  const ok = await firestoreTasks.updateTask(taskId, { sprintId: active.id });
  if (ok) {
    scrumBoard.updateTask(taskId, { sprintId: active.id });
    toast.add({ title: 'Úkol byl přidán do sprintu', color: 'green' });
  } else {
    toast.add({ title: 'Nepodařilo se přidat úkol do sprintu', color: 'red' });
  }
}

async function removeFromSprint(taskId: string) {
  const ok = await firestoreTasks.updateTask(taskId, { sprintId: undefined });
  if (ok) {
    scrumBoard.updateTask(taskId, { sprintId: undefined });
    toast.add({ title: 'Úkol byl odebrán ze sprintu', color: 'green' });
  } else {
    toast.add({ title: 'Nepodařilo se odebrat úkol ze sprintu', color: 'red' });
  }
}
</script>
