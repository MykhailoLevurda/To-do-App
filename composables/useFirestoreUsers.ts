import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

export interface FreeloUserCredentials {
  email: string;
  apiKey: string; // Šifrovaný API klíč (v produkci by měl být šifrovaný)
  createdAt: Date;
  updatedAt: Date;
}

export const useFirestoreUsers = () => {
  const { $firestore } = useNuxtApp();
  const firestore = $firestore;

  /**
   * Uloží nebo aktualizuje uživatelské credentials do Firestore
   */
  const saveUserCredentials = async (email: string, apiKey: string): Promise<string | null> => {
    try {
      const usersRef = collection(firestore, 'users');
      
      // Zkontrolovat, jestli uživatel už existuje
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Aktualizovat existujícího uživatele
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
          apiKey, // V produkci by měl být šifrovaný
          updatedAt: serverTimestamp(),
        });
        return userDoc.id;
      } else {
        // Vytvořit nového uživatele
        const docRef = await addDoc(usersRef, {
          email,
          apiKey, // V produkci by měl být šifrovaný
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('[Firestore Users] Error saving user credentials:', error);
      return null;
    }
  };

  /**
   * Načte credentials uživatele z Firestore
   */
  const getUserCredentials = async (email: string): Promise<{ email: string; apiKey: string } | null> => {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const userData = snapshot.docs[0].data();
      return {
        email: userData.email,
        apiKey: userData.apiKey, // V produkci by měl být dešifrovaný
      };
    } catch (error) {
      console.error('[Firestore Users] Error getting user credentials:', error);
      return null;
    }
  };

  /**
   * Smaže credentials uživatele z Firestore
   */
  const deleteUserCredentials = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return false;
      }
      
      // Poznámka: V produkci bychom měli smazat dokument, ale pro jednoduchost jen vymažeme API klíč
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, {
        apiKey: '',
        updatedAt: serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error('[Firestore Users] Error deleting user credentials:', error);
      return false;
    }
  };

  return {
    saveUserCredentials,
    getUserCredentials,
    deleteUserCredentials,
  };
};


