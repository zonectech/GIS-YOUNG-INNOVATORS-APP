import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabIcon } from '../../../src/components/FloatingTabBar';
import { DEFAULT_ACCENT } from '../../../src/constants/theme';

const TABS: TabIcon[] = [
  { name: 'overview', icon: 'business-outline', label: 'School' },
  { name: 'students', icon: 'people-outline', label: 'Students' },
  { name: 'staff', icon: 'key-outline', label: 'Teachers' },
];

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} tabs={TABS} theme={DEFAULT_ACCENT} />}
    >
      <Tabs.Screen name="overview" />
      <Tabs.Screen name="students" />
      <Tabs.Screen name="staff" />
    </Tabs>
  );
}
