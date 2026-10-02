import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Chip, Field, Label, Row, Screen, Subtitle } from '../../src/components/ui';
import { CLASSROOM_STAGES } from '../../src/constants/content';
import { colors, spacing } from '../../src/constants/theme';
import { useApp, useGroupOutputs } from '../../src/context/AppContext';

const STAGES = ['Think Starter', ...CLASSROOM_STAGES.map((s) => s.stage)];

export default function GroupOutputEntryScreen() {
  const params = useLocalSearchParams<{ classId?: string; stage?: string }>();
  const { classes, addGroupOutput } = useApp();

  const [classId, setClassId] = useState(params.classId ?? classes[0]?.id);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [stage, setStage] = useState(
    STAGES.find((s) => params.stage?.startsWith(s)) ?? STAGES[0],
  );
  const [content, setContent] = useState('');

  const classroom = classes.find((c) => c.id === classId);
  const recent = useGroupOutputs(classId);

  const save = () => {
    const group = classroom?.groups.find((g) => g.id === groupId);
    if (!classId || !group) return;
    addGroupOutput(classId, { groupId: group.id, groupName: group.name, stage, content: content.trim() });
    setContent('');
  };

  if (!classes.length) {
    return (
      <Screen>
        <Subtitle>Create a class with groups on the Teacher Dashboard first.</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Class</Label>
      <Row style={{ marginBottom: spacing.md }}>
        {classes.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={c.id === classId}
            onPress={() => {
              setClassId(c.id);
              setGroupId(undefined);
            }}
          />
        ))}
      </Row>

      <Label>Group</Label>
      <Row style={{ marginBottom: spacing.md }}>
        {classroom?.groups.map((g) => (
          <Chip key={g.id} label={g.name} selected={g.id === groupId} onPress={() => setGroupId(g.id)} />
        ))}
      </Row>

      <Label>Stage</Label>
      <Row style={{ marginBottom: spacing.md }}>
        {STAGES.map((s) => (
          <Chip key={s} label={s} selected={s === stage} onPress={() => setStage(s)} />
        ))}
      </Row>

      <Field
        label="Group response / output"
        multiline
        value={content}
        onChangeText={setContent}
        placeholder="Write what the group said, drew or built"
      />
      <Button title="Save output" disabled={!groupId || !content.trim()} onPress={save} />

      <Text style={{ fontSize: 18, fontWeight: '700', marginVertical: spacing.sm }}>Recorded outputs</Text>
      {recent.map((o) => (
        <Card key={o.id}>
          <Text style={{ fontWeight: '700', color: colors.primary }}>
            {o.groupName} · {o.stage}
          </Text>
          <Text>{o.content}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(o.createdAt).toLocaleString()}</Text>
        </Card>
      ))}
      {!recent.length && <Subtitle>No outputs recorded for this class yet.</Subtitle>}
    </Screen>
  );
}
