import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccentProvider, Button, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import { useTierTheme } from '../../../src/hooks/useTierTheme';
import { buildEvolution, type EvoNode } from '../../../src/lib/evolution';

export default function EvolutionMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { portfolio, project, profile } = useApp();
  const theme = useTierTheme();
  const p = project?.id === id ? project : portfolio.find((x) => x.id === id);
  const stages = useMemo(() => (p ? buildEvolution(p) : []), [p]);
  const [open, setOpen] = useState<EvoNode | null>(null);
  // Discarded branches are an Innovator-tier tool for tracing alternatives after a failed test.
  const [showDiscarded, setShowDiscarded] = useState(false);
  const canTrace = profile.ageTier === 'innovator';

  if (!p) {
    return (
      <Screen>
        <Subtitle>Project not found.</Subtitle>
      </Screen>
    );
  }

  return (
    <AccentProvider value={theme}>
      <Screen>
        <Title>Idea Evolution Map</Title>
        <Subtitle>How "{p.problem.statement || 'your idea'}" grew from a raw problem into a solution. Tap any node.</Subtitle>
        {canTrace && stages.some((s) => s.nodes.some((n) => n.discarded)) && (
          <Button
            title={showDiscarded ? 'Hide discarded branches' : 'Trace discarded branches'}
            variant="ghost"
            onPress={() => setShowDiscarded(!showDiscarded)}
          />
        )}

        {stages.map((s, i) => {
          const nodes = s.nodes.filter((n) => !n.discarded || showDiscarded || !canTrace);
          return (
            <View key={s.id}>
              {i > 0 && (
                <View style={styles.connector}>
                  <View style={[styles.line, { backgroundColor: theme.accent }]} />
                  <Ionicons name="caret-down" size={16} color={theme.accent} />
                </View>
              )}
              <Text style={[styles.stageTitle, { color: theme.accent }]}>{s.title.toUpperCase()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nodes}>
                {nodes.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => setOpen(n)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.node,
                      nodes.length === 1 && styles.nodeWide,
                      n.chosen && { borderColor: theme.accent, backgroundColor: theme.soft },
                      n.discarded && styles.discarded,
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={[styles.nodeLabel, n.chosen && { color: theme.accent }]} numberOfLines={1}>
                      {n.chosen ? '★ ' : ''}
                      {n.label}
                    </Text>
                    <Text style={styles.nodeText} numberOfLines={3}>
                      {n.text}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}

        <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(null)}>
            <Pressable style={styles.popover}>
              <Text style={[styles.popLabel, { color: theme.accent }]}>{open?.label}</Text>
              <Text style={styles.popText}>{open?.text}</Text>
              {open?.details.map((d) => (
                <View key={d.label} style={styles.detail}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              ))}
              <Button title="Close" variant="secondary" onPress={() => setOpen(null)} style={{ marginTop: spacing.md }} />
            </Pressable>
          </Pressable>
        </Modal>
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  connector: { alignItems: 'center', marginVertical: 2 },
  line: { width: 2, height: 16, borderRadius: 1 },
  stageTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: spacing.xs },
  nodes: { gap: spacing.sm, paddingBottom: spacing.xs },
  node: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.sm,
    ...shadow,
  },
  nodeWide: { width: 320 },
  discarded: { opacity: 0.45, borderStyle: 'dashed', borderColor: colors.border },
  nodeLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 2 },
  nodeText: { fontSize: 14, color: colors.text, lineHeight: 19 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  popover: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' },
  popLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  popText: { fontSize: 17, fontWeight: '700', color: colors.text, marginVertical: spacing.sm },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailLabel: { color: colors.muted, fontWeight: '600' },
  detailValue: { color: colors.text, flex: 1, textAlign: 'right' },
});
