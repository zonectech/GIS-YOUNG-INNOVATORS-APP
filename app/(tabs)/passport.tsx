import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccentProvider, Button, Card, Field, Screen } from '../../src/components/ui';
import { AGE_TIERS } from '../../src/constants/content';
import { colors, radius, shadow, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { useMyGallery } from '../../src/hooks/useShowcase';
import { useTierTheme } from '../../src/hooks/useTierTheme';
import { BADGES, CERTIFICATE_THRESHOLD, earnedBadges, passportLevel, portfolioScore } from '../../src/lib/badges';
import { exportCertificate } from '../../src/lib/documents';
import { exportPortfolioPdf } from '../../src/lib/portfolioPdf';

function SettingRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTierTheme();
  return (
    <Pressable onPress={onPress} style={styles.settingRow} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={theme.accent} />
      <Text style={styles.settingText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function PassportTab() {
  const { profile, portfolio, setDisplayName, levelRequest, setPin, switchStudent, deleteAccount } = useApp();
  const theme = useTierTheme();
  const myGallery = useMyGallery();
  const [editing, setEditing] = useState(!profile.displayName);
  const [name, setName] = useState(profile.displayName ?? '');
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPinText] = useState('');
  const [busy, setBusy] = useState(false);

  const approvedShowcase = Object.values(myGallery).filter((g) => g.status === 'approved').length;
  const earned = earnedBadges({ portfolios: portfolio, profile, approvedShowcase });
  const earnedIds = new Set(earned.map((b) => b.id));
  const level = passportLevel(earned.length);
  const tier = AGE_TIERS.find((t) => t.id === profile.ageTier);
  const completed = portfolio.filter((p) => p.status === 'completed');
  const tierCompleted = completed.filter((p) => p.owner.ageTier === profile.ageTier);
  const certReady = !!profile.ageTier && tierCompleted.length >= CERTIFICATE_THRESHOLD;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Could not create the document', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const act = async (title: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e) {
      Alert.alert(title, e instanceof Error ? e.message : 'Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePin = async () => {
    if (await act('Could not save your PIN', () => setPin(pin))) {
      setPinOpen(false);
      setPinText('');
      Alert.alert('PIN saved', 'You can now log in on any class tablet with your class code and this PIN.');
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete my account?',
      'This permanently deletes your projects, badges and Showcase entries. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: () => act('Could not delete the account', deleteAccount) },
      ],
    );

  return (
    <AccentProvider value={theme}>
      <Screen tabScreen>
        <View style={[styles.hero, { backgroundColor: theme.accent }]}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: theme.accent }]}>{(profile.displayName ?? '?')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editing ? (
              <View style={styles.nameRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.nameInput}
                  maxLength={30}
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={() => {
                    setDisplayName(name);
                    setEditing(false);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="checkmark-circle" size={28} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.8)" />
              </Pressable>
            )}
            <Text style={styles.heroMeta}>{profile.school?.className ?? 'No class joined yet'}</Text>
          </View>
          <View style={styles.levelBox}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLabel}>LEVEL</Text>
          </View>
        </View>
        <Text style={styles.tierLine}>
          {tier ? `${tier.label} tier · ${tier.level}` : 'No tier selected'} · First name only, for your safety.
        </Text>

        <Text style={styles.section}>
          Milestone badges ({earned.length}/{BADGES.length} unlocked)
        </Text>
        <View style={styles.badges}>
          {BADGES.map((b) => {
            const on = earnedIds.has(b.id);
            return (
              <View key={b.id} style={[styles.badge, on ? { borderColor: theme.accent } : styles.badgeLocked]}>
                <View style={[styles.badgeIcon, { backgroundColor: on ? theme.accent : colors.border }]}>
                  <Ionicons name={(on ? b.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap} size={20} color="#fff" />
                </View>
                <Text style={[styles.badgeTitle, !on && { color: colors.muted }]} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {b.description}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Tier certificate</Text>
        <Card>
          <Text style={styles.certText}>
            {certReady
              ? `You completed ${tierCompleted.length} ${tier?.label} projects. Print your certificate and ask your teacher and head teacher to sign it.`
              : `Complete ${CERTIFICATE_THRESHOLD} projects at your current tier to earn a certificate (${tierCompleted.length}/${CERTIFICATE_THRESHOLD}).`}
          </Text>
          <Button
            title="Create certificate"
            disabled={!certReady}
            onPress={() =>
              run(() =>
                exportCertificate({
                  name: profile.displayName,
                  tier: profile.ageTier!,
                  school: profile.school?.className ?? null,
                  projects: tierCompleted.map((p) => ({ title: p.problem.statement || 'Untitled', score: portfolioScore(p) })),
                  badges: earned,
                }),
              )
            }
          />
        </Card>

        <Text style={styles.section}>Completed portfolios</Text>
        {completed.length ? (
          completed.map((p) => (
            <Pressable key={p.id} onPress={() => run(() => exportPortfolioPdf(p))} style={styles.pRow}>
              <Ionicons name="document-text" size={20} color={theme.accent} />
              <Text style={styles.pTitle} numberOfLines={1}>
                {p.problem.statement || 'Untitled'}
              </Text>
              <Text style={[styles.pScore, { color: theme.accent }]}>{portfolioScore(p)}/100</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>Finish your first project to see it here.</Text>
        )}

        <Text style={styles.section}>Settings</Text>
        <SettingRow
          icon="keypad-outline"
          label={profile.hasPin ? 'Change my login PIN' : 'Set a login PIN (for shared tablets)'}
          onPress={() => setPinOpen((o) => !o)}
        />
        {pinOpen ? (
          <Card>
            <Field
              label="Choose 4 numbers you will remember"
              value={pin}
              onChangeText={(t) => setPinText(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            <Button title={busy ? 'Saving…' : 'Save PIN'} onPress={savePin} disabled={busy || pin.length !== 4} />
            <Text style={styles.empty}>Keep it secret. Needs internet to save.</Text>
          </Card>
        ) : null}
        <SettingRow
          icon="people-outline"
          label="Log out so a classmate can use this tablet"
          onPress={() =>
            Alert.alert('Log out?', 'Your work will be saved first. Log back in with your class code and PIN.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', onPress: () => act('Could not log out', switchStudent) },
            ])
          }
        />
        <SettingRow
          icon="map-outline"
          label="How the innovation journey works"
          onPress={() => router.push({ pathname: '/onboarding/journey', params: { replay: '1' } })}
        />
        <SettingRow
          icon="swap-vertical-outline"
          label={
            levelRequest?.status === 'pending'
              ? `Level change pending (${AGE_TIERS.find((t) => t.id === levelRequest.to)?.label})`
              : 'Moved to a new class? Change level'
          }
          onPress={() => router.push('/onboarding/age-tier')}
        />
        <SettingRow
          icon="key-outline"
          label="I'm a teacher (access code needed)"
          onPress={() => router.push({ pathname: '/onboarding/profile', params: { role: 'teacher' } })}
        />
        <SettingRow icon="trash-outline" label="Delete my account" onPress={confirmDelete} />
      </Screen>
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  settingText: { flex: 1, fontWeight: '600', color: colors.text },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, ...shadow },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  nameInput: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.6)', paddingVertical: 2 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  levelBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 },
  levelNum: { color: '#fff', fontSize: 24, fontWeight: '900' },
  levelLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tierLine: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.lg, marginBottom: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, padding: spacing.sm, alignItems: 'center' },
  badgeLocked: { borderColor: 'transparent', opacity: 0.6 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  badgeTitle: { fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  certText: { color: colors.text, marginBottom: spacing.sm, lineHeight: 20 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  pTitle: { flex: 1, fontWeight: '600', color: colors.text },
  pScore: { fontWeight: '800' },
  empty: { color: colors.muted },
});
