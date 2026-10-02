import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Screen, Subtitle, Title } from '../../../src/components/ui';
import { AGE_TIERS } from '../../../src/constants/content';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import { assignStudent, studentLabel, useSchoolClasses, useSchoolStudents } from '../../../src/hooks/useSchool';
import type { Classroom, ClassMember } from '../../../src/types';

type Row = { member: ClassMember; classroom: Classroom };

export default function SchoolStudentsScreen() {
  const { uid, profile } = useApp();
  const classes = useSchoolClasses(profile.schoolId);
  const students = useSchoolStudents(classes);
  const [search, setSearch] = useState('');
  const [moving, setMoving] = useState<Row | null>(null);

  const q = search.trim().toLowerCase();
  const shown = students
    .filter((s) => !q || studentLabel(s.member).toLowerCase().includes(q) || s.classroom.name.toLowerCase().includes(q))
    .sort((a, b) => studentLabel(a.member).localeCompare(studentLabel(b.member)));

  return (
    <Screen tabScreen>
      <Title>Students</Title>
      <Subtitle>Everyone in your school's classes. Move a student when they change class or get promoted.</Subtitle>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or class"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />

      {shown.map((s) => (
        <View key={`${s.classroom.id}-${s.member.uid}`} style={styles.row}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/school/student/[uid]', params: { uid: s.member.uid, classId: s.classroom.id } })}
          >
            <Text style={styles.name}>{studentLabel(s.member)}</Text>
            <Text style={styles.meta}>
              {s.classroom.name} · {AGE_TIERS.find((t) => t.id === s.member.tier)?.label ?? '—'} · {s.member.completed} done
            </Text>
          </Pressable>
          <Pressable onPress={() => setMoving(s)} hitSlop={8} style={styles.moveBtn} accessibilityLabel={`Move ${studentLabel(s.member)}`}>
            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
            <Text style={styles.moveText}>Move</Text>
          </Pressable>
        </View>
      ))}
      {!shown.length && <Text style={styles.meta}>No students found.</Text>}

      <Modal visible={!!moving} transparent animationType="fade" onRequestClose={() => setMoving(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMoving(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Move {moving ? studentLabel(moving.member) : ''} to…</Text>
            <Text style={styles.meta}>
              The student's app moves them next time it syncs. A level change still needs the new teacher's approval.
            </Text>
            {classes
              .filter((c) => c.id !== moving?.classroom.id)
              .map((c) => (
                <Button
                  key={c.id}
                  title={`${c.name}${c.teacherName ? ` (${c.teacherName})` : ''}`}
                  variant="secondary"
                  onPress={() => {
                    if (moving && uid) assignStudent(moving.member.uid, moving.classroom.id, c, uid);
                    setMoving(null);
                  }}
                />
              ))}
            <Button title="Cancel" variant="ghost" onPress={() => setMoving(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: spacing.md,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  moveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  moveText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
});
