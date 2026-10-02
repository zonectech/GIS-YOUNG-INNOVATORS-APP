import { STEP_TITLES, type EngineStep } from '../constants/engine';
import { MATERIAL_FUNCTIONS, SCAMPER_PROMPTS } from '../constants/content';
import type { AgeTier, InnovationPortfolio, Resource } from '../types';
import { askGemini, type ChatTurn } from './ai';

export type MentorContextInfo = {
  step: EngineStep | null;
  project: InnovationPortfolio | null;
  tier: AgeTier | null;
  resources: Resource[];
};

export type MentorAction = { id: string; label: string; icon: string };

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const problemOf = (c: MentorContextInfo) => c.project?.problem.statement.trim() || 'your problem';
const simple = (c: MentorContextInfo) => c.tier === 'explorer';

const ACTIONS: Record<EngineStep | 'general', MentorAction[]> = {
  general: [
    { id: 'where-start', label: 'Where should I start?', icon: 'navigate-outline' },
    { id: 'find-problem', label: 'Help me find a problem', icon: 'search-outline' },
    { id: 'local-materials', label: 'What materials can I use?', icon: 'construct-outline' },
  ],
  'think-starter': [
    { id: 'warmup-hint', label: 'Give me a hint for this warm-up', icon: 'bulb-outline' },
    { id: 'think-more', label: 'How do I think of more answers?', icon: 'flash-outline' },
  ],
  'problem-radar': [
    { id: 'find-problem', label: 'Help me notice a problem', icon: 'search-outline' },
    { id: 'sharpen-problem', label: 'Make my problem sentence clearer', icon: 'create-outline' },
  ],
  'five-whys': [
    { id: 'why-probe', label: 'Give me a "why" question to ask', icon: 'help-circle-outline' },
    { id: 'root-check', label: 'Is this the real root cause?', icon: 'git-branch-outline' },
  ],
  'idea-generator': [
    { id: 'more-ideas', label: 'Help me get more ideas', icon: 'bulb-outline' },
    { id: 'wild-idea', label: 'Give me a wild idea starter', icon: 'rocket-outline' },
  ],
  scamper: [
    { id: 'scamper-ideas', label: 'Give me 3 SCAMPER ideas', icon: 'bulb-outline' },
    { id: 'combine-hint', label: 'How can I COMBINE two materials?', icon: 'git-merge-outline' },
    { id: 'local-materials', label: 'Give me a local material hint', icon: 'construct-outline' },
  ],
  'idea-selection': [
    { id: 'choose-help', label: 'How do I choose the best idea?', icon: 'podium-outline' },
    { id: 'fail-test', label: 'Help me test if this idea will fail', icon: 'warning-outline' },
  ],
  'material-check': [
    { id: 'no-materials', label: "I don't have materials. What now?", icon: 'construct-outline' },
    { id: 'local-materials', label: 'What materials can I use?', icon: 'leaf-outline' },
  ],
  'prototype-mode': [
    { id: 'fix-bond', label: 'My parts keep falling apart', icon: 'build-outline' },
    { id: 'fix-weak', label: 'My model is too weak / wobbly', icon: 'barbell-outline' },
    { id: 'local-materials', label: 'Find substitute school materials', icon: 'construct-outline' },
  ],
  'design-mode': [
    { id: 'storyboard-help', label: 'How do I make a storyboard?', icon: 'film-outline' },
    { id: 'explain-help', label: 'How do I explain how it works?', icon: 'chatbox-ellipses-outline' },
  ],
  testing: [
    { id: 'fair-test', label: 'How do I make a fair test?', icon: 'flask-outline' },
    { id: 'it-failed', label: 'My test failed. What now?', icon: 'refresh-outline' },
  ],
  reflection: [
    { id: 'reflect-help', label: 'Help me reflect deeper', icon: 'sparkles-outline' },
    { id: 'next-steps', label: 'What could I try next?', icon: 'arrow-forward-outline' },
  ],
};

export function mentorActions(c: MentorContextInfo): MentorAction[] {
  return c.step ? ACTIONS[c.step] : ACTIONS.general;
}

export function mentorGreeting(c: MentorContextInfo): string {
  const p = problemOf(c);
  switch (c.step) {
    case 'think-starter':
      return 'Warming up? There is no wrong answer here. Want a hint?';
    case 'problem-radar':
      return 'Great problems are hiding everywhere. Shall I help you spot one?';
    case 'five-whys':
      return `You're digging into "${p}". Want a question to help you go one "why" deeper?`;
    case 'idea-generator':
      return `Let's fill your idea list for "${p}". Quantity first, quality later!`;
    case 'scamper':
      return `I see you're on SCAMPER for "${p}". Would you like a hint on how to COMBINE two materials?`;
    case 'idea-selection':
      return 'Comparing ideas is hard. I can help you test which idea might fail.';
    case 'material-check':
      return 'No materials? No problem. Every idea can still be designed.';
    case 'prototype-mode':
      return 'Building can be tricky. Tell me what went wrong and I will suggest a fix.';
    case 'design-mode':
      return 'Designing on paper is real innovation. Want help making it clear?';
    case 'testing':
      return 'Testing is where innovators learn the most. Failures are data!';
    case 'reflection':
      return 'Look how far you came! Want help thinking about what you learned?';
    default:
      return 'Hi! I am your Innovation Mentor. How can I help your project right now?';
  }
}

function materialHint(c: MentorContextInfo): string {
  const fn = pick(MATERIAL_FUNCTIONS);
  const have = new Set(c.resources.map((r) => r.name.toLowerCase()));
  const local = fn.alternatives.filter((a) => have.has(a.toLowerCase()));
  const list = (local.length ? local : fn.alternatives).slice(0, 3).join(', ');
  return `Think about the JOB the material does. For example, to "${fn.label.toLowerCase()}", you could try: ${list}. ${
    local.length ? 'Your school already has some of these!' : 'Ask your teacher which are available.'
  } Always check a substitute is safe.`;
}

const REPLIES: Record<string, (c: MentorContextInfo) => string> = {
  'where-start': () =>
    'Start the Innovation Engine with a Think Starter. Then use Problem Radar to notice something annoying, wasteful or slow around you.',
  'find-problem': (c) =>
    simple(c)
      ? 'Walk around and look for things that are messy, broken, slow or wasted. Which one bothers you most?'
      : 'Try this: list 3 places (classroom, home, market). For each, write one thing that wastes time, water, money or energy. Pick the one that affects the most people.',
  'sharpen-problem': (c) =>
    `A clear problem says WHO is affected, WHAT happens and WHERE. Try: "[Who] [has what problem] at [where] because [reason]." Your current one: "${problemOf(c)}".`,
  'warmup-hint': () => 'Say the first thing that comes to mind, then ask "what else?" three times. Silly answers count!',
  'think-more': () => 'Change one thing: size, place, person or time. "What if it was 10 times bigger?" "What if a baby used it?"',
  'why-probe': (c) => {
    const answered = c.project?.research.fiveWhys.filter((w) => w.trim()) ?? [];
    const last = answered[answered.length - 1];
    return last
      ? `You said: "${last}". Now ask: why does THAT happen? Is it about people, materials, money, or the way things are done?`
      : `Start with: why does "${problemOf(c)}" happen? Think about people, materials, money, and habits.`;
  },
  'root-check': () =>
    'A root cause is something you could actually change. If your last "why" is about something nobody can fix (like the weather), go back one step.',
  'more-ideas': (c) =>
    `Try these starters for "${problemOf(c)}": What if we used something free? What if it worked without electricity? What if children ran it? What if we removed a step?`,
  'wild-idea': () => pick([
    'What if the problem solved itself overnight? What would need to exist?',
    'What if an animal could fix it? Which animal and how?',
    'What if you had to solve it using only bottles and string?',
  ]),
  'scamper-ideas': (c) => {
    const letters = [...SCAMPER_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 3);
    return letters.map((l) => `• ${l.word}: ${l.question(problemOf(c))}`).join('\n');
  },
  'combine-hint': () =>
    'COMBINE means joining two things to do a new job. Try pairing something that HOLDS (bottle, tin) with something that MOVES or FILTERS (sand, cloth, string). What new job could they do together?',
  'local-materials': materialHint,
  'no-materials': () =>
    'Choose Design Mode! You can draw it, make a storyboard, a process diagram, or photograph a paper model. Lack of materials never means lack of innovation.',
  'choose-help': () =>
    'Give each idea honest scores. Then ask: which one solves the ROOT cause, can we build with what we have, and helps the most people?',
  'fail-test': (c) =>
    `Imagine your idea for "${problemOf(c)}" failed one month from now. Write the top 3 reasons why. If you can fix those reasons, it's a strong idea!`,
  'fix-bond': () =>
    'Try a stronger joint: overlap the parts more, use string wrapped tightly, cut slots so parts lock together, or use clay/soil paste and let it dry fully.',
  'fix-weak': () =>
    'Make it stronger with triangles (they do not bend), roll paper into tubes, add a wider base, or double the cardboard layers with corrugations crossing.',
  'storyboard-help': () =>
    'Draw 4-6 boxes. Box 1: the problem. Middle boxes: a person using your invention step by step. Last box: the happy result.',
  'explain-help': () =>
    'Explain it like a recipe: 1) what goes in, 2) what happens inside, 3) what comes out, and 4) why this fixes the problem.',
  'fair-test': () =>
    'Change only ONE thing at a time, keep everything else the same, and test more than once. Write down what you expect before you start.',
  'it-failed': () =>
    'Great, now you have data! Write what went wrong, guess why, change ONE thing, and test again as Prototype 2.',
  'reflect-help': () =>
    'Finish these: "I used to think... now I think...". "The hardest part was... and I got through it by...".',
  'next-steps': (c) =>
    c.tier === 'innovator'
      ? 'Test with real users, improve using their feedback, then try the Entrepreneurship pathway to plan who would pay for it and its impact.'
      : 'Share it with your class, ask 3 people what they would change, and build Prototype 2!',
};

const KEYWORDS: [RegExp, string][] = [
  [/material|cardboard|bottle|substitut|don'?t have|no .*material/i, 'local-materials'],
  [/fall|apart|stick|glue|join|attach/i, 'fix-bond'],
  [/weak|wobbl|break|collapse|strong/i, 'fix-weak'],
  [/test|experiment|fair/i, 'fair-test'],
  [/fail|didn'?t work|not work/i, 'it-failed'],
  [/why|root|cause/i, 'why-probe'],
  [/scamper|combine|substitute|adapt|modify/i, 'scamper-ideas'],
  [/idea|stuck|think of/i, 'more-ideas'],
  [/choose|pick|best|select/i, 'choose-help'],
  [/problem|notice/i, 'find-problem'],
  [/storyboard|draw|sketch/i, 'storyboard-help'],
  [/reflect|learn/i, 'reflect-help'],
];

function offlineReply(input: { actionId?: string; text?: string }, c: MentorContextInfo): string {
  let id = input.actionId;
  if (!id && input.text) id = KEYWORDS.find(([re]) => re.test(input.text!))?.[1];
  const reply = id ? REPLIES[id] : undefined;
  if (reply) return reply(c);
  return `Good question! I work best with questions about problems, ideas, materials, building and testing. Try one of the buttons, or ask "how can I make my model stronger?"`;
}

/** Project context sent to Gemini: the work itself only, never names, class or school. */
function contextPrompt(c: MentorContextInfo): string {
  const p = c.project;
  const lines = [`Current step: ${c.step ? STEP_TITLES[c.step] : 'not in a project step'}`];
  if (p) {
    if (p.problem.statement) lines.push(`Problem: ${p.problem.statement}`);
    const whys = p.research.fiveWhys.filter((w) => w.trim());
    if (whys.length) lines.push(`Root cause so far: ${whys[whys.length - 1]}`);
    if (p.ideas.length) lines.push(`Ideas: ${p.ideas.slice(0, 6).map((i) => i.text).join('; ')}`);
    if (p.selectedIdea) lines.push(`Chosen idea: ${p.selectedIdea.text}`);
    const last = p.iterations[p.iterations.length - 1];
    if (last) lines.push(`Latest test result: ${last.result}; what went wrong: ${last.wentWrong}`);
  }
  const local = c.resources.slice(0, 12).map((r) => r.name).join(', ');
  if (local) lines.push(`Materials available at school: ${local}`);
  return lines.join('\n').slice(0, 1200);
}

export type MentorReply = { text: string; source: 'ai' | 'offline' };

/** Gemini (via Firebase AI Logic) when online; rule-based guidance offline or if the call fails. */
export async function askMentor(
  input: { actionId?: string; text?: string },
  c: MentorContextInfo,
  history: ChatTurn[],
  online: boolean,
): Promise<MentorReply> {
  if (online) {
    const question = input.text ?? mentorActions(c).find((a) => a.id === input.actionId)?.label ?? '';
    const ai = await askGemini(`${contextPrompt(c)}\n\nStudent: ${question}`, history, c.tier);
    if (ai) return { text: ai, source: 'ai' };
  }
  return { text: offlineReply(input, c), source: 'offline' };
}
