import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabIcon } from '../../src/components/FloatingTabBar';
import { useMentor } from '../../src/context/MentorContext';
import { useTierTheme } from '../../src/hooks/useTierTheme';

const TABS: TabIcon[] = [
  { name: 'dashboard', icon: 'grid-outline', label: 'Home' },
  { name: 'projects', icon: 'rocket-outline', label: 'Engine' },
  { name: 'showcase', icon: 'compass-outline', label: 'Showcase' },
  { name: 'passport', icon: 'trophy-outline', label: 'Passport' },
];

export default function StudentTabsLayout() {
  const theme = useTierTheme();
  const { openMentor } = useMentor();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          tabs={TABS}
          theme={theme}
          center={{ name: 'mentor', label: 'AI Mentor', icon: 'sparkles', onPress: () => openMentor(null) }}
        />
      )}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="mentor" />
      <Tabs.Screen name="showcase" />
      <Tabs.Screen name="passport" />
    </Tabs>
  );
}
