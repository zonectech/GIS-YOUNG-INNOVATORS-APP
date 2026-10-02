import { Redirect } from 'expo-router';

import { useApp } from '../src/context/AppContext';

export default function Index() {
  const { role, ageTier, displayName, lastInitial, teacherCode } = useApp().profile;

  if (role === 'school-admin' && displayName && teacherCode) return <Redirect href="/admin/overview" />;
  if (role === 'teacher' && displayName && teacherCode) return <Redirect href="/teacher/dashboard" />;
  if (role === 'teacher' || role === 'school-admin') return <Redirect href="/onboarding/profile?role=teacher" />;
  if (role === 'student' && (!displayName || !lastInitial)) return <Redirect href="/onboarding/profile?role=student" />;
  if (role === 'student' && ageTier) return <Redirect href="/dashboard" />;
  if (role === 'student') return <Redirect href="/onboarding/age-tier" />;
  return <Redirect href="/onboarding/role-selection" />;
}
