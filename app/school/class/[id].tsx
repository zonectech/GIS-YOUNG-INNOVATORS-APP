import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen, Subtitle, Title } from '../../../src/components/ui';
import { AGE_TIERS } from '../../../src/constants/content';
import { colors, radius, shadow, spacing, TIER_THEMES } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import { studentLabel, useClassMembers, useSchoolClasses } from '../../../src/hooks/useSchool';
import type { ClassMember } from '../../../src/types';

const daysAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export default function ClassRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes, profile } = useApp();
  const schoolClasses = useSchoolClasses(profile.role === 'school-admin' ? profile.schoolId : null);
  const classroom = [...classes, ...schoolClasses].find((c) => c.id === id);
  const members = useClassMembers(id);
  const [search, setSearch] = useState('');

  // Same first name + same initial in one class: show join dates so staff can tell them apart.
  const dupes = new Set(
    members.map((m) => studentLabel(m)).filter((label, i, all) => all.indexOf(label) !== i),
  );
  const shown = members.filter((m) => studentLabel(m).toLowerCase().includes(search.trim().toLowerCase()));
  const active = members.filter((m) => Date.now() - new Date(m.lastActive).getTime() < 7 * 86_400_000).length;

  return (
    <Screen>
      <Title>{classroom?.name ?? 'Class'}</Title>
      <Subtitle>
        {members.length} student{members.length === 1 ? '' : 's'} · {active} active this week
        {classroom?.teacherName ? ` · Teacher: ${classroom.teacherName}` : ''}
      </Subtitle>

      {members.length > 6 && (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search students"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      )}

      {!members.length && (
        <Text style={styles.empty}>
          No students yet. Share the class code {classroom?.joinCode ? `(${classroom.joinCode})` : ''} so students can join.
        </Text>
      )}

      {shown.map((m) => (
        <MemberRow key={m.uid} m={m} classId={id} showJoined={dupes.has(studentLabel(m))} />
      ))}
    </Screen>
  );
}

function MemberRow({ m, classId, showJoined }: { m: ClassMember; classId: string; showJoined: boolean }) {
  const theme = m.tier ? TIER_THEMES[m.tier] : { accent: colors.primary, soft: colors.primaryLight };
  const tier = AGE_TIERS.find((t) => t.id === m.tier);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/school/student/[uid]', params: { uid: m.uid, classId } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.soft }]}>
        <Text style={[styles.avatarText, { color: theme.accent }]}>{m.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{studentLabel(m)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {tier?.label ?? '—'} · {m.currentStep ? `On: ${m.currentStep}` : 'No active project'}
        </Text>
        <Text style={styles.meta}>
          {m.completed} done · {m.badges} badges · active {daysAgo(m.lastActive)}
          {showJoined ? ` · joined ${new Date(m.joinedAt).toLocaleDateString()}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
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
  empty: { color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 16 },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
});
