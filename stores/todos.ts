import { defineStore } from "pinia";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  storyPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrumBoardState {
  tasks: TaskItem[];
  columns: {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    color: string;
  }[];
}

export const useScrumBoardStore = defineStore("scrumBoard", {
  state: (): ScrumBoardState => ({
    tasks: [],
    columns: [
      { id: 'todo', title: 'To Do', status: 'todo', color: 'blue' },
      { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: 'yellow' },
      { id: 'done', title: 'Done', status: 'done', color: 'green' }
    ]
  }),
  getters: {
    tasksByStatus: (state) => (status: 'todo' | 'in-progress' | 'done') => 
      state.tasks.filter(task => task.status === status),
    totalTasks: (state) => state.tasks.length,
    completedTasks: (state) => state.tasks.filter(task => task.status === 'done').length,
    inProgressTasks: (state) => state.tasks.filter(task => task.status === 'in-progress').length
  },
  actions: {
    addTask(task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) {
      const newTask: TaskItem = {
        ...task,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tasks.unshift(newTask);
    },
    updateTaskStatus(taskId: string, newStatus: 'todo' | 'in-progress' | 'done') {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = newStatus;
        task.updatedAt = new Date();
      }
    },
    updateTask(taskId: string, updates: Partial<TaskItem>) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        task.updatedAt = new Date();
      }
    },
    removeTask(taskId: string) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
    },
    moveTask(taskId: string, fromStatus: string, toStatus: string) {
      this.updateTaskStatus(taskId, toStatus as 'todo' | 'in-progress' | 'done');
    }
  },
  persist: true
});

// Keep the old store for backward compatibility
export const useTodosStore = defineStore("todos", {
  state: () => ({ items: [] }),
  getters: {
    remainingCount: (state) => state.items.filter((t) => !t.done).length
  },
  actions: {
    setItems(items: any[]) {
      this.items = items;
    },
    add(title: string) {
      const item = { id: crypto.randomUUID(), title, done: false };
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



