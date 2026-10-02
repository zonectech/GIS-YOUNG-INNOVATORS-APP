import { useState, type ReactNode } from 'react';
import { Alert, Image, Text, View } from 'react-native';

import { DESIGN_FORMATS, PROTOTYPE_LEVELS, SCAMPER_PROMPTS } from '../constants/content';
import { colors, spacing } from '../constants/theme';
import { attachmentSource } from '../lib/attachments';
import { exportPortfolioPdf } from '../lib/portfolioPdf';
import type { InnovationPortfolio } from '../types';
import { Button, Card } from './ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Text style={{ fontWeight: '700', color: colors.primary, marginTop: spacing.md, marginBottom: spacing.xs }}>
        {title}
      </Text>
      {children}
    </>
  );
}

const Line = ({ children }: { children: ReactNode }) => <Text style={{ marginBottom: 2, lineHeight: 20 }}>{children}</Text>;

/** Full read-only portfolio document; used by students and by teachers/school admins reviewing their work. */
export function PortfolioView({ p, collapsed = false }: { p: InnovationPortfolio; collapsed?: boolean }) {
  const selected = p.selectedIdea?.text;
  const fiveWhys = p.research.fiveWhys.filter(Boolean);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(!collapsed);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportPortfolioPdf(p);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not create the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{p.problem.statement || 'Untitled project'}</Text>
      <Text style={{ color: colors.muted }}>
        {p.completedAt ? `Completed ${new Date(p.completedAt).toLocaleDateString()}` : 'In progress'}
      </Text>

      {!open ? (
        <Button title="View full portfolio" variant="secondary" onPress={() => setOpen(true)} style={{ marginTop: spacing.sm }} />
      ) : (
        <>
          <Section title="1. Problem">
            <Line>{p.problem.observation || '—'}</Line>
          </Section>

          <Section title="2. Research (5 Whys)">
            {fiveWhys.length ? fiveWhys.map((w, i) => <Line key={i}>Why {i + 1}: {w}</Line>) : <Line>—</Line>}
          </Section>

          <Section title={`3. Ideas generated (${p.ideas.length})`}>
            {p.ideas.map((idea, i) => (
              <Line key={idea.id}>
                {i + 1}. {idea.text}
              </Line>
            ))}
          </Section>

          <Section title="4. SCAMPER journey">
            {SCAMPER_PROMPTS.filter((s) => p.scamper[s.key]).map((s) => (
              <Line key={s.key}>
                {s.word}: {p.scamper[s.key]}
              </Line>
            ))}
            {!Object.values(p.scamper).some(Boolean) && <Line>—</Line>}
          </Section>

          <Section title="5. Selected idea">
            <Line>{selected ?? '—'}</Line>
          </Section>

          <Section title={p.hasMaterials === false ? '6. Design' : '6. Prototype'}>
            {p.hasMaterials === false ? (
              <>
                <Line>
                  {DESIGN_FORMATS.find((f) => f.id === p.design.format)?.label}: {p.design.content}
                </Line>
                {p.design.attachments.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                    {p.design.attachments.map((a) => {
                      const src = attachmentSource(a);
                      return src ? (
                        <Image key={a.id} source={{ uri: src }} style={{ width: 96, height: 96, borderRadius: 6 }} />
                      ) : null;
                    })}
                  </View>
                )}
              </>
            ) : (
              PROTOTYPE_LEVELS.filter((l) => p.prototype.notes[l.level]).map((l) => (
                <Line key={l.level}>
                  L{l.level} {l.name}: {p.prototype.notes[l.level]}
                </Line>
              ))
            )}
          </Section>

          <Section title="7. Testing, failures & lessons">
            {p.iterations.map((it, i) => (
              <Line key={it.id}>
                Prototype {i + 1}: {it.result}
                {it.wentWrong ? ` — went wrong: ${it.wentWrong}` : ''}
                {it.learnings ? ` — learned: ${it.learnings}` : ''}
              </Line>
            ))}
            {!p.iterations.length && <Line>—</Line>}
          </Section>

          <Section title="8. Reflection">
            <Line>Discovered: {p.reflection.discovered || '—'}</Line>
            <Line>Surprised by: {p.reflection.surprised || '—'}</Line>
            <Line>Would change: {p.reflection.wouldChange || '—'}</Line>
            <Line>Next: {p.reflection.tryNext || '—'}</Line>
          </Section>

          <Section title="9. Final solution">
            <Line>
              {p.finalSolution?.idea || selected || '—'}
              {p.finalSolution?.improvements ? `, improved by: ${p.finalSolution.improvements}` : ''}
            </Line>
          </Section>

          <Button
            title={exporting ? 'Creating PDF…' : 'Export as PDF'}
            variant="secondary"
            disabled={exporting}
            onPress={onExport}
            style={{ marginTop: spacing.md }}
          />
        </>
      )}
    </Card>
  );
}
