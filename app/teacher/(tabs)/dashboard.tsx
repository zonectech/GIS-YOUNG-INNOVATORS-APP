import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Row, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import type { Classroom } from '../../../src/types';

function ClassCard({ c }: { c: Classroom }) {
  const { addGroup } = useApp();
  const [groupName, setGroupName] = useState('');

  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{c.name}</Text>
      {c.joinCode ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>CLASS CODE</Text>
          <Text style={styles.code} selectable accessibilityLabel={`Class code ${c.joinCode.split('').join(' ')}`}>
            {c.joinCode.slice(0, 3)} {c.joinCode.slice(3)}
          </Text>
          <Text style={styles.codeHint}>Students enter this code to use your resource bank.</Text>
        </View>
      ) : null}
      <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
        Groups: {c.groups.length ? c.groups.map((g) => g.name).join(', ') : 'none yet'}
      </Text>
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Field
          value={groupName}
          onChangeText={setGroupName}
          placeholder="New group name"
          containerStyle={{ flex: 1 }}
        />
        <Button
          title="Add"
          variant="secondary"
          disabled={!groupName.trim()}
          onPress={() => {
            addGroup(c.id, groupName.trim());
            setGroupName('');
          }}
        />
      </Row>
      <Button
        title="Students & progress"
        onPress={() => router.push({ pathname: '/school/class/[id]', params: { id: c.id } })}
      />
      <Button
        title="Start group challenge (Classroom Mode)"
        variant="secondary"
        onPress={() => router.push({ pathname: '/teacher/classroom-display', params: { classId: c.id } })}
      />
      <Button
        title="Record group outputs"
        variant="secondary"
        disabled={!c.groups.length}
        onPress={() => router.push({ pathname: '/teacher/group-output', params: { classId: c.id } })}
      />
    </Card>
  );
}

export default function TeacherDashboardScreen() {
  const { classes, addClass, challenges, hasPendingWrites, profile } = useApp();
  const [className, setClassName] = useState('');

  return (
    <Screen tabScreen>
      <Title>Welcome, {profile.displayName ?? 'Teacher'}</Title>
      <Subtitle>One device can run the whole class. Students don't need their own devices.</Subtitle>

      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>Create a class</Text>
        <Field value={className} onChangeText={setClassName} placeholder="e.g. Primary 5B" />
        <Button
          title="Create class"
          disabled={!className.trim()}
          onPress={() => {
            addClass(className.trim());
            setClassName('');
          }}
        />
      </Card>

      {classes.map((c) => (
        <ClassCard key={c.id} c={c} />
      ))}

      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Offline lessons</Text>
        <Subtitle>
          {challenges.length} challenges available offline.{' '}
          {hasPendingWrites ? 'Some changes are waiting to sync.' : 'Everything is synced.'}
        </Subtitle>
        <Button title="Download lessons & sync" variant="secondary" onPress={() => router.push('/onboarding/offline-sync')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  codeLabel: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  code: { fontSize: 34, fontWeight: '800', color: colors.primary, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  codeHint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
