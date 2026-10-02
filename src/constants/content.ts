import type { AgeTier, Challenge, Criterion, DesignFormat, PrototypeLevel, ScamperKey } from '../types';

export const AGE_TIERS: { id: AgeTier; label: string; level: string; description: string; steps: string[] }[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    level: 'Primary',
    description: 'Curiosity, observation, imagination and simple making.',
    steps: ['Notice', 'Ask', 'Imagine', 'Draw', 'Make', 'Try', 'Change', 'Share'],
  },
  {
    id: 'creator',
    label: 'Creator',
    level: 'Junior Secondary',
    description: 'Find root causes, generate many ideas and build working prototypes.',
    steps: ['Observe', 'Identify', 'Why', 'Ideate', 'SCAMPER', 'Prototype', 'Test', 'Improve'],
  },
  {
    id: 'innovator',
    label: 'Innovator',
    level: 'Senior Secondary',
    description: 'Research, validate and design for real-world impact.',
    steps: ['Research', 'Root cause', 'Feasibility', 'Validation', 'Impact', 'Advanced prototyping'],
  },
];

// Bundled so Think Starters work without ever being online.
export const BUNDLED_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    type: 'spot-the-problem',
    title: 'Spot the problem',
    prompt: 'Look around your classroom. What is one thing that wastes time, water or energy?',
  },
  {
    id: 'c2',
    type: 'what-if',
    title: 'What if…?',
    prompt: 'What if school bags could carry themselves? What would that change?',
  },
  {
    id: 'c3',
    type: 'odd-one-out',
    title: 'Odd one out',
    prompt: 'Which is the odd one out, and why? Is there more than one right answer?',
    options: ['Bottle', 'Bucket', 'Basket', 'Pipe'],
  },
  {
    id: 'c4',
    type: '30-second',
    title: '30-second challenge',
    prompt: 'In 30 seconds, list as many uses for a maize cob as you can.',
  },
  {
    id: 'c5',
    type: 'quick-observation',
    title: 'Quick observation',
    prompt: 'Describe exactly what happens at the school gate in the morning.',
  },
  {
    id: 'c6',
    type: 'rapid-ideas',
    title: 'Rapid idea generation',
    prompt: 'Give 5 ways to keep drinking water cool without electricity.',
  },
  {
    id: 'c7',
    type: 'mini-scamper',
    title: 'Mini-SCAMPER',
    prompt: 'Take a plastic bottle. Combine it with something else to make a new tool.',
  },
];

export const SCAMPER_PROMPTS: { key: ScamperKey; word: string; question: (problem: string) => string }[] = [
  { key: 'S', word: 'Substitute', question: (p) => `What material, part or person could you swap out to solve "${p}"?` },
  { key: 'C', word: 'Combine', question: (p) => `What two ideas or objects could be combined to tackle "${p}"?` },
  { key: 'A', word: 'Adapt', question: (p) => `What existing solution elsewhere could be adapted for "${p}"?` },
  { key: 'M', word: 'Modify', question: (p) => `What could be made bigger, smaller or stronger to address "${p}"?` },
  { key: 'P', word: 'Put to another use', question: (p) => `What could be reused in a new way to help with "${p}"?` },
  { key: 'E', word: 'Eliminate', question: (p) => `What step or part could be removed to simplify "${p}"?` },
  { key: 'R', word: 'Reverse / Rearrange', question: (p) => `What if you did the opposite or changed the order in "${p}"?` },
];

export const CRITERIA: { id: Criterion; label: string }[] = [
  { id: 'relevance', label: 'Problem relevance' },
  { id: 'usefulness', label: 'Usefulness' },
  { id: 'feasibility', label: 'Feasibility' },
  { id: 'resources', label: 'Available resources' },
  { id: 'cost', label: 'Low cost' },
  { id: 'impact', label: 'Potential impact' },
  { id: 'originality', label: 'Originality' },
];

export const CRITERIA_BY_TIER: Record<AgeTier, Criterion[]> = {
  explorer: ['relevance', 'usefulness', 'feasibility'],
  creator: ['relevance', 'usefulness', 'feasibility', 'resources', 'cost', 'impact'],
  innovator: CRITERIA.map((c) => c.id),
};

export const PROTOTYPE_LEVELS: { level: PrototypeLevel; name: string; hint: string }[] = [
  { level: 0, name: 'Concept', hint: 'Explain how it works.' },
  { level: 1, name: 'Sketch', hint: 'Draw it and label the parts.' },
  { level: 2, name: 'Model', hint: 'Build it from paper, cardboard or recycled material.' },
  { level: 3, name: 'Functional', hint: 'Make a version that actually works.' },
  { level: 4, name: 'Tested', hint: 'Test it with users or in real conditions.' },
  { level: 5, name: 'Improved', hint: 'Improve it using your test results.' },
];

export const DESIGN_FORMATS: { id: DesignFormat; label: string; hint: string }[] = [
  { id: 'mock-up', label: 'Digital mock-up', hint: 'Describe each screen or view of your design.' },
  { id: 'storyboard', label: 'Storyboard', hint: 'Frame 1, Frame 2, … show a person using it.' },
  { id: 'process-diagram', label: 'Process diagram', hint: 'Step 1 → Step 2 → … how it works.' },
  { id: 'explanation', label: 'Written explanation', hint: 'Explain in detail how the prototype would work.' },
];

export const DEFAULT_RESOURCES = [
  'Cardboard',
  'Bottles',
  'Paper',
  'Soil',
  'Maize cobs',
  'Sawdust',
  'String',
  'Basic stationery',
];

export const MIN_IDEAS = 5;

// Teacher-led mode: one prompt per Innovation Engine stage, read/displayed to the whole class.
export const CLASSROOM_STAGES: { stage: string; prompt: string }[] = [
  { stage: 'Problem Radar', prompt: 'What problem do you notice at school or in your community?' },
  { stage: '5 Whys', prompt: 'Why does this problem happen? Ask "Why?" five times.' },
  { stage: 'Idea Generator', prompt: 'List at least 5 different ways to solve the problem.' },
  { stage: 'SCAMPER', prompt: 'Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse.' },
  { stage: 'Idea Selection', prompt: 'Which idea is most useful, feasible, low-cost and impactful? Choose one.' },
  { stage: 'Prototype / Design', prompt: 'Build it with available materials — or draw, storyboard or explain it.' },
  { stage: 'Test & Iterate', prompt: 'What did you expect? What happened? What went wrong? What did you learn?' },
  { stage: 'Reflection', prompt: 'What surprised you? What would you change? What would you try next?' },
];

// Substitution is driven by what a material *does*, not what it is.
export const MATERIAL_FUNCTIONS: { id: string; label: string; alternatives: string[] }[] = [
  { id: 'carry-water', label: 'Carry / channel water', alternatives: ['Bottles', 'Bamboo', 'Rolled plastic sheet', 'Cardboard tube lined with plastic'] },
  { id: 'hold', label: 'Hold / contain things', alternatives: ['Bottles', 'Cardboard', 'Tins', 'Woven basket'] },
  { id: 'support', label: 'Support weight / frame', alternatives: ['Sticks', 'Cardboard', 'Maize cobs', 'Rolled paper'] },
  { id: 'join', label: 'Join parts together', alternatives: ['String', 'Basic stationery', 'Wire', 'Clay / soil paste'] },
  { id: 'insulate', label: 'Insulate / keep cool or warm', alternatives: ['Sawdust', 'Soil', 'Cloth', 'Dry grass'] },
  { id: 'cover', label: 'Cover / protect', alternatives: ['Paper', 'Plastic bags', 'Cardboard', 'Leaves'] },
  { id: 'move', label: 'Roll / move', alternatives: ['Bottle caps', 'Maize cobs', 'Round sticks', 'Tins'] },
];
