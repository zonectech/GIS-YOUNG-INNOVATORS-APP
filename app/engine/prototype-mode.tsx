import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialSubstitutionModal } from '../../src/components/MaterialSubstitutionModal';
import { Button, Card, Field } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { PROTOTYPE_LEVELS } from '../../src/constants/content';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import type { PrototypeLevel } from '../../src/types';

export default function PrototypeModeScreen() {
  const { project, updateProject } = useProject();
  const [showSubs, setShowSubs] = useState(false);
  const { level, notes } = project.prototype;
  const current = PROTOTYPE_LEVELS[level];

  const setLevel = (l: PrototypeLevel) => updateProject({ prototype: { level: l, notes } });
  const setNote = (v: string) => updateProject({ prototype: { level, notes: { ...notes, [level]: v } } });

  return (
    <WizardScreen
      step="prototype-mode"
      subtitle="Climb the prototype levels. Each level builds on the last."
      canNext={!!notes[0]?.trim()}
    >
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        {PROTOTYPE_LEVELS.map((l) => {
          const done = !!notes[l.level]?.trim();
          const active = l.level === level;
          return (
            <Pressable
              key={l.level}
              onPress={() => setLevel(l.level)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                marginHorizontal: 2,
                borderRadius: radius.sm,
                backgroundColor: active ? colors.primary : done ? colors.primaryLight : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontWeight: '700', color: active ? '#fff' : colors.text }}>L{l.level}</Text>
              <Text style={{ fontSize: 10, color: active ? '#fff' : colors.muted }}>{l.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ backgroundColor: colors.primaryLight }}>
        <Text style={{ fontWeight: '700' }}>
          Level {current.level} — {current.name}
        </Text>
        <Text>{current.hint}</Text>
      </Card>

      <Field
        label="What did you do at this level?"
        multiline
        value={notes[level] ?? ''}
        onChangeText={setNote}
        placeholder="Describe your work, materials used and what you noticed"
      />

      {level < 5 && (
        <Button
          title={`Move to Level ${level + 1}`}
          variant="secondary"
          disabled={!notes[level]?.trim()}
          onPress={() => setLevel((level + 1) as PrototypeLevel)}
        />
      )}
      <Button title="I need a material substitute" variant="ghost" onPress={() => setShowSubs(true)} />

      <MaterialSubstitutionModal
        visible={showSubs}
        onClose={() => setShowSubs(false)}
        used={project.substitutions}
        onUse={(m) =>
          updateProject({
            substitutions: project.substitutions.includes(m)
              ? project.substitutions.filter((x) => x !== m)
              : [...project.substitutions, m],
          })
        }
      />
    </WizardScreen>
  );
}
