import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Field, Row } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useProject } from '../../src/hooks/useProject';
import { useTierTheme } from '../../src/hooks/useTierTheme';

const DURATIONS = [2, 3, 5];

export default function ThinkStarterScreen() {
  const { project, updateProject } = useProject();
  const { challenges } = useApp();
  const theme = useTierTheme();

  const [index, setIndex] = useState(() => {
    const i = challenges.findIndex((c) => c.id === project.thinkStarter.challenge?.id);
    return i >= 0 ? i : Math.floor(Math.random() * challenges.length);
  });
  const [timer, setTimer] = useState<{ total: number; left: number } | null>(null);

  const challenge = challenges[index % challenges.length];

  useEffect(() => {
    if (!timer || timer.left <= 0) return;
    const t = setTimeout(() => setTimer({ ...timer, left: timer.left - 1 }), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const setResponse = (response: string) =>
    updateProject({
      thinkStarter: { challenge: { id: challenge.id, title: challenge.title, prompt: challenge.prompt }, response },
    });

  const rotate = () => {
    setIndex((i) => (i + 1) % challenges.length);
    updateProject({ thinkStarter: { challenge: null, response: '' } });
  };

  const done = timer?.left === 0;

  return (
    <WizardScreen
      step="think-starter"
      subtitle="Warm up your brain for 2–5 minutes."
      canNext={project.thinkStarter.response.trim().length > 0}
    >
      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>{challenge.title}</Text>
        </View>
        <Text style={styles.heroPrompt}>{challenge.prompt}</Text>
        {challenge.options && (
          <Row style={{ marginTop: spacing.md }}>
            {challenge.options.map((o) => {
              const selected = project.thinkStarter.response === o;
              return (
                <Text
                  key={o}
                  accessibilityRole="button"
                  onPress={() => setResponse(o)}
                  style={[styles.option, selected && { backgroundColor: '#fff', color: theme.accent }]}
                >
                  {o}
                </Text>
              );
            })}
          </Row>
        )}
        <Text accessibilityRole="button" onPress={rotate} style={styles.shuffle}>
          Try a different challenge ↻
        </Text>
      </View>

      <View style={styles.timerCard}>
        {timer && !done ? (
          <>
            <Text style={[styles.timerText, { color: theme.accent }]}>
              {Math.floor(timer.left / 60)}:{String(timer.left % 60).padStart(2, '0')}
            </Text>
            <View style={styles.timerTrack}>
              <View
                style={[
                  styles.timerFill,
                  { backgroundColor: theme.accent, width: `${(timer.left / timer.total) * 100}%` },
                ]}
              />
            </View>
            <Button title="Stop timer" variant="ghost" onPress={() => setTimer(null)} />
          </>
        ) : (
          <>
            <Text style={styles.timerLabel}>{done ? "Time's up! Finish your thought." : 'Set a warm-up timer'}</Text>
            <Row>
              {DURATIONS.map((m) => (
                <Chip key={m} label={`${m} min`} onPress={() => setTimer({ total: m * 60, left: m * 60 })} />
              ))}
            </Row>
          </>
        )}
      </View>

      <Field
        label="Your answer"
        multiline
        value={project.thinkStarter.response}
        onChangeText={setResponse}
        placeholder="Write or list your ideas…"
      />
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  heroTagText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  heroPrompt: { color: '#fff', fontSize: 21, lineHeight: 29, fontWeight: '700' },
  option: {
    color: '#fff',
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  shuffle: { color: '#fff', opacity: 0.9, fontWeight: '600', marginTop: spacing.md },
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  timerLabel: { fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  timerText: { fontSize: 36, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  timerTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginVertical: spacing.sm, overflow: 'hidden' },
  timerFill: { height: 6, borderRadius: 3 },
});
