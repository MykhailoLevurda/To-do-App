<template>
  <div class="backlog-view">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Backlog</h2>
      <p class="text-sm text-gray-500">
        Úkoly v prvním sloupci ({{ firstStatusTitle }}). Tažením změníte pořadí.
      </p>
    </div>

    <div v-if="!firstStatusId" class="text-center py-12 text-gray-500">
      <p>Projekt nemá žádné stavy. Přidejte stavy v nastavení projektu.</p>
    </div>

    <div
      v-else
      class="space-y-2"
      data-backlog-list
      @drop="onDrop"
      @dragover.prevent
      @dragenter.prevent
    >
      <div
        v-for="(task, index) in sortedBacklogTasks"
        :key="task.id"
        draggable="true"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-grab active:cursor-grabbing"
        :data-task-id="task.id"
        @dragstart="onDragStart($event, task, index)"
        @dragend="onDragEnd"
      >
        <span class="text-gray-400 select-none w-6">{{ index + 1 }}.</span>
        <div class="i-heroicons-bars-3 w-4 h-4 text-gray-400 shrink-0" />
        <div class="flex-1 min-w-0">
          <span class="font-medium">{{ task.title }}</span>
          <div v-if="task.assignee || task.storyPoints" class="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span v-if="task.assignee">{{ task.assignee }}</span>
            <span v-if="task.storyPoints">Body: {{ task.storyPoints }}</span>
          </div>
        </div>
        <UBadge v-if="task.priority" :color="priorityColor(task.priority)" variant="soft" size="xs" />
        <UButton
          icon="i-heroicons-eye"
          size="xs"
          variant="ghost"
          @click="$emit('select', task)"
        >
          Otevřít
        </UButton>
      </div>

      <div
        v-if="sortedBacklogTasks.length === 0"
        class="text-center py-12 text-gray-500 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
      >
        <div class="i-heroicons-clipboard-document-list w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>Žádné úkoly v backlogu</p>
        <p class="text-sm mt-1">Přesuňte úkoly do prvního sloupce na boardu.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectStatus } from '~/types';
import type { TaskItem } from '~/stores/todos';
import { DEFAULT_PROJECT_STATUSES } from '~/composables/useFirestoreProjects';

const props = defineProps<{
  projectId: string;
}>();

defineEmits<{
  select: [task: TaskItem];
}>();

const projectsStore = useProjectsStore();
const scrumBoard = useScrumBoardStore();
const firestoreTasks = useFirestoreTasks();

const currentProject = computed(() => projectsStore.getProjectById(props.projectId));

const columns = computed((): ProjectStatus[] => {
  const p = currentProject.value;
  if (!p?.statuses || p.statuses.length === 0) return DEFAULT_PROJECT_STATUSES;
  return p.statuses;
});

const firstStatusId = computed(() => columns.value[0]?.id ?? null);
const firstStatusTitle = computed(() => columns.value[0]?.title ?? 'Backlog');

const backlogTasks = computed(() => {
  const id = firstStatusId.value;
  if (!id) return [];
  return scrumBoard.tasks.filter(
    (t) => t.projectId === props.projectId && t.status === id
  );
});

const sortedBacklogTasks = computed(() => {
  const list = [...backlogTasks.value];
  list.sort((a, b) => {
    const oa = a.backlogOrder ?? 0;
    const ob = b.backlogOrder ?? 0;
    if (oa !== ob) return oa - ob;
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });
  return list;
});

let draggedTaskId: string | null = null;
let draggedIndex = -1;

function onDragStart(e: DragEvent, task: TaskItem, index: number) {
  draggedTaskId = task.id;
  draggedIndex = index;
  e.dataTransfer!.effectAllowed = 'move';
  e.dataTransfer!.setData('text/plain', task.id);
  (e.target as HTMLElement).classList.add('opacity-50');
}

function onDragEnd(e: DragEvent) {
  (e.target as HTMLElement).classList.remove('opacity-50');
  draggedTaskId = null;
  draggedIndex = -1;
}

async function onDrop(e: DragEvent) {
  e.preventDefault();
  const listEl = (e.currentTarget as HTMLElement);
  listEl.querySelectorAll('[data-task-id]').forEach((el) => el.classList.remove('ring-2', 'ring-primary'));
  if (!draggedTaskId) return;
  const targetEl = (e.target as HTMLElement).closest('[data-task-id]');
  if (!targetEl) return;
  const targetTaskId = targetEl.getAttribute('data-task-id');
  if (!targetTaskId || targetTaskId === draggedTaskId) return;

  const ordered = sortedBacklogTasks.value.map((t) => t.id);
  const fromIdx = ordered.indexOf(draggedTaskId);
  const toIdx = ordered.indexOf(targetTaskId);
  if (fromIdx === -1 || toIdx === -1) return;

  const moved = ordered.splice(fromIdx, 1)[0];
  ordered.splice(toIdx, 0, moved);

  const toast = useToast();
  try {
    for (let i = 0; i < ordered.length; i++) {
      await firestoreTasks.updateTask(ordered[i], { backlogOrder: i });
      scrumBoard.updateTask(ordered[i], { backlogOrder: i });
    }
    toast.add({ title: 'Pořadí backlogu uloženo', color: 'green' });
  } catch {
    toast.add({ title: 'Nepodařilo se uložit pořadí', color: 'red' });
  }
  draggedTaskId = null;
  draggedIndex = -1;
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'green';
    default: return 'gray';
  }
}
</script>
