import { DEFAULT_ACCENT, TIER_THEMES, type AccentTheme } from '../constants/theme';
import { useApp } from '../context/AppContext';

export function useTierTheme(): AccentTheme {
  const tier = useApp().profile.ageTier;
  return tier ? TIER_THEMES[tier] : DEFAULT_ACCENT;
}
