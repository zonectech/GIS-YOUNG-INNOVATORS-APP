import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Button, Card, Field, Row } from '../../src/components/ui';
import { VoiceInputButton } from '../../src/components/VoiceInputButton';
import { WizardScreen } from '../../src/components/WizardScreen';
import { MIN_IDEAS } from '../../src/constants/content';
import { colors, spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { newId } from '../../src/lib/firebase';

export default function IdeaGeneratorScreen() {
  const { project, updateProject, ageTier } = useProject();
  const [draft, setDraft] = useState('');
  const ideas = project.ideas;

  const add = () => {
    if (!draft.trim()) return;
    updateProject({ ideas: [...ideas, { id: newId(), text: draft.trim(), ratings: {} }] });
    setDraft('');
  };

  const remove = (id: string) =>
    updateProject({
      ideas: ideas.filter((i) => i.id !== id),
      selectedIdea: project.selectedIdea?.id === id ? null : project.selectedIdea,
    });

  const remaining = Math.max(0, MIN_IDEAS - ideas.length);

  return (
    <WizardScreen
      step="idea-generator"
      subtitle={`Your first idea is not the only one. Log at least ${MIN_IDEAS} possible solutions.`}
      canNext={ideas.length >= MIN_IDEAS}
    >
      <Field
        label={`Idea #${ideas.length + 1}`}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        returnKeyType="done"
        placeholder="Describe a possible solution"
      />
      {ageTier === 'explorer' && <VoiceInputButton label="Say your idea" onText={setDraft} />}
      <Button title="Add idea" onPress={add} disabled={!draft.trim()} />

      <Text style={{ color: remaining ? colors.danger : colors.primary, marginVertical: spacing.sm }}>
        {remaining ? `${remaining} more idea(s) needed` : `Great! Challenge: can you add ${MIN_IDEAS} more?`}
      </Text>

      {ideas.map((idea, i) => (
        <Card key={idea.id}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ flex: 1 }}>
              {i + 1}. {idea.text}
            </Text>
            <Pressable onPress={() => remove(idea.id)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>Remove</Text>
            </Pressable>
          </Row>
        </Card>
      ))}
    </WizardScreen>
  );
}
