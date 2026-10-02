import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '../constants/theme';
import type { SetupProblem } from '../context/AppContext';
import { Button } from './ui';

const STEPS = [
  'Turn on Wi-Fi or mobile data, or move closer to the school router.',
  'Wait for the signal icon to appear at the top of the screen.',
  'Setup continues automatically. You only need internet this one time.',
];

/** Shown when the very first launch happens without a connection (no anonymous account yet). */
export function FirstLaunchOffline({ problem, onRetry }: { problem: SetupProblem; onRetry: () => void }) {
  const [online, setOnline] = useState(false);
  const wasOnline = useRef<boolean | null>(null);

  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        const isOnline = !!s.isConnected && s.isInternetReachable !== false;
        setOnline(isOnline);
        // Auto-continue only on an offline→online transition, so a flaky network can't cause a retry loop.
        if (isOnline && wasOnline.current === false && problem === 'offline') onRetry();
        wasOnline.current = isOnline;
      }),
    [problem, onRetry],
  );

  const serverIssue = problem === 'server';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <View style={[styles.status, { backgroundColor: online ? colors.primaryLight : '#FDECEA' }]}>
          <View style={[styles.dot, { backgroundColor: online ? colors.primary : colors.danger }]} />
          <Text style={[styles.statusText, { color: online ? colors.primary : colors.danger }]}>
            {online ? 'Connected' : 'No internet connection'}
          </Text>
        </View>

        <Text style={styles.title}>{serverIssue ? 'Setup could not finish' : 'Connect once to get started'}</Text>
        <Text style={styles.body}>
          {serverIssue
            ? 'The device is online but could not register with the GIS Young Innovators service. Please ask your teacher or the app administrator to check the setup, then try again.'
            : 'This device needs internet one time to set up. After that, students can use every activity offline and their work syncs later.'}
        </Text>

        {!serverIssue &&
          STEPS.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}

        <Button title={online ? 'Continue setup' : 'Try again'} onPress={onRetry} style={{ marginTop: spacing.md }} />
        <Text style={styles.footnote}>
          Teachers: set up each shared device on school Wi-Fi before taking it to a classroom without internet.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: spacing.md },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  footnote: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
