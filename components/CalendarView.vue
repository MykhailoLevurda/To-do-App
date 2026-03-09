<template>
  <div class="calendar-view">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Kalendář</h2>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-chevron-left"
          variant="ghost"
          size="sm"
          @click="prevMonth"
        />
        <span class="min-w-[180px] text-center font-medium">{{ monthTitle }}</span>
        <UButton
          icon="i-heroicons-chevron-right"
          variant="ghost"
          size="sm"
          @click="nextMonth"
        />
      </div>
    </div>

    <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
      <div
        v-for="day in weekdayLabels"
        :key="day"
        class="bg-gray-100 dark:bg-gray-800 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400"
      >
        {{ day }}
      </div>
      <div
        v-for="cell in calendarCells"
        :key="cell.dateKey"
        class="min-h-[80px] bg-white dark:bg-gray-900 p-2"
        :class="{ 'opacity-50': !cell.isCurrentMonth }"
      >
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ cell.day }}
        </div>
        <div class="space-y-1">
          <button
            v-for="task in cell.tasks"
            :key="task.id"
            type="button"
            class="block w-full text-left text-xs px-2 py-1 rounded truncate border-l-2 hover:opacity-90 transition-opacity"
            :class="taskPriorityBorder(task.priority)"
            @click="$emit('select', task)"
          >
            {{ task.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';

const props = defineProps<{
  projectId: string;
}>();

defineEmits<{
  select: [task: TaskItem];
}>();

const scrumBoard = useScrumBoardStore();

const currentMonth = ref(new Date());

const weekdayLabels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const monthTitle = computed(() => {
  return currentMonth.value.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
});

const tasksWithDue = computed(() => {
  return scrumBoard.tasks.filter(
    (t) => t.projectId === props.projectId && t.dueDate
  );
});

const calendarCells = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = last.getDate();
  const cells: { dateKey: string; day: number; isCurrentMonth: boolean; tasks: TaskItem[] }[] = [];
  const tasksByDate: Record<string, TaskItem[]> = {};

  tasksWithDue.value.forEach((t) => {
    const d = new Date(t.dueDate!);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  });

  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, -startDay + i + 1);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    cells.push({
      dateKey: key,
      day: d.getDate(),
      isCurrentMonth: false,
      tasks: tasksByDate[key] || []
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    cells.push({
      dateKey: key,
      day,
      isCurrentMonth: true,
      tasks: tasksByDate[key] || []
    });
  }
  const remaining = 42 - cells.length;
  for (let i = 0; i < remaining; i++) {
    const day = i + 1;
    const d = new Date(year, month + 1, day);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    cells.push({
      dateKey: key,
      day: d.getDate(),
      isCurrentMonth: false,
      tasks: tasksByDate[key] || []
    });
  }
  return cells;
});

function prevMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1
  );
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1
  );
}

function taskPriorityBorder(priority: string) {
  switch (priority) {
    case 'high':
      return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    case 'medium':
      return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    case 'low':
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
    default:
      return 'border-l-gray-400 bg-gray-50 dark:bg-gray-800';
  }
}
</script>
