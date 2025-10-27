<template>
  <div class="scrum-board">
    <!-- Header with stats -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Scrum Board</h1>
        <UButton
          icon="i-heroicons-plus"
          @click="showAddTaskModal = true"
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
              class="text-center text-gray-400 py-8"
            >
              <div class="text-4xl mb-2">📋</div>
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

          <UFormGroup label="Assignee">
            <UInput v-model="newTask.assignee" placeholder="Enter assignee name" />
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

            <UFormGroup label="Assignee">
              <UInput v-model="editingTask.assignee" />
            </UFormGroup>
          </div>

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

const props = defineProps<{
  projectId: string;
}>();

const scrumBoard = useScrumBoardStore();
const firestoreTasks = useFirestoreTasks();
const auth = useAuth();

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
  status: 'todo' as 'todo' | 'in-progress' | 'done'
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

// Methods
async function addTask() {
  if (!newTask.value.title) return;
  
  if (!auth.isAuthenticated.value) {
    alert('Musíte být přihlášeni pro přidání úkolu');
    return;
  }
  
  // Vždy uložit do "To Do" sloupce při vytvoření s projectId
  await firestoreTasks.addTask({
    ...newTask.value,
    status: 'todo',
    projectId: props.projectId
  });
  
  // Reset form
  newTask.value = {
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    storyPoints: 0,
    status: 'todo'
  };
  
  showAddTaskModal.value = false;
}

function editTask(task: TaskItem) {
  editingTask.value = { ...task };
  showEditTaskModal.value = true;
}

async function updateTask() {
  if (!editingTask.value) return;
  
  await firestoreTasks.updateTask(editingTask.value.id, editingTask.value);
  showEditTaskModal.value = false;
  editingTask.value = null;
}

async function deleteTask(taskId: string) {
  if (confirm('Are you sure you want to delete this task?')) {
    await firestoreTasks.deleteTask(taskId);
  }
}

async function moveTask(taskId: string, newStatus: string) {
  await firestoreTasks.updateTaskStatus(taskId, newStatus as 'todo' | 'in-progress' | 'done');
}

async function handleDrop(event: DragEvent, targetStatus: string) {
  event.preventDefault();
  
  if (event.dataTransfer) {
    const taskId = event.dataTransfer.getData('text/plain');
    await firestoreTasks.updateTaskStatus(taskId, targetStatus as 'todo' | 'in-progress' | 'done');
  }
}

// Start Firestore listener when component mounts
onMounted(() => {
  console.log('[ScrumBoard] Component mounted, auth status:', auth.isAuthenticated.value);
  if (auth.isAuthenticated.value) {
    firestoreTasks.startListening();
  }
});

// Stop Firestore listener when component unmounts
onUnmounted(() => {
  console.log('[ScrumBoard] Component unmounting, stopping listener');
  firestoreTasks.stopListening();
});

// Watch for authentication changes
watch(() => auth.isAuthenticated.value, (isAuth, wasAuth) => {
  console.log('[ScrumBoard] Auth changed:', { wasAuth, isAuth, userId: auth.user.value?.uid });
  if (isAuth) {
    console.log('[ScrumBoard] User logged in, starting listener');
    firestoreTasks.startListening();
  } else {
    console.log('[ScrumBoard] User logged out, stopping listener and clearing tasks');
    firestoreTasks.stopListening();
    scrumBoard.clearTasks();
  }
});

// Watch for user changes (different user logs in)
watch(() => auth.user.value?.uid, (newUid, oldUid) => {
  console.log('[ScrumBoard] User UID changed:', { oldUid, newUid });
  if (oldUid && newUid && oldUid !== newUid) {
    console.log('[ScrumBoard] Different user detected, switching context');
    // Different user logged in - clear old tasks and restart listener
    scrumBoard.clearTasks();
    firestoreTasks.stopListening();
    firestoreTasks.startListening();
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
