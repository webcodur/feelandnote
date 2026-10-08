import assert from 'node:assert/strict'
import bookEditionWork from '../../src/lib/book-edition-work.ts'
const { verifiedOmnibusIsbn } = bookEditionWork
import test from 'node:test'
import { detectSplitSeries, numberedTitle } from './lib/series-audit.mjs'
import { parseSeriesAuditArgs, detectSeriesVolumeClutter } from './series-split-audit.mjs'

function catalog(rows, extra = {}) {
  return {
    contents: rows.map(row => ({ id: row.id, figureBook: row.figureBook ?? {}, referenceCounts: row.refs ?? {} })),
    locales: rows.map(row => ({ content_id: row.id, locale: 'ko', creator: '같은 저자', publisher: '출판사', ...row })),
    editions: [], relations: [], readings: [], people: [], ...extra,
  }
}
const scan = rows => detectSplitSeries(catalog(rows)).candidates

test('같은 제목의 다른 저자 판본은 한국어 카드와 대조해 검수 후보로 찾는다', async () => {
 const {detectEditionAttributionRisks}=await import('./lib/series-audit.mjs')
 const input=catalog([{id:'a',title:'블랙 하우스',creator:'스티븐 킹'}],{editions:[
  {id:1,content_id:'a',locale:'ko',title:'블랙하우스',creator:'피터 메이'},
  {id:2,content_id:'a',locale:'ko',title:'블랙 하우스',creator:'스티븐 킹, 피터 스트라우브'},
 ]})
 const result=detectEditionAttributionRisks(input)
 assert.deepEqual(result.map(row=>row.editionId),[1])
 assert.deepEqual(result[0].reasons,['korean_edition_card_creator_mismatch'])
})

test('하나로 합친 작품 안의 임의의 17·41권과 시작권 부재도 전수 탐지한다', () => {
 const series={title:'전략 삼국지',creator:'같은 저자',locale:'ko',sourceUrl:'https://publisher.example/series'}
 const input=catalog([{id:'one',title:'전략 삼국지',figureBook:{series}}],{editions:[17,41].map(number=>({
  id:number,content_id:'one',locale:'ko',title:`전략 삼국지 ${number}: 부제`,creator:'같은 저자',publisher:'AK',edition_kind:'volume',text_scope:`volume/${number}`,
 }))})
 const result=detectSeriesVolumeClutter(input)
 assert.equal(result.length,1);assert.equal(result[0].missingStart,true)
 assert.deepEqual(result[0].editions.map(e=>e.editionId),[17,41])
 input.editions.push({...input.editions[0],id:1,title:'전략 삼국지 1: 도원결의',text_scope:'volume/1'})
 assert.equal(detectSeriesVolumeClutter(input)[0].missingStart,false)
})

test('등록과 감사가 원작 키의 대소문자·URL·저장 위치 차이를 함께 정규화한다', () => {
 const {normalizeOpenLibraryWorkKey}=bookEditionWork
 for(const value of ['OL123W','/works/ol123w','https://openlibrary.org/works/OL123W/title','openlibrary:/works/OL123W','openlibrary:OL123W']) assert.equal(normalizeOpenLibraryWorkKey(value),'/works/OL123W')
 for(const value of ['OL123M','not-a-work',null]) assert.equal(normalizeOpenLibraryWorkKey(value),null)
 for(const field of ['workKey','openlibraryWorkKey','openLibraryWorkKey','openLibraryWork']) {
  const rows=[{id:'a',title:'한국어 표제',creator:'국내 표기',figureBook:{[field]:'https://openlibrary.org/works/ol123w/title'}},{id:'b',title:'Original title',creator:'Original author'}]
  const input=catalog(rows);input.contents[1].metadata={workKey:'OL123W'}
  assert.ok(detectSplitSeries(input).candidates[0].signals.includes('work-identity'))
 }
})

test('발췌 완역 오표시와 원전 아래 독립 해설을 잡되 국내 해설 자체의 완본은 유지한다', async () => {
 const {detectEditionAttributionRisks}=await import('./lib/series-audit.mjs')
 const input={contents:[{id:'original',figureBook:{workIdentity:'wikidata:q1'}},{id:'commentary',figureBook:{workIdentity:'book/9788935661596'}}],editions:[
  {id:1,content_id:'original',title:'원서발췌 고전',edition_kind:'full',text_scope:'complete'},
  {id:2,content_id:'original',title:'고전',edition_kind:'full',text_scope:'complete commentary organized around ten topics'},
  {id:3,content_id:'commentary',title:'고전 해설',edition_kind:'full',text_scope:'complete commentary organized around ten topics'},
  {id:4,content_id:'original',title:'고전',edition_kind:'selection',text_scope:'selection/16-sections'},
  {id:5,content_id:'original',title:'원전',edition_kind:'full',text_scope:'complete text with commentary'},
  {id:6,content_id:'original',title:'원전',edition_kind:'full',text_scope:'본문 전 42장(별도 발췌 부록 제외)'}]}
 const risks=detectEditionAttributionRisks(input)
 assert.deepEqual(risks.map(r=>r.editionId),[1,2])
 assert.ok(risks[0].reasons.includes('partial_text_claims_full_edition'))
 assert.ok(risks[1].reasons.includes('independent_text_attached_to_original'))
 input.contents.push({id:'selection',figureBook:{workTitle:'Selected philosophical writings'}})
 input.editions.push({id:7,content_id:'selection',title:'Selected philosophical writings',edition_kind:'full',text_scope:'complete'})
 assert.deepEqual(detectEditionAttributionRisks(input).map(r=>r.editionId),[1,2])
})

test('지원하지 않는 반영·다중 출력 인자는 DB 조회 전에 거부한다', () => {
  assert.equal(parseSeriesAuditArgs([]).out, null)
  assert.ok(parseSeriesAuditArgs(['--out','candidates.json']).out.endsWith('candidates.json'))
  for (const args of [['--apply'], ['--out'], ['unknown'], ['--out','--apply'], ['--out','a.json','--out','b.json']]) {
    assert.throws(()=>parseSeriesAuditArgs(args), /Usage/)
  }
})
test('일반 등록의 상위 메타 정체성과 큐레이션 정체성을 같은 색인에서 확인한다',()=>{
 const input=catalog([{id:'a',title:'서지 제목 가'},{id:'b',title:'서지 제목 나'}])
 input.contents[0].metadata={workIdentity:'book/9788937432118'}
 input.contents[1].figureBook={workIdentity:'book/9788937432118'}
 const candidate=detectSplitSeries(input).candidates[0]
 assert.ok(candidate.signals.includes('work-identity'))
 assert.deepEqual(candidate.works.map(w=>w.identity),['book/9788937432118','book/9788937432118'])
 input.contents[0].figureBook={workIdentity:'original/work-a'}
 assert.equal(detectSplitSeries(input).candidates.length,0)
})

test('원작 별칭이 일반 등록의 OpenLibrary 키와 겹치면 저자·표제 표기가 달라도 검수 후보로 잡는다', () => {
 const input=catalog([
  {id:'a',title:'알렉산더 해밀턴',creator:'론 체르노',figureBook:{workIdentity:'ron-chernow/alexander-hamilton',openLibraryWork:'/works/OL2665176W'}},
  {id:'b',title:'Alexander Hamilton',creator:'론 처노'},
 ])
 input.contents[1].metadata={workKey:'/works/OL2665176W',workIdentity:'book/9780143034759'}
 const candidate=detectSplitSeries(input).candidates[0]
 assert.deepEqual(candidate.signals,['work-identity'])
 assert.equal(candidate.evidence[0].key,'openlibrary:/works/ol2665176w')
 input.contents[1].metadata.workIdentity='other-original/hamilton'
 assert.ok(detectSplitSeries(input).candidates[0].warnings.includes('different_original_work_identities'))
 input.contents[1].metadata.workKey='/works/OL999W'
 assert.equal(detectSplitSeries(input).candidates.length,0)
})

test('그림피아노의 곡별 작품 분리를 잡고 이미 묶인 내부 판본은 제외한다', () => {
  const rows = [
    { id: 'a', title: '그림피아노: 아이유 금요일에 만나요' },
    { id: 'b', title: '그림피아노: 아이유 High4 - 봄 사랑 벚꽃 말고' },
  ]
  assert.ok(scan(rows)[0].signals.includes('subtitle-series'))
  const grouped = catalog([rows[0]], { editions: rows.map(row => ({ ...row, content_id: 'a', locale: 'ko', creator: '같은 저자', publisher: '출판사' })) })
  assert.deepEqual(detectSplitSeries(grouped).candidates, [])
})

test('권수·상하권·영문 권수·복합 권수·괄호 부제를 읽고 표제 내부 숫자는 보존한다', () => {
  for (const [title, stem, part] of [
    ['장길산 10권', '장길산', '10'], ['견훤. (하)', '견훤', '하'],
    ['서시 범려 열전 제3권', '서시 범려 열전', '3'],
    ["Naoki Urasawa's Monster, Vol. 13", "Naoki Urasawa's Monster", '13'],
    ['당송팔대가문초 구양수 1-2', '당송팔대가문초 구양수', '1-2'],
    ['그리스 로마 신화 16(마법사 여신 키르케)(만화로보는)', '그리스 로마 신화', '16'],
    ['오비디우스 변신 이야기 10권, 사랑의 비극', '오비디우스 변신 이야기', '10'],
    ['삼국지연의 중국어 학습본 - 제 12화 관우의 약속', '삼국지연의 중국어 학습본', '12'],
    ['삼국지연의 중국어 학습본 - 제 42화 맹획을 일곱 번 사로잡다 (중)', '삼국지연의 중국어 학습본', '42'],
    ['삼국지연의 중국어 학습본 - 제 41화 맹획을 일곱 번 사로잡다 상', '삼국지연의 중국어 학습본', '41'],
  ]) assert.deepEqual(numberedTitle(title), { title, stem, part })
  for (const title of ['1984', '1Q84', '제2차 세계대전', '역사 2024', '451도 화씨']) assert.equal(numberedTitle(title), null)
})

test('권수 없는 대표 제목을 후속권과 찾고 같은 권만 중복된 경우 시리즈 분리로 단정하지 않는다', () => {
  assert.ok(scan([{id:'a',title:'환웅의 검'}, {id:'b',title:'환웅의 검. 2'}])[0].signals.includes('numbered-series'))
  assert.deepEqual(scan([{id:'a',title:'환웅의 검. 2'}, {id:'b',title:'환웅의 검. 2'}])[0].signals, ['same-title'])
})

test('같은 표제·출판사라도 저자 표기가 다른 권은 확인 경고를 붙인다', () => {
  const found = scan([
    {id:'a',title:'올림포스 가디언 12: 사냥꾼',creator:'주니어RHK 편집부'},
    {id:'b',title:'올림포스 가디언 48: 마녀',creator:'알에이치코리아 편집부'},
  ])
  assert.deepEqual(found[0].signals, ['numbered-series-creator-variant'])
  assert.ok(found[0].warnings.includes('creator_variants'))
  assert.deepEqual(scan([{id:'a',title:'역사 1',creator:'갑',publisher:'가'}, {id:'b',title:'역사 2',creator:'을',publisher:'나'}]), [])
})

test('ISBN-10·13과 서식 차이를 정규화하고 체크 숫자가 틀린 코드는 제외한다', () => {
  const found = scan([{id:'a',title:'다른 제목 가',isbn:'0-7432-7356-7'}, {id:'b',title:'다른 제목 나',isbn:'9780743273565'}])
  assert.ok(found[0].signals.includes('shared-isbn'))
  assert.deepEqual(scan([{id:'a',title:'다른 제목 가',isbn:'9780743273564'}, {id:'b',title:'다른 제목 나',isbn:'9780743273564'}]), [])
})

test('실제 판본 대신 표시용 번역 제목끼리 닮은 경우 제외한다', () => {
  const result = detectSplitSeries(catalog([{id:'a',title:'같은 제목',sources:{primary:'none',title:'translated'}}, {id:'b',title:'같은 제목',sources:{primary:'none',title:'translated'}}]))
  assert.deepEqual(result.candidates, [])
  assert.equal(result.diagnostics.skippedDisplayTitles, 2)
})

test('해설서·워크북·합본·별도 원작 식별자를 자동 통합 근거로 삼지 않는다', () => {
  const found = scan([
    {id:'a',title:'세계 역사: 원전',figureBook:{workIdentity:'author/history'}},
    {id:'b',title:'세계 역사: 해설 워크북 세트',figureBook:{workIdentity:'author/workbook'}},
  ])
  assert.ok(found[0].warnings.includes('independent_editing_or_commentary'))
  assert.ok(found[0].warnings.includes('collection_or_set'))
  assert.ok(found[0].warnings.includes('different_original_work_identities'))
})

test('ISBN이 겹친 영문 판본 밖의 한국어 세트도 확인 경고에 반영한다', () => {
  const result = detectSplitSeries(catalog([{id:'a',title:'헤세 대표작 세트'}, {id:'b',title:'황야의 이리'}], {
    editions:[{content_id:'a',locale:'en',title:'Steppenwolf',isbn:'9780141192093'}, {content_id:'b',locale:'en',title:'Steppenwolf',isbn:'9780141192093'}],
  }))
  assert.ok(result.candidates[0].warnings.includes('collection_or_set'))
})

test('서로 다른 실제 영문 제목을 남기고 검수된 시리즈의 제목 경계를 공유한다', () => {
  const series = {title:'아카데미',creator:'같은 저자',locale:'ko',sourceUrl:'https://example.com/series'}
  const result = detectSplitSeries(catalog([
    {id:'a',title:'아카데미',figureBook:{series}}, {id:'b',title:'아카데미: 두 번째 이야기'}, {id:'c',title:'아카데미아'},
  ], { editions:[{content_id:'a',locale:'en',title:'Academy',creator:'Author'}, {content_id:'b',locale:'en',title:'Another Academy',creator:'Author'}] }))
  const match = result.candidates.find(row=>row.signals.includes('registered-series'))
  assert.deepEqual(match.contentIds, ['a','b'])
  assert.ok(match.warnings.includes('different_english_titles'))
})

test('공통어만 닮은 후보에는 공통 인물과 출판사가 필요하며 더 구체적인 후보의 일부는 다시 출력하지 않는다', () => {
  const rows = [{id:'a',title:'거짓의 프레이야 1'},{id:'b',title:'거짓의 프레이야 2'},{id:'c',title:'거짓의 프레이야 3',publisher:'다른출판사'}]
  const result = detectSplitSeries(catalog(rows, { relations:rows.map(row=>({content_id:row.id,celeb_id:'person'})), people:[{id:'person',nickname:'인물'}] }))
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].sharedPeople[0].count, 3)
  assert.equal(result.diagnostics.suppressed.redundantPrefixGroups, 1)
  assert.deepEqual(scan([{id:'a',title:'누구나 읽는 역사 이야기'},{id:'b',title:'누구나 읽는 철학 이야기'}]), [])
})

test('겹치는 ISBN 집합을 전이적으로 통합하지 않고 추적 근거·기존 기록 수를 남긴다', () => {
  const rows = [{id:'a',title:'책가',isbn:'9780743273565',refs:{member_contents:2}}, {id:'b',title:'책나',isbn:'9780743273565'}, {id:'c',title:'책다',isbn:'9780593098240'}]
  const result = detectSplitSeries(catalog(rows,{editions:[{content_id:'b',locale:'en',title:'Book B',isbn:'9780593098240'}]}))
  assert.deepEqual(result.candidates.map(row=>row.contentIds), [['a','b'],['b','c']])
  assert.equal(result.candidates[0].works[0].referenceCounts.member_contents, 2)
})

test('작품에 판본이 여러 개 있어도 일관되게 한 후보로 모으고 입력 순서에 영향받지 않는다', () => {
  const rows = [{id:'a',title:'같은 책',isbn:'9780743273565'}, {id:'b',title:'같은 책',isbn:'9780743273565'}]
  assert.equal(scan(rows).length, 1)
  assert.deepEqual(scan(rows)[0].signals, ['shared-isbn','same-title'])
  assert.deepEqual(scan(rows), scan([...rows].reverse()))
})

test('5만 작품의 색인 검사에서도 고립된 제목은 후보로 부풀리지 않는다', () => {
  const rows = Array.from({length:50000}, (_,i)=>({id:String(i).padStart(8,'0'),title:`단독도서${String(i).padStart(5,'0')}끝`,creator:`저자${i}`}))
  const result = detectSplitSeries(catalog(rows))
  assert.equal(result.diagnostics.indexedVariants, 50000)
  assert.deepEqual(result.candidates, [])
})
test('목차로 확인한 합본은 모든 현재 소유 작품·저자·범위가 일치할 때만 중복 ISBN 경고를 접는다',()=>{
 const isbn='9788949717937',owners=['a','b'],works=owners.map(id=>({id,type:'BOOK',metadata:{figureBook:{workTitle:id+' original',workCreator:id+' author',workIdentity:'author/'+id}}})),contained=works.map(w=>({content_id:w.id,title:w.metadata.figureBook.workTitle,creator:w.metadata.figureBook.workCreator,work_identity:w.metadata.figureBook.workIdentity,text_scope:'chapters/'+w.id}))
 const editions=works.map(w=>({content_id:w.id,id:w.id,locale:'ko',isbn,title:'합본',creator:'공동 저자',edition_kind:'selection',text_scope:'chapters/'+w.id,sources:{edition_work_evidence:[{method:'independent_omnibus_review',content_id:w.id,locale:'ko',isbn,edition_title:'합본',edition_creator:'공동 저자',original_title:w.metadata.figureBook.workTitle,original_creator:w.metadata.figureBook.workCreator,work_identity:w.metadata.figureBook.workIdentity,edition_kind:'selection',text_scope:'chapters/'+w.id,source_url:'https://library.example/toc',toc_source_url:'https://library.example/toc',reviewed_at:'2026-10-07T00:00:00Z',owner_content_ids:owners,contained_originals:contained}]}}))
 assert.equal(verifiedOmnibusIsbn(isbn,owners,works,[],editions),true)
 assert.equal(verifiedOmnibusIsbn(isbn,[...owners,'c'],works,[],editions),false)
 const original=works[0].metadata.figureBook.workCreator;works[0].metadata.figureBook.workCreator='wrong';assert.equal(verifiedOmnibusIsbn(isbn,owners,works,[],editions),false);works[0].metadata.figureBook.workCreator=original
 editions[0].text_scope='complete';assert.equal(verifiedOmnibusIsbn(isbn,owners,works,[],editions),false)
})
test('붙은 권수와 완결 뒤 부제, 부분 세트 범위를 실제 표제에서 읽는다',async()=>{
 const {numberedTitle,seriesSetTitle}=await import('./lib/series-audit.mjs')
 assert.equal(numberedTitle('미야모토 무사시 (검성)7').part,'7')
 assert.equal(numberedTitle('오비디우스 변신 이야기 15권(완결), 로마 신화와 제국의 탄생').stem,'오비디우스 변신 이야기')
 assert.deepEqual(seriesSetTitle('유비 세트(3-4권)'),{stem:'유비',scope:'volumes/3-4'})
 assert.deepEqual(seriesSetTitle('천룡팔부 세트(재판)(전10권)'),{stem:'천룡팔부',scope:'volumes/1-10'})
 assert.deepEqual(seriesSetTitle('도요토미 히데요시(5권 세트)(전5권)'),{stem:'도요토미 히데요시',scope:'volumes/1-5'})
})

test('작품이 한 행뿐이어도 다른 영문 저자·학습서 출판사·분권의 전권 오표시를 추적한다', async () => {
 const {detectEditionAttributionRisks}=await import('./lib/series-audit.mjs')
 const input={contents:[{id:'one',figureBook:{workCreator:'Spencer Johnson'}}],editions:[
  {id:1,content_id:'one',locale:'en',creator:'Erving Goffman',title:'The Present',publisher:'Cram101 Textbook Reviews'},
  {id:2,content_id:'one',locale:'ko',creator:'스펜서 존슨',title:'선물 2',edition_kind:'full',text_scope:'complete'},
  {id:3,content_id:'one',locale:'ko',creator:'스펜서 존슨',title:'선물',edition_kind:'full',text_scope:'complete'}]}
 const rows=detectEditionAttributionRisks(input)
 assert.deepEqual(rows.map(row=>row.editionId),[1,2])
 assert.ok(rows[0].reasons.includes('english_edition_original_creator_mismatch'))
 assert.ok(rows[0].reasons.includes('study_guide_publisher_requires_independent_work_review'))
 assert.equal(rows[1].reasons[0],'numbered_edition_claims_complete_text')
})

test('한영 병기 크레딧의 다른 저자도 잡고 동일 저자가 포함된 공동 크레딧은 유지한다', async () => {
 const {detectEditionAttributionRisks}=await import('./lib/series-audit.mjs')
 const rows=detectEditionAttributionRisks({contents:[{id:'one',figureBook:{workCreator:'Ecke Bonk'}}],editions:[
  {id:1,content_id:'one',locale:'en',creator:'Robert Lebel, 로베르 르벨',title:'Marcel Duchamp'},
  {id:2,content_id:'one',locale:'en',creator:'Ecke Bonk, Marcel Duchamp',title:'Marcel Duchamp'},
  {id:3,content_id:'one',locale:'en',creator:'편집부',title:'Marcel Duchamp'}]})
 assert.deepEqual(rows.map(row=>row.editionId),[1])
})

test('전수 출력도 현재 DB를 읽으며 기본값으로 원장을 만들지 않는다',()=>{
 assert.deepEqual(parseSeriesAuditArgs(['--all']),{out:null,all:true});
 assert.equal(parseSeriesAuditArgs(['--out','review.json','--all']).all,true);
 assert.throws(()=>parseSeriesAuditArgs(['--all','--all']),/Usage/);
});


test('ISBN별 출처에 남은 원작 키로 저자 표기·부제가 다른 중복을 놓치지 않되 자동 확정하지 않는다', () => {
 const c=catalog([{id:'a',title:'Elon Musk',creator:'애슐리 반스'},{id:'b',title:'Elon Musk: Tesla and SpaceX',creator:'Ashlee Vance'}])
 c.locales=[]
 c.editions=[
  {id:1,content_id:'a',locale:'en',title:'Elon Musk',creator:'애슐리 반스',isbn:'9780062301239',sources:{primary:'openlibrary',workKey:'/works/OL17184556W'}},
  {id:2,content_id:'b',locale:'en',title:'Elon Musk: Tesla and SpaceX',creator:'Ashlee Vance',isbn:'9780062301253',edition_kind:'abridged',text_scope:'graded reader',sources:{primary:'openlibrary',workKey:'/works/OL17184556W'}},
 ]
 const finding=detectSplitSeries(c).candidates[0]
 assert.ok(finding.signals.includes('provider-work-key'))
 assert.equal(finding.works[1].editions[0].editionKind,'abridged')
 assert.equal(finding.sourceReview,undefined)
 c.editions[1].sources.primary='none'
 assert.equal(detectSplitSeries(c).candidates.length,0)
})


test('판매 표제에 붙은 출간일을 권 번호로 읽지 않는다',()=>{
 assert.equal(numberedTitle('The Winner Stands Alone [Paperback] [Jan 01, 2009] Paulo Coelho'),null)
 assert.equal(numberedTitle('The Winner Stands Alone [January 1, 2009]'),null)
 assert.equal(numberedTitle('The Winner Stands Alone, Vol. 2')?.part,'2')
})
