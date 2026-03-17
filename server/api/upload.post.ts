import { defineEventHandler, getHeader, setResponseStatus, readMultipartFormData } from 'h3';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getAdminAuth } from '../utils/firebase-admin';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      setResponseStatus(event, 401);
      return { success: false, error: 'Chybí autorizační token.' };
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      setResponseStatus(event, 500);
      return { success: false, error: 'Firebase Admin není nakonfigurován.' };
    }

    let decodedToken: { uid: string };
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      setResponseStatus(event, 401);
      return { success: false, error: 'Neplatný nebo expirovaný token.' };
    }

    const parts = await readMultipartFormData(event);
    if (!parts?.length) {
      setResponseStatus(event, 400);
      return { success: false, error: 'Chybí data formuláře (taskId a soubor).' };
    }

    let taskId: string | null = null;
    let fileData: Buffer | null = null;
    let filename: string = 'file';
    let mimeType: string | undefined;

    for (const part of parts) {
      if (part.name === 'taskId' && part.data) {
        taskId = part.data.toString('utf-8').trim();
      }
      if (part.name === 'file' && part.data && part.filename) {
        fileData = part.data;
        filename = part.filename;
        mimeType = part.type;
      }
    }

    if (!taskId) {
      setResponseStatus(event, 400);
      return { success: false, error: 'Chybí taskId.' };
    }
    if (!fileData || !fileData.length) {
      setResponseStatus(event, 400);
      return { success: false, error: 'Chybí soubor.' };
    }
    if (fileData.length > MAX_FILE_SIZE_BYTES) {
      setResponseStatus(event, 400);
      return { success: false, error: `Soubor je větší než ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` };
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const storedFileName = `${uniqueId}_${safeName}`;

    const baseDir = join(process.cwd(), 'public', 'uploads', 'taskAttachments', taskId);
    await mkdir(baseDir, { recursive: true });
    const filePath = join(baseDir, storedFileName);
    await writeFile(filePath, fileData);

    const url = `/uploads/taskAttachments/${taskId}/${storedFileName}`;
    return { success: true, url, name: filename };
  } catch (e) {
    console.error('[upload.post]', e);
    setResponseStatus(event, 500);
    return { success: false, error: 'Nepodařilo se nahrát soubor.' };
  }
});
