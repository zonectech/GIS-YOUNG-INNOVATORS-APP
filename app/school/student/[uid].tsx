import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { PortfolioView } from '../../../src/components/PortfolioView';
import { Button, Card, Field, Screen, Subtitle, Title } from '../../../src/components/ui';
import { AGE_TIERS } from '../../../src/constants/content';
import { colors, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import {
  removeStudentFromClass,
  studentLabel,
  useClassMembers,
  useStudentNote,
  useStudentPortfolios,
} from '../../../src/hooks/useSchool';
import { portfolioScore } from '../../../src/lib/badges';
import { resetStudentPin } from '../../../src/lib/functions';

export default function StudentDetailScreen() {
  const { uid, classId } = useLocalSearchParams<{ uid: string; classId: string }>();
  const { uid: staffUid } = useApp();
  const member = useClassMembers(classId).find((m) => m.uid === uid);
  const portfolios = useStudentPortfolios(uid);
  const { note, save } = useStudentNote(classId, uid);
  const [noteText, setNoteText] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => setNoteText(note?.text ?? ''), [note?.text]);

  if (!member) {
    return (
      <Screen>
        <Subtitle>This student is no longer in the class.</Subtitle>
      </Screen>
    );
  }

  const tier = AGE_TIERS.find((t) => t.id === member.tier);
  const completed = portfolios.filter((p) => p.status === 'completed');
  const avg = completed.length ? Math.round(completed.reduce((s, p) => s + portfolioScore(p), 0) / completed.length) : null;

  return (
    <Screen>
      <Title>{studentLabel(member)}</Title>
      <Subtitle>
        {tier ? `${tier.label} · ${tier.level}` : 'No level'} · {member.badges} badges · {completed.length} completed
        {avg !== null ? ` · avg score ${avg}/100` : ''}
      </Subtitle>

      <Card>
        <Field
          label="Private teacher note (only staff see this)"
          value={noteText}
          onChangeText={setNoteText}
          placeholder="e.g. Roll no. 14, sits by the window"
          maxLength={200}
        />
        <Button title="Save note" variant="secondary" disabled={noteText === (note?.text ?? '')} onPress={() => save(noteText)} />
      </Card>

      <Card>
        <Text style={styles.pinText}>
          {member.hasPin
            ? 'Has a login PIN for shared tablets.'
            : 'No login PIN yet. The student sets one in Passport → Settings.'}
        </Text>
        {member.hasPin ? (
          <>
            <Field
              label="Forgotten PIN? Set a new one and tell the student"
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="4 digits"
            />
            <Button
              title={pinBusy ? 'Saving…' : 'Set new PIN'}
              variant="secondary"
              disabled={pinBusy || newPin.length !== 4}
              onPress={() => {
                setPinBusy(true);
                resetStudentPin(classId, uid, newPin)
                  .then(
                    () => {
                      Alert.alert('PIN updated', `Tell ${member.name} the new PIN. They can change it in Passport.`);
                      setNewPin('');
                    },
                    (e: Error) => Alert.alert('Could not reset the PIN', e.message),
                  )
                  .finally(() => setPinBusy(false));
              }}
            />
          </>
        ) : null}
      </Card>

      <Text style={styles.section}>Projects ({portfolios.length})</Text>
      {portfolios.length ? (
        portfolios.map((p) => <PortfolioView key={p.id} p={p} collapsed />)
      ) : (
        <Text style={styles.empty}>No projects shared yet. Projects appear once the student syncs while in this class.</Text>
      )}

      <Button
        title="Remove from class"
        variant="ghost"
        onPress={() =>
          Alert.alert('Remove student?', `${studentLabel(member)} will no longer appear in this class roster.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                if (staffUid) removeStudentFromClass(classId, uid, staffUid);
                router.back();
              },
            },
          ])
        }
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: spacing.sm },
  empty: { color: colors.muted },
  pinText: { color: colors.text, marginBottom: spacing.sm },
});
