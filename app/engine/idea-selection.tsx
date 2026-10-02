import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Rating } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { CRITERIA, CRITERIA_BY_TIER } from '../../src/constants/content';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import type { Criterion, Idea } from '../../src/types';

export default function IdeaSelectionMatrixScreen() {
  const { project, updateProject, ageTier } = useProject();
  const theme = useTierTheme();
  const criteria = CRITERIA.filter((c) => CRITERIA_BY_TIER[ageTier].includes(c.id));
  const maxScore = criteria.length * 5;

  const score = (idea: Idea) => criteria.reduce((sum, c) => sum + (idea.ratings[c.id] ?? 0), 0);
  const ratedCount = (idea: Idea) => criteria.filter((c) => idea.ratings[c.id]).length;
  const bestScore = Math.max(0, ...project.ideas.map(score));

  const [expanded, setExpanded] = useState<string | null>(
    () => project.selectedIdea?.id ?? project.ideas.find((i) => ratedCount(i) < criteria.length)?.id ?? null,
  );

  const rate = (id: string, c: Criterion, v: number) =>
    updateProject({
      ideas: project.ideas.map((idea) => (idea.id === id ? { ...idea, ratings: { ...idea.ratings, [c]: v } } : idea)),
    });

  return (
    <WizardScreen
      step="idea-selection"
      subtitle="Reality check: rate each idea from 1 (low) to 5 (high), then pick one to develop."
      canNext={project.selectedIdea !== null}
    >
      {project.ideas.map((idea, i) => {
        const selected = project.selectedIdea?.id === idea.id;
        const open = expanded === idea.id;
        const s = score(idea);
        const isBest = s > 0 && s === bestScore;
        return (
          <View key={idea.id} style={[styles.card, selected && { borderColor: theme.accent }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setExpanded(open ? null : idea.id)}
            >
              <View style={styles.header}>
                <View style={[styles.num, { backgroundColor: selected ? theme.accent : theme.soft }]}>
                  <Text style={[styles.numText, { color: selected ? '#fff' : theme.accent }]}>{i + 1}</Text>
                </View>
                <Text style={styles.ideaText} numberOfLines={open ? undefined : 2}>
                  {idea.text}
                </Text>
                {isBest && (
                  <View style={[styles.best, { backgroundColor: colors.accent }]}>
                    <Text style={styles.bestText}>TOP</Text>
                  </View>
                )}
              </View>
              <View style={styles.scoreRow}>
                <View style={styles.scoreTrack}>
                  <View style={[styles.scoreFill, { backgroundColor: theme.accent, width: `${(s / maxScore) * 100}%` }]} />
                </View>
                <Text style={[styles.scoreText, { color: theme.accent }]}>
                  {s}/{maxScore}
                </Text>
              </View>
              {!open && (
                <Text style={styles.tapHint}>
                  {ratedCount(idea) < criteria.length
                    ? `Tap to rate (${ratedCount(idea)}/${criteria.length})`
                    : selected
                      ? 'Selected for development'
                      : 'Tap to review'}
                </Text>
              )}
            </Pressable>

            {open && (
              <View style={{ marginTop: spacing.sm }}>
                {criteria.map((c) => (
                  <View key={c.id} style={styles.criterion}>
                    <Text style={styles.criterionLabel}>{c.label}</Text>
                    <Rating value={idea.ratings[c.id]} onChange={(v) => rate(idea.id, c.id, v)} />
                  </View>
                ))}
                <Button
                  title={selected ? 'Selected ✓' : 'Develop this idea'}
                  variant={selected ? 'primary' : 'secondary'}
                  onPress={() => updateProject({ selectedIdea: { id: idea.id, text: idea.text } })}
                />
              </View>
            )}
          </View>
        );
      })}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numText: { fontWeight: '800' },
  ideaText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  best: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bestText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  scoreTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  scoreFill: { height: 8, borderRadius: 4 },
  scoreText: { fontWeight: '800', fontSize: 13, minWidth: 44, textAlign: 'right' },
  tapHint: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  criterion: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  criterionLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
});
