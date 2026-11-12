// 감상 배경 구획의 본문 문단 사이 빈 문단 규칙. 공개 본문 점검과 편집기 수정이 함께 쓴다.
// 입력: [{ text, align, component }] 순서대로. text는 공백·zero-width를 뺀 값, 빈 문단은 ''.
const REVIEW_LABEL = '감상 배경';

export function paragraphAlign(className) {
  const align = String(className).match(/se-text-paragraph-align-(\w+)/)?.[1];
  return align === 'center' || align === 'right' ? align : 'left';
}

// 빈 문단 없이 앞 문단에 붙어 있는 감상 문단의 위치를 돌려준다.
export function reviewGapTargets(paragraphs) {
  const targets = [];
  let inReview = false;
  paragraphs.forEach((p, i) => {
    if (!p.text) return;
    if (p.align !== 'left') { inReview = p.text === REVIEW_LABEL; return; }
    const prior = paragraphs[i - 1];
    if (inReview && prior?.text && prior.align === 'left' && prior.component === p.component) targets.push(i);
  });
  return targets;
}

// 편집기에 열린 글의 문단 흐름을 읽는다.
export async function readEditorParagraphs(page) {
  const rows = await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph', nodes => {
    const components = [...document.querySelectorAll('.se-component')];
    return nodes.map(p => ({ text: p.textContent.replace(new RegExp(String.fromCharCode(0x200b), 'g'), '').trim(), className: p.className, component: components.indexOf(p.closest('.se-component')) }));
  });
  return rows.map(({ className, ...row }) => ({ ...row, align: paragraphAlign(className) }));
}

// 저장 직전 관문. 붙은 감상 문단이 있으면 저장하지 않고 고칠 도구를 알려 준다.
export async function assertNoReviewGaps(page) {
  const flow = await readEditorParagraphs(page);
  const targets = reviewGapTargets(flow);
  if (targets.length) throw new Error(`감상 문단 ${targets.length}곳이 빈 문단 없이 붙어 있어 저장을 막았다: ${flow[targets[0]].text.slice(0, 30)} (apply-review-gaps.mjs로 먼저 벌린다)`);
}

// 공개 글 HTML에서 문단 흐름을 읽는다. 사진·구분선·표는 component 번호를 건너뛰어 흐름을 끊는다.
export function publicParagraphs(html) {
  const start = html.indexOf('se-main-container');
  if (start < 0) return null;
  const body = html.slice(start);
  const components = [...body.matchAll(/<div\b[^>]*class="se-component se-([a-zA-Z]+)[^"]*"[^>]*>/g)];
  return components.flatMap((match, component) => {
    if (match[1] !== 'text') return [];
    const segment = body.slice(match.index, components[component + 1]?.index ?? body.length);
    return [...segment.matchAll(/<p[^>]*class="([^"]*se-text-paragraph[^"]*)"[^>]*>([\s\S]*?)<\/p>/g)].map(m => ({
      text: m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;/g, '').replace(/​/g, '').trim(),
      align: paragraphAlign(m[1]),
      component,
    }));
  });
}
