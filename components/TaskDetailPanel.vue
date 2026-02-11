<template>
  <Teleport to="body">
    <!-- Overlay -->
    <div
      class="task-detail-overlay fixed inset-0 bg-black/40 z-40 transition-opacity"
      :class="isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click="close"
    />

    <!-- Panel – vysouvá se zleva jako ve Freelo -->
    <aside
      class="task-detail-panel fixed left-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-50 flex flex-col shadow-xl transition-transform duration-200 ease-out"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <template v-if="task">
      <!-- Header: název úkolu + zavřít -->
      <div class="flex items-start justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight pr-8">
          {{ task.title }}
        </h2>
        <UButton
          icon="i-heroicons-x-mark"
          variant="ghost"
          color="gray"
          size="sm"
          class="shrink-0"
          aria-label="Zavřít"
          @click="close"
        />
      </div>

      <!-- Scrollovatelný obsah -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5">
        <!-- Popis -->
        <section>
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Popis
          </h3>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {{ task.description || 'Žádný popis.' }}
          </p>
        </section>

        <!-- Činitel (řešitel) a meta -->
        <section class="flex flex-wrap items-center gap-3">
          <div v-if="task.assignee" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div class="i-heroicons-user w-4 h-4 text-gray-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Řešitel: {{ task.assignee }}</span>
          </div>
          <UBadge v-if="task.priority" :color="priorityBadgeColor" variant="soft" size="sm">
            {{ task.priority }}
          </UBadge>
          <span v-if="task.dueDate" class="text-xs text-gray-500 flex items-center gap-1">
            <span class="i-heroicons-calendar" />
            Termín: {{ formatDueDate(task.dueDate) }}
          </span>
          <span v-if="task.storyPoints" class="text-xs text-gray-500">Body: {{ task.storyPoints }}</span>
        </section>

        <!-- Komentáře -->
        <section class="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Komentáře ({{ comments.length }})
          </h3>

          <div v-if="commentsLoading" class="flex items-center justify-center py-6">
            <div class="i-heroicons-arrow-path w-6 h-6 animate-spin text-gray-400" />
          </div>

          <div v-else-if="comments.length" class="space-y-3 mb-4">
            <div
              v-for="c in comments"
              :key="c.id"
              class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 text-sm"
            >
              <div class="flex justify-between items-center gap-2 mb-1 flex-wrap">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ c.author }}</span>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">{{ formatCommentDate(c.createdAt) }}</span>
                  <template v-if="canEditComment(c)">
                    <UButton
                      icon="i-heroicons-pencil"
                      size="xs"
                      variant="ghost"
                      color="gray"
                      aria-label="Upravit"
                      @click="startEditComment(c)"
                    />
                    <UButton
                      icon="i-heroicons-trash"
                      size="xs"
                      variant="ghost"
                      color="red"
                      aria-label="Smazat"
                      @click="confirmDeleteComment(c)"
                    />
                  </template>
                </div>
              </div>
              <template v-if="editingCommentId === c.id">
                <textarea
                  v-model="editingCommentText"
                  rows="3"
                  class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 mb-2"
                  placeholder="Text komentáře..."
                />
                <div class="flex gap-2">
                  <UButton size="xs" @click="saveEditComment">Uložit</UButton>
                  <UButton size="xs" variant="ghost" @click="cancelEditComment">Zrušit</UButton>
                </div>
              </template>
              <p v-else class="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{{ c.text }}</p>
            </div>
          </div>

          <p v-else class="text-sm text-gray-500 mb-4">Zatím žádné komentáře.</p>

          <div class="flex gap-2">
            <textarea
              v-model="newComment"
              rows="2"
              class="flex-1 min-w-0 p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Napsat komentář..."
              :disabled="isSubmittingComment"
              @keydown.ctrl.enter="submitComment"
            />
            <UButton
              icon="i-heroicons-paper-airplane"
              color="primary"
              :disabled="!newComment.trim() || isSubmittingComment"
              :loading="isSubmittingComment"
              aria-label="Odeslat"
              @click="submitComment"
            />
          </div>
        </section>
      </div>

      <!-- Akce dole -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-1 text-sm text-gray-500">
          <template v-if="isCompleted">
            <span v-if="task.approved" class="flex items-center gap-1 text-green-600">
              <span class="i-heroicons-check-circle w-4 h-4" /> Schváleno
            </span>
            <span v-else class="flex items-center gap-1 text-amber-600">
              <span class="i-heroicons-clock w-4 h-4" /> Čeká na schválení
            </span>
          </template>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="isCompleted && !task.approved"
            icon="i-heroicons-check-circle"
            color="green"
            size="sm"
            @click="approveTask"
          >
            Schválit
          </UButton>
          <UButton
            :icon="isCompleted ? 'i-heroicons-arrow-path' : 'i-heroicons-check-circle'"
            :color="isCompleted ? 'neutral' : 'green'"
            size="sm"
            variant="soft"
            @click="toggleTaskStatus"
          >
            {{ isCompleted ? 'Otevřít' : 'Hotovo' }}
          </UButton>
          <UButton icon="i-heroicons-pencil" size="sm" variant="soft" @click="editTask">
            Upravit
          </UButton>
          <UButton icon="i-heroicons-trash" size="sm" color="red" variant="soft" @click="deleteTask">
            Smazat
          </UButton>
        </div>
      </div>
      </template>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import type { TaskItem } from '~/stores/todos';

const props = defineProps<{
  task: TaskItem | null;
  isOpen: boolean;
  /** Id stavu „Hotovo“ (poslední sloupec) – pro tlačítko Hotovo a zobrazení schválení */
  completedStatusId?: string;
  /** Id prvního pracovního stavu – pro tlačítko Otevřít */
  firstStatusId?: string;
}>();

const emit = defineEmits<{
  close: [];
  edit: [task: TaskItem];
  delete: [taskId: string];
  move: [taskId: string, newStatus: string];
}>();

const auth = useAuth();
const firestoreTasks = useFirestoreTasks();
const scrumBoard = useScrumBoardStore();

const newComment = ref('');
const isSubmittingComment = ref(false);
const editingCommentId = ref<string | null>(null);
const editingCommentText = ref('');

const task = computed(() => props.task);

const completedStatusId = computed(() => props.completedStatusId ?? 'done');
const firstStatusId = computed(() => props.firstStatusId ?? 'todo');

const isCompleted = computed(() => task.value?.status === completedStatusId.value);

const comments = computed(() => {
  if (!task.value) return [];
  const list = firestoreTasks.taskComments.value[task.value.id];
  if (!list) return [];
  return list.map((c: any) => ({
    id: c.id,
    text: c.text,
    author: c.author || 'Neznámý',
    userId: c.userId,
    createdAt: c.createdAt?.toDate?.() ?? c.createdAt
  }));
});

function canEditComment(c: { userId?: string }) {
  return auth.user.value && c.userId === auth.user.value?.uid;
}

function startEditComment(c: { id: string; text: string }) {
  editingCommentId.value = c.id;
  editingCommentText.value = c.text;
}

function cancelEditComment() {
  editingCommentId.value = null;
  editingCommentText.value = '';
}

async function saveEditComment() {
  if (!task.value || !editingCommentId.value) return;
  const text = editingCommentText.value?.trim();
  if (!text) return;
  const ok = await firestoreTasks.updateComment(task.value.id, editingCommentId.value, text);
  if (ok) {
    cancelEditComment();
  } else {
    useToast().add({ title: 'Nepodařilo se uložit úpravu', color: 'red' });
  }
}

async function confirmDeleteComment(c: { id: string; text: string }) {
  if (!task.value) return;
  if (!confirm('Opravdu smazat tento komentář?')) return;
  const ok = await firestoreTasks.deleteComment(task.value.id, c.id);
  if (ok) {
    if (editingCommentId.value === c.id) cancelEditComment();
  } else {
    useToast().add({ title: 'Nepodařilo se smazat komentář', color: 'red' });
  }
}

const commentsLoading = ref(false);

let lastListeningTaskId: string | null = null;

watch(
  () => [props.isOpen, props.task?.id],
  ([open, taskId]) => {
    const id = taskId as string | undefined;
    if (open && id) {
      if (lastListeningTaskId && lastListeningTaskId !== id) {
        firestoreTasks.stopListeningComments(lastListeningTaskId);
      }
      lastListeningTaskId = id;
      commentsLoading.value = true;
      firestoreTasks.listenComments(id);
      nextTick(() => {
        commentsLoading.value = false;
      });
    } else {
      if (lastListeningTaskId) {
        firestoreTasks.stopListeningComments(lastListeningTaskId);
        lastListeningTaskId = null;
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (lastListeningTaskId) {
    firestoreTasks.stopListeningComments(lastListeningTaskId);
  }
});

function formatCommentDate(val: Date | { toDate: () => Date } | undefined) {
  if (!val) return '';
  const d = typeof (val as any)?.toDate === 'function' ? (val as any).toDate() : val;
  return new Date(d).toLocaleString('cs-CZ');
}

function formatDueDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ');
}

const priorityBadgeColor = computed(() => {
  if (!task.value) return 'gray';
  switch (task.value.priority) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'green';
    default: return 'gray';
  }
});

function close() {
  emit('close');
}

async function submitComment() {
  if (!task.value || !newComment.value.trim()) return;
  if (!auth.isAuthenticated) {
    const t = useToast();
    t.add({ title: 'Pro přidání komentáře se přihlaste', color: 'red' });
    return;
  }
  const text = newComment.value.trim();
  newComment.value = '';
  isSubmittingComment.value = true;
  try {
    const ok = await firestoreTasks.addComment(task.value.id, text);
    if (!ok) {
      const t = useToast();
      t.add({ title: 'Nepodařilo se přidat komentář', color: 'red' });
    }
  } finally {
    isSubmittingComment.value = false;
  }
}

async function approveTask() {
  if (!task.value || !auth.isAuthenticated) return;
  const ok = await firestoreTasks.approveTask(task.value.id);
  if (ok) {
    scrumBoard.updateTask(task.value.id, { approved: true });
    close();
  } else {
    useToast().add({ title: 'Nepodařilo se schválit úkol', color: 'red' });
  }
}

async function toggleTaskStatus() {
  if (!task.value || !auth.isAuthenticated) return;
  const newStatus = isCompleted.value ? firstStatusId.value : completedStatusId.value;
  const ok = await firestoreTasks.updateTaskStatus(task.value.id, newStatus);
  if (ok) {
    emit('move', task.value.id, newStatus);
    close();
  } else {
    useToast().add({ title: 'Nepodařilo se změnit stav úkolu', color: 'red' });
  }
}

function editTask() {
  if (!task.value) return;
  close();
  emit('edit', task.value);
}

function deleteTask() {
  if (!task.value) return;
  close();
  emit('delete', task.value.id);
}
</script>

<style scoped>
.task-detail-panel {
  max-height: 100vh;
}
</style>
