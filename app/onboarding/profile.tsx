import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../../src/components/ui';
import { colors, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

export default function ProfileSetupScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const teacher = role === 'teacher';
  const { profile, registerStudent, registerTeacher } = useApp();
  const [name, setName] = useState(profile.displayName ?? '');
  const [initial, setInitial] = useState(profile.lastInitial ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!teacher) {
      registerStudent(name, initial);
      // Existing students who only lacked a name keep their level.
      router.replace(profile.ageTier ? '/dashboard' : '/onboarding/age-tier');
      return;
    }
    setBusy(true);
    try {
      const role = await registerTeacher(name, code);
      router.replace(role === 'school-admin' ? '/admin/overview' : '/teacher/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>{teacher ? 'Staff sign-up' : 'Tell us about you'}</Title>
      <Subtitle>
        {teacher
          ? 'Enter your first name and the access code from your school. Teacher and school-admin codes both work here. You only do this once.'
          : 'Your first name and the first letter of your surname help your teacher tell you apart from classmates with the same name.'}
      </Subtitle>

      <Card>
        <Field
          label="First name"
          value={name}
          onChangeText={setName}
          placeholder={teacher ? 'e.g. Mrs Adaeze' : 'e.g. Amina'}
          autoCapitalize="words"
          maxLength={30}
          autoFocus
        />
        {!teacher && (
          <Field
            label="First letter of your surname"
            value={initial}
            onChangeText={(t) => setInitial(t.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase())}
            placeholder="e.g. B"
            autoCapitalize="characters"
            maxLength={1}
          />
        )}
        {teacher && (
          <Field
            label="Access code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="e.g. LAPAI-SCI-2026"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Button
            title="Continue"
            disabled={!name.trim() || (teacher ? !code.trim() : !initial)}
            onPress={submit}
          />
        )}
      </Card>

      {teacher && (
        <Text style={styles.note}>Teacher codes are checked online the first time. Don't have one? Ask your school administrator.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontWeight: '600', marginBottom: spacing.sm },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
