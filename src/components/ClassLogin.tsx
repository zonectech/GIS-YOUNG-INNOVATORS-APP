import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { readDevicePrefs } from '../lib/device';
import { classRoster, type RosterEntry } from '../lib/functions';
import { Button, Field } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Shared-tablet login: class code → pick your name → 4-digit PIN. */
export function ClassLogin() {
  const { loginWithPin, startAsNewStudent } = useApp();
  const [code, setCode] = useState(() => readDevicePrefs().lastClassCode ?? '');
  const [roster, setRoster] = useState<{ className: string; students: RosterEntry[] } | null>(null);
  const [student, setStudent] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = async () => {
    setBusy(true);
    setError(null);
    try {
      setRoster(await classRoster(code.replace(/\D/g, '')));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const press = async (k: string) => {
    if (busy || !student) return;
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await loginWithPin(code.replace(/\D/g, ''), student.uid, next);
    } catch (e) {
      setError((e as Error).message);
      setPin('');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Who is using this tablet?</Text>

        {!roster ? (
          <View style={styles.card}>
            <Field
              label="Class code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6 digits from your teacher"
            />
            <Button title={busy ? 'Looking…' : 'Find my class'} onPress={loadRoster} disabled={busy || code.length < 6} />
          </View>
        ) : !student ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{roster.className}</Text>
            <Text style={styles.muted}>Tap your name.</Text>
            {roster.students.length ? (
              <View style={styles.names}>
                {roster.students.map((s) => (
                  <Pressable key={s.uid} style={styles.name} onPress={() => setStudent(s)}>
                    <Text style={styles.nameText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>
                Nobody in this class has set a PIN yet. Students set one in Passport → Login PIN.
              </Text>
            )}
            <Button title="Different class" variant="ghost" onPress={() => setRoster(null)} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.heading}>Hi {student.label}</Text>
            <Text style={styles.muted}>Enter your 4-digit PIN.</Text>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
              ))}
            </View>
            {busy ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} /> : null}
            <View style={styles.pad}>
              {KEYS.map((k, i) =>
                k ? (
                  <Pressable
                    key={k}
                    accessibilityLabel={k === 'del' ? 'Delete' : k}
                    style={({ pressed }) => [styles.key, pressed && { opacity: 0.6 }]}
                    onPress={() => press(k)}
                  >
                    <Text style={styles.keyText}>{k === 'del' ? '⌫' : k}</Text>
                  </Pressable>
                ) : (
                  <View key={`blank-${i}`} style={styles.key} />
                ),
              )}
            </View>
            <Button
              title="Not me"
              variant="ghost"
              onPress={() => {
                setStudent(null);
                setPin('');
                setError(null);
              }}
            />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.muted}>Forgot your PIN? Ask your teacher to reset it.</Text>
        <Button title="I'm new on this tablet" variant="secondary" onPress={startAsNewStudent} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  muted: { fontSize: 14, color: colors.muted, marginBottom: spacing.md, lineHeight: 20 },
  names: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  name: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  nameText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary },
  dotOn: { backgroundColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: spacing.md },
  key: { width: '30%', aspectRatio: 1.6, alignItems: 'center', justifyContent: 'center', margin: '1.5%' },
  keyText: { fontSize: 28, fontWeight: '700', color: colors.text },
  error: { color: colors.danger, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' },
});
