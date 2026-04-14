import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { StorageReference } from 'firebase/storage';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function useTaskAttachmentUpload() {
  const uploading = ref(false);
  const uploadError = ref<string | null>(null);

  /**
   * Nahraje soubor přímo do Firebase Storage z klienta.
   * Vrátí permanentní download URL a název souboru.
   */
  async function uploadFile(taskId: string, file: File): Promise<{ url: string; name: string } | null> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      uploadError.value = `Soubor je větší než ${MAX_FILE_SIZE_MB} MB.`;
      return null;
    }

    const nuxtApp = useNuxtApp();
    const storage = (nuxtApp as any).$firebaseStorage;

    if (!storage) {
      uploadError.value = 'Firebase Storage není nakonfigurován (chybí NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET).';
      return null;
    }

    const firebaseAuth = (nuxtApp as any).$firebaseAuth as import('firebase/auth').Auth | undefined;
    if (!firebaseAuth?.currentUser) {
      uploadError.value = 'Pro nahrání se přihlaste.';
      return null;
    }

    uploading.value = true;
    uploadError.value = null;

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const path = `taskAttachments/${taskId}/${uniqueId}_${safeName}`;

      const fileRef: StorageReference = storageRef(storage, path);
      const snapshot = await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(snapshot.ref);

      return { url, name: file.name };
    } catch (e: any) {
      console.error('[TaskAttachmentUpload] Error:', e);
      uploadError.value = e?.message || 'Nepodařilo se nahrát soubor.';
      return null;
    } finally {
      uploading.value = false;
    }
  }

  return {
    uploading: readonly(uploading),
    uploadError: readonly(uploadError),
    uploadFile,
    maxFileSizeMb: MAX_FILE_SIZE_MB
  };
}
