import * as Print from 'expo-print';

import { AGE_TIERS, PROTOTYPE_LEVELS } from '../constants/content';
import type { AgeTier, InnovationPortfolio } from '../types';
import type { Badge } from './badges';
import { esc, sharePdf } from './portfolioPdf';

// A4 landscape in points (72 PPI).
const SLIDE = { width: 842, height: 595 };

const slide = (n: number, kicker: string, title: string, body: string) => `
  <div class="slide">
    <div class="kicker">${n} · ${esc(kicker)}</div>
    <h1>${title}</h1>
    <div class="body">${body}</div>
    <div class="foot">GIS Young Innovators · Pitch Deck</div>
  </div>`;

const or = (s: string | null | undefined) => (s?.trim() ? esc(s) : '<span class="muted">Not filled in yet</span>');

/** Concise 5-slide deck compiled from the portfolio and venture canvas. */
export async function exportPitchDeck(p: InnovationPortfolio, authorName: string | null) {
  const v = p.venture;
  const last = p.iterations[p.iterations.length - 1];
  const build =
    p.hasMaterials === false
      ? 'Designed prototype (drawings / storyboard)'
      : `Prototype level ${p.prototype.level}: ${PROTOTYPE_LEVELS[p.prototype.level].name}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  @page { size: ${SLIDE.width}px ${SLIDE.height}px; margin: 0; }
  body { margin: 0; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
  .slide { width: ${SLIDE.width}px; height: ${SLIDE.height}px; box-sizing: border-box; padding: 48px 56px; position: relative; page-break-after: always; background: #F8FAFC; border-left: 14px solid #4F46E5; }
  .kicker { color: #4F46E5; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; font-size: 13px; }
  h1 { font-size: 34px; margin: 10px 0 18px; line-height: 1.15; }
  .body { font-size: 18px; line-height: 1.5; color: #334155; }
  .big { font-size: 28px; font-weight: 800; color: #4F46E5; }
  .muted { color: #94A3B8; }
  .foot { position: absolute; bottom: 24px; left: 56px; font-size: 11px; color: #94A3B8; }
  .grid { display: flex; gap: 24px; } .grid > div { flex: 1; background: #fff; border-radius: 12px; padding: 18px; }
</style></head><body>
  ${slide(1, 'The problem', or(p.problem.statement), `<p>${or(p.problem.observation)}</p>${
    p.research.fiveWhys[4]?.trim() ? `<p><b>Root cause:</b> ${esc(p.research.fiveWhys[4])}</p>` : ''
  }`)}
  ${slide(2, 'Our solution', or(p.selectedIdea?.text), `<p>${esc(build)}</p>${
    last ? `<p><b>Latest test:</b> ${or(last.result)}</p><p><b>We improved it by:</b> ${or(last.learnings)}</p>` : ''
  }`)}
  ${slide(3, 'Who it helps', or(v?.beneficiary), '<p>Our target beneficiary / customer.</p>')}
  ${slide(4, 'Value & cost', or(v?.valueProposition), `<div class="grid"><div><div class="muted">Cost to produce</div><div class="big">${or(
    v?.costToProduce,
  )}</div></div><div><div class="muted">Value proposition</div><p>${or(v?.valueProposition)}</p></div></div>`)}
  ${slide(5, 'Impact', or(v?.impactMetric), `<p>Presented by ${esc(authorName ?? 'a GIS Young Innovator')}.</p>`)}
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, width: SLIDE.width, height: SLIDE.height });
  await sharePdf(uri, 'Share Pitch Deck');
  return uri;
}

/** Printable tier certificate with blank lines for the teacher and school administrator to sign. */
export async function exportCertificate(args: {
  name: string | null;
  tier: AgeTier;
  school: string | null;
  projects: { title: string; score: number }[];
  badges: Badge[];
}) {
  const tier = AGE_TIERS.find((t) => t.id === args.tier)!;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  @page { size: ${SLIDE.width}px ${SLIDE.height}px; margin: 0; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #1C2B24; }
  .c { width: ${SLIDE.width}px; height: ${SLIDE.height}px; box-sizing: border-box; padding: 40px; }
  .frame { border: 6px double #1B6B4A; height: 100%; box-sizing: border-box; padding: 32px 48px; text-align: center; }
  .brand { font-family: Helvetica, Arial, sans-serif; letter-spacing: 3px; font-size: 12px; color: #1B6B4A; font-weight: 700; }
  h1 { font-size: 38px; margin: 12px 0 4px; }
  .name { font-size: 32px; font-style: italic; border-bottom: 1px solid #1C2B24; display: inline-block; padding: 0 40px 4px; margin: 14px 0; }
  .small { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #5E6E66; }
  .sig { display: flex; justify-content: space-around; margin-top: 36px; font-family: Helvetica, Arial, sans-serif; font-size: 12px; }
  .sig div { border-top: 1px solid #1C2B24; width: 220px; padding-top: 6px; }
</style></head><body><div class="c"><div class="frame">
  <div class="brand">GIS YOUNG INNOVATORS</div>
  <h1>Certificate of Innovation</h1>
  <div class="small">This certifies that</div>
  <div class="name">${esc(args.name ?? '____________________')}</div>
  <div>has completed the <b>${esc(tier.label)}</b> tier (${esc(tier.level)})${args.school ? ` at ${esc(args.school)}` : ''}</div>
  <p class="small">Projects: ${args.projects.map((p) => `${esc(p.title)} (${p.score}/100)`).join(' · ')}</p>
  <p class="small">Badges: ${args.badges.map((b) => esc(b.title)).join(' · ') || '—'}</p>
  <p class="small">Issued ${esc(new Date().toLocaleDateString())}</p>
  <div class="sig"><div>Teacher signature</div><div>School administrator signature</div></div>
</div></div></body></html>`;

  const { uri } = await Print.printToFileAsync({ html, width: SLIDE.width, height: SLIDE.height });
  await sharePdf(uri, 'Share Certificate');
  return uri;
}
