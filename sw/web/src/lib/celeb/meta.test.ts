import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCelebDescriptionEn, buildCelebDescriptionKo, buildCelebTitleEn, buildCelebTitleKo, estimateTitleWidth, formatCelebRecordCounts, rankRecordTypes, type CelebMetaInput } from './meta';
const emptyCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 };
const billGates: CelebMetaInput = { nickname: '빌 게이츠', title: 'MS 설립', headline: '윈도우를 PC 표준으로 키운 마이크로소프트 공동창업자', headline_en: 'The Microsoft co-founder who drove Windows to PC dominance', counts: { BOOK: 177, VIDEO: 13, MUSIC: 73, GAME: 5 }, bio: '마이크로소프트 공동 창업자. 개인용 컴퓨터 소프트웨어 혁명을 이끌었다.' };
test('records rank by count, then media order', () => {
 assert.deepEqual(rankRecordTypes(billGates.counts), ['BOOK','MUSIC','VIDEO','GAME']);
 assert.deepEqual(rankRecordTypes({...emptyCounts, VIDEO:2,GAME:2}), ['VIDEO','GAME']);
 assert.deepEqual(formatCelebRecordCounts(billGates.counts,'ko'), ['책 177권','음악 73곡','영상 13편','게임 5개']);
 assert.deepEqual(formatCelebRecordCounts({...emptyCounts,BOOK:1,MUSIC:1200},'en'), ['1,200 songs','1 book']);
});
test('record titles preserve identity, particles, counts and width', () => {
 assert.equal(buildCelebTitleKo(billGates),'빌 게이츠(MS 설립)가 감상한 책 177권·음악 73곡·영상 13편');
 assert.equal(buildCelebTitleKo({...billGates,nickname:'젠슨 황',title:'엔비디아 설립',counts:{...emptyCounts,BOOK:5,GAME:1}}),'젠슨 황(엔비디아 설립)이 감상한 책 5권·게임 1개');
 assert.equal(buildCelebTitleKo({...billGates,nickname:'빅토르 위고',title:'「레미제라블」',counts:{...emptyCounts,BOOK:9,MUSIC:3}}),'빅토르 위고(「레미제라블」)가 감상한 책 9권·음악 3곡');
 assert.equal(buildCelebTitleEn({...billGates,nickname:'Bill Gates',title:'Microsoft Founder'}),'Bill Gates (Microsoft Founder): 177 Books Read');
 assert.equal(buildCelebTitleEn({...billGates,nickname:'Bill Gates',title:null}),'Bill Gates: 177 Books Read & 73 Songs Heard');
 assert.equal(buildCelebTitleKo({...billGates,title:'아주 긴 수식어를 가진 인물의 칭호'}),'빌 게이츠(아주 긴 수식어를 가진 인물의 칭호)가 감상한 책 177권');
 assert.ok(estimateTitleWidth(buildCelebTitleKo(billGates))<=30);
});
test('record presence alone decides titles across all tiers and realities', () => {
 for(const tier of ['light','full'] as const) for(const reality of ['REAL','BOTH','FICTION'] as const){
  const input={...billGates,tier,reality};
  assert.equal(buildCelebTitleKo(input),buildCelebTitleKo(billGates),tier+'/'+reality);
  assert.equal(buildCelebTitleEn(input),buildCelebTitleEn(billGates),tier+'/'+reality);
  assert.equal(buildCelebTitleKo({...input,counts:emptyCounts}),'빌 게이츠, '+billGates.headline);
  assert.equal(buildCelebTitleEn({...input,counts:emptyCounts,nickname:'Bill Gates',title:null}),'Bill Gates: '+billGates.headline_en);
 }
});
test('one or two records hide title numbers',()=>{
 const input={...billGates,counts:{...emptyCounts,BOOK:1,VIDEO:1}};
 assert.equal(buildCelebTitleKo(input),'빌 게이츠(MS 설립)의 책·영상 감상 기록');
 assert.equal(buildCelebTitleEn({...input,nickname:'Bill Gates',title:'Microsoft Founder'}),'Bill Gates (Microsoft Founder): Books Read & Videos Watched');
});
test('all figures use the complete bio rather than headlines, guides or works',()=>{
 const bio='직장인 익명 커뮤니티 블라인드를 만든 팀블라인드 창업자 겸 CEO. 윙버스를 창업해 네이버에 매각했고, 네이버와 티몬을 거쳐 2013년 블라인드를 출시해 글로벌 서비스로 키웠다.';
 const english='A software entrepreneur. '+ 'His work shaped personal computing and supported public health research. '.repeat(4).trim();
 for(const tier of ['light','full'] as const) for(const reality of ['REAL','BOTH','FICTION'] as const) for(const counts of [emptyCounts,billGates.counts]){
  const input={...billGates,tier,reality,counts,bio,guide:'인물 안내는 대체값이다.'};
  assert.equal(buildCelebDescriptionKo(input),bio,tier+'/'+reality);
  assert.equal(buildCelebDescriptionEn({...input,bio:english}),english);
 }
});
test('missing bio uses the whole guide without sentence or width truncation',()=>{
 const guide='인물 안내 첫 문장이다. '+ '다음 문장도 인물의 활동을 설명한다. '.repeat(15).trim();
 const english='The guide starts here. Another sentence explains the work. '.repeat(6).trim();
 for(const bio of [null,'','   ']){
  assert.equal(buildCelebDescriptionKo({...billGates,bio,guide}),guide);
  assert.equal(buildCelebDescriptionEn({...billGates,bio,guide:english}),english);
 }
});
test('descriptions normalize whitespace and punctuation without adding facts',()=>{
 assert.equal(buildCelebDescriptionKo({...billGates,bio:'  한국의 영화감독.\n\n여러 작품을 연출했다.  '}),'한국의 영화감독. 여러 작품을 연출했다.');
 assert.equal(buildCelebDescriptionEn({...billGates,bio:'American filmmaker'}),'American filmmaker.');
});
test('missing headline falls back to an appearance, title, then name',()=>{
 const input:CelebMetaInput={nickname:'아킬레우스',title:'트로이 전쟁의 영웅',counts:emptyCounts,sourceWorks:[{title:'《일리아스》',relationType:'appearance',sourceRank:0},{title:'다시 쓴 이야기',relationType:'appearance',sourceRank:3}]};
 assert.equal(buildCelebTitleKo(input),'아킬레우스, 《일리아스》의 등장인물');
 assert.equal(buildCelebTitleEn({...input,nickname:'Achilles',sourceWorks:[{title:'The Iliad',relationType:'appearance'}]}),'Achilles in the Iliad');
 assert.equal(buildCelebTitleKo({...input,sourceWorks:[{title:'저작',relationType:'authored'}]}),'아킬레우스, 트로이 전쟁의 영웅');
 assert.equal(buildCelebTitleKo({...input,sourceWorks:[],title:null}),'아킬레우스');
});
test('no bio or guide uses identity without fabricated content',()=>{
 assert.equal(buildCelebDescriptionKo({nickname:'인물',title:null,counts:emptyCounts}),'인물.');
 assert.equal(buildCelebDescriptionEn({nickname:'Figure',title:'Writer',counts:emptyCounts}),'Figure: Writer.');
});
