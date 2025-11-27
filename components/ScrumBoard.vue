<template>
  <div class="scrum-board">
    <!-- Header with stats -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Scrum Board</h1>
        <UButton
          icon="i-heroicons-plus"
          @click="openAddTaskModal"
        >
          Add Task
        </UButton>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ projectTasks.length }}</div>
            <div class="text-sm text-gray-500">Total Tasks</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ tasksByStatus('in-progress').length }}</div>
            <div class="text-sm text-gray-500">In Progress</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ tasksByStatus('done').length }}</div>
            <div class="text-sm text-gray-500">Completed</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">
              {{ Math.round((tasksByStatus('done').length / Math.max(projectTasks.length, 1)) * 100) }}%
            </div>
            <div class="text-sm text-gray-500">Progress</div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="scrumBoard.isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p class="text-gray-500">Načítám úkoly...</p>
      </div>
    </div>

    <!-- Kanban Board -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div
        v-for="column in scrumBoard.columns"
        :key="column.id"
        class="column"
        @drop="handleDrop($event, column.status)"
        @dragover.prevent
        @dragenter.prevent
      >
        <UCard class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full"
                  :class="`bg-${column.color}-500`"
                ></div>
                <h3 class="font-semibold">{{ column.title }}</h3>
                <UBadge :color="column.color" variant="soft">
                  {{ tasksByStatus(column.status).length }}
                </UBadge>
              </div>
            </div>
          </template>

          <div class="space-y-3 min-h-[400px]">
            <TaskCard
              v-for="task in tasksByStatus(column.status)"
              :key="task.id"
              :task="task"
              @edit="editTask"
              @delete="deleteTask"
              @move="moveTask"
            />
            
            <!-- Empty state -->
            <div 
              v-if="tasksByStatus(column.status).length === 0"
              class="text-center text-gray-500 dark:text-gray-400 py-8"
            >
                <ClipboardDocumentListIcon class="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-300" />
              <p>No tasks in this column</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Add Task Modal -->
    <UModal v-model="showAddTaskModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add New Task</h3>
        </template>

        <UForm id="addTaskForm" :state="newTask" @submit="addTask" class="space-y-4">
          <UFormGroup label="Title" required>
            <UInput v-model="newTask.title" placeholder="Enter task title" />
          </UFormGroup>

          <UFormGroup label="Description">
            <UTextarea v-model="newTask.description" placeholder="Enter task description" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Priority">
              <USelect
                v-model="newTask.priority"
                :options="priorityOptions"
                placeholder="Select priority"
              />
            </UFormGroup>

            <UFormGroup label="Story Points">
              <UInput
                v-model.number="newTask.storyPoints"
                type="number"
                placeholder="0"
                min="0"
                max="100"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Řešitel">
            <UInput 
              v-model="newTask.assignee" 
              :placeholder="currentUserDisplayName || 'Zadejte jméno řešitele'"
              :disabled="false"
            />
            <p v-if="currentUserDisplayName" class="text-xs text-gray-500 mt-1">
              Aktuálně přihlášen: {{ currentUserDisplayName }}
            </p>
          </UFormGroup>

          <UFormGroup label="Termín dokončení">
            <input
              v-model="newTask.dueDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </UFormGroup>

        </UForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showAddTaskModal = false">
              Zrušit
            </UButton>
            <UButton form="addTaskForm" type="submit" :disabled="!newTask.title">
              Potvrdit
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Edit Task Modal -->
    <UModal v-model="showEditTaskModal">
      <UCard v-if="editingTask">
        <template #header>
          <h3 class="text-lg font-semibold">Edit Task</h3>
        </template>

        <UForm id="editTaskForm" :state="editingTask" @submit="updateTask" class="space-y-4">
          <UFormGroup label="Title" required>
            <UInput v-model="editingTask.title" />
          </UFormGroup>

          <UFormGroup label="Description">
            <UTextarea v-model="editingTask.description" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Priority">
              <USelect
                v-model="editingTask.priority"
                :options="priorityOptions"
              />
            </UFormGroup>

            <UFormGroup label="Status">
              <USelect
                v-model="editingTask.status"
                :options="statusOptions"
              />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Story Points">
              <UInput
                v-model.number="editingTask.storyPoints"
                type="number"
                min="0"
                max="100"
              />
            </UFormGroup>

            <UFormGroup label="Řešitel">
              <UInput v-model="editingTask.assignee" />
              <p v-if="currentUserDisplayName" class="text-xs text-gray-500 mt-1">
                Aktuálně přihlášen: {{ currentUserDisplayName }}
              </p>
            </UFormGroup>
          </div>

          <UFormGroup label="Termín dokončení">
            <input
              v-model="editingTask.dueDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </UFormGroup>

        </UForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showEditTaskModal = false">
              Cancel
            </UButton>
            <UButton form="editTaskForm" type="submit">
              Update Task
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  projectId: string;
}>();

const scrumBoard = useScrumBoardStore();
const freeloTasks = useFreeloTasks();
const auth = useFreeloAuth();

// Filter tasks by project
const projectTasks = computed(() => {
  return scrumBoard.tasks.filter(task => task.projectId === props.projectId);
});

// Override tasksByStatus to filter by project
const tasksByStatus = (status: 'todo' | 'in-progress' | 'done') => {
  return projectTasks.value.filter(task => task.status === status);
};

// Modal states
const showAddTaskModal = ref(false);
const showEditTaskModal = ref(false);
const editingTask = ref<TaskItem | null>(null);

// Form data
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  assignee: '',
  storyPoints: 0,
  status: 'todo' as 'todo' | 'in-progress' | 'done',
  dueDate: ''
});

// Options
const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }
];

const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done', value: 'done' }
];

// Computed property for current user display name
const currentUserDisplayName = computed(() => {
  if (!auth.user.value) return null;
  return auth.user.value.displayName || auth.user.value.email || null;
});

// Extract Freelo project ID from projectId (format: "freelo-123")
const getFreeloProjectId = (projectId: string): number | null => {
  if (projectId.startsWith('freelo-')) {
    const id = parseInt(projectId.replace('freelo-', ''));
    return isNaN(id) ? null : id;
  }
  return null;
};

// Methods
function openAddTaskModal() {
  // Set assignee to current user when opening modal
  if (auth.user.value) {
    newTask.value.assignee = auth.user.value.displayName || auth.user.value.email || '';
  }
  showAddTaskModal.value = true;
}

async function addTask() {
  if (!newTask.value.title) return;
  
  if (!auth.isAuthenticated) {
    alert('Musíte být přihlášeni pro přidání úkolu');
    return;
  }
  
  // Prepare task data with proper dueDate conversion
  const taskData: any = {
    title: newTask.value.title,
    description: newTask.value.description,
    priority: newTask.value.priority,
    assignee: newTask.value.assignee,
    storyPoints: newTask.value.storyPoints,
    status: 'todo',
    projectId: props.projectId
  };
  
  // Convert dueDate string to Date if provided
  if (newTask.value.dueDate) {
    taskData.dueDate = new Date(newTask.value.dueDate);
  }
  
  // Poznámka: Vytváření úkolů přes Freelo API vyžaduje tasklist ID
  // Pro jednoduchost zobrazíme upozornění
  alert('Vytváření úkolů je momentálně dostupné pouze v Freelo aplikaci. Úkoly se načítají automaticky z vašeho Freelo účtu.');
  
  // Reset form
  newTask.value = {
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    storyPoints: 0,
    status: 'todo',
    dueDate: ''
  };
  
  showAddTaskModal.value = false;
}

function editTask(task: TaskItem) {
  // Convert Date to string for the HTML date input
  const taskCopy: any = { ...task };
  if (task.dueDate) {
    const date = new Date(task.dueDate);
    taskCopy.dueDate = date.toISOString().split('T')[0];
  }
  editingTask.value = taskCopy;
  showEditTaskModal.value = true;
}

async function updateTask() {
  if (!editingTask.value) return;
  
  // Prepare updates with proper dueDate conversion
  const updates: any = { ...editingTask.value };
  
  // Convert dueDate string back to Date if it's a string
  if (updates.dueDate && typeof updates.dueDate === 'string') {
    updates.dueDate = new Date(updates.dueDate);
  }
  
  // Poznámka: Úprava úkolů přes Freelo API vyžaduje specifické endpointy
  alert('Úprava úkolů je momentálně dostupná pouze v Freelo aplikaci.');
  showEditTaskModal.value = false;
  editingTask.value = null;
}

async function deleteTask(taskId: string) {
  if (confirm('Are you sure you want to delete this task?')) {
    // Poznámka: Mazání úkolů přes Freelo API
    alert('Mazání úkolů je momentálně dostupné pouze v Freelo aplikaci.');
  }
}

async function moveTask(taskId: string, newStatus: string) {
  // Poznámka: Změna stavu úkolu přes Freelo API
  alert('Změna stavu úkolu je momentálně dostupná pouze v Freelo aplikaci.');
}

async function handleDrop(event: DragEvent, targetStatus: string) {
  event.preventDefault();
  
  if (event.dataTransfer) {
    const taskId = event.dataTransfer.getData('text/plain');
    await firestoreTasks.updateTaskStatus(taskId, targetStatus as 'todo' | 'in-progress' | 'done');
  }
}

// Load tasks from Freelo API when component mounts
onMounted(async () => {
  console.log('[ScrumBoard] Component mounted, auth status:', auth.isAuthenticated);
  if (auth.isAuthenticated && props.projectId) {
    await loadTasksFromFreelo();
  }
});

// Load tasks from Freelo API
const loadTasksFromFreelo = async () => {
  try {
    const freeloProjectId = getFreeloProjectId(props.projectId);
    if (!freeloProjectId) {
      console.warn('[ScrumBoard] Invalid Freelo project ID:', props.projectId);
      return;
    }

    // Získat ID přihlášeného uživatele pro filtrování úkolů
    const workerId = auth.user.value?.id;
    
    console.log('[ScrumBoard] Loading tasks from Freelo for project:', freeloProjectId, workerId ? `(filtered by user ${workerId})` : '(all tasks)');
    const tasks = await freeloTasks.syncTasksForProject(freeloProjectId, workerId);
    
    // Update store with tasks
    scrumBoard.setTasks(tasks);
    console.log('[ScrumBoard] Loaded', tasks.length, 'tasks from Freelo');
    
    if (tasks.length === 0 && workerId) {
      console.log('[ScrumBoard] No tasks found. This might mean:');
      console.log('  - No tasks are assigned to you in this project');
      console.log('  - Try loading all tasks (remove worker_id filter)');
    }
  } catch (error: any) {
    console.error('[ScrumBoard] Error loading tasks from Freelo:', error);
    alert('Chyba při načítání úkolů: ' + (error.message || 'Neznámá chyba'));
  }
};

// Watch for authentication changes
watch(() => auth.isAuthenticated, (isAuth, wasAuth) => {
  console.log('[ScrumBoard] Auth changed:', { wasAuth, isAuth, userEmail: auth.user.value?.email });
  if (isAuth && props.projectId) {
    console.log('[ScrumBoard] User logged in, loading tasks');
    loadTasksFromFreelo();
  } else {
    console.log('[ScrumBoard] User logged out, clearing tasks');
    scrumBoard.clearTasks();
  }
});

// Watch for project changes
watch(() => props.projectId, async (newProjectId) => {
  if (newProjectId && auth.isAuthenticated) {
    console.log('[ScrumBoard] Project changed, loading tasks');
    await loadTasksFromFreelo();
  }
});
</script>

<style scoped>
.column {
  min-height: 500px;
}

.scrum-board {
  min-height: 100vh;
}
</style>
