import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId
  };

  // Debug: Check if credentials are loaded
  console.log('[Firebase Plugin] Config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    projectId: firebaseConfig.projectId
  });

  // Validate config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[Firebase Plugin] Missing Firebase credentials! Check your .env file.');
    return {
      provide: {
        firebaseApp: null,
        firebaseAuth: null,
        firestore: null
      }
    };
  }

  // Initialize Firebase (Storage nepoužíváme – přílohy jdou přes server API na disk)
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  console.log('[Firebase Plugin] Firebase initialized successfully!');

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore: firestore
    }
  };
});
