import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

import { useApp } from '../context/AppContext';
import { CLOUD_PHOTOS_ENABLED, hasLocalFile, uploadAttachment } from '../lib/attachments';

/** Uploads design photos that were captured offline as soon as the device is online. */
export function useAttachmentUploader() {
  const { status, project, portfolio, markAttachmentUploaded } = useApp();
  const [online, setOnline] = useState(false);
  const inFlight = useRef(new Set<string>());
  const markRef = useRef(markAttachmentUploaded);
  markRef.current = markAttachmentUploaded;

  useEffect(
    () => NetInfo.addEventListener((s) => setOnline(!!s.isConnected && s.isInternetReachable !== false)),
    [],
  );

  const docs = project ? [project, ...portfolio.filter((p) => p.id !== project.id)] : portfolio;
  const pending = docs.flatMap((p) =>
    p.design.attachments
      .filter((a) => !a.remoteUrl && !inFlight.current.has(a.id) && hasLocalFile(a))
      .map((a) => ({ projectId: p.id, attachment: a })),
  );
  const pendingKey = pending.map((x) => x.attachment.id).join(',');

  useEffect(() => {
    if (!CLOUD_PHOTOS_ENABLED || status !== 'ready' || !online || !pending.length) return;
    for (const { projectId, attachment } of pending) {
      inFlight.current.add(attachment.id);
      uploadAttachment(attachment)
        .then((url) => markRef.current(projectId, attachment.id, url))
        .catch((e) => console.warn('[storage] upload failed, will retry', e))
        .finally(() => inFlight.current.delete(attachment.id));
    }
    // `pendingKey` stands in for `pending`, which is rebuilt every render.
  }, [status, online, pendingKey]);
}
