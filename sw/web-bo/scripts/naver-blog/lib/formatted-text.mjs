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

// 여러 문단을 큰따옴표 한 쌍으로 감싼 인용은 문단마다 부호 짝이 없다. 이어진 문단 묶음에서 각 문단이 인용을 여는지('open'), 인용 한가운데인지('mid'), 닫는지('close') 가린다.
// 뒤 문단에서 닫히지 않는 여는 부호는 인용으로 보지 않는다.
export function quoteCarries(paragraphs) {
  const bare = paragraphs.map(text => String(text).replace(/“[^“”]*”/g, ''));
  const carries = paragraphs.map(() => null);
  for (let i = 0; i < bare.length; i++) {
    if (!bare[i].includes('“') || bare[i].includes('”')) continue;
    let j = i + 1;
    while (j < bare.length && !bare[j].includes('“') && !bare[j].includes('”')) j++;
    if (j >= bare.length || bare[j].includes('“') || !bare[j].includes('”')) continue;
    carries[i] = 'open'; for (let k = i + 1; k < j; k++) carries[k] = 'mid'; carries[j] = 'close'; i = j;
  }
  return carries;
}

function carriedRange(text, carry) {
  if (carry === 'mid') return {start: 0, end: text.length};
  if (carry === 'open') { const at = text.lastIndexOf('“'); return at < 0 ? null : {start: at, end: text.length}; }
  if (carry === 'close') { const at = text.indexOf('”'); return at < 0 ? null : {start: 0, end: at + 1}; }
  return null;
}

export function formattedTextRuns(text, baseColor = '#222222', carry = null) {
  const range = carriedRange(text, carry);
  if (range) {
    const accentColor = baseColor.toLowerCase() === NAVER_REVIEW_COLOR ? NAVER_REVIEW_INLINE_COLOR : NAVER_INLINE_COLOR;
    const quoteClass = emphasisClassName('“”') ?? '';
    return [
      ...formattedTextRuns(text.slice(0, range.start), baseColor),
      {text: text.slice(range.start, range.end), color: accentColor, serif: quoteClass.includes('font-serif')},
      ...formattedTextRuns(text.slice(range.end), baseColor),
    ].filter(run => run.text);
  }
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

export function formattedTextHtml(text, presentation, carry = null) {
  return formattedTextRuns(text, presentation.color, carry).map(run => {
    const style = `color:${run.color};font-weight:${presentation.bold ? 700 : 400};${run.serif ? 'font-family:나눔명조,serif;' : ''}`;
    return `<span style="${style}">${escape(run.text).replace(/\n/g, '<br>')}</span>`;
  }).join('');
}

const rgb = hex => 'rgb(' + hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16)).join(', ') + ')';

export function formattedParagraphMatches(op, paragraph) {
  if (!paragraph || paragraph.text !== op.text || !paragraph.runs) return false;
  const expected = formattedTextRuns(op.text, op.color ?? '#222222', op.quoteCarry ?? null).flatMap(run =>
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
