import { collection, query, where, onSnapshot, type Unsubscribe } from 'firebase/firestore';

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

  let unsubscribe: Unsubscribe | null = null;

  function startListening() {
    if (!auth.user.value?.email || !firestore) return;
    if (unsubscribe) return; // listener již běží

    const userEmail = auth.user.value.email.toLowerCase();
    const q = query(
      collection(firestore, 'projects'),
      where('pendingInviteEmails', 'array-contains', userEmail)
    );

    loading.value = true;
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
        loading.value = false;
      },
      (e) => {
        console.error('[Notifications] Listener error:', e);
        loading.value = false;
      }
    );
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    pendingInvites.value = [];
  }

  /** Zachováno pro zpětnou kompatibilitu – restartuje listener */
  function fetchPendingInvites() {
    stopListening();
    startListening();
  }

  return {
    pendingInvites: readonly(pendingInvites),
    loading: readonly(loading),
    startListening,
    stopListening,
    fetchPendingInvites
  };
};
