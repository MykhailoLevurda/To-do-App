<template>
  <div class="scrum-board">
    <!-- Header with stats -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Scrum Board</h1>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-arrow-path"
            variant="outline"
            @click="refreshTasks"
            :loading="scrumBoard.isLoading"
            title="Obnovit úkoly z Freelo"
          >
            Obnovit
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            @click="openAddTaskModal"
          >
            Add Task
          </UButton>
        </div>
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

          <div 
            class="space-y-3 min-h-[400px] drop-zone"
            @drop="handleDrop($event, column.status)"
            @dragover.prevent="handleDragOver($event)"
            @dragenter.prevent="handleDragEnter($event)"
            @dragleave="handleDragLeave($event)"
          >
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
              <USelect
                v-model="editingTask.assignee"
                :options="workerOptions"
                :loading="isLoadingWorkers"
                placeholder="Vyberte řešitele"
                :disabled="isLoadingWorkers || workerOptions.length === 0"
              >
                <template v-if="workerOptions.length === 0 && !isLoadingWorkers">
                  <option value="">Žádní členové týmu</option>
                </template>
              </USelect>
              <p v-if="isLoadingWorkers" class="text-xs text-gray-500 mt-1">
                Načítám členy týmu...
              </p>
              <p v-else-if="workerOptions.length === 0" class="text-xs text-gray-500 mt-1">
                Projekt nemá žádné členy týmu
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
const freeloProjects = useFreeloProjects();
const auth = useFreeloAuth();
const firestoreTasks = useFirestoreTasks();

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
const originalTask = ref<TaskItem | null>(null);

// Project workers (for assignee dropdown)
const projectWorkers = ref<Array<{ id: number; fullname: string }>>([]);
const isLoadingWorkers = ref(false);

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
  
  try {
    // Získat Freelo project ID
    const freeloProjectId = getFreeloProjectId(props.projectId);
    if (!freeloProjectId) {
      alert('Neplatné ID projektu. Úkol musí být vytvořen v existujícím Freelo projektu.');
      return;
    }
    
    // Načíst detail projektu pro získání tasklist ID
    const projectDetail = await freeloProjects.fetchProjectById(freeloProjectId);
    if (!projectDetail || !projectDetail.tasklists || projectDetail.tasklists.length === 0) {
      alert('Projekt nemá žádné tasklisty. Vytvořte tasklist v Freelo aplikaci.');
      return;
    }
    
    // Použít první tasklist (v produkci bychom měli nechat uživatele vybrat)
    const tasklistId = projectDetail.tasklists[0].id;
    
    // Převést priority na Freelo formát
    const priorityMap: Record<string, 'l' | 'm' | 'h'> = {
      'low': 'l',
      'medium': 'm',
      'high': 'h'
    };
    
    // Připravit data pro Freelo API
    const freeloTaskData: any = {
      name: newTask.value.title,
      priority_enum: priorityMap[newTask.value.priority] || 'm',
    };
    
    // Přidat due_date pokud je zadán
    if (newTask.value.dueDate) {
      const dueDate = new Date(newTask.value.dueDate);
      freeloTaskData.due_date = dueDate.toISOString();
    }
    
    // Přidat komentář jako description pokud je zadán
    if (newTask.value.description) {
      freeloTaskData.comment = {
        content: newTask.value.description
      };
    }
    
    // TODO: Převést assignee (řešitel) na worker ID - vyžaduje načtení seznamu uživatelů z Freelo
    
    // Vytvořit úkol přes Freelo API
    await freeloTasks.createTask(freeloProjectId, tasklistId, freeloTaskData);
    
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
    
    // Znovu načíst úkoly z Freelo
    await loadTasksFromFreelo();
    
    alert('Úkol byl úspěšně vytvořen v Freelo!');
  } catch (error: any) {
    console.error('[ScrumBoard] Error creating task:', error);
    alert('Chyba při vytváření úkolu: ' + (error.message || 'Neznámá chyba'));
  }
}

// Load project workers
const loadProjectWorkers = async () => {
  const freeloProjectId = getFreeloProjectId(props.projectId);
  if (!freeloProjectId) {
    console.warn('[ScrumBoard] Cannot load workers - invalid project ID');
    return;
  }
  
  isLoadingWorkers.value = true;
  try {
    const workers = await freeloProjects.fetchProjectWorkers(freeloProjectId);
    projectWorkers.value = workers;
    console.log('[ScrumBoard] Loaded', workers.length, 'workers for project');
  } catch (error: any) {
    console.error('[ScrumBoard] Error loading project workers:', error);
    projectWorkers.value = [];
  } finally {
    isLoadingWorkers.value = false;
  }
};

// Worker options for select
const workerOptions = computed(() => {
  return projectWorkers.value.map(worker => ({
    label: worker.fullname,
    value: worker.id.toString()
  }));
});

async function editTask(task: TaskItem) {
  // Uložit původní úkol pro porovnání změn
  originalTask.value = { ...task };
  
  // Convert Date to string for the HTML date input
  const taskCopy: any = { ...task };
  if (task.dueDate) {
    const date = new Date(task.dueDate);
    taskCopy.dueDate = date.toISOString().split('T')[0];
  }
  
  editingTask.value = taskCopy;
  
  // Načíst workers při otevření modalu
  await loadProjectWorkers();
  
  // Po načtení workers nastavit správný worker ID do assignee pro select
  // Použít freeloWorkerId pokud existuje, jinak najít podle jména
  if (projectWorkers.value.length > 0) {
    let worker = null;
    
    // Nejdřív zkusit najít podle freeloWorkerId
    if (task.freeloWorkerId) {
      worker = projectWorkers.value.find(w => w.id === task.freeloWorkerId);
    }
    
    // Pokud ne, zkusit najít podle jména v assignee
    if (!worker && taskCopy.assignee) {
      worker = projectWorkers.value.find(w => 
        w.fullname === taskCopy.assignee || 
        w.id.toString() === taskCopy.assignee
      );
    }
    
    if (worker) {
      // Nastavit worker ID do assignee pro select (pouze pro editaci)
      taskCopy.assignee = worker.id.toString();
      editingTask.value = taskCopy;
    }
  }
  
  showEditTaskModal.value = true;
}

async function updateTask() {
  if (!editingTask.value || !originalTask.value) return;
  
  try {
    const taskId = editingTask.value.id;
    const freeloUpdates: any = {};
    let hasChanges = false;
    
    // Porovnat změny s původním úkolem
    // Název
    if (editingTask.value.title !== originalTask.value.title) {
      freeloUpdates.name = editingTask.value.title;
      hasChanges = true;
    }
    
    // Termín - porovnat datumy (bez času)
    const originalDueDate = originalTask.value.dueDate 
      ? new Date(originalTask.value.dueDate).toISOString().split('T')[0]
      : null;
    const newDueDate = editingTask.value.dueDate 
      ? (typeof editingTask.value.dueDate === 'string' 
          ? editingTask.value.dueDate 
          : new Date(editingTask.value.dueDate).toISOString().split('T')[0])
      : null;
    
    if (originalDueDate !== newDueDate) {
      if (newDueDate) {
        const dueDate = typeof editingTask.value.dueDate === 'string' 
          ? new Date(editingTask.value.dueDate)
          : editingTask.value.dueDate;
        freeloUpdates.due_date = dueDate.toISOString();
      } else {
        // Pokud byl termín odstraněn, poslat null nebo prázdný string
        freeloUpdates.due_date = null;
      }
      hasChanges = true;
    }
    
    // Priorita
    if (editingTask.value.priority !== originalTask.value.priority) {
      const priorityMap: Record<string, 'l' | 'm' | 'h'> = {
        'low': 'l',
        'medium': 'm',
        'high': 'h'
      };
      freeloUpdates.priority_enum = priorityMap[editingTask.value.priority] || 'm';
      hasChanges = true;
    }
    
    // Řešitel (worker) - převést z string ID na number
    // Porovnat buď worker ID (pokud je to číslo) nebo jméno
    const originalAssignee = originalTask.value.assignee || '';
    const newAssignee = editingTask.value.assignee || '';
    
    // Porovnat worker ID - pokud se změnil worker v selectu (ID), nebo se změnilo jméno
    const originalWorkerId = originalTask.value.freeloWorkerId;
    let newWorkerId: number | null = null;
    
    if (newAssignee) {
      // Zkusit parsovat jako worker ID (číslo)
      const workerId = parseInt(newAssignee);
      if (!isNaN(workerId) && workerId > 0) {
        // Je to worker ID z selectu
        newWorkerId = workerId;
      } else {
        // Pokud je to jméno, zkusit najít worker podle jména
        const worker = projectWorkers.value.find(w => w.fullname === newAssignee);
        if (worker) {
          newWorkerId = worker.id;
        }
      }
    }
    
    // Zkontrolovat, jestli se worker změnil
    if (newWorkerId !== originalWorkerId) {
      freeloUpdates.worker = newWorkerId;
      hasChanges = true;
    }
    
    // Pokud nejsou žádné změny, jen zavřít modal
    if (!hasChanges) {
      console.log('[ScrumBoard] No changes detected, skipping API call');
      showEditTaskModal.value = false;
      editingTask.value = null;
      originalTask.value = null;
      return;
    }
    
    console.log('[ScrumBoard] Changes detected:', freeloUpdates);
    
    // Aktualizovat úkol přes Freelo API (pouze pokud jsou změny)
    await freeloTasks.updateTask(taskId, freeloUpdates);
    
    // Aktualizovat lokální stav
    // Najít worker podle ID a uložit jeho jméno do assignee
    let assigneeName = editingTask.value.assignee;
    let workerId: number | undefined = undefined;
    
    const selectedWorkerId = parseInt(editingTask.value.assignee || '');
    if (!isNaN(selectedWorkerId) && selectedWorkerId > 0) {
      const worker = projectWorkers.value.find(w => w.id === selectedWorkerId);
      if (worker) {
        assigneeName = worker.fullname;
        workerId = worker.id;
      }
    }
    
    scrumBoard.updateTask(taskId, {
      title: editingTask.value.title,
      description: editingTask.value.description,
      priority: editingTask.value.priority,
      assignee: assigneeName, // Uložit jméno pro zobrazení
      freeloWorkerId: workerId, // Uložit worker ID pro další editaci
      dueDate: editingTask.value.dueDate ? (typeof editingTask.value.dueDate === 'string' ? new Date(editingTask.value.dueDate) : editingTask.value.dueDate) : undefined,
    });
    
    // Znovu načíst úkoly z Freelo pro synchronizaci
    await loadTasksFromFreelo();
    
    showEditTaskModal.value = false;
    editingTask.value = null;
    originalTask.value = null;
  } catch (error: any) {
    console.error('[ScrumBoard] Error updating task:', error);
    alert('Chyba při aktualizaci úkolu: ' + (error.message || 'Neznámá chyba'));
  }
}

async function deleteTask(taskId: string) {
  if (confirm('Are you sure you want to delete this task?')) {
    // Poznámka: Mazání úkolů přes Freelo API
    alert('Mazání úkolů je momentálně dostupné pouze v Freelo aplikaci.');
  }
}

async function moveTask(taskId: string, newStatus: string) {
  try {
    const task = scrumBoard.tasks.find(t => t.id === taskId);
    if (!task) {
      console.warn('[ScrumBoard] Task not found:', taskId);
      return;
    }
    
    if (newStatus === 'done') {
      await freeloTasks.finishTask(taskId);
    } else if (newStatus === 'todo') {
      await freeloTasks.activateTask(taskId);
    } else {
      await freeloTasks.updateTask(taskId, { state_id: 1 });
    }
    
    // Aktualizovat lokální stav
    scrumBoard.updateTaskStatus(taskId, newStatus as 'todo' | 'in-progress' | 'done');
    
    // Znovu načíst úkoly z Freelo pro synchronizaci
    await loadTasksFromFreelo();
  } catch (error: any) {
    console.error('[ScrumBoard] Error moving task:', error);
    alert('Chyba při změně stavu úkolu: ' + (error.message || 'Neznámá chyba'));
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.classList.add('drag-over');
  }
}

function handleDragLeave(event: DragEvent) {
  // Zkontrolovat, jestli opouštíme skutečně drop zónu (ne jen child element)
  if (event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    // Pokud jsme stále uvnitř elementu, neodstraňovat třídu
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    
    event.currentTarget.classList.remove('drag-over');
  }
}

async function handleDrop(event: DragEvent, targetStatus: string) {
  event.preventDefault();
  event.stopPropagation();
  
  console.log('[ScrumBoard] ===== handleDrop CALLED =====');
  console.log('[ScrumBoard] Target status:', targetStatus);
  
  // Odstranit drag-over třídu
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.classList.remove('drag-over');
  }
  
  if (!event.dataTransfer) {
    console.warn('[ScrumBoard] No dataTransfer in drop event');
    return;
  }
  
  const taskId = event.dataTransfer.getData('text/plain');
  
  if (!taskId) {
    console.warn('[ScrumBoard] No task ID in dataTransfer');
    return;
  }
  
  console.log('[ScrumBoard] ===== Dropping task =====');
  console.log('[ScrumBoard] Task ID:', taskId);
  console.log('[ScrumBoard] Target status:', targetStatus);
  
  // Najít úkol před try blokem, aby byl dostupný i v catch bloku
  const task = scrumBoard.tasks.find(t => t.id === taskId);
  if (!task) {
    console.warn('[ScrumBoard] Task not found:', taskId);
    alert('Úkol nebyl nalezen. Zkuste obnovit stránku.');
    return;
  }
  
  // Uložit původní stav pro rollback
  const originalStatus = task.status;
  
  try {
    // Zkontrolovat, jestli se stav skutečně změnil
    if (task.status === targetStatus) {
      console.log('[ScrumBoard] Task already in target status, skipping');
      return;
    }
    
    console.log('[ScrumBoard] Current status:', task.status);
    console.log('[ScrumBoard] Target status:', targetStatus);
    
    // FREELO API PŘÍSTUP: Synchronizovat stav s Freelo API jako hlavní zdroj
    // 1. Nejdřív aktualizovat stav v lokálním store (okamžitá UI aktualizace)
    console.log('[ScrumBoard] Updating local state...');
    scrumBoard.updateTaskStatus(taskId, targetStatus as 'todo' | 'in-progress' | 'done');
    
    // 2. Pro Freelo úkoly: synchronizovat s Freelo API (hlavní akce)
    if (task.id.startsWith('freelo-')) {
      console.log('[ScrumBoard] Syncing status with Freelo API...');
      await syncTaskStatusWithFreelo(task.id, targetStatus);
      console.log('[ScrumBoard] ✅ Status synced with Freelo');
    } else {
      // Pro normální úkoly: uložit do Firebase (jako předtím)
      const firestoreTasks = useFirestoreTasks();
      console.log('[ScrumBoard] Saving status to Firebase...');
      await firestoreTasks.updateTaskStatus(taskId, targetStatus as 'todo' | 'in-progress' | 'done');
      console.log('[ScrumBoard] ✅ Status saved to Firebase');
    }
    
    console.log('[ScrumBoard] ===== Task status updated successfully =====');
  } catch (error: any) {
    console.error('[ScrumBoard] ❌ Error updating task status:', error);
    
    // Vrátit úkol zpět do původního stavu v UI (rollback)
    if (task && originalStatus) {
      scrumBoard.updateTaskStatus(taskId, originalStatus as 'todo' | 'in-progress' | 'done');
    }
    
    // Zobrazit uživatelsky přívětivou chybovou zprávu
    const errorMessage = error.message || 'Neznámá chyba';
    alert('Chyba při aktualizaci stavu úkolu: ' + errorMessage);
  }
}

// Hlavní funkce pro synchronizaci stavu s Freelo API
async function syncTaskStatusWithFreelo(taskId: string, targetStatus: string) {
  console.log('[ScrumBoard] Syncing task status with Freelo:', taskId, '→', targetStatus);
  
  if (targetStatus === 'done') {
    // Dokončit úkol ve Freelo
    await freeloTasks.finishTask(taskId);
    console.log('[ScrumBoard] ✅ Freelo: Task finished');
  } else if (targetStatus === 'in-progress') {
    // Zkontrolovat, jestli úkol není finished (pak ho musíme aktivovat)
    const taskDetail = await freeloTasks.fetchTaskDetail(taskId);
    if (taskDetail?.state?.state === 'finished') {
      await freeloTasks.activateTask(taskId);
      console.log('[ScrumBoard] ✅ Freelo: Task activated');
    }
    
    // Přidat label "In progress"
    await freeloTasks.addInProgressLabel(taskId);
    console.log('[ScrumBoard] ✅ Freelo: In-progress label added');
  } else if (targetStatus === 'todo') {
    // Zkontrolovat, jestli úkol není finished (pak ho musíme aktivovat)
    const taskDetail = await freeloTasks.fetchTaskDetail(taskId);
    if (taskDetail?.state?.state === 'finished') {
      await freeloTasks.activateTask(taskId);
      console.log('[ScrumBoard] ✅ Freelo: Task activated');
    }
    
    // Odstranit label "In progress" pokud existuje
    await freeloTasks.removeInProgressLabel(taskId);
    console.log('[ScrumBoard] ✅ Freelo: In-progress label removed');
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
    scrumBoard.setLoading(true);
    
    const freeloProjectId = getFreeloProjectId(props.projectId);
    if (!freeloProjectId) {
      console.warn('[ScrumBoard] Invalid Freelo project ID:', props.projectId);
      scrumBoard.setLoading(false);
      return;
    }

    // Získat ID přihlášeného uživatele pro filtrování úkolů
    const workerId = auth.user.value?.id;
    
    console.log('[ScrumBoard] ===== Loading tasks from Freelo =====');
    console.log('[ScrumBoard] Project ID:', freeloProjectId);
    console.log('[ScrumBoard] Worker ID:', workerId || 'all tasks');
    
    const tasks = await freeloTasks.syncTasksForProject(freeloProjectId, workerId);
    
    // Odstranit duplikáty podle ID (pro jistotu)
    const uniqueTasksMap = new Map<string, TaskItem>();
    tasks.forEach(task => {
      if (!uniqueTasksMap.has(task.id)) {
        uniqueTasksMap.set(task.id, task);
      } else {
        console.warn('[ScrumBoard] Duplicate task found before storing:', task.id, task.title);
      }
    });
    const uniqueTasks = Array.from(uniqueTasksMap.values());
    
    // Debug: zkontrolovat stavy načtených úkolů
    const tasksByStatus = {
      todo: uniqueTasks.filter(t => t.status === 'todo').length,
      inProgress: uniqueTasks.filter(t => t.status === 'in-progress').length,
      done: uniqueTasks.filter(t => t.status === 'done').length
    };
    
    console.log('[ScrumBoard] Tasks loaded by status:', tasksByStatus);
    console.log('[ScrumBoard] Total tasks:', uniqueTasks.length, '(removed', tasks.length - uniqueTasks.length, 'duplicates)');
    console.log('[ScrumBoard] Sample tasks:', uniqueTasks.slice(0, 3).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status
    })));
    
    // Update store with unique tasks
    scrumBoard.setTasks(uniqueTasks);
    console.log('[ScrumBoard] ✅ Loaded', tasks.length, 'tasks from Freelo');
    
    if (tasks.length === 0 && workerId) {
      console.log('[ScrumBoard] No tasks found. This might mean:');
      console.log('  - No tasks are assigned to you in this project');
      console.log('  - Try loading all tasks (remove worker_id filter)');
    }
  } catch (error: any) {
    console.error('[ScrumBoard] ❌ Error loading tasks from Freelo:', error);
    alert('Chyba při načítání úkolů: ' + (error.message || 'Neznámá chyba'));
  } finally {
    scrumBoard.setLoading(false);
  }
};

// Refresh tasks manually
const refreshTasks = async () => {
  console.log('[ScrumBoard] Manual refresh requested');
  await loadTasksFromFreelo();
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

.drop-zone {
  transition: background-color 0.2s, border-color 0.2s;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.drop-zone.drag-over {
  background-color: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
}

.scrum-board {
  min-height: 100vh;
}
</style>
