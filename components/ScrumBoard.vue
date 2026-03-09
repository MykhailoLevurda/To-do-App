<template>
  <div class="scrum-board">
    <!-- Panel detailu úkolu zleva (Freelo styl) -->
    <TaskDetailPanel
      :task="selectedTask"
      :is-open="!!selectedTask"
      :completed-status-id="completedColumn?.id ?? 'done'"
      :first-status-id="workColumns[0]?.id ?? 'todo'"
      @close="selectedTask = null"
      @edit="editTask"
      @delete="deleteTask"
      @move="moveTask"
    />

    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Scrum Board</h1>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-arrow-path"
            variant="outline"
            @click="refreshTasks"
            :loading="scrumBoard.isLoading"
            title="Obnovit úkoly"
          >
            Obnovit
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            @click="openAddTaskModal"
          >
            Nový úkol
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ projectTasks.length }}</div>
            <div class="text-sm text-gray-500">Celkem úkolů</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">{{ columns.length }}</div>
            <div class="text-sm text-gray-500">Stavů</div>
          </div>
        </UCard>
      </div>
    </div>

    <div v-if="scrumBoard.isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p class="text-gray-500">Načítám úkoly...</p>
      </div>
    </div>

    <div v-else-if="columns.length" class="md:overflow-x-auto md:overflow-y-hidden pb-2 -mx-1 px-1 md:scroll-smooth">
      <div class="flex flex-col gap-4 md:flex-row md:flex-nowrap md:min-w-max md:gap-6">
        <!-- Pracovní sloupce -->
        <div
          v-for="column in workColumns"
          :key="column.id"
          class="column w-full min-w-0 md:w-[280px] md:min-w-[280px] md:flex-shrink-0"
        >
          <UCard class="h-full">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: column.color || '#9ca3af' }"
                  />
                  <h3 class="font-semibold">{{ column.title }}</h3>
                  <UBadge color="neutral" variant="soft">
                    {{ tasksByStatus(column.id).length }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div
              class="space-y-3 min-h-[400px] drop-zone"
              @drop="handleDrop($event, column.id)"
              @dragover.prevent="handleDragOver($event)"
              @dragenter.prevent="handleDragEnter($event)"
              @dragleave="handleDragLeave($event)"
            >
              <TaskCard
                v-for="task in tasksByStatus(column.id)"
                :key="task.id"
                :task="task"
                @select="selectedTask = $event"
                @edit="editTask"
                @delete="deleteTask"
                @move="moveTask"
              />
              <div
                v-if="tasksByStatus(column.id).length === 0"
                class="text-center text-gray-500 dark:text-gray-400 py-8"
              >
                <div class="i-heroicons-clipboard-document-list w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-300" />
                <p>Žádné úkoly</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Hotové úkoly – vpravo, šedé pozadí, přeškrtnuté -->
        <div
          v-if="completedColumn"
          class="column w-full min-w-0 md:w-[280px] md:min-w-[280px] md:flex-shrink-0"
        >
        <UCard class="h-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0 opacity-70"
                  :style="{ backgroundColor: completedColumn.color || '#9ca3af' }"
                />
                <h3 class="font-semibold text-gray-600 dark:text-gray-400">{{ completedColumn.title }}</h3>
                <UBadge color="neutral" variant="soft">
                  {{ tasksByStatus(completedColumn.id).length }}
                </UBadge>
              </div>
            </div>
          </template>

          <div
            class="space-y-3 min-h-[400px] drop-zone completed-column"
            @drop="handleDrop($event, completedColumn.id)"
            @dragover.prevent="handleDragOver($event)"
            @dragenter.prevent="handleDragEnter($event)"
            @dragleave="handleDragLeave($event)"
          >
            <TaskCard
              v-for="task in tasksByStatus(completedColumn.id)"
              :key="task.id"
              :task="task"
              :completed="true"
              @select="selectedTask = $event"
              @edit="editTask"
              @delete="deleteTask"
              @move="moveTask"
            />
            <div
              v-if="tasksByStatus(completedColumn.id).length === 0"
              class="text-center text-gray-500 dark:text-gray-400 py-8"
            >
              <div class="i-heroicons-check-circle w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-300" />
              <p>Žádné hotové úkoly</p>
            </div>
          </div>
        </UCard>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-12 text-gray-500">
      <p>Projekt nemá žádné stavy úkolů.</p>
      <p class="text-sm mt-1">Upravte projekt a přidejte stavy (sloupce) v sekci „Stavy úkolů“.</p>
    </div>

    <!-- Add Task Modal -->
    <UModal v-model="showAddTaskModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Nový úkol</h3>
        </template>

        <UForm id="addTaskForm" :state="newTask" @submit="addTask" class="space-y-4">
          <UFormGroup label="Název" required>
            <UInput v-model="newTask.title" placeholder="Název úkolu" :disabled="isAddingTask" />
          </UFormGroup>

          <UFormGroup label="Popis">
            <UTextarea v-model="newTask.description" placeholder="Popis úkolu" :disabled="isAddingTask" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Priorita">
              <USelect
                v-model="newTask.priority"
                :options="priorityOptions"
                placeholder="Priorita"
              />
            </UFormGroup>
            <UFormGroup label="Body (story points)">
              <UInput
                v-model.number="newTask.storyPoints"
                type="number"
                placeholder="0"
                min="0"
                max="100"
              />
            </UFormGroup>
          </div>

          <UFormGroup v-if="statusOptions.length" label="Stav">
            <USelect
              v-model="newTask.status"
              :options="statusOptions"
              placeholder="Vyberte stav"
            />
          </UFormGroup>

          <UFormGroup label="Řešitel">
            <UInput
              v-model="newTask.assignee"
              :placeholder="currentUserDisplayName || 'Jméno řešitele'"
            />
            <p v-if="currentUserDisplayName" class="text-xs text-gray-500 mt-1">
              Přihlášen: {{ currentUserDisplayName }}
            </p>
          </UFormGroup>

          <UFormGroup label="Termín">
            <input
              v-model="newTask.dueDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900"
            />
          </UFormGroup>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showAddTaskModal = false" :disabled="isAddingTask">Zrušit</UButton>
            <UButton form="addTaskForm" type="submit" :disabled="!newTask.title.trim() || isAddingTask" :loading="isAddingTask">
              Vytvořit úkol
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Edit Task Modal -->
    <UModal v-model="showEditTaskModal">
      <UCard v-if="editingTask">
        <template #header>
          <h3 class="text-lg font-semibold">Upravit úkol</h3>
        </template>

        <UForm id="editTaskForm" :state="editingTask" @submit="updateTask" class="space-y-4">
          <UFormGroup label="Název" required>
            <UInput v-model="editingTask.title" />
          </UFormGroup>

          <UFormGroup label="Popis">
            <UTextarea v-model="editingTask.description" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Priorita">
              <USelect
                v-model="editingTask.priority"
                :options="priorityOptions"
              />
            </UFormGroup>
            <UFormGroup v-if="statusOptions.length" label="Stav">
              <USelect
                v-model="editingTask.status"
                :options="statusOptions"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Řešitel">
            <UInput v-model="editingTask.assignee" placeholder="Jméno řešitele" />
          </UFormGroup>

          <UFormGroup label="Termín">
            <input
              v-model="editingTask.dueDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-900"
            />
          </UFormGroup>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showEditTaskModal = false">Zrušit</UButton>
            <UButton form="editTaskForm" type="submit">Uložit</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';
import type { ProjectStatus } from '~/types';
import { DEFAULT_PROJECT_STATUSES } from '~/composables/useFirestoreProjects';

const props = defineProps<{
  projectId: string;
  /** Kdyz prijde z Backlogu "Otevrit", otevrit tento ukol v panelu */
  openTaskId?: string | null;
}>();

const emit = defineEmits<{
  'clear-open-task-id': [];
}>();

const projectsStore = useProjectsStore();
const scrumBoard = useScrumBoardStore();
const auth = useAuth();
const firestoreTasks = useFirestoreTasks();

const currentProject = computed(() => projectsStore.getProjectById(props.projectId));

const columns = computed((): ProjectStatus[] => {
  const p = currentProject.value;
  if (!p?.statuses || p.statuses.length === 0) return DEFAULT_PROJECT_STATUSES;
  return p.statuses;
});

/** Pracovní sloupce (všechny kromě posledního) */
const workColumns = computed(() => {
  const cols = columns.value;
  if (cols.length <= 1) return cols;
  return cols.slice(0, -1);
});

/** Poslední sloupec = hotové úkoly (zobrazí se vpravo zvlášť) */
const completedColumn = computed(() => {
  const cols = columns.value;
  if (cols.length < 2) return null;
  return cols[cols.length - 1];
});

const projectTasks = computed(() => {
  return scrumBoard.tasks.filter(task => task.projectId === props.projectId);
});

const tasksByStatus = (statusId: string) => {
  return projectTasks.value.filter(task => task.status === statusId);
};

const showAddTaskModal = ref(false);
const showEditTaskModal = ref(false);
const editingTask = ref<TaskItem | null>(null);
const isAddingTask = ref(false);
const selectedTask = ref<TaskItem | null>(null);

const pendingOpenTaskId = ref<string | null>(null);
watch(
  () => props.openTaskId,
  (id) => {
    pendingOpenTaskId.value = id || null;
  },
  { immediate: true }
);
watch(
  () => [pendingOpenTaskId.value, projectTasks.value] as const,
  ([id, tasks]) => {
    if (!id || !tasks?.length) return;
    const task = tasks.find((t: TaskItem) => t.id === id);
    if (task) {
      selectedTask.value = task;
      pendingOpenTaskId.value = null;
      emit('clear-open-task-id');
    }
  },
  { immediate: true }
);

const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  assignee: '',
  storyPoints: 0,
  status: '', // vyplníme při otevření modalu z prvního sloupce
  dueDate: ''
});

const priorityOptions = [
  { label: 'Nízká', value: 'low' },
  { label: 'Střední', value: 'medium' },
  { label: 'Vysoká', value: 'high' }
];

const statusOptions = computed(() =>
  columns.value.map(col => ({ label: col.title, value: col.id }))
);

const currentUserDisplayName = computed(() => {
  if (!auth.user.value) return null;
  return auth.user.value.displayName || auth.user.value.email || null;
});

function openAddTaskModal() {
  if (auth.user.value) {
    newTask.value.assignee = auth.user.value.displayName || auth.user.value.email || '';
  }
  newTask.value.status = columns.value[0]?.id ?? '';
  showAddTaskModal.value = true;
}

async function addTask() {
  const title = newTask.value.title?.trim();
  if (!title) return;
  if (!auth.isAuthenticated) {
    const toast = useToast();
    toast.add({ title: 'Pro přidání úkolu se přihlaste', color: 'red' });
    return;
  }

  isAddingTask.value = true;
  const toast = useToast();

  try {
    const statusId = newTask.value.status || columns.value[0]?.id;
    if (!statusId) {
      toast.add({ title: 'Projekt nemá žádné stavy. Nejdřív upravte projekt a přidejte stavy.', color: 'red' });
      isAddingTask.value = false;
      return;
    }
    const firstStatusId = columns.value[0]?.id;
    const backlogTasks = firstStatusId
      ? projectTasks.value.filter((t) => t.status === firstStatusId)
      : [];
    const maxOrder = backlogTasks.length
      ? Math.max(...backlogTasks.map((t) => t.backlogOrder ?? 0), 0)
      : 0;
    const id = await firestoreTasks.addTask({
      title,
      description: newTask.value.description?.trim(),
      priority: newTask.value.priority,
      assignee: newTask.value.assignee?.trim(),
      storyPoints: newTask.value.storyPoints ?? 0,
      status: statusId,
      projectId: props.projectId,
      dueDate: newTask.value.dueDate ? new Date(newTask.value.dueDate) : undefined,
      backlogOrder: firstStatusId === statusId ? maxOrder + 1 : 0
    });
    if (id) {
      newTask.value = {
        title: '',
        description: '',
        priority: 'medium',
        assignee: '',
        storyPoints: 0,
        status: columns.value[0]?.id ?? '',
        dueDate: ''
      };
      showAddTaskModal.value = false;
      toast.add({ title: 'Úkol byl vytvořen', color: 'green' });
    } else {
      toast.add({ title: 'Nepodařilo se vytvořit úkol', color: 'red' });
    }
  } catch (error: any) {
    console.error('[ScrumBoard] Error adding task:', error);
    toast.add({ title: error.message || 'Chyba při vytváření úkolu', color: 'red' });
  } finally {
    isAddingTask.value = false;
  }
}

function editTask(task: TaskItem) {
  const taskCopy: any = { ...task };
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    taskCopy.dueDate = d.toISOString().split('T')[0];
  }
  editingTask.value = taskCopy;
  showEditTaskModal.value = true;
}

async function updateTask() {
  if (!editingTask.value) return;
  const taskId = editingTask.value.id;
  const updates: Partial<TaskItem> = {
    title: editingTask.value.title,
    description: editingTask.value.description,
    priority: editingTask.value.priority,
    assignee: editingTask.value.assignee,
    storyPoints: editingTask.value.storyPoints,
    status: editingTask.value.status
  };
  if (editingTask.value.dueDate) {
    updates.dueDate = typeof editingTask.value.dueDate === 'string'
      ? new Date(editingTask.value.dueDate)
      : editingTask.value.dueDate;
  } else {
    updates.dueDate = undefined;
  }
  const ok = await firestoreTasks.updateTask(taskId, updates);
  if (ok) {
    showEditTaskModal.value = false;
    editingTask.value = null;
  } else {
    alert('Nepodařilo se uložit změny.');
  }
}

async function deleteTask(taskId: string) {
  if (!confirm('Opravdu chcete smazat tento úkol?')) return;
  const ok = await firestoreTasks.deleteTask(taskId);
  if (!ok) {
    alert('Nepodařilo se smazat úkol.');
  }
}

async function moveTask(taskId: string, newStatus: string) {
  const ok = await firestoreTasks.updateTaskStatus(taskId, newStatus);
  if (ok) {
    scrumBoard.updateTaskStatus(taskId, newStatus);
  } else {
    alert('Nepodařilo se změnit stav úkolu.');
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.classList.add('drag-over');
  }
}

function handleDragLeave(event: DragEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return;
    event.currentTarget.classList.remove('drag-over');
  }
}

async function handleDrop(event: DragEvent, targetStatus: string) {
  event.preventDefault();
  event.stopPropagation();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.classList.remove('drag-over');
  }
  const taskId = event.dataTransfer?.getData('text/plain');
  if (!taskId) return;

  const task = scrumBoard.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.status === targetStatus) return;

  const originalStatus = task.status;
  scrumBoard.updateTaskStatus(taskId, targetStatus);

  const ok = await firestoreTasks.updateTaskStatus(taskId, targetStatus);
  if (!ok) {
    scrumBoard.updateTaskStatus(taskId, originalStatus);
    alert('Nepodařilo se změnit stav úkolu.');
  }
}

function refreshTasks() {
  firestoreTasks.startListening(props.projectId);
}

onMounted(() => {
  if (auth.isAuthenticated && props.projectId) {
    firestoreTasks.startListening(props.projectId);
  }
});

watch(() => [auth.isAuthenticated, props.projectId], ([isAuth, pid]) => {
  if (isAuth && pid) {
    firestoreTasks.startListening(pid as string);
  } else {
    firestoreTasks.stopListening();
    scrumBoard.clearTasks();
  }
}, { immediate: false });
</script>

<style scoped>
.column {
  min-height: 500px;
}

.drop-zone {
  transition: background-color 0.2s, border-color 0.2s;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.drop-zone.drag-over {
  background-color: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
}
</style>
