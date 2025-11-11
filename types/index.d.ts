export interface TeamMember {
  userId: string;
  email: string;
  displayName?: string;
  addedAt: Date;
  addedBy: string;
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
}

export {}
