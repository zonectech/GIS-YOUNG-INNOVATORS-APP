import { StyleSheet, Text, View } from 'react-native';

import { Field } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { useTierTheme } from '../../src/hooks/useTierTheme';

export default function FiveWhysScreen() {
  const { project, updateProject } = useProject();
  const theme = useTierTheme();
  const whys = project.research.fiveWhys;

  // Each "Why?" unlocks only after the previous one is answered.
  const unlocked = whys.findIndex((w) => !w.trim());
  const visibleCount = unlocked === -1 ? 5 : unlocked + 1;
  const answered = whys.filter((w) => w.trim()).length;

  const setWhy = (i: number, value: string) =>
    updateProject({ research: { fiveWhys: whys.map((w, idx) => (idx === i ? value : w)) } });

  return (
    <WizardScreen
      step="five-whys"
      subtitle="Dig for the root cause before jumping to a solution."
      canNext={whys.every((w) => w.trim().length > 0)}
    >
      <View style={[styles.problem, { borderLeftColor: theme.accent }]}>
        <Text style={styles.problemLabel}>THE PROBLEM</Text>
        <Text style={styles.problemText}>{project.problem.statement || '—'}</Text>
      </View>

      <Text style={[styles.counter, { color: theme.accent }]}>{answered} / 5 whys answered</Text>

      {whys.slice(0, visibleCount).map((w, i) => {
        const done = !!w.trim();
        const isLast = i === visibleCount - 1;
        return (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.node, { borderColor: theme.accent }, done && { backgroundColor: theme.accent }]}>
                <Text style={[styles.nodeText, { color: done ? '#fff' : theme.accent }]}>{i + 1}</Text>
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: theme.soft }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={i === 0 ? 'Why does this problem happen?' : 'Why does that happen?'}
                value={w}
                onChangeText={(v) => setWhy(i, v)}
                multiline
                placeholder="Because…"
              />
            </View>
          </View>
        );
      })}

      {answered === 5 ? (
        <View style={[styles.root, { backgroundColor: theme.accent }]}>
          <Text style={styles.rootLabel}>LIKELY ROOT CAUSE</Text>
          <Text style={styles.rootText}>{whys[4]}</Text>
        </View>
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  problem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 5,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  problemLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  problemText: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 },
  counter: { fontWeight: '700', fontSize: 13, marginBottom: spacing.md },
  step: { flexDirection: 'row', gap: spacing.sm },
  rail: { alignItems: 'center', width: 32 },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    backgroundColor: colors.surface,
  },
  nodeText: { fontWeight: '800' },
  line: { width: 3, flex: 1, borderRadius: 2, marginTop: 4 },
  root: { borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm, ...shadow },
  rootLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6 },
  rootText: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 4 },
});
