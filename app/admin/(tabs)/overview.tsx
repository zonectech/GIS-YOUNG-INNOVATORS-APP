import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import {
  setSchoolConsent,
  useSchoolClasses,
  useSchoolDoc,
  useSchoolStudents,
  useStaff,
} from '../../../src/hooks/useSchool';
import { transferClass } from '../../../src/lib/functions';
import type { Classroom } from '../../../src/types';

export default function SchoolOverviewScreen() {
  const { profile, uid } = useApp();
  const school = useSchoolDoc(profile.schoolId);
  const classes = useSchoolClasses(profile.schoolId);
  const students = useSchoolStudents(classes);
  const staff = useStaff(profile.schoolId);
  const [transferring, setTransferring] = useState<Classroom | null>(null);
  const [busy, setBusy] = useState(false);
  const teachers = staff.filter((s) => s.role === 'teacher');

  const weekAgo = Date.now() - 7 * 86_400_000;
  const activeWeek = students.filter((s) => new Date(s.member.lastActive).getTime() > weekAgo).length;
  const completed = students.reduce((n, s) => n + s.member.completed, 0);

  if (!profile.schoolId) {
    return (
      <Screen tabScreen>
        <Title>School admin</Title>
        <Subtitle>Your account isn't linked to a school. Ask the platform administrator for a school-admin code.</Subtitle>
      </Screen>
    );
  }

  const schoolId = profile.schoolId;

  const doTransfer = async (cls: Classroom, toUid: string, toName: string) => {
    setBusy(true);
    try {
      const { moved } = await transferClass(cls.id, toUid);
      setTransferring(null);
      Alert.alert('Class transferred', `${cls.name} now belongs to ${toName}. ${moved} students will follow on their next sync.`);
    } catch (e) {
      Alert.alert('Could not transfer the class', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabScreen>
      <Text style={styles.kicker}>SCHOOL ADMIN · {profile.displayName}</Text>
      <Title>{school?.name ?? 'Your school'}</Title>

      {school && !school.consent ? (
        <Card style={styles.consent}>
          <Text style={styles.consentTitle}>Parental consent</Text>
          <Text style={styles.consentText}>
            Students' first names, last initials and project work are stored online so teachers can follow progress.
            Confirm that your school has collected consent from parents or guardians (as required by your school
            policy and local law) before students use the app.
          </Text>
          <Button
            title="We have collected consent"
            onPress={() => uid && setSchoolConsent(schoolId, { uid, name: profile.displayName ?? 'School admin' })}
          />
        </Card>
      ) : school?.consent ? (
        <Text style={styles.meta}>
          Parental consent confirmed by {school.consent.confirmedByName} on{' '}
          {new Date(school.consent.confirmedAt).toLocaleDateString()}.
        </Text>
      ) : null}

      <View style={styles.stats}>
        <Stat icon="people" value={students.length} label="Students" />
        <Stat icon="pulse" value={activeWeek} label="Active this week" />
        <Stat icon="checkmark-done" value={completed} label="Projects done" />
        <Stat icon="school" value={staff.filter((s) => s.role === 'teacher').length} label="Teachers" />
      </View>

      <Text style={styles.section}>Classes ({classes.length})</Text>
      {!classes.length && <Text style={styles.empty}>No classes yet. Teachers create classes after registering with a code from the Teachers tab.</Text>}
      {classes.map((c) => {
        const inClass = students.filter((s) => s.classroom.id === c.id);
        const done = inClass.reduce((n, s) => n + s.member.completed, 0);
        return (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: '/school/class/[id]', params: { id: c.id } })}
            style={({ pressed }) => [styles.classRow, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{c.name}</Text>
              <Text style={styles.meta}>
                {c.teacherName ?? 'Teacher'} · {inClass.length} students · {done} projects done · code {c.joinCode}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => setTransferring(c)} accessibilityLabel={`Transfer ${c.name}`}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      })}

      <Modal visible={!!transferring} transparent animationType="slide" onRequestClose={() => setTransferring(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Title>Transfer {transferring?.name}</Title>
            <Subtitle>Choose the new teacher. Students, projects and the class code stay the same.</Subtitle>
            {teachers
              .filter((t) => t.uid !== transferring?.ownerId)
              .map((t) => (
                <Button
                  key={t.uid}
                  title={t.name}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => transferring && doTransfer(transferring, t.uid, t.name)}
                />
              ))}
            {teachers.length < 2 && <Text style={styles.empty}>Register another teacher first (Teachers tab).</Text>}
            <Button title="Cancel" variant="ghost" onPress={() => setTransferring(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  stat: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.muted },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: spacing.sm },
  empty: { color: colors.muted },
  classRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  className: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  consent: { borderLeftWidth: 4, borderLeftColor: colors.danger, marginTop: spacing.sm },
  consentTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  consentText: { color: colors.text, lineHeight: 20, marginBottom: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
});
