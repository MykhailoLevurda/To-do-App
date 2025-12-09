import {
  collection,
  doc,
  addDoc,
  setDoc,
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
      console.log('[Firestore Users] Saving credentials for email:', email, 'API key length:', apiKey?.length || 0);
      
      const usersRef = collection(firestore, 'users');
      
      // Zkontrolovat, jestli uživatel už existuje
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Aktualizovat existujícího uživatele
        const userDoc = snapshot.docs[0];
        console.log('[Firestore Users] Updating existing user:', userDoc.id);
        console.log('[Firestore Users] Current document data:', userDoc.data());
        
        try {
          // Zkusit nejdřív setDoc s merge
          await setDoc(userDoc.ref, {
            email,
            apiKey, // V produkci by měl být šifrovaný
            updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('[Firestore Users] ✅ User credentials saved using setDoc with merge');
        } catch (setDocError: any) {
          console.error('[Firestore Users] ❌ setDoc failed, trying updateDoc:', setDocError);
          // Fallback na updateDoc
          try {
            await updateDoc(userDoc.ref, {
              apiKey, // V produkci by měl být šifrovaný
              updatedAt: serverTimestamp(),
            });
            console.log('[Firestore Users] ✅ User credentials saved using updateDoc');
          } catch (updateError: any) {
            console.error('[Firestore Users] ❌ Both setDoc and updateDoc failed:', updateError);
            throw updateError;
          }
        }
        
        // Ověřit, že se aktualizace skutečně provedla
        const updatedDoc = await getDoc(userDoc.ref);
        const updatedData = updatedDoc.data();
        console.log('[Firestore Users] Verified updated document, API key length:', updatedData?.apiKey?.length || 0);
        
        if (!updatedData?.apiKey || updatedData.apiKey.length === 0) {
          console.error('[Firestore Users] ❌ API key is still empty after update!');
          throw new Error('API key was not saved correctly');
        }
        
        return userDoc.id;
      } else {
        // Vytvořit nového uživatele
        console.log('[Firestore Users] Creating new user');
        const docRef = await addDoc(usersRef, {
          email,
          apiKey, // V produkci by měl být šifrovaný
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('[Firestore Users] ✅ New user created with ID:', docRef.id);
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
      console.log('[Firestore Users] Getting credentials for email:', email);
      
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.warn('[Firestore Users] No user found with email:', email);
        return null;
      }
      
      const userData = snapshot.docs[0].data();
      const apiKey = userData.apiKey;
      
      console.log('[Firestore Users] User found, API key length:', apiKey?.length || 0);
      
      if (!apiKey) {
        console.warn('[Firestore Users] User found but API key is empty for email:', email);
        return null;
      }
      
      return {
        email: userData.email,
        apiKey: apiKey, // V produkci by měl být dešifrovaný
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



