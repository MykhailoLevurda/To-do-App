import { collection, query, where, getDocs } from 'firebase/firestore';

export interface PendingInviteNotification {
  projectId: string;
  projectName: string;
  email: string;
  role: 'admin' | 'member';
}

export const useNotifications = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;
  const auth = useAuth();

  const pendingInvites = ref<PendingInviteNotification[]>([]);
  const loading = ref(false);

  async function fetchPendingInvites() {
    if (!auth.user.value?.email || !firestore) return;

    loading.value = true;
    try {
      const userEmail = auth.user.value.email.toLowerCase();
      const projectsRef = collection(firestore, 'projects');
      const q = query(
        projectsRef,
        where('pendingInviteEmails', 'array-contains', userEmail)
      );
      const snapshot = await getDocs(q);
      const invites: PendingInviteNotification[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const members = (data.teamMembers || []) as Array<{ email?: string; role?: string }>;
        const pendingMember = members.find(
          (m) => m.email?.toLowerCase() === userEmail
        );
        if (pendingMember) {
          invites.push({
            projectId: docSnap.id,
            projectName: data.name || 'Projekt',
            email: userEmail,
            role: pendingMember.role === 'admin' ? 'admin' : 'member'
          });
        }
      });

      pendingInvites.value = invites;
      return invites;
    } catch (e) {
      console.error('[Notifications] Error fetching pending invites:', e);
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    pendingInvites: readonly(pendingInvites),
    loading: readonly(loading),
    fetchPendingInvites
  };
};
