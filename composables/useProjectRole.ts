import type { Project, TeamMemberRole } from '~/types';

/**
 * Vrací roli aktuálního uživatele v projektu.
 * Owner = createdBy projektu, ostatní z teamMembers[].role (default member).
 */
export function useProjectRole(project: MaybeRefOrGetter<Project | null>) {
  const auth = useAuth();

  const currentUserRole = computed<TeamMemberRole | null>(() => {
    const p = toValue(project);
    const uid = auth.user.value?.uid;
    if (!p || !uid) return null;
    if (p.createdBy === uid) return 'owner';
    const member = (p.teamMembers || []).find((m) => m.userId === uid);
    if (!member) return null;
    return (member.role === 'admin' ? 'admin' : 'member') as TeamMemberRole;
  });

  const isOwner = computed(() => currentUserRole.value === 'owner');
  const isAdmin = computed(() => currentUserRole.value === 'admin');
  const isMember = computed(() => currentUserRole.value === 'member');
  const isOwnerOrAdmin = computed(() => currentUserRole.value === 'owner' || currentUserRole.value === 'admin');

  /** Může mazat projekt (tým), měnit billing, přenést vlastnictví – pouze Owner */
  const canManageTeam = computed(() => isOwner.value);

  /** Může zvát/odebírat členy a měnit role (kromě Ownera) – Owner + Admin */
  const canManageMembers = computed(() => isOwnerOrAdmin.value);

  /** Může vytvářet/mazat projekty a seznamy (statusy), upravovat všechny úkoly – Owner + Admin */
  const canManageProjectsAndTasks = computed(() => isOwnerOrAdmin.value);

  /** Může zvát členy – Owner + Admin */
  const canInviteMembers = computed(() => canManageMembers.value);

  /** Může odebírat členy (kromě Ownera) – Owner + Admin */
  const canRemoveMembers = computed(() => canManageMembers.value);

  /** Může měnit role (kromě Ownera) – Owner + Admin */
  const canChangeRoles = computed(() => canManageMembers.value);

  /** Může mazat projekt – pouze Owner */
  const canDeleteProject = computed(() => isOwner.value);

  /** Může upravit libovolný úkol (ne jen vlastní) – Owner + Admin */
  const canEditAnyTask = computed(() => isOwnerOrAdmin.value);

  return {
    currentUserRole,
    isOwner,
    isAdmin,
    isMember,
    isOwnerOrAdmin,
    canManageTeam,
    canManageMembers,
    canManageProjectsAndTasks,
    canInviteMembers,
    canRemoveMembers,
    canChangeRoles,
    canDeleteProject,
    canEditAnyTask
  };
}
