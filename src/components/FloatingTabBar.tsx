import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, type AccentTheme } from '../constants/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabIcon = { name: string; icon: keyof typeof Ionicons.glyphMap; label: string };

type Props = TabBarProps & {
  tabs: TabIcon[];
  theme: AccentTheme;
  /** Route name rendered as the raised center action instead of a tab. */
  center?: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
};

export function FloatingTabBar({ state, navigation, tabs, theme, center }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          if (center && route.name === center.name) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={center.label}
                onPress={center.onPress}
                style={styles.centerWrap}
              >
                <View style={[styles.centerBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
                  <Ionicons name={center.icon} size={26} color="#fff" />
                </View>
                <Text style={[styles.centerLabel, { color: theme.accent }]}>{center.label.toUpperCase()}</Text>
              </Pressable>
            );
          }
          const tab = tabs.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? theme.accent : '#94A3B8';
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <View style={[styles.iconPill, focused && { backgroundColor: theme.soft }]}>
                <Ionicons name={tab.icon} size={22} color={color} />
              </View>
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconPill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14 },
  label: { fontSize: 10, fontWeight: '700' },
  centerWrap: { width: 72, alignItems: 'center', top: -18 },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  centerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
});
