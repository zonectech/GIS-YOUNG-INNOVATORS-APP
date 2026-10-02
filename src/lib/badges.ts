import type { InnovationPortfolio, UserProfile } from '../types';

export type BadgeContext = { portfolios: InnovationPortfolio[]; profile: UserProfile; approvedShowcase: number };

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: (c: BadgeContext) => boolean;
};

const some = (c: BadgeContext, fn: (p: InnovationPortfolio) => boolean) => c.portfolios.some(fn);

export const BADGES: Badge[] = [
  { id: 'first-spark', title: 'First Spark', description: 'Answered a Think Starter', icon: 'flash', earned: (c) => some(c, (p) => !!p.thinkStarter.response.trim()) },
  { id: 'problem-spotter', title: 'Problem Spotter', description: 'Defined a real problem', icon: 'search', earned: (c) => some(c, (p) => !!p.problem.statement.trim() && !!p.problem.category) },
  { id: 'root-cause-ace', title: 'Root Cause Ace', description: 'Solved all 5 Whys', icon: 'git-branch', earned: (c) => some(c, (p) => p.research.fiveWhys.every((w) => w.trim())) },
  { id: 'idea-machine', title: 'Idea Machine', description: 'Generated 5+ ideas', icon: 'bulb', earned: (c) => some(c, (p) => p.ideas.length >= 5) },
  { id: 'idea-storm', title: 'Idea Storm', description: 'Generated 10+ ideas', icon: 'thunderstorm', earned: (c) => some(c, (p) => p.ideas.length >= 10) },
  { id: 'scamper-master', title: 'SCAMPER Master', description: 'Answered all 7 letters', icon: 'color-wand', earned: (c) => some(c, (p) => Object.values(p.scamper).filter((v) => v?.trim()).length >= 7) },
  { id: 'reality-checker', title: 'Reality Checker', description: 'Scored ideas and chose one', icon: 'podium', earned: (c) => some(c, (p) => !!p.selectedIdea && p.ideas.every((i) => Object.keys(i.ratings).length > 0)) },
  { id: 'material-swap', title: 'Material Swap', description: 'Used a substitute material', icon: 'construct', earned: (c) => some(c, (p) => p.substitutions.length > 0) },
  { id: 'maker', title: 'Maker', description: 'Reached a functional prototype or a full design', icon: 'hammer', earned: (c) => some(c, (p) => p.prototype.level >= 3 || (p.hasMaterials === false && (p.design.content.trim().length > 80 || p.design.attachments.length > 0))) },
  { id: 'fail-forward', title: 'Fail Forward', description: 'Tested 2+ prototype versions', icon: 'refresh', earned: (c) => some(c, (p) => p.iterations.length >= 2) },
  { id: 'deep-thinker', title: 'Deep Thinker', description: 'Answered every reflection question', icon: 'sparkles', earned: (c) => some(c, (p) => Object.values(p.reflection).every((v) => v.trim())) },
  { id: 'showcased', title: 'Showcased', description: 'Work approved for the Showcase', icon: 'ribbon', earned: (c) => c.approvedShowcase > 0 },
];

export const earnedBadges = (c: BadgeContext) => BADGES.filter((b) => b.earned(c));

/** Innovator level grows every 2 badges. */
export const passportLevel = (earned: number) => 1 + Math.floor(earned / 2);

/** 0–100 completeness score used on the Passport and certificates. */
export function portfolioScore(p: InnovationPortfolio): number {
  const parts: [boolean, number][] = [
    [!!p.thinkStarter.response.trim(), 5],
    [!!p.problem.statement.trim() && !!p.problem.observation.trim(), 10],
    [p.research.fiveWhys.filter((w) => w.trim()).length >= 3, 10],
    [p.ideas.length >= 5, 10],
    [Object.values(p.scamper).filter((v) => v?.trim()).length >= 3, 10],
    [!!p.selectedIdea, 10],
    [p.prototype.level >= 2 || p.design.content.trim().length > 0 || p.design.attachments.length > 0, 15],
    [p.iterations.length >= 1, 10],
    [p.iterations.length >= 2, 5],
    [Object.values(p.reflection).filter((v) => v.trim()).length >= 3, 10],
    [p.status === 'completed', 5],
  ];
  return parts.reduce((sum, [ok, w]) => sum + (ok ? w : 0), 0);
}

/** Completed projects at a tier needed to earn its certificate. */
export const CERTIFICATE_THRESHOLD = 2;
