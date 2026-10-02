import { useState } from 'react';
import { Modal, Text, View } from 'react-native';

import { MATERIAL_FUNCTIONS } from '../constants/content';
import { colors, radius, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Button, Card, Chip, Field, Label, Row, Subtitle, Title } from './ui';

type Props = { visible: boolean; onClose: () => void; onUse?: (material: string) => void; used?: string[] };

export function MaterialSubstitutionModal({ visible, onClose, onUse, used = [] }: Props) {
  const { resources, profile } = useApp();
  const [material, setMaterial] = useState('');
  const [fn, setFn] = useState<string | null>(null);
  const hasSchoolBank = profile.role === 'teacher' || !!profile.school;
  const availableLabel = hasSchoolBank ? '(in school resource bank)' : '(commonly found at schools)';

  const available = new Set(resources.map((r) => r.name.toLowerCase()));
  const selected = MATERIAL_FUNCTIONS.find((f) => f.id === fn);
  const suggestions = selected
    ? [...selected.alternatives].sort(
        (a, b) => Number(available.has(b.toLowerCase())) - Number(available.has(a.toLowerCase())),
      )
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <View
          style={{
            backgroundColor: colors.background,
            padding: spacing.md,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: '90%',
          }}
        >
          <Title>Material Substitution</Title>
          <Subtitle>Think about what the material does, then find a safe, available alternative.</Subtitle>
          <Field label="Material you need" value={material} onChangeText={setMaterial} placeholder="e.g. PVC pipe" />
          <Label>What job does it do in your prototype?</Label>
          <Row style={{ marginBottom: spacing.md }}>
            {MATERIAL_FUNCTIONS.map((f) => (
              <Chip key={f.id} label={f.label} selected={fn === f.id} onPress={() => setFn(f.id)} />
            ))}
          </Row>
          {selected && (
            <Card>
              <Text style={{ fontWeight: '700', marginBottom: spacing.xs }}>
                Try instead of {material.trim() || 'it'}:
              </Text>
              {suggestions.map((s) => (
                <Row key={s} style={{ justifyContent: 'space-between', flexWrap: 'nowrap', marginBottom: 4 }}>
                  <Text style={{ flex: 1 }}>
                    • {s}
                    {available.has(s.toLowerCase()) ? (
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>  {availableLabel}</Text>
                    ) : null}
                  </Text>
                  {onUse && (
                    <Chip label={used.includes(s) ? 'Using ✓' : 'Use this'} selected={used.includes(s)} onPress={() => onUse(s)} />
                  )}
                </Row>
              ))}
              <Text style={{ color: colors.muted, marginTop: spacing.sm }}>
                Always check with your teacher that a substitute is safe to use.
              </Text>
            </Card>
          )}
          <Button title="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
