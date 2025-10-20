import { defineStore } from "pinia";

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
}

interface TodosState {
  items: TodoItem[];
}

export const useTodosStore = defineStore("todos", {
  state: (): TodosState => ({ items: [] }),
  getters: {
    remainingCount: (state) => state.items.filter((t) => !t.done).length
  },
  actions: {
    setItems(items: TodoItem[]) {
      this.items = items;
    },
    add(title: string) {
      const item: TodoItem = { id: crypto.randomUUID(), title, done: false };
      this.items.unshift(item);
    },
    toggle(id: string) {
      const item = this.items.find((t) => t.id === id);
      if (item) item.done = !item.done;
    },
    remove(id: string) {
      this.items = this.items.filter((t) => t.id !== id);
    },
    clearCompleted() {
      this.items = this.items.filter((t) => !t.done);
    }
  },
  persist: true
});



