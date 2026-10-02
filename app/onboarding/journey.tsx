import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentProvider, Button } from '../../src/components/ui';
import { AGE_TIERS } from '../../src/constants/content';
import { STEP_GUIDE } from '../../src/constants/journey';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useTierTheme } from '../../src/hooks/useTierTheme';

/** Step-by-step intro to the student's tier methodology, shown once after choosing a level (replayable). */
export default function JourneyIntroScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { profile } = useApp();
  const theme = useTierTheme();
  const { width } = useWindowDimensions();
  const tier = AGE_TIERS.find((t) => t.id === profile.ageTier) ?? AGE_TIERS[1];
  const steps = tier.steps;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const last = index === steps.length - 1;

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const go = (i: number) => listRef.current?.scrollToIndex({ index: i, animated: true });
  const finish = () => (replay ? router.back() : router.replace('/dashboard'));

  return (
    <AccentProvider value={theme}>
      <SafeAreaView style={styles.root}>
        <View style={styles.top}>
          <Text style={[styles.kicker, { color: theme.accent }]}>
            {tier.label.toUpperCase()} JOURNEY · {tier.level}
          </Text>
          {!last && (
            <Text style={styles.skip} onPress={finish} accessibilityRole="button">
              Skip
            </Text>
          )}
        </View>

        {/* Connected path: every step is a node on one line, filled as you progress. */}
        <View style={styles.path}>
          {steps.map((s, i) => (
            <View key={s} style={styles.pathItem}>
              {i > 0 && <View style={[styles.pathLine, { backgroundColor: i <= index ? theme.accent : colors.border }]} />}
              <View
                style={[
                  styles.pathNode,
                  { borderColor: i <= index ? theme.accent : colors.border },
                  i < index && { backgroundColor: theme.accent },
                  i === index && { backgroundColor: theme.soft, transform: [{ scale: 1.25 }] },
                ]}
              />
            </View>
          ))}
        </View>

        <FlatList
          ref={listRef}
          data={steps}
          keyExtractor={(s) => s}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) => {
            const g = STEP_GUIDE[item];
            return (
              <View style={[styles.slide, { width }]}>
                <View style={[styles.iconCircle, { backgroundColor: theme.accent }]}>
                  <Ionicons name={(g?.icon ?? 'sparkles') as keyof typeof Ionicons.glyphMap} size={48} color="#fff" />
                </View>
                <Text style={styles.stepNum}>
                  Step {i + 1} of {steps.length}
                </Text>
                <Text style={styles.title}>{item}</Text>
                <Text style={styles.text}>{g?.text}</Text>
                {g?.example && (
                  <View style={[styles.example, { borderLeftColor: theme.accent }]}>
                    <Text style={styles.exampleLabel}>EXAMPLE</Text>
                    <Text style={styles.exampleText}>{g.example}</Text>
                  </View>
                )}
                {i < steps.length - 1 && (
                  <View style={styles.next}>
                    <Text style={styles.nextText}>leads to</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.accent} />
                    <Text style={[styles.nextStep, { color: theme.accent }]}>{steps[i + 1]}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.actions}>
          <Button title="Back" variant="ghost" disabled={index === 0} onPress={() => go(index - 1)} style={{ width: 100 }} />
          <Button
            title={last ? (replay ? 'Done' : 'Start innovating') : 'Next'}
            onPress={() => (last ? finish() : go(index + 1))}
            style={{ flex: 1 }}
          />
        </View>
        {last && !replay && !profile.school && (
          <Text style={styles.join} onPress={() => router.push('/onboarding/join-class')} accessibilityRole="button">
            Have a class code? Join your class first
          </Text>
        )}
      </SafeAreaView>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  skip: { color: colors.muted, fontWeight: '700' },
  path: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginVertical: spacing.lg },
  pathItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pathLine: { flex: 1, height: 3, borderRadius: 2 },
  pathNode: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, backgroundColor: colors.surface },
  slide: { paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadow },
  stepNum: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginVertical: spacing.xs, textAlign: 'center' },
  text: { fontSize: 17, lineHeight: 25, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  example: { alignSelf: 'stretch', backgroundColor: colors.surface, borderLeftWidth: 4, borderRadius: radius.md, padding: spacing.md },
  exampleLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  exampleText: { fontSize: 15, color: colors.text, marginTop: 2, fontStyle: 'italic' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  nextText: { color: colors.muted },
  nextStep: { fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  join: { textAlign: 'center', color: colors.muted, fontWeight: '600', paddingBottom: spacing.md, textDecorationLine: 'underline' },
});
