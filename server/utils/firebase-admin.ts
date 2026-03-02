import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function loadServiceAccountCred(): Record<string, unknown> | null {
  const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  // Možnost 1: Cesta k JSON souboru (bez problémů s escapováním v .env)
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    try {
      const fullPath = join(process.cwd(), filePath);
      const json = readFileSync(fullPath, 'utf-8');
      return JSON.parse(json) as Record<string, unknown>;
    } catch (e) {
      console.error('[Firebase Admin] Failed to load from file:', filePath, e);
      return null;
    }
  }

  // Možnost 2: JSON string v .env
  let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!jsonStr) return null;

  // Odstranit vnější uvozovky, pokud .env parser přidal extra
  if ((jsonStr.startsWith('"') && jsonStr.endsWith('"')) || (jsonStr.startsWith("'") && jsonStr.endsWith("'"))) {
    jsonStr = jsonStr.slice(1, -1).replace(/\\"/g, '"');
  }

  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (e) {
    console.error('[Firebase Admin] Invalid JSON in FIREBASE_SERVICE_ACCOUNT. Použijte FIREBASE_SERVICE_ACCOUNT_PATH=cesta/k/souboru.json místo toho.');
    return null;
  }
}

export function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const existing = getApps().find((a) => a.name === '[DEFAULT]');
  if (existing) {
    adminApp = existing as App;
    return adminApp;
  }

  const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const cred = loadServiceAccountCred();

  if (!cred || !projectId) {
    return null;
  }

  try {
    const c = cred as { private_key?: string };
    if (c.private_key && typeof c.private_key === 'string') {
      c.private_key = c.private_key.replace(/\\n/g, '\n');
    }
    adminApp = initializeApp({ credential: cert(cred), projectId });
    return adminApp;
  } catch (e) {
    console.error('[Firebase Admin] Init failed:', e);
    return null;
  }
}

export function getAdminFirestore() {
  const app = getFirebaseAdmin();
  return app ? getFirestore(app) : null;
}

export function getAdminAuth() {
  const app = getFirebaseAdmin();
  return app ? getAuth(app) : null;
}
