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
          />
        </div>
      </div>
    </template>

    <div class="space-y-2">
      <p v-if="task.description" class="hidden text-xs text-gray-600 dark:text-gray-400">
        {{ task.description }}
      </p>
      
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
            <UserIcon class="w-4 h-4" />
            <span>{{ task.assignee }}</span>
          </div>

          <div v-if="task.storyPoints" class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <ChartBarIcon class="w-4 h-4" />
            <span>{{ task.storyPoints }} pts</span>
          </div>
        </div>
        <span class="text-gray-400">
          {{ formatDate(task.createdAt) }}
        </span>
      </div>
    </div>
  </UCard>

  <UModal v-model="showModal" size="lg">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="font-semibold text-lg">{{ task.title }}</h3>
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
        <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {{ task.description || 'Žádný popis k tomuto úkolu.' }}
        </p>

        <div class="border-t pt-3 text-sm space-y-1">
          <p><strong>Priorita:</strong> {{ task.priority }}</p>
          <p v-if="task.assignee"><strong>Řešitel:</strong> {{ task.assignee }}</p>
          <p v-if="task.dueDate"><strong>Termín:</strong> {{ formatDueDate(task.dueDate) }}</p>
          <p v-if="task.storyPoints"><strong>Body:</strong> {{ task.storyPoints }}</p>
          <p><strong>Vytvořeno:</strong> {{ formatDate(task.createdAt) }}</p>
        </div>

        <div class="mt-6 border-t pt-4">
          <h4 class="font-semibold mb-2">Komentáře</h4>

          <div v-if="taskComments[task.id]?.length" class="space-y-3">
            <div 
              v-for="c in taskComments[task.id]" 
              :key="c.id"
              class="p-2 rounded bg-gray-100 dark:bg-gray-800 text-sm"
            >
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>{{ c.author }}</span>
                <span>{{ new Date(c.createdAt?.toDate?.() || 0).toLocaleString('cs-CZ') }}</span>
              </div>

              <template v-if="editingCommentId === c.id">
                <textarea
                  v-model="editingCommentText"
                  class="w-full p-2 rounded border"
                  rows="2"
                ></textarea>

                <div class="flex gap-2 mt-2">
                  <UButton size="xs" @click="saveEditedComment(c.id)">Uložit</UButton>
                  <UButton size="xs" color="gray" @click="cancelEdit()">Zrušit</UButton>
                </div>
              </template>

              <template v-else>
                <p class="whitespace-pre-wrap">{{ c.text }}</p>

                <div class="flex gap-3 mt-2 text-xs text-gray-500">
                  <button @click="startEdit(c)" class="hover:underline">Upravit</button>
                  <button @click="removeComment(c.id)" class="hover:underline text-red-500">Smazat</button>
                </div>
              </template>
            </div>
          </div>

          <p v-else class="text-xs text-gray-400 mb-3">Zatím žádné komentáře.</p>

          <textarea
            v-model="newComment"
            rows="3"
            class="w-full p-2 border rounded text-sm"
            placeholder="Přidat komentář..."
          ></textarea>

          <UButton 
            class="mt-2"
            :disabled="!newComment.trim()"
            @click="submitComment"
          >
            Odeslat
          </UButton>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full items-center">
          <div class="text-xs flex items-center gap-1">
            <template v-if="task.status === 'done'">
              <div v-if="task.approved" class="flex items-center gap-1 text-green-600">
                <CheckCircleIcon class="w-4 h-4" /> Schváleno
              </div>
              <div v-else class="flex items-center gap-1 text-yellow-600">
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
import type { TaskItem } from '~/stores/todos'
import { UserIcon, ChartBarIcon } from '@heroicons/vue/24/solid'

const {
  addComment,
  listenComments,
  stopListeningComments,
  taskComments,
  deleteComment,
  updateComment,
  approveTask: approveTaskFirestore
} = useFirestoreTasks()

const editingCommentId = ref<string | null>(null)
const editingCommentText = ref('')
const newComment = ref('')

interface Props {
  task: TaskItem
}
const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [task: TaskItem]
  delete: [taskId: string]
  move: [taskId: string, newStatus: string]
}>()

const showModal = ref(false)
const openModal = () => (showModal.value = true)

watch(showModal, (open) => {
  if (open) listenComments(props.task.id)
  else stopListeningComments(props.task.id)
})

async function submitComment() {
  if (!newComment.value.trim()) return
  await addComment(props.task.id, newComment.value.trim())
  newComment.value = ''
}

async function approveTask() {
  await approveTaskFirestore(props.task.id)
  showModal.value = false
}

function editTask() {
  showModal.value = false
  emit('edit', props.task)
}

function deleteTask() {
  showModal.value = false
  emit('delete', props.task.id)
}

function startEdit(c: any) {
  editingCommentId.value = c.id
  editingCommentText.value = c.text
}

function cancelEdit() {
  editingCommentId.value = null
  editingCommentText.value = ''
}

async function saveEditedComment(id: string) {
  await updateComment(props.task.id, id, editingCommentText.value)
  editingCommentId.value = null
  editingCommentText.value = ''
}

async function removeComment(id: string) {
  await deleteComment(props.task.id, id)
}

const priorityClass = computed(() => {
  switch (props.task.priority) {
    case 'high': return 'border-l-4 border-l-red-500'
    case 'medium': return 'border-l-4 border-l-yellow-500'
    case 'low': return 'border-l-4 border-l-green-500'
    default: return ''
  }
})

const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'high': return 'red'
    case 'medium': return 'yellow'
    case 'low': return 'green'
    default: return 'gray'
  }
})

function getDaysDifference() {
  if (!props.task.dueDate) return null
  const now = new Date()
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(props.task.dueDate)
  const dm = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return (dm.getTime() - n.getTime()) / 86400000
}

const deadlineColorName = computed(() => {
  const d = getDaysDifference()
  if (d === null) return 'gray'
  if (d < 0) return 'red'
  if (d <= 2) return 'yellow'
  return 'blue'
})

const deadlineTextColor = computed(() => ({
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  blue: 'text-blue-600',
  gray: 'text-gray-500'
}[deadlineColorName.value]))

const deadlineStatus = computed(() => {
  const d = getDaysDifference()
  if (d === null) return ''
  const days = Math.ceil(d)
  if (d < 0) return `Po termínu (${Math.abs(days)}d)`
  if (days === 0) return 'Dnes!'
  if (days === 1) return 'Zítra'
  if (days <= 7) return `${days} dní`
  return `${Math.ceil(days/7)} týdnů`
})

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })
}

function formatDueDate(date: Date) {
  return new Date(date).toLocaleDateString('cs-CZ')
}

function handleDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.task.id)
}
function handleDragEnd() {}
</script>

<style scoped>
.task-card { min-height: 120px; }
.deadline-bar-red { background-color: #ef4444 !important; }
.deadline-bar-yellow { background-color: #eab308 !important; }
.deadline-bar-blue { background-color: #3b82f6 !important; }
.deadline-bar-gray { background-color: #d1d5db !important; }
</style>
