import { defineStore } from "pinia";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  /** Id stavu z project.statuses (nebo 'todo'|'in-progress'|'done' pro zpětnou kompatibilitu) */
  status: string;
  priority: 'low' | 'medium' | 'high';
  /** userId přiřazeného člena (z teamMembers projektu) */
  assigneeId?: string;
  /** Jméno přiřazeného pro zobrazení (např. z teamMembers) */
  assignee?: string;
  storyPoints?: number;
  projectId: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  approved?: boolean;
  /** Checklist (subukoly) na kartě – jako Trello */
  checklist?: { id: string; title: string; done: boolean }[];
  /** Odkazy příloh (název + URL) */
  attachmentLinks?: { id: string; name: string; url: string }[];
  /** Pořadí v backlogu (první sloupec); menší = výše */
  backlogOrder?: number;
  /** Štítky (např. bug, feature) – id z předdefinovaných */
  labelIds?: string[];
  /** Id sprintu, do kterého je úkol zařazen (volitelné) */
  sprintId?: string;
}

export interface ScrumBoardState {
  tasks: TaskItem[];
  isLoading: boolean;
  currentUserId: string | null;
}

export const useScrumBoardStore = defineStore("scrumBoard", {
  state: (): ScrumBoardState => ({
    tasks: [],
    isLoading: false,
    currentUserId: null
  }),
  getters: {
    tasksByStatus: (state) => (statusId: string) =>
      state.tasks.filter(task => task.status === statusId),
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
    updateTaskStatus(taskId: string, newStatus: string) {
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
    moveTask(taskId: string, _fromStatus: string, toStatus: string) {
      this.updateTask(taskId, { status: toStatus });
    },
    clearTasks() {
      this.tasks = [];
    },
    setTasks(tasks: TaskItem[]) {
      this.tasks = tasks;
    },
    setLoading(loading: boolean) {
      this.isLoading = loading;
    },
    setCurrentUserId(userId: string | null) {
      // If user changed, clear tasks from old user
      if (this.currentUserId && userId && this.currentUserId !== userId) {
        this.tasks = [];
      }
      this.currentUserId = userId;
    }
  },
  // Disable automatic persistence to avoid Vue reactivity issues with cross-origin objects
  persist: false
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



