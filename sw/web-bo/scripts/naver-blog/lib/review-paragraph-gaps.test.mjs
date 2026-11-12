import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoReviewGaps, paragraphAlign, publicParagraphs, reviewGapTargets } from './review-paragraph-gaps.mjs';

const p = (text, align = 'left', component = 0) => ({ text, align, component });

test('감상 배경 안에서 붙은 문단만 찾는다', () => {
  const flow = [p('책 소개', 'center'), p('소개 1'), p('소개 2'), p(''), p('감상 배경', 'center'), p('첫째'), p('둘째'), p(''), p('셋째'), p('넷째'), p('감상 근거 · 원문', 'right'), p('다음 글')];
  assert.deepEqual(reviewGapTargets(flow), [6, 9]);
});

test('빈 문단으로 벌어진 감상과 단일 문단 감상은 대상이 아니다', () => {
  assert.deepEqual(reviewGapTargets([p('감상 배경', 'center'), p('첫째'), p(''), p('둘째'), p('작품 상세', 'right')]), []);
  assert.deepEqual(reviewGapTargets([p('감상 배경', 'center'), p('첫째'), p('감상 근거 · 원문', 'right')]), []);
});

test('다른 구성 요소로 나뉜 문단은 붙은 것으로 보지 않는다', () => {
  assert.deepEqual(reviewGapTargets([p('감상 배경', 'center', 0), p('첫째', 'left', 0), p('둘째', 'left', 2)]), []);
});

test('저장 관문은 붙은 감상 문단이 있을 때만 저장을 막는다', async () => {
  const row = (text, className = 'se-text-paragraph') => ({ text, className, component: 3 });
  const page = rows => ({ $$eval: async () => rows });
  const label = row('감상 배경', 'se-text-paragraph se-text-paragraph-align-center');
  await assert.rejects(assertNoReviewGaps(page([label, row('첫째 문단'), row('둘째 문단')])), /저장을 막았다.*둘째 문단/);
  await assertNoReviewGaps(page([label, row('첫째 문단'), row(''), row('둘째 문단')]));
});

test('공개 본문의 문단·정렬·구성 요소를 읽는다', () => {
  const html = '<div class="se-main-container"><div class="se-component se-text x"><p class="se-text-paragraph se-text-paragraph-align-center"><span>감상 배경</span></p><p class="se-text-paragraph"><span>&#8203;</span></p></div><div class="se-component se-image"></div><div class="se-component se-text"><p class="se-text-paragraph se-text-paragraph-align-right">링크</p></div></div>';
  const flow = publicParagraphs(html);
  assert.equal(flow[0].text, '감상 배경');
  assert.equal(flow[0].align, 'center');
  assert.equal(flow[1].text, '');
  assert.equal(flow[2].component, 2);
  assert.equal(paragraphAlign('se-text-paragraph'), 'left');
  assert.equal(publicParagraphs('<html></html>'), null);
});
