import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AccentProvider, Button, Screen } from '../../src/components/ui';
import { AGE_TIERS } from '../../src/constants/content';
import { getFlow, STEP_TITLES, stepHref } from '../../src/constants/engine';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useMentor } from '../../src/context/MentorContext';
import { useMyGallery } from '../../src/hooks/useShowcase';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import { BADGES, earnedBadges, passportLevel } from '../../src/lib/badges';

type IconName = keyof typeof Ionicons.glyphMap;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Same challenge all day, a new one tomorrow.
const dayIndex = () => Math.floor(Date.now() / 86_400_000);

export default function StudentHomeScreen() {
  const { profile, project, portfolio, challenges, hasPendingWrites, startProject, levelRequest } = useApp();
  const { openMentor } = useMentor();
  const theme = useTierTheme();
  const myGallery = useMyGallery();

  const tier = AGE_TIERS.find((t) => t.id === profile.ageTier);
  const active = project?.status === 'in-progress' ? project : null;
  const flow = getFlow(profile.ageTier, active?.hasMaterials);
  const stepIndex = active ? Math.max(0, flow.indexOf(active.currentStep)) : 0;
  const progress = active ? (stepIndex + 1) / flow.length : 0;

  const approvedShowcase = Object.values(myGallery).filter((g) => g.status === 'approved').length;
  const earned = earnedBadges({ portfolios: portfolio, profile, approvedShowcase });
  const nextBadge = BADGES.find((b) => !earned.some((e) => e.id === b.id));
  const completed = portfolio.filter((p) => p.status === 'completed').length;
  const today = challenges[dayIndex() % challenges.length];

  const startNew = () => {
    startProject();
    router.push(stepHref('think-starter'));
  };

  return (
    <AccentProvider value={theme}>
      <Screen tabScreen>
        <View style={[styles.hero, { backgroundColor: theme.accent }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroHello}>{greeting()},</Text>
            <Text style={styles.heroName}>{profile.displayName ?? 'Innovator'}!</Text>
            <View style={styles.heroChips}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{tier?.label ?? '—'}</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="trophy" size={11} color="#fff" />
                <Text style={styles.heroChipText}>Level {passportLevel(earned.length)}</Text>
              </View>
              <View style={styles.heroChip}>
                <View style={[styles.dot, { backgroundColor: hasPendingWrites ? '#FDE68A' : '#BBF7D0' }]} />
                <Text style={styles.heroChipText}>{hasPendingWrites ? 'Saving…' : 'Synced'}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="rocket" size={56} color="rgba(255,255,255,0.25)" />
        </View>

        {levelRequest?.status === 'pending' && (
          <View style={styles.notice}>
            <Ionicons name="time-outline" size={16} color="#92400E" />
            <Text style={styles.noticeText}>
              Waiting for your teacher to approve your move to {AGE_TIERS.find((t) => t.id === levelRequest.to)?.label}.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          {active ? (
            <>
              <Text style={[styles.kicker, { color: theme.accent }]}>CONTINUE YOUR PROJECT</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {active.problem.statement || 'New project: problem not defined yet'}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={styles.meta}>
                Step {stepIndex + 1} of {flow.length} · Next: {STEP_TITLES[active.currentStep]}
              </Text>
              <Button title="Continue" onPress={() => router.push(stepHref(active.currentStep))} style={{ marginTop: spacing.sm }} />
            </>
          ) : (
            <>
              <Text style={[styles.kicker, { color: theme.accent }]}>READY FOR A NEW CHALLENGE?</Text>
              <Text style={styles.cardTitle}>Find a problem worth solving</Text>
              <Text style={styles.meta}>Start with a quick warm-up, then spot a problem around you.</Text>
              <Button title="Start a project" onPress={startNew} style={{ marginTop: spacing.sm }} />
            </>
          )}
        </View>

        {today && (
          <View style={[styles.card, { backgroundColor: theme.soft }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.kicker, { color: theme.accent }]}>TODAY'S THINK STARTER</Text>
              <Ionicons name="flash" size={16} color={theme.accent} />
            </View>
            <Text style={styles.todayTitle}>{today.title}</Text>
            <Text style={styles.todayPrompt}>{today.prompt}</Text>
            <Pressable onPress={() => openMentor(null)} style={styles.inlineLink}>
              <Ionicons name="sparkles" size={14} color={theme.accent} />
              <Text style={[styles.inlineLinkText, { color: theme.accent }]}>Talk it through with the AI Mentor</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.grid}>
          <Tile icon="compass" label="Problem Bank" sub="Adopt a real challenge" onPress={() => router.navigate('/showcase')} />
          <Tile icon="sparkles" label="AI Mentor" sub="Ask for a hint" onPress={() => openMentor(null)} />
          <Tile icon="trophy" label="Badges" sub={`${earned.length}/${BADGES.length} unlocked`} onPress={() => router.navigate('/passport')} />
          <Tile icon="folder-open" label="Portfolio" sub={`${completed} finished`} onPress={() => router.push('/student/portfolio')} />
        </View>

        {nextBadge && (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View style={[styles.badgeIcon, { backgroundColor: theme.soft }]}>
                <Ionicons name={nextBadge.icon as IconName} size={22} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: theme.accent }]}>NEXT BADGE</Text>
                <Text style={styles.cardTitle}>{nextBadge.title}</Text>
                <Text style={styles.meta}>{nextBadge.description}</Text>
              </View>
            </View>
          </View>
        )}

        <Pressable style={styles.classRow} onPress={() => router.push('/onboarding/join-class')}>
          <Ionicons name="school" size={20} color={theme.accent} />
          <Text style={styles.classText} numberOfLines={1}>
            {profile.school ? profile.school.className : 'Join your class with a code'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable style={styles.classRow} onPress={() => router.push('/onboarding/offline-sync')}>
          <Ionicons name="cloud-download" size={20} color={theme.accent} />
          <Text style={styles.classText}>Sync & download offline challenges</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </Screen>
    </AccentProvider>
  );
}

function Tile({ icon, label, sub, onPress }: { icon: IconName; label: string; sub: string; onPress: () => void }) {
  const theme = useTierTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.tileIcon, { backgroundColor: theme.accent }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  heroHello: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800' },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  noticeText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: spacing.xs },
  todayPrompt: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.text, marginTop: 2 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  inlineLinkText: { fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tile: { width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  tileLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  tileSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  classText: { flex: 1, fontWeight: '600', color: colors.text },
});
