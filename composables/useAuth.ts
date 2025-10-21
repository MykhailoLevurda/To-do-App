import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp();
  const user = useState<User | null>('firebase-user', () => null);
  const loading = useState('auth-loading', () => true);
  const error = useState<string | null>('auth-error', () => null);

  // Initialize auth state listener
  if (process.client && $firebaseAuth) {
    onAuthStateChanged($firebaseAuth, async (firebaseUser) => {
      user.value = firebaseUser;
      loading.value = false;
      
      if (firebaseUser) {
        // Create/update user document in Firestore
        await ensureUserDocument(firebaseUser);
      }
    });
  }

  const ensureUserDocument = async (firebaseUser: User) => {
    if (!$firestore) return;
    
    const userRef = doc($firestore, 'users', firebaseUser.uid);
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
    if (!$firebaseAuth) {
      error.value = 'Firebase not initialized';
      return null;
    }
    
    try {
      error.value = null;
      const userCredential = await createUserWithEmailAndPassword(
        $firebaseAuth,
        email,
        password
      );
      
      // Create user document with display name
      if (displayName && $firestore) {
        const userRef = doc($firestore, 'users', userCredential.user.uid);
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
      
      return userCredential.user;
    } catch (err: any) {
      error.value = err.message;
      console.error('Sign up error:', err);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!$firebaseAuth) {
      error.value = 'Firebase not initialized';
      return null;
    }
    
    try {
      error.value = null;
      const userCredential = await signInWithEmailAndPassword(
        $firebaseAuth,
        email,
        password
      );
      return userCredential.user;
    } catch (err: any) {
      error.value = err.message;
      console.error('Sign in error:', err);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    if (!$firebaseAuth) {
      error.value = 'Firebase not initialized';
      return null;
    }
    
    try {
      error.value = null;
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup($firebaseAuth, provider);
      return userCredential.user;
    } catch (err: any) {
      error.value = err.message;
      console.error('Google sign in error:', err);
      return null;
    }
  };

  const signOut = async () => {
    if (!$firebaseAuth) {
      error.value = 'Firebase not initialized';
      return;
    }
    
    try {
      error.value = null;
      await firebaseSignOut($firebaseAuth);
      user.value = null;
    } catch (err: any) {
      error.value = err.message;
      console.error('Sign out error:', err);
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
    isAuthenticated: computed(() => !!user.value)
  };
};
