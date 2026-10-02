import type { AgeTier } from '../types';

export type EngineStep =
  | 'think-starter'
  | 'problem-radar'
  | 'five-whys'
  | 'idea-generator'
  | 'scamper'
  | 'idea-selection'
  | 'material-check'
  | 'prototype-mode'
  | 'design-mode'
  | 'testing'
  | 'reflection';

export const STEP_TITLES: Record<EngineStep, string> = {
  'think-starter': 'Think Starter',
  'problem-radar': 'Problem Radar',
  'five-whys': '5 Whys',
  'idea-generator': 'Idea Generator',
  scamper: 'SCAMPER',
  'idea-selection': 'Idea Selection',
  'material-check': 'Materials Check',
  'prototype-mode': 'Prototype Mode',
  'design-mode': 'Design Mode',
  testing: 'Test & Iterate',
  reflection: 'Reflection',
};

const FULL_FLOW: EngineStep[] = [
  'think-starter',
  'problem-radar',
  'five-whys',
  'idea-generator',
  'scamper',
  'idea-selection',
  'material-check',
  'prototype-mode', // or design-mode, resolved by hasMaterials
  'testing',
  'reflection',
];

// Explorers (Primary) follow a simpler Notice → Imagine → Make → Try flow.
const SKIPPED_BY_TIER: Record<AgeTier, EngineStep[]> = {
  explorer: ['five-whys', 'scamper'],
  creator: [],
  innovator: [],
};

export function getFlow(tier: AgeTier | null, hasMaterials?: boolean | null): EngineStep[] {
  const skipped = tier ? SKIPPED_BY_TIER[tier] : [];
  return FULL_FLOW.filter((s) => !skipped.includes(s)).map((s) =>
    s === 'prototype-mode' && hasMaterials === false ? 'design-mode' : s,
  );
}

export function getAdjacentStep(
  current: EngineStep,
  direction: 1 | -1,
  tier: AgeTier | null,
  hasMaterials?: boolean | null,
): EngineStep | null {
  const flow = getFlow(tier, hasMaterials);
  const normalized =
    current === 'design-mode' || current === 'prototype-mode'
      ? flow.find((s) => s === 'design-mode' || s === 'prototype-mode')!
      : current;
  const idx = flow.indexOf(normalized);
  return flow[idx + direction] ?? null;
}

export const stepHref = (step: EngineStep) => `/engine/${step}` as const;
