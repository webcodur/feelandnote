import {emphasisClassName, renderInlinePart, splitEmphasis} from '../../../../../packages/shared/src/lib/formatted-text.ts';

// The service supplies parsing and punctuation. These colors target Naver's white background.
// Bump when the body emphasis or weight policy changes; restyle-body.mjs --logs=all then reapplies every post.
export const BODY_STYLE_VERSION = 'service-inline-bold-1';
export const NAVER_INLINE_COLOR = '#365b87';
export const NAVER_REVIEW_COLOR = '#1f6b43';
export const NAVER_REVIEW_INLINE_COLOR = '#0b4027';

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function formattedTextRuns(text, baseColor = '#222222') {
  // Keep section colors exclusive. Green reviews use a darker green accent
  // instead of introducing blue into the paragraph.
  const accent = baseColor.toLowerCase() === NAVER_REVIEW_COLOR ? NAVER_REVIEW_INLINE_COLOR : NAVER_INLINE_COLOR;
  return splitEmphasis(text).filter(part => part.text).map(part => {
    const className = part.emphasis ? emphasisClassName(part.text) ?? '' : '';
    let color = baseColor;
    if (!className.includes('text-reading-parenthetical') &&
        /text-reading-quote|text-reading-term|text-text-primary/.test(className)) color = accent;
    return {text: renderInlinePart(part.text), color, serif: className.includes('font-serif')};
  });
}

export function formattedPlainText(text) {
  return splitEmphasis(text).map(part => renderInlinePart(part.text)).join('');
}

export function formattedTextHtml(text, presentation) {
  return formattedTextRuns(text, presentation.color).map(run => {
    const style = `color:${run.color};font-weight:${presentation.bold ? 700 : 400};${run.serif ? 'font-family:나눔명조,serif;' : ''}`;
    return `<span style="${style}">${escape(run.text).replace(/\n/g, '<br>')}</span>`;
  }).join('');
}

const rgb = hex => 'rgb(' + hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16)).join(', ') + ')';

export function formattedParagraphMatches(op, paragraph) {
  if (!paragraph || paragraph.text !== op.text || !paragraph.runs) return false;
  const expected = formattedTextRuns(op.text, op.color ?? '#222222').flatMap(run =>
    Array.from(run.text).map(char => ({char, color: rgb(run.color), serif: run.serif})),
  );
  const actual = paragraph.runs.flatMap(run => Array.from(run.text).map(char => ({
    char, color: run.color, bold: run.weight >= 600, family: run.family,
  })));
  while (actual.length && /\s/.test(actual[0].char)) actual.shift();
  while (actual.length && /\s/.test(actual.at(-1).char)) actual.pop();
  return actual.length === expected.length && actual.every((run, index) => {
    const wanted = expected[index];
    return run.char === wanted.char && run.color === wanted.color && run.bold === (op.bold ?? true)
      && (!wanted.serif || /나눔명조|Nanum\s*Myeongjo|(?:^|[,\s])serif(?:$|[,\s])/i.test(run.family));
  });
}
