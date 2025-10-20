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
            <div class="text-2xl font-bold text-blue-600">{{ scrumBoard.totalTasks }}</div>
            <div class="text-sm text-gray-500">Total Tasks</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ scrumBoard.inProgressTasks }}</div>
            <div class="text-sm text-gray-500">In Progress</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ scrumBoard.completedTasks }}</div>
            <div class="text-sm text-gray-500">Completed</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">
              {{ Math.round((scrumBoard.completedTasks / Math.max(scrumBoard.totalTasks, 1)) * 100) }}%
            </div>
            <div class="text-sm text-gray-500">Progress</div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  {{ scrumBoard.tasksByStatus(column.status).length }}
                </UBadge>
              </div>
            </div>
          </template>

          <div class="space-y-3 min-h-[400px]">
            <TaskCard
              v-for="task in scrumBoard.tasksByStatus(column.status)"
              :key="task.id"
              :task="task"
              @edit="editTask"
              @delete="deleteTask"
              @move="moveTask"
            />
            
            <!-- Empty state -->
            <div 
              v-if="scrumBoard.tasksByStatus(column.status).length === 0"
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

const scrumBoard = useScrumBoardStore();

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
function addTask() {
  if (!newTask.value.title) return;
  
  // Vždy uložit do "To Do" sloupce při vytvoření
  scrumBoard.addTask({
    ...newTask.value,
    status: 'todo'
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

function updateTask() {
  if (!editingTask.value) return;
  
  scrumBoard.updateTask(editingTask.value.id, editingTask.value);
  showEditTaskModal.value = false;
  editingTask.value = null;
}

function deleteTask(taskId: string) {
  if (confirm('Are you sure you want to delete this task?')) {
    scrumBoard.removeTask(taskId);
  }
}

function moveTask(taskId: string, newStatus: string) {
  scrumBoard.moveTask(taskId, '', newStatus);
}

function handleDrop(event: DragEvent, targetStatus: string) {
  event.preventDefault();
  
  if (event.dataTransfer) {
    const taskId = event.dataTransfer.getData('text/plain');
    scrumBoard.updateTaskStatus(taskId, targetStatus as 'todo' | 'in-progress' | 'done');
  }
}

// Initialize with sample data if empty
onMounted(() => {
  if (scrumBoard.tasks.length === 0) {
    scrumBoard.addTask({
      title: 'Setup project structure',
      description: 'Create basic Nuxt 3 project with TypeScript',
      priority: 'high',
      status: 'done',
      storyPoints: 5
    });
    
    scrumBoard.addTask({
      title: 'Implement Scrum Board',
      description: 'Create Kanban board with drag & drop',
      priority: 'high',
      status: 'in-progress',
      storyPoints: 8
    });
    
    scrumBoard.addTask({
      title: 'Add user authentication',
      description: 'Integrate Firebase Auth',
      priority: 'medium',
      status: 'todo',
      storyPoints: 13
    });
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
