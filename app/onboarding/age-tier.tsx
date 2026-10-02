import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AGE_TIERS } from '../../src/constants/content';
import { colors, radius, spacing, TIER_THEMES } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

type Tier = (typeof AGE_TIERS)[number];

const CARD_GAP = spacing.md;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 28;

export default function AgeTierSelectionScreen() {
  const router = useRouter();
  const { profile, setAgeTier, requestLevelChange, levelRequest } = useApp();
  const changing = !!profile.ageTier;
  const { width } = useWindowDimensions();

  const cardWidth = Math.min(width * 0.8, 420);
  const itemWidth = cardWidth + CARD_GAP;
  const sideInset = (width - itemWidth) / 2;

  const initialIndex = Math.max(0, AGE_TIERS.findIndex((t) => t.id === profile.ageTier));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeRef = useRef(initialIndex);
  const listRef = useRef<FlatList<Tier>>(null);
  // JS driver: the pagination dot width and CTA background color can't be animated natively.
  const scrollX = useRef(new Animated.Value(initialIndex * itemWidth)).current;

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.min(AGE_TIERS.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / itemWidth)));
      if (i !== activeRef.current) {
        activeRef.current = i;
        setActiveIndex(i);
      }
    },
  });

  const inputRange = AGE_TIERS.map((_, i) => i * itemWidth);
  const ctaColor = scrollX.interpolate({
    inputRange,
    outputRange: AGE_TIERS.map((t) => TIER_THEMES[t.id].accent),
    extrapolate: 'clamp',
  });

  const active = AGE_TIERS[activeIndex];
  const pendingTo = levelRequest?.status === 'pending' ? levelRequest.to : null;

  const onContinue = async () => {
    if (!changing) {
      setAgeTier(active.id);
      router.replace('/onboarding/journey');
      return;
    }
    if (active.id === profile.ageTier) return router.back();
    try {
      await requestLevelChange(active.id);
      Alert.alert('Request sent', `Your teacher will approve your move to ${active.label}. Your level changes once they do.`);
      router.back();
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const ctaLabel = !changing
    ? `Continue as ${active.label}`
    : active.id === profile.ageTier
      ? 'Keep my current level'
      : pendingTo === active.id
        ? 'Request pending: tap to resend'
        : `Ask teacher to move me to ${active.label}`;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Tier>) => {
      const theme = TIER_THEMES[item.id];
      const range = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
      const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' });
      const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });
      const isCurrent = profile.ageTier === item.id;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.label}, ${item.level}`}
          onPress={() => listRef.current?.scrollToIndex({ index, animated: true })}
        >
          <Animated.View
            style={[
              styles.card,
              { width: cardWidth, marginHorizontal: CARD_GAP / 2, opacity, transform: [{ scale }] },
              { borderTopColor: theme.accent },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: theme.soft }]}>
                <Text style={[styles.badgeText, { color: theme.accent }]}>{item.level}</Text>
              </View>
              {isCurrent && <Text style={[styles.currentTag, { color: theme.accent }]}>Current level</Text>}
            </View>

            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>

            <Text style={styles.stepsLabel}>Your innovation journey</Text>
            <View style={styles.chips}>
              {item.steps.map((step, i) => (
                <View key={step} style={[styles.chip, { borderColor: theme.accent, backgroundColor: theme.soft }]}>
                  <Text style={[styles.chipIndex, { color: theme.accent }]}>{i + 1}</Text>
                  <Text style={styles.chipText}>{step}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      );
    },
    [cardWidth, itemWidth, scrollX, profile.ageTier],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.intro}>
        {changing
          ? 'Moved to a new class? Choose your new level. Your teacher approves the change, and finished projects keep their level.'
          : 'Swipe to explore. Your level changes how many steps you see and how deep each goes.'}
      </Text>

      <Animated.FlatList
        ref={listRef}
        data={AGE_TIERS}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sideInset, paddingVertical: spacing.md }}
        getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        initialScrollIndex={initialIndex}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.list}
      />

      <View style={styles.pagination}>
        {AGE_TIERS.map((t, i) => {
          const range = [(i - 1) * itemWidth, i * itemWidth, (i + 1) * itemWidth];
          const dotWidth = scrollX.interpolate({
            inputRange: range,
            outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH, DOT_SIZE],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({ inputRange: range, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={t.id}
              style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: TIER_THEMES[t.id].accent }]}
            />
          );
        })}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable accessibilityRole="button" onPress={onContinue}>
          {({ pressed }) => (
            <Animated.View style={[styles.cta, { backgroundColor: ctaColor, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Animated.View>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  intro: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: { flexGrow: 0 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopWidth: 6,
    padding: spacing.lg,
    minHeight: 380,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  currentTag: { fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  cardDescription: { fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: spacing.xs },
  stepsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipIndex: { fontSize: 12, fontWeight: '800' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  dot: { height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
  bottomBar: {
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cta: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
