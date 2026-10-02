import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AGE_TIERS } from '../constants/content';
import { getAdjacentStep, getFlow, STEP_TITLES, stepHref, type EngineStep } from '../constants/engine';
import { colors, DEFAULT_ACCENT, radius, spacing, TIER_THEMES } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useMentor } from '../context/MentorContext';
import { AccentProvider, Button } from './ui';

type Props = {
  step: EngineStep;
  subtitle?: string;
  children: ReactNode;
  canNext?: boolean;
  nextLabel?: string;
  /** Overrides default linear navigation (e.g. final step). */
  onNext?: () => void;
  hideNext?: boolean;
};

export function WizardScreen({ step, subtitle, children, canNext = true, nextLabel, onNext, hideNext }: Props) {
  const { profile, project, updateProject } = useApp();
  const { openMentor } = useMentor();
  const ageTier = profile.ageTier;
  const hasMaterials = project?.hasMaterials;
  const theme = ageTier ? TIER_THEMES[ageTier] : DEFAULT_ACCENT;
  const tierLabel = AGE_TIERS.find((t) => t.id === ageTier)?.label;

  const flow = getFlow(ageTier, hasMaterials);
  const index = Math.max(0, flow.findIndex((s) => s === step));
  const prev = getAdjacentStep(step, -1, ageTier, hasMaterials);
  const next = getAdjacentStep(step, 1, ageTier, hasMaterials);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [enter]);

  const goNext = () => {
    if (onNext) return onNext();
    if (!next) return;
    updateProject({ currentStep: next });
    router.push(stepHref(next));
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (prev) router.replace(stepHref(prev));
  };

  return (
    <AccentProvider value={theme}>
      <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.metaRow}>
              {tierLabel && (
                <View style={[styles.badge, { backgroundColor: theme.soft }]}>
                  <Text style={[styles.badgeText, { color: theme.accent }]}>{tierLabel}</Text>
                </View>
              )}
              <Text style={styles.stepText}>
                Step {index + 1} of {flow.length}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ask the AI Mentor"
                onPress={() => openMentor(step)}
                style={[styles.mentorBtn, { backgroundColor: theme.accent }]}
              >
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.mentorText}>Mentor</Text>
              </Pressable>
            </View>

            <View style={styles.segments} accessibilityLabel={`Step ${index + 1} of ${flow.length}`}>
              {flow.map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.segment,
                    i < index && { backgroundColor: theme.accent, opacity: 0.45 },
                    i === index && [styles.segmentCurrent, { backgroundColor: theme.accent }],
                  ]}
                />
              ))}
            </View>

            <Animated.View
              style={{
                opacity: enter,
                transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }}
            >
              <Text style={styles.title}>{STEP_TITLES[step]}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
            </Animated.View>
          </ScrollView>

          <View style={styles.bottomBar}>
            {next && !hideNext && <Text style={styles.upNext}>Up next: {STEP_TITLES[next]}</Text>}
            <View style={styles.actions}>
              <Button title="Back" variant="ghost" onPress={goBack} disabled={!prev} style={styles.backBtn} />
              {!hideNext && (
                <Button
                  title={nextLabel ?? (next ? 'Continue' : 'Finish')}
                  onPress={goNext}
                  disabled={!canNext}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  stepText: { color: colors.muted, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginRight: spacing.sm },
  mentorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  mentorText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  segments: { flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: spacing.lg },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  segmentCurrent: { flex: 2, height: 8, borderRadius: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: spacing.lg },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  upNext: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  backBtn: { width: 100 },
});
