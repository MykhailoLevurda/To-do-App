<script setup lang="ts">
import type { TodoItem } from "~/stores/todos";
const todos = useTodosStore();
const { $axios } = useNuxtApp();
const loading = ref(false);
const newTitle = ref("");

async function load() {
  loading.value = true;
  try {
    const data = await $axios.get<TodoItem[]>("/todos");
    todos.setItems(data);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (todos.items.length === 0) load();
});
</script>
<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Dashboard</div>
          <UButton :loading="loading" icon="i-heroicons-arrow-path" color="gray" variant="ghost" @click="load">Refresh</UButton>
        </div>
      </template>
      <div class="flex gap-2">
        <UInput v-model="newTitle" placeholder="Add todo..." @keyup.enter="() => { if(newTitle){ todos.add(newTitle); newTitle=''; } }" />
        <UButton @click="() => { if(newTitle){ todos.add(newTitle); newTitle=''; } }">Add</UButton>
        <UButton color="gray" variant="soft" @click="todos.clearCompleted">Clear completed</UButton>
      </div>
    </UCard>

    <UCard>
      <UTable :rows="todos.items" :columns="[{ key: 'title', label: 'Title' }, { key: 'done', label: 'Done' }]">
        <template #done-data="{ row }">
          <UCheckbox :model-value="row.done" @update:model-value="() => todos.toggle(row.id)" />
        </template>
        <template #actions-data="{ row }">
          <UButton color="red" variant="soft" @click="todos.remove(row.id)">Delete</UButton>
        </template>
      </UTable>
      <template #footer>
        <div class="text-sm text-gray-500">Remaining: {{ todos.remainingCount }}</div>
      </template>
    </UCard>
  </div>
</template>
