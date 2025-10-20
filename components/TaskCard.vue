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
</script>

<style scoped>
.task-card {
  min-height: 120px;
}
</style>
