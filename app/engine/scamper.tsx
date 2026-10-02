import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { SCAMPER_PROMPTS } from '../../src/constants/content';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import type { ScamperKey } from '../../src/types';

export default function InteractiveScamperScreen() {
  const { project, updateProject } = useProject();
  const theme = useTierTheme();
  const [active, setActive] = useState<ScamperKey>('S');
  const problem = project.problem.statement || 'your problem';
  const activeIndex = SCAMPER_PROMPTS.findIndex((p) => p.key === active);
  const prompt = SCAMPER_PROMPTS[activeIndex];
  const answered = SCAMPER_PROMPTS.filter((p) => project.scamper[p.key]?.trim()).length;
  const nextLetter = SCAMPER_PROMPTS[(activeIndex + 1) % SCAMPER_PROMPTS.length];

  return (
    <WizardScreen
      step="scamper"
      subtitle={`Pick a letter and answer its question. Answer at least 3 of 7. (${answered}/7 done)`}
      canNext={answered >= 3}
    >
      <View style={styles.letters}>
        {SCAMPER_PROMPTS.map((p) => {
          const done = !!project.scamper[p.key]?.trim();
          const isActive = active === p.key;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={`${p.word}${done ? ', answered' : ''}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => setActive(p.key)}
              style={[
                styles.letter,
                { borderColor: theme.accent },
                done && { backgroundColor: theme.soft },
                isActive && { backgroundColor: theme.accent, transform: [{ scale: 1.08 }] },
              ]}
            >
              <Text style={[styles.letterText, { color: isActive ? '#fff' : theme.accent }]}>{p.key}</Text>
              {done && !isActive && <View style={[styles.doneDot, { backgroundColor: theme.accent }]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.promptCard, { borderTopColor: theme.accent }]}>
        <Text style={[styles.word, { color: theme.accent }]}>
          {prompt.key} · {prompt.word.toUpperCase()}
        </Text>
        <Text style={styles.question}>{prompt.question(problem)}</Text>
      </View>

      <Field
        multiline
        value={project.scamper[active] ?? ''}
        onChangeText={(v) => updateProject({ scamper: { ...project.scamper, [active]: v } })}
        placeholder="Your idea…"
      />
      <Button title={`Next letter: ${nextLetter.word}`} variant="secondary" onPress={() => setActive(nextLetter.key)} />
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  letters: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  letter: {
    width: 42,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  letterText: { fontSize: 20, fontWeight: '800' },
  doneDot: { position: 'absolute', bottom: 5, width: 6, height: 6, borderRadius: 3 },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopWidth: 5,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  word: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  question: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
});
