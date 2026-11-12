import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyTargets} from './restyle-body.mjs';

const p=(text,align='left',size=16)=>({text,align,sizes:[size],weights:[400],colors:['rgb(34, 34, 34)']});

test('인물 안내·독서 방식·책 소개·감상 본문만 고르고 목차·구획명·링크는 건드리지 않는다',()=>{
 const article=[p('인물 · 3권 중 1권 소개','center',19),p('인물 안내입니다.'),p('목차','center',13),p('독서 방식','center'),p('01. 책','center'),
  p('독서 방식','center',19),p('책을 "천천히" 읽는다.'),p('01 · 『책』','center',19),p('작가','center',13),p('YES24에서 보기','center'),
  p('책 소개','center',13),p('『책』의 내용입니다.'),p('감상 배경','center',13),p('읽게 된 경위입니다.'),p('감상 근거 · 원문','right'),p('필앤노트 안내','center')];
 const targets=bodyTargets(article);
 assert.deepEqual(targets.map(t=>[t.section,t.text]),[['intro','인물 안내입니다.'],['readingWay','책을 "천천히" 읽는다.'],['blurb','『책』의 내용입니다.'],['review','읽게 된 경위입니다.']]);
 assert.ok(targets.every(t=>t.op.bold&&t.op.formattedText&&t.op.align==='left'));
 assert.equal(targets.find(t=>t.section==='review').op.color,'#1f6b43');
 assert.equal(targets.find(t=>t.section==='readingWay').op.text,'책을 “천천히” 읽는다.');
});

test('정중체 책 소개 묶음은 검수한 간결체 전환본으로만 바꾸고 없으면 멈춘다',async()=>{
 const {plainBlurbs}=await import('./restyle-body.mjs'),{blurbKey}=await import('./convert-blurbs-plain.mjs');
 const style=[p('제목','center',19),p('인물 안내입니다.'),p('책 소개','center',13),p('첫 소개입니다.'),p('둘째 소개입니다.'),p('감상 배경','center',13),p('감상입니다.')];
 const targets=bodyTargets(style),conversions={[blurbKey(['첫 소개입니다.','둘째 소개입니다.'])]:{paragraphs:['첫 소개다.','둘째 소개다.']}};
 plainBlurbs(targets,conversions);
 assert.deepEqual(targets.filter(t=>t.section==='blurb').map(t=>t.op.text),['첫 소개다.','둘째 소개다.']);
 assert.equal(targets.find(t=>t.section==='intro').op.text,'인물 안내입니다.');
 assert.throws(()=>plainBlurbs(bodyTargets(style),{}),/plain-style introduction missing/);
});
