import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccentProvider, Button, Card, Screen, Subtitle, Title } from '../../src/components/ui';
import { AGE_TIERS } from '../../src/constants/content';
import { stepHref } from '../../src/constants/engine';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp, type ProjectSeed } from '../../src/context/AppContext';
import { REACTIONS, useApprovedGallery, useCommunityProblems, useReactions } from '../../src/hooks/useShowcase';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import type { GalleryItem } from '../../src/types';

type Tab = 'problems' | 'gallery';

function useAdopt() {
  const { project, startProject } = useApp();
  return (seed: ProjectSeed) => {
    const go = () => {
      startProject(seed);
      router.push(stepHref('think-starter'));
    };
    if (project?.status === 'in-progress') {
      Alert.alert('Start a new project?', 'Your current project is saved and stays in your Engine tab.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: go },
      ]);
    } else go();
  };
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const theme = useTierTheme();
  const adopt = useAdopt();
  const { counts, mine, react } = useReactions(item.id);
  const s = item.snapshot;
  const tier = AGE_TIERS.find((t) => t.id === s.tier);

  return (
    <Card>
      <Text style={styles.meta}>
        {item.authorName} · {item.className}
        {tier ? ` · ${tier.label}` : ''}
      </Text>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: '700' }}>Solution: </Text>
        {s.finalSolution || s.selectedIdea}
      </Text>
      <Text style={styles.meta}>
        {s.ideasCount} ideas · {s.hasMaterials === false ? 'Designed' : `Prototype L${s.prototypeLevel}`} · {s.iterationsCount} test(s)
      </Text>

      <View style={styles.reactions}>
        {REACTIONS.map((r) => {
          const on = mine === r.key;
          return (
            <Pressable
              key={r.key}
              accessibilityLabel={r.label}
              accessibilityState={{ selected: on }}
              onPress={() => react(r.key)}
              style={[styles.reaction, { borderColor: theme.accent }, on && { backgroundColor: theme.accent }]}
            >
              <Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={14} color={on ? '#fff' : theme.accent} />
              <Text style={[styles.reactionText, { color: on ? '#fff' : theme.accent }]}>
                {r.label}
                {counts[r.key] ? ` ${counts[r.key]}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Adapt this design for my community"
        variant="secondary"
        onPress={() =>
          adopt({
            origin: { kind: 'gallery', id: item.id, title: s.title },
            problem: { statement: s.title, observation: `Adapted from ${item.authorName}'s solution: ${s.finalSolution || s.selectedIdea}` },
          })
        }
      />
    </Card>
  );
}

export default function ShowcaseTab() {
  const theme = useTierTheme();
  const [tab, setTab] = useState<Tab>('problems');
  const problems = useCommunityProblems();
  const gallery = useApprovedGallery();
  const adopt = useAdopt();

  return (
    <AccentProvider value={theme}>
      <Screen tabScreen>
        <Title>Showcase</Title>
        <Subtitle>Real problems to solve, and inventions from other young innovators.</Subtitle>

        <View style={styles.segment}>
          {(['problems', 'gallery'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segBtn, tab === t && { backgroundColor: theme.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.segText, { color: tab === t ? '#fff' : theme.accent }]}>
                {t === 'problems' ? 'Problem Bank' : 'Gallery'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'problems' &&
          (problems.length ? (
            problems.map((p) => (
              <Card key={`${p.scope}-${p.id}`}>
                <View style={[styles.scope, { backgroundColor: p.scope === 'school' ? theme.soft : '#F1F5F9' }]}>
                  <Text style={[styles.scopeText, { color: p.scope === 'school' ? theme.accent : '#475569' }]}>
                    {p.scope === 'school' ? 'FROM YOUR SCHOOL' : 'COMMUNITY'}
                  </Text>
                </View>
                <Text style={styles.title}>{p.title}</Text>
                <Text style={styles.body}>{p.description}</Text>
                <Text style={styles.meta}>
                  {p.location ? `${p.location} · ` : ''}Shared by {p.postedBy}
                </Text>
                <Button
                  title="Adopt challenge"
                  onPress={() =>
                    adopt({
                      origin: { kind: 'community', id: p.id, title: p.title },
                      problem: { statement: p.title, observation: p.description },
                    })
                  }
                />
              </Card>
            ))
          ) : (
            <Card>
              <Text style={styles.body}>No community problems yet. Ask your teacher to post one, or join your class to see your school's.</Text>
            </Card>
          ))}

        {tab === 'gallery' &&
          (gallery.length ? (
            gallery.map((g) => <GalleryCard key={g.id} item={g} />)
          ) : (
            <Card>
              <Text style={styles.body}>No published inventions yet. Finish a project and share it from your Engine tab!</Text>
            </Card>
          ))}
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, marginBottom: spacing.md, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  segText: { fontWeight: '700' },
  scope: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: spacing.xs },
  scopeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { color: colors.text, marginVertical: 4, lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: spacing.sm },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  reactionText: { fontSize: 12, fontWeight: '700' },
});
