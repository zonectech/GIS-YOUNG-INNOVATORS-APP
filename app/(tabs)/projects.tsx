import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccentProvider, Button, Card, Screen, Subtitle, Title } from '../../src/components/ui';
import { getFlow, STEP_TITLES, stepHref } from '../../src/constants/engine';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useMyGallery, submitToGallery, withdrawFromGallery } from '../../src/hooks/useShowcase';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import { portfolioScore } from '../../src/lib/badges';
import { exportPortfolioPdf } from '../../src/lib/portfolioPdf';
import type { GalleryItem, InnovationPortfolio } from '../../src/types';

const GALLERY_LABEL: Record<GalleryItem['status'], string> = {
  pending: 'Waiting for teacher approval',
  approved: 'Published in the Showcase',
  rejected: 'Not approved: ask your teacher',
};

function ProjectCard({ p, gallery }: { p: InnovationPortfolio; gallery?: GalleryItem }) {
  const { profile, project, deleteProject } = useApp();
  const theme = useTierTheme();
  const [busy, setBusy] = useState(false);
  const done = p.status === 'completed';
  const innovator = profile.ageTier === 'innovator';
  const flow = getFlow(profile.ageTier, p.hasMaterials);
  const stepIndex = Math.max(0, flow.indexOf(p.currentStep));

  const publish = () => {
    if (!profile.school) {
      Alert.alert('Join your class first', 'Your teacher needs to approve work before it is shared. Join with your class code.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join class', onPress: () => router.push('/onboarding/join-class') },
      ]);
      return;
    }
    if (!profile.displayName) {
      Alert.alert('Add your first name', 'Set your first name on your Passport so others know who made it.', [
        { text: 'OK', onPress: () => router.navigate('/passport') },
      ]);
      return;
    }
    submitToGallery(p, profile.displayName, profile.school);
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      await exportPortfolioPdf(p);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not create the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <View style={[styles.pill, { backgroundColor: done ? theme.soft : '#FEF3C7' }]}>
          <Text style={[styles.pillText, { color: done ? theme.accent : '#92400E' }]}>{done ? 'COMPLETED' : 'IN PROGRESS'}</Text>
        </View>
        <Text style={[styles.score, { color: theme.accent }]}>{portfolioScore(p)}/100</Text>
      </View>
      <Text style={styles.title}>{p.problem.statement || 'Untitled project'}</Text>
      {p.origin && (
        <Text style={styles.meta}>
          From {p.origin.kind === 'community' ? 'community problem' : 'Showcase design'}: {p.origin.title}
        </Text>
      )}
      {!done && (
        <Text style={styles.meta}>
          Step {stepIndex + 1}/{flow.length}: {STEP_TITLES[p.currentStep]}
        </Text>
      )}
      {!done && p.id === project?.id && (
        <Button title="Continue" onPress={() => router.push(stepHref(p.currentStep))} style={{ marginTop: spacing.sm }} />
      )}

      <View style={styles.actions}>
        <Action icon="git-network-outline" label="Evolution map" onPress={() => router.push(`/student/evolution/${p.id}`)} />
        <Action icon="document-text-outline" label={busy ? 'Creating…' : 'PDF'} onPress={exportPdf} />
        {innovator && done && (
          <Action icon="briefcase-outline" label="Venture" onPress={() => router.push(`/student/venture/${p.id}`)} />
        )}
        <Action
          icon="trash-outline"
          label="Delete"
          danger
          onPress={() =>
            Alert.alert(
              'Delete this project?',
              `"${p.problem.statement || 'Untitled project'}" and its photos will be removed for good.${gallery ? ' It will also be removed from the Showcase.' : ''}`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteProject(p.id) },
              ],
            )
          }
        />
      </View>

      {done &&
        (gallery ? (
          <View style={styles.galleryRow}>
            <Text style={styles.meta}>{GALLERY_LABEL[gallery.status]}</Text>
            <Pressable onPress={() => withdrawFromGallery(p.id)} hitSlop={8}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Withdraw</Text>
            </Pressable>
          </View>
        ) : (
          <Button title="Share to Showcase" variant="secondary" onPress={publish} />
        ))}
    </Card>
  );
}

function Action({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTierTheme();
  const fg = danger ? colors.danger : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: danger ? '#FDECEA' : theme.soft }, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export default function ProjectsTab() {
  const { project, portfolio, startProject } = useApp();
  const theme = useTierTheme();
  const gallery = useMyGallery();
  const active = project?.status === 'in-progress' ? project : null;
  const others = portfolio.filter((p) => p.id !== active?.id);

  const startNew = () => {
    startProject();
    router.push(stepHref('think-starter'));
  };

  return (
    <AccentProvider value={theme}>
      <Screen tabScreen>
        <Title>Innovation Engine</Title>
        <Subtitle>Your projects, drafts and finished portfolios.</Subtitle>

        {!active && <Button title="Start a new project" onPress={startNew} />}

        {active && <ProjectCard p={active} />}
        {others.map((p) => (
          <ProjectCard key={p.id} p={p} gallery={gallery[p.id]} />
        ))}
        {active && <Button title="Start another project" variant="ghost" onPress={startNew} />}
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  score: { fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg },
  actionText: { fontWeight: '700', fontSize: 13 },
  galleryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
