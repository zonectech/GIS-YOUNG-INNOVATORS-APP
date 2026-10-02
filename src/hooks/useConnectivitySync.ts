import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useApp } from '../context/AppContext';

/** Firestore syncs automatically; this just surfaces progress when reconnecting with unsynced work. */
export function useConnectivitySync() {
  const { status, hasPendingWrites } = useApp();
  const shouldOpen = useRef(false);
  shouldOpen.current = status === 'ready' && hasPendingWrites;
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      const cameOnline = wasOnline.current === false && online;
      wasOnline.current = online;
      if (cameOnline && shouldOpen.current) {
        router.push('/onboarding/offline-sync');
      }
    });
  }, []);
}
