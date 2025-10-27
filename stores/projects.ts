import { defineStore } from "pinia";
import type { Project } from "~/types";

export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
}

export const useProjectsStore = defineStore("projects", {
  state: (): ProjectsState => ({
    projects: [],
    currentProject: null,
    isLoading: false
  }),
  getters: {
    activeProjects: (state) => 
      state.projects.filter(project => project.status === 'active'),
    archivedProjects: (state) => 
      state.projects.filter(project => project.status === 'archived'),
    totalProjects: (state) => state.projects.length,
    getProjectById: (state) => (id: string) => 
      state.projects.find(project => project.id === id)
  },
  actions: {
    setProjects(projects: Project[]) {
      this.projects = projects;
    },
    addProject(project: Project) {
      this.projects.unshift(project);
    },
    updateProject(projectId: string, updates: Partial<Project>) {
      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        Object.assign(project, updates);
        project.updatedAt = new Date();
      }
    },
    removeProject(projectId: string) {
      this.projects = this.projects.filter(p => p.id !== projectId);
    },
    setCurrentProject(project: Project | null) {
      this.currentProject = project;
    },
    setLoading(loading: boolean) {
      this.isLoading = loading;
    },
    clearProjects() {
      this.projects = [];
      this.currentProject = null;
    }
  },
  persist: {
    key: 'projects',
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    paths: ['projects', 'currentProject']
  }
});

