import { createEditorialEditor, EDITORIAL_FONT_SIZES as SIZE } from './editorial-editor.mjs';

// A reviewed revision keeps the actual review separate from its visible reading-note label.
// Plain body markers remain compatible with the existing publisher and HTML checks.
export function editorialParagraphStyles(revision, plan) {
  if (revision.editorial !== true) return [];
  const labels = new Set(revision.dbReviews.map(row => row.note_label));
  const people = new Set(revision.dbReviews.map(row => row.person_label));
  const result = []; let authorNext = false;
  for (const operation of plan.operations) {
    if (operation.kind === 'quote') {
      result.push(...operation.paragraphs.map(text => ({ text, size: labels.has(text) ? SIZE.label : SIZE.body, align: 'left' })));
    } else if (operation.kind === 'text' && operation.line.trim()) {
      const line = operation.line.trim(), text = line.replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').replace(/\*\*/g, '');
      const heading = /^\d{2} · 『.+』$/.test(text);
      // Keep existing service-link formatting. Selecting an emoji/link run can lose its href.
      const size = /https?:\/\//.test(text) ? null : heading || text === revision.fullList?.heading || text === revision.bonusHeading ? SIZE.heading
        : authorNext || (revision.kind !== 'celeb' && people.has(text)) ? SIZE.author : text === '인물의 서재' ? SIZE.label : SIZE.body;
      result.push({ text, size, align: line.startsWith('[c]') ? 'center' : 'left' });
      authorNext = heading;
    }
  }
  return result;
}

export async function applyEditorialLayout(page, revision, plan) {
  const editor = createEditorialEditor(page), styles = editorialParagraphStyles(revision, plan);
  // Labels can carry their size into the next paragraph. Restore all reading paragraphs last.
  const ordered = [...styles.filter(row => row.size !== null && row.size !== SIZE.body), ...styles.filter(row => row.size === SIZE.body)];
  const seen = new Map();
  for (const row of ordered) {
    const occurrence = seen.get(row.text) ?? 0; seen.set(row.text, occurrence + 1);
    await editor.formatParagraph(row.text, row.size, occurrence);
    if (row.align === 'left' && occurrence === 0) await editor.alignLeft(row.text);
  }
}

export async function assertEditorialLayout(page, revision, plan) {
  const styles = editorialParagraphStyles(revision, plan);
  if (!styles.length) return;
  const actual = await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-quotation .se-text-paragraph', nodes => nodes.map(p => {
    const clone = p.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(node => node.remove());
    return { text: clone.textContent.replace(/\u200b/g, '').trim(), sizes: [...p.querySelectorAll('span:not(.se-placeholder)')].filter(s => s.textContent.trim()).map(s => parseFloat(getComputedStyle(s).fontSize)) };
  }).filter(p => p.text));
  if (actual.length !== styles.length || styles.some((row, index) => actual[index].text !== row.text || (row.size !== null && (!actual[index].sizes.length || actual[index].sizes.some(size => size !== row.size))))) throw new Error('책 제목·저자·독서 경위의 글자 크기가 검수 원고와 다르다');
}
