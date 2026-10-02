import { getStorage, getDownloadURL, putFile, ref, deleteObject } from '@react-native-firebase/storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { DesignAttachment } from '../types';

export const MAX_ATTACHMENTS = 6;

// Cloud Storage needs the Firebase Blaze plan; flip to true after upgrading and publishing storage.rules.
export const CLOUD_PHOTOS_ENABLED = false;

const projectDir = (projectId: string) => new Directory(Paths.document, 'attachments', projectId);

/** Copies a picked image out of the cache directory so it survives until it can be uploaded. */
export function saveLocalCopy(sourceUri: string, projectId: string, id: string): string {
  const dir = projectDir(projectId);
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${id}.jpg`);
  new File(sourceUri).copySync(dest, { overwrite: true });
  return dest.uri;
}

export const storagePathFor = (uid: string, projectId: string, id: string) =>
  `users/${uid}/portfolios/${projectId}/${id}.jpg`;

export const hasLocalFile = (a: DesignAttachment) => !!a.localUri && new File(a.localUri).exists;

export async function uploadAttachment(a: DesignAttachment): Promise<string> {
  if (!a.localUri) throw new Error('No local file to upload');
  const r = ref(getStorage(), a.storagePath);
  await putFile(r, a.localUri, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

export function deleteAttachmentFiles(a: DesignAttachment) {
  if (a.localUri) {
    const f = new File(a.localUri);
    if (f.exists) f.delete();
  }
  // Fails while offline, leaving an orphaned object; acceptable for a removed sketch photo.
  if (a.remoteUrl) deleteObject(ref(getStorage(), a.storagePath)).catch(() => {});
}

/** Best available image source: the on-device copy first (works offline), else the cloud URL. */
export const attachmentSource = (a: DesignAttachment) => (hasLocalFile(a) ? a.localUri! : a.remoteUrl);
