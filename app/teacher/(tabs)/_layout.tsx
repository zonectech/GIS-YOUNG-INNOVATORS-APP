import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabIcon } from '../../../src/components/FloatingTabBar';
import { DEFAULT_ACCENT } from '../../../src/constants/theme';

const TABS: TabIcon[] = [
  { name: 'dashboard', icon: 'people-outline', label: 'Classes' },
  { name: 'classroom', icon: 'easel-outline', label: 'Classroom' },
  { name: 'resource-bank', icon: 'cube-outline', label: 'Resources' },
  { name: 'review', icon: 'shield-checkmark-outline', label: 'Showcase' },
];

export default function TeacherTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} tabs={TABS} theme={DEFAULT_ACCENT} />}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="classroom" />
      <Tabs.Screen name="resource-bank" />
      <Tabs.Screen name="review" />
    </Tabs>
  );
}
