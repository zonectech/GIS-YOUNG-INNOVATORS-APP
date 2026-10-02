import { Stack } from 'expo-router';

import { colors } from '../../src/constants/theme';

/** Screens shared by teachers and school admins for reviewing students. */
export default function SchoolLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="class/[id]" options={{ title: 'Class roster' }} />
      <Stack.Screen name="student/[uid]" options={{ title: 'Student progress' }} />
    </Stack>
  );
}
