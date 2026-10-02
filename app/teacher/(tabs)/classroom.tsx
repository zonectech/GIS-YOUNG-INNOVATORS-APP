import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';

export default function ClassroomModeLauncher() {
  const { classes } = useApp();

  return (
    <Screen tabScreen>
      <Title>Classroom Mode</Title>
      <Subtitle>Present challenges to the whole class from this one device, then record each group's work.</Subtitle>

      {!classes.length && (
        <Card>
          <Text style={{ color: colors.muted }}>Create a class in the Classes tab first.</Text>
        </Card>
      )}

      {classes.map((c) => (
        <Card key={c.id}>
          <View style={styles.row}>
            <Ionicons name="easel" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>
                {c.groups.length} group{c.groups.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          <Button
            title="Present to class"
            onPress={() => router.push({ pathname: '/teacher/classroom-display', params: { classId: c.id } })}
          />
          <Button
            title="Record group outputs"
            variant="secondary"
            disabled={!c.groups.length}
            onPress={() => router.push({ pathname: '/teacher/group-output', params: { classId: c.id } })}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted },
});
