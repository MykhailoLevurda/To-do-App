<template>
  <UCard 
    class="task-card cursor-move hover:shadow-md transition-shadow"
    :class="priorityClass"
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
      <p v-if="task.description" class="text-xs text-gray-600 dark:text-gray-400">
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
        <div class="flex items-center gap-2">
          <span v-if="task.assignee" class="text-gray-500">
            👤 {{ task.assignee }}
          </span>
          <span v-if="task.storyPoints" class="text-gray-500">
            📊 {{ task.storyPoints }} pts
          </span>
        </div>
        <span class="text-gray-400">
          {{ formatDate(task.createdAt) }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <UButton
          icon="i-heroicons-pencil"
          size="xs"
          variant="ghost"
          @click="editTask"
        />
        <UButton
          icon="i-heroicons-trash"
          size="xs"
          variant="ghost"
          color="red"
          @click="deleteTask"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';

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
  emit('edit', props.task);
}

function deleteTask() {
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
