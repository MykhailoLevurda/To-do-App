<template>
  <UCard
    class="task-card cursor-pointer hover:shadow-md transition-shadow"
    :class="[priorityClass, task.approved ? 'opacity-60 grayscale' : '']"
    @click="emit('select', task)"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    draggable="true"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-semibold text-sm truncate min-w-0">{{ task.title }}</h3>
        <UBadge :color="priorityColor" variant="soft" size="xs" class="shrink-0">
          {{ task.priority }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-2">
      <div v-if="task.dueDate" class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-500 flex items-center gap-1">
            <div class="i-heroicons-calendar" />
            Termín: {{ formatDueDate(task.dueDate) }}
          </span>
          <span :class="deadlineTextColor">{{ deadlineStatus }}</span>
        </div>
        <div
          class="deadline-bar h-1.5 rounded-full transition-all duration-300"
          :class="'deadline-bar-' + deadlineColorName"
        />
      </div>

      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-4">
          <div v-if="task.assignee" class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <UserIcon class="w-4 h-4" />
            <span>{{ task.assignee }}</span>
          </div>
          <div v-if="task.storyPoints" class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <ChartBarIcon class="w-4 h-4" />
            <span>{{ task.storyPoints }} pts</span>
          </div>
        </div>
        <span class="text-gray-400">{{ formatDate(task.createdAt) }}</span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';
import { UserIcon, ChartBarIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{ task: TaskItem }>();

const emit = defineEmits<{
  select: [task: TaskItem];
  edit: [task: TaskItem];
  delete: [taskId: string];
  move: [taskId: string, newStatus: string];
}>();

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

function getDaysDifference() {
  if (!props.task.dueDate) return null;
  const now = new Date();
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(props.task.dueDate);
  const dm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return (dm.getTime() - n.getTime()) / 86400000;
}

const deadlineColorName = computed(() => {
  const d = getDaysDifference();
  if (d === null) return 'gray';
  if (d < 0) return 'red';
  if (d <= 2) return 'yellow';
  return 'blue';
});

const deadlineTextColor = computed(() => ({
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  blue: 'text-blue-600',
  gray: 'text-gray-500'
}[deadlineColorName.value]));

const deadlineStatus = computed(() => {
  const d = getDaysDifference();
  if (d === null) return '';
  const days = Math.ceil(d);
  if (d < 0) return `Po termínu (${Math.abs(days)}d)`;
  if (days === 0) return 'Dnes!';
  if (days === 1) return 'Zítra';
  if (days <= 7) return `${days} dní`;
  return `${Math.ceil(days / 7)} týdnů`;
});

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
}

function formatDueDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ');
}

function handleDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', props.task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
  }
  if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5';
}

function handleDragEnd(e: DragEvent) {
  if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
}
</script>

<style scoped>
.task-card { min-height: 120px; }
.deadline-bar-red { background-color: #ef4444 !important; }
.deadline-bar-yellow { background-color: #eab308 !important; }
.deadline-bar-blue { background-color: #3b82f6 !important; }
.deadline-bar-gray { background-color: #d1d5db !important; }
</style>
