import { defineEventHandler } from 'h3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAdminFirestore } from '../../utils/firebase-admin';

/**
 * Debug endpoint – ověří, který service account a projekt aplikace používá.
 * Volání: GET /api/debug/firebase
 * POZN.: Odstraňte nebo omezte přístup v produkci!
 */
export default defineEventHandler(async () => {
  const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let clientEmail = '';
  let credSource = '';

  if (filePath) {
    try {
      const fullPath = join(process.cwd(), filePath);
      const json = JSON.parse(readFileSync(fullPath, 'utf-8'));
      clientEmail = json.client_email || '';
      credSource = 'file:' + filePath;
    } catch (e) {
      return {
        ok: false,
        error: 'Failed to load service account from file',
        filePath,
        projectId
      };
    }
  } else {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (jsonStr) {
      try {
        const json = JSON.parse(jsonStr);
        clientEmail = json.client_email || '';
        credSource = 'env:FIREBASE_SERVICE_ACCOUNT';
      } catch {
        return { ok: false, error: 'Invalid FIREBASE_SERVICE_ACCOUNT JSON', projectId };
      }
    } else {
      return { ok: false, error: 'No credentials (FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT)', projectId };
    }
  }

  const db = getAdminFirestore();
  let firestoreTest = false;
  let firestoreError = '';

  if (db) {
    try {
      await db.collection('projects').limit(1).get();
      firestoreTest = true;
    } catch (e: any) {
      firestoreError = e?.message || String(e);
    }
  }

  return {
    ok: firestoreTest,
    projectId,
    clientEmail,
    credSource,
    projectMatch: clientEmail.endsWith(`@${projectId}.iam.gserviceaccount.com`),
    firestoreTest,
    firestoreError: firestoreError || undefined
  };
});
