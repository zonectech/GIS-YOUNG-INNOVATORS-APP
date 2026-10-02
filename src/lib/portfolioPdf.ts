import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { DESIGN_FORMATS, PROTOTYPE_LEVELS, SCAMPER_PROMPTS } from '../constants/content';
import type { InnovationPortfolio } from '../types';
import { hasLocalFile } from './attachments';
import { buildEvolution } from './evolution';

// Student text is untrusted input rendered in a WebView, so it must be escaped.
export const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const or = (s: string | null | undefined) => (s?.trim() ? esc(s) : '<span class="muted">—</span>');

const list = (items: string[]) =>
  items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="muted">—</p>';

const section = (title: string, body: string) => `<section><h2>${title}</h2>${body}</section>`;

const trim = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Methodology diagram: one column per stage, arrows between, chosen path highlighted. */
function evolutionHtml(p: InnovationPortfolio): string {
  const stages = buildEvolution(p);
  if (stages.length < 2) return '<p class="muted">—</p>';
  return `<div class="evo">${stages
    .map(
      (s, i) => `${i ? '<div class="evo-arrow">&#8594;</div>' : ''}<div class="evo-stage"><div class="evo-title">${esc(
        s.title,
      )}</div>${s.nodes
        .slice(0, 6)
        .map(
          (n) =>
            `<div class="evo-node${n.chosen ? ' chosen' : ''}${n.discarded ? ' discarded' : ''}"><b>${esc(n.label)}</b><br/>${esc(
              trim(n.text),
            )}</div>`,
        )
        .join('')}${s.nodes.length > 6 ? `<div class="muted">+${s.nodes.length - 6} more</div>` : ''}</div>`,
    )
    .join('')}</div>`;
}

export async function sharePdf(uri: string, dialogTitle: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
  }
}

export function buildPortfolioHtml(p: InnovationPortfolio, imageSrcs: string[] = []): string {
  const fiveWhys = p.research.fiveWhys.filter((w) => w.trim());
  const scamper = SCAMPER_PROMPTS.filter((s) => p.scamper[s.key]?.trim());
  const photos = imageSrcs.length
    ? `<div class="photos">${imageSrcs.map((src) => `<img src="${esc(src)}" />`).join('')}</div>`
    : '';
  const prototype =
    p.hasMaterials === false
      ? `<p><strong>${esc(DESIGN_FORMATS.find((f) => f.id === p.design.format)?.label ?? 'Design')}:</strong></p><p class="pre">${or(p.design.content)}</p>${photos}`
      : list(
          PROTOTYPE_LEVELS.filter((l) => p.prototype.notes[l.level]?.trim()).map(
            (l) => `<strong>Level ${l.level} · ${l.name}:</strong> ${esc(p.prototype.notes[l.level])}`,
          ),
        );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @page { margin: 32px; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1C2B24; font-size: 12px; line-height: 1.5; }
  header { border-bottom: 4px solid #1B6B4A; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { color: #1B6B4A; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 10px; }
  h1 { font-size: 22px; margin: 4px 0; }
  h2 { font-size: 13px; color: #1B6B4A; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #D5DED9; padding-bottom: 4px; margin: 18px 0 6px; }
  section { page-break-inside: avoid; }
  ul { margin: 0; padding-left: 18px; }
  .muted { color: #5E6E66; }
  .pre { white-space: pre-wrap; }
  .iter { border-left: 3px solid #F2A93B; padding-left: 8px; margin-bottom: 8px; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .photos img { width: 30%; border-radius: 4px; object-fit: cover; }
  .evo { display: flex; align-items: flex-start; gap: 4px; flex-wrap: wrap; }
  .evo-stage { flex: 1; min-width: 90px; }
  .evo-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #5E6E66; margin-bottom: 4px; }
  .evo-node { border: 1px solid #D5DED9; border-radius: 6px; padding: 4px 6px; margin-bottom: 4px; font-size: 9px; }
  .evo-node.chosen { border: 2px solid #1B6B4A; background: #E3F2EB; }
  .evo-node.discarded { opacity: .45; }
  .evo-arrow { align-self: center; color: #1B6B4A; font-size: 16px; font-weight: 700; }
</style>
</head>
<body>
  <header>
    <div class="brand">GIS Young Innovators · Innovation Portfolio</div>
    <h1>${or(p.problem.statement)}</h1>
    <div class="muted">
      Level: ${esc(p.owner.ageTier ?? '—')} ·
      ${p.completedAt ? `Completed ${esc(new Date(p.completedAt).toLocaleDateString())}` : 'In progress'}
    </div>
  </header>

  ${section('1. Problem', `<p>${or(p.problem.observation)}</p>`)}
  ${section('2. Research — 5 Whys', list(fiveWhys.map((w, i) => `<strong>Why ${i + 1}:</strong> ${esc(w)}`)))}
  ${section(`3. Ideas generated (${p.ideas.length})`, list(p.ideas.map((i) => esc(i.text))))}
  ${section('4. SCAMPER journey', list(scamper.map((s) => `<strong>${s.word}:</strong> ${esc(p.scamper[s.key])}`)))}
  ${section('5. Selected idea', `<p>${or(p.selectedIdea?.text)}</p>`)}
  ${section(p.hasMaterials === false ? '6. Design' : '6. Prototype', prototype)}
  ${section(
    '7. Testing, failures & lessons',
    p.iterations.length
      ? p.iterations
          .map(
            (it, i) => `<div class="iter"><strong>Prototype ${i + 1}</strong><br/>
              Hypothesis: ${or(it.hypothesis)}<br/>Test: ${or(it.procedure)}<br/>Result: ${or(it.result)}<br/>
              What went wrong: ${or(it.wentWrong)}<br/>Learned: ${or(it.learnings)}</div>`,
          )
          .join('')
      : '<p class="muted">—</p>',
  )}
  ${section(
    '8. Reflection',
    list([
      `<strong>Discovered:</strong> ${or(p.reflection.discovered)}`,
      `<strong>Surprised by:</strong> ${or(p.reflection.surprised)}`,
      `<strong>Did not work:</strong> ${or(p.reflection.didNotWork)}`,
      `<strong>Would change:</strong> ${or(p.reflection.wouldChange)}`,
      `<strong>Try next:</strong> ${or(p.reflection.tryNext)}`,
    ]),
  )}
  ${section(
    '9. Final solution',
    `<p>${or(p.finalSolution?.idea || p.selectedIdea?.text)}</p>${
      p.finalSolution?.improvements ? `<p><strong>Improved by:</strong> ${esc(p.finalSolution.improvements)}</p>` : ''
    }`,
  )}
  ${section('10. Idea Evolution Map', evolutionHtml(p))}
  ${
    p.venture
      ? section(
          '11. Lean Social Canvas',
          list([
            `<strong>Beneficiary / customer:</strong> ${or(p.venture.beneficiary)}`,
            `<strong>Cost to produce:</strong> ${or(p.venture.costToProduce)}`,
            `<strong>Value proposition:</strong> ${or(p.venture.valueProposition)}`,
            `<strong>Impact metric:</strong> ${or(p.venture.impactMetric)}`,
          ]),
        )
      : ''
  }
</body>
</html>`;
}

/** Renders the portfolio to a PDF in the cache directory and opens the share sheet. Works offline. */
export async function exportPortfolioPdf(p: InnovationPortfolio): Promise<string> {
  // iOS print WebViews can't load local file URLs, so on-device photos are inlined as base64.
  const imageSrcs = (
    await Promise.all(
      p.design.attachments.map(async (a) =>
        hasLocalFile(a) ? `data:image/jpeg;base64,${await new File(a.localUri!).base64()}` : a.remoteUrl,
      ),
    )
  ).filter((s): s is string => !!s);

  const { uri } = await Print.printToFileAsync({ html: buildPortfolioHtml(p, imageSrcs) });
  await sharePdf(uri, 'Share Innovation Portfolio');
  return uri;
}
