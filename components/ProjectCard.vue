<template>
  <UCard 
    class="cursor-pointer hover:shadow-lg transition-shadow"
    :ui="{ body: { padding: 'p-0' } }"
  >
    <div class="flex items-center gap-4 p-4" @click="$emit('click')">
      <!-- Color indicator -->
      <div 
        class="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl"
        :style="{ backgroundColor: project.color }"
      >
        📁
      </div>

      <!-- Project info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-lg font-semibold truncate">{{ project.name }}</h3>
          <UBadge 
            v-if="project.status === 'archived'" 
            color="gray" 
            variant="soft"
            size="xs"
          >
            Archivováno
          </UBadge>
        </div>
        <p v-if="project.description" class="text-sm text-gray-500 truncate mb-2">
          {{ project.description }}
        </p>
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <div class="flex items-center gap-1">
            <div class="i-heroicons-clipboard-document-list"></div>
            <span>{{ project.taskCount || 0 }} úkolů</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="i-heroicons-calendar"></div>
            <span>{{ formatDate(project.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2" @click.stop>
        <UButton
          icon="i-heroicons-pencil"
          size="sm"
          color="gray"
          variant="ghost"
          @click="$emit('edit')"
        />
        
        <UDropdown 
          :items="dropdownItems"
          :popper="{ placement: 'bottom-end' }"
        >
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            size="sm"
            color="gray"
            variant="ghost"
          />
        </UDropdown>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Project } from '~/types';

const props = defineProps<{
  project: Project;
}>();

const emit = defineEmits<{
  click: [];
  edit: [];
  archive: [];
  unarchive: [];
  delete: [];
}>();

// Dropdown items
const dropdownItems = computed(() => {
  const items = [];
  
  if (props.project.status === 'active') {
    items.push([
      {
        label: 'Archivovat',
        icon: 'i-heroicons-archive-box',
        click: () => emit('archive')
      }
    ]);
  } else {
    items.push([
      {
        label: 'Obnovit',
        icon: 'i-heroicons-arrow-uturn-left',
        click: () => emit('unarchive')
      }
    ]);
  }
  
  items.push([
    {
      label: 'Smazat',
      icon: 'i-heroicons-trash',
      click: () => emit('delete'),
      class: 'text-red-600'
    }
  ]);
  
  return items;
});

// Format date
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Včera';
  if (days < 7) return `Před ${days} dny`;
  if (days < 30) return `Před ${Math.floor(days / 7)} týdny`;
  if (days < 365) return `Před ${Math.floor(days / 30)} měsíci`;
  
  return date.toLocaleDateString('cs-CZ');
}
</script>

