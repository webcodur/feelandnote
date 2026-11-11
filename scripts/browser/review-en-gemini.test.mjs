import test from 'node:test';
import assert from 'node:assert/strict';
import {translationPrompt,parseTranslation,isGeminiAccessBlocked,openedTabInWindow} from './review-en-gemini.mjs';
import {extractRecommendations} from './aladin-review-source.mjs';
import {stitchTranslationContinuation} from './review-en-chatgpt-web.mjs';

const packet={request_id:'sample',items:[{id:'one',celeb_id:'person',nickname:'인물',review:'『원제』를 읽고 추천했다.\n\n마지막 문단도 반드시 번역한다.'}]};
test('binds the new translation tab to its owned window while another window is active',()=>{
  const before=[{targetId:'anchor',windowId:42,url:'https://gemini.google.com/app'}];
  const ours={targetId:'ours',windowId:42,url:'https://gemini.google.com/u/9/app'};
  const other={targetId:'other',windowId:49,url:'https://gemini.google.com/app'};
  assert.equal(openedTabInWindow(before,[...before,other,ours],42,ours.url),'ours');
  assert.throws(()=>openedTabInWindow(before,[...before,other],42,other.url),/outside the owned/);
});
test('does not mistake Korean source prose for a Google account challenge',()=>{
  const url='https://gemini.google.com/u/0/app/example';
  assert.equal(isGeminiAccessBlocked(url,'필자와 본인을 구분하고 노동운동의 의미를 다시 한번 확인한다.'),false);
  assert.equal(isGeminiAccessBlocked(url,'사용 한도에 도달했습니다.'),true);
  assert.equal(isGeminiAccessBlocked('https://accounts.google.com/v3/signin/challenge',''),true);
  assert.equal(isGeminiAccessBlocked('https://www.google.com/sorry/index?continue=gemini',''),true);
});
test('restores titles and binds every paragraph to its own original row',()=>{
  assert.match(translationPrompt(packet).prompt,/⟪TITLE:1⟫/);
  const result=parseTranslation(packet,'[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]');
  assert.equal(result.items[0].review_en,'He read 『원제』 and recommended it.\n\nThe final paragraph must also be translated in full.');
});

test('replaces a truncated paragraph only within the same request and preserves earlier paragraph bindings',()=>{
  const partial='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph was cut mid';
  const tail='[[REQ:sample]]\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';
  const combined=stitchTranslationContinuation(packet,partial,tail);
  assert.equal(parseTranslation(packet,combined).items[0].review_en,'He read 『원제』 and recommended it.\n\nThe final paragraph must also be translated in full.');
  assert.doesNotMatch(combined,/cut mid/);
  assert.throws(()=>stitchTranslationContinuation(packet,partial,tail.replace('REQ:sample','REQ:other')),/request mismatch/);
  assert.throws(()=>stitchTranslationContinuation(packet,partial,tail.replace('[[2]]','[[1]]')),/restart/);
  assert.throws(()=>stitchTranslationContinuation(packet,partial.replace('[[2]]','[[3]]'),tail),/paragraph order/);
  assert.throws(()=>parseTranslation(packet,stitchTranslationContinuation(packet,partial,tail.replace('[[CHECKED]]',''))));
});
test('rejects crossed requests, absent self-checks, missing titles and duplicated paragraph numbers',()=>{
  const valid='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';
  for(const bad of [valid.replace('REQ:sample','REQ:other'),valid.replace('[[CHECKED]]',''),valid.replace('⟪TITLE:1⟫','Invented Title'),valid.replace('[[2]]','[[1]]')])assert.throws(()=>parseTranslation(packet,bad));
});
test('uses reviewed English titles while preserving unknown titles and source text',()=>{
  const mapped={...packet,title_translations:{'원제':'The Original Title'}};
  const raw='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';
  assert.equal(parseTranslation(mapped,raw).items[0].review_en,'He read The Original Title and recommended it.\n\nThe final paragraph must also be translated in full.');
  assert.equal(mapped.items[0].review,packet.items[0].review);
  assert.match(parseTranslation(packet,raw).items[0].review_en,/『원제』/);
  assert.throws(()=>translationPrompt({...packet,title_translations:{'원제':'잘못된 영어 제목'}}));
});
test('holds an uninterpretable paragraph without allowing it into English writes',()=>{
  const result=parseTranslation(packet,'[[REQ:sample]]\n[[1]]\n[ISSUE] The sentence is missing its predicate.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]');
  assert.equal(result.items[0].checked,false);
  assert.equal(result.items[0].review_en,undefined);
  assert.match(result.items[0].issues[0],/missing its predicate/);
});
test('rejects extra speaker metadata and untranslated characters outside protected titles',()=>{
  const raw='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';
  assert.throws(()=>parseTranslation(packet,raw.replace('He read','He 吵 read')),/Unexpected untranslated/);
  assert.throws(()=>parseTranslation(packet,raw.replace('He read','He 읽고 read')),/Unexpected untranslated/);
  assert.throws(()=>parseTranslation(packet,raw.replace('and recommended it.','and recommended it. -> [Checked]')),/Invalid paragraph/);
  assert.throws(()=>parseTranslation(packet,raw.replace('[[1]]','[[0]]\nSpeaker\n[[1]]')),/Wrong paragraph count/);
  assert.match(translationPrompt(packet).prompt,/1부터 2까지/);
  const named={request_id:'name',items:[{id:'one',celeb_id:'person',review:'그는 석호필(石虎弼)이라는 이름을 썼다.'}]};
  assert.equal(parseTranslation(named,'[[REQ:name]]\n[[1]]\nHe used the name Seok Ho-pil (石虎弼).\n[[CHECKED]]').items[0].checked,true);
});
test('accepts an inline numbered marker without merging or reassigning paragraphs',()=>{
  const text='[[REQ:sample]]\n[[1]] He read ⟪TITLE:1⟫ and recommended it.\n[[2]] The final paragraph must also be translated in full.\n[[CHECKED]]';
  assert.equal(parseTranslation(packet,text).items[0].review_en,'He read 『원제』 and recommended it.\n\nThe final paragraph must also be translated in full.');
  assert.throws(()=>parseTranslation(packet,text.replace('[[2]]','[[1]]')));
  assert.equal(parseTranslation(packet,text.replace('[[1]]','[[1]]\n[[1]]').replace('[[2]]','[[2]]\n[[2]]')).items[0].review_en,parseTranslation(packet,text).items[0].review_en);
});
test('can restore display-only line breaks inside a numbered source paragraph without accepting lost paragraphs',()=>{
  const raw='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫\n\nand recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';
  assert.throws(()=>parseTranslation(packet,raw),/Invalid paragraph/);
  const result=parseTranslation(packet,raw,{restoreParagraphLayout:true});
  assert.equal(result.items[0].review_en,'He read 『원제』\nand recommended it.\n\nThe final paragraph must also be translated in full.');
  assert.equal(result.paragraph_layout_restored,true);
  assert.throws(()=>parseTranslation(packet,raw.replace('[[2]]',''),{restoreParagraphLayout:true}),/Wrong paragraph count/);
});
test('keeps angle-bracketed book titles and separates recommendation speakers',()=>{
  const html='<span id="_ctl0_htmRecommend"><li><PD수첩>은 좋은 방송이다.<br>책도 추천한다.<div onmouseover="Recommend_1"> - 진중권 (평론가)<div><a href="/author/wauthor_recommend.aspx?AuthorSearch=@43697">다른 추천</a></div></div></li><li>다른 사람의 평<div onmouseover="Recommend_2"> - 손석희</div></li></span>';
  const result=extractRecommendations(html);
  assert.equal(result[0].text,'<PD수첩>은 좋은 방송이다.\n책도 추천한다.');
  assert.equal(result[0].speaker,'진중권 (평론가)');
  assert.equal(result[0].author_id,'43697');
  assert.equal(result.length,2);
});

test('independent text rows bind each speaker to its paragraph without changing the default person guard',()=>{const p={request_id:'independent',independent_rows:true,items:[{id:'a',celeb_id:'a',nickname_en:'Alice',review:'나는 그 책을 읽었다.'},{id:'b',celeb_id:'b',nickname_en:'Bob',review:'밥은 그 책을 추천했다.'}]};const prompt=translationPrompt(p).prompt;assert.match(prompt,/\"paragraph\":1,\"person\":\"Alice\"/);assert.match(prompt,/\"paragraph\":2,\"person\":\"Bob\"/);const r=parseTranslation(p,'[[REQ:independent]]\n[[1]]\nI read that book.\n[[2]]\nBob recommended that book.\n[[CHECKED]]');assert.equal(r.items[0].review_en,'I read that book.');assert.equal(r.items[1].review_en,'Bob recommended that book.');assert.throws(()=>translationPrompt({...p,independent_rows:false}),/new conversation/);});

test('can hold only a damaged item while retaining strict global paragraph bindings',()=>{const p={request_id:'isolated',items:[{id:'a',celeb_id:'p',review:'첫 추천평을 온전히 번역한다.'},{id:'b',celeb_id:'p',review:'두 번째 추천평을 온전히 번역한다.'}]};const raw='[[REQ:isolated]]\n[[1]]\nThe first review is fully translated.\n[[2]]\nThe second review contains ⟪TITLE:⟫.\n[[CHECKED]]';assert.throws(()=>parseTranslation(p,raw),/Unknown book title/);const r=parseTranslation(p,raw,{isolateItems:true});assert.equal(r.items[0].checked,true);assert.equal(r.items[1].checked,false);assert.equal(r.items[1].review_en,undefined);assert.throws(()=>parseTranslation(p,raw.replace('[[2]]','[[3]]'),{isolateItems:true}),/paragraph order/);});

test('a work-specific title overrides an ambiguous shared label without changing other rows',()=>{const p={...packet,title_translations:{'원제':'Shared Label'},items:[{...packet.items[0],title_translations:{'원제':'Verified Title for This Work'}}]};const raw='[[REQ:sample]]\n[[1]]\nHe read ⟪TITLE:1⟫ and recommended it.\n[[2]]\nThe final paragraph must also be translated in full.\n[[CHECKED]]';assert.match(parseTranslation(p,raw).items[0].review_en,/Verified Title for This Work/);assert.match(parseTranslation({...p,items:packet.items},raw).items[0].review_en,/Shared Label/);});

test('recognizes source Chinese characters encoded as numeric HTML entities without allowing new ones',()=>{
  const p={request_id:'entities',items:[{id:'a',celeb_id:'p',review:'독화법(讀&#30059;法)은 그림을 읽는 방법이라는 뜻이다.'}]};
  const raw='[[REQ:entities]]\n[[1]]\nDokhwabeop (讀畫法) means a method of reading paintings.\n[[CHECKED]]';
  assert.equal(parseTranslation(p,raw).items[0].checked,true);
  assert.equal(parseTranslation({...p,items:[{...p.items[0],review:p.items[0].review.replace('&#30059;','&#x756B;')}]},raw).items[0].checked,true);
  assert.throws(()=>parseTranslation(p,raw.replace('讀畫法','文學')),/Unexpected untranslated text/);
});
