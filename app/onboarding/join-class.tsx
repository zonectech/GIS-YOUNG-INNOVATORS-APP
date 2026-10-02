import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccentProvider, Button, Screen, Subtitle, Title } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useTierTheme } from '../../src/hooks/useTierTheme';

export default function JoinClassScreen() {
  const { joinClass, profile, leaveClass } = useApp();
  const theme = useTierTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinClass(code);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the class.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccentProvider value={theme}>
      <Screen>
        <Title>Join your class</Title>
        <Subtitle>
          Ask your teacher for the 6-digit class code. Once you join, the app suggests materials your school actually has.
        </Subtitle>

        {profile.school && (
          <Text style={styles.current}>Currently joined: {profile.school.className}</Text>
        )}

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.border}
          accessibilityLabel="Class code"
          style={[styles.codeInput, { borderColor: theme.accent, color: theme.accent }]}
          autoFocus
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: spacing.md }}>
          {busy ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Button title="Join class" disabled={code.length !== 6} onPress={submit} />
          )}
        </View>
        <Text style={styles.note}>You need internet the first time you enter a code. After that it works offline.</Text>
        {profile.school && (
          <Button
            title={`Leave ${profile.school.className}`}
            variant="ghost"
            onPress={() => {
              leaveClass();
              router.back();
            }}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  current: { color: colors.muted, marginBottom: spacing.md },
  codeInput: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  error: { color: colors.danger, marginTop: spacing.sm, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
});
