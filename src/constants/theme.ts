export const colors = {
  primary: '#1B6B4A',
  primaryLight: '#E3F2EB',
  accent: '#F2A93B',
  danger: '#C0392B',
  text: '#1C2B24',
  muted: '#5E6E66',
  border: '#D5DED9',
  background: '#F7FAF8',
  surface: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 6, md: 12, lg: 20 };

export type AccentTheme = { accent: string; soft: string };

export const DEFAULT_ACCENT: AccentTheme = { accent: colors.primary, soft: colors.primaryLight };

export const TIER_THEMES: Record<'explorer' | 'creator' | 'innovator', AccentTheme> = {
  explorer: { accent: '#0D9488', soft: '#CCFBF1' },
  creator: { accent: '#16A34A', soft: '#DCFCE7' },
  innovator: { accent: '#4F46E5', soft: '#E0E7FF' },
};

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
