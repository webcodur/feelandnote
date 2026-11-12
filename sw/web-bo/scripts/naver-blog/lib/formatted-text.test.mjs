import test from 'node:test';
import assert from 'node:assert/strict';
import {splitEmphasis, renderInlinePart} from '../../../../../packages/shared/src/lib/formatted-text.ts';
import {formattedPlainText, formattedTextRuns, formattedTextHtml, formattedParagraphMatches, NAVER_INLINE_COLOR, NAVER_REVIEW_COLOR, NAVER_REVIEW_INLINE_COLOR} from './formatted-text.mjs';
import {readingWaySection} from './reading-way-section.mjs';
import {fragment} from '../apply-unified-article.mjs';
import {assertParagraphPresentation} from './unified-typography.mjs';
import {UNIFIED_ARTICLE} from './unified-article.mjs';

const raw = '그는 『책』을 읽고 "기억한다"고 썼다. 「봄」(Spring)도 읽었다.';
const rgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(x => parseInt(x,16)).join(', ') + ')';
const actualParagraph = op => ({text:op.text,align:'left',sizes:[UNIFIED_ARTICLE.font.body],weights:[700],separated:true,
  colors:formattedTextRuns(op.text,op.color).map(run=>rgb(run.color)),
  runs:formattedTextRuns(op.text,op.color).map(run=>({text:run.text,color:rgb(run.color),weight:700,family:run.serif?'나눔명조, serif':'Arial'})),
});

test('Naver shares service punctuation and emphasis, with dark colors for a white page',()=>{
  assert.equal(formattedPlainText(raw),splitEmphasis(raw).map(part=>renderInlinePart(part.text)).join(''));
  assert.equal(formattedPlainText(raw),'그는 《책》을 읽고 “기억한다”고 썼다. ‘봄’(Spring)도 읽었다.');
  const runs=formattedTextRuns(raw,'#5e3a21');
  assert.equal(runs.find(run=>run.text==='《책》').color,NAVER_INLINE_COLOR);
  assert.equal(runs.find(run=>run.text==='“기억한다”').color,NAVER_INLINE_COLOR);
  assert.equal(runs.find(run=>run.text==='‘봄’').serif,true);
  assert.equal(runs.find(run=>run.text==='(Spring)').color,'#5e3a21');
  assert.equal(formattedPlainText("Rowling's books aren't summaries."),"Rowling's books aren't summaries.");
});

test('Naver paste keeps all prose bold and escapes markup',()=>{
  const op=readingWaySection({id:'p',readingWay:{text:raw,source:'celebs:p:reading_way'}})[1];
  assert.equal(op.bold,true);assert.equal(op.formattedText,true);
  const html=fragment([op]);
  assert.ok(html.includes('<strong>'));assert.ok(!html.includes('font-weight:400'));
  assert.ok(html.includes('color:'+NAVER_INLINE_COLOR));
  assert.ok(formattedTextHtml('A & B <script>alert(1)</script>',op).includes('&amp;'));
  assert.ok(!formattedTextHtml('A & B <script>alert(1)</script>',op).includes('<script>'));
});

test('section bases stay exclusive while green reviews use a darker green accent',()=>{
  const bases=['#5e3a21','#222222',NAVER_REVIEW_COLOR];
  assert.ok(!bases.includes(NAVER_INLINE_COLOR));
  assert.ok(!bases.includes(NAVER_REVIEW_INLINE_COLOR));
  for(const base of bases){
    const accent=base===NAVER_REVIEW_COLOR?NAVER_REVIEW_INLINE_COLOR:NAVER_INLINE_COLOR;
    const runs=formattedTextRuns(raw,base);
    assert.deepEqual(new Set(runs.map(r=>r.color)),new Set([base,accent]));
    for(const token of ['《책》','“기억한다”','‘봄’'])assert.equal(runs.find(r=>r.text===token).color,accent);
    assert.equal(runs.find(r=>r.text==='(Spring)').color,base);
    for(const other of bases.filter(c=>c!==base))assert.ok(!runs.some(r=>r.color===other));
  }
});

test('saved verification rejects lost color or bold and ignores span splitting',()=>{
  const op=readingWaySection({id:'p',readingWay:{text:raw,source:'celebs:p:reading_way'}})[1],p=actualParagraph(op);
  assert.ok(formattedParagraphMatches(op,p));
  assert.doesNotThrow(()=>assertParagraphPresentation({operations:[op]},[p]));
  p.runs=p.runs.flatMap(run=>Array.from(run.text).map(text=>({...run,text})));
  assert.ok(formattedParagraphMatches(op,p));
  const term=p.runs.find(run=>run.family==='나눔명조, serif');
  term.family='Arial, sans-serif';assert.ok(!formattedParagraphMatches(op,p));term.family='나눔명조, serif';
  const quote=p.runs.find(run=>run.color===rgb(NAVER_INLINE_COLOR));
  quote.color=rgb(op.color);assert.ok(!formattedParagraphMatches(op,p));
  quote.color=rgb(NAVER_INLINE_COLOR);quote.weight=400;assert.ok(!formattedParagraphMatches(op,p));
});
