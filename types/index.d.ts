/** Role v týmu projektu. Owner = createdBy projektu (není v teamMembers). */
export type TeamMemberRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  userId: string;
  email: string;
  displayName?: string;
  addedAt: Date;
  addedBy: string;
  /** Role v týmu. Pouze admin | member; owner je vždy createdBy projektu. */
  role?: 'admin' | 'member';
}

/** Polozka checklistu na ukolu (jako Trello) */
export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

/** Odkaz prilohy na ukolu (odkaz nebo nazev souboru) */
export interface AttachmentLink {
  id: string;
  name: string;
  url: string;
}

/** Vlastní stav úkolu v projektu (sloupec na boardu) */
export interface ProjectStatus {
  id: string;
  title: string;
  color?: string;
  order: number;
}

/** Mapa userId → role pro rychlé kontroly v pravidlech (Owner = createdBy, není v mapě). */
export type ProjectMemberRoles = Record<string, 'admin' | 'member'>;

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
  /** Pro Firestore rules: userId → role (admin | member). Drž v sync s teamMembers. */
  memberRoles?: ProjectMemberRoles;
  /** Pro dotaz „projekty, kde jsem člen“: array-contains(userId). Drž v sync s teamMembers (jen userId z teamMembers). */
  memberIds?: string[];
  /** E-maily uživatelů s čekající pozvánkou (pro Firestore pravidla při accept). */
  pendingInviteEmails?: string[];
  /** Vlastní stavy úkolů – majitel projektu je přidává; pokud prázdné, použijí se výchozí (To Do, In Progress, Done) */
  statuses?: ProjectStatus[];
}

export {}
