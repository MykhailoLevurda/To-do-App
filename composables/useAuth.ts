import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Plain user data without Firebase references
export interface PlainUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp();
  const auth = $firebaseAuth;
  const firestore = $firestore;
  
  // Store plain user data instead of Firebase User object to avoid cross-origin issues
  const user = useState<PlainUser | null>('firebase-user', () => null);
  const loading = useState('auth-loading', () => true);
  const error = useState<string | null>('auth-error', () => null);
  const authListenerSet = useState('auth-listener-set', () => false);

  console.log('[Auth] useAuth composable initialized, process.client:', process.client);

  // Convert Firebase User to plain object
  const toPlainUser = (firebaseUser: User | null): PlainUser | null => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL
    };
  };

  // Initialize auth state listener (only once)
  if (process.client && !authListenerSet.value) {
    console.log('[Auth] Setting up onAuthStateChanged listener (first time)');
    authListenerSet.value = true;
    
    onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
      console.log('[Auth] Setting loading to false');
      
      // Convert to plain object to avoid Vue reactivity issues with Firebase objects
      user.value = toPlainUser(firebaseUser);
      loading.value = false;
      
      if (firebaseUser) {
        // Create/update user document in Firestore
        await ensureUserDocument(firebaseUser);
        console.log('[Auth] User document ensured for:', firebaseUser.uid);
      }
      
      console.log('[Auth] Current state - user:', user.value?.uid, 'loading:', loading.value);
    });
  } else if (!process.client) {
    console.log('[Auth] SSR mode, setting loading to false immediately');
    loading.value = false;
  }

  const ensureUserDocument = async (firebaseUser: User) => {
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        photoURL: firebaseUser.photoURL,
        color: generateUserColor(),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
    } else {
      // Update last seen
      await setDoc(userRef, {
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      error.value = null;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      // Create user document with display name
      if (displayName) {
        const userRef = doc(firestore, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName,
          photoURL: null,
          color: generateUserColor(),
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp()
        });
      }
      
      return toPlainUser(userCredential.user);
    } catch (err: any) {
      error.value = err.message;
      console.error('Sign up error:', err);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      error.value = null;
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return toPlainUser(userCredential.user);
    } catch (err: any) {
      error.value = err.message;
      console.error('Sign in error:', err);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    try {
      error.value = null;
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return toPlainUser(userCredential.user);
    } catch (err: any) {
      error.value = err.message;
      console.error('Google sign in error:', err);
      return null;
    }
  };

  const signOut = async () => {
    try {
      error.value = null;
      
      console.log('[Auth] Signing out user:', user.value?.uid);
      
      // Clear all stores before signing out
      const scrumBoardStore = useScrumBoardStore();
      const projectsStore = useProjectsStore();
      
      scrumBoardStore.clearTasks();
      scrumBoardStore.setCurrentUserId(null);
      
      projectsStore.clearProjects();
      projectsStore.setCurrentUserId(null);
      
      // Clear manual caches
      if (process.client) {
        localStorage.removeItem('projects-cache');
        localStorage.removeItem('tasks-cache');
      }
      
      await firebaseSignOut(auth);
      user.value = null;
      
      console.log('[Auth] User signed out successfully');
    } catch (err: any) {
      error.value = err.message;
      console.error('[Auth] Sign out error:', err);
    }
  };

  const updateDisplayName = async (displayName: string) => {
    try {
      error.value = null;
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Uživatel není přihlášen');
      }

      // Update Firebase Auth profile
      await firebaseUpdateProfile(currentUser, {
        displayName: displayName
      });

      // Update Firestore user document
      const userRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(userRef, {
        displayName: displayName,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update local user state
      if (user.value) {
        user.value = {
          ...user.value,
          displayName: displayName
        };
      }

      console.log('[Auth] Display name updated:', displayName);
    } catch (err: any) {
      error.value = err.message;
      console.error('[Auth] Error updating display name:', err);
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      error.value = null;
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Uživatel není přihlášen');
      }

      if (!currentUser.email) {
        throw new Error('Uživatel nemá email');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      console.log('[Auth] Password changed successfully');
    } catch (err: any) {
      error.value = err.message;
      console.error('[Auth] Error changing password:', err);
      throw err;
    }
  };

  const generateUserColor = (): string => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
      '#84cc16', '#f59e0b', '#10b981', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateDisplayName,
    changePassword,
    isAuthenticated: computed(() => !!user.value)
  };
};
