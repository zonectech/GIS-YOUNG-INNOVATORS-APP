import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, DEFAULT_ACCENT, radius, shadow, spacing, type AccentTheme } from '../constants/theme';

const AccentContext = createContext<AccentTheme>(DEFAULT_ACCENT);

/** Re-colors every primitive below it (buttons, chips, ratings, inputs) to an age-tier theme. */
export const AccentProvider = AccentContext.Provider;

export const useAccent = () => useContext(AccentContext);

export function Screen({
  children,
  scroll = true,
  tabScreen = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Headerless screen inside the floating tab bar: pads the top safe area and leaves room for the bar. */
  tabScreen?: boolean;
}) {
  const edges = tabScreen ? (['top', 'left', 'right'] as const) : (['bottom', 'left', 'right'] as const);
  const pad = tabScreen ? { paddingBottom: 120 } : null;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, pad]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, pad, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const Title = ({ children }: { children: ReactNode }) => <Text style={styles.title}>{children}</Text>;

export const Subtitle = ({ children }: { children: ReactNode }) => (
  <Text style={styles.subtitle}>{children}</Text>
);

export const Label = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const { accent, soft } = useAccent();
  const bg =
    variant === 'primary' ? accent : variant === 'secondary' ? soft : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.btnGhost,
        disabled && styles.btnDisabled,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  containerStyle,
  ...props
}: TextInputProps & { label?: string; containerStyle?: ViewStyle }) {
  const { accent } = useAccent();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && { borderColor: accent, borderWidth: 2, padding: 11 },
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { accent, soft } = useAccent();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: accent }, selected ? { backgroundColor: accent } : { backgroundColor: soft }]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : accent }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/** Large selectable card for single-choice questions. */
export function SelectTile({
  title,
  description,
  marker,
  selected,
  onPress,
  style,
}: {
  title: string;
  description?: string;
  marker?: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { accent, soft } = useAccent();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && { borderColor: accent, backgroundColor: soft },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {marker ? (
        <View style={[styles.tileMarker, { backgroundColor: selected ? accent : soft }]}>
          <Text style={[styles.tileMarkerText, { color: selected ? '#fff' : accent }]}>{marker}</Text>
        </View>
      ) : null}
      <Text style={[styles.tileTitle, selected && { color: accent }]}>{title}</Text>
      {description ? <Text style={styles.tileDescription}>{description}</Text> : null}
    </Pressable>
  );
}

/** 1–5 rating selector; used in place of a slider so it works identically on all platforms. */
export function Rating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const { accent } = useAccent();
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== undefined && n <= value;
        return (
          <Pressable
            key={n}
            accessibilityLabel={`Rate ${n}`}
            onPress={() => onChange(n)}
            style={[styles.ratingDot, { borderColor: accent }, on && { backgroundColor: accent }]}
          >
            <Text style={[styles.chipText, { color: on ? '#fff' : accent }]}>{n}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.md, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontWeight: '600' },
  ratingDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    ...shadow,
  },
  tileMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileMarkerText: { fontWeight: '800', fontSize: 15 },
  tileTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  tileDescription: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
