import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../../src/components/ui';
import { colors, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

type Phase = 'checking' | 'offline' | 'uploading' | 'downloading' | 'done' | 'error';

export default function OfflineSyncScreen() {
  const app = useApp();
  const appRef = useRef(app);
  appRef.current = app;
  const [phase, setPhase] = useState<Phase>('checking');
  const [downloaded, setDownloaded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setPhase('checking');
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) return setPhase('offline');

    try {
      setPhase('uploading');
      await appRef.current.waitForSync();
      setPhase('downloading');
      setDownloaded(await appRef.current.downloadChallenges());
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const busy = phase === 'checking' || phase === 'uploading' || phase === 'downloading';

  return (
    <Screen>
      <Title>Offline Sync</Title>
      <Subtitle>
        Your work is always saved on this device and syncs automatically whenever you are online. This screen shows
        progress and downloads the latest challenges for offline use.
      </Subtitle>

      <Card>
        {busy && <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.sm }} />}
        <Text style={{ fontSize: 16, fontWeight: '600' }}>
          {phase === 'checking' && 'Checking connection…'}
          {phase === 'offline' && 'You are offline. Your work stays safe and will sync later.'}
          {phase === 'uploading' && 'Uploading your saved work…'}
          {phase === 'downloading' && 'Downloading challenges for offline use…'}
          {phase === 'done' && 'All synced!'}
          {phase === 'error' && `Sync stopped: ${error}`}
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.muted }}>
            {app.hasPendingWrites ? 'Some changes are waiting to upload.' : 'All changes are saved to the cloud.'}
          </Text>
          {downloaded !== null && (
            <Text style={{ color: colors.muted }}>Challenges available offline: {downloaded || app.challenges.length}</Text>
          )}
        </View>
      </Card>

      {(phase === 'offline' || phase === 'error') && <Button title="Try again" onPress={run} />}
      <Button title={busy ? 'Continue in background' : 'Close'} variant="secondary" onPress={close} />
    </Screen>
  );
}
