import { useState } from 'react';
import { Alert, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import { createTeacherCode, setTeacherCodeActive, useStaff, useTeacherCodes } from '../../../src/hooks/useSchool';

export default function StaffScreen() {
  const { profile } = useApp();
  const codes = useTeacherCodes(profile.schoolId);
  const staff = useStaff(profile.schoolId);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!profile.schoolId) return;
    setBusy(true);
    try {
      const code = await createTeacherCode(profile.schoolId, label);
      setLabel('');
      Share.share({ message: `Your GIS Young Innovators teacher access code is ${code}. Choose "I'm a Teacher" in the app and enter it.` });
    } catch (e) {
      Alert.alert('Could not create code', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabScreen>
      <Title>Teachers</Title>
      <Subtitle>Create an access code for each teacher. Turn a code off when a teacher leaves.</Subtitle>

      <Card>
        <Field label="Who is this code for?" value={label} onChangeText={setLabel} placeholder="e.g. Mr Musa, JSS2 Science" maxLength={60} />
        <Button title={busy ? 'Creating…' : 'Create & share teacher code'} disabled={busy || !label.trim()} onPress={create} />
        <Text style={styles.hint}>Creating a code needs internet.</Text>
      </Card>

      <Text style={styles.section}>Access codes ({codes.length})</Text>
      {codes.map((c) => (
        <View key={c.code} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.code, !c.active && { color: colors.muted, textDecorationLine: 'line-through' }]} selectable>
              {c.code}
            </Text>
            <Text style={styles.meta}>{c.label || 'No label'}</Text>
          </View>
          <Switch
            value={c.active}
            onValueChange={(v) => {
              setTeacherCodeActive(c.code, v);
            }}
            trackColor={{ true: colors.primary }}
            accessibilityLabel={`${c.active ? 'Disable' : 'Enable'} code ${c.code}`}
          />
        </View>
      ))}

      <Text style={styles.section}>Registered staff ({staff.length})</Text>
      {staff.map((s) => (
        <View key={s.uid} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.meta}>
              {s.role === 'school-admin' ? 'School admin' : 'Teacher'} · joined {new Date(s.joinedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  code: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
