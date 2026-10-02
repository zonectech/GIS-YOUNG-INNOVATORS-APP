import { Redirect, router, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { colors } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

export default function EngineLayout() {
  const hasProject = !!useApp().project;

  // Projects are only created from the dashboard, so a missing one means an invalid deep link.
  if (!hasProject) return <Redirect href="/dashboard" />;

  return (
    <Stack
      screenOptions={{
        title: 'Innovation Engine',
        headerTintColor: colors.primary,
        headerBackVisible: false,
        headerRight: () => (
          <Pressable onPress={() => router.dismissTo('/projects')} hitSlop={12}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Save & exit</Text>
          </Pressable>
        ),
      }}
    />
  );
}
