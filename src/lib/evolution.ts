import { CRITERIA, PROTOTYPE_LEVELS, SCAMPER_PROMPTS } from '../constants/content';
import type { InnovationPortfolio } from '../types';

export type EvoNode = {
  id: string;
  label: string;
  text: string;
  /** Rendered dimmed; Innovators can trace these when a prototype fails. */
  discarded?: boolean;
  chosen?: boolean;
  details: { label: string; value: string }[];
};

export type EvoStage = { id: string; title: string; nodes: EvoNode[] };

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export function buildEvolution(p: InnovationPortfolio): EvoStage[] {
  const stages: EvoStage[] = [];

  stages.push({
    id: 'problem',
    title: 'Raw problem',
    nodes: [
      {
        id: 'problem',
        label: p.origin ? `Adopted: ${p.origin.title}` : 'Problem',
        text: p.problem.statement || '—',
        details: [
          { label: 'Observed', value: p.problem.observation || '—' },
          { label: 'Category', value: p.problem.category ?? '—' },
          { label: 'Started', value: fmt(p.createdAt) },
        ],
      },
    ],
  });

  const whys = p.research.fiveWhys.filter((w) => w.trim());
  if (whys.length) {
    stages.push({
      id: 'root',
      title: '5 Whys root cause',
      nodes: [
        {
          id: 'root',
          label: `Root cause (${whys.length}/5 whys)`,
          text: whys[whys.length - 1],
          details: whys.map((w, i) => ({ label: `Why ${i + 1}`, value: w })),
        },
      ],
    });
  }

  const scamper = SCAMPER_PROMPTS.filter((s) => p.scamper[s.key]?.trim());
  if (scamper.length) {
    stages.push({
      id: 'scamper',
      title: 'SCAMPER branches',
      nodes: scamper.map((s) => ({
        id: `scamper-${s.key}`,
        label: s.word,
        text: p.scamper[s.key]!,
        details: [{ label: 'Prompt', value: s.question(p.problem.statement || 'the problem') }],
      })),
    });
  }

  if (p.ideas.length) {
    const max = CRITERIA.length * 5;
    stages.push({
      id: 'ideas',
      title: `Ideas (${p.ideas.length})`,
      nodes: p.ideas.map((idea) => {
        const ratings = Object.entries(idea.ratings);
        const score = ratings.reduce((s, [, v]) => s + (v ?? 0), 0);
        const chosen = p.selectedIdea?.id === idea.id;
        return {
          id: idea.id,
          label: chosen ? 'Chosen idea' : 'Idea',
          text: idea.text,
          chosen,
          discarded: !!p.selectedIdea && !chosen,
          details: [
            { label: 'Score', value: ratings.length ? `${score} / ${max}` : 'Not rated' },
            ...ratings.map(([k, v]) => ({ label: CRITERIA.find((c) => c.id === k)?.label ?? k, value: `${v}/5` })),
          ],
        };
      }),
    });
  }

  if (p.selectedIdea) {
    const build =
      p.hasMaterials === false
        ? { label: 'Design', text: p.design.content || `${p.design.attachments.length} photo(s)` }
        : {
            label: `Prototype L${p.prototype.level} · ${PROTOTYPE_LEVELS[p.prototype.level].name}`,
            text: p.prototype.notes[p.prototype.level] ?? p.prototype.notes[0] ?? '—',
          };
    stages.push({
      id: 'build',
      title: 'Chosen solution → build',
      nodes: [
        {
          id: 'build',
          label: build.label,
          text: build.text,
          chosen: true,
          details: [
            { label: 'Solution', value: p.selectedIdea.text },
            ...(p.substitutions.length ? [{ label: 'Substitutes used', value: p.substitutions.join(', ') }] : []),
          ],
        },
      ],
    });
  }

  if (p.iterations.length) {
    stages.push({
      id: 'tests',
      title: 'Test & iterate',
      nodes: p.iterations.map((it, i) => ({
        id: it.id,
        label: `Prototype ${i + 1} test`,
        text: it.result || it.hypothesis,
        details: [
          { label: 'Hypothesis', value: it.hypothesis || '—' },
          { label: 'Result', value: it.result || '—' },
          { label: 'What went wrong', value: it.wentWrong || '—' },
          { label: 'Learned', value: it.learnings || '—' },
          { label: 'Logged', value: fmt(it.createdAt) },
        ],
      })),
    });
  }

  if (p.status === 'completed') {
    stages.push({
      id: 'final',
      title: 'Final solution',
      nodes: [
        {
          id: 'final',
          label: 'Final',
          text: p.finalSolution?.idea || p.selectedIdea?.text || '—',
          chosen: true,
          details: [
            { label: 'Improved by', value: p.finalSolution?.improvements || '—' },
            { label: 'Completed', value: fmt(p.completedAt) },
          ],
        },
      ],
    });
  }

  return stages;
}
