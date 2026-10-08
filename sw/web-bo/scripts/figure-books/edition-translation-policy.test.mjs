import test from 'node:test'
import assert from 'node:assert/strict'
import { planEditionTranslations, sameOfficialKakaoEdition } from './lib/edition-translation-policy.mjs'
import { excludedBookEditionReason, bookTranslatorKey } from '../../../../packages/content-search/src/book-edition-policy.ts'
import { wikidataOriginalLanguage, translationRepairSql } from './edition-translation-audit.mjs'
import { wikipediaBookLanguage } from './lib/edition-original-language-research.mjs'
const row=(id,translator,extra={})=>({id,content_id:'odyssey',locale:'ko',title:'오디세이아',creator:'호메로스',isbn:String(id),sources:translator?{translators:[translator]}:{},...extra})
const catalog=editions=>({contents:[{id:'odyssey',figureBook:{}}],editions,locales:[],products:[]})
test('작품 하나 아래 역자마다 한 판본을 남기며 ISBN·출판사·분량은 추가 판본 기준이 아니다',()=>{
 const c=catalog([row(1,'천병희'),row(2,'천병희',{publisher:'다른 출판사',text_scope:'complete translation'}),row(3,'김헌'),row(4,'임명현')])
 const plan=planEditionTranslations(c)
 assert.deepEqual(plan.duplicates.map(group=>({keep:group.keep.id,drops:group.drops.map(r=>r.id)})),[{keep:1,drops:[2]}])
 assert.equal(plan.unresolved.length,0)
})
test('역자가 미상인 서로 다른 상품을 같은 번역으로 추정하지 않는다',()=>{
 assert.equal(planEditionTranslations(catalog([row(1,null),row(2,null)])).duplicates.length,0)
 assert.equal(planEditionTranslations(catalog([row(1,null),row(2,null)])).unresolved.length,2)
})
test('축약·요약·발췌·학습용 리더는 판본 종류 누락과 상세 전체 조회 여부에도 배제된다',()=>{
 for(const title of ['Penguin Readers Level 3: Elon Musk','Oxford Bookworms 1','원서발췌 성 앙투안의 유혹','마리 퀴리(요약본)','인스타리드 리처드 도킨스의 만들어진 신','Outlines and Highlights for The Presentation of Self']) assert.ok(excludedBookEditionReason({title}))
 assert.equal(excludedBookEditionReason({sources:{primary:'none',title:'display_only'}}),'display_only')
 assert.equal(excludedBookEditionReason({isbn:null,sources:{primary:'kakao_book',title:'kakao_title_search'}}),'unverified_placeholder')
 assert.equal(excludedBookEditionReason({isbn:null,sources:{primary:'kakao_book',title:'https://search.daum.net/search?w=bookpage&bookId=223222'}}),null)
 assert.equal(excludedBookEditionReason({isbn:null,publisher:null,sources:{primary:'manual-research',description:'https://en.wikipedia.org/wiki/The_Bells_(poem)'}}),'unverified_placeholder')
 assert.equal(excludedBookEditionReason({isbn:null,publisher:'실제 고서 출판사',sources:{primary:'manual-research'}}),null)
 assert.equal(excludedBookEditionReason({title:'Elon Musk Unabridged'}),null)
 assert.equal(excludedBookEditionReason({title:'죽은 혼',isbn:'9788952240217',sources:{provider_edition_title:'죽은 혼(진형준 교수의 세계문학컬렉션 35)',provider_edition_isbn:'9788952240217'}}),'abridged')
 assert.equal(excludedBookEditionReason({providerDescription:'세계문학 축역본의 정본 컬렉션 제40권 아버지와 아들'}),'abridged')
 for(const providerDescription of ['헨리 5세를 65% 발췌로 번역, 소개한다.','버턴판의 반복되는 부분을 덜어내 더욱 짜임새 있게 축약했다.','한 품도 빠뜨리지 않고 그 요지를 간추렸으며 전품을 소개했다.','세계명작다이제스트 시리즈 Sheet eBook']) assert.equal(excludedBookEditionReason({providerDescription}),'abridged')
 assert.equal(excludedBookEditionReason({providerDescription:'축약 여부 미확인'}),null)
 assert.equal(excludedBookEditionReason({title:'독립 선집',editionKind:'selection'}),null)
 assert.equal(planEditionTranslations(catalog([row(1,'김헌',{edition_kind:'abridged'})])).excluded.length,1)
})
test('같은 번역의 분권은 시작권만 대표하며 시작권 미상은 임의로 선택하지 않는다',()=>{
 const editions=[row(8,'천병희',{title:'오디세이아 8',edition_kind:'volume',text_scope:'volume/8'}),row(1,'천병희',{title:'오디세이아 1',edition_kind:'volume',text_scope:'volume/1'})]
 assert.deepEqual(planEditionTranslations(catalog(editions)).excluded.map(({row})=>row.id),[8])
 assert.equal(planEditionTranslations(catalog(editions)).duplicates.length,0)
 assert.equal(planEditionTranslations(catalog(editions.slice(0,1))).duplicates.length,0)
})

test('작품 귀속이 확인된 같은 번역은 공저·역자 크레딧 표기로 추가 판본을 만들지 않는다',()=>{
 const c=catalog([row(1,'천병희'),row(2,'천병희',{creator:'호메로스, 천병희 옮김'})])
 assert.equal(planEditionTranslations(c).duplicates.length,1)
})
test('역자명의 공백·이니셜 마침표·아포스트로피 표시는 같은 번역 키다',()=>{
 assert.equal(bookTranslatorKey(['J. H. Jackson']),bookTranslatorKey(['J H Jackson']))
 assert.equal(bookTranslatorKey(["O’Neill"]),bookTranslatorKey(["O'Neill"]))
 assert.equal(bookTranslatorKey(['.']),null)
})
test('축약 여부 미확인·축약판이 아님·발췌 부록 제외는 축약의 확인 근거가 아니다',()=>{
 for(const textScope of ['Audio CD; abridgement status not verified','축약 여부 미확인','원작 첫 권이며 축약판이 아니다','본문 전 42장(발췌 부록 제외)','Unabridged library edition 무축약 판본']) assert.equal(excludedBookEditionReason({textScope}),null)
 for(const textScope of ['selection/abridged/volume/1','two-percent-original-extract','selection/approximately-35-percent','발췌·요약 단권']) assert.ok(excludedBookEditionReason({textScope}))
 for(const textScope of ['standalone original novella; Chinese literature series volume 2','Volume 1: text; Volume 2 has a separate ISBN','volume/book/1','『원피스』 제1권; 전체 시리즈 중 해당 권의 본문']) assert.equal(excludedBookEditionReason({textScope}),null)
 for(const textScope of ['volume/022','loeb-volume-3','selection/volume/7/english-translation','volume/book/3','『원피스』 제41권; 전체 시리즈 중 해당 권의 본문','한국어 번역 분권 하권(전 2권 중 2권)','원작 분권 2권(전 2권 중 2권)','제4권 The Hinge of Fate. 처칠의 6권짜리 원작 중 한 권','Part III: Of a Christian Common-Wealth','Volume IV of V','Wei Zhi, volume 3 of 4; original Wei chapters 13-21']) assert.equal(excludedBookEditionReason({textScope}),'nonstart_volume')
})
test('위키데이터의 원문 언어 우선순위를 따르고 번역 언어를 원문으로 합치지 않는다',()=>{
 const claim=(id,rank='normal')=>({rank,mainsnak:{datavalue:{value:{id}}}})
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q1860','preferred'),claim('Q9176')]}),'en')
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q1860'),claim('Q9176')]}),null)
 assert.equal(wikidataOriginalLanguage({P364:[claim('Q9176')],P407:[claim('Q1860')]}),'ko')
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q7979')]}),'en')
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q1860'),claim('Q7979')]}),'en')
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q7979'),claim('Q9176')]}),null)
 assert.equal(wikidataOriginalLanguage({P407:[claim('Q7979'),claim('Q7737')]}),null)
 assert.equal(wikidataOriginalLanguage({}),null)
})
test('원문 언어가 빠진 작품은 인물과 연결된 도서 정보상자의 단일 언어만 보완한다',()=>{
 assert.equal(wikipediaBookLanguage('{{Infobox book\n| language = [[English language|English]]\n| author = author\n}}'),'en')
 assert.equal(wikipediaBookLanguage('{{Infobox book\n| language = English, German\n}}'),null)
 assert.equal(wikipediaBookLanguage('{{Infobox person\n| language = English\n}}'),null)
})

test('부모 작품명 뒤의 본문 권 번호를 확인하되 독립 작품·총서 번호·전권 합본은 보존한다',()=>{
 for (const title of ['Naruto, Vol. 14','The Journey to the West, Revised Edition, Volume 3','Don Quixote: Part 2']) assert.equal(excludedBookEditionReason({title,reviewedSeries:true,workTitles:['Naruto','Journey to the West','Don Quixote']}),'nonstart_volume')
 for (const title of ['Journey to the West, Volume 1','Middlemarch: Part 1 & Part 2','Guardians of the Galaxy Vol. 2 Official Guide','The Sickness Unto Death (Writings, Vol 19)','A Treatise of Human Nature: Volume 2: Editorial Material','Works of John Ruskin: Volume 8, The Seven Lamps of Architecture','Isis Rising: Book 5 in the Establishment Series']) assert.equal(excludedBookEditionReason({title,workTitles:['Journey to the West','Middlemarch',title]}),null)
})

test('공식 제목의 총서 표기는 같은 ISBN의 역자 조회를 막지 않으며 다른 ISBN·작품은 배제한다',()=>{
 const saved={title:'헨리 8세',isbn:'9788955067125'},official={title:'헨리 8세(한국셰익스피어학회 작품총서 21)',metadata:{isbn:'9788955067125',translators:['김라옥']}}
 assert.equal(sameOfficialKakaoEdition(saved,official),true)
 assert.equal(sameOfficialKakaoEdition({...saved,isbn:'9788934971016'},official),false)
 assert.equal(sameOfficialKakaoEdition({...saved,title:'별도 작품'},official),false)
 assert.equal(excludedBookEditionReason({title:'일론 머스크',isbn:'9788934971016',sources:{provider_edition_title:'Penguin Readers Level 3: Elon Musk',provider_edition_isbn:'9788934971016'}}),'graded_reader')
 assert.equal(excludedBookEditionReason({title:'일론 머스크',isbn:'9788934971016',sources:{provider_edition_title:'Penguin Readers Level 3: Elon Musk',provider_edition_isbn:'다른 ISBN'}}),null)
})

test('같은 ISBN 공식 메타가 영문 원서라고 확인한 상품은 한국어 판본으로 쓰지 않는다',()=>{
 const book={title:'설득',isbn:'9788934971016',sources:{provider_edition_isbn:'9788934971016',provider_edition_title:'설득 (영문원서-제인 오스틴)'}}
 assert.equal(excludedBookEditionReason({...book,locale:'ko'}),'wrong_locale')
 assert.equal(excludedBookEditionReason({...book,locale:'en'}),null)
 assert.equal(excludedBookEditionReason({...book,locale:'ko',sources:{...book.sources,provider_edition_title:'영어 원서와 번역을 함께 읽기'}}),null)
 assert.equal(excludedBookEditionReason({locale:'ko',title:'설득 (영어 원서 - 제인 오스틴)'}),'wrong_locale')
 for(const title of ['문학평전 1 [영어원서] (문학평전 1)','교훈집 / Plutarch\'s Morals 영문판','짜라투스투라는 이렇게 말했다 - 고품격 시청각 영문판','하이아워서의 노래 | 영문판 |']) assert.equal(excludedBookEditionReason({locale:'ko',title}),'wrong_locale')
 for(const title of ['영어 원서와 번역을 함께 읽기','영문판 출간의 역사','영문원서를 읽는 법']) assert.equal(excludedBookEditionReason({locale:'ko',title}),null)
 assert.throws(()=>translationRepairSql({duplicates:[],excluded:[{row:book,reason:'wrong_locale'}]},{}),/must not be deleted/)
})

test('본문 제목에서 숨겨진 공식 Penguin Reader 총서도 정규 판본에서 제외한다',()=>{
 assert.equal(excludedBookEditionReason({title:'Doctor Zhivago',sources:{provider_scope_description:'Penguin Reader , Level 5 (2300 words)'}}),'graded_reader')
 assert.equal(excludedBookEditionReason({title:'Doctor Zhivago',providerDescription:'Readers discuss the original novel'}),null)
})

test('공식 본문 범위의 로마 숫자 분권과 Loeb 중간 권도 첫 권 대표에 추가하지 않는다',()=>{
 for(const textScope of ['The Story of the Stone, volume IV of V: The Debt of Tears','Enneads VI.1–5; volume 6 of the Loeb Classical Library translation']) assert.equal(excludedBookEditionReason({title:'고전',textScope}),'nonstart_volume')
 for(const textScope of ['Complete edition, volumes I through V','Han Dynasty, revised edition, volume 1; translated by Burton Watson']) assert.equal(excludedBookEditionReason({title:'고전',textScope}),null)
})
