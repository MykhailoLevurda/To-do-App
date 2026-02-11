export interface TeamMember {
  userId: string;
  email: string;
  displayName?: string;
  addedAt: Date;
  addedBy: string;
}

/** Vlastní stav úkolu v projektu (sloupec na boardu) */
export interface ProjectStatus {
  id: string;
  title: string;
  color?: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  taskCount?: number;
  teamMembers?: TeamMember[];
  /** Vlastní stavy úkolů – majitel projektu je přidává; pokud prázdné, použijí se výchozí (To Do, In Progress, Done) */
  statuses?: ProjectStatus[];
}

export {}
