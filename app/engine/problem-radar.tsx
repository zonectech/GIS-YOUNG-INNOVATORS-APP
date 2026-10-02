import { View } from 'react-native';

import { Field, Label, SelectTile } from '../../src/components/ui';
import { VoiceInputButton } from '../../src/components/VoiceInputButton';
import { WizardScreen } from '../../src/components/WizardScreen';
import { spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import type { ProblemCategory } from '../../src/types';

const CATEGORIES: { id: ProblemCategory; label: string; hint: string; marker: string }[] = [
  { id: 'waste', label: 'Waste', hint: 'Things thrown away or used up', marker: 'W' },
  { id: 'inconvenience', label: 'Inconvenience', hint: 'Things that are annoying or hard', marker: 'I' },
  { id: 'inefficiency', label: 'Inefficiency', hint: 'Things that take too long or cost too much', marker: 'E' },
  { id: 'unmet-need', label: 'Unmet need', hint: 'Something people need but don’t have', marker: 'N' },
];

export default function ProblemRadarScreen() {
  const { project, updateProject, ageTier } = useProject();
  const { problem } = project;
  const set = (patch: Partial<typeof problem>) => updateProject({ problem: { ...problem, ...patch } });
  const explorer = ageTier === 'explorer';
  const append = (current: string, spoken: string) => (current.trim() ? `${current.trim()} ${spoken}` : spoken);

  return (
    <WizardScreen
      step="problem-radar"
      subtitle="What problem do you notice at school, at home or in your community?"
      canNext={!!problem.category && problem.statement.trim().length > 0}
    >
      <Label>What kind of problem is it?</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
        {CATEGORIES.map((c) => (
          <SelectTile
            key={c.id}
            title={c.label}
            description={c.hint}
            marker={c.marker}
            selected={problem.category === c.id}
            onPress={() => set({ category: c.id })}
            style={{ width: '48%' }}
          />
        ))}
      </View>
      <Field
        label="What did you observe?"
        multiline
        value={problem.observation}
        onChangeText={(observation) => set({ observation })}
        placeholder="Where, when and who is affected?"
        containerStyle={explorer ? { marginBottom: spacing.xs } : undefined}
      />
      {explorer && (
        <VoiceInputButton
          label="Say what you saw"
          onText={(t) => set({ observation: append(problem.observation, t) })}
        />
      )}
      <Field
        label="Define the problem in one sentence"
        value={problem.statement}
        onChangeText={(statement) => set({ statement })}
        placeholder="e.g. Students waste water at the taps after lunch."
        containerStyle={explorer ? { marginBottom: spacing.xs } : undefined}
      />
      {explorer && <VoiceInputButton label="Say the problem" onText={(t) => set({ statement: t })} />}
    </WizardScreen>
  );
}
