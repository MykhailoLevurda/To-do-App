/** Předdefinované štítky pro úkoly (jako Trello) */
export const LABEL_PRESETS: { id: string; name: string; color: string }[] = [
  { id: 'bug', name: 'Bug', color: 'red' },
  { id: 'feature', name: 'Feature', color: 'blue' },
  { id: 'urgent', name: 'Urgent', color: 'orange' },
  { id: 'documentation', name: 'Dokumentace', color: 'gray' },
  { id: 'review', name: 'Review', color: 'purple' }
];

export function useTaskLabels() {
  const byId = computed(() => {
    const map: Record<string, { id: string; name: string; color: string }> = {};
    LABEL_PRESETS.forEach((l) => { map[l.id] = l; });
    return map;
  });
  return { LABEL_PRESETS, byId };
}
