import { useRef } from 'react';

import { DesignPhotos } from '../../src/components/DesignPhotos';
import { Chip, Field, Label, Row } from '../../src/components/ui';
import { WizardScreen } from '../../src/components/WizardScreen';
import { DESIGN_FORMATS } from '../../src/constants/content';
import { spacing } from '../../src/constants/theme';
import { useProject } from '../../src/hooks/useProject';
import { deleteAttachmentFiles } from '../../src/lib/attachments';

export default function DesignModeScreen() {
  const { project, updateProject } = useProject();
  const { design } = project;
  const format = DESIGN_FORMATS.find((f) => f.id === design.format);
  // Photo callbacks resolve after the picker closes, so read the latest design, not the one from that render.
  const designRef = useRef(design);
  designRef.current = design;

  return (
    <WizardScreen
      step="design-mode"
      subtitle="No materials? No problem. Show how your solution would work."
      canNext={!!design.format && (design.content.trim().length > 0 || design.attachments.length > 0)}
    >
      <Label>Choose a design format</Label>
      <Row style={{ marginBottom: spacing.md }}>
        {DESIGN_FORMATS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={design.format === f.id}
            onPress={() => updateProject({ design: { ...design, format: f.id } })}
          />
        ))}
      </Row>
      {format && (
        <>
          <Field
            label={format.label}
            multiline
            style={{ minHeight: 200 }}
            value={design.content}
            onChangeText={(content) => updateProject({ design: { ...design, content } })}
            placeholder={format.hint}
          />
          <DesignPhotos
            projectId={project.id}
            attachments={design.attachments}
            onAdd={(a) => {
              const d = designRef.current;
              updateProject({ design: { ...d, attachments: [...d.attachments, a] } });
            }}
            onRemove={(a) => {
              const d = designRef.current;
              deleteAttachmentFiles(a);
              updateProject({ design: { ...d, attachments: d.attachments.filter((x) => x.id !== a.id) } });
            }}
          />
        </>
      )}
    </WizardScreen>
  );
}
