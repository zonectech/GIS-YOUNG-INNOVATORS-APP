import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../../src/components/ui';
import type { Role } from '../../src/types';

const ROLES: { id: Role; title: string; body: string }[] = [
  {
    id: 'student',
    title: "I'm a Student",
    body: 'Work through the Innovation Engine on your own device, at your level.',
  },
  {
    id: 'teacher',
    title: "I'm a Teacher",
    body: 'Run classroom mode, manage classes and approve student work. Needs a teacher access code from your school.',
  },
];

export default function RoleSelectionScreen() {
  return (
    <Screen>
      <Title>GIS Young Innovators</Title>
      <Subtitle>From "I don't know what to do" to "I found a problem, built a solution, and improved it."</Subtitle>
      {ROLES.map((r) => (
        <Card key={r.id}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{r.title}</Text>
          <Subtitle>{r.body}</Subtitle>
          <Button
            title={`Continue as ${r.id}`}
            onPress={() => router.push({ pathname: '/onboarding/profile', params: { role: r.id } })}
          />
        </Card>
      ))}
    </Screen>
  );
}
