import { router } from 'expo-router';
import { Text } from 'react-native';

import { Button, Card, Subtitle } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { stepHref } from '../../src/constants/engine';
import { colors } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';

export default function MaterialCheckScreen() {
  const { project, updateProject } = useProject();
  const idea = project.selectedIdea?.text;

  const choose = (hasMaterials: boolean) => {
    const next = hasMaterials ? 'prototype-mode' : 'design-mode';
    updateProject({ hasMaterials, currentStep: next });
    router.push(stepHref(next));
  };

  return (
    <WizardScreen step="material-check" subtitle="Lack of materials never means lack of innovation." hideNext>
      <Card style={{ backgroundColor: colors.primaryLight }}>
        <Text style={{ fontWeight: '700' }}>Your selected idea</Text>
        <Text>{idea ?? '—'}</Text>
      </Card>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
        Do you have the physical materials to build it?
      </Text>

      <Button title="Yes — let's build a prototype" onPress={() => choose(true)} />
      <Subtitle>Work through prototype levels 0–5. You can ask for material substitutes.</Subtitle>

      <Button title="No — I'll design it instead" variant="secondary" onPress={() => choose(false)} />
      <Subtitle>Use sketches, storyboards, diagrams or written explanations.</Subtitle>
    </WizardScreen>
  );
}
