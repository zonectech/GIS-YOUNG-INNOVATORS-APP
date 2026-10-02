import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AccentProvider, Button, Card, Field, Screen, Subtitle, Title } from '../../../src/components/ui';
import { CRITERIA, PROTOTYPE_LEVELS } from '../../../src/constants/content';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import { useTierTheme } from '../../../src/hooks/useTierTheme';
import { exportPitchDeck } from '../../../src/lib/documents';
import type { Venture } from '../../../src/types';

const FIELDS: { key: keyof Omit<Venture, 'updatedAt'>; n: number; label: string; placeholder: string }[] = [
  { key: 'beneficiary', n: 2, label: 'Target beneficiary / customer', placeholder: 'e.g. Smallholder maize farmers in Niger State' },
  { key: 'costToProduce', n: 3, label: 'Cost to produce one unit', placeholder: 'e.g. ₦4,500 per unit' },
  { key: 'valueProposition', n: 4, label: 'Value proposition', placeholder: 'e.g. Reduces post-harvest loss by 40%' },
  { key: 'impactMetric', n: 5, label: 'Social & environmental impact metric', placeholder: 'e.g. Prevents 200kg of food waste per farmer per season' },
];

export default function VentureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { portfolio, project, profile, updatePortfolio } = useApp();
  const theme = useTierTheme();
  const p = project?.id === id ? project : portfolio.find((x) => x.id === id);
  const [form, setForm] = useState<Omit<Venture, 'updatedAt'>>(() => ({
    beneficiary: p?.venture?.beneficiary ?? '',
    costToProduce: p?.venture?.costToProduce ?? '',
    valueProposition: p?.venture?.valueProposition ?? '',
    impactMetric: p?.venture?.impactMetric ?? '',
  }));
  const [saved, setSaved] = useState(true);

  if (!p || profile.ageTier !== 'innovator') {
    return (
      <Screen>
        <Subtitle>The Entrepreneurship pathway is part of the Innovator (Senior Secondary) tier.</Subtitle>
      </Screen>
    );
  }

  const selected = p.ideas.find((i) => i.id === p.selectedIdea?.id);
  const last = p.iterations[p.iterations.length - 1];
  const strengths = selected
    ? CRITERIA.filter((c) => (selected.ratings[c.id] ?? 0) >= 4).map((c) => c.label)
    : [];

  const save = () => {
    updatePortfolio(p.id, { venture: { ...form, updatedAt: new Date().toISOString() } });
    setSaved(true);
  };

  const deck = async () => {
    save();
    try {
      await exportPitchDeck({ ...p, venture: { ...form, updatedAt: new Date().toISOString() } }, profile.displayName);
    } catch (e) {
      Alert.alert('Could not create the pitch deck', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <AccentProvider value={theme}>
      <Screen>
        <Title>Entrepreneurship pathway</Title>
        <Subtitle>Turn your tested prototype into a venture: who it helps, what it costs, and the impact it makes.</Subtitle>

        <View style={[styles.step, { borderColor: theme.accent }]}>
          <Text style={[styles.num, { backgroundColor: theme.accent }]}>1</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Verified prototype</Text>
            <Text style={styles.value}>{p.selectedIdea?.text ?? '—'}</Text>
            <Text style={styles.meta}>
              {p.hasMaterials === false ? 'Designed solution' : `Prototype L${p.prototype.level} · ${PROTOTYPE_LEVELS[p.prototype.level].name}`}
              {last ? ` · Latest test: ${last.result || '—'}` : ''}
            </Text>
            {strengths.length > 0 && <Text style={styles.meta}>Scored highly for: {strengths.join(', ')}</Text>}
          </View>
        </View>

        {FIELDS.map((f) => (
          <Card key={f.key}>
            <View style={styles.fieldHead}>
              <Text style={[styles.num, { backgroundColor: theme.accent }]}>{f.n}</Text>
              <Text style={styles.label}>{f.label}</Text>
            </View>
            <Field
              value={form[f.key]}
              onChangeText={(v) => {
                setForm({ ...form, [f.key]: v });
                setSaved(false);
              }}
              placeholder={f.placeholder}
              multiline
              maxLength={300}
            />
          </Card>
        ))}

        <Button title={saved ? 'Saved' : 'Save canvas'} disabled={saved} onPress={save} />
        <Button title="Export 5-slide pitch deck (PDF)" variant="secondary" onPress={deck} />
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: spacing.sm, borderLeftWidth: 4, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  num: { color: '#fff', fontWeight: '800', width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  label: { fontWeight: '700', color: colors.text, fontSize: 15, flexShrink: 1 },
  value: { fontSize: 16, color: colors.text, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
