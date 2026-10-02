import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ClassLogin } from '../src/components/ClassLogin';
import { FirstLaunchOffline } from '../src/components/FirstLaunchOffline';
import { colors } from '../src/constants/theme';
import { AppProvider, useApp } from '../src/context/AppContext';
import { MentorProvider } from '../src/context/MentorContext';
import { useAttachmentUploader } from '../src/hooks/useAttachmentUploader';
import { useConnectivitySync } from '../src/hooks/useConnectivitySync';
import { ensureAppCheck } from '../src/lib/appCheck';

function Gate() {
  const { status, setupProblem, retrySignIn } = useApp();
  useConnectivitySync();
  useAttachmentUploader();
  useEffect(() => {
    ensureAppCheck().catch((e) => console.warn('[appcheck] init failed', e));
  }, []);

  if (status === 'connecting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (status === 'needs-connection') {
    return <FirstLaunchOffline problem={setupProblem} onRetry={retrySignIn} />;
  }

  if (status === 'signed-out') return <ClassLogin />;

  return (
    <MentorProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="engine" />
        <Stack.Screen name="student" />
        <Stack.Screen name="teacher" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="school" />
      </Stack>
    </MentorProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <Gate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
