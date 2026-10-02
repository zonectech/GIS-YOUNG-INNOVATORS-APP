import { Stack } from 'expo-router';

import { colors } from '../../src/constants/theme';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="classroom-display" options={{ title: 'Classroom Mode', headerShown: false }} />
      <Stack.Screen name="group-output" options={{ title: 'Group Outputs' }} />
    </Stack>
  );
}
