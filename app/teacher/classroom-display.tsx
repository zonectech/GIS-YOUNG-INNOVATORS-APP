import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CLASSROOM_STAGES } from '../../src/constants/content';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

export default function ClassroomModeDisplayScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const { classes, challenges } = useApp();
  const classroom = classes.find((c) => c.id === classId);
  const { width } = useWindowDimensions();

  const warmUp = challenges[0];
  const slides = [{ stage: `Think Starter · ${warmUp.title}`, prompt: warmUp.prompt }, ...CLASSROOM_STAGES];
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const fontSize = Math.max(28, Math.min(56, width / 18));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.meta}>{classroom?.name ?? 'Classroom Mode'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.meta}>Exit ✕</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.stage}>{slide.stage}</Text>
        <Text style={[styles.prompt, { fontSize, lineHeight: fontSize * 1.25 }]}>{slide.prompt}</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.nav, index === 0 && { opacity: 0.3 }]}
          disabled={index === 0}
          onPress={() => setIndex(index - 1)}
        >
          <Text style={styles.navText}>◀ Back</Text>
        </Pressable>
        <Text style={styles.meta}>
          {index + 1} / {slides.length}
        </Text>
        {classroom?.groups.length ? (
          <Pressable
            style={[styles.nav, { backgroundColor: colors.accent }]}
            onPress={() =>
              router.push({ pathname: '/teacher/group-output', params: { classId, stage: slide.stage } })
            }
          >
            <Text style={styles.navText}>Record outputs</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.nav, index === slides.length - 1 && { opacity: 0.3 }]}
          disabled={index === slides.length - 1}
          onPress={() => setIndex(index + 1)}
        >
          <Text style={styles.navText}>Next ▶</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary, padding: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: '#fff', fontSize: 18, opacity: 0.85 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  stage: { color: colors.accent, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center' },
  prompt: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  nav: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  navText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
