import { Stack } from 'expo-router';

import { colors } from '../../src/constants/theme';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="portfolio" options={{ title: 'Innovation Portfolio' }} />
      <Stack.Screen name="evolution/[id]" options={{ title: 'Evolution Map' }} />
      <Stack.Screen name="venture/[id]" options={{ title: 'Venture Canvas' }} />
    </Stack>
  );
}
