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
        <template v-if="editMode">
          <input
            v-model="editForm.title"
            class="flex-1 text-lg font-semibold bg-transparent border-b-2 border-primary focus:outline-none text-gray-900 dark:text-gray-100"
            placeholder="Název úkolu"
          />
        </template>
        <h2 v-else class="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight flex-1">
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
          <textarea
            v-if="editMode"
            v-model="editForm.description"
            rows="4"
            class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Popis úkolu..."
          />
          <p v-else class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {{ task.description || 'Žádný popis.' }}
          </p>
        </section>

        <!-- Editační pole pro meta -->
        <section v-if="editMode" class="grid grid-cols-2 gap-3 border border-primary/30 rounded-lg p-3 bg-primary/5">
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Priorita</label>
            <select v-model="editForm.priority" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900">
              <option value="low">Nízká</option>
              <option value="medium">Střední</option>
              <option value="high">Vysoká</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Story points</label>
            <input v-model.number="editForm.storyPoints" type="number" min="0" max="100" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900" placeholder="0" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Termín</label>
            <input v-model="editForm.dueDate" type="date" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Řešitel</label>
            <select v-model="editForm.assigneeId" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900" @change="onEditAssigneeChange">
              <option value="">Nepřiřazeno</option>
              <option v-for="m in projectMembers" :key="m.userId" :value="m.userId">{{ m.displayName || m.email }}</option>
            </select>
          </div>
        </section>

        <!-- Zobrazení meta (jen v read-only režimu) -->
        <section v-else class="flex flex-wrap items-center gap-3">
          <div v-if="task.assignee" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div class="i-heroicons-user w-4 h-4 text-gray-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Řešitel: {{ task.assignee }}</span>
          </div>
          <UBadge
            v-for="lid in (task.labelIds || [])"
            :key="lid"
            :color="(taskLabelsById[lid]?.color as any) || 'gray'"
            variant="soft"
            size="sm"
          >
            {{ taskLabelsById[lid]?.name ?? lid }}
          </UBadge>
          <UBadge v-if="task.priority" :color="priorityBadgeColor" variant="soft" size="sm">
            {{ task.priority }}
          </UBadge>
          <span v-if="task.dueDate" class="text-xs text-gray-500 flex items-center gap-1">
            <span class="i-heroicons-calendar" />
            Termín: {{ formatDueDate(task.dueDate) }}
          </span>
          <span v-if="task.storyPoints" class="text-xs text-gray-500">Body: {{ task.storyPoints }}</span>
        </section>

        <!-- Checklist (subukoly jako Trello) -->
        <section class="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span class="i-heroicons-clipboard-document-check w-4 h-4" />
            Checklist ({{ checklistDoneCount }}/{{ taskChecklist.length }})
          </h3>
          <div v-if="taskChecklist.length" class="space-y-1.5 mb-2">
            <div
              v-for="item in taskChecklist"
              :key="item.id"
              class="flex items-center gap-2 group"
            >
              <input
                type="checkbox"
                :checked="item.done"
                class="rounded border-gray-300 text-primary focus:ring-primary"
                @change="toggleChecklistItem(item)"
              />
              <span
                class="text-sm flex-1 min-w-0"
                :class="item.done ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'"
              >
                {{ item.title }}
              </span>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                variant="ghost"
                color="red"
                class="opacity-0 group-hover:opacity-100"
                aria-label="Odebrat"
                @click="removeChecklistItem(item.id)"
              />
            </div>
          </div>
          <div class="flex gap-2">
            <UInput
              v-model="newChecklistTitle"
              placeholder="Přidat položku..."
              size="sm"
              class="flex-1 min-w-0"
              @keydown.enter.prevent="addChecklistItem"
            />
            <UButton
              icon="i-heroicons-plus"
              size="sm"
              :disabled="!newChecklistTitle.trim()"
              @click="addChecklistItem"
            >
              Přidat
            </UButton>
          </div>
        </section>

        <!-- Přílohy (odkazy) -->
        <section class="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span class="i-heroicons-paper-clip w-4 h-4" />
            Přílohy ({{ taskAttachmentLinks.length }})
          </h3>
          <div v-if="taskAttachmentLinks.length" class="space-y-1.5 mb-2">
            <a
              v-for="att in taskAttachmentLinks"
              :key="att.id"
              :href="att.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-primary break-all"
            >
              <span class="i-heroicons-link w-4 h-4 shrink-0" />
              <span class="min-w-0 truncate">{{ att.name || att.url }}</span>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                variant="ghost"
                color="red"
                class="shrink-0"
                aria-label="Odebrat odkaz"
                @click.prevent="removeAttachmentLink(att.id)"
              />
            </a>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <UInput
              v-model="newAttachmentName"
              placeholder="Název (volitelné)"
              size="sm"
              class="flex-1 min-w-0"
            />
            <UInput
              v-model="newAttachmentUrl"
              placeholder="https://..."
              size="sm"
              type="url"
              class="flex-1 min-w-0"
              @keydown.enter.prevent="addAttachmentLink"
            />
            <UButton
              icon="i-heroicons-plus"
              size="sm"
              :disabled="!newAttachmentUrl.trim()"
              @click="addAttachmentLink"
            >
              Přidat odkaz
            </UButton>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              :accept="allowedFileTypes"
              @change="onFileSelected"
            />
            <UButton
              icon="i-heroicons-arrow-up-tray"
              size="sm"
              variant="soft"
              :loading="attachmentUpload.uploading"
              :disabled="!task?.id || attachmentUpload.uploading"
              @click="fileInputRef?.click()"
            >
              Nahrát soubor (max {{ attachmentUpload.maxFileSizeMb }} MB)
            </UButton>
            <p v-if="attachmentUpload.uploadError" class="text-xs text-red-600 dark:text-red-400">
              {{ attachmentUpload.uploadError }}
            </p>
          </div>
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
                <div class="relative flex items-center gap-1">
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
                    <!-- Potvrzení smazání komentáře (inline) -->
                    <div
                      v-if="showDeleteCommentConfirm && deleteCommentId === c.id"
                      class="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <span class="text-gray-700 dark:text-gray-300">Smazat komentář?</span>
                      <UButton size="xs" color="red" @click="doDeleteComment">Ano</UButton>
                      <UButton size="xs" variant="ghost" @click="showDeleteCommentConfirm = false; deleteCommentId = null">Ne</UButton>
                    </div>
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
        <!-- Historie změn -->
        <section class="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span class="i-heroicons-clock w-4 h-4" />
            Historie
          </h3>
          <div v-if="history.length" class="space-y-2">
            <div
              v-for="entry in history"
              :key="entry.id"
              class="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400"
            >
              <span class="i-heroicons-user-circle w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ entry.userName }}</span>
                {{ historyLabel(entry) }}
                <span class="ml-1 text-gray-400">· {{ formatHistoryDate(entry.timestamp) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Žádná historie.</p>
        </section>
      </div>

      <!-- Akce dole -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <!-- Editační režim: Uložit / Zrušit -->
        <template v-if="editMode">
          <span class="text-xs text-gray-400">Upravuješ úkol</span>
          <div class="flex gap-2">
            <UButton variant="ghost" size="sm" @click="cancelEdit">Zrušit</UButton>
            <UButton icon="i-heroicons-check" size="sm" :loading="isSavingEdit" @click="saveEdit">Uložit</UButton>
          </div>
        </template>

        <!-- Normální režim -->
        <template v-else>
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
            <UButton icon="i-heroicons-pencil" size="sm" variant="soft" @click="startEdit">
              Upravit
            </UButton>
            <UButton icon="i-heroicons-trash" size="sm" color="red" variant="soft" @click="deleteTask">
              Smazat
            </UButton>
          </div>
        </template>
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
const projectsStore = useProjectsStore();
const { byId: taskLabelsById } = useTaskLabels();

// --- Inline editace ---
const editMode = ref(false);
const isSavingEdit = ref(false);
const editForm = ref({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '', assigneeId: '', assignee: '', storyPoints: 0 });

const projectMembers = computed(() => {
  if (!task.value) return [];
  const project = projectsStore.getProjectById(task.value.projectId);
  return project?.teamMembers ?? [];
});

function startEdit() {
  if (!task.value) return;
  editForm.value = {
    title: task.value.title,
    description: task.value.description ?? '',
    priority: task.value.priority ?? 'medium',
    dueDate: task.value.dueDate ? new Date(task.value.dueDate).toISOString().slice(0, 10) : '',
    assigneeId: task.value.assigneeId ?? '',
    assignee: task.value.assignee ?? '',
    storyPoints: task.value.storyPoints ?? 0
  };
  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
}

function onEditAssigneeChange() {
  const member = projectMembers.value.find((m) => m.userId === editForm.value.assigneeId);
  editForm.value.assignee = member ? (member.displayName || member.email) : '';
}

async function saveEdit() {
  if (!task.value || !editForm.value.title.trim()) return;
  isSavingEdit.value = true;
  const updates: Record<string, unknown> = {
    title: editForm.value.title.trim(),
    description: editForm.value.description.trim() || undefined,
    priority: editForm.value.priority,
    storyPoints: editForm.value.storyPoints || undefined,
    assigneeId: editForm.value.assigneeId || undefined,
    assignee: editForm.value.assignee || undefined,
    dueDate: editForm.value.dueDate ? new Date(editForm.value.dueDate) : undefined
  };
  const ok = await firestoreTasks.updateTask(task.value.id, updates as any);
  isSavingEdit.value = false;
  if (ok) {
    scrumBoard.updateTask(task.value.id, updates as any);
    editMode.value = false;
    useToast().add({ title: 'Úkol byl uložen', color: 'green' });
  } else {
    useToast().add({ title: 'Nepodařilo se uložit úkol', color: 'red' });
  }
}

// Při zavření panelu zrušit editaci
watch(() => props.isOpen, (open) => {
  if (!open) editMode.value = false;
});

const newComment = ref('');
const isSubmittingComment = ref(false);
const editingCommentId = ref<string | null>(null);
const editingCommentText = ref('');

const task = computed(() => props.task);

const taskChecklist = computed(() => task.value?.checklist ?? []);
const checklistDoneCount = computed(() => taskChecklist.value.filter((i: { done: boolean }) => i.done).length);
const taskAttachmentLinks = computed(() => task.value?.attachmentLinks ?? []);

const newChecklistTitle = ref('');
const newAttachmentName = ref('');
const newAttachmentUrl = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const attachmentUpload = useTaskAttachmentUpload();
const allowedFileTypes = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';

function genId() {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function addChecklistItem() {
  if (!task.value || !newChecklistTitle.value.trim()) return;
  const list = [...taskChecklist.value, { id: genId(), title: newChecklistTitle.value.trim(), done: false }];
  const ok = await firestoreTasks.updateTask(task.value.id, { checklist: list });
  if (ok) {
    scrumBoard.updateTask(task.value.id, { checklist: list });
    newChecklistTitle.value = '';
  } else {
    useToast().add({ title: 'Nepodařilo se přidat položku', color: 'red' });
  }
}

async function toggleChecklistItem(item: { id: string; title: string; done: boolean }) {
  if (!task.value) return;
  const list = taskChecklist.value.map((i: { id: string; title: string; done: boolean }) =>
    i.id === item.id ? { ...i, done: !i.done } : i
  );
  const ok = await firestoreTasks.updateTask(task.value.id, { checklist: list });
  if (ok) scrumBoard.updateTask(task.value.id, { checklist: list });
}

async function removeChecklistItem(id: string) {
  if (!task.value) return;
  const list = taskChecklist.value.filter((i: { id: string }) => i.id !== id);
  const ok = await firestoreTasks.updateTask(task.value.id, { checklist: list });
  if (ok) scrumBoard.updateTask(task.value.id, { checklist: list });
}

async function addAttachmentLink() {
  if (!task.value || !newAttachmentUrl.value.trim()) return;
  const url = newAttachmentUrl.value.trim();
  const name = newAttachmentName.value.trim() || url;
  const list = [...taskAttachmentLinks.value, { id: genId(), name, url }];
  const ok = await firestoreTasks.updateTask(task.value.id, { attachmentLinks: list });
  if (ok) {
    scrumBoard.updateTask(task.value.id, { attachmentLinks: list });
    newAttachmentName.value = '';
    newAttachmentUrl.value = '';
  } else {
    useToast().add({ title: 'Nepodařilo se přidat odkaz', color: 'red' });
  }
}

async function removeAttachmentLink(id: string) {
  if (!task.value) return;
  const list = taskAttachmentLinks.value.filter((a: { id: string }) => a.id !== id);
  const ok = await firestoreTasks.updateTask(task.value.id, { attachmentLinks: list });
  if (ok) scrumBoard.updateTask(task.value.id, { attachmentLinks: list });
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !task.value) return;
  const result = await attachmentUpload.uploadFile(task.value.id, file);
  input.value = '';
  if (result) {
    const list = [...taskAttachmentLinks.value, { id: genId(), name: result.name, url: result.url }];
    const ok = await firestoreTasks.updateTask(task.value.id, { attachmentLinks: list });
    if (ok) {
      scrumBoard.updateTask(task.value.id, { attachmentLinks: list });
      useToast().add({ title: 'Soubor byl nahrán', color: 'green' });
    } else {
      useToast().add({ title: 'Nepodařilo se uložit odkaz na soubor', color: 'red' });
    }
  } else {
    const err = (attachmentUpload.uploadError as { value?: string })?.value;
    if (err) useToast().add({ title: err, color: 'red' });
  }
}

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

const deleteCommentId = ref<string | null>(null);
const showDeleteCommentConfirm = ref(false);

function confirmDeleteComment(c: { id: string; text: string }) {
  deleteCommentId.value = c.id;
  showDeleteCommentConfirm.value = true;
}

async function doDeleteComment() {
  if (!task.value || !deleteCommentId.value) return;
  const id = deleteCommentId.value;
  showDeleteCommentConfirm.value = false;
  deleteCommentId.value = null;
  const ok = await firestoreTasks.deleteComment(task.value.id, id);
  if (ok) {
    if (editingCommentId.value === id) cancelEditComment();
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
        firestoreTasks.stopListeningHistory(lastListeningTaskId);
      }
      lastListeningTaskId = id;
      commentsLoading.value = true;
      firestoreTasks.listenComments(id);
      firestoreTasks.listenHistory(id);
      nextTick(() => {
        commentsLoading.value = false;
      });
    } else {
      if (lastListeningTaskId) {
        firestoreTasks.stopListeningComments(lastListeningTaskId);
        firestoreTasks.stopListeningHistory(lastListeningTaskId);
        lastListeningTaskId = null;
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (lastListeningTaskId) {
    firestoreTasks.stopListeningComments(lastListeningTaskId);
    firestoreTasks.stopListeningHistory(lastListeningTaskId);
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

// --- Historie ---
const history = computed(() => {
  if (!task.value) return [];
  return firestoreTasks.taskHistory.value[task.value.id] ?? [];
});

function historyLabel(entry: any): string {
  switch (entry.action) {
    case 'created': return 'vytvořil(a) úkol';
    case 'approved': return 'schválil(a) úkol';
    case 'updated':
      if (entry.field && entry.newValue !== null && entry.newValue !== undefined && entry.newValue !== '') {
        return `změnil(a) ${entry.field} → ${entry.newValue}`;
      }
      if (entry.field) return `změnil(a) ${entry.field}`;
      return 'upravil(a) úkol';
    default: return entry.action;
  }
}

function formatHistoryDate(timestamp: any): string {
  if (!timestamp) return '';
  const d = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
