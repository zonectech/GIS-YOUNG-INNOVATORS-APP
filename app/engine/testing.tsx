import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Field } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { colors, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { newId } from '../../src/lib/firebase';
import type { Iteration } from '../../src/types';

const FIELDS: { key: keyof Omit<Iteration, 'id' | 'createdAt'>; short: string; label: string }[] = [
  { key: 'hypothesis', short: 'Hypothesis', label: 'Hypothesis — what do you expect to happen?' },
  { key: 'procedure', short: 'Test', label: 'Test — how will you test it?' },
  { key: 'result', short: 'Result', label: 'Result — what actually happened?' },
  { key: 'wentWrong', short: 'Went wrong', label: 'What went wrong?' },
  { key: 'learnings', short: 'Learned', label: 'What did you learn? How will you improve it?' },
];

const emptyDraft = () => ({ hypothesis: '', procedure: '', result: '', wentWrong: '', learnings: '' });

export default function TestingAndIterationScreen() {
  const { project, updateProject } = useProject();
  const [draft, setDraft] = useState(emptyDraft);
  const iterations = project.iterations;
  const draftComplete = draft.hypothesis.trim() && draft.procedure.trim() && draft.result.trim();

  const save = () => {
    updateProject({ iterations: [...iterations, { id: newId(), ...draft, createdAt: new Date().toISOString() }] });
    setDraft(emptyDraft());
  };

  return (
    <WizardScreen
      step="testing"
      subtitle="Failure is data. Hypothesis → Test → Result → What went wrong → Learn → Improve."
      canNext={iterations.length > 0}
    >
      {iterations.map((it, i) => (
        <Card key={it.id}>
          <Text style={{ fontWeight: '700', color: colors.primary }}>Prototype {i + 1}</Text>
          {FIELDS.map((f) =>
            it[f.key] ? (
              <Text key={f.key} style={{ marginTop: 2 }}>
                <Text style={{ fontWeight: '600' }}>{f.short}: </Text>
                {it[f.key]}
              </Text>
            ) : null,
          )}
        </Card>
      ))}

      <Text style={{ fontSize: 18, fontWeight: '700', marginVertical: spacing.sm }}>
        Prototype {iterations.length + 1} test
      </Text>
      {FIELDS.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          multiline
          value={draft[f.key]}
          onChangeText={(v) => setDraft({ ...draft, [f.key]: v })}
        />
      ))}
      <Button
        title={`Save Prototype ${iterations.length + 1} test`}
        variant="secondary"
        disabled={!draftComplete}
        onPress={save}
      />
    </WizardScreen>
  );
}
