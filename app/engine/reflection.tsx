import { router } from 'expo-router';

import { Field } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { useApp } from '../../src/context/AppContext';
import { useProject } from '../../src/hooks/useProject';
import type { InnovationPortfolio } from '../../src/types';

const PROMPTS: { key: keyof InnovationPortfolio['reflection']; label: string }[] = [
  { key: 'discovered', label: 'What did you discover?' },
  { key: 'surprised', label: 'What surprised you?' },
  { key: 'didNotWork', label: 'What did not work?' },
  { key: 'wouldChange', label: 'What would you change?' },
  { key: 'tryNext', label: 'What would you try next?' },
];

export default function ReflectionScreen() {
  const { project, updateProject } = useProject();
  const { completeProject } = useApp();
  const { reflection } = project;

  const finish = () => {
    completeProject();
    router.dismissTo('/student/portfolio');
  };

  return (
    <WizardScreen
      step="reflection"
      subtitle="Look back on your innovation journey."
      canNext={PROMPTS.filter((p) => reflection[p.key].trim()).length >= 3}
      nextLabel="Finish & add to portfolio"
      onNext={finish}
    >
      {PROMPTS.map((p) => (
        <Field
          key={p.key}
          label={p.label}
          multiline
          value={reflection[p.key]}
          onChangeText={(v) => updateProject({ reflection: { ...reflection, [p.key]: v } })}
        />
      ))}
    </WizardScreen>
  );
}
