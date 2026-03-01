import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  increment
} from 'firebase/firestore';

const COLLECTION = 'userProjectTime';

export interface ProjectTimeEntry {
  userId: string;
  projectId: string;
  totalSeconds: number;
  updatedAt?: Date | null;
}

/**
 * Čas strávený přihlášeným uživatelem na projektech.
 * Workflow: uživatel otevře projekt → spustí timer → při Zastavit se čas uloží do Firestore.
 */
export const useProjectTime = () => {
  const nuxtApp = useNuxtApp();
  const firestore = nuxtApp.$firestore as import('firebase/firestore').Firestore | null;
  const auth = useAuth();

  if (!firestore && import.meta.client) {
    console.warn('[ProjectTime] Firestore is not available');
  }

  function docId(projectId: string) {
    if (!auth.user.value) return null;
    return `${auth.user.value.uid}_${projectId}`;
  }

  /** Načte celkový počet sekund, které přihlášený uživatel strávil u daného projektu. */
  const getTotalSeconds = async (projectId: string): Promise<number> => {
    if (!firestore) return 0;
    const id = docId(projectId);
    if (!id) return 0;
    try {
      const ref = doc(firestore, COLLECTION, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return 0;
      const data = snap.data();
      return typeof data?.totalSeconds === 'number' ? data.totalSeconds : 0;
    } catch (e) {
      console.warn('[ProjectTime] getTotalSeconds failed:', e);
      return 0;
    }
  };

  /** Připočte sekundy k celkovému času uživatele u projektu (volat při Zastavit timeru). */
  const addTime = async (projectId: string, secondsToAdd: number): Promise<boolean> => {
    if (!firestore || !auth.user.value || secondsToAdd <= 0) return false;
    const id = docId(projectId)!;
    try {
      const ref = doc(firestore, COLLECTION, id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          totalSeconds: increment(secondsToAdd),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(ref, {
          userId: auth.user.value.uid,
          projectId,
          totalSeconds: secondsToAdd,
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (e: any) {
      console.warn('[ProjectTime] addTime failed:', e?.message || e, { projectId, secondsToAdd });
      return false;
    }
  };

  /** Všechna aktivita v daném projektu (pro majitele projektu – vidí všechny uživatele). */
  const getActivityByProjectId = async (projectId: string): Promise<ProjectTimeEntry[]> => {
    if (!firestore || !auth.user.value) return [];
    try {
      const ref = collection(firestore, COLLECTION);
      const q = query(ref, where('projectId', '==', projectId));
      const snap = await getDocs(q);
      const out: ProjectTimeEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const totalSeconds = typeof data.totalSeconds === 'number' ? data.totalSeconds : 0;
        if (totalSeconds > 0)
          out.push({
            userId: data.userId,
            projectId: data.projectId,
            totalSeconds,
            updatedAt: data.updatedAt?.toDate?.() ?? null
          });
      });
      return out;
    } catch (e) {
      console.warn('[ProjectTime] getActivityByProjectId failed:', e);
      return [];
    }
  };

  /** Aktivita přihlášeného uživatele ve všech projektech (vlastní záznamy). */
  const getMyActivity = async (): Promise<ProjectTimeEntry[]> => {
    if (!firestore || !auth.user.value) return [];
    try {
      const ref = collection(firestore, COLLECTION);
      const q = query(ref, where('userId', '==', auth.user.value!.uid));
      const snap = await getDocs(q);
      const out: ProjectTimeEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const totalSeconds = typeof data.totalSeconds === 'number' ? data.totalSeconds : 0;
        if (totalSeconds > 0)
          out.push({
            userId: data.userId,
            projectId: data.projectId,
            totalSeconds,
            updatedAt: data.updatedAt?.toDate?.() ?? null
          });
      });
      return out;
    } catch (e) {
      console.warn('[ProjectTime] getMyActivity failed:', e);
      return [];
    }
  };

  return { getTotalSeconds, addTime, getActivityByProjectId, getMyActivity };
};
