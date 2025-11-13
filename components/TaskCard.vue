<template>
  <UCard 
    class="task-card cursor-pointer hover:shadow-md transition-shadow"
    :class="[priorityClass, task.approved ? 'opacity-60 grayscale' : '']"
    @click="openModal"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    draggable="true"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-sm">{{ task.title }}</h3>
        <div class="flex items-center gap-1">
          <UBadge 
            :color="priorityColor" 
            variant="soft" 
            size="xs"
          >
            {{ task.priority }}
          </UBadge>
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            size="xs"
            variant="ghost"
            @click="toggleMenu"
          />
        </div>
      </div>
    </template>

    <div class="space-y-2">
      <p v-if="task.description" class="hidden text-xs text-gray-600 dark:text-gray-400">
        {{ task.description }}
      </p>
      
      <!-- Deadline Progress Bar -->
      <div v-if="task.dueDate" class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-500 flex items-center gap-1">
            <div class="i-heroicons-calendar"></div>
            Termín: {{ formatDueDate(task.dueDate) }}
          </span>
          <span :class="deadlineTextColor">
            {{ deadlineStatus }}
          </span>
        </div>
        <div 
          class="deadline-bar h-1.5 rounded-full transition-all duration-300"
          :class="'deadline-bar-' + deadlineColorName"
        ></div>
      </div>
      
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-4">
          <div v-if="task.assignee" class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <UserIcon class="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span>{{ task.assignee }}</span>
          </div>

          <div v-if="task.storyPoints" class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <ChartBarIcon class="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span>{{ task.storyPoints }} pts</span>
          </div>
        </div>
        <span class="text-gray-400">
          {{ formatDate(task.createdAt) }}
        </span>
      </div>
    </div>
  </UCard>

  <!--Modalni okno-->
  <UModal v-model="showModal" size="lg">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {{ task.title }}
          </h3>
          <UButton 
            icon="i-heroicons-x-mark" 
            variant="ghost" 
            color="gray" 
            size="sm" 
            @click="showModal = false" 
          />
        </div>
      </template>

      <div class="space-y-5">
        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
          {{ task.description || 'Žádný popis k tomuto úkolu.' }}
        </p>


        <div class="border-t border-gray-200 dark:border-gray-800 pt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p><strong>Priorita:</strong> {{ task.priority }}</p>
          <p v-if="task.assignee"><strong>Přiřazeno:</strong> {{ task.assignee }}</p>
          <p v-if="task.dueDate"><strong>Termín:</strong> {{ formatDueDate(task.dueDate) }}</p>
          <p v-if="task.storyPoints"><strong>Body:</strong> {{ task.storyPoints }}</p>
          <p><strong>Vytvořeno:</strong> {{ formatDate(task.createdAt) }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full items-center">
          <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <template v-if="task.status === 'done'">
              <div v-if="task.approved" class="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircleIcon class="w-4 h-4" /> Schváleno
              </div>
              <div v-else class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <ClockIcon class="w-4 h-4" /> Čeká na schválení
              </div>
            </template>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="task.status === 'done' && !task.approved"
              icon="i-heroicons-check-circle"
              color="green"
              @click="approveTask"
            >
              Schválit
            </UButton>
            <UButton
              v-if="!task.approved"
              icon="i-heroicons-pencil"
              @click="editTask"
            >
              Upravit
            </UButton>
            <UButton
              icon="i-heroicons-trash"
              color="red"
              @click="deleteTask"
            >
              Smazat
            </UButton>
          </div>
        </div>
      </template>

    </UCard>
  </UModal>


  
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';
import { UserIcon, ChartBarIcon  } from '@heroicons/vue/24/solid'

const firestoreTasks = useFirestoreTasks()

async function approveTask() {
  const success = await firestoreTasks.approveTask(props.task.id)
  if (success) {
    props.task.approved = true
    showModal.value = false
  }
}




interface Props {
  task: TaskItem;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  edit: [task: TaskItem];
  delete: [taskId: string];
  move: [taskId: string, newStatus: string];
}>();

const scrumBoard = useScrumBoardStore();
const showModal = ref(false)
const openModal = () => (showModal.value = true)

const priorityClass = computed(() => {
  switch (props.task.priority) {
    case 'high': return 'border-l-4 border-l-red-500';
    case 'medium': return 'border-l-4 border-l-yellow-500';
    case 'low': return 'border-l-4 border-l-green-500';
    default: return '';
  }
});

const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'green';
    default: return 'gray';
  }
});

// Deadline calculations
// Pravidla barev:
// 🔵 MODRÁ: Více než 2 dny do deadlinu
// 🟡 ŽLUTÁ: 2 dny nebo méně do deadlinu (včetně dnes)
// 🔴 ČERVENÁ: Po termínu (overdue)

// Centrální funkce pro výpočet rozdílu ve dnech
function getDaysDifference() {
  if (!props.task.dueDate) return null;
  
  // Získáme dnešní datum v lokálním časovém pásmu
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();
  
  // Deadline datum v lokálním časovém pásmu
  const due = new Date(props.task.dueDate);
  const dueYear = due.getFullYear();
  const dueMonth = due.getMonth();
  const dueDay = due.getDate();
  
  // Vytvoříme nová data na půlnoc v lokálním čase
  const nowMidnight = new Date(nowYear, nowMonth, nowDay);
  const dueMidnight = new Date(dueYear, dueMonth, dueDay);
  
  const diffMs = dueMidnight.getTime() - nowMidnight.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  console.log('[Deadline Debug]', {
    task: props.task.title,
    nowLocal: `${nowDay}.${nowMonth + 1}.${nowYear}`,
    dueLocal: `${dueDay}.${dueMonth + 1}.${dueYear}`,
    diffMs,
    diffDays: diffDays.toFixed(2)
  });
  
  return diffDays;
}

const deadlineProgress = computed(() => {
  if (!props.task.dueDate) return 0;
  
  const now = new Date().getTime();
  const created = new Date(props.task.createdAt).getTime();
  const due = new Date(props.task.dueDate).getTime();
  
  // If overdue, show 100%
  if (now > due) return 100;
  
  // Calculate progress percentage
  const totalTime = due - created;
  const elapsed = now - created;
  
  if (totalTime <= 0) return 100;
  
  return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
});

// Color name for CSS classes - Primary method
const deadlineColorName = computed(() => {
  const diffDays = getDaysDifference();
  
  if (diffDays === null) {
    console.log('[TaskCard] No deadline set');
    return 'gray';
  }
  
  console.log('[TaskCard] Color decision:', {
    task: props.task.title,
    diffDays: diffDays.toFixed(2),
    isNegative: diffDays < 0,
    isLessThan2: diffDays <= 2
  });
  
  // Overdue - červená (diffDays < 0 znamená, že deadline už prošel)
  if (diffDays < 0) {
    console.log('[TaskCard] -> RED (overdue, diffDays < 0)');
    return 'red';
  }
  
  // Dnes nebo zítra nebo pozítří - žlutá (0 <= diffDays <= 2)
  if (diffDays <= 2) {
    console.log('[TaskCard] -> YELLOW (2 days or less, 0 <= diffDays <= 2)');
    return 'yellow';
  }
  
  // Více než 2 dny - modrá (diffDays > 2)
  console.log('[TaskCard] -> BLUE (more than 2 days, diffDays > 2)');
  return 'blue';
});

// Raw color value for inline styles (backup method)
const deadlineBarColorRaw = computed(() => {
  const colorName = deadlineColorName.value;
  
  const colors: Record<string, string> = {
    'red': '#ef4444',
    'yellow': '#eab308',
    'blue': '#3b82f6',
    'gray': '#d1d5db'
  };
  
  return colors[colorName] || colors['gray'];
});

const deadlineTextColor = computed(() => {
  const colorName = deadlineColorName.value;
  
  const textColors: Record<string, string> = {
    'red': 'text-red-600 font-semibold',
    'yellow': 'text-yellow-600 font-medium',
    'blue': 'text-blue-600',
    'gray': 'text-gray-500'
  };
  
  return textColors[colorName] || textColors['gray'];
});

const deadlineStatus = computed(() => {
  const diffDays = getDaysDifference();
  
  if (diffDays === null) return '';
  
  const diffDaysCeil = Math.ceil(diffDays);
  
  if (diffDays < 0) {
    return `Po termínu (${Math.abs(diffDaysCeil)}d)`;
  } else if (diffDaysCeil === 0) {
    return 'Dnes!';
  } else if (diffDaysCeil === 1) {
    return 'Zítra';
  } else if (diffDaysCeil <= 7) {
    return `${diffDaysCeil} dní`;
  } else {
    return `${Math.ceil(diffDaysCeil / 7)} týdnů`;
  }
});

function handleDragStart(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function handleDragEnd() {
  // Cleanup if needed
}

function editTask() {
  showModal.value = false
  emit('edit', props.task);
}

function deleteTask() {
  showModal.value = false
  emit('delete', props.task.id);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit'
  });
}

function formatDueDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
</script>

<style scoped>
.task-card {
  min-height: 120px;
}

/* Deadline bar colors - using !important to override any conflicts */
.deadline-bar-red {
  background-color: #ef4444 !important; /* red-500 */
}

.deadline-bar-yellow {
  background-color: #eab308 !important; /* yellow-500 */
}

.deadline-bar-blue {
  background-color: #3b82f6 !important; /* blue-500 */
}

.deadline-bar-gray {
  background-color: #d1d5db !important; /* gray-300 */
}
</style>
