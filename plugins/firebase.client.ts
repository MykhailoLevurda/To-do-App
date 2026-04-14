import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId
  };

  // Validate config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[Firebase Plugin] Missing Firebase credentials! Check your .env file.');
    return {
      provide: {
        firebaseApp: null,
        firebaseAuth: null,
        firestore: null,
        firebaseStorage: null
      }
    };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = firebaseConfig.storageBucket ? getStorage(app) : null;

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore: firestore,
      firebaseStorage: storage
    }
  };
});
