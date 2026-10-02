import { useApp } from '../context/AppContext';

/** The engine layout guarantees a project exists before any step renders. */
export function useProject() {
  const { project, updateProject, profile } = useApp();
  return { project: project!, updateProject, ageTier: profile.ageTier ?? 'creator' };
}
