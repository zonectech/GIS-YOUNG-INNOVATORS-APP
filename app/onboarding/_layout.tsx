import { Stack } from 'expo-router';

import { colors } from '../../src/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="role-selection" options={{ title: 'Welcome' }} />
      <Stack.Screen name="profile" options={{ title: 'Your details' }} />
      <Stack.Screen name="age-tier" options={{ title: 'Choose your level' }} />
      <Stack.Screen name="journey" options={{ headerShown: false }} />
      <Stack.Screen name="join-class" options={{ title: 'Join class', presentation: 'modal' }} />
      <Stack.Screen
        name="offline-sync"
        options={{ title: 'Syncing', presentation: 'modal', gestureEnabled: false }}
      />
    </Stack>
  );
}
