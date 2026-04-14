import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import type { Sprint, SprintStatus } from '~/types';

export function useSprints(projectId: Ref<string> | string) {
  const nuxtApp = useNuxtApp();
  const firestore = (nuxtApp as any).$firestore as import('firebase/firestore').Firestore | null;
  const auth = useAuth();

  const pid = computed(() => (typeof projectId === 'string' ? projectId : projectId.value));
  const sprints = ref<Sprint[]>([]);
  let unsubscribe: Unsubscribe | null = null;

  function docToSprint(docSnap: { id: string; data: () => Record<string, any> }): Sprint {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      projectId: data.projectId,
      name: data.name,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      status: (data.status || 'planned') as SprintStatus,
      goal: data.goal,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  function startListening() {
    if (!firestore || !auth.user.value || !pid.value) return;
    if (unsubscribe) unsubscribe();

    const q = query(
      collection(firestore, 'sprints'),
      where('projectId', '==', pid.value)
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => docToSprint({ id: d.id, data: () => d.data() }));
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        sprints.value = list;
      },
      (err) => {
        console.error('[useSprints] Listener error:', err);
      }
    );
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    sprints.value = [];
  }

  const activeSprint = computed(() => sprints.value.find((s) => s.status === 'active') ?? null);

  async function addSprint(params: {
    name: string;
    startDate: Date;
    endDate: Date;
    goal?: string;
  }): Promise<string | null> {
    if (!firestore || !auth.user.value || !pid.value) return null;
    try {
      const ref = await addDoc(collection(firestore, 'sprints'), {
        projectId: pid.value,
        name: params.name,
        startDate: params.startDate,
        endDate: params.endDate,
        status: 'planned',
        goal: params.goal || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return ref.id;
    } catch (e) {
      console.error('[useSprints] addSprint failed:', e);
      return null;
    }
  }

  async function updateSprint(
    sprintId: string,
    updates: Partial<Pick<Sprint, 'name' | 'startDate' | 'endDate' | 'goal' | 'status'>>
  ): Promise<boolean> {
    if (!firestore || !auth.user.value) return false;
    try {
      const ref = doc(firestore, 'sprints', sprintId);
      const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.startDate !== undefined) data.startDate = updates.startDate;
      if (updates.endDate !== undefined) data.endDate = updates.endDate;
      if (updates.goal !== undefined) data.goal = updates.goal;
      if (updates.status !== undefined) data.status = updates.status;
      await updateDoc(ref, data);
      return true;
    } catch (e) {
      console.error('[useSprints] updateSprint failed:', e);
      return false;
    }
  }

  /** Nastaví sprint na aktivní; ostatní aktivní sprinty v projektu uzavře */
  async function startSprint(sprintId: string): Promise<boolean> {
    if (!firestore || !auth.user.value) return false;
    try {
      const active = activeSprint.value;
      if (active && active.id !== sprintId) {
        await updateSprint(active.id, { status: 'closed' });
      }
      return await updateSprint(sprintId, { status: 'active' });
    } catch (e) {
      console.error('[useSprints] startSprint failed:', e);
      return false;
    }
  }

  async function closeSprint(sprintId: string): Promise<boolean> {
    return updateSprint(sprintId, { status: 'closed' });
  }

  async function deleteSprint(sprintId: string): Promise<boolean> {
    if (!firestore || !auth.user.value) return false;
    try {
      await deleteDoc(doc(firestore, 'sprints', sprintId));
      return true;
    } catch (e) {
      console.error('[useSprints] deleteSprint failed:', e);
      return false;
    }
  }

  return {
    sprints: readonly(sprints),
    activeSprint,
    startListening,
    stopListening,
    addSprint,
    updateSprint,
    startSprint,
    closeSprint,
    deleteSprint
  };
}
