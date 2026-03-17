const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function useTaskAttachmentUpload() {
  const uploading = ref(false);
  const uploadError = ref<string | null>(null);

  /**
   * Nahraje soubor přes server API (ukládá se na disk v public/uploads).
   * Vrátí download URL a název souboru.
   */
  async function uploadFile(taskId: string, file: File): Promise<{ url: string; name: string } | null> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      uploadError.value = `Soubor je větší než ${MAX_FILE_SIZE_MB} MB.`;
      return null;
    }

    const nuxtApp = useNuxtApp();
    const firebaseAuth = (nuxtApp as any).$firebaseAuth as import('firebase/auth').Auth | undefined;
    if (!firebaseAuth?.currentUser) {
      uploadError.value = 'Pro nahrání se přihlaste.';
      return null;
    }

    uploading.value = true;
    uploadError.value = null;

    try {
      const token = await firebaseAuth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('taskId', taskId);
      formData.append('file', file);

      const res = await $fetch<{ success: boolean; url?: string; name?: string; error?: string }>('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.success || !res.url || !res.name) {
        uploadError.value = res.error || 'Nepodařilo se nahrát soubor.';
        return null;
      }
      return { url: res.url, name: res.name };
    } catch (e: any) {
      console.error('[TaskAttachmentUpload] Error:', e);
      const errMsg = e?.data?.error || e?.message || 'Nepodařilo se nahrát soubor.';
      uploadError.value = errMsg;
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
