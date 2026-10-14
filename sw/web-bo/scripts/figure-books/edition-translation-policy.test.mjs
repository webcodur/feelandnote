import test from 'node:test'
import assert from 'node:assert/strict'
import { isOriginalEdition, planEditionTranslations, sameOfficialKakaoEdition } from './lib/edition-translation-policy.mjs'
import { excludedBookEditionReason, bookTranslatorKey, BOOK_EDITION_SELECTION_REASONS } from '../../../../packages/content-search/src/book-edition-policy.ts'
import { wikidataOriginalLanguage, translationRepairSql } from './edition-translation-audit.mjs'
import { wikipediaBookLanguage } from './lib/edition-original-language-research.mjs'
const row=(id,translator,extra={})=>({id,content_id:'odyssey',locale:'ko',title:'오디세이아',creator:'호메로스',isbn:String(id),sources:translator?{translators:[translator]}:{},...extra})
const catalog=editions=>({contents:[{id:'odyssey',figureBook:{}}],editions,locales:[],products:[]})

const selectionBook = { content_id:'work', locale: 'en', title: 'Green Eggs and Ham', isbn: '9781524773458' }
const selectionProof = { method: 'independent_selection_review', isbn: selectionBook.isbn, locale: selectionBook.locale, edition_title: selectionBook.title,
 reason: 'children_picture', content_id:selectionBook.content_id, source_url: 'https://publisher.example/books/magnetic-play',
 explanation: 'Publisher describes a magnetic play book for young children rather than the original novel text.' }
const withSelection = proof => ({ ...selectionBook, sources: { edition_selection_evidence: [proof] } })
test('독립 선정 근거는 체크된 같은 ISBN·언어·정확한 판본 제목과 출처·설명을 갖춘 경우에만 적용한다', () => {
 for (const reason of BOOK_EDITION_SELECTION_REASONS) assert.equal(excludedBookEditionReason(withSelection({ ...selectionProof, reason })), reason)
 assert.equal(excludedBookEditionReason({ ...withSelection(selectionProof), isbn: '978-1-5247-7345-8' }), 'children_picture')
 for (const change of [{ method: 'machine_title_match' }, { isbn: '9780394800165' }, { isbn: '9781524773459' }, { locale: 'ko' },
  { edition_title: 'A Different Book' }, { edition_title: selectionBook.title + ' ' }, { reason: 'illustrated' }, { explanation: 'confirmed' },
  { source_url: 'http://publisher.example/book' }, { source_url: 'https://openlibrary.org/books/OL1M' },
  { source_url: 'https://sub.openlibrary.org./books/OL1M' }, { source_url: 'https://user:password@publisher.example/book' }, { source_url: 'not a URL' }]) {
  assert.equal(excludedBookEditionReason(withSelection({ ...selectionProof, ...change })), null, JSON.stringify(change))
 }
 assert.equal(excludedBookEditionReason({ ...selectionBook, sources: { edition_selection_evidence: selectionProof } }), null)
 assert.equal(excludedBookEditionReason({ ...withSelection(selectionProof), isbn: null }), null)
 assert.equal(excludedBookEditionReason(withSelection({ ...selectionProof, isbn: undefined })), null)
})
test('어린이·자석 상품 판단은 다른 ISBN 정본이나 성인용 illustrated 도서를 자동 배제하지 않는다', () => {
 assert.equal(excludedBookEditionReason({ ...withSelection(selectionProof), isbn: '9780394800165' }), null)
 for (const title of ['An Illustrated History of Art', 'Children in Renaissance Painting', 'A Study of Picture Books for Adults', 'Magnetic Fields: Complete Poems']) {
  assert.equal(excludedBookEditionReason({ ...withSelection(selectionProof), title }), null)
 }
 const saved = withSelection(selectionProof), before = structuredClone(saved)
 excludedBookEditionReason(saved)
 assert.deepEqual(saved, before)
})
test('운영자가 명시한 선정 제외는 실제 상품과 작품에만 적용하고 낮은 평점 자체로 추정하지 않는다',()=>{
 const proof={...selectionProof,reason:'editorial_exclusion',explanation:'The operator explicitly excluded this verified ISBN from the public shelf after reviewing the actual edition.'}
 assert.equal(excludedBookEditionReason(withSelection(proof)),'editorial_exclusion')
 for(const changed of [{content_id:'another-work'},{content_id:undefined}]) assert.equal(excludedBookEditionReason(withSelection({...proof,...changed})),null)
 assert.equal(excludedBookEditionReason({...withSelection(proof),content_id:'another-work'}),null)
 assert.equal(excludedBookEditionReason({...selectionBook,sources:{rating:2,review_count:0,sales_index:200}}),null)
})
test('아동 전용 창작물은 정확한 독립 판정으로만 제외하고 권장 학년이나 제목에서 추정하지 않는다',()=>{
 const book={locale:'ko',title:'꼬마 토끼 조지의 언덕',isbn:'9788949170244'}
 const proof={...selectionProof,...book,edition_title:book.title,reason:'children_only',
  explanation:'Publisher identifies the exact ISBN as fiction written specifically for elementary-school children.'}
 assert.equal(excludedBookEditionReason({...book,sources:{edition_selection_evidence:[proof]}}),'children_only')
 assert.equal(excludedBookEditionReason({...book,sources:{provider_scope_description:'초등학교 5~6학년 권장 도서'}}),null)
 for(const title of ['어린 왕자','오디세이아','An Illustrated History of Art','Children in Renaissance Painting']) {
  assert.equal(excludedBookEditionReason({...book,title,sources:{edition_selection_evidence:[proof]}}),null)
 }
 assert.equal(excludedBookEditionReason({...book,isbn:'9780394800165',sources:{edition_selection_evidence:[proof]}}),null)
})

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

const originalWork = { id:'odyssey', figureBook:{workIdentity:'homer/odyssey'} }
const originalProof = edition => ({content_id:edition.content_id,locale:edition.locale,original_language:edition.locale,
 edition_title:edition.title,edition_creator:edition.creator,isbn:edition.isbn,work_identity:originalWork.figureBook.workIdentity,
 source_url:'https://publisher.example/odyssey'})

test('원문 근거가 배열이 아니면 진단을 중단하거나 미상 판본을 원문으로 묶지 않는다',()=>{
 for(const evidence of [undefined,null,false,27,'https://publisher.example/odyssey',{},originalProof(row(1,null))]) {
  const editions=[row(1,null,{sources:{edition_work_evidence:evidence}}),row(2,null)]
  const c={...catalog(editions),contents:[originalWork]},before=structuredClone(c)
  assert.equal(isOriginalEdition(editions[0],originalWork),false)
  const plan=planEditionTranslations(c)
  assert.equal(plan.duplicates.length,0)
  assert.deepEqual(plan.unresolved.map(r=>r.id),[1,2])
  assert.deepEqual(c,before)
 }
})

test('원문 근거 배열의 null·원시값·배열은 건너뛰고 정확히 귀속된 정상 객체만 인정한다',()=>{
 const edition=row(1,null),proof=originalProof(edition)
 const invalid=[null,undefined,false,27,'proof',[],Object.assign([],{...proof}),{}]
 assert.equal(isOriginalEdition({...edition,sources:{edition_work_evidence:invalid}},originalWork),false)
 const editions=[{...edition,sources:{edition_work_evidence:[...invalid,proof]}},row(2,null)]
 assert.equal(isOriginalEdition(editions[0],originalWork),true)
 const plan=planEditionTranslations({...catalog(editions),contents:[originalWork]})
 assert.deepEqual(plan.duplicates.map(g=>({keep:g.keep.id,drops:g.drops.map(r=>r.id)})),[{keep:1,drops:[2]}])
 assert.equal(plan.unresolved.length,0)
})

test('원문 근거의 다른 ISBN·작품·언어와 문자열이 아닌 출처는 원문 확인으로 쓰지 않는다',()=>{
 const edition=row(1,null),proof=originalProof(edition)
 for(const change of [{isbn:'2'},{content_id:'other'},{work_identity:'other'},{original_language:'en'},
  {source_url:[proof.source_url]},{source_url:null}])
  assert.equal(isOriginalEdition({...edition,sources:{edition_work_evidence:[{...proof,...change}]}},originalWork),false)
})

test('독립 확인된 작품 원문 언어와 역자별 묶음은 잘못된 근거 shape와 무관하게 유지한다',()=>{
 const editions=[row(1,null,{sources:{edition_work_evidence:{}}}),row(2,null)]
 const work={...originalWork,figureBook:{...originalWork.figureBook,originalLanguage:'ko',identityEvidence:'https://publisher.example/odyssey'}}
 assert.equal(isOriginalEdition(editions[0],work),true)
 assert.equal(planEditionTranslations({...catalog(editions),contents:[work]}).duplicates.length,1)
 const translated=[row(1,'천병희',{sources:{translators:['천병희'],edition_work_evidence:{}}}),row(2,'천병희'),row(3,'김헌')]
 const plan=planEditionTranslations({...catalog(translated),contents:[originalWork]})
 assert.deepEqual(plan.duplicates.map(g=>({keep:g.keep.id,drops:g.drops.map(r=>r.id)})),[{keep:1,drops:[2]}])
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

test('verified plural volume ranges cannot expose later volumes as a representative',()=>{
 for(const textScope of ['Volumes 11 and 12; continuous translation','Volumes 11–12; continuous translation','Parts II–III; continuous text'])
  assert.equal(excludedBookEditionReason({textScope}),'nonstart_volume')
 for(const textScope of ['Volumes 1 and 2; first combined volume','Parts I–II; first combined part','A collection of twelve independent stories'])
  assert.equal(excludedBookEditionReason({textScope}),null)
})

test('Sheet eBook 판매 형식만으로 실제 악보 본문을 축약본으로 판정하지 않는다',()=>{
 assert.equal(excludedBookEditionReason({title:'Violin Sonatas',providerDescription:'Sheet eBook; complete printed music for violin and piano.'}),null)
 assert.equal(excludedBookEditionReason({providerDescription:'세계명작다이제스트 시리즈 Sheet eBook'}),'abridged')
 assert.equal(excludedBookEditionReason(withSelection({...selectionProof,reason:'non_reading_product',
  explanation:'Independent publisher and page preview confirm blank staff paper with no printed music.'})),'non_reading_product')
})

test('실제 본문 언어가 다른 상품은 출처 검수한 정확 ISBN의 서비스 언어에서만 선정 해제한다',()=>{
 const book={locale:'en',title:'Voltaire: Choix de contes',isbn:'9781107641068'}
 const proof={method:'independent_selection_review',...book,edition_title:book.title,reason:'wrong_locale',
  source_url:'https://www.cambridge.org/books/choix-de-contes',explanation:'The publisher confirms six stories in French; this product is not the English translation offered by the shelf.'}
 const input={...book,sources:{edition_selection_evidence:[proof]}}
 assert.equal(excludedBookEditionReason(input),'wrong_locale')
 assert.equal(excludedBookEditionReason({...input,locale:'ko'}),null)
 assert.equal(excludedBookEditionReason({...input,isbn:'9780140444735'}),null)
 assert.equal(excludedBookEditionReason({...input,sources:{edition_selection_evidence:[{...proof,method:'machine_language_guess'}]}}),null)
 assert.equal(excludedBookEditionReason({...book,providerDescription:'French stories mentioned in this edition.'}),null)
})

test('다른 원작에 오귀속된 상품은 독립 출처의 정확한 ISBN 판정으로만 선정 해제한다',()=>{
 const book={content_id:'gubijinso',locale:'en',title:'The Poppy War',isbn:'9780008455194'}
 const proof={method:'independent_selection_review',content_id:book.content_id,isbn:book.isbn,locale:book.locale,edition_title:book.title,reason:'wrong_work',
  source_url:'https://publisher.example/exact-isbn',explanation:'Independent ISBN evidence identifies a different novel and author from the original work owning this edition.'}
 const input={...book,sources:{edition_selection_evidence:[proof]}}
 assert.equal(excludedBookEditionReason(input),'wrong_work')
 for(const changed of[{content_id:'poppy-war'},{content_id:undefined},{isbn:'9788932317021'},{locale:'ko'},{title:'Gubijinso'}])
  assert.equal(excludedBookEditionReason({...input,...changed}),null)
 assert.equal(excludedBookEditionReason({...input,sources:{edition_selection_evidence:[{...proof,method:'machine_work_guess'}]}}),null)
 assert.equal(excludedBookEditionReason({...input,sources:{edition_selection_evidence:[{...proof,content_id:undefined}]}}),null)
 assert.equal(excludedBookEditionReason({...book,providerDescription:'Another novel is mentioned in this description.'}),null)
})

test('본문 제목에서 숨겨진 공식 Penguin Reader 총서도 정규 판본에서 제외한다',()=>{
 assert.equal(excludedBookEditionReason({title:'Doctor Zhivago',sources:{provider_scope_description:'Penguin Reader , Level 5 (2300 words)'}}),'graded_reader')
 assert.equal(excludedBookEditionReason({title:'Doctor Zhivago',providerDescription:'Readers discuss the original novel'}),null)
})

test('공식 본문 범위의 로마 숫자 분권과 Loeb 중간 권도 첫 권 대표에 추가하지 않는다',()=>{
 for(const textScope of ['The Story of the Stone, volume IV of V: The Debt of Tears','Enneads VI.1–5; volume 6 of the Loeb Classical Library translation']) assert.equal(excludedBookEditionReason({title:'고전',textScope}),'nonstart_volume')
 for(const textScope of ['Complete edition, volumes I through V','Han Dynasty, revised edition, volume 1; translated by Burton Watson']) assert.equal(excludedBookEditionReason({title:'고전',textScope}),null)
})
