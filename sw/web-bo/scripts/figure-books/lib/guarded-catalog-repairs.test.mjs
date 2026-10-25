import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {SNAPSHOT_TABLES} from './merge-work-sql.mjs'
import {PROVIDER_BIBLIOGRAPHIC_DESCRIPTION_REVIEW,CATALOG_REPRESENTATIVE_SELECTION_REVIEW,buildCatalogRepairSnapshotSql,captureCatalogRepairSnapshot,expandReviewedExactIsbnIntroductionChanges,planGuardedCatalogRepairs,buildGuardedCatalogRepairSql,guardedCatalogRepairs,
 planGuardedCatalogExclusions,buildGuardedCatalogExclusionSql,guardedCatalogExclusions} from './guarded-catalog-repairs.mjs'

function selectionRestoration(table='figure_book_editions'){
 const data=Object.fromEntries(SNAPSHOT_TABLES.map(name=>[name,[]]))
 data.contents=[{id:'restore-book',type:'BOOK',metadata:{}}]
 const before={content_id:'restore-book',locale:'en',title:'A multilingual study',creator:'Editor',isbn:'9783837025064',description:null,
  sources:{primary:'openlibrary',edition_selection_evidence:[{method:'independent_selection_review',llmReviewed:true,content_id:'restore-book',
   isbn:'9783837025064',locale:'en',edition_title:'A multilingual study',reason:'wrong_locale',source_url:'https://publisher.example/book',
   explanation:'An earlier review inferred that no English text was included.'}]}}
 if(table==='figure_book_editions')Object.assign(before,{id:95,edition_kind:'full',text_scope:'complete'})
 data[table]=[before]
 data.member_contents=[{id:'protected',content_id:'restore-book',member_id:'reader',review:'Original review'}]
 const proof={method:'independent_selection_restoration_review',llmReviewed:true,contentId:before.content_id,isbn:before.isbn,locale:before.locale,
  editionTitle:before.title,excludedReason:'wrong_locale',sourceUrl:'https://library.example/exact-isbn',
  explanation:'The exact-ISBN library record explicitly confirms that English text is included, contradicting the previous exclusion.',
  bodyEvidence:'The catalogue identifies the same ISBN and lists German, English and Korean as the languages of the text.'}
 const change={table,before,patch:{sources:{...before.sources,edition_selection_evidence:[]}},reviewedSelectionRestoration:proof}
 return {data,change,proof}
}

test('independently reviewed selection restoration preserves all physical fields, other sources and reading references',()=>{
 for(const table of ['content_locales','figure_book_editions']){
  const {data,change}=selectionRestoration(table),plan=planGuardedCatalogRepairs(['restore-book'],data,[change])
  assert.deepEqual(plan.expected[table],[{...change.before,sources:{...change.before.sources,edition_selection_evidence:[]}}])
  for(const other of SNAPSHOT_TABLES.filter(name=>name!==table))assert.deepEqual(plan.expected[other],data[other])
 }
})

test('selection restoration rejects unreviewed or stale evidence, physical changes, source replacement and implicit proof removal',()=>{
 for(const mutate of [
  f=>{delete f.change.reviewedSelectionRestoration},f=>{f.proof.llmReviewed=false},f=>{f.proof.contentId='another'},
  f=>{f.proof.isbn='9780140442281'},f=>{f.proof.editionTitle='Different title'},f=>{f.proof.excludedReason='children_only'},
  f=>{f.proof.sourceUrl='https://openlibrary.org/books/OL1M'},f=>{f.proof.bodyEvidence='Not enough'},
  f=>{f.change.patch.title='A different title'},f=>{f.change.patch.sources.primary='manual'},
  f=>{delete f.change.patch.sources.edition_selection_evidence},f=>{f.change.patch.sources.edition_selection_evidence=null},
  f=>{f.change.before.sources.edition_selection_evidence[0].content_id='another'}
 ]){
  const f=selectionRestoration();mutate(f)
  assert.throws(()=>planGuardedCatalogRepairs(['restore-book'],f.data,[f.change]),/Selection restoration/)
 }
})

function providerBibliographicDescription(table='figure_book_editions'){
 const data=Object.fromEntries(SNAPSHOT_TABLES.map(name=>[name,[]]))
 data.contents=[{id:'provider-book',type:'BOOK',metadata:{},updated_at:'old'}]
 const before={content_id:'provider-book',locale:'en',title:"Love's Labour's Lost",creator:'William Shakespeare',
  isbn:'9781423779285',publisher:'ICON Classics',description:'An advertisement copied from a different Korean edition.',
  sources:{primary:'openlibrary',isbn:'https://openlibrary.org/books/OL27071833M',description:'https://publisher.example/korean-edition',description_method:'translation',description_source_locale:'ko'},updated_at:'old'}
 if(table==='figure_book_editions')Object.assign(before,{id:7212,edition_kind:null,text_scope:null})
 data[table]=[before]
 data.celeb_contents=[{id:'protected-review',content_id:'provider-book',celeb_id:'reader',review:'Keep this original review.',source_url:'https://interview.example/reader'}]
 data.member_contents=[{id:'protected-member',content_id:'provider-book',member_id:'member',status:'FINISHED'}]
 const description='An ICON Classics electronic edition with English play text and a Spanish thesaurus, edited by Philip M. Parker in 2005.'
 const sourceUrl='https://openlibrary.org/books/OL27071833M'
 const proof={method:PROVIDER_BIBLIOGRAPHIC_DESCRIPTION_REVIEW,llmReviewed:true,identityConfirmed:true,bibliographicOnly:true,scopeClaimed:false,
  contentId:before.content_id,isbn:before.isbn,locale:'en',editionTitle:before.title,beforeDescription:before.description,beforeSources:structuredClone(before.sources),
  sourceUrl,fetchedUrl:sourceUrl+'.json',description,reason:'The exact provider record identifies this edition; the old advertisement belongs to another edition.',
  fetchedEdition:{key:'/books/OL27071833M',title:before.title,isbn_13:[before.isbn],languages:[{key:'/languages/eng'}],publishers:['ICON Classics'],publish_date:'2005',physical_format:'electronic resource',notes:'Text in English, thesaurus in Spanish.'}}
 const change={table,before,patch:{description,sources:{...before.sources,description:sourceUrl,description_method:'provider',description_source_locale:'en'}},reviewedIntroductionCorrection:proof}
 return {data,change,proof,assigned:['provider-book']}
}

test('exact provider bibliography corrects only description and its source while preserving every other live row',()=>{
 for(const table of ['content_locales','figure_book_editions']){
  const {data,change,assigned}=providerBibliographicDescription(table)
  const plan=planGuardedCatalogRepairs(assigned,data,[change])
  for(const other of SNAPSHOT_TABLES.filter(name=>name!==table))assert.deepEqual(plan.expected[other],data[other],other)
  const actual=plan.expected[table][0]
  for(const field of Object.keys(change.before).filter(key=>!['description','sources','updated_at'].includes(key)))assert.deepEqual(actual[field],change.before[field],field)
  assert.equal(actual.description,change.patch.description)
  const sql=buildGuardedCatalogRepairSql(assigned,data,[change])
  for(const name of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+name),name)
  assert.ok(!sql.includes('fetchedEdition'))
 }
})

test('provider bibliography refuses stale prose, another ISBN or record, unsupported language, unreviewed scope and extra field changes',()=>{
 for(const mutate of [
  ({proof})=>{proof.beforeDescription='stale'},
  ({proof})=>{proof.beforeSources.primary='none'},
  ({proof})=>{proof.fetchedEdition.isbn_13=['9780140446456']},
  ({proof})=>{proof.fetchedEdition.key='/books/OL1027840M'},
  ({proof})=>{proof.fetchedEdition.languages=[{key:'/languages/spa'}]},
  ({proof})=>{proof.llmReviewed=false},
  ({proof})=>{proof.identityConfirmed=false},
  ({proof})=>{proof.scopeClaimed=true},
  ({proof})=>{proof.fetchedUrl='https://openlibrary.org/search.json'},
  ({change})=>{change.patch.publisher='A different publisher'},
  ({change,proof})=>{change.patch.description=proof.description='The complete translation and unabridged full text.'}
 ]){
  const fixture=providerBibliographicDescription();mutate(fixture)
  assert.throws(()=>planGuardedCatalogRepairs(fixture.assigned,fixture.data,[fixture.change]),/Provider bibliographic|Unapproved/)
 }
 const fixture=providerBibliographicDescription()
 assert.throws(()=>planGuardedCatalogRepairs(['other-book'],fixture.data,[fixture.change]),/assigned|Unassigned/i)
})

function crossOwnerIntroduction(kind='wrong_work'){
 const data={...Object.fromEntries(SNAPSHOT_TABLES.map(table=>[table,[]]))},greek=kind==='wrong_locale'
 const figure=greek?{workTitle:'Medea',workCreator:'Euripides',workIdentity:'wikidata:q286381'}:{workTitle:'Frida',workCreator:'Hayden Herrera',workIdentity:'hayden-herrera/frida'}
 const rejected={id:'rejected',type:'BOOK',metadata:{figureBook:greek?{...figure}:{workTitle:'Frida Kahlo (The Love of Mexican Folk Art)',workCreator:'Hayden Herrera',workIdentity:'hayden-herrera/other-frida'}},updated_at:'old'}
 const canonical={id:'canonical',type:'BOOK',metadata:{figureBook:{...figure}},updated_at:'old'}
 data.contents=[rejected,canonical]
 const before={id:1,content_id:'rejected',locale:'en',title:greek?'Medea':'Frida Kahlo (The Love of Mexican Folk Art)',creator:figure.workCreator,
  isbn:greek?'9780521643863':'9798869139818',publisher:greek?'Cambridge University Press':null,edition_kind:greek?'full':null,text_scope:greek?'Complete Greek text with English commentary':null,
  description:greek?'This edition presents the Greek text of Medea with an English introduction and detailed commentary. It does not contain an English translation of the play.':'This book is an overview of the life and art of Frida Kahlo and her love of Mexican culture and folk art.',
  sources:{primary:'openlibrary',description:greek?'https://assets.cambridge.org/frontmatter.pdf':'https://books.google.com/books?id=hMqQ0QEACAAJ',description_method:'provider',description_source_locale:'en',
   ...(greek?{text_languages:['grc'],commentary_languages:['en']}:{} )},updated_at:'old'}
 const reference={id:2,content_id:'canonical',locale:'en',title:greek?'Medea':'Frida: A Biography of Frida Kahlo',creator:figure.workCreator,
  isbn:greek?'9781416592259':'9780060085896',publisher:greek?'Free Press':'Harper Perennial',edition_kind:'full',text_scope:'complete',
  description:greek?'Euripides’s tragedy follows Medea after Jason abandons her to marry into the royal family of Corinth. This edition contains Robin Robertson’s verse translation.':'Hayden Herrera’s biography follows Frida Kahlo’s life and painting, drawing on her letters and interviews with people who knew her.',
  sources:{primary:'openlibrary',description:greek?'https://www.simonandschuster.com/books/Medea/Euripides/9781416592259':'https://library.toledomuseum.org/bib/5422',description_method:'research',description_source_locale:'en',...(greek?{translators:['Robin Robertson']}:{} )},updated_at:'old'}
 data.figure_book_editions=[before,reference]
 const card={...structuredClone(reference)};delete card.id;delete card.edition_kind;delete card.text_scope
 data.content_locales=[{content_id:'rejected',locale:'en',isbn:null,description:null,sources:{primary:'none'},updated_at:'old'},card]
 data.celeb_contents=[{id:'reading',content_id:'rejected',review:'Actual reading testimony, preserved verbatim.',source_url:'https://archive.example/testimony',updated_at:'old'}]
 data.curated_list_items=[{id:1,content_id:'canonical',sort_order:3}]
 data.figure_book_characters=[{content_id:'rejected',celeb_id:'figure',relation_type:'appearance'}]
 const anchor=row=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,row.metadata.figureBook[key]??null]))
 const sourceUrl=greek?before.sources.description:'https://www.yes24.com/product/goods/152705599'
 const proof={method:greek?'independent_wrong_locale_representative_introduction_review':'independent_cross_owner_other_work_introduction_review',llmReviewed:true,
  rejectedWork:structuredClone(rejected),referenceWork:structuredClone(canonical),rejectedWorkAnchor:anchor(rejected),referenceWorkAnchor:anchor(canonical),
  discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),referenceLocaleCard:structuredClone(card),
  reason:greek?'Choose the complete English translation as the original work representative while retaining the Greek edition bibliography.':'The old introduction belongs to Greene’s independently identified book; retain Herrera’s biography introduction unchanged.',
  sourceReview:{llmReviewed:true,isbn:before.isbn,editionTitle:before.title,description:before.description,introductionSourceUrl:before.sources.description,sourceUrl,
   bodyEvidence:'The exact ISBN source identifies this edition and its actual contents.',introductionEvidence:'The independently read current introduction source describes this exact edition.',
   ...(greek?{editionCreator:before.creator,actualOriginalCreator:'Euripides',introductionIsValid:true,bodyLanguage:'grc',commentaryLanguage:'en',containsEnglishTranslation:false,independentCommentaryWork:false,languageEvidence:'The Greek play starts at page 113 and the English commentary starts at page 160.'}
    :{actualWorkTitle:before.title,actualCreator:'Serene Greene',descriptionBelongsToOtherWork:true,otherWorkAttributionEvidence:'The current Google source identifies Greene’s Mexican folk art book, not Herrera’s biography.'})},
  referenceReview:{llmReviewed:true,isbn:reference.isbn,editionTitle:reference.title,editionCreator:reference.creator,workTitle:figure.workTitle,workCreator:figure.workCreator,
   description:reference.description,introductionSourceUrl:reference.sources.description,sourceUrl:reference.sources.description,
   bodyEvidence:'The exact ISBN source identifies the normal representative book and its author.',scopeEvidence:'The source body and contents independently confirm the selected representative scope.',
   ...(greek?{bodyLanguage:'en',completeTranslationConfirmed:true,translators:['Robin Robertson']}:{} )}}
 const selection={method:'independent_selection_review',content_id:'rejected',isbn:before.isbn,locale:'en',edition_title:before.title,reason:kind,source_url:sourceUrl,explanation:proof.reason,
  ...(greek?{replacementIntroduction:proof}:{misattachedIntroduction:{crossOwnerReview:proof}})}
 const changes=[{table:'figure_book_editions',before,remove:true,reviewedSelectionExclusion:selection}]
 if(greek){
  const bib={isbn:before.isbn,title:before.title,creator:before.creator,publisher:before.publisher,locale:'grc',source_url:sourceUrl}
  proof.foreignBibliography=bib
  changes.push({table:'contents',before:canonical,patch:{metadata:{...canonical.metadata,figureBook:{...figure,foreignEditions:[bib]}}}})
 }
 return {data,changes,proof,assigned:['rejected','canonical']}
}

test('cross-owner wrong-work selection discards another author’s valid overview and preserves both readings and the normal card',()=>{
 const {data,changes,assigned}=crossOwnerIntroduction(),plan=planGuardedCatalogRepairs(assigned,data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(assigned,data,changes)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('crossOwnerReview'));assert.ok(!sql.includes('otherWorkAttributionEvidence'))
})

test('both cross-owner contracts reject stale rows, changed normal cards, unassigned references and product history',()=>{
 for(const kind of ['wrong_work','wrong_locale']){
  for(const mutate of [
   p=>{p.rejectedWork.updated_at='stale'},p=>{p.referenceWorkAnchor.workIdentity='other'},p=>{p.discardedEdition.description='stale'},
   p=>{p.referenceEdition.isbn='9780140449136'},p=>{p.referenceLocaleCard.description='stale'},
   p=>{p.sourceReview.introductionSourceUrl='https://publisher.example/unread'},p=>{p.sourceReview.bodyEvidence=''},
   p=>{p.referenceReview.scopeEvidence=''},p=>{p.referenceReview.sourceUrl=p.sourceReview.sourceUrl}]){
   const {data,changes,proof,assigned}=crossOwnerIntroduction(kind);mutate(proof)
   assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner introduction/)
  }
  const {data,changes,assigned}=crossOwnerIntroduction(kind)
  assert.throws(()=>planGuardedCatalogRepairs(['rejected'],data,changes),/assigned|Unassigned/)
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,[...changes,{table:'content_locales',before:data.content_locales[1],patch:{description:'A newly selected introduction describing the same original, but changing the protected normal card.'}}]),/unchanged normal/)
  if(kind==='wrong_work')assert.throws(()=>planGuardedCatalogRepairs(assigned,data,[...changes,{table:'contents',before:data.contents[1],patch:{release_date:'2025-01-01'}}]),/Cross-owner wrong-work/)
  else{
   const changed=structuredClone(changes);changed[1].patch.metadata.unreviewed='unrelated metadata change'
   assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changed),/short foreign bibliography/)
  }
  data.figure_book_products=[{id:1,edition_id:1,is_active:false}]
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/product history/)
 }
})

test('cross-owner other-work discard requires actual different-author source attribution rather than calling factual prose false',()=>{
 for(const mutate of [p=>{p.sourceReview.actualCreator='Hayden Herrera'},p=>{p.sourceReview.actualWorkTitle='Another book'},
  p=>{p.sourceReview.descriptionBelongsToOtherWork=false},p=>{p.sourceReview.otherWorkAttributionEvidence=''},p=>{p.method='independent_other_work_introduction_review'}]){
  const {data,changes,proof,assigned}=crossOwnerIntroduction();mutate(proof)
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner wrong-work/)
 }
})

test('wrong-locale selection preserves valid Greek commentary as short bibliography and selects a separately verified English translation',()=>{
 const {data,changes,assigned}=crossOwnerIntroduction('wrong_locale'),plan=planGuardedCatalogRepairs(assigned,data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 assert.deepEqual(plan.expected.content_locales,data.content_locales)
 const bib=plan.expected.contents[1].metadata.figureBook.foreignEditions[0]
 assert.deepEqual(Object.keys(bib).sort(),['creator','isbn','locale','publisher','source_url','title'])
 assert.equal(bib.locale,'grc');assert.ok(!JSON.stringify(bib).includes(data.figure_book_editions[0].description))
 for(const table of SNAPSHOT_TABLES.filter(table=>!['contents','figure_book_editions'].includes(table)))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(assigned,data,changes)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('replacementIntroduction'));assert.ok(!sql.includes('languageEvidence'))
})

test('wrong-locale selection rejects English body, unverified language, separate commentary work, different originals and guessed complete translations',()=>{
 for(const mutate of [p=>{p.sourceReview.bodyLanguage='en'},p=>{p.sourceReview.bodyLanguage='und'},p=>{p.sourceReview.bodyLanguage='lat'},
  p=>{p.sourceReview.introductionIsValid=false},p=>{p.sourceReview.containsEnglishTranslation=true},p=>{p.sourceReview.independentCommentaryWork=true},
  p=>{p.sourceReview.languageEvidence=''},p=>{p.referenceReview.completeTranslationConfirmed=false},p=>{p.referenceReview.translators=['Donald J. Mastronarde']}]){
  const {data,changes,proof,assigned}=crossOwnerIntroduction('wrong_locale');mutate(proof)
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Wrong-locale representative/)
 }
 const {data,changes,proof,assigned}=crossOwnerIntroduction('wrong_locale')
 data.contents[1].metadata.figureBook.workIdentity='different-original'
 proof.referenceWork=structuredClone(data.contents[1]);proof.referenceWorkAnchor.workIdentity='different-original'
 assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Wrong-locale representative|Cross-owner introduction/)
})

test('wrong-locale bibliography cannot archive prose, omit current entries, or silently promote unknown scope',()=>{
 for(const variant of ['prose','omit','unknown']){
  const {data,changes,proof,assigned}=crossOwnerIntroduction('wrong_locale')
  if(variant==='prose'){proof.foreignBibliography.description=data.figure_book_editions[0].description;changes[1].patch.metadata.figureBook.foreignEditions[0]=proof.foreignBibliography}
  if(variant==='omit'){data.contents[1].metadata.figureBook.foreignEditions=[{isbn:'9780140449136',title:'Earlier retained source'}];proof.referenceWork=structuredClone(data.contents[1])}
  if(variant==='unknown'){data.figure_book_editions[1].text_scope=null;proof.referenceEdition=structuredClone(data.figure_book_editions[1])}
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Wrong-locale|archive|Archive/)
 }
})

test('cross-owner removal rechecks all 18 tables and refuses normal introduction, retained foreign bibliography or protected reading drift',async()=>{
 for(const kind of ['wrong_work','wrong_locale'])for(const drift of ['none','reading','curated','normal-source',...(kind==='wrong_locale'?['foreign-bib']:[])]){
  const {data,changes,assigned}=crossOwnerIntroduction(kind),actual=structuredClone(planGuardedCatalogRepairs(assigned,data,changes).expected)
  if(drift==='reading')actual.celeb_contents[0].review='Changed testimony'
  if(drift==='curated')actual.curated_list_items[0].sort_order=99
  if(drift==='normal-source')actual.figure_book_editions[0].sources.description='https://publisher.example/unreviewed'
  if(drift==='foreign-bib')actual.contents[1].metadata.figureBook.foreignEditions=[]
  let captures=0
  const run=()=>guardedCatalogRepairs(null,assigned,changes,{capture:async()=>structuredClone(captures++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18)
  else await assert.rejects(run,/readback mismatch/)
 }
})

const snapshot=()=>({...Object.fromEntries(SNAPSHOT_TABLES.map(table=>[table,[]])),contents:[{id:'work',type:'BOOK',metadata:{figureBook:{workTitle:'Title'}},external_id:'old',updated_at:'old'}],
 content_locales:[{content_id:'work',locale:'en',title:'Title',description:null,sources:{primary:'openlibrary'},updated_at:'old'}],
 figure_book_editions:[{id:1,content_id:'work',locale:'en',title:'Title',description:null,sources:{},updated_at:'old'}],
 member_contents:[{id:'reading',content_id:'work',review:'Human review',rating:5}],faction_lv2:[{id:'theme',theme_book_ids:['other','work']}]})
const change=data=>({table:'contents',before:data.contents[0],patch:{metadata:{figureBook:{workTitle:'Confirmed Title'}},external_id:'confirmed'}})

function crossOwnerPlaceholder(){
 const data=snapshot(),old=data.contents[0],normal={id:'canonical',type:'BOOK',metadata:{figureBook:{workTitle:'Shiji',workCreator:'Sima Qian',workIdentity:'sima-qian/shiji',originalTitle:'史記',originalCreator:'司馬遷'}},updated_at:'old'}
 old.metadata={};data.contents.push(normal)
 const before=data.figure_book_editions[0],modern={id:34959,content_id:'work',locale:'ko',isbn:'9788956451435',title:'사마천 사기 (그림으로 쉽게 풀어쓴 인간학 교과서)',creator:'사마천',publisher:'일빛',description:'DAUM',
  sources:{primary:'kakao_book',description:'https://m.search.daum.net/search?w=bookpage&bookId=734300'},updated_at:'old'}
 Object.assign(before,{id:34958,isbn:null,publisher:null,release_date:null,title:'Records of the Grand Historian (Shi Ji)',creator:'Sima Qian',description:'This modern introduction compresses the original history into one book with pictures, illustrations, charts and newly edited explanations.',
  sources:{primary:'openlibrary',description:modern.sources.description,description_method:'translation',description_source_locale:'ko'}})
 const reference={id:3644,content_id:'canonical',locale:'ko',isbn:'9788937426810',title:'사기본기',creator:'사마천',publisher:'민음사',description:'사마천의 《사기》 가운데 「본기」 12편을 김원중이 옮겼다. 오제에서 한 무제까지 제왕의 행적과 왕조의 흥망을 기록한 부분으로, 각 편의 해설과 본문의 주석을 함께 실어 사건의 배경을 짚어준다.',edition_kind:'volume',text_scope:'Shiji: Benji 1–12',
  sources:{primary:'kakao_book',description:'https://www.yes24.com/product/goods/3769858',description_method:'llm_reviewed_summary',description_source_locale:'ko',translators:['김원중']},updated_at:'old'}
 data.figure_book_editions=[before,modern,reference]
 const card=structuredClone(reference);delete card.id;delete card.edition_kind;delete card.text_scope;data.content_locales.push(card)
 data.celeb_contents=[{id:'reading',content_id:'work',review:'Actual childhood reading of the ancient original, not the modern illustrated book.',source_url:'https://archive.example/zhou',updated_at:'old'}]
 data.curated_list_items=[{id:1,content_id:'canonical',sort_order:3}]
 const anchor=row=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(k=>[k,row.metadata?.figureBook?.[k]??null]))
 const cross={method:'independent_cross_owner_placeholder_introduction_review',llmReviewed:true,rejectedWork:structuredClone(old),referenceWork:structuredClone(normal),rejectedWorkAnchor:anchor(old),referenceWorkAnchor:anchor(normal),
  discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),referenceLocaleCard:structuredClone(card),
  sourceReview:{llmReviewed:true,edition:structuredClone(modern),isbn:modern.isbn,locale:'ko',editionTitle:modern.title,editionCreator:modern.creator,description:before.description,
   copiedIntroductionSourceUrl:before.sources.description,sourceUrl:'https://www.yes24.com/product/goods/3633395',actualWorkTitle:modern.title,actualCreator:'스진',actualCreatorRole:'editor',actualTranslators:['노만수'],
   independentOtherWorkConfirmed:true,copiedTranslationConfirmed:true,bodyEvidence:'실제 2009년 도해책은 그림과 도표, 새로운 설명으로 원작의 핵심을 압축한 현대 편집책이다.',copyAttributionEvidence:'현재 영어 소개와 한국어 실물행의 DAUM 출처가 같고 그림·도표·압축구성이 실제 현대 도해책 소개에 대응한다.',roleEvidence:'독립 책임표시에서 사마천 원저, 스진 편집, 노만수 번역을 구분해 확인했다.'},
  referenceReview:{llmReviewed:true,isbn:reference.isbn,editionTitle:reference.title,editionCreator:reference.creator,workTitle:'Shiji',workCreator:'Sima Qian',bodyLanguage:'ko',textScope:reference.text_scope,
   description:reference.description,introductionSourceUrl:reference.sources.description,sourceUrl:reference.sources.description,originalScopeConfirmed:true,introductionMatchesOriginalConfirmed:true,
   bodyEvidence:'정상 독립 출판사 소개와 김원중 역자 표시에서 고대 사기의 본기 번역임을 확인했다.',scopeEvidence:'실제 목차는 오제에서 효무까지 본기 12편으로 사기 130편 전체가 아니라 시작 부분이다.',introductionEvidence:'정상 현재 소개는 본기 12편과 주석·해설 범위를 정확히 안내하며 옛 소개를 복사하지 않는다.'}}
 const proof={method:'independent_placeholder_review',contentId:'work',editionId:before.id,locale:'en',editionTitle:before.title,referenceEditionId:reference.id,referenceLocale:'ko',referenceTitle:reference.title,referenceCreator:reference.creator,referenceIsbn:reference.isbn,
  sourceUrl:reference.sources.description,reason:'실물 ISBN·출판사·날짜·판본 포인터가 없는 영어 복사행을 제거하고 기존 정상 본기 대표와 고대 원작의 감상 관계를 그대로 보존한다.',crossOwnerReference:cross,
  misattachedIntroduction:{method:'independent_other_work_introduction_review',isbn:modern.isbn,sourceUrl:cross.sourceReview.sourceUrl,workTitle:modern.title,creator:'스진',reason:'현재 영어 소개는 고대 원전의 영어판이 아니라 스진 편집의 현대 도해책 개요를 번역한 것이므로 그 귀속을 구분한다.'}}
 const changes=[{table:'figure_book_editions',before,remove:true,reviewedPlaceholderRemoval:proof},{table:'figure_book_editions',before:modern,remove:true,reviewedSelectionExclusion:{method:'independent_selection_review',content_id:'work',isbn:modern.isbn,locale:'ko',edition_title:modern.title,reason:'wrong_work',source_url:cross.sourceReview.sourceUrl,explanation:proof.reason}}]
 return {data,changes,cross,assigned:['work','canonical']}
}

test('cross-owner placeholder removes a source-bound English copy before merge and preserves the real Korean starting volume, legacy provenance and all other rows',()=>{
 const {data,changes,assigned}=crossOwnerPlaceholder(),plan=planGuardedCatalogRepairs(assigned,data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[2]])
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 assert.equal(plan.expected.figure_book_editions[0].text_scope,'Shiji: Benji 1–12')
 assert.equal(plan.expected.figure_book_editions[0].sources.description_method,'llm_reviewed_summary')
 const sql=buildGuardedCatalogRepairSql(assigned,data,changes)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('crossOwnerReference'));assert.ok(!sql.includes('copyAttributionEvidence'))
})

test('cross-owner placeholder rejects real physical identity, stale originals/modern row/card and unassigned normal owners',()=>{
 for(const patch of [{isbn:'9780140449136'},{publisher:'Real publisher'},{release_date:'2009-12-10'},
  {sources:{provider_edition_url:'https://openlibrary.org/books/OL1M'}},{sources:{isbn:'https://search.daum.net/search?w=bookpage&bookId=99'}},
  {sources:{edition_key:'OL1M'}}]){
  const {data,changes,cross,assigned}=crossOwnerPlaceholder();Object.assign(data.figure_book_editions[0],patch);cross.discardedEdition=structuredClone(data.figure_book_editions[0])
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner placeholder/)
 }
 for(const mutate of [p=>{p.rejectedWork.updated_at='stale'},p=>{p.rejectedWorkAnchor.workTitle='Invented title'},p=>{p.referenceWorkAnchor.workIdentity='another'},
  p=>{p.sourceReview.edition.publisher='stale'},p=>{p.referenceEdition.text_scope='complete'},p=>{p.referenceLocaleCard.description='stale'}]){
  const {data,changes,cross,assigned}=crossOwnerPlaceholder();mutate(cross)
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner placeholder/)
 }
 const {data,changes}=crossOwnerPlaceholder()
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Cross-owner placeholder/)
 delete changes[0].reviewedPlaceholderRemoval.crossOwnerReference
 assert.throws(()=>planGuardedCatalogRepairs(['work','canonical'],data,changes),/same-work physical edition/)
})

test('cross-owner copied introduction needs actual other-book roles/body and preserves normal scope, sources and product history',()=>{
 for(const mutate of [p=>{p.sourceReview.copiedIntroductionSourceUrl='https://publisher.example/unrelated'},p=>{p.sourceReview.copiedTranslationConfirmed=false},
  p=>{p.sourceReview.independentOtherWorkConfirmed=false},p=>{p.sourceReview.actualCreator='사마천'},p=>{p.sourceReview.actualCreatorRole='translator'},
  p=>{p.sourceReview.actualTranslators=[]},p=>{p.sourceReview.copyAttributionEvidence=''},p=>{p.referenceReview.textScope='complete'},
  p=>{p.referenceReview.originalScopeConfirmed=false},p=>{p.referenceReview.introductionMatchesOriginalConfirmed=false}]){
  const {data,changes,cross,assigned}=crossOwnerPlaceholder();mutate(cross)
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner placeholder/)
 }
 for(const variant of ['card','edition','work','product']){
  const {data,changes,assigned}=crossOwnerPlaceholder()
  if(variant==='card')changes.push({table:'content_locales',before:data.content_locales[1],patch:{publisher:'changed'}})
  if(variant==='edition')changes.push({table:'figure_book_editions',before:data.figure_book_editions[2],patch:{sources:{...data.figure_book_editions[2].sources,description_method:'research'}}})
  if(variant==='work')changes.push({table:'contents',before:data.contents[0],patch:{metadata:{figureBook:{workTitle:'Shiji'}}}})
  if(variant==='product')data.figure_book_products=[{id:1,edition_id:34958,is_active:false}]
  assert.throws(()=>planGuardedCatalogRepairs(assigned,data,changes),/Cross-owner placeholder|product history/)
 }
})

test('cross-owner placeholder readback rejects protected original reading or normal scope/source drift',async()=>{
 for(const drift of ['none','reading','scope','source','curated']){
  const {data,changes,assigned}=crossOwnerPlaceholder(),after=structuredClone(planGuardedCatalogRepairs(assigned,data,changes).expected)
  if(drift==='reading')after.celeb_contents[0].review='Altered childhood reading'
  if(drift==='scope')after.figure_book_editions[0].text_scope='complete'
  if(drift==='source')after.figure_book_editions[0].sources.description_method='research'
  if(drift==='curated')after.curated_list_items[0].sort_order=10
  let reads=0;const run=()=>guardedCatalogRepairs(null,assigned,changes,{capture:async()=>structuredClone(reads++?after:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

function existingCardAbridged(){
 const data=snapshot(),work=data.contents[0],card=data.content_locales[0],drop=data.figure_book_editions[0]
 work.metadata.figureBook={workIdentity:'book/9780306711763'}
 const description='After independence, John Adams defended divided powers and a bicameral legislature against Turgot’s criticism. His survey of historical republics was published in three volumes in 1787 and 1788.'
 Object.assign(card,{title:'A Defence of the Constitutions',creator:'John Adams',isbn:'9780306711763',description,
  sources:{primary:'manual-research',description:'https://en.wikipedia.org/wiki/A_Defence',description_method:'research',description_source_locale:'en'}})
 Object.assign(drop,{id:18796,title:card.title,creator:card.creator,isbn:'9781888451610',publisher:'Akashic Books',description,sources:{primary:'openlibrary'},edition_kind:null,text_scope:null})
 const reference={...structuredClone(drop),id:19011,title:'A defence of the constitutions.',isbn:card.isbn,publisher:'Da Capo Press',edition_kind:'full',text_scope:'complete',description:'Selected excerpts with a new introduction by Neal Pollack.',sources:{primary:'openlibrary'}}
 data.figure_book_editions.push(reference)
 const patch={title:card.title,creator:card.creator,description,edition_kind:'full',text_scope:'complete',sources:{...reference.sources,description:card.sources.description,description_method:'research',description_source_locale:'en'}}
 const proof={method:'independent_existing_card_abridged_representative_review',llmReviewed:true,work:structuredClone(work),
  workAnchor:{workTitle:null,workCreator:null,workIdentity:'book/9780306711763',originalTitle:null,originalCreator:null},
  discardedEdition:structuredClone(drop),referenceEdition:structuredClone(reference),selectedLocaleCard:structuredClone(card),referenceAfter:{...structuredClone(reference),...patch},
  reason:'Retain the verified original three-volume work introduction from the selected card and exclude the independently read excerpt product.',
  discardedSourceReview:{llmReviewed:true,isbn:drop.isbn,editionTitle:drop.title,editionCreator:drop.creator,sourceUrl:'https://www.akashicbooks.com/catalog/adams',excerptSourceUrl:'https://www.akashicbooks.com/extra/pollack',
   selectedExcerptsConfirmed:true,originalWorkTitle:card.title,originalWorkCreator:card.creator,bodyEvidence:'The exact ISBN identifies a 65-page Akashic paperback selected from the original work.',excerptEvidence:'Pollack’s actual introduction states that several vital excerpts are included in this volume.'},
  referenceSourceReview:{llmReviewed:true,isbn:reference.isbn,editionTitle:reference.title,editionCreator:reference.creator,actualWorkTitle:card.title,actualWorkCreator:card.creator,
   bodyLanguage:'en',completeWorkConfirmed:true,wholeVolumes:3,sourceUrl:'https://search.catalog.loc.gov/instances/adams',bodyEvidence:'The exact ISBN and LC entry identify Da Capo 1971 English three-volume reprint.',
   scopeEvidence:'The record states three volumes, reprinted from the London original of 1787–88; this is this work, not all Adams writings.',
   introductionSourceUrl:card.sources.description,description,introductionMatchesOriginalConfirmed:true,introductionEvidence:'The independently read original-work source supports Turgot, divided powers and the three-volume publication described in the card.'}}
 const changes=[{table:'figure_book_editions',before:drop,remove:true,reviewedSelectionExclusion:{method:'independent_selection_review',isbn:drop.isbn,locale:'en',edition_title:drop.title,reason:'abridged',
  source_url:proof.discardedSourceReview.sourceUrl,explanation:proof.reason,replacementIntroduction:proof}},
  {table:'figure_book_editions',before:reference,patch,reviewedIntroductionCorrection:{method:'independent_existing_card_representative_introduction_review',llmReviewed:true,
   contentId:'work',isbn:reference.isbn,locale:reference.locale,editionTitle:card.title,sourceUrl:card.sources.description,reason:proof.reason}}]
 return {data,changes,proof}
}

test('existing valid card introduction replaces a misattached excerpt description atomically, without fabricating the absent old source or missing work anchors',()=>{
 const {data,changes}=existingCardAbridged(),plan=planGuardedCatalogRepairs(['work'],data,changes)
 assert.equal(plan.expected.figure_book_editions.length,1)
 assert.deepEqual(plan.expected.figure_book_editions[0],changes[0].reviewedSelectionExclusion.replacementIntroduction.referenceAfter)
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
 assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions'))
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('discardedSourceReview'));assert.ok(!sql.includes('referenceAfter'))
})

test('existing-card selection rejects unconfirmed whole-work or introduction support, stale rows, source preconditioning and unrelated representative changes',()=>{
 for(const mutate of [p=>{p.work.updated_at='stale'},p=>{p.workAnchor.workTitle='invented'},p=>{p.discardedEdition.sources.description=null},
  p=>{p.referenceEdition.title='stale'},p=>{p.selectedLocaleCard.description='changed'},p=>{p.referenceAfter.publisher='Other publisher'},
  p=>{p.discardedSourceReview.selectedExcerptsConfirmed=false},p=>{p.discardedSourceReview.originalWorkTitle='Collected writings'},
  p=>{p.referenceSourceReview.completeWorkConfirmed=false},p=>{p.referenceSourceReview.wholeVolumes=1},
  p=>{p.referenceSourceReview.bodyLanguage='grc'},p=>{p.referenceSourceReview.introductionMatchesOriginalConfirmed=false},p=>{p.referenceSourceReview.introductionEvidence=''}]){
  const {data,changes,proof}=existingCardAbridged();mutate(proof)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Existing-card abridged/)
 }
 for(const drift of ['source','prose','card','book','product']){
  const {data,changes,proof}=existingCardAbridged()
  if(drift==='source'){data.figure_book_editions[0].sources.description='https://publisher.example/preconditioned';proof.discardedEdition=structuredClone(data.figure_book_editions[0])}
  if(drift==='prose'){data.figure_book_editions[0].description='A different summary with some similar information.';proof.discardedEdition=structuredClone(data.figure_book_editions[0])}
  if(drift==='card')changes.push({table:'content_locales',before:data.content_locales[0],patch:{publisher:'Da Capo Press'}})
  if(drift==='book')changes.push({table:'contents',before:data.contents[0],patch:{release_date:'1971-01-01'}})
  if(drift==='product')data.figure_book_products=[{id:1,edition_id:18796,is_active:false}]
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Existing-card abridged|product history/)
 }
 const missing=existingCardAbridged();delete missing.changes[1].reviewedIntroductionCorrection
 assert.throws(()=>planGuardedCatalogRepairs(['work'],missing.data,missing.changes),/Existing introduction/)
 const unbound=existingCardAbridged();unbound.changes.shift()
 assert.throws(()=>planGuardedCatalogRepairs(['work'],unbound.data,unbound.changes),/exact atomic excerpt-removal/)
})

test('edition-kind values are rejected from the shared service enum before SQL, while null and legacy excluded removals remain supported',()=>{
 for(const value of ['set','complete_set','FULL',1]){
  const data=snapshot()
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:data.figure_book_editions[0],patch:{edition_kind:value}}]),/SERVICE_BOOK_EDITION_KINDS/)
 }
 for(const value of ['full','retelling','adaptation','selection','volume',null]){
  const data=snapshot();data.figure_book_editions[0].edition_kind='set'
  assert.equal(planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:data.figure_book_editions[0],patch:{edition_kind:value}}]).expected.figure_book_editions[0].edition_kind,value)
 }
 const data=snapshot();Object.assign(data.figure_book_editions[0],{edition_kind:'abridged',description:'OPEN'})
 assert.equal(planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:data.figure_book_editions[0],remove:true}]).expected.figure_book_editions.length,0)
 for(const value of [null,'full']){
  const data=snapshot();data.figure_book_editions[0].edition_kind=value
  assert.equal(planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:data.figure_book_editions[0],patch:{sort_order:2}}]).expected.figure_book_editions[0].edition_kind,value)
 }
 const invalid=snapshot();invalid.figure_book_editions[0].edition_kind='set'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],invalid,[{table:'figure_book_editions',before:invalid.figure_book_editions[0],patch:{sort_order:2}}]),/SERVICE_BOOK_EDITION_KINDS/)
})

test('existing-card atomic selection detects protected prose, normal introduction and source drift during all-table readback',async()=>{
 for(const drift of ['none','reading','normal-description','normal-source']){
  const {data,changes}=existingCardAbridged(),actual=structuredClone(planGuardedCatalogRepairs(['work'],data,changes).expected)
  if(drift==='reading')actual.member_contents[0].review='Changed reading'
  if(drift==='normal-description')actual.figure_book_editions[0].description='Unexpected introduction'
  if(drift==='normal-source')actual.figure_book_editions[0].sources.description='https://publisher.example/unread'
  let reads=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(reads++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

test('ISBN 없는 작품 선정 판정은 감상·locale·curated 원행을 바꾸지 않고 현재 원작에 묶인다',()=>{
 const data=snapshot(),before=data.contents[0]
 before.metadata.figureBook.workCreator='Actual writer'
 data.figure_book_editions=[]
 data.celeb_contents=[{id:'actual-reading',content_id:'work',review:'Original protected prose',source_url:'https://interview.example/reading',visibility:'public'}]
 const proof={method:'independent_work_selection_review',content_id:'work',work_title:'Title',work_creator:'Actual writer',reason:'children_picture',
  source_url:'https://publisher.example/actual-book',explanation:'The LLM read the original book and confirmed this is an early primary picture book.'}
 const metadata={figureBook:{...before.metadata.figureBook,workSelectionEvidence:[proof]}}
 const plan=planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata}}])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='contents'))assert.deepEqual(plan.expected[table],data[table],table)
 for(const bad of [{content_id:'different'},{work_title:'Other original'},{reason:'wrong_locale'},{source_url:'https://openlibrary.org/books/OL1M'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata:{figureBook:{...metadata.figureBook,workSelectionEvidence:[{...proof,...bad}]}}}}]),/Work selection evidence/)
})

const figureSnapshot=()=>{
 const data=snapshot()
 for(const row of [...data.content_locales,...data.figure_book_editions])Object.assign(row,{isbn:'9780140449136',creator:'Actual Writer',sources:{primary:'openlibrary'}})
 data.figure_book_characters=[{content_id:'work',celeb_id:'figure',relation_type:'authored',description:null,description_en:null,sort_order:3},
  {content_id:'work',celeb_id:'other-figure',relation_type:'appearance',description:null,description_en:null,sort_order:9}]
 data.celeb_contents=[{id:'protected-review',content_id:'work',review:'Original reading prose',review_en:'Original English prose',source_url:'https://interview.example/reading',visibility:'public'}]
 return data
}
const figureChange=(data,{remove=false,after='appearance'}={})=>({table:'figure_book_characters',before:data.figure_book_characters[0],
 ...(remove?{remove:true}:{patch:{relation_type:after}}),reviewedFigureRelation:{method:'independent_figure_relation_review',llmReviewed:true,
 contentId:'work',celebId:'figure',beforeRelationType:data.figure_book_characters[0].relation_type,afterRelationType:remove?null:after,
 decision:remove?'remove_wrong_person':'correct_role',actualPersonName:'Modern artist with the same first name',figureName:'The service figure',
 isbn:'9780140449136',locale:'en',editionTitle:'Title',editionCreator:'Actual Writer',sourceUrl:'https://publisher.example/exact-book',
 identitySourceUrl:'https://museum.example/figure-identity',identityStatement:'The identity source identifies the exact service figure and distinguishes the modern person.',
 bodyEvidence:'The actual book text and author credits identify the person as a subject, not its writer.',
 reason:'The LLM read the exact book and identity sources and confirmed this one existing relation is wrong.'}})

test('source-reviewed figure roles use the composite PK and preserve every other figure and all 13 protected tables',()=>{
 for(const [beforeRole,afterRole] of [['authored','appearance'],['appearance','authored'],['related','appearance'],['related','authored']]){
  const data=figureSnapshot();data.figure_book_characters[0].relation_type=beforeRole
  const plan=planGuardedCatalogRepairs(['work'],data,[figureChange(data,{after:afterRole})])
  assert.deepEqual(plan.expected.figure_book_characters[0],{...data.figure_book_characters[0],relation_type:afterRole})
  assert.deepEqual(plan.expected.figure_book_characters[1],data.figure_book_characters[1])
  for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_characters'))assert.deepEqual(plan.expected[table],data[table])
 }
})
test('explicit wrong-person removal deletes only its reviewed existing relation, never a reading or a whole book',()=>{
 const data=figureSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[figureChange(data,{remove:true})])
 assert.deepEqual(plan.expected.figure_book_characters,[data.figure_book_characters[1]])
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_characters'))assert.deepEqual(plan.expected[table],data[table])
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...figureChange(data),before:{...data.figure_book_characters[0],celeb_id:'new-person'}}]),/before row differs/)
})
test('책의 실제 대상이 사람이 아닌 동명 선박이면 그 사실로 오연결만 제거한다',()=>{
 const data=figureSnapshot(),edit=figureChange(data,{remove:true}),proof=edit.reviewedFigureRelation
 delete proof.actualPersonName
 Object.assign(proof,{decision:'remove_wrong_subject',figureName:'Queen Victoria',actualSubjectName:'Queen Victoria cruise ship (2007)',
  identityStatement:'The service figure is the nineteenth-century monarch, not the modern Cunard cruise ship.',
  bodyEvidence:'The LLM read the actual photographic book about the ship and its public rooms, and confirmed the monarch was misidentified as this subject.'})
 const plan=planGuardedCatalogRepairs(['work'],data,[edit])
 assert.deepEqual(plan.expected.figure_book_characters,[data.figure_book_characters[1]])
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_characters'))assert.deepEqual(plan.expected[table],data[table])
 for(const difference of [{actualSubjectName:''},{actualSubjectName:'Queen Victoria'},{actualPersonName:'A ship'},
  {decision:'remove_wrong_person'},{afterRelationType:'appearance'}]){
  const invalid=structuredClone(edit);Object.assign(invalid.reviewedFigureRelation,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[invalid]),/Figure relation removal/)
 }
})

test('축약 상품을 안내하지 않아도 확인된 원작의 기존 등장 역할은 집필로 교정한다',()=>{
 const data=figureSnapshot();data.figure_book_editions=[];data.figure_book_characters[0].relation_type='appearance'
 data.contents[0].metadata.figureBook={workTitle:'Title',workCreator:'Actual Writer',workIdentity:'original/title',identityEvidence:'https://publisher.example/exact-book'}
 data.content_locales[0].sources.edition_selection_evidence=[{method:'independent_selection_review',content_id:'work',isbn:'9780140449136',locale:'en',edition_title:'Title',
  reason:'abridged',source_url:'https://review.example/actual-abridgment',explanation:'The LLM read the academic comparison and confirmed omitted passages in this translation.'}]
 const edit=figureChange(data,{after:'authored'}),origin={method:'independent_original_authorship_review',llmReviewed:true,contentId:'work',
  workTitle:'Title',workCreator:'Actual Writer',workIdentity:'original/title',sourceUrl:'https://publisher.example/exact-book',
  bodyEvidence:'The original author is identified in the publisher text and independent author profile; the shortened translation is still excluded.'}
 edit.reviewedFigureRelation.originalAuthorship=origin
 const plan=planGuardedCatalogRepairs(['work'],data,[edit])
 assert.equal(plan.expected.figure_book_characters[0].relation_type,'authored')
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_characters'))assert.deepEqual(plan.expected[table],data[table])
 for(const diff of [{llmReviewed:false},{contentId:'other'},{workTitle:'Other'},{workCreator:'Other'},{workIdentity:'other'},
  {sourceUrl:'https://publisher.example/another'},{bodyEvidence:'Guessed'}]){
  const invalid=structuredClone(edit);Object.assign(invalid.reviewedFigureRelation.originalAuthorship,diff)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[invalid]),/retained live normal edition/)
 }
 for(const reason of ['wrong_work','editorial_exclusion','wrong_locale']){
  const invalid=structuredClone(data);invalid.content_locales[0].sources.edition_selection_evidence[0].reason=reason
  assert.throws(()=>planGuardedCatalogRepairs(['work'],invalid,[figureChange(invalid,{after:'authored'})]),/retained live normal edition/)
 }
})

test('figure relation evidence rejects stale identities, missing normal ISBN, providers and unreviewed decisions',()=>{
 const edits=[p=>delete p.llmReviewed,p=>p.llmReviewed=false,p=>p.celebId='another',p=>p.contentId='another',p=>p.beforeRelationType='appearance',
  p=>p.isbn='9780679724773',p=>p.locale='ko',p=>p.editionTitle='Different book',p=>p.editionCreator='Different author',p=>p.figureName='',
  p=>p.identityStatement='Guessed',p=>p.bodyEvidence='Name match',p=>p.reason='Probably',p=>p.sourceUrl='https://openlibrary.org/books/OL1M',
  p=>p.sourceUrl='https://books.google.com/books?id=one',p=>p.identitySourceUrl='http://museum.example/figure',p=>p.identitySourceUrl=p.sourceUrl,
  p=>p.identitySourceUrl='https://[::1]/figure',p=>p.afterRelationType='authored',p=>p.figureName={},p=>p.editionCreator=5,p=>p.isbn=9780140449136]
 for(const edit of edits){const data=figureSnapshot(),c=figureChange(data);edit(c.reviewedFigureRelation);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[c]),/Figure relation/)}
 const data=figureSnapshot(),c=figureChange(data);delete c.reviewedFigureRelation
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[c]),/Figure relation/)
})
test('figure corrections cannot change descriptions, PK, ordering, other roles or smuggle edition proofs',()=>{
 for(const patch of [{relation_type:'appearance',description:null},{relation_type:'appearance',sort_order:1},{celeb_id:'other'},
  {content_id:'other'},{relation_type:'related'},{relation_type:'authored'},{}]){
  const data=figureSnapshot(),c=figureChange(data);c.patch=patch;assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[c]),/Figure relation patch/)
 }
 const data=figureSnapshot(),c=figureChange(data);c.reviewedIntroductionCorrection={}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[c]),/Figure relation repair/)
 for(const edit of [p=>p.actualPersonName=p.figureName,p=>p.decision='correct_role',p=>p.afterRelationType='appearance']){
  const c=figureChange(data,{remove:true});edit(c.reviewedFigureRelation);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[c]),/different person/)
 }
 const duplicate=figureChange(data);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[duplicate,duplicate]),/before row differs/)
})
test('the reviewed normal edition must remain valid in the final batch snapshot',()=>{
 const data=figureSnapshot()
 for(const row of [...data.content_locales,...data.figure_book_editions])row.sources.primary='none'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[figureChange(data)]),/retained live normal edition/)
 for(const row of [...data.content_locales,...data.figure_book_editions])row.sources.primary='openlibrary'
 const exclusions=['content_locales','figure_book_editions'].map(table=>({table,before:data[table][0],patch:{sources:{primary:'none'}}}))
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[figureChange(data),...exclusions]),/retained live normal edition/)
})
test('figure SQL binds both PK fields and old role, rejects unknown child FK and checks exactly one affected row',()=>{
 const data=figureSnapshot(),sql=buildGuardedCatalogRepairSql(['work'],data,[figureChange(data,{remove:true})])
 assert.match(sql,/DELETE FROM public.figure_book_characters WHERE content_id=E?'work' AND celeb_id=E?'figure' AND relation_type IS NOT DISTINCT FROM E?'authored'/)
 assert.match(sql,/unhandled figure relation reference/);assert.match(sql,/GET DIAGNOSTICS affected_rows=ROW_COUNT;IF affected_rows<>1/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table))
 assert.equal((sql.match(/FOR UPDATE/g)||[]).length,18)
 assert.doesNotMatch(sql,/INSERT INTO public.figure_book_characters|UPDATE public.celeb_contents|DELETE FROM public.celeb_contents/)
})

test('figure readback ignores only its changed timestamp and rejects other relation or protected prose drift',async()=>{
 for(const drift of ['none','other-figure','review']){
  const before=figureSnapshot();for(const row of before.figure_book_characters)row.updated_at='old'
  const changes=[figureChange(before)],actual=planGuardedCatalogRepairs(['work'],before,changes).expected
  actual.figure_book_characters[0].updated_at='new'
  if(drift==='other-figure')actual.figure_book_characters[1].updated_at='unexpected'
  if(drift==='review')actual.celeb_contents[0].review='Unexpected reading change'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(captures++?actual:before),
   execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')await run()
  else await assert.rejects(run,/readback mismatch/)
 }
})

test('provider text objects are rejected before SQL instead of becoming a serialized description',()=>{
 for(const table of ['content_locales','figure_book_editions']){
  const data=snapshot(),before=data[table][0]
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table,before,patch:{description:{type:'/type/text',value:'Already reviewed introduction'}}}]),/Catalog text field requires string or null: description/)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table,before,patch:{isbn:9780500295779}}]),/Catalog text field requires string or null: isbn/)
 }
})

test('fresh catalog repairs reject reinstating discarded research rows and raw provider archives',()=>{
 for(const table of ['content_locales','figure_book_editions'])for(const key of ['legacy_isbn_restoration','original_value','originalRows','sourceSnapshot']){
  const data=snapshot(),before=data[table][0]
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table,before,patch:{sources:{...before.sources,[key]:{oldRow:{title:'Old value'}}}}}]),/must not create or restore research archives/)
 }
 for(const nested of [false,true]){
  const data=snapshot(),before=data.contents[0],metadata=structuredClone(before.metadata)
  if(nested)metadata.figureBook.detachedLocaleData=[{description:'Old unrelated book'}]
  else metadata.unverifiedEditions=[{originalRows:[{title:'Old value'}]}]
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata}}]),/must not create or restore research archives/)
 }
 for(const path of [['restoredOriginalRows'],['unverifiedReviews'],['figureBook','rejectedLocaleData']]){
  const data=snapshot(),before=data.contents[0],metadata=structuredClone(before.metadata)
  const target=path.length===1?metadata:metadata.figureBook,key=path.at(-1);target[key]={oldRow:{title:'Copied old value'}}
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata}}]),/must not create or restore research archives/)
  before.metadata=metadata
  const clean=structuredClone(metadata);delete (path.length===1?clean:clean.figureBook)[key]
  assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata:clean}}]))
 }
})
test('foreign edition facts remain usable but copied original locale and edition rows cannot be created or restored',()=>{
 for(const key of ['originalLocale','originalEdition']){
  const data=snapshot(),before=data.contents[0],fact={isbn:'9780140449136',locale:'el',source_url:'https://library.example/exact-isbn'}
  before.metadata.figureBook.foreignEditions=[{...fact,[key]:{title:'Old row',description:'Old raw text',sources:{primary:'old'}}}]
  const clean=structuredClone(before.metadata);clean.figureBook.foreignEditions=[fact]
  const plan=planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata:clean}}])
  assert.deepEqual(plan.expected.contents[0].metadata.figureBook.foreignEditions,[fact])
  assert.deepEqual(plan.expected.member_contents,data.member_contents)
  assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{external_id:'confirmed'}}]))
  const restored=structuredClone(clean);restored.figureBook.foreignEditions[0][key]={title:'New copied row'}
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata:restored}}]),/must not create or restore research archives/)
  before.metadata=clean
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'contents',before,patch:{metadata:restored}}]),/must not create or restore research archives/)
 }
})

test('catalog repairs can discard existing research archives while retaining live provenance and protected reviews',()=>{
 const data=snapshot(),before=data.content_locales[0]
 before.sources={primary:'openlibrary',isbn:'https://openlibrary.org/books/OL1M',originalRows:[{title:'Old row'}],historical_voice:'https://assets.example/current.mp3'}
 const sources=structuredClone(before.sources);delete sources.originalRows
 const plan=planGuardedCatalogRepairs(['work'],data,[{table:'content_locales',before,patch:{sources}}])
 assert.deepEqual(plan.expected.content_locales[0].sources,sources)
 assert.deepEqual(plan.expected.member_contents,data.member_contents)
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,[{table:'content_locales',before,patch:{publisher:'Actual publisher'}}]))
 sources.originalRows=[{title:'A new backup'}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'content_locales',before,patch:{sources}}]),/must not create or restore research archives/)
})

test('new selection evidence uses the resolver array and canonical reason contract',()=>{
 const data=snapshot(),before=data.content_locales[0]
 const proof={method:'independent_selection_review',reason:'children_picture',isbn:'9780140449136',locale:'en',edition_title:'Title',
  source_url:'https://publisher.example/exact-book',explanation:'The exact ISBN and publisher description identify the illustrated children\'s adaptation.'}
 const patch=evidence=>[{table:'content_locales',before,patch:{sources:{...before.sources,edition_selection_evidence:evidence}}}]
 for(const evidence of [proof,[{...proof,reason:'childrens_adaptation'}],[{...proof,method:'automatic_review'}],[{...proof,source_url:'https://openlibrary.org/books/OL1M'}],[{...proof,locale:'ko'}],[{...proof,isbn:'0'}],[null]])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,patch(evidence)),/array of reviews with canonical selection reasons/)
 assert.equal(planGuardedCatalogRepairs(['work'],data,patch([proof])).expected.content_locales[0].sources.edition_selection_evidence[0].reason,'children_picture')
 // Existing malformed provenance does not block an unrelated repair; correcting it must use the current contract.
 before.sources.edition_selection_evidence=proof
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,[{table:'content_locales',before,patch:{publisher:'Actual publisher'}}]))
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,patch([proof])))
})

test('discarding a known raw provenance wrapper preserves introduction, current sources and protected text without inventing a URL',()=>{
 const data=snapshot(),before=data.content_locales[0]
 before.description='A short existing factual introduction.'
 before.sources={primary:'none',description:{type:'backup-restored',backup:'old-row-copy',original_isbn:'9780140449136',original_sources:{primary:'old'}},identity:'https://publisher.example/work'}
 const edit={table:'content_locales',before,patch:{sources:{...before.sources,description:null}},
  reviewedArchiveProvenanceDiscard:{method:'discard_raw_source_copy',path:'sources.description',reason:'The field contains a raw old row copy rather than a live introduction source URL.'}}
 const plan=planGuardedCatalogRepairs(['work'],data,[edit])
 assert.equal(plan.expected.content_locales[0].description,before.description)
 assert.equal(plan.expected.content_locales[0].sources.description,null)
 assert.equal(plan.expected.content_locales[0].sources.identity,before.sources.identity)
 assert.deepEqual(plan.expected.member_contents,data.member_contents)
 for(const patch of [{...edit.patch,description:'Changed body'},{sources:{...edit.patch.sources,identity:null}},
  {sources:{...edit.patch.sources,description:'https://publisher.example/guessed'}}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...edit,patch}]),/Raw provenance discard/)
 const clean=snapshot(),row=clean.content_locales[0]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],clean,[{table:'content_locales',before:row,
  patch:{sources:{...row.sources,description:before.sources.description}}}]),/must not create or restore research archives/)
})

test('legacy backup labels discard empty copies while preserving an existing live URL and its verification metadata',()=>{
 for(const pointer of [false,true]){
  const data=snapshot(),before=data.content_locales[0]
  before.description='Existing introduction'
  before.sources={primary:'none',description:pointer?{type:'backup-restored',backup:'temporary-file',source:'https://publisher.example/current-isbn',verification:'existing verification'}:
   {type:'backup-restored',backup:'temporary-file',original_sources:null}}
  const description=pointer?{source:before.sources.description.source,verification:before.sources.description.verification}:null
  const edit={table:'content_locales',before,patch:{sources:{...before.sources,description}},
   reviewedArchiveProvenanceDiscard:{method:'discard_raw_source_copy',path:'sources.description',reason:'Remove the old backup reference while retaining the exact current source pointer.'}}
  const after=planGuardedCatalogRepairs(['work'],data,[edit]).expected.content_locales[0]
  assert.deepEqual(after.sources.description,description);assert.equal(after.description,before.description)
  if(pointer)assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...edit,patch:{sources:{...before.sources,description:null}}}]),/Raw provenance discard/)
 }
})

test('encoded and translated legacy backups discard only source copies and never a live URL',()=>{
 const backup={type:'backup-restored',backup:'old/book-descriptions.json',verification:'Existing attribution',original_locale:'ko',original_sources:{primary:'kakao_book'}}
 const translated={type:'locale-translation',snapshot_hash:'existing-hash',source_locale:'en',source_content_id:'work',original_sources:{primary:'openlibrary',description:backup}}
 for(const table of ['content_locales','figure_book_editions'])for(const source of [JSON.stringify(backup),translated]){
  const data=snapshot(),before=data[table][0];before.description='Existing body preserved';before.sources={primary:'openlibrary',description:source,identity:'https://publisher.example/current'}
  const edit={table,before,patch:{sources:{...before.sources,description:null}},reviewedArchiveProvenanceDiscard:{method:'discard_raw_source_copy',path:'sources.description',reason:'Discard the verified nested old source copy, preserving the actual body and current identity.'}}
  const plan=planGuardedCatalogRepairs(['work'],data,[edit]);assert.equal(plan.expected[table][0].description,before.description)
  assert.deepEqual(plan.expected.member_contents,data.member_contents);assert.equal(plan.expected[table][0].sources.identity,before.sources.identity)
  const clean=snapshot(),row=clean[table][0]
  assert.throws(()=>planGuardedCatalogRepairs(['work'],clean,[{table,before:row,patch:{sources:{...row.sources,description:source}}}]),/must not create or restore research archives/)
  for(const invalid of ['{bad json',JSON.stringify({...backup,original_sources:{description:'https://publisher.example/live'}}),
   {...translated,source_content_id:'other'}, {...translated,original_sources:{description:{...backup,type:'provider'}}},
   {...translated,original_sources:{...translated.original_sources,current:'https://publisher.example/live'}}]){
   before.sources.description=invalid
   assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...edit,patch:{sources:{...before.sources,description:null}}}]),/Raw provenance discard/)
  }
 }
})

test('explicit archive discard retains the exact nested live URL and refuses losing or inventing sources',()=>{
 const url='https://openlibrary.org/works/OL85239W'
 for(const table of ['content_locales','figure_book_editions'])for(const encoded of [false,true]){
  const data=snapshot(),before=data[table][0]
  const backup={type:'backup-restored',backup:'old/book-descriptions.json',verification:'Existing attribution',original_locale:'ko',
   original_sources:{primary:'kakao_book',thumbnail:'kakao_book',description:url}}
  before.description='Existing introduction remains unchanged'
  before.sources={primary:'openlibrary',description:encoded?JSON.stringify(backup):backup,identity:'https://publisher.example/current'}
  const proof={method:'discard_raw_source_copy',path:'sources.description',retainedSourceUrl:url,
   reason:'The reviewed old wrapper contains this exact live introduction URL; retain it while discarding the copied archive.'}
  const edit={table,before,patch:{sources:{...before.sources,description:url}},reviewedArchiveProvenanceDiscard:proof}
  const plan=planGuardedCatalogRepairs(['work'],data,[edit])
  assert.equal(plan.expected[table][0].sources.description,url)
  assert.equal(plan.expected[table][0].description,before.description)
  assert.equal(plan.expected[table][0].sources.identity,before.sources.identity)
  assert.deepEqual(plan.expected.member_contents,data.member_contents)
  for(const invalid of [
   {...edit,reviewedArchiveProvenanceDiscard:{...proof,retainedSourceUrl:'https://publisher.example/guessed'}},
   {...edit,reviewedArchiveProvenanceDiscard:{...proof,retainedSourceUrl:undefined}},
   {...edit,patch:{sources:{...before.sources,description:null}}},
   {...edit,patch:{...edit.patch,description:'Changed body'}},
  ])assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[invalid]),/Raw provenance discard/)
  for(const other of [{...backup,verification:'See https://publisher.example/another'},
   {...backup,original_sources:{...backup.original_sources,isbn:'https://publisher.example/other-isbn'}}]){
   before.sources.description=encoded?JSON.stringify(other):other
   assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...edit,patch:{sources:{...before.sources,description:url}}}]),/Raw provenance discard/)
  }
 }
})

function preservedSourceSnapshot(){
 const data=snapshot(),url='https://openlibrary.org/works/OL444779W'
 data.contents[0].metadata.figureBook={workTitle:'Everything and Nothing',workCreator:'Jorge Luis Borges',workIdentity:'wikidata:q16510542'}
 const description='Everything and nothing compiles the finest fictions by Jorge Luis Borges. These stories explore memory, language and imagined worlds.'
 const sources={primary:'openlibrary',workKey:'/works/OL444779W',provider_edition_url:'https://openlibrary.org/books/OL25092567M',
  isbn:'https://openlibrary.org/books/OL25092567M',thumbnail:'https://openlibrary.org/books/OL25092567M',wikidata:'https://www.wikidata.org/wiki/Q16510542'}
 for(const row of [...data.content_locales,...data.figure_book_editions])Object.assign(row,{title:'Everything and Nothing',creator:'Jorge Luis Borges',isbn:'9780811218832',description,sources:structuredClone(sources)})
 data.content_locales.push({content_id:'work',locale:'ko',title:'모든 것과 아무것도 아닌 것',creator:'호르헤 루이스 보르헤스',isbn:null,
  description:'이 책은 호르헤 루이스 보르헤스의 뛰어난 허구 작품들을 모았다. 이야기들은 기억과 언어, 상상 속 세계를 탐구한다.',
  sources:{primary:'none',title:'translated',description:{type:'locale-translation',source_content_id:'work',source_locale:'en',snapshot_hash:'existing-hash',
   original_sources:{primary:'openlibrary',isbn:'https://openlibrary.org/books/OL40116989M',title:'https://openlibrary.org/books/OL40116989M',
    creator:'https://openlibrary.org/books/OL40116989M',wikidata:sources.wikidata}}}})
 data.celeb_contents=[{id:'protected-reading',content_id:'work',review:'Original personal reading',review_en:'Original English personal reading',source_url:'https://interview.example/reading'}]
 const make=(table,before)=>({table,before,patch:{sources:{...before.sources,description:url,description_method:before.locale==='en'?'provider':'translation',description_source_locale:'en'}},
  reviewedIntroductionSourcePointer:{method:'preserved_openlibrary_introduction_source_review',llmReviewed:true,contentId:'work',locale:before.locale,isbn:before.isbn,
   editionTitle:before.title,editionCreator:before.creator,...(table==='figure_book_editions'?{editionId:before.id}:{}),
   workTitle:'Everything and Nothing',workCreator:'Jorge Luis Borges',workIdentity:'wikidata:q16510542',referenceIsbn:'9780811218832',
   referenceWorkTitle:'Everything and Nothing',referenceCreator:'Jorge Luis Borges',sourceUrl:url,sourceFetchedUrl:url+'.json',sourceFetchedKey:'/works/OL444779W',
   sourceFetchedWorkKey:'/works/OL444779W',sourceFetchedTitle:'Everything and nothing',sourceFetchedWorkTitle:'Everything and nothing',sourceFetchedCreator:'Jorge Luis Borges',sourceFetchedDescription:description,
   bodyEvidence:'The LLM read this actual OpenLibrary description and verified the retained prose describes this exact Borges collection.',
   reason:'Retain every existing word and source field; supply the actual OpenLibrary prose URL without claiming independent publication evidence.',
   ...(before.locale==='ko'?{translationReviewed:true,translationSnapshotHash:'existing-hash',translationOriginalDescription:description,translationDescription:before.description,
    translationSourceFetchedUrl:'https://openlibrary.org/books/OL40116989M.json',translationSourceFetchedWorkKey:'/works/OL444779W',
    translationSourceFetchedTitle:'Everything and Nothing',translationSourceFetchedCreator:'Jorge Luis Borges'}:{})}})
 return {data,url,changes:[make('content_locales',data.content_locales[0]),make('figure_book_editions',data.figure_book_editions[0]),make('content_locales',data.content_locales[1])]}
}

test('actual OpenLibrary pointers preserve English prose, its existing Korean translation and every protected row',()=>{
 const {data,url,changes}=preservedSourceSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,changes)
 for(const table of ['content_locales','figure_book_editions'])for(const before of data[table]){
  const after=plan.expected[table].find(row=>rowKeyForTest(table,row)===rowKeyForTest(table,before))
  assert.deepEqual(after,{...before,sources:{...before.sources,description:url,description_method:before.locale==='en'?'provider':'translation',description_source_locale:'en'}})
 }
 for(const table of SNAPSHOT_TABLES.filter(t=>!['content_locales','figure_book_editions'].includes(t)))assert.deepEqual(plan.expected[table],data[table],table)
 assert.equal(plan.expected.content_locales[1].isbn,null)
 const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
 assert.equal((sql.match(/FOR UPDATE/g)||[]).length,18)
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 assert.doesNotMatch(sql,/UPDATE public.celeb_contents|UPDATE public.member_contents|preserved_openlibrary_introduction_source_review|sourceFetchedDescription/)
 const titled=preservedSourceSnapshot()
 for(const row of [...titled.data.content_locales.filter(row=>row.locale==='en'),...titled.data.figure_book_editions])row.title='Everything and Nothing: A New Directions Edition'
 for(const c of titled.changes){c.reviewedIntroductionSourcePointer.editionTitle=c.before.title;c.reviewedIntroductionSourcePointer.referenceWorkTitle=titled.data.content_locales[0].title}
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],titled.data,titled.changes))
})
const rowKeyForTest=(table,row)=>table==='content_locales'?row.locale:String(row.id)

function coauthorSourceSnapshot(count=2){
 const {data,changes,url}=preservedSourceSnapshot()
 data.content_locales=data.content_locales.filter(row=>row.locale==='en');changes.splice(2)
 const original=count===2?['Joe Layden','Sean Astin']:['Author A','Author B','Author C']
 const edition=[...original].reverse(),fetched=[...edition]
 data.contents[0].metadata.figureBook.workCreator=original.join(', ')
 for(const row of [...data.content_locales,...data.figure_book_editions])row.creator=edition.join(', ')
 for(const change of changes){
  const proof=change.reviewedIntroductionSourcePointer
  Object.assign(proof,{editionCreator:change.before.creator,workCreator:data.contents[0].metadata.figureBook.workCreator,
   referenceCreator:data.content_locales[0].creator,sourceFetchedCreator:fetched.join(', '),
   coauthorOrderReview:{method:'independent_coauthor_order_review',llmReviewed:true,originalWork:structuredClone(data.contents[0]),
    currentRow:structuredClone(change.before),referenceLocaleCard:structuredClone(data.content_locales[0]),
    orderedWorkCreators:original,orderedEditionCreators:edition,orderedFetchedCreators:fetched,orderedPublicationCreators:original,
    isbn:data.content_locales[0].isbn,publicationTitle:data.content_locales[0].title,publicationSourceUrl:'https://publisher.example/exact-isbn',
    creditEvidence:'The independent publisher’s exact ISBN credits the same literal coauthor names; their order differs between existing records.',
    reason:'Restore the exact already retained source prose without reordering original metadata, changing coauthors or introducing author aliases.'}})
 }
 return {data,changes,url}
}

test('공동저자 순서 검수는 같은 두세 실명만 대조하며 원작 메타·현재 행·소개를 바꾸지 않는다',()=>{
 for(const count of [2,3]){
  const {data,changes,url}=coauthorSourceSnapshot(count),original=structuredClone(data)
  const missing=structuredClone(changes);delete missing[0].reviewedIntroductionSourcePointer.coauthorOrderReview
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,missing),/Preserved introduction source/)
  const plan=planGuardedCatalogRepairs(['work'],data,changes)
  assert.deepEqual(plan.expected.contents,data.contents)
  for(const table of ['content_locales','figure_book_editions'])for(const row of plan.expected[table]){
   assert.equal(row.sources.description,url);assert.equal(row.description,data[table][0].description);assert.equal(row.creator,data[table][0].creator)
  }
  assert.deepEqual(data,original)
  for(const table of SNAPSHOT_TABLES.filter(t=>!['content_locales','figure_book_editions'].includes(t)))assert.deepEqual(plan.expected[table],data[table],table)
  assert.ok(!buildGuardedCatalogRepairSql(['work'],data,changes).includes('coauthorOrderReview'))
 }
})

test('공동저자 순서는 다른 실명·추가 저자·오래된 원작·카드·다른 ISBN 및 확인 없는 책임표시를 허용하지 않는다',()=>{
 for(const mutate of [
  p=>p.llmReviewed=false,p=>p.originalWork.metadata.figureBook.workCreator='Other author',
  p=>p.currentRow.description='Different body',p=>p.referenceLocaleCard.isbn='9780140449136',
  p=>p.orderedWorkCreators.push('Another person'),p=>p.orderedFetchedCreators=['Sean Astin','Joe L. Layden'],
  p=>p.orderedEditionCreators=['Joe Layden','Sean Astin'],p=>p.orderedPublicationCreators=['Sean Astin','Different writer'],
  p=>p.isbn='9780140449136',p=>p.publicationSourceUrl='https://openlibrary.org/books/OL1M',
  p=>p.publicationTitle='Another book',p=>p.creditEvidence='',
 ]){
  const {data,changes}=coauthorSourceSnapshot();mutate(changes[0].reviewedIntroductionSourcePointer.coauthorOrderReview)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 const {data,changes}=coauthorSourceSnapshot();changes[0].patch.description='New prose unsupported by source'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
})

test('source-pointer review refuses changed prose, other source fields, identities and additional review decisions',()=>{
 for(const edit of [c=>c.patch.description='Changed prose',c=>c.patch.title='Another title',c=>c.patch.isbn='9780140449136',
  c=>c.patch.sources.primary='none',c=>c.patch.sources.thumbnail='https://publisher.example/other',c=>delete c.patch.sources.isbn,
  c=>c.patch.sources.description='https://publisher.example/unread',c=>c.patch.sources.description_method='research',
  c=>c.patch.sources.description_source_locale='ko',c=>c.patch.sources.extraArchive={old:'body'},c=>c.reviewedIntroductionCorrection={},
  c=>{delete c.patch;c.remove=true}]){
  const {data,changes}=preservedSourceSnapshot();edit(changes[0]);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes))
 }
 for(const difference of [{llmReviewed:false},{method:'independent_work_review'},{contentId:'other'},{locale:'ko'},{isbn:'9780140449136'},
  {editionTitle:'Another book'},{editionCreator:'Another writer'},{workTitle:'Another original'},{workCreator:'Another writer'},{workIdentity:'wikidata:q0'},
  {referenceIsbn:'9780140449136'},{referenceWorkTitle:'Other original'},{referenceCreator:'Other writer'},
  {sourceFetchedDescription:'A changed description about another text.'},{sourceFetchedDescription:null},{bodyEvidence:'Guessed'},{reason:''},
  {sourceFetchedKey:'/works/OL1W'},{sourceFetchedWorkKey:'/works/OL1W'},{sourceFetchedCreator:'Another author'},
  {sourceFetchedWorkTitle:'Another original'},{sourceFetchedUrl:'https://openlibrary.org/works/OL1W.json'},
  {sourceUrl:'https://openlibrary.org/works/OL444779W?token=secret'},{sourceUrl:'https://openlibrary.org/works/OL444779W/'},
  {sourceUrl:'https://openlibrary.org.evil.example/works/OL444779W'}]){
  const {data,changes}=preservedSourceSnapshot();Object.assign(changes[0].reviewedIntroductionSourcePointer,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 const {data,changes}=preservedSourceSnapshot();changes[1].reviewedIntroductionSourcePointer.editionId=999
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
})

test('source pointer never replaces another live English source or survives changed original binding in the batch',()=>{
 for(const existing of ['https://publisher.example/current', {type:'provider',source:'https://publisher.example/current'}]){
  const {data,changes}=preservedSourceSnapshot();data.content_locales[0].sources.description=existing
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 for(const field of ['workTitle','workCreator','workIdentity']){
  const {data,changes}=preservedSourceSnapshot(),before=data.contents[0]
  changes.push({table:'contents',before,patch:{metadata:{figureBook:{...before.metadata.figureBook,[field]:'Changed original'}}}})
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 for(const field of ['title','creator','isbn']){
  const {data,changes}=preservedSourceSnapshot();changes[0].patch[field]='Changed reference'
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
})

test('Korean translation pointer requires its exact current English body, actual wrapper owner and same-work old edition',()=>{
 for(const difference of [{translationReviewed:false},{translationSnapshotHash:'other-hash'},{translationOriginalDescription:'Changed English prose'},
  {translationDescription:'새로 쓴 한국어 소개이다.'},{translationSourceFetchedUrl:'https://openlibrary.org/books/OL1M.json'},
  {translationSourceFetchedWorkKey:'/works/OL1W'},{translationSourceFetchedCreator:'Other author'}]){
  const {data,changes}=preservedSourceSnapshot();Object.assign(changes[2].reviewedIntroductionSourcePointer,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 for(const edit of [w=>w.source_content_id='other',w=>w.source_locale='ko',w=>w.type='provider',w=>w.extra_url='https://publisher.example/current',
  w=>w.original_sources.wikidata='https://www.wikidata.org/wiki/Q0',w=>w.original_sources.title='https://openlibrary.org/books/OL1M',
  w=>w.original_sources.description='https://publisher.example/live',w=>w.original_sources.cover='https://publisher.example/live']){
  const {data,changes}=preservedSourceSnapshot();edit(data.content_locales[1].sources.description)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Preserved introduction source/)
 }
 const {data,changes}=preservedSourceSnapshot()
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[changes[2]]),/Preserved introduction source/)
 const encoded=preservedSourceSnapshot();encoded.data.content_locales[1].sources.description=JSON.stringify(encoded.data.content_locales[1].sources.description)
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],encoded.data,encoded.changes))
})

test('exact fetched OpenLibrary edition prose supports M pointers only with its current ISBN and original work key',()=>{
 const {data,changes}=preservedSourceSnapshot(),url=data.content_locales[0].sources.provider_edition_url
 for(const c of changes){c.patch.sources.description=url;Object.assign(c.reviewedIntroductionSourcePointer,{sourceUrl:url,sourceFetchedUrl:url+'.json',sourceFetchedKey:'/books/OL25092567M',
  sourceFetchedTitle:'Everything and Nothing: A New Directions Edition',sourceFetchedIsbns:['9780811218832']})}
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,changes))
 for(const difference of [{sourceFetchedIsbns:[]},{sourceFetchedIsbns:['9780140449136']},{sourceFetchedWorkKey:'/works/OL1W'},
  {sourceFetchedKey:'/books/OL1M'},{sourceFetchedWorkTitle:'Another original'}]){
  const altered=structuredClone(changes);Object.assign(altered[0].reviewedIntroductionSourcePointer,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,altered),/Preserved introduction source/)
 }
})

test('source-pointer readback still rejects protected prose or unrelated source drift and accepts only its expected patch',async()=>{
 for(const drift of ['none','review','source','prose']){
  const {data,changes}=preservedSourceSnapshot(),actual=planGuardedCatalogRepairs(['work'],data,changes).expected
  for(const row of [...actual.content_locales,...actual.figure_book_editions])row.updated_at='changed'
  if(drift==='review')actual.celeb_contents[0].review='Changed personal reading'
  if(drift==='source')actual.content_locales[0].sources.primary='other'
  if(drift==='prose')actual.figure_book_editions[0].description+=' Changed prose'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(captures++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')await run();else await assert.rejects(run,/readback mismatch/)
 }
})

function completeSetSnapshot(){
 const data=snapshot()
 const first={id:1,content_id:'work',locale:'ko',title:'Novel 1',creator:'Author',isbn:'9788932910680',edition_kind:'volume',text_scope:'volume/1',
  description:'Introduction to the first volume.',sources:{translators:['Translator'],description:'https://publisher.example/first'}}
 const whole={...first,id:2,title:'Novel complete set',isbn:'9788932910673',edition_kind:'full',text_scope:'complete',
  description:'Introduction to the complete original novel.',sources:{translators:['Translator'],description:'https://publisher.example/set'}}
 data.figure_book_editions=[first,whole]
 data.content_locales=[{content_id:'work',locale:'ko',title:whole.title,isbn:whole.isbn,description:whole.description,sources:structuredClone(whole.sources)}]
 const proof={method:'independent_complete_set_review',contentId:'work',editionId:1,locale:'ko',editionTitle:first.title,isbn:first.isbn,
  referenceEditionId:2,referenceTitle:whole.title,referenceCreator:whole.creator,referenceIsbn:whole.isbn,translators:['Translator'],
  volumeNumber:1,totalVolumes:2,completeSet:true,sourceUrl:'https://publisher.example/first',referenceSourceUrl:'https://publisher.example/set',
  reason:'Both exact ISBN entries identify the same translation; the complete two-volume set contains this first volume and supplies the whole original.'}
 return {data,removal:{table:'figure_book_editions',before:first,remove:true,reviewedCompleteSetVolumeRemoval:proof}}
}
test('source-reviewed complete set removes only its included first-volume choice while preserving whole edition and protected text',()=>{
 const {data,removal}=completeSetSnapshot(),before=structuredClone(data)
 const plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 assert.deepEqual(data,before)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal])
 assert.ok(sql.includes('edition product history'));assert.ok(!sql.includes('UPDATE public.celeb_contents'))
})
test('complete-set removal rejects unverified translators, unrelated scopes, ISBN drift and lost whole representative',()=>{
 const invalidProofs=[{translators:[]},{translators:['Other translator']},{isbn:'9780140449136'},
  {referenceIsbn:'9780140449136'},{referenceEditionId:1},{volumeNumber:2},{totalVolumes:1},{completeSet:false},
  {sourceUrl:'http://publisher.example/first'},{referenceSourceUrl:'https://openlibrary.org/books/OL1234M'},{reason:''}]
 for(const difference of invalidProofs){const {data,removal}=completeSetSnapshot();assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{
  ...removal,reviewedCompleteSetVolumeRemoval:{...removal.reviewedCompleteSetVolumeRemoval,...difference}}]),/Complete-set/)}
 for(const mutate of [d=>d.figure_book_editions[0].sources.translators=[],d=>d.figure_book_editions[1].sources.translators=['Other'],
  d=>d.figure_book_editions[1].text_scope='1-2',d=>d.figure_book_editions[1].content_id='other',d=>d.figure_book_editions[1].description=null,
  d=>d.figure_book_editions[1].sources.description=null,d=>d.content_locales[0].isbn='9788932910680']){
  const {data,removal}=completeSetSnapshot();mutate(data);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Complete-set/)
 }
 const {data,removal}=completeSetSnapshot()
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal,{table:'figure_book_editions',before:data.figure_book_editions[1],patch:{title:'Other whole title'}}]),/retain/)
 data.figure_book_products=[{id:4,edition_id:1}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/product history/)
})
function originalCompleteSetSnapshot(){
 const {data,removal}=completeSetSnapshot()
 for(const row of data.figure_book_editions)row.sources.translators=[]
 data.content_locales[0].sources.translators=[]
 data.contents[0].metadata.figureBook={originalLanguage:'ko',identityEvidence:'https://publisher.example/original'}
 Object.assign(removal.reviewedCompleteSetVolumeRemoval,{textIdentity:'original',originalLanguage:'ko',translators:[]})
 return {data,removal}
}
test('complete original set removes its first volume without inventing a translator or changing protected rows',()=>{
 const {data,removal}=originalCompleteSetSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal])
 assert.ok(!sql.includes('UPDATE public.celeb_contents'))
})
test('original complete-set path rejects absent original review, language drift and any actual translation',()=>{
 for(const mutate of [
  (d,r)=>delete r.reviewedCompleteSetVolumeRemoval.textIdentity,
  (d,r)=>r.reviewedCompleteSetVolumeRemoval.textIdentity='translation',
  (d,r)=>r.reviewedCompleteSetVolumeRemoval.originalLanguage='en',
  (d,r)=>r.reviewedCompleteSetVolumeRemoval.translators=['Invented translator'],
  d=>d.contents[0].metadata.figureBook.originalLanguage='en',
  d=>delete d.contents[0].metadata.figureBook.identityEvidence,
  d=>d.contents[0].metadata.figureBook.identityEvidence='https://openlibrary.org/works/OL1W',
  d=>d.figure_book_editions[0].sources.translators=['Actual translator'],
  d=>d.figure_book_editions[1].sources.translators=['Actual translator']]){
  const {data,removal}=originalCompleteSetSnapshot();mutate(data,removal)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Complete-set/)
 }
})
function completeSetAtomicIntroduction(){
 const {data,removal}=originalCompleteSetSnapshot(),first=data.figure_book_editions[0],whole=data.figure_book_editions[1],card=data.content_locales[0]
 first.creator=whole.creator='박경리';whole.title='토지 1~20권 세트';whole.publisher='다산책방';whole.thumbnail_url='https://images.example/whole.jpg'
 first.isbn='9791130699462';whole.isbn='9791130699455';whole.description='DAUM'
 const second={...structuredClone(first),id:3,isbn:'9788960532410',publisher:'마로니에북스'};data.figure_book_editions.push(second)
 Object.assign(data.contents[0],{external_id:first.isbn,metadata:{isbn:first.isbn,publisher:whole.publisher,
  figureBook:{workTitle:'The Land',workCreator:'Park Kyung-ri',workIdentity:'park-kyung-ri/the-land'}}})
 Object.assign(card,{title:'토지',creator:'박경리',isbn:first.isbn,description:'DAUM',publisher:null,thumbnail_url:'https://images.example/first.jpg'})
 const sourceUrl='https://publisher.example/land-complete'
 const description='박경리의 대하소설 《토지》는 구한말부터 광복까지 최서희와 김길상을 비롯한 사람들의 삶을 따라간다. 가족의 부침과 식민지 시대의 고난을 그리며 이야기의 무대는 평사리에서 진주와 간도, 경성으로 넓어진다.\n\n이 판본은 작품의 다섯 부를 모두 담은 20권 완질이다. 각 권의 이야기가 이어지며 여러 계층의 인물들이 격변하는 역사 속에서 서로의 삶에 영향을 주는 모습을 보여준다. 출판사는 원문의 표현을 살리면서 오류를 점검하고 어휘 풀이와 인물 계보도를 새로 정비했다.'
 const sources={...whole.sources,description:sourceUrl,description_method:'research',description_source_locale:'ko',scope_source_url:sourceUrl}
 const work=data.contents[0],finalWork={...work,external_id:whole.isbn,metadata:{...work.metadata,isbn:whole.isbn,
  figureBook:{...work.metadata.figureBook,originalLanguage:'ko',identityEvidence:sourceUrl}}}
 const finalCard={...card,isbn:whole.isbn,publisher:whole.publisher,thumbnail_url:whole.thumbnail_url,description,
  sources:{...card.sources,...sources,edition_title:whole.title,selection_source_url:sourceUrl,
   selection_review:'두 출판사의 첫 권과 다산책방의 20권 완질 목차를 읽고 전체 다섯 부를 담은 완질을 대표로 선택했다.'}}
 const intro=row=>({isbn:row.isbn,locale:row.locale,editionTitle:row.title,sourceUrl,reason:'정확한 완질 ISBN의 출판사 소개와 다섯 부 전체 목차를 읽고 완질의 소개를 검수했다.'})
 const removals=[first,second].map(row=>({table:'figure_book_editions',before:row,remove:true,reviewedCompleteSetVolumeRemoval:{
  ...removal.reviewedCompleteSetVolumeRemoval,editionId:row.id,isbn:row.isbn,editionTitle:row.title,referenceTitle:whole.title,
  referenceCreator:whole.creator,referenceIsbn:whole.isbn,totalVolumes:20,referenceSourceUrl:sourceUrl,
  sourceUrl:'https://publisher.example/first-'+row.id,replacementIntroduction:{
   method:'independent_complete_set_introduction_replacement_review',llmReviewed:true,originalWork:structuredClone(work),
   discardedEdition:structuredClone(row),referenceEdition:structuredClone(whole),previousLocaleCard:structuredClone(card),
   selectedLocaleCard:structuredClone(finalCard),selectedWork:structuredClone(finalWork),
   reason:'첫 권 두 개가 완질에 포함되는 부분임을 읽었으며 현재 완질의 포인터 소개를 실제 전체 범위 소개로 함께 보완한다.',
   sourceReview:{llmReviewed:true,isbn:whole.isbn,editionTitle:whole.title,editionCreator:whole.creator,locale:'ko',sourceUrl,totalVolumes:20,completeSet:true,
    bodyEvidence:'출판사 원문에서 최서희와 김길상의 이야기, 구한말부터 광복까지의 전개와 완질 정비 내용을 읽었다.',
    scopeEvidence:'정확한 완질 ISBN의 수록 목록은 토지 다섯 부와 총 스무 권을 모두 포함하며 두 첫 권의 시작 부분도 포함한다.'}}}}))
 return {data,changes:[...removals,{table:'contents',before:work,patch:{external_id:finalWork.external_id,metadata:finalWork.metadata}},
  {table:'content_locales',before:card,patch:Object.fromEntries(['isbn','publisher','thumbnail_url','description','sources'].map(key=>[key,finalCard[key]])),reviewedIntroductionCorrection:intro(card)},
  {table:'figure_book_editions',before:whole,patch:{description,sources},reviewedIntroductionCorrection:intro(whole)}]}
}

test('완질 포인터 소개 보완은 두 첫 권 삭제·대표 선택·원어 근거 추가와 같은 transaction에서만 허용한다',()=>{
 const {data,changes}=completeSetAtomicIntroduction(),original=structuredClone(data),plan=planGuardedCatalogRepairs(['work'],data,changes)
 assert.equal(plan.expected.figure_book_editions.length,1);assert.equal(plan.expected.figure_book_editions[0].description,plan.expected.content_locales[0].description)
 assert.equal(plan.expected.contents[0].metadata.figureBook.originalLanguage,'ko');assert.deepEqual(data,original)
 for(const table of SNAPSHOT_TABLES.filter(table=>!['contents','content_locales','figure_book_editions'].includes(table)))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[...changes].reverse())
 assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions'))
 assert.ok(!sql.includes('replacementIntroduction'));assert.ok(sql.includes('edition product history'))
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
})

test('완질 소개 보완은 오래된 신원·다른 원작·범위 변경·출처 부재·실카드 불일치를 거부한다',()=>{
 for(const mutate of [
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.originalWork.metadata.figureBook.workIdentity='other',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.referenceEdition.publisher='다른 출판사',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.discardedEdition.isbn='9780140449136',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.previousLocaleCard.title='다른 책',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.sourceReview.bodyEvidence='제목만 일치',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.sourceReview.scopeEvidence='',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.sourceReview.sourceUrl='https://openlibrary.org/books/OL1M',
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction.sourceReview.totalVolumes=19,
  (d,c)=>c[4].patch.edition_kind='volume',
  (d,c)=>c[4].patch.sources.translators=['실제로 없는 역자'],
  (d,c)=>c[3].patch.description+=' 다른 소개',
  (d,c)=>c[3].patch.sources.provider_edition_url='https://publisher.example/other',
  (d,c)=>c[2].patch.metadata.figureBook.workCreator='Another writer',
  (d,c)=>delete c[2].patch.metadata.figureBook.originalLanguage,
  (d,c)=>delete c[4].reviewedIntroductionCorrection,
  (d,c)=>c[0].reviewedCompleteSetVolumeRemoval.referenceAfterPatch=true,
  (d,c)=>delete c[0].reviewedCompleteSetVolumeRemoval.replacementIntroduction,
  (d,c)=>d.figure_book_products.push({id:8,edition_id:3}),
 ]){
  const {data,changes}=completeSetAtomicIntroduction();mutate(data,changes)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes))
 }
})

test('완질 atomic 경로도 현재 행 CAS와 적용 후 18표·보호 관계 재조회를 강제한다',async()=>{
 for(const drift of ['none','edition','review','array']){
  const {data,changes}=completeSetAtomicIntroduction(),plan=planGuardedCatalogRepairs(['work'],data,changes),actual=structuredClone(plan.expected)
  if(drift==='edition')actual.figure_book_editions[0].publisher='Changed'
  if(drift==='review')actual.member_contents[0].review='Changed protected reading'
  if(drift==='array')actual.faction_lv2[0].theme_book_ids=[]
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(captures++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
 const {data,changes}=completeSetAtomicIntroduction();data.figure_book_editions[0].publisher='stale publisher'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Complete-set/)
})

test('완질 최종 행 복사본을 함께 바꾸어도 서지·원작 신원·소개 언어·다른 출처의 위장은 허용하지 않는다',()=>{
 for(const mutate of [
  c=>c[4].patch.publisher='다른 출판사',c=>c[4].patch.isbn='9780140449136',
  c=>c[4].patch.edition_kind='volume',c=>c[4].patch.title='다른 완질',
  c=>c[2].patch.metadata.figureBook.workIdentity='another-work',
  c=>c[2].patch.metadata.figureBook.originalLanguage='en',
  c=>c[3].patch.affiliate_url='https://shop.example/new-product',
  c=>c[3].patch.sources.primary='none',
  c=>c[3].patch.sources.provider_edition_url='https://publisher.example/other-edition',
  c=>c[3].patch.sources.description_method='provider',
  c=>c[3].patch.description=c[4].patch.description='This is an English introduction to the complete twenty-volume novel. '.repeat(6),
 ]){
  const {data,changes}=completeSetAtomicIntroduction();mutate(changes)
  for(const removal of changes.filter(c=>c.remove)){
   const proof=removal.reviewedCompleteSetVolumeRemoval.replacementIntroduction
   proof.selectedLocaleCard={...data.content_locales[0],...structuredClone(changes[3].patch)}
   proof.selectedWork={...data.contents[0],...structuredClone(changes[2].patch)}
  }
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes))
 }
})

function nonstartSnapshot(original=false){
 const {data,removal}=completeSetSnapshot(),later=data.figure_book_editions[0],first=data.figure_book_editions[1]
 later.title='Novel lower volume';later.edition_kind='full';later.text_scope=null
 first.title='Novel upper volume';first.edition_kind='volume';first.text_scope='volume/1'
 const proof={...removal.reviewedCompleteSetVolumeRemoval,method:'independent_nonstart_volume_review',editionTitle:later.title,
  referenceTitle:first.title,volumeNumber:2,continuousText:true,textIdentity:original?'original':'translation'}
 if(original){later.sources.translators=[];first.sources.translators=[];proof.originalLanguage='ko';data.contents[0].metadata.figureBook={
  originalLanguage:'ko',identityEvidence:'https://publisher.example/original-author'}}
 return {data,removal:{table:'figure_book_editions',before:later,remove:true,reviewedNonstartEditionRemoval:proof}}
}

function differentlyTranslatedPartsSnapshot(){
 const {data,removal}=nonstartSnapshot(),[later,first]=data.figure_book_editions
 later.sources.translators=['Later translator'];first.sources.translators=['First translator']
 Object.assign(data.contents[0].metadata.figureBook,{workIdentity:'Original author/Continuous novel',originalTitle:'Continuous novel',
  originalCreator:'Original author',series:{title:'Continuous novel'}})
 const proof=removal.reviewedNonstartEditionRemoval
 Object.assign(proof,{textIdentity:'continuous_translation_parts',referenceVolumeNumber:1})
 proof.reviewedContinuousTranslationParts={method:'independent_continuous_translation_parts_review',llmReviewed:true,
  contentId:'work',workIdentity:'Original author/Continuous novel',originalTitle:'Continuous novel',originalCreator:'Original author',seriesTitle:'Continuous novel',
  firstEditionId:first.id,firstIsbn:first.isbn,firstTitle:first.title,firstTranslators:['First translator'],firstVolumeNumber:1,
  laterEditionId:later.id,laterIsbn:later.isbn,laterTitle:later.title,laterTranslators:['Later translator'],laterVolumeNumber:2,totalVolumes:3,
  firstSourceUrl:proof.referenceSourceUrl,laterSourceUrl:proof.sourceUrl,seriesSourceUrl:'https://publisher.example/continuous-original',
  bodyEvidence:'The LLM read the publisher’s three-part continuous original and exact volume-specific library records, which name different translators for different parts.'}
 return {data,removal}
}

function openingOmnibusSnapshot(){
 const {data,removal}=differentlyTranslatedPartsSnapshot(),[later,first]=data.figure_book_editions
 Object.assign(data.contents[0].metadata.figureBook,{workTitle:'Continuous novel',workCreator:'Original author'})
 first.title='Opening omnibus: original volumes 1, 2 and 3';first.text_scope='Opening omnibus: includes original volumes 1, 2 and 3'
 Object.assign(data.content_locales[0],{title:'Continuous novel, volume 1',creator:first.creator,isbn:first.isbn})
 const proof=removal.reviewedNonstartEditionRemoval
 proof.referenceTitle=first.title;proof.volumeNumber=26
 Object.assign(proof.reviewedContinuousTranslationParts,{firstTitle:first.title,laterVolumeNumber:26,totalVolumes:30})
 const figure=data.contents[0].metadata.figureBook
 proof.referenceOpeningOmnibusReview={method:'independent_reference_opening_omnibus_review',llmReviewed:true,
  currentWork:structuredClone(data.contents[0]),workAnchor:Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,figure[key]??null])),
  referenceEdition:structuredClone(first),selectedLocaleCard:structuredClone(data.content_locales[0]),textScope:first.text_scope,
  openingOriginalVolume:1,includedOriginalVolumes:[1,2,3],sourceReview:{llmReviewed:true,sourceKind:'publisher',sourceUrl:proof.referenceSourceUrl,
   isbn:first.isbn,editionTitle:first.title,editionCreator:first.creator,workTitle:figure.workTitle,workCreator:figure.workCreator,
   bodyLanguage:first.locale,includedOriginalVolumes:[1,2,3],bodyEvidence:'The publisher describes the opening adventures in the first three original volumes, rather than the later-volume text.',
   scopeEvidence:'The exact publisher ISBN is explicitly an opening omnibus containing original volumes one, two and three.'}}
 return {data,removal}
}

test('selected opening omnibus removes a later part without relabeling the actual omnibus or changing any protected row',()=>{
 const {data,removal}=openingOmnibusSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 assert.equal(plan.expected.figure_book_editions[0].text_scope,'Opening omnibus: includes original volumes 1, 2 and 3')
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal])
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('referenceOpeningOmnibusReview'));assert.ok(!sql.includes('UPDATE public.celeb_contents'))
})

test('opening omnibus review rejects stale originals, references, selected cards, ISBNs, scopes and foreign publisher assertions',()=>{
 for(const mutate of [
  p=>{p.llmReviewed=false},p=>{p.method='automatic'},p=>{p.workAnchor.workIdentity='other-work'},
  p=>{p.currentWork.metadata.figureBook.workCreator='Other writer'},p=>{p.referenceEdition.id=999},
  p=>{p.referenceEdition.isbn='9780140449136'},p=>{p.referenceEdition.text_scope='volume/1'},
  p=>{p.selectedLocaleCard.isbn='9780140449136'},p=>{p.selectedLocaleCard.title='Stale selected title'},
  p=>{p.textScope='volume/1'},p=>{p.openingOriginalVolume=2},p=>{p.includedOriginalVolumes=[2,3,4]},
  p=>{p.includedOriginalVolumes=[1,3]},p=>{p.includedOriginalVolumes=[1]},
  p=>{p.sourceReview.llmReviewed=false},p=>{p.sourceReview.sourceKind='unread'},
  p=>{p.sourceReview.isbn='9780140449136'},p=>{p.sourceReview.editionTitle='Other omnibus'},
  p=>{p.sourceReview.editionCreator='Other writer'},p=>{p.sourceReview.workTitle='Other work'},
  p=>{p.sourceReview.workCreator='Other writer'},p=>{p.sourceReview.bodyLanguage='fr'},
  p=>{p.sourceReview.sourceUrl='https://openlibrary.org/books/OL1M'},p=>{p.sourceReview.sourceUrl=null},
  p=>{p.sourceReview.includedOriginalVolumes=[1,2]},p=>{p.sourceReview.bodyEvidence='Title only'},
  p=>{p.sourceReview.scopeEvidence='No evidence'}]){
  const {data,removal}=openingOmnibusSnapshot();mutate(removal.reviewedNonstartEditionRemoval.referenceOpeningOmnibusReview)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 }
})

test('opening omnibus never bypasses same-text continuity, product history or final representative preservation',()=>{
 for(const mutate of [
  (d,r)=>delete r.reviewedNonstartEditionRemoval.referenceOpeningOmnibusReview,
  (d,r)=>{r.reviewedNonstartEditionRemoval.referenceAfterPatch=true},
  (d,r)=>{r.reviewedNonstartEditionRemoval.textIdentity='translation';r.reviewedNonstartEditionRemoval.translators=['First translator']},
  (d,r)=>{r.reviewedNonstartEditionRemoval.continuousText=false},
  (d,r)=>{r.reviewedNonstartEditionRemoval.volumeNumber=2},
  d=>{d.figure_book_products.push({id:'existing-sale',edition_id:d.figure_book_editions[0].id})}]){
  const {data,removal}=openingOmnibusSnapshot();mutate(data,removal)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]))
 }
 const {data,removal}=openingOmnibusSnapshot(),card=data.content_locales[0]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal,{table:'content_locales',before:card,patch:{creator:'Changed writer'}}]),/opening omnibus/)
})

test('opening omnibus actual readback keeps all eighteen protected sets and rejects member or reference drift',async()=>{
 for(const drift of ['none','member','scope','card']){
  const {data,removal}=openingOmnibusSnapshot(),after=structuredClone(planGuardedCatalogRepairs(['work'],data,[removal]).expected)
  if(drift==='member')after.member_contents[0].review='Unexpected member rewrite'
  if(drift==='scope')after.figure_book_editions[0].text_scope='volume/1'
  if(drift==='card')after.content_locales[0].title='Unrelated selected card'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],[removal],{capture:async()=>structuredClone(captures++?after:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

test('actual different translators of continuous parts do not create later-part choices or equivalent text mappings',()=>{
 const {data,removal}=differentlyTranslatedPartsSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 assert.deepEqual(plan.expected.figure_book_editions[0].sources.translators,['First translator'])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal])
 assert.ok(!sql.includes('UPDATE public.celeb_contents'));assert.ok(!sql.includes('reviewedContinuousTranslationParts'))
})

test('continuous parts reject changed ISBNs, original identities, translators, part numbers and absent independent body evidence',()=>{
 for(const difference of [{method:'automatic'},{llmReviewed:false},{contentId:'other'},{workIdentity:'Other original'},
  {originalTitle:'Other novel'},{originalCreator:'Other writer'},{seriesTitle:'Other series'},
  {firstEditionId:999},{firstIsbn:'9780140449136'},{firstTitle:'Other first'},
  {laterEditionId:999},{laterIsbn:'9780140449136'},{laterTitle:'Other later'},
  {firstTranslators:['Unverified translator']},{laterTranslators:['First translator']},
  {firstVolumeNumber:2},{laterVolumeNumber:1},{laterVolumeNumber:3},{totalVolumes:1},{totalVolumes:1000},
  {firstSourceUrl:'https://different.example/first'},{laterSourceUrl:'https://different.example/later'},
  {seriesSourceUrl:'https://openlibrary.org/works/OL1W'},{seriesSourceUrl:'https://publisher.example/?api_key=secret'},
  {bodyEvidence:'Title matches'}]){
  const {data,removal}=differentlyTranslatedPartsSnapshot()
  Object.assign(removal.reviewedNonstartEditionRemoval.reviewedContinuousTranslationParts,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 }
 for(const mutate of [
  (data,removal)=>delete removal.reviewedNonstartEditionRemoval.reviewedContinuousTranslationParts,
  (data,removal)=>removal.reviewedNonstartEditionRemoval.referenceVolumeNumber=2,
  data=>data.figure_book_editions[1].text_scope='volume/2',
  data=>delete data.contents[0].metadata.figureBook.originalTitle,
  data=>data.figure_book_editions[0].sources.translators=['First translator'],
  data=>data.figure_book_products.push({id:5,edition_id:1})]){
  const {data,removal}=differentlyTranslatedPartsSnapshot();mutate(data,removal)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]))
 }
})

test('complete-set selection can normalize the actual whole set after deleting its included first choice atomically',()=>{
 const {data,removal}=originalCompleteSetSnapshot(),whole=data.figure_book_editions[1],locale=data.content_locales[0]
 whole.edition_kind=null;whole.text_scope=null;locale.isbn=data.figure_book_editions[0].isbn
 const edits=[{table:'figure_book_editions',before:whole,patch:{edition_kind:'full',text_scope:'complete'}},
  {table:'content_locales',before:locale,patch:{isbn:whole.isbn}},removal]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,edits),/Complete-set/)
 removal.reviewedCompleteSetVolumeRemoval.referenceAfterPatch=true
 const plan=planGuardedCatalogRepairs(['work'],data,edits)
 assert.equal(plan.expected.figure_book_editions.length,1);assert.equal(plan.expected.figure_book_editions[0].text_scope,'complete')
 for(const table of SNAPSHOT_TABLES.filter(table=>!['figure_book_editions','content_locales'].includes(table)))assert.deepEqual(plan.expected[table],data[table],table)
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...edits[0],patch:{edition_kind:'full',text_scope:'abridged'}},...edits.slice(1)]),/Complete-set/)
})

function songScoreSnapshot(){
 const {data,removal}=nonstartSnapshot(true),later=data.figure_book_editions[0],first=data.figure_book_editions[1]
 later.text_scope='song/Later song';later.edition_kind='volume';first.text_scope='song/Representative song'
 const series={title:'One-song teaching scores',creator:first.creator,locale:'ko',sourceUrl:'https://publisher.example/series'}
 data.contents[0].metadata.figureBook.series=series
 const proof={...removal.reviewedNonstartEditionRemoval,method:'independent_song_score_series_review',
  textScope:later.text_scope,referenceTextScope:first.text_scope,sameTeachingFormat:true,individualSongScores:true,
  seriesTitle:series.title,seriesCreator:series.creator,seriesSourceUrl:series.sourceUrl}
 delete proof.textIdentity;delete proof.continuousText;delete proof.volumeNumber
 return {data,removal:{table:'figure_book_editions',before:later,remove:true,reviewedSongScoreSeriesEditionRemoval:proof}}
}

test('reviewed one-song teaching series retains one score without asserting the songs are identical',()=>{
 const {data,removal}=songScoreSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
})

test('song-score series selection rejects independent collections, invented continuity, provenance drift and protected history',()=>{
 for(const difference of [{sameTeachingFormat:false},{individualSongScores:false},{continuousText:true},{textIdentity:'original'},
  {seriesTitle:'Unrelated series'},{seriesCreator:'Other creator'},{seriesSourceUrl:'https://openlibrary.org/works/OL1W'},
  {textScope:'song/Other song'},{referenceTextScope:'song/Other song'},{referenceIsbn:'9780140449136'},
  {sourceUrl:'https://books.google.com/books?id=source'},{referenceSourceUrl:'https://www.googleapis.com/books/v1/volumes/first'}]){
  const {data,removal}=songScoreSnapshot();Object.assign(removal.reviewedSongScoreSeriesEditionRemoval,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Song-score/)
 }
 for(const mutate of [d=>d.figure_book_editions[0].text_scope='complete',d=>d.figure_book_editions[1].text_scope='complete',
  d=>d.figure_book_editions[0].sources.translators=['Translator'],d=>d.contents[0].metadata.figureBook.series.locale='en',
  d=>d.content_locales[0].isbn=d.figure_book_editions[0].isbn]){
  const {data,removal}=songScoreSnapshot();mutate(data);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Song-score/)
 }
 const history=songScoreSnapshot();history.data.figure_book_products=[{id:5,edition_id:history.removal.before.id}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],history.data,[history.removal]),/product history/)
 const changed=songScoreSnapshot();assert.throws(()=>planGuardedCatalogRepairs(['work'],changed.data,[changed.removal,
  {table:'figure_book_editions',before:changed.data.figure_book_editions[1],patch:{description:'Changed score introduction'}}]),/unchanged/)
})
test('direct later-volume selection removes a source-confirmed subset even when live scope metadata is wrong',()=>{
 for(const original of [false,true]){
  const {data,removal}=nonstartSnapshot(original),plan=planGuardedCatalogRepairs(['work'],data,[removal])
  assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
  for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 }
})
test('later-volume removal rejects unverified continuity, original language, translation, identity drift and lost representative',()=>{
 for(const difference of [{volumeNumber:1},{referenceVolumeNumber:2},{continuousText:false},{isbn:'9780140449136'},{referenceTitle:'Other first'},
  {textIdentity:'original'},{translators:[]},{referenceSourceUrl:'http://publisher.example/first'},{sourceUrl:'https://openlibrary.org/books/OL1M'}]){
  const {data,removal}=nonstartSnapshot();assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,
   reviewedNonstartEditionRemoval:{...removal.reviewedNonstartEditionRemoval,...difference}}]),/Nonstart/)
 }
 const {data,removal}=nonstartSnapshot(true);data.contents[0].metadata.figureBook.originalLanguage='en'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 const valid=nonstartSnapshot();valid.data.figure_book_products=[{id:5,edition_id:1}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],valid.data,[valid.removal]),/product history/)
 const altered=nonstartSnapshot();assert.throws(()=>planGuardedCatalogRepairs(['work'],altered.data,[altered.removal,
  {table:'figure_book_editions',before:altered.data.figure_book_editions[1],patch:{description:'Changed first intro'}}]),/retain/)
})
test('source-confirmed first volume may keep its unchanged unknown scope until later-volume removal unblocks normalization',()=>{
 const {data,removal}=nonstartSnapshot(true),first=data.figure_book_editions[1]
 first.edition_kind=null;first.text_scope=null
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 removal.reviewedNonstartEditionRemoval.referenceVolumeNumber=1
 const plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[first])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 for(const scope of ['volume/2','abridged','unknown']){
  first.text_scope=scope;assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 }
})

test('explicit exact-ISBN translator review removes a later part without first writing rejected metadata',()=>{
 const {data,removal}=nonstartSnapshot(),first=data.figure_book_editions[1]
 data.figure_book_editions[0].sources.translators=[]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 removal.reviewedNonstartEditionRemoval.reviewedTranslationAttribution=true
 assert.deepEqual(planGuardedCatalogRepairs(['work'],data,[removal]).expected.figure_book_editions,[first])
 data.figure_book_editions[0].sources.translators=['Another translator']
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
 data.figure_book_editions[0].sources.translators=[];first.sources.translators=['Another translator']
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Nonstart/)
})

test('reviewed future first replacement and later removal validate the final exact representative and execute deletion first',()=>{
 const {data,removal}=nonstartSnapshot(true),first=data.figure_book_editions[1],locale=data.content_locales[0]
 first.title='Novel volume 10';first.isbn='9780140449136';first.text_scope='volume/10'
 locale.title=first.title;locale.isbn=first.isbn
 const patch={title:'Novel first volume',isbn:'9788932910673',edition_kind:'volume',text_scope:'volume/1'}
 const edits=[{table:'figure_book_editions',before:first,patch},
  {table:'content_locales',before:locale,patch:{title:patch.title,isbn:patch.isbn}},removal]
 const proof=removal.reviewedNonstartEditionRemoval
 proof.referenceTitle=patch.title;proof.referenceIsbn=patch.isbn
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,edits),/Nonstart/)
 proof.referenceAfterPatch=true
 const plan=planGuardedCatalogRepairs(['work'],data,edits)
 assert.equal(plan.expected.figure_book_editions[0].isbn,patch.isbn)
 assert.equal(plan.expected.content_locales[0].isbn,patch.isbn)
 assert.deepEqual(plan.expected.member_contents,data.member_contents)
 const sql=buildGuardedCatalogRepairSql(['work'],data,edits)
 assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions'))
 const drift=structuredClone(edits);drift[0].patch.isbn='9780140449136'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,drift),/Nonstart/)
 const missing=edits.filter(edit=>edit.table!=='content_locales')
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,missing),/Nonstart/)
 data.figure_book_products=[{id:7,edition_id:removal.before.id}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,edits),/product history/)
})

const reviewedIntroduction=()=>({contentId:'work',locale:'en',isbn:'9780674250703',description:'The author’s letters to friends and family reveal the composition of the poems.',
 sourceUrl:'https://publisher.example/letters',method:'research',sourceLocale:'en',reason:'The publisher identifies this exact ISBN as the letters; the existing introduction describes another collection.'})
function exactIntroductionSnapshot(){
 const data=snapshot()
 for(const table of ['content_locales','figure_book_editions']){
  data[table][0].isbn='9780674250703';data[table][0].description='Wrong poetry introduction'
  data[table][0].sources={primary:'openlibrary',description:'https://publisher.example/poems',translators:['Verified translator']}
 }
 data.figure_book_editions.push({...data.figure_book_editions[0],id:2,isbn:'9780140449136',sources:{translators:['Other translator']}})
 data.figure_book_editions.push({...data.figure_book_editions[0],id:3,content_id:'other'})
 data.figure_book_editions.push({...data.figure_book_editions[0],id:4,locale:'ko'})
 return data
}
test('reviewed introduction expands only to exact work, locale and physical ISBN while retaining other translations and protected data',()=>{
 const data=exactIntroductionSnapshot(),review=reviewedIntroduction(),changes=expandReviewedExactIsbnIntroductionChanges(data,[review])
 assert.equal(changes.length,2)
 assert.deepEqual(changes.map(row=>[row.table,row.before.id??row.before.content_id]),[['content_locales','work'],['figure_book_editions',1]])
 const expected=planGuardedCatalogRepairs(['work'],data,changes).expected
 for(const table of ['content_locales','figure_book_editions']){
  assert.equal(expected[table][0].description,review.description)
  assert.deepEqual(expected[table][0].sources.translators,['Verified translator'])
 }
 assert.deepEqual(expected.figure_book_editions.slice(1),data.figure_book_editions.slice(1))
 assert.deepEqual(expected.member_contents,data.member_contents)
 assert.deepEqual(expected.faction_lv2,data.faction_lv2)
 assert.notEqual(changes[0].before,data.content_locales[0])
 assert.equal(data.content_locales[0].description,'Wrong poetry introduction')
})
test('exact introduction assembly rejects stale reviewed rows, overlapping decisions and missing independent evidence',()=>{
 const data=exactIntroductionSnapshot(),review=reviewedIntroduction(),changes=expandReviewedExactIsbnIntroductionChanges(data,[review])
 data.content_locales[0].title='Changed after the source review'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/before row differs/)
 assert.throws(()=>expandReviewedExactIsbnIntroductionChanges(exactIntroductionSnapshot(),[review,review]),/Repeated/)
 for(const patch of [{contentId:'other'},{isbn:'9780140449181'},{isbn:'invalid'},{locale:'fr'},{description:'OPEN'},
  {sourceUrl:'https://openlibrary.org/books/OL1M'},{sourceUrl:'https://publisher.example/?api_key=secret'},{reason:''},
  {method:'research',sourceLocale:'ko'},{method:'translation',sourceLocale:'en'}])
  assert.throws(()=>expandReviewedExactIsbnIntroductionChanges(exactIntroductionSnapshot(),[{...review,...patch}]))
 const incomplete=exactIntroductionSnapshot();delete incomplete.celeb_contents
 assert.throws(()=>expandReviewedExactIsbnIntroductionChanges(incomplete,[review]),/Missing catalog snapshot/)
})
test('normalized ISBN10 binds the same physical book but display-only cards and different ISBNs are not guessed',()=>{
 const data=exactIntroductionSnapshot(),review={...reviewedIntroduction(),isbn:'0674250702'}
 data.content_locales[0].isbn=null
 const changes=expandReviewedExactIsbnIntroductionChanges(data,[review])
 assert.equal(changes.length,1);assert.equal(changes[0].before.id,1)
 assert.equal(changes[0].reviewedIntroductionCorrection.isbn,'9780674250703')
})
test('verbatim provider introductions retain their method and body language without being relabeled as generated prose',()=>{
 const data=exactIntroductionSnapshot(),changes=expandReviewedExactIsbnIntroductionChanges(data,[{...reviewedIntroduction(),method:'provider'}])
 assert.equal(changes[0].patch.sources.description_method,'provider')
 assert.equal(changes[0].patch.sources.description_source_locale,'en')
 assert.doesNotThrow(()=>planGuardedCatalogRepairs(['work'],data,changes))
 assert.throws(()=>expandReviewedExactIsbnIntroductionChanges(data,[{...reviewedIntroduction(),method:'provider',sourceLocale:'ko'}]))
})

test('wrongly attributed introduction correction requires explicit exact-edition independent source review',()=>{
 const data=snapshot(),before=data.figure_book_editions[0]
 before.isbn='9780674250703';before.description='Poetry collection introduction wrongly attached to the letters.'
 before.sources.description='https://publisher.example/wrong-poems'
 const source='https://publisher.example/selected-letters'
 const patch={title:'Selected Letters',description:'Letters from the author to family, friends and literary correspondents.',sources:{...before.sources,description:source,description_method:'research'}}
 const proof={isbn:before.isbn,locale:before.locale,editionTitle:patch.title,sourceUrl:source,reason:'Publisher identifies this exact ISBN as the letters, while the existing prose describes a poetry collection.'}
 const correction={table:'figure_book_editions',before,patch,reviewedIntroductionCorrection:proof}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:correction.table,before,patch}]),/retained/)
 const plan=planGuardedCatalogRepairs(['work'],data,[correction])
 assert.equal(plan.expected.figure_book_editions[0].description,patch.description)
 assert.deepEqual(plan.expected.member_contents,data.member_contents)
 for(const difference of[{isbn:'9780140449136'},{locale:'ko'},{editionTitle:'Another Book'},{sourceUrl:'http://publisher.example/book'},{sourceUrl:'https://openlibrary.org/books/OL1M'},{reason:''}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]),/Introduction correction/)
 for(const difference of[{description:null},{description:'OPEN'},{sources:{description:'https://publisher.example/unrelated'}}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{...patch,...difference}}]),/Introduction correction/)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[correction])
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 assert.ok(!sql.includes('UPDATE public.celeb_contents'))
 assert.ok(!sql.includes('reviewedIntroductionCorrection'))
 assert.equal(data.figure_book_editions[0].description,before.description)
})

test('invalid introduction can be explicitly cleared; ISBN-less display translation binds only to its actual work edition',()=>{
 const data=snapshot(),edition=data.figure_book_editions[0],before=data.content_locales[0]
 edition.isbn='9780674250703';before.isbn=null;before.sources={primary:'none'};before.description='Wrong inherited introduction';before.locale='ko'
 const source='https://publisher.example/selected-letters'
 const proof={isbn:edition.isbn,locale:'ko',editionTitle:'선택된 서간',referenceEditionId:edition.id,referenceLocale:'en',sourceUrl:source,reason:'Wrong poetry prose inherited from the actual English letters edition.'}
 const patch={title:proof.editionTitle,description:'시인이 가족과 친구들에게 보낸 편지를 모은 서간집이다.',sources:{primary:'none',description:source,description_method:'translation',description_source_locale:'en'}}
 const correction={table:'content_locales',before,patch,reviewedIntroductionCorrection:proof}
 const expected=planGuardedCatalogRepairs(['work'],data,[correction]).expected
 assert.equal(expected.content_locales[0].isbn,null)
 assert.equal(expected.content_locales[0].sources.primary,'none')
 for(const difference of[{referenceEditionId:99},{referenceLocale:'ko'},{isbn:'9780140449136'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]),/Introduction correction/)
 const old=structuredClone(data);old.figure_book_editions[0].content_id='other'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],old,[correction]),/Introduction correction/)
 const clearing={...correction,patch:{...patch,description:null,sources:{...patch.sources,description:null}}}
 assert.equal(planGuardedCatalogRepairs(['work'],data,[clearing]).expected.content_locales[0].description,null)
 assert.deepEqual(expected.member_contents,data.member_contents)
})

test('incorrect ISBN-less locale prose can be cleared using the same-work physical locale without creating an edition',()=>{
 const data=snapshot();data.figure_book_editions=[]
 const reference=data.content_locales[0];Object.assign(reference,{isbn:'9780007455669',title:'Steve Biddulph’s Raising Girls',creator:'Steve Biddulph'})
 const before={content_id:'work',locale:'ko',title:'여자아이 키우기',creator:'스티브 비덜프',isbn:null,
  description:'스티브 프랜시스의 농구 선수 경력과 한국 현대문학의 역사에 관한 잘못된 소개가 함께 붙어 있다.',sources:{primary:'none',description:'https://encyclopedia.example/wrong-person'}}
 data.content_locales.push(before)
 const source='https://obnb.uk/p16171714-steve-biddulphs-raising-girls'
 const proof={method:'independent_locale_reference_introduction_review',contentId:'work',referenceLocale:'en',referenceWorkTitle:reference.title,referenceCreator:reference.creator,
  isbn:reference.isbn,locale:'ko',editionTitle:before.title,sourceUrl:source,reason:'Independent bibliography confirms the parenting original and author; the Korean prose describes unrelated basketball and literature.',evidence:[{url:source,note:'Actual title, original author and parenting subject confirmed.'}]}
 const correction={table:'content_locales',before,patch:{description:null,sources:{primary:'none',description:null}},reviewedIntroductionCorrection:proof}
 const expected=planGuardedCatalogRepairs(['work'],data,[correction]).expected
 assert.deepEqual(expected.figure_book_editions,[]);assert.deepEqual(expected.content_locales[0],reference)
 assert.equal(expected.content_locales[1].isbn,null);assert.equal(expected.content_locales[1].description,null)
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='content_locales'))assert.deepEqual(expected[table],data[table])
 for(const difference of [{contentId:'other'},{referenceCreator:'Other author'},{referenceWorkTitle:'Other work'},{isbn:'9780140449136'},{reason:'Short'},{evidence:[]}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]))
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{description:null,sources:{primary:'none',description:source}}}]))
})

test('independently researched ISBN-less original correction binds the actual author and keeps all protected rows',()=>{
 const data=snapshot();data.figure_book_editions=[];data.contents[0].metadata={}
 const before=data.content_locales[0];Object.assign(before,{title:'Original work',creator:'Actual author',isbn:null,description:'Wrong imported account of another book.',sources:{primary:'none'}})
 const source='https://encyclopedia.example/original-work'
 const description=('This original novella follows people whose lives are changed by war and the division of their homeland. It examines their separation, memories and choices through the author’s account of the conflict, bringing together the experiences of families separated by historical events.\n\nThe narrative connects private loss with the wider social consequences of division and shows how those historical events affect ordinary people and their sense of belonging. The book offers a view of the period through the lives of its characters rather than through a general historical survey.')
 const proof={method:'independent_work_introduction_review',contentId:'work',referenceLocale:'en',referenceWorkTitle:before.title,referenceCreator:before.creator,
  locale:'en',editionTitle:'Original work',sourceUrl:source,reason:'Independent encyclopedia identifies this original and author; the old introduction describes another text.',evidence:[{url:source,note:'Author, original publication and narrative verified in the encyclopedia.'}]}
 const patch={description,sources:{primary:'none',description:source,description_method:'research',description_source_locale:'en'}}
 const correction={table:'content_locales',before,patch,reviewedIntroductionCorrection:proof}
 const plan=planGuardedCatalogRepairs(['work'],data,[correction])
 assert.equal(plan.expected.content_locales[0].description,description)
 assert.deepEqual(plan.expected.contents,data.contents);assert.deepEqual(plan.expected.member_contents,data.member_contents)
 for(const difference of[{contentId:'other'},{referenceWorkTitle:'Other original'},{referenceCreator:'Another author'},{referenceLocale:'ko'},{sourceUrl:'https://openlibrary.org/books/OL1M'},{evidence:[]}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]))
 for(const difference of[{isbn:'9780140449136'},{description:'Too short.'},{sources:{...patch.sources,primary:'openlibrary'}},{sources:{...patch.sources,description_method:'machine'}}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{...patch,...difference}}]))
 const real=structuredClone(data);real.figure_book_editions=[{id:1,content_id:'work',locale:'ko',isbn:'9780140449136'}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],real,[correction]),/ISBN-less original/)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[correction])
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 assert.ok(!sql.includes('UPDATE public.celeb_contents'))
})

test('ISBN-less display introduction can bind its same-work locale ISBN without inventing an edition',()=>{
 const data=snapshot();data.figure_book_editions=[]
 const reference=data.content_locales[0];Object.assign(reference,{isbn:'9780674250703',creator:'Actual author'})
 const before={content_id:'work',locale:'ko',title:'원작 안내',creator:'실제 저자',isbn:null,description:'다른 책의 소개와 한국어 번역 출간 주장이 잘못 붙은 행이다.',sources:{primary:'none'}}
 data.content_locales.push(before)
 const source='https://publisher.example/original-work'
 const description='이 책은 작가가 가족과 친구들에게 보낸 편지를 모은 서간집이다. 편지에는 일상에서 겪은 사건과 주변 사람들과의 관계, 글을 쓰는 과정에서 마주한 고민이 담겨 있다. 독자는 시기와 상대에 따라 달라지는 목소리를 통해 공개된 작품 뒤에 놓인 개인적인 경험을 살펴볼 수 있다.\n\n서간은 완성된 작품만으로는 드러나지 않는 작가의 생활과 생각을 읽게 한다. 수록된 편지와 그 맥락을 함께 따라가며 인간관계와 창작 활동이 어떻게 이어졌는지 확인할 수 있다는 점에서 작가의 작품을 이해하는 데 도움이 된다.'
 const proof={method:'independent_locale_reference_introduction_review',contentId:'work',referenceLocale:'en',referenceWorkTitle:reference.title,
  referenceCreator:reference.creator,isbn:reference.isbn,locale:'ko',editionTitle:before.title,sourceUrl:source,reason:'The independently checked publisher identifies this ISBN as this original, not a Korean publication.',evidence:[{url:source,note:'Actual original and author verified.'}]}
 const patch={description,sources:{primary:'none',description:source,description_method:'research',description_source_locale:'ko'}}
 const correction={table:'content_locales',before,patch,reviewedIntroductionCorrection:proof}
 const plan=planGuardedCatalogRepairs(['work'],data,[correction])
 assert.equal(plan.expected.content_locales.find(row=>row.locale==='ko').isbn,null)
 assert.deepEqual(plan.expected.figure_book_editions,[])
 assert.deepEqual(plan.expected.content_locales.find(row=>row.locale==='en'),reference)
 assert.deepEqual(plan.expected.member_contents,data.member_contents)
 for(const difference of[{contentId:'other'},{referenceLocale:'ko'},{referenceWorkTitle:'Other work'},{referenceCreator:'Another author'},
  {isbn:'9780140449136'},{sourceUrl:'https://openlibrary.org/books/OL1M'},{reason:''},{evidence:[]}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]))
 for(const difference of[{isbn:reference.isbn},{description:'짧은 문장.'},{sources:{...patch.sources,primary:'kakao_book'}},
  {sources:{...patch.sources,description_method:'translation'}}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{...patch,...difference}}]))
 const unrelated=structuredClone(data);unrelated.content_locales[0].content_id='other'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],unrelated,[correction]),/Locale reference/)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[correction])
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 assert.ok(!sql.includes('UPDATE public.celeb_contents'))
})

test('ISBN-less introduction translation binds the independent source to the exact other-language work',()=>{
 for(const withIsbn of [false,true]){
  const data=snapshot();data.figure_book_editions=[]
  const reference=data.content_locales[0];Object.assign(reference,{title:'Original work',creator:'Actual author',isbn:withIsbn?'9780674250703':null})
  const before={content_id:'work',locale:'ko',title:'원작 안내',creator:'실제 저자',isbn:null,description:'잘못 붙은 한국어 출간 주장이다.',sources:{primary:'none'}}
  data.content_locales.push(before)
  const source='https://publisher.example/original-work'
  const description='이 책은 작가가 가족과 친구들에게 보낸 편지를 모은 서간집이다. 편지에는 일상에서 겪은 사건과 주변 사람들과의 관계, 글을 쓰는 과정에서 마주한 고민이 담겨 있다. 독자는 시기와 상대에 따라 달라지는 목소리를 통해 공개된 작품 뒤에 놓인 개인적인 경험을 살펴볼 수 있다.\n\n서간은 완성된 작품만으로는 드러나지 않는 작가의 생활과 생각을 읽게 한다. 수록된 편지와 그 맥락을 함께 따라가며 인간관계와 창작 활동이 어떻게 이어졌는지 확인할 수 있다는 점에서 작가의 작품을 이해하는 데 도움이 된다.'
  const proof={method:withIsbn?'independent_locale_reference_introduction_review':'independent_work_introduction_review',contentId:'work',referenceLocale:'en',referenceWorkTitle:reference.title,referenceCreator:reference.creator,
   ...(withIsbn?{isbn:reference.isbn}:{}),locale:'ko',editionTitle:before.title,sourceUrl:source,reason:'The English publisher text identifies this exact original and author; it does not claim Korean publication.',evidence:[{url:source,note:'English introduction and actual author reviewed.'}]}
  const patch={description,sources:{primary:'none',description:source,description_method:'translation',description_source_locale:'en'}}
  const correction={table:'content_locales',before,patch,reviewedIntroductionCorrection:proof}
  const expected=planGuardedCatalogRepairs(['work'],data,[correction]).expected
  assert.equal(expected.content_locales[1].description,description)
  assert.equal(expected.content_locales[1].isbn,null)
  assert.deepEqual(expected.content_locales[0],reference)
  assert.deepEqual(expected.member_contents,data.member_contents)
  for(const difference of [{referenceLocale:'ko'},{referenceLocale:'fr'},{referenceWorkTitle:'Other work'},{referenceCreator:'Other author'},{contentId:'other'},{evidence:[]}])
   assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]))
  for(const sourceLocale of ['ko','fr',undefined])assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{...patch,sources:{...patch.sources,description_source_locale:sourceLocale}}}]))
  const sql=buildGuardedCatalogRepairSql(['work'],data,[correction])
  for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
  assert.ok(!sql.includes('UPDATE public.celeb_contents'))
 }
})

test('ISBN-less display translation preserves its bound OpenLibrary original URL with independent same-work evidence',()=>{
 const data=snapshot();data.figure_book_editions=[]
 const source='https://openlibrary.org/books/OL7424935M',independent='https://www.readinglength.com/work/WYHHcjR'
 const reference=data.content_locales[0];Object.assign(reference,{isbn:'9780375403255',creator:'Actual author',description:'Actual independently reviewed introduction describing this original book.',
  sources:{primary:'openlibrary',provider_edition_url:source,provider_edition_isbn:'9780375403255',description:independent}})
 const before={content_id:'work',locale:'ko',title:'원작 안내',creator:'실제 저자',isbn:null,description:null,sources:{primary:'none'}};data.content_locales.push(before)
 const description='이 책은 작가가 가족과 친구들에게 보낸 편지를 모은 서간집이다. 편지에는 일상에서 겪은 사건과 주변 사람들과의 관계, 글을 쓰는 과정에서 마주한 고민이 담겨 있다. 독자는 시기와 상대에 따라 달라지는 목소리를 통해 공개된 작품 뒤에 놓인 개인적인 경험을 살펴볼 수 있다.\n\n서간은 완성된 작품만으로는 드러나지 않는 작가의 생활과 생각을 읽게 한다. 수록된 편지와 그 맥락을 함께 따라가며 인간관계와 창작 활동이 어떻게 이어졌는지 확인할 수 있다는 점에서 작가의 작품을 이해하는 데 도움이 된다.'
 const proof={method:'independent_locale_reference_introduction_review',contentId:'work',referenceLocale:'en',referenceWorkTitle:reference.title,referenceCreator:reference.creator,isbn:reference.isbn,locale:'ko',editionTitle:before.title,
  sourceUrl:source,reason:'The exact OpenLibrary edition supplies the translated text; the independently reviewed jacket verifies this original and ISBN.',evidence:[{url:independent,note:'Original, author and exact edition reviewed.'}]}
 const patch={description,sources:{primary:'none',description:source,description_method:'translation',description_source_locale:'en'}},correction={table:'content_locales',before,patch,reviewedIntroductionCorrection:proof}
 const expected=planGuardedCatalogRepairs(['work'],data,[correction]).expected
 assert.deepEqual(expected.content_locales[0],reference);assert.equal(expected.content_locales[1].sources.description,source)
 assert.equal(expected.content_locales[1].isbn,null);assert.deepEqual(expected.figure_book_editions,[])
 for(const difference of [{sourceUrl:'https://openlibrary.org/books/OL1M'},{isbn:'9780140449136'},{evidence:[]},{evidence:[{url:source,note:'Provider alone.'}]}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,reviewedIntroductionCorrection:{...proof,...difference}}]))
 for(const difference of [{provider_edition_isbn:'9780140449136'},{provider_edition_url:'https://openlibrary.org/books/OL1M'},{description:source},{primary:'none'}]){
  const changed=structuredClone(data);Object.assign(changed.content_locales[0].sources,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],changed,[correction]))
 }
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...correction,patch:{...patch,sources:{...patch.sources,description_method:'research',description_source_locale:'ko'}}}]))
})

test('single SSH capture uses all snapshot tables and work-specific direct/array predicates',async()=>{
 const data=snapshot(),calls=[]
 const result=await captureCatalogRepairSnapshot(null,Array.from({length:20},(_,i)=>'work-'+i),(command,args,options)=>{calls.push({command,args,options});return {status:0,stdout:JSON.stringify(data)}})
 assert.deepEqual(result,data)
 assert.equal(calls.length,1);assert.equal(calls[0].command,'ssh')
 assert.ok(calls[0].options.input.includes('work-19'))
 assert.ok(calls[0].options.input.length>8192)
 assert.ok(calls[0].args.at(-1).includes('docker exec -i'))
 assert.ok(!calls[0].args.join(' ').includes('work-19'))
 const sql=buildCatalogRepairSnapshotSql(['work','other'])
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('public.'+table))
 assert.ok(sql.includes('READ ONLY'))
 assert.ok(sql.includes('theme_book_ids'))
 assert.ok(sql.includes('jsonb_path_exists'))
})

test('SQL has exact before and expected-after guards for every table and changes only whitelisted rows',()=>{
 const data=snapshot(),sql=buildGuardedCatalogRepairSql(['work'],data,[change(data)])
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 assert.ok(sql.includes('ISOLATION LEVEL SERIALIZABLE'))
 assert.ok(!sql.includes('LOCK TABLE'))
 assert.equal(sql.split('FOR UPDATE;').length-1,SNAPSHOT_TABLES.length)
 assert.ok(sql.includes('UPDATE public.contents SET metadata='))
 assert.ok(!sql.includes('UPDATE public.member_contents'))
 assert.ok(!sql.includes('UPDATE public.celeb_contents'))
 assert.ok(sql.includes("to_jsonb(t)-'updated_at'"))
 assert.ok(sql.indexOf(';COMMIT;')>sql.lastIndexOf('rowset mismatch'))
})

test('guarded execution uses existing temporary SQL cleanup and all-table self-readback',async()=>{
 const data=snapshot(),changes=[change(data)],expected=planGuardedCatalogRepairs(['work'],data,changes).expected
 expected.contents[0].updated_at='server-trigger-time';let reads=0,path
 const result=await guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(reads++?expected:data),execute:file=>{path=file;assert.ok(readFileSync(file,'utf8').includes('MERGE_COMMITTED'));return 'MERGE_COMMITTED'}})
 assert.equal(reads,2)
 assert.equal(result.checkedTables,SNAPSHOT_TABLES.length)
 assert.equal(result.changed,1)
 assert.equal(existsSync(path),false)
})

test('unexpected reference/trigger mutations are rejected during readback',async()=>{
 const data=snapshot(),changes=[change(data)],expected=planGuardedCatalogRepairs(['work'],data,changes).expected
 expected.member_contents[0].rating=4;let reads=0
 await assert.rejects(guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(reads++?expected:data),execute:()=>'MERGE_COMMITTED'}),/member_contents/)
})

test('unsupported tables, fields, stale before rows and out-of-scope ownership fail before execute',()=>{
 const data=snapshot()
 for(const bad of [
  {table:'member_contents',before:data.member_contents[0],patch:{review:'Changed'}},
  {table:'contents',before:data.contents[0],remove:true},
  {table:'contents',before:data.contents[0],patch:{type:'VIDEO'}},
  {...change(data),before:{...data.contents[0],external_id:'stale'}},
  {table:'figure_book_editions',before:data.figure_book_editions[0],patch:{content_id:'other'}},
 ])assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[bad]))
 const partial=snapshot();delete partial.notes
 assert.throws(()=>planGuardedCatalogRepairs(['work'],partial,[change(data)]),/Missing catalog snapshot/)
})

test('edition removal requires excluded policy, no product history and retained introduction',()=>{
 const data=snapshot(),edition=data.figure_book_editions[0]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:edition,remove:true}]),/policy-excluded/)
 edition.title='Abridged Title';edition.description='Human introduction'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:edition,remove:true}]),/introduction/)
 data.content_locales[0].description=edition.description;data.content_locales[0].sources.description=edition.sources.description
 data.figure_book_products=[{id:3,edition_id:1,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:edition,remove:true}]),/product history/)
 data.figure_book_products=[]
 const plan=planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before:edition,remove:true}])
 assert.equal(plan.expected.figure_book_editions.length,0)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[{table:'figure_book_editions',before:edition,remove:true}])
 assert.ok(sql.includes('unhandled edition reference'))
})

test('multiple deletions retain original row matching and SQL literal safety',()=>{
 const data=snapshot();data.figure_book_editions[0].title='Abridged Title';data.figure_book_editions.push({...data.figure_book_editions[0],id:2})
 const changes=data.figure_book_editions.map(before=>({table:'figure_book_editions',before,remove:true}))
 assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,0)
 const locale=data.content_locales[0];locale.title="Title $catalog_repair$ 'quoted'"
 const sql=buildGuardedCatalogRepairSql(['work'],data,[{table:'content_locales',before:locale,patch:{title:'Confirmed'}}])
 assert.ok(sql.includes('DO $catalog_repair_1$'))
 assert.ok(sql.includes("''quoted''"))
})

test('explicit placeholder removal retains the actual edition and protected rows without inventing physical metadata',()=>{
 const data=snapshot(),before=data.figure_book_editions[0]
 Object.assign(before,{isbn:null,publisher:null,release_date:null,sources:{primary:'openlibrary',description:'https://search.daum.net/search?w=bookpage&bookId=123'}})
 const reference={id:2,content_id:'work',locale:'ko',title:'정상 번역',creator:'실제 저자',isbn:'9780674250703',description:null,sources:{primary:'kakao'}}
 data.figure_book_editions.push(reference)
 const proof={method:'independent_placeholder_review',contentId:'work',editionId:before.id,locale:before.locale,editionTitle:before.title,
  referenceEditionId:reference.id,referenceLocale:reference.locale,referenceTitle:reference.title,referenceCreator:reference.creator,referenceIsbn:reference.isbn,
  sourceUrl:'https://publisher.example/actual-translation',reason:'The reviewed physical translation belongs to this original; the English row has no identifiable physical edition.'}
 const removal={table:'figure_book_editions',before,remove:true,reviewedPlaceholderRemoval:proof}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:removal.table,before,remove:true}]),/policy-excluded/)
 const expected=planGuardedCatalogRepairs(['work'],data,[removal]).expected
 assert.deepEqual(expected.figure_book_editions,[reference]);assert.deepEqual(expected.content_locales,data.content_locales)
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(expected[table],data[table])
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal]);assert.ok(sql.includes('DELETE FROM public.figure_book_editions'))
 assert.ok(!sql.includes('independent_placeholder_review'));assert.ok(!sql.includes('UPDATE public.celeb_contents'))
 for(const difference of[{method:'automatic'},{contentId:'other'},{editionId:99},{locale:'ko'},{editionTitle:'Wrong title'},
  {referenceEditionId:1},{referenceEditionId:99},{referenceLocale:'en'},{referenceTitle:'Other translation'},{referenceCreator:'Other author'},
  {referenceIsbn:'9780140449136'},{sourceUrl:'https://openlibrary.org/books/OL1M'},{reason:'Short'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedPlaceholderRemoval:{...proof,...difference}}]),/Placeholder removal/)
 for(const difference of[{isbn:'9780140449136'},{publisher:'Actual publisher'},{release_date:'2000-01-01'},
  {sources:{primary:'openlibrary',edition_key:'/books/OL1M'}},{sources:{primary:'openlibrary',provider_edition_url:'https://openlibrary.org/books/OL1M'}},
  {sources:{primary:'openlibrary',isbn:'https://openlibrary.org/books/OL1M'}}]){
  const changed=structuredClone(data);Object.assign(changed.figure_book_editions[0],difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],changed,[{...removal,before:changed.figure_book_editions[0]}]),/Placeholder removal/)
 }
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal,{table:'figure_book_editions',before:reference,patch:{title:'Changed reference'}}]),/retain/)
 data.figure_book_products=[{id:3,edition_id:1,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/product history/)
 data.figure_book_products=[];before.description='Existing source-backed introduction'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/introduction/)
 data.content_locales[0].description=before.description;data.content_locales[0].sources.description=before.sources.description
 assert.equal(planGuardedCatalogRepairs(['work'],data,[removal]).expected.figure_book_editions.length,1)
 for(const [editionSource,localeSource] of [[null,undefined],[undefined,null]]){
  before.sources.description=editionSource;data.content_locales[0].sources.description=localeSource
  assert.equal(planGuardedCatalogRepairs(['work'],data,[removal]).expected.figure_book_editions.length,1)
 }
 before.sources.description='https://publisher.example/retained-introduction'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/introduction/)
 data.content_locales[0].sources.description='https://publisher.example/different-introduction'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/introduction/)
})

test('ISBN-less placeholder with other-author prose needs independent discard review and a retained real introduction',()=>{
 const data=snapshot(),before=data.figure_book_editions[0]
 Object.assign(before,{isbn:null,publisher:null,release_date:null,title:'On the Shortness of Life',creator:'Seneca',
  description:'Dean Rickles describes death as the most necessary limit on our lives.',sources:{primary:'openlibrary',description:'https://search.daum.net/search?w=bookpage&bookId=6654898'}})
 const reference={id:2,content_id:'work',locale:'en',title:before.title,creator:before.creator,isbn:'9780143036326',
  description:'Seneca examines how people squander their finite time and how deliberate attention changes the way they live.',
  sources:{primary:'openlibrary',description:'https://penguinrandomhouselibrary.com/book/?isbn=9780143036326'}}
 data.figure_book_editions.push(reference)
 const proof={method:'independent_placeholder_review',contentId:'work',editionId:before.id,locale:before.locale,editionTitle:before.title,
  referenceEditionId:reference.id,referenceLocale:reference.locale,referenceTitle:reference.title,referenceCreator:reference.creator,referenceIsbn:reference.isbn,
  sourceUrl:reference.sources.description,reason:'The physical Seneca collection is verified; the ISBN-less placeholder never identified a physical edition.'}
 const removal={table:'figure_book_editions',before,remove:true,reviewedPlaceholderRemoval:proof}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Existing introduction/)
 proof.misattachedIntroduction={method:'independent_other_work_introduction_review',isbn:'9788932475196',workTitle:'인생의 짧음에 관하여',creator:'Dean Rickles',
  sourceUrl:'https://www.yes24.com/product/goods/127044088',reason:'The exact Korean product describes Dean Rickles, not Seneca; the placeholder copied that unrelated introduction.'}
 const expected=planGuardedCatalogRepairs(['work'],data,[removal]).expected
 for(const table of SNAPSHOT_TABLES)assert.deepEqual(expected[table],table==='figure_book_editions'?[reference]:data[table])
 assert.ok(!buildGuardedCatalogRepairSql(['work'],data,[removal]).includes('independent_other_work_introduction_review'))
 for(const difference of [{method:'automatic'},{isbn:reference.isbn},{isbn:null},{workTitle:''},{creator:'Seneca'},
  {sourceUrl:'https://openlibrary.org/books/OL1M'},{sourceUrl:proof.sourceUrl},{reason:'Short'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedPlaceholderRemoval:{...proof,misattachedIntroduction:{...proof.misattachedIntroduction,...difference}}}]),/Placeholder introduction discard/)
 reference.description=null
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Placeholder introduction discard/)
})

test('unbound ISBN candidate removal requires explicit review and leaves the real product and protected rows intact',()=>{
 const data=snapshot(),before=data.figure_book_editions[0]
 Object.assign(before,{locale:'ko',title:'완전한 행복',creator:'정유정',publisher:'은행나무',isbn:'9781167370281',release_date:null,
  thumbnail_url:'https://example.com/copied-cover.jpg',sources:{isbn:'kakao_title_search',title:'kakao_title_search',creator:'kakao_title_search',primary:'kakao_book'}})
 const reference={...structuredClone(before),id:2,isbn:'9791167370280',sources:{primary:'kakao_book',isbn:'https://search.daum.net/search?w=bookpage&bookId=5698013'}}
 data.figure_book_editions.push(reference)
 Object.assign(data.content_locales[0],{locale:'ko',isbn:reference.isbn})
 const proof={method:'independent_unbound_isbn_review',contentId:'work',editionId:1,locale:'ko',editionTitle:before.title,isbn:before.isbn,
  referenceEditionId:2,referenceTitle:reference.title,referenceCreator:reference.creator,referencePublisher:reference.publisher,referenceIsbn:reference.isbn,
  providerSourceUrl:reference.sources.isbn,sourceUrl:'https://publisher.example/actual-product',
  reason:'Actual provider and publisher identify only the 979 product; the older 978 title-search row has no physical product evidence.'}
 const removal={table:'figure_book_editions',before,remove:true,reviewedUnboundIsbnRemoval:proof}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{table:removal.table,before,remove:true}]),/policy-excluded/)
 const expected=planGuardedCatalogRepairs(['work'],data,[removal]).expected
 for(const table of SNAPSHOT_TABLES)assert.deepEqual(expected[table],table==='figure_book_editions'?[reference]:data[table])
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal])
 assert.ok(!sql.includes('independent_unbound_isbn_review'));assert.ok(!sql.includes('UPDATE public.celeb_contents'))
 for(const difference of [{method:'automatic'},{contentId:'other'},{editionId:99},{locale:'en'},{editionTitle:'Other title'},{isbn:'9791167370280'},
  {referenceEditionId:99},{referenceTitle:'Other title'},{referenceCreator:'Other author'},{referencePublisher:'Other publisher'},
  {referenceIsbn:before.isbn},{providerSourceUrl:'https://search.daum.net/search?w=bookpage&bookId=1'},
  {sourceUrl:'https://openlibrary.org/books/OL1M'},{sourceUrl:'https://books.google.com/books?id=1'},{sourceUrl:proof.providerSourceUrl},{reason:'Short'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedUnboundIsbnRemoval:{...proof,...difference}}]),/Unbound ISBN removal/)
 for(const difference of [{description:'Source-backed introduction'},{release_date:'2020-01-01'},{title:'Another book'},
  {creator:'Different author'},{publisher:'Different publisher'},
  {sources:{...before.sources,isbn:'https://publisher.example/actual-978'}},
  {sources:{...before.sources,translators:['Actual translator']}},{isbn:'9780140449136'}]){
  const changed=structuredClone(data);Object.assign(changed.figure_book_editions[0],difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],changed,[{...removal,before:changed.figure_book_editions[0]}]),/Unbound ISBN removal/)
 }
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal,{table:'figure_book_editions',before:reference,patch:{title:'Changed'}}]),/retain/)
 data.content_locales[0].isbn=before.isbn
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/selected ISBN/)
 const other={...structuredClone(reference),id:3,isbn:'9788932323770',publisher:'Other publisher',sources:{primary:'kakao_book',isbn:'https://search.daum.net/search?w=bookpage&bookId=7125930',translators:['Other translator']}}
 data.figure_book_editions.push(other);data.content_locales[0].isbn=other.isbn
 const keepSelected={...removal,reviewedUnboundIsbnRemoval:{...proof,keepExistingRepresentative:true,selectedEditionId:other.id,selectedIsbn:other.isbn,selectedProviderSourceUrl:other.sources.isbn}}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/selected ISBN/)
 const kept=planGuardedCatalogRepairs(['work'],data,[keepSelected]).expected
 assert.deepEqual(kept.content_locales,data.content_locales);assert.deepEqual(kept.figure_book_editions,[reference,other])
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[keepSelected,{table:'figure_book_editions',before:other,patch:{publisher:'Changed'}}]),/selected ISBN/)
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[keepSelected,{table:'content_locales',before:data.content_locales[0],patch:{title:'Changed'}}]),/selected ISBN/)
 for(const difference of [{selectedEditionId:1},{selectedIsbn:reference.isbn},{selectedProviderSourceUrl:'https://search.daum.net/search?w=bookpage&bookId=1'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...keepSelected,reviewedUnboundIsbnRemoval:{...keepSelected.reviewedUnboundIsbnRemoval,...difference}}]),/selected ISBN/)
 other.sources.description='https://m.search.daum.net/search?w=bookpage&bookId=7125930&tab=introduction';delete other.sources.isbn
 assert.deepEqual(planGuardedCatalogRepairs(['work'],data,[keepSelected]).expected.content_locales,data.content_locales)
 other.sources.isbn='kakao_title_search'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[keepSelected]),/selected ISBN/)
 data.content_locales[0].isbn=reference.isbn;data.figure_book_products=[{id:4,edition_id:1,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/product history/)
})

test('removing an excluded edition does not treat provider markers as prose to preserve',()=>{
 for(const marker of ['OPEN','KAKAO','DAUM']){
  const data=snapshot(),before=data.figure_book_editions[0]
  before.title='Abridged Title';before.description=marker;before.sources.description='https://publisher.example/source'
  const plan=planGuardedCatalogRepairs(['work'],data,[{table:'figure_book_editions',before,remove:true}])
  assert.equal(plan.expected.figure_book_editions.length,0)
  assert.deepEqual(plan.expected.member_contents,data.member_contents)
 }
})
test('a source-reviewed exclusion removes an actually abridged edition with missing legacy flags without first persisting forbidden flags',()=>{
 const data=snapshot(),before=data.figure_book_editions[0];before.isbn='9780140444278';before.edition_kind=null;before.text_scope=null
 const proof={method:'independent_selection_review',isbn:before.isbn,locale:before.locale,edition_title:before.title,
  reason:'abridged',source_url:'https://publisher.example/books/on-war',explanation:'The publisher explicitly identifies this exact ISBN as an abridged translation.'}
 const removal={table:'figure_book_editions',before,remove:true,reviewedSelectionExclusion:proof}
 const plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.equal(plan.expected.figure_book_editions.length,0);assert.deepEqual(plan.expected.member_contents,data.member_contents)
 const sql=buildGuardedCatalogRepairSql(['work'],data,[removal]);assert.ok(sql.includes('DELETE FROM public.figure_book_editions'));assert.ok(!sql.includes("edition_kind='abridged'"))
 for(const difference of[{isbn:'9780140449136'},{locale:'ko'},{edition_title:'Stale title'},{source_url:'https://openlibrary.org/books/OL1M'},{reason:'low_rating'},{explanation:'Short'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedSelectionExclusion:{...proof,...difference}}]),/Source-reviewed edition exclusion/)
 data.figure_book_products=[{id:3,edition_id:1,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/product history/)
})

test('wrong-work prose removal requires a bound rejection and retains the independently reviewed original unchanged',()=>{
 const data=snapshot(),reference=data.figure_book_editions[0]
 Object.assign(reference,{creator:'Stephen King',isbn:'9780670260775',description:'A teacher wakes from a coma with an ability that changes his life and forces him to confront a political threat.',sources:{description:'https://publisher.example/king'}})
 const before={...structuredClone(reference),id:2,locale:'ko',title:'데드존',isbn:'9788956990521',description:'Reinhold Messner explores the altered awareness experienced by mountaineers in extreme conditions.',sources:{description:'https://publisher.example/messner'}}
 data.figure_book_editions.push(before)
 const proof={method:'independent_selection_review',content_id:'work',isbn:before.isbn,locale:before.locale,edition_title:before.title,
  reason:'wrong_work',source_url:'https://publisher.example/messner',explanation:'The exact ISBN identifies Messner rather than the original King novel.',
  misattachedIntroduction:{method:'independent_other_work_introduction_review',isbn:before.isbn,workTitle:'Dead Zone',creator:'Reinhold Messner',
   sourceUrl:'https://publisher.example/messner',reason:'The exact product body and introduction describe Messner mountaineering, not the King novel.',
   referenceEditionId:reference.id,referenceLocale:reference.locale,referenceTitle:reference.title,referenceCreator:reference.creator,referenceIsbn:reference.isbn}}
 const removal={table:'figure_book_editions',before,remove:true,reviewedSelectionExclusion:proof}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedSelectionExclusion:{...proof,misattachedIntroduction:undefined}}]),/Existing introduction/)
 const plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[reference]);assert.deepEqual(plan.expected.member_contents,data.member_contents)
 for(const difference of [{method:'machine_review'},{isbn:reference.isbn},{sourceUrl:'https://publisher.example/unread'},
  {creator:reference.creator},{referenceEditionId:99},{referenceIsbn:before.isbn},{referenceCreator:'Guessed author'}])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedSelectionExclusion:{...proof,misattachedIntroduction:{...proof.misattachedIntroduction,...difference}}}]),/Wrong-work introduction discard/)
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[{...removal,reviewedSelectionExclusion:{...proof,reason:'editorial_exclusion'}}]),/Wrong-work introduction discard/)
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal,{table:'figure_book_editions',before:reference,patch:{publisher:'Another publisher'}}]),/must retain/)
 const originalSource=reference.sources.description;reference.sources.description='https://openlibrary.org/books/OL1M'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Wrong-work introduction discard/)
 reference.sources.description=originalSource;data.figure_book_products=[{id:3,edition_id:before.id,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/product history/)
})

const abridgedReplacement=()=>{
 const data=snapshot(),figure=data.contents[0].metadata.figureBook
 Object.assign(figure,{workTitle:'독립정신',workCreator:'이승만',workIdentity:'book/9788949706634'})
 const description='이승만이 옥중에서 집필한 정치적 저술로, 나라의 독립과 국민의 역할을 논한다. 외부 세계의 제도와 정세를 소개하면서 국가를 지탱하는 힘이 국민의 의식과 참여에 있다는 생각을 펼친다.\n\n당시의 역사적 상황 속에서 저자가 어떤 정치 질서와 시민상을 구상했는지 읽을 수 있다. 오늘의 평가를 앞세우기보다 저술이 나온 시대와 저자의 주장을 함께 살피며 근대 정치사상의 한 사례로 접근할 수 있는 책이다.'
 const oldSource='https://www.yes24.com/product/goods/3755176',newSource='https://www.yes24.com/product/goods/60744333'
 const before=data.figure_book_editions[0]
 Object.assign(before,{id:19740,locale:'ko',title:'독립정신',creator:'이승만',isbn:'9788949706634',edition_kind:'full',text_scope:'complete',description,sources:{primary:'kakao_book',description:oldSource}})
 data.content_locales=[{content_id:'work',locale:'ko',title:before.title,creator:before.creator,isbn:before.isbn,description,sources:structuredClone(before.sources)}]
 const keeper={...structuredClone(before),id:19916,isbn:'9788937604706',description:'DAUM',edition_kind:null,text_scope:null,sources:{primary:'kakao_book'}}
 data.figure_book_editions.push(keeper)
 const sources={...keeper.sources,description:newSource,description_method:'research',description_source_locale:'ko'}
 const replacementIntroduction={method:'independent_same_work_introduction_replacement_review',llmReviewed:true,contentId:'work',
  workTitle:figure.workTitle,workCreator:figure.workCreator,workIdentity:figure.workIdentity,discardedSourceUrl:oldSource,
  referenceEditionId:keeper.id,referenceLocale:keeper.locale,referenceTitle:keeper.title,referenceCreator:keeper.creator,referenceIsbn:keeper.isbn,
  referenceDescription:description,referenceSourceUrl:newSource,bodyEvidence:'정상 비봉 판본은 1장부터 51장까지와 후록을 수록하며 박기봉이 현대어로 교정하고 주석을 달았다.',
  reason:'옛 소개는 원저를 설명한 정상 산문이다. 10·11·12장을 생략한 축약 판본을 제거하고 정상 판본의 실제 출처로 교체한다.'}
 const exclusion={method:'independent_selection_review',isbn:before.isbn,locale:before.locale,edition_title:before.title,
  reason:'abridged',source_url:oldSource,explanation:'동서 판본의 실제 목차에는 10·11·12장 생략이 명시되어 있어 온전한 원저 판본으로 선정할 수 없다.',replacementIntroduction}
 const changes=[{table:'figure_book_editions',before,remove:true,reviewedSelectionExclusion:exclusion},
  {table:'figure_book_editions',before:keeper,patch:{description,sources,edition_kind:'full',text_scope:'1–51장 및 후록·부록'}},
  {table:'content_locales',before:data.content_locales[0],patch:{isbn:keeper.isbn,description,sources},
   reviewedIntroductionCorrection:{isbn:before.isbn,locale:before.locale,editionTitle:before.title,sourceUrl:newSource,reason:replacementIntroduction.reason}}]
 return {data,changes}
}

test('same-work abridged removal explicitly replaces its source with a reviewed normal representative without archiving sound prose',()=>{
 const {data,changes}=abridgedReplacement(),plan=planGuardedCatalogRepairs(['work'],data,changes)
 assert.equal(plan.expected.figure_book_editions.length,1)
 assert.equal(plan.expected.figure_book_editions[0].id,19916)
 assert.equal(plan.expected.content_locales[0].isbn,'9788937604706')
 assert.equal(plan.expected.content_locales[0].description,data.content_locales[0].description)
 assert.equal(plan.expected.content_locales[0].sources.description,'https://www.yes24.com/product/goods/60744333')
 for(const table of SNAPSHOT_TABLES.filter(table=>!['contents','content_locales','figure_book_contents','figure_book_characters','figure_book_editions'].includes(table)))
  assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
 assert.ok(sql.includes('DELETE FROM public.figure_book_editions'))
 assert.ok(!sql.includes('replacementIntroduction'))
 assert.ok(!sql.includes('independent_same_work_introduction_replacement_review'))
 assert.ok(!sql.includes('sourceSnapshot'))
 assert.equal(changes[0].reviewedSelectionExclusion.reason,'abridged')
})

test('abridged representative replacement requires explicit proof and exact old and new identities, prose, source, and final locale',()=>{
 const rejected=[{method:'automatic_review'},{llmReviewed:false},{contentId:'other'},{workTitle:'Other work'},{workCreator:'Other author'},
  {workIdentity:'other-original'},{discardedSourceUrl:'https://www.yes24.com/product/goods/60744333'},{referenceEditionId:99999},
  {referenceLocale:'en'},{referenceTitle:'Different book'},{referenceCreator:'Another writer'},{referenceIsbn:'9788949706634'},
  {referenceDescription:'A different unreviewed introduction about another edition.'},{referenceSourceUrl:'https://publisher.example/unread'},
  {referenceSourceUrl:'https://openlibrary.org/books/OL1M'},{bodyEvidence:'short'},{reason:'short'}]
 for(const difference of rejected){
  const {data,changes}=abridgedReplacement()
  Object.assign(changes[0].reviewedSelectionExclusion.replacementIntroduction,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
 }
 for(const difference of [{edition_kind:'volume'},{text_scope:''},{sources:{primary:'none'}},
  {description:'DAUM'},{isbn:'9780140449136'},{creator:'Other writer'}]){
  const {data,changes}=abridgedReplacement();Object.assign(changes[1].patch,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
 }
 for(const difference of [{isbn:'9788949706634'},{description:'Other representative introduction'},
  {sources:{primary:'kakao_book',description:'https://publisher.example/other'}}]){
  const {data,changes}=abridgedReplacement();Object.assign(changes[2].patch,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
 }
 const {data,changes}=abridgedReplacement()
 delete changes[0].reviewedSelectionExclusion.replacementIntroduction
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Existing introduction/)
})

test('same-work removal may retain a separately reviewed new introduction rather than copying the excluded edition body',()=>{
 const {data,changes}=abridgedReplacement()
 const description=changes[1].patch.description+'\n\n이 판본은 원저의 1장부터 51장까지와 후록을 수록하고 현대어 교정과 주석을 더했다.'
 changes[0].reviewedSelectionExclusion.replacementIntroduction.referenceDescription=description
 changes[1].patch.description=description;changes[2].patch.description=description
 const plan=planGuardedCatalogRepairs(['work'],data,changes)
 assert.equal(plan.expected.figure_book_editions[0].description,description)
 assert.equal(plan.expected.content_locales[0].description,description)
 assert.notEqual(description,data.content_locales[0].description)
 assert.ok(!JSON.stringify(plan.expected).includes('3755176'))
})

test('same-work replacement rejects changing the final original identity while reusing the old original review',()=>{
 for(const key of ['workTitle','workCreator','workIdentity']){
  const {data,changes}=abridgedReplacement(),metadata=structuredClone(data.contents[0].metadata)
  metadata.figureBook[key]='Different original'
  changes.push({table:'contents',before:data.contents[0],patch:{metadata}})
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
 }
})

test('same-work replacement refuses mixed reasons, extra removal proof, product history, and missing explicit companion correction',()=>{
 for(const reason of ['wrong_work','children_only','editorial_exclusion']){
  const {data,changes}=abridgedReplacement();changes[0].reviewedSelectionExclusion.reason=reason
  changes[0].reviewedSelectionExclusion.content_id='work'
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
 }
 for(const key of ['reviewedPlaceholderRemoval','reviewedIntroductionCorrection','reviewedArchiveProvenanceDiscard']){
  const {data,changes}=abridgedReplacement();changes[0][key]={}
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/only valid for explicit source-reviewed edition removal/)
 }
 const {data,changes}=abridgedReplacement()
 data.figure_book_products=[{id:4,edition_id:19740,is_active:false}]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/product history/)
 data.figure_book_products=[];delete changes[2].reviewedIntroductionCorrection
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Existing introduction/)
})

test('same-work introduction replacement keeps research length and language checks, and rejects guessed translation provenance',()=>{
 for(const description of ['짧은 문장을 정상 소개라고 주장하며 실제로는 분량 기준을 충족하지 못한다.','An unreviewed English passage repeated here. '.repeat(10)]){
  const {data,changes}=abridgedReplacement()
  changes[0].reviewedSelectionExclusion.replacementIntroduction.referenceDescription=description
  changes[1].patch.description=description;changes[2].patch.description=description
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Invalid research introduction/)
 }
 const {data,changes}=abridgedReplacement()
 for(const c of changes.slice(1)){c.patch.sources.description_method='translation';c.patch.sources.description_source_locale='en'}
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/Abridged introduction replacement/)
})

test('same-work representative replacement readback detects protected data or source drift',async()=>{
 for(const drift of ['none','review','source']){
  const {data,changes}=abridgedReplacement(),actual=planGuardedCatalogRepairs(['work'],data,changes).expected
  if(drift==='review')actual.member_contents[0].review='Unexpected rewrite'
  if(drift==='source')actual.figure_book_editions[0].sources.description='https://publisher.example/unread'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(captures++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')await run()
  else await assert.rejects(run,/readback mismatch/)
 }
})

const isbnlessRemoval=(reason='foreign_language')=>{
 const data=snapshot(),description='This is the normal translation of the original novel. It follows the protagonist and preserves the narrative of the complete work.'
 data.contents[0].metadata.figureBook={workTitle:'Original novel',workCreator:'Original author',workIdentity:'author/original'}
 const reference={id:2,content_id:'work',locale:'en',title:'Normal translation',creator:'Original author',isbn:'9780140449136',publisher:'Normal press',
  description,edition_kind:null,text_scope:null,thumbnail_url:null,sources:{primary:'openlibrary',description:'https://publisher.example/normal-book',
   description_method:'provider',description_source_locale:'en'}}
 const before={id:1,content_id:'work',locale:'en',title:'Original novel',creator:'Original author',isbn:null,publisher:reason==='foreign_language'?'Foreign press':null,
  release_date:null,description:'This copied introduction describes a selection from the same original author rather than the original novel.',
  sources:{primary:reason==='foreign_language'?'openlibrary':'manual-research',description:'https://publisher.example/selection',
   ...(reason==='foreign_language'?{provider_edition_url:'https://openlibrary.org/books/OL3M'}:{})}}
 data.figure_book_editions=[before,reference]
 data.content_locales=[{...structuredClone(reference),id:undefined}];delete data.content_locales[0].id
 // Protected content references, including member prose, remain on the same work.
 data.celeb_contents=[{id:'celeb-reading',content_id:'work',review:'실제로 남겨야 하는 감상문',review_en:'Existing review',source_url:'https://interview.example/book'}]
 data.figure_book_characters=[{content_id:'work',celeb_id:'person',relation_type:'authored'}]
 data.figure_book_products=[{id:'retained-product',edition_id:2,is_active:false}]
 const figure=data.contents[0].metadata.figureBook
 const proof={method:'independent_isbnless_edition_removal_review',llmReviewed:true,reason,contentId:'work',
  discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),selectedLocaleCard:structuredClone(data.content_locales[0]),
  workAnchor:Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,figure[key]??null])),
  explanation:'The LLM read both independent book bodies and retained the actual normal same-work translation and introduction.',
  sourceReview:{llmReviewed:true,workTitle:figure.workTitle,workCreator:figure.workCreator,sourceUrl:'https://publisher.example/selection',
   editionTitle:before.title,editionCreator:before.creator,publisher:before.publisher,physicalIdentityConfirmed:true,
   releaseDate:null,physicalSourceUrls:reason==='foreign_language'?['https://openlibrary.org/books/OL3M']:[],
   physicalIdentitySourceUrl:'https://publisher.example/selection',
   physicalIdentityEvidence:'The independent publisher body identifies this exact OpenLibrary edition, its publisher and publication date, and confirms the same physical text.',
   description:before.description,scope:'Original-language selected passages',bodyEvidence:'The actual source identifies the original work and its author, with the exact physical edition or selected scope.',
   bodyExcerpt:'El protagonista vuelve a su ciudad y encuentra a su familia en una casa abandonada.',bodyLanguage:'es',languageEvidenceBasis:'body_text',
   languageEvidence:'The independent source includes Spanish body text and explicitly states the publication language.',
   wrongScopeConfirmed:true,scopeMismatchEvidence:'The copied introduction discusses selected passages; the retained translation contains the narrative of the original novel.'},
  referenceReview:{llmReviewed:true,workTitle:figure.workTitle,workCreator:figure.workCreator,description,sourceUrl:reference.sources.description,
   bodyEvidence:'The normal book publisher describes this exact existing ISBN, its author, translation and the original novel.',scope:'Normal translation of the original novel'}}
 return {data,changes:[{table:'figure_book_editions',before,remove:true,reviewedIsbnlessEditionRemoval:proof}]}
}

function isbnlessMixedSourceMetadata(){
 const {data,changes}=isbnlessRemoval('wrong_scope_placeholder'),before=data.figure_book_editions[0],reference=data.figure_book_editions[1]
 const proof=changes[0].reviewedIsbnlessEditionRemoval,metadataSourceUrl='https://books.google.com/books?id=ExactExistingSource'
 Object.assign(before,{locale:'ko',title:'원작의 한국어 추가 행',creator:'원작 저자',publisher:'Mixed-in Korean press',thumbnail_url:'https://image.example/other-work.jpg',
  description:'기존 수동 행에 붙인 소장본 주기.',sources:{primary:'manual-research',description:metadataSourceUrl,description_method:'translation',description_source_locale:'en'}})
 reference.sources.google_books_id='ExactExistingSource';data.content_locales[0].sources.google_books_id='ExactExistingSource'
 Object.assign(proof,{discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),selectedLocaleCard:structuredClone(data.content_locales[0])})
 Object.assign(proof.sourceReview,{sourceUrl:metadataSourceUrl,description:before.description})
 proof.sourceMetadataReview={method:'independent_isbnless_source_metadata_review',llmReviewed:true,currentWork:structuredClone(data.contents[0]),
  metadataSourceUrl,fetchedUrl:metadataSourceUrl,metadataTitle:'The original novel with its actual subtitle',
  fetchedMetadata:{id:'ExactExistingSource',isbn:reference.isbn,title:'The original novel with its actual subtitle',creator:reference.creator,publisher:reference.publisher},
  sourceEdition:structuredClone(reference),sourceLocaleCard:structuredClone(data.content_locales[0]),
  recordPublisher:reference.publisher,referencePublisher:reference.publisher,matchingPublisherConfirmed:true,
  metadataEvidence:'The current source page explicitly prints this existing English ISBN, author and title; it does not describe another Korean edition.',
  publisherEvidence:'The printed publisher in that exact source is the publisher of the retained English physical ISBN, not the mixed-in Korean press.',
  bodyLanguageReview:{llmReviewed:true,isbn:reference.isbn,editionCreator:reference.creator,bodyLanguage:'en',sourceKind:'library',
   sourceUrl:'https://library.example/exact-existing-isbn',languageEvidenceBasis:'explicit_library_text_language',
   languageEvidence:'The independent library explicitly records English as the text language for this exact ISBN and original author.',
   bodyEvidence:'The actual library responsibility statement identifies the original novel and its English text, with the same real ISBN.'},
  otherWorkPublicationReview:{llmReviewed:true,sourceKind:'publisher',sourceUrl:'https://other-publisher.example/different-work',
   isbn:'9788950910396',title:'Another actual Korean book',creator:'다른 책의 원저자',originalCreator:'Different original author',otherWorkConfirmed:true,
   publisher:before.publisher,coverUrl:before.thumbnail_url,publisherCoverUrl:'https://other-publisher.example/actual-cover.jpg',coverMatchesConfirmed:true,
   coverEvidence:'The independently read publisher image is visibly the same cover as the current rejected row and names the different book and authors.',
   bodyEvidence:'The actual publisher ISBN and book body identify a different self-help work, rather than this original novel or its Korean translation.'}}
 return {data,changes}
}

test('ISBN-less mixed source metadata removes only the contradictory manual row, preserving the existing source ISBN and all protected records',()=>{
 const {data,changes}=isbnlessMixedSourceMetadata(),plan=planGuardedCatalogRepairs(['work'],data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
 assert.ok(!sql.includes('sourceMetadataReview'));assert.ok(!sql.includes('otherWorkPublicationReview'))
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
})

test('mixed source metadata rejects unreviewed or stale rows, another source record, ISBN, language and publisher',()=>{
 for(const mutate of [
  p=>{p.method='automatic'},p=>{p.llmReviewed=false},p=>{p.currentWork.external_id='changed'},
  p=>{p.metadataSourceUrl='https://books.google.com/books?id=OtherRecord'},p=>{p.fetchedUrl=null},
  p=>{p.fetchedMetadata.id='OtherRecord'},p=>{p.fetchedMetadata.isbn=null},p=>{p.fetchedMetadata.isbn='9780140444278'},
  p=>{p.fetchedMetadata.title='Another work'},p=>{p.fetchedMetadata.creator='Another writer'},
  p=>{p.fetchedMetadata.publisher='Another publisher'},
  p=>{p.fetchedMetadata.publisher='Foreign unrelated press';p.recordPublisher=p.fetchedMetadata.publisher},
  p=>{p.fetchedMetadata.publisher='N';p.recordPublisher=p.fetchedMetadata.publisher},p=>{p.matchingPublisherConfirmed=false},
  p=>{p.sourceEdition.content_id='other-work'},p=>{p.sourceEdition.sources.google_books_id='OtherRecord'},
  p=>{p.sourceLocaleCard.publisher='Changed normal publisher'},p=>{p.metadataEvidence='No evidence'},
  p=>{p.bodyLanguageReview.bodyLanguage='fr'},p=>{p.bodyLanguageReview.bodyLanguage='und'},
  p=>{p.bodyLanguageReview.isbn='9780140444278'},p=>{p.bodyLanguageReview.editionCreator='Another author'},
  p=>{p.bodyLanguageReview.sourceUrl=null},p=>{p.bodyLanguageReview.sourceUrl=p.metadataSourceUrl},
  p=>{p.bodyLanguageReview.languageEvidenceBasis='title_guess'},p=>{p.bodyLanguageReview.languageEvidence='English title'}]){
  const {data,changes}=isbnlessMixedSourceMetadata();mutate(changes[0].reviewedIsbnlessEditionRemoval.sourceMetadataReview)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less/)
 }
})

test('mixed source metadata needs the independently identified other-work cover and publisher, not a guessed missing product',()=>{
 for(const mutate of [
  p=>{delete p.otherWorkPublicationReview},p=>{p.otherWorkPublicationReview.llmReviewed=false},
  p=>{p.otherWorkPublicationReview.isbn=null},p=>{p.otherWorkPublicationReview.isbn=p.sourceEdition.isbn},
  p=>{p.otherWorkPublicationReview.publisher='Unrelated publisher'},p=>{p.otherWorkPublicationReview.creator=p.fetchedMetadata.creator},
  p=>{p.otherWorkPublicationReview.originalCreator=p.fetchedMetadata.creator},p=>{p.otherWorkPublicationReview.otherWorkConfirmed=false},
  p=>{p.otherWorkPublicationReview.coverUrl='https://image.example/unseen-cover.jpg'},
  p=>{p.otherWorkPublicationReview.publisherCoverUrl='https://unread.example/cover.jpg'},
  p=>{p.otherWorkPublicationReview.coverMatchesConfirmed=false},p=>{p.otherWorkPublicationReview.coverEvidence='Title guess'},
  p=>{p.otherWorkPublicationReview.sourceUrl=null},p=>{p.otherWorkPublicationReview.bodyEvidence='No body'}]){
  const {data,changes}=isbnlessMixedSourceMetadata();mutate(changes[0].reviewedIsbnlessEditionRemoval.sourceMetadataReview)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less/)
 }
})

test('mixed source metadata never removes a real ISBN-less provider edition or preconditions the publisher and preserves product history',()=>{
 for(const mutate of [
  (d,p)=>{d.figure_book_editions[0].sources.primary='openlibrary'},
  (d,p)=>{d.figure_book_editions[0].sources.provider_edition_url='https://openlibrary.org/books/OL3M'},
  (d,p)=>{d.figure_book_editions[0].sources.title='https://search.daum.net/search?w=bookpage&bookId=123'},
  (d,p)=>{d.figure_book_editions[0].publisher=null},
  (d,p)=>{d.figure_book_editions[0].release_date='1985-01-01'},
  d=>{d.figure_book_products.push({id:'old-sale',edition_id:d.figure_book_editions[0].id})}]){
  const {data,changes}=isbnlessMixedSourceMetadata(),proof=changes[0].reviewedIsbnlessEditionRemoval;mutate(data,proof)
  proof.discardedEdition=structuredClone(data.figure_book_editions[0])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes))
 }
 const {data,changes}=isbnlessMixedSourceMetadata(),card=data.content_locales[0]
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[...changes,{table:'content_locales',before:card,patch:{creator:'Changed writer'}}]),/ISBN-less/)
})

test('mixed source metadata readback checks eighteen tables and rejects normal edition, source or member changes',async()=>{
 for(const drift of ['none','normal','source','member']){
  const {data,changes}=isbnlessMixedSourceMetadata(),after=structuredClone(planGuardedCatalogRepairs(['work'],data,changes).expected)
  if(drift==='normal')after.figure_book_editions[0].publisher='Unexpected normal publisher'
  if(drift==='source')after.content_locales[0].sources.description='https://unread.example/source'
  if(drift==='member')after.member_contents[0].review='Unexpected member rewrite'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(captures++?after:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

function isbnlessRevisedTranslationSelection(){
 const data=snapshot(),work=data.contents[0],sourceUrl='https://books.google.com/books?id=vGXWRovhS44C'
 work.metadata.figureBook={workTitle:'Philosophical Investigations',workCreator:'Ludwig Wittgenstein',workIdentity:'wittgenstein/philosophical-investigations',
  originalTitle:'Philosophical Investigations',originalCreator:'Ludwig Wittgenstein'}
 const description='The fourth edition of Ludwig Wittgenstein’s Philosophical Investigations presents the German text with an extensively revised English translation. Hundreds of changes to Anscombe’s translation, relocated remarks and new editorial notes distinguish this revision. The former Part Two is titled Philosophy of Psychology – A Fragment and its remarks are numbered. The book includes editorial essays about the text and its translation.'
 const before={id:15919,content_id:'work',locale:'en',title:'Philosophical investigations',creator:'Ludwig Wittgenstein',isbn:null,publisher:null,
  description,edition_kind:null,text_scope:null,release_date:null,sources:{primary:'openlibrary',google_books_id:'vGXWRovhS44C',description:sourceUrl,description_method:'provider',description_source_locale:'en'}}
 const reference={id:7800,content_id:'work',locale:'en',title:'Philosophical Investigations: 50th Anniversary',creator:'Ludwig Wittgenstein, P. M. S. Hacker, Joachim Schulte',
  isbn:'9781405193757',publisher:'Wiley',description:'The original work was published after Wittgenstein’s death and discusses philosophy of language.',
  edition_kind:'full',text_scope:'complete',sources:{primary:'openlibrary',isbn:'https://openlibrary.org/books/OL29366529M',description:'https://reference.example/original'}}
 const card={content_id:'work',locale:'en',title:reference.title,creator:reference.creator,isbn:reference.isbn,publisher:reference.publisher,
  description:reference.description,sources:structuredClone(reference.sources),affiliate_url:null}
 data.figure_book_editions=[reference,before];data.content_locales=[card]
 const translators=['G. E. M. Anscombe','P. M. S. Hacker','Joachim Schulte'],providerEditionUrl='https://openlibrary.org/books/OL23554274M'
 const sources={primary:'openlibrary',isbn:providerEditionUrl,provider_edition_url:providerEditionUrl,translators,
  description:sourceUrl,description_method:'provider',description_source_locale:'en'}
 const patch={title:'Philosophical Investigations',creator:'Ludwig Wittgenstein',isbn:'9781405159289',publisher:'John Wiley & Sons',description,sources}
 const finalReference={...reference,...patch},finalCard={...card,...patch}
 const bodyScope='Complete fourth revised German-English text, including Philosophy of Psychology – A Fragment and editorial endnotes.'
 const shared={llmReviewed:true,bodyLanguage:'en',scopeConfirmed:true,completeTranslationConfirmed:true,editionNumber:4,translators,bodyScope,
  bodyEvidence:'The independent source describes hundreds of changes to the English translation and the renamed philosophy-of-psychology text.',
  scopeEvidence:'The licensed ebook and publisher’s print contents identify the same fourth revised German-English text and editorial apparatus.'}
 const proof={method:'independent_isbnless_translation_product_selection_review',reason:'same_translation_product',llmReviewed:true,contentId:'work',
  originalWork:structuredClone(work),workAnchor:structuredClone(work.metadata.figureBook),discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),
  selectedReferenceEdition:structuredClone(finalReference),previousLocaleCard:structuredClone(card),selectedLocaleCard:structuredClone(finalCard),
  explanation:'The identified 2010 ebook and 2009 print contain the same fourth revised translation. Select the source-confirmed print and preserve the exact valid ebook introduction.',
  sourceReview:{...shared,sourceUrl,sourceBookKey:'vGXWRovhS44C',isbn:'9781444307979',productFormat:'ebook',editionTitle:before.title,editionCreator:before.creator,description},
  referenceReview:{...shared,sourceUrl:'https://publisher.example/fourth-edition-9781405159289',isbn:patch.isbn,productFormat:'paper',editionTitle:patch.title,
   editionCreator:patch.creator,publisher:patch.publisher,providerEditionUrl,physicalIdentityEvidence:'The actual publisher lists the exact print ISBN and the official edition record matches its German-English fourth edition.'}}
 const correction=row=>({isbn:row.isbn,locale:'en',editionTitle:patch.title,sourceUrl,reason:'The independently verified fourth revised edition’s exact valid introduction is selected and retained with its original public source.'})
 return {data,changes:[{table:'figure_book_editions',before,remove:true,reviewedIsbnlessEditionRemoval:proof},
  {table:'figure_book_editions',before:reference,patch:structuredClone(patch),reviewedIntroductionCorrection:correction(reference)},
  {table:'content_locales',before:card,patch:structuredClone(patch),reviewedIntroductionCorrection:correction(card)}]}
}

test('ISBN 없는 실제 전자책은 같은 개정 번역의 정상 종이 대표를 선택하고 유효 소개·출처를 그대로 보존한다',()=>{
 const {data,changes}=isbnlessRevisedTranslationSelection(),original=structuredClone(data),plan=planGuardedCatalogRepairs(['work'],data,changes)
 const retained=plan.expected.figure_book_editions[0]
 assert.equal(retained.isbn,'9781405159289');assert.equal(retained.description,data.figure_book_editions[1].description)
 assert.equal(retained.sources.description,data.figure_book_editions[1].sources.description)
 assert.equal(plan.expected.content_locales[0].description,retained.description);assert.deepEqual(data,original)
 assert.equal(data.figure_book_editions[1].isbn,null)
 for(const table of SNAPSHOT_TABLES.filter(t=>!['figure_book_editions','content_locales'].includes(t)))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
 assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions'))
 assert.ok(!sql.includes('same_translation_product'));assert.ok(!JSON.stringify(retained.sources).includes('sourceReview'))
})

test('ISBN 없는 개정상품 선정은 다른 판차·역자·미확인 범위·실물·소실 소개·상품 이력과 오래된 신원을 거부한다',()=>{
 for(const mutate of [
  p=>p.originalWork.metadata.figureBook.workIdentity='other',p=>p.discardedEdition.publisher='Other publisher',
  p=>p.referenceEdition.isbn='9780140449136',p=>p.sourceReview.sourceBookKey='different',
  p=>p.sourceReview.isbn=null,p=>p.sourceReview.productFormat='paper',p=>p.sourceReview.scopeConfirmed=false,
  p=>p.sourceReview.bodyEvidence='',p=>p.referenceReview.editionNumber=3,
  p=>p.referenceReview.translators=['Other translator'],p=>p.referenceReview.bodyScope='Unknown scope',
  p=>p.referenceReview.physicalIdentityEvidence='',p=>p.referenceReview.sourceUrl='https://openlibrary.org/books/OL1M',
  p=>p.referenceReview.providerEditionUrl='https://openlibrary.org/books/OL999M',
 ]){
  const {data,changes}=isbnlessRevisedTranslationSelection();mutate(changes[0].reviewedIsbnlessEditionRemoval)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less translation product selection/)
 }
 for(const mutate of [
  (d,c)=>c[1].patch.description='Changed valid introduction',
  (d,c)=>c[2].patch.sources.description='https://source.example/other',
  (d,c)=>delete c[1].reviewedIntroductionCorrection,
  (d,c)=>c[1].patch.text_scope='unknown',
  (d,c)=>d.figure_book_products.push({id:33,edition_id:15919,is_active:false}),
  (d,c)=>d.figure_book_products.push({id:34,edition_id:7800,is_active:false}),
 ]){
  const {data,changes}=isbnlessRevisedTranslationSelection();mutate(data,changes)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes))
 }
})

test('같은 개정 번역의 ISBN 없는 상품 선정도 18표 재조회로 기존 소개·감상·상품을 보호한다',async()=>{
 for(const drift of ['none','intro','reading','scope']){
  const {data,changes}=isbnlessRevisedTranslationSelection(),after=structuredClone(planGuardedCatalogRepairs(['work'],data,changes).expected)
  if(drift==='intro')after.figure_book_editions[0].description='Changed original introduction'
  if(drift==='reading')after.member_contents[0].review='Changed reading'
  if(drift==='scope')after.figure_book_editions[0].text_scope='different'
  let reads=0
  const run=()=>guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(reads++?after:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

test('ISBN-less independently identified foreign body and same-author wrong-scope placeholder remove only the reviewed row',()=>{
 for(const reason of ['foreign_language','wrong_scope_placeholder']){
  const {data,changes}=isbnlessRemoval(reason),plan=planGuardedCatalogRepairs(['work'],data,changes)
  assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
  for(const table of SNAPSHOT_TABLES.filter(table=>table!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
  const sql=buildGuardedCatalogRepairSql(['work'],data,changes)
  assert.ok(sql.includes('DELETE FROM public.figure_book_editions'))
  assert.ok(!sql.includes('independent_isbnless_edition_removal_review'));assert.ok(!sql.includes('bodyExcerpt'))
  for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 }
})

test('ISBN-less foreign removal refuses guessed language, unresolved physical identity, stale source pointers and other originals',()=>{
 const invalid=[proof=>{proof.llmReviewed=false},proof=>{proof.workAnchor.workIdentity='another-original'},
  proof=>{proof.discardedEdition.sources.provider_edition_url='https://openlibrary.org/books/OL4M'},
  proof=>{proof.sourceReview.physicalIdentityConfirmed=false},proof=>{proof.sourceReview.editionCreator='Other author'},
  proof=>{proof.sourceReview.publisher='Other press'},proof=>{proof.sourceReview.workTitle='Another original'},
  proof=>{proof.sourceReview.sourceUrl='https://openlibrary.org/books/OL3M'},proof=>{proof.sourceReview.bodyExcerpt=''},
  proof=>{proof.sourceReview.languageEvidenceBasis='title_script'},proof=>{proof.sourceReview.languageEvidence=''}]
 for(const language of ['en','eng','ko','kor','und','mul','zxx',''])invalid.push(proof=>{proof.sourceReview.bodyLanguage=language})
 for(const mutate of invalid){const {data,changes}=isbnlessRemoval();mutate(changes[0].reviewedIsbnlessEditionRemoval)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)}
 const {data,changes}=isbnlessRemoval();data.figure_book_editions[0].publisher='Concurrent publisher change'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
})

test('ISBN-less foreign identity may have no publisher when a real edition pointer is independently resolved, and never retains that pointer in a locale',()=>{
 const {data,changes}=isbnlessRemoval(),proof=changes[0].reviewedIsbnlessEditionRemoval
 data.figure_book_editions[0].publisher=null;proof.discardedEdition.publisher=null;proof.sourceReview.publisher=null
 assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,1)
 data.content_locales.push({content_id:'work',locale:'ko',title:data.figure_book_editions[0].title,creator:data.figure_book_editions[0].creator,
  isbn:null,publisher:null,sources:{primary:'none',title:'original',provider_edition_url:proof.discardedEdition.sources.provider_edition_url}})
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 delete data.content_locales[1].sources.provider_edition_url
 assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.content_locales.length,2)
})

test('ISBN-less foreign review resolves a current exact physical URL, rather than another edition of the same title',()=>{
 for(const difference of [{physicalSourceUrls:[]},{physicalSourceUrls:['https://openlibrary.org/books/OL4M']},
  {physicalSourceUrls:['https://openlibrary.org/books/OL3M','https://openlibrary.org/books/OL4M']},{physicalSourceUrls:undefined},
  {physicalIdentityEvidence:'Title match'},{physicalIdentitySourceUrl:'https://publisher.example/another'},
  {releaseDate:'1900-01-01'}]){
  const {data,changes}=isbnlessRemoval();Object.assign(changes[0].reviewedIsbnlessEditionRemoval.sourceReview,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 for(const sources of [{primary:'kakao_book',title:'https://search.daum.net/search?bookId=123'},
  {primary:'manual-research',provider_edition_url:'https://library.example/exact-edition'}]){
  const {data,changes}=isbnlessRemoval(),proof=changes[0].reviewedIsbnlessEditionRemoval
  data.figure_book_editions[0].sources={...sources,description:'https://publisher.example/selection'}
  proof.discardedEdition=structuredClone(data.figure_book_editions[0]);proof.sourceReview.physicalSourceUrls=[sources.title??sources.provider_edition_url]
  assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,1)
 }
})

test('ISBN-less publisher-only identity requires exact current publication date and independent publisher or library identity evidence',()=>{
 const fixture=()=>{const result=isbnlessRemoval(),{data,changes}=result,proof=changes[0].reviewedIsbnlessEditionRemoval
  delete data.figure_book_editions[0].sources.provider_edition_url
  data.figure_book_editions[0].release_date='1900-01-01';proof.discardedEdition=structuredClone(data.figure_book_editions[0])
  Object.assign(proof.sourceReview,{physicalSourceUrls:[],releaseDate:'1900-01-01',physicalIdentitySourceType:'library'})
  return result}
 {const {data,changes}=fixture();assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,1)}
 for(const difference of [{publisher:'Another press'},{releaseDate:null},{releaseDate:'1901-01-01'},
  {physicalIdentitySourceType:'title_search'},{physicalIdentitySourceType:undefined},{physicalIdentityEvidence:''},
  {physicalSourceUrls:['https://openlibrary.org/books/OL3M']}]){
  const {data,changes}=fixture();Object.assign(changes[0].reviewedIsbnlessEditionRemoval.sourceReview,difference)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 const {data,changes}=fixture(),proof=changes[0].reviewedIsbnlessEditionRemoval
 data.figure_book_editions[0].release_date=null;proof.discardedEdition.release_date=null;proof.sourceReview.releaseDate=null
 assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,1)
})

test('ISBN-less retained normal introduction needs its existing same-language provenance on both edition and selected card',()=>{
 for(const difference of [{description_method:undefined},{description_method:'translation'},
  {description_method:'automatic'},{description_source_locale:'ko'},{description_source_locale:undefined}]){
  const {data,changes}=isbnlessRemoval();Object.assign(data.figure_book_editions[1].sources,difference)
  changes[0].reviewedIsbnlessEditionRemoval.referenceEdition=structuredClone(data.figure_book_editions[1])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 const {data,changes}=isbnlessRemoval();data.content_locales[0].sources.description_source_locale='ko'
 changes[0].reviewedIsbnlessEditionRemoval.selectedLocaleCard=structuredClone(data.content_locales[0])
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
})

test('copied Korean introduction Daum URL is never an ISBN-less foreign physical edition pointer',()=>{
 const fixture=()=>{const result=isbnlessRemoval(),{data,changes}=result,proof=changes[0].reviewedIsbnlessEditionRemoval
  data.figure_book_editions[0].sources={primary:'manual-research',description:'https://search.daum.net/search?bookId=16129'}
  proof.discardedEdition=structuredClone(data.figure_book_editions[0])
  proof.sourceReview.physicalSourceUrls=[data.figure_book_editions[0].sources.description]
  return result}
 {const {data,changes}=fixture();assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)}
 {const {data,changes}=fixture(),proof=changes[0].reviewedIsbnlessEditionRemoval
  data.figure_book_editions[0].publisher=null;proof.discardedEdition.publisher=null;proof.sourceReview.publisher=null
  Object.assign(proof.sourceReview,{physicalSourceUrls:[],physicalIdentitySourceType:'library'})
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)}
 {const {data,changes}=fixture(),source=changes[0].reviewedIsbnlessEditionRemoval.sourceReview
  Object.assign(source,{physicalSourceUrls:[],physicalIdentitySourceType:'publisher',bodyLanguage:'und'})
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
  source.bodyLanguage='es'
  assert.equal(planGuardedCatalogRepairs(['work'],data,changes).expected.figure_book_editions.length,1)
 }
})

test('ISBN-less removal rejects a retained edition from another work, a policy exclusion and a stale selected card',()=>{
 for(const difference of [{content_id:'other'},{edition_kind:'abridged'},{sources:{primary:'none'}},{creator:''},{description:'DAUM'}]){
  const {data,changes}=isbnlessRemoval();Object.assign(data.figure_book_editions[1],difference)
  changes[0].reviewedIsbnlessEditionRemoval.referenceEdition=structuredClone(data.figure_book_editions[1])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 const {data,changes}=isbnlessRemoval();changes[0].reviewedIsbnlessEditionRemoval.selectedLocaleCard.publisher='Another press'
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
})

test('ISBN-less wrong-scope review rejects real physical pointers, same scope and unreviewed or replaced retained introduction',()=>{
 for(const mutate of [proof=>{proof.sourceReview.scope=proof.referenceReview.scope},proof=>{proof.sourceReview.wrongScopeConfirmed=false},
  proof=>{proof.sourceReview.description='Different old introduction'},proof=>{proof.referenceReview.llmReviewed=false},
  proof=>{proof.referenceReview.description='Copied unrelated prose'},proof=>{proof.referenceReview.sourceUrl='https://openlibrary.org/works/OL1W'},
  proof=>{proof.selectedLocaleCard.isbn='9788937604706'}]){
  const {data,changes}=isbnlessRemoval('wrong_scope_placeholder');mutate(changes[0].reviewedIsbnlessEditionRemoval)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 for(const patch of [{publisher:'Actual press'},{sources:{provider_edition_url:'https://openlibrary.org/books/OL3M'}},
  {sources:{edition_key:'physical/original'}},{release_date:'1900-01-01'}]){
  const {data,changes}=isbnlessRemoval('wrong_scope_placeholder');Object.assign(data.figure_book_editions[0],patch)
  changes[0].reviewedIsbnlessEditionRemoval.discardedEdition=structuredClone(data.figure_book_editions[0])
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
 }
 const {data,changes}=isbnlessRemoval('wrong_scope_placeholder')
 changes.push({table:'figure_book_editions',before:data.figure_book_editions[1],patch:{description:'Changed retained prose'},
  reviewedIntroductionCorrection:{isbn:data.figure_book_editions[1].isbn,locale:'en',editionTitle:data.figure_book_editions[1].title,
   sourceUrl:data.figure_book_editions[1].sources.description,reason:'A separately reviewed introduction'}})
 assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/ISBN-less edition removal/)
})

test('ISBN-less removal preserves real product history and rejects protected-reference readback drift',async()=>{
 {const {data,changes}=isbnlessRemoval();data.figure_book_products.push({id:'old-product',edition_id:1,is_active:false})
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,changes),/product history/)}
 for(const table of ['member_contents','celeb_contents','figure_book_characters','figure_book_products','faction_lv2']){
  const {data,changes}=isbnlessRemoval(),actual=planGuardedCatalogRepairs(['work'],data,changes).expected
  actual[table][0]={...actual[table][0],concurrentHumanEdit:'preserve this'};let reads=0
  await assert.rejects(guardedCatalogRepairs(null,['work'],changes,{capture:async()=>structuredClone(reads++?actual:data),
   execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})}),new RegExp(table))
 }
})

const editorialReplacement=()=>{
 const {data}=abridgedReplacement(),contentId='a6d825e0-4a08-48c9-9ac0-69e9e9e732f9'
 for(const table of SNAPSHOT_TABLES)for(const row of data[table]){
  if(row.content_id==='work')row.content_id=contentId
  if(table==='contents')row.id=contentId
 }
 data.contents[0].metadata.figureBook={workTitle:'The Idiot',originalCreator:'Fyodor Dostoevsky',workIdentity:'wikidata:q210784',originalTitle:'Идиот'}
 const before=data.figure_book_editions[0],reference=data.figure_book_editions[1],oldSource='https://cyj0347.upaper.kr/content/1214578'
 Object.assign(before,{id:15580,title:'백치(1권)',creator:'도스토옙스키',isbn:'9791176604093',edition_kind:'volume',text_scope:'한국어 번역 분권 1권 (전체 4권)',sources:{primary:'kakao_book',description:oldSource}})
 const description='도스토예프스키의 소설에서 미시킨 공작은 오랜 요양 생활을 마치고 러시아로 돌아온다. 그는 사람들을 선의로 대하지만, 나스타시야 필리포브나와 로고진을 비롯한 주변 인물들의 욕망과 질투 속에서 갈등에 휘말린다.\n\n이 한국어 번역판은 두 권으로 나뉜 소설의 첫 권이다. 인물들이 서로에게 품는 사랑과 연민, 돈과 체면을 둘러싼 선택을 따라가며 미시킨의 순수함이 당시 사회에서 어떤 반응을 일으키는지 보여 준다. 다음 권으로 이어지는 이야기의 시작을 담고 있다.'
 const newSource='https://www.yes24.com/product/goods/105031244'
 Object.assign(reference,{id:6985,title:'백치1',creator:'도스토예프스키',isbn:'9788954683432',edition_kind:'volume',text_scope:'The Idiot, Korean translation volume 1 of 2',description,
  publisher:'문학동네',thumbnail_url:'https://image.yes24.com/goods/105031244/XL',
  sources:{primary:'kakao_book',description:newSource,translators:['김정아']}})
 Object.assign(data.content_locales[0],{title:before.title,creator:before.creator,isbn:before.isbn,sources:structuredClone(before.sources)})
 const sources={...reference.sources,description_method:'research',description_source_locale:'ko'}
 const proof={method:'independent_editorial_introduction_replacement_review',llmReviewed:true,contentId,
  workTitle:'The Idiot',workCreator:'Fyodor Dostoevsky',workIdentity:'wikidata:q210784',originalTitle:'Идиот',originalCreator:'Fyodor Dostoevsky',
  discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),referenceDescription:description,referenceSourceUrl:newSource,
  bodyEvidence:'각 ISBN의 출판사 소개와 본문 구성은 도스토예프스키의 같은 원작을 번역한 첫 분권임을 확인한다. 독자 안내는 정상 번역 대표를 선택한다.',
  reason:'기존 4권 분권 상품을 별도로 안내하지 않고 실제 검수한 정상 번역의 2권 분권 첫 권을 대표로 선택한다. 두 번역의 본문이 같다고 주장하지 않는다.'}
 const changes=[{table:'figure_book_editions',before,remove:true,reviewedSelectionExclusion:{method:'independent_selection_review',content_id:contentId,
  isbn:before.isbn,locale:before.locale,edition_title:before.title,reason:'editorial_exclusion',source_url:oldSource,explanation:proof.reason,replacementIntroduction:proof}},
  {table:'figure_book_editions',before:reference,patch:{sources}},
  {table:'content_locales',before:data.content_locales[0],patch:{title:reference.title,creator:reference.creator,isbn:reference.isbn,
   publisher:reference.publisher,thumbnail_url:reference.thumbnail_url,description,sources},
   reviewedIntroductionCorrection:{method:'independent_editorial_representative_introduction_review',llmReviewed:true,contentId,referenceEditionId:reference.id,
    isbn:before.isbn,locale:'ko',editionTitle:reference.title,sourceUrl:newSource,reason:proof.reason}}]
 return {data,changes,contentId}
}

test('editorial replacement binds originalCreator and both actual translations while selecting a normal first volume and preserving 13 protected tables',()=>{
 const {data,changes,contentId}=editorialReplacement()
 const plan=planGuardedCatalogRepairs([contentId],data,changes)
 assert.equal(plan.expected.figure_book_editions[0].id,6985)
 assert.equal(plan.expected.figure_book_editions[0].edition_kind,'volume')
 assert.equal(plan.expected.content_locales[0].description,data.figure_book_editions[1].description)
 assert.notEqual(plan.expected.content_locales[0].description,data.figure_book_editions[0].description)
 assert.deepEqual(plan.expected.contents,data.contents)
 for(const table of SNAPSHOT_TABLES.filter(table=>!['contents','content_locales','figure_book_contents','figure_book_characters','figure_book_editions'].includes(table)))
  assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql([contentId],data,changes)
 assert.ok(sql.includes('DELETE FROM public.figure_book_editions'))
 assert.ok(!sql.includes('independent_editorial_introduction_replacement_review'))
 assert.ok(!sql.includes('discardedEdition'))
 assert.ok(!sql.includes('sourceSnapshot'))
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
})

test('editorial representative accepts honest NULL scope without claiming completeness, and an explicit workCreator anchor',()=>{
 for(const explicitCreator of [false,true]){
  const {data,changes,contentId}=editorialReplacement(),proof=changes[0].reviewedSelectionExclusion.replacementIntroduction
  Object.assign(data.figure_book_editions[1],{edition_kind:null,text_scope:null})
  proof.referenceEdition=structuredClone(data.figure_book_editions[1])
  if(explicitCreator)data.contents[0].metadata.figureBook.workCreator='Fyodor Dostoevsky'
  assert.equal(planGuardedCatalogRepairs([contentId],data,changes).expected.figure_book_editions[0].edition_kind,null)
 }
})

test('editorial representative rejects another product publisher or cover and permits actual matching NULL metadata',()=>{
 for(const patch of [{publisher:'다른 출판사'},{thumbnail_url:'https://image.yes24.com/goods/3755176/XL'},{publisher:null},{thumbnail_url:null}]){
  const {data,changes,contentId}=editorialReplacement();Object.assign(changes[2].patch,patch)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement|SERVICE_BOOK_EDITION_KINDS/)
 }
 const {data,changes,contentId}=editorialReplacement()
 Object.assign(data.figure_book_editions[1],{publisher:null,thumbnail_url:null})
 changes[0].reviewedSelectionExclusion.replacementIntroduction.referenceEdition=structuredClone(data.figure_book_editions[1])
 Object.assign(changes[2].patch,{publisher:null,thumbnail_url:null})
 const selected=planGuardedCatalogRepairs([contentId],data,changes).expected.content_locales[0]
 assert.equal(selected.publisher,null);assert.equal(selected.thumbnail_url,null)
})

test('editorial replacement selects an existing third representative without removing other Korean translations or English editions',()=>{
 const {data,changes,contentId}=editorialReplacement(),reference=data.figure_book_editions[1]
 const other={...structuredClone(reference),id:7000,title:'백치',isbn:'9780140449136',description:null,sources:{primary:'kakao_book',translators:['다른 역자']}}
 const english={...structuredClone(reference),id:7001,locale:'en',title:'The Idiot',creator:'Fyodor Dostoevsky',isbn:'9780140447927',description:null,sources:{primary:'openlibrary'}}
 data.figure_book_editions.push(other,english)
 Object.assign(data.content_locales[0],{title:other.title,creator:other.creator,isbn:other.isbn})
 changes[2].reviewedIntroductionCorrection.isbn=other.isbn
 const plan=planGuardedCatalogRepairs([contentId],data,changes)
 assert.deepEqual(plan.expected.figure_book_editions.slice(1),[other,english])
 assert.equal(plan.expected.content_locales[0].isbn,reference.isbn)
})

test('editorial provider introduction uses the verified existing body and rejects prose in the wrong language',()=>{
 const {data,changes,contentId}=editorialReplacement()
 changes[1].patch.sources.description_method='provider';changes[2].patch.sources.description_method='provider'
 assert.equal(planGuardedCatalogRepairs([contentId],data,changes).expected.content_locales[0].description,data.figure_book_editions[1].description)
 const wrong='This is the English introduction of a book and its main characters. '.repeat(4)
 data.figure_book_editions[1].description=wrong;changes[2].patch.description=wrong
 const proof=changes[0].reviewedSelectionExclusion.replacementIntroduction
 proof.referenceEdition=structuredClone(data.figure_book_editions[1]);proof.referenceDescription=wrong
 assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
})

test('editorial replacement rejects stale original, edition fields, source/body, missing LLM review and unsupported selection reasons',()=>{
 const mutations=[
  proof=>{proof.llmReviewed=false},proof=>{proof.contentId='other'},proof=>{proof.workCreator='Other author'},proof=>{proof.workTitle='Other work'},
  proof=>{proof.workIdentity='other'},proof=>{proof.originalTitle='Other'},proof=>{proof.originalCreator='Other'},
  proof=>{proof.bodyEvidence='short'},proof=>{proof.reason='short'},proof=>{proof.referenceDescription='Unreviewed new body'},
  proof=>{proof.referenceSourceUrl='https://publisher.example/unread'},proof=>{delete proof.referenceEdition},proof=>{delete proof.discardedEdition},
  ...['discardedEdition','referenceEdition'].flatMap(key=>[
   proof=>{proof[key].id=99999},proof=>{proof[key].content_id='other'},proof=>{proof[key].title='Other title'},
   proof=>{proof[key].creator='Other author'},proof=>{proof[key].isbn='9780140449136'},proof=>{proof[key].locale='en'},
   proof=>{proof[key].description='Stale prose'},proof=>{proof[key].sources.description='https://publisher.example/stale'},
   proof=>{proof[key].text_scope='full'},proof=>{proof[key].edition_kind='full'}])]
 for(const mutate of mutations){
  const {data,changes,contentId}=editorialReplacement();mutate(changes[0].reviewedSelectionExclusion.replacementIntroduction)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
 }
 for(const reason of ['wrong_work','children_only','abridged']){
  const {data,changes,contentId}=editorialReplacement();changes[0].reviewedSelectionExclusion.reason=reason
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Abridged introduction replacement/)
 }
 const {data,changes,contentId}=editorialReplacement();delete changes[0].reviewedSelectionExclusion.replacementIntroduction
 assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Existing introduction/)
})

test('editorial replacement rejects wrong language, invalid sources, excluded or changed reference and stale final anchors',()=>{
 for(const alter of [reference=>{reference.locale='en'},reference=>{reference.edition_kind='abridged'},reference=>{reference.text_scope='volume 2 of 2'},
  reference=>{reference.sources.primary='none'},reference=>{reference.description='OPEN'},reference=>{reference.sources.description='https://openlibrary.org/books/OL1M'},
  reference=>{reference.sources.description='https://localhost/actual'},reference=>{reference.sources.description='https://publisher.example/book?api_key=secret'}]){
  const {data,changes,contentId}=editorialReplacement();alter(data.figure_book_editions[1])
  changes[0].reviewedSelectionExclusion.replacementIntroduction.referenceEdition=structuredClone(data.figure_book_editions[1])
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement|SERVICE_BOOK_EDITION_KINDS/)
 }
 for(const patch of [{title:'Other'},{creator:'Other'},{isbn:'9780140449136'},{edition_kind:'full'},{text_scope:'complete'},
  {description:'Other body'},{sources:{description:'https://publisher.example/other'}}]){
  const {data,changes,contentId}=editorialReplacement();Object.assign(changes[1].patch,patch)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
 }
 for(const key of ['workTitle','workCreator','workIdentity','originalTitle','originalCreator']){
  const {data,changes,contentId}=editorialReplacement(),metadata=structuredClone(data.contents[0].metadata)
  metadata.figureBook[key]='Different original';changes.push({table:'contents',before:data.contents[0],patch:{metadata}})
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
 }
})

test('editorial representative card requires explicit bound companion review and refuses product history or protected readback drift',async()=>{
 for(const patch of [{title:'Other'},{creator:'Other'},{isbn:'9780140449136'},{description:'Other prose'}]){
  const {data,changes,contentId}=editorialReplacement();Object.assign(changes[2].patch,patch)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
 }
 for(const diff of [{method:'automatic'},{llmReviewed:false},{contentId:'other'},{referenceEditionId:99999},{sourceUrl:'https://publisher.example/unread'},{reason:'short'}]){
  const {data,changes,contentId}=editorialReplacement();Object.assign(changes[2].reviewedIntroductionCorrection,diff)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)
 }
 for(const diff of [{isbn:'9780140449136'},{locale:'en'},{editionTitle:'Stale representative title'}]){
  const {data,changes,contentId}=editorialReplacement();Object.assign(changes[2].reviewedIntroductionCorrection,diff)
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Introduction correction requires exact ISBN/)
 }
 {const {data,changes,contentId}=editorialReplacement();delete changes[2].reviewedIntroductionCorrection
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/Editorial introduction replacement/)}
 {const {data,changes,contentId}=editorialReplacement();data.figure_book_products=[{id:10,edition_id:15580,is_active:false}]
  assert.throws(()=>planGuardedCatalogRepairs([contentId],data,changes),/product history/)}
 const protectedTables=SNAPSHOT_TABLES.filter(table=>!['contents','content_locales','figure_book_contents','figure_book_characters','figure_book_editions'].includes(table))
 assert.equal(protectedTables.length,13)
 for(const table of [null,...protectedTables]){
  const {data,changes,contentId}=editorialReplacement(),actual=planGuardedCatalogRepairs([contentId],data,changes).expected
  if(table)actual[table].push({id:'unexpected',content_id:contentId,review:'Unexpected protected change'})
  let captures=0
  const run=()=>guardedCatalogRepairs(null,[contentId],changes,{capture:async()=>structuredClone(captures++?actual:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(table)await assert.rejects(run,/readback mismatch/);else await run()
 }
})

test('local PostgreSQL executes same-work representative replacement atomically and rejects protected-row CAS drift',{
 skip:!process.env.PG_TEST_BIN&&'PG_TEST_BIN requires a local PostgreSQL bin directory',timeout:120000,
},async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join,resolve,basename}=await import('node:path')
 const {spawnSync}=await import('node:child_process'),{createServer}=await import('node:net')
 const directory=mkdtempSync(join(tmpdir(),'feelandnote-abridged-introduction-test-')),dbDirectory=join(directory,'db')
 const executable=name=>join(process.env.PG_TEST_BIN,name+(process.platform==='win32'?'.exe':''))
 const run=(name,args,input,options={})=>{
  const result=spawnSync(executable(name),args,{input,encoding:'utf8',windowsHide:true,shell:false,timeout:15000,maxBuffer:10*1024*1024,...options})
  if(result.error||result.status!==0)throw Error(result.error?.message??result.stderr)
  return result.stdout?.trim()??''
 }
 const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done))
 const port=server.address().port;await new Promise(done=>server.close(done))
 let started=false
 t.after(()=>{
  if(started)run('pg_ctl',['-D',dbDirectory,'-m','immediate','-w','stop'])
  assert.ok(resolve(directory).startsWith(resolve(tmpdir())+(process.platform==='win32'?'\\':'/'))&&basename(directory).startsWith('feelandnote-abridged-introduction-test-'))
  if(process.platform==='win32'){
   const result=spawnSync('powershell',['-NoProfile','-Command',`Remove-Item -LiteralPath '${directory.replaceAll("'","''")}' -Recurse`],{windowsHide:true,shell:false,encoding:'utf8'})
   assert.equal(result.status,0,result.stderr)
  }else rmSync(directory,{recursive:true})
 })
 run('initdb',['-D',dbDirectory,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8'])
 run('pg_ctl',['-D',dbDirectory,'-l',join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],undefined,{stdio:'ignore'});started=true
 const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres']
 const query=sql=>run('psql',args,sql),literal=text=>"'"+text.replaceAll("'","''")+"'"
 query(`CREATE TABLE contents(id text PRIMARY KEY,type text,metadata jsonb,external_id text,updated_at text);
 CREATE TABLE content_locales(content_id text REFERENCES contents,locale text,title text,creator text,isbn text,description text,sources jsonb,PRIMARY KEY(content_id,locale));
 CREATE TABLE figure_book_contents(content_id text PRIMARY KEY REFERENCES contents);
 CREATE TABLE figure_book_characters(content_id text REFERENCES contents,celeb_id text,relation_type text,PRIMARY KEY(content_id,celeb_id));
 CREATE TABLE figure_book_editions(id bigint PRIMARY KEY,content_id text REFERENCES contents,locale text,title text,creator text,isbn text,description text,sources jsonb,edition_kind text,text_scope text,updated_at text);
 CREATE TABLE figure_book_products(id bigint PRIMARY KEY,edition_id bigint REFERENCES figure_book_editions,is_active bool);
 CREATE TABLE member_contents(id text PRIMARY KEY,content_id text REFERENCES contents,review text,rating int);
 CREATE TABLE celeb_contents(id text PRIMARY KEY,content_id text REFERENCES contents,review text,review_en text,source_url text);
 CREATE TABLE curated_list_items(id text PRIMARY KEY,content_id text REFERENCES contents,note text);
 CREATE TABLE flow_nodes(id text PRIMARY KEY,content_id text REFERENCES contents,bonus_content_ids jsonb);
 CREATE TABLE records(id text PRIMARY KEY,content_id text REFERENCES contents,body text);
 CREATE TABLE notes(id text PRIMARY KEY,content_id text REFERENCES contents,memo text);
 CREATE TABLE activity_logs(id text PRIMARY KEY,content_id text REFERENCES contents,metadata jsonb);
 CREATE TABLE commerce_events(id bigint PRIMARY KEY,content_id text REFERENCES contents,kind text);
 CREATE TABLE profession_book_picks(content_id text REFERENCES contents,profession text);
 CREATE TABLE faction_lv2(id text PRIMARY KEY,theme_book_ids text[]);
 CREATE TABLE flows(id text PRIMARY KEY,tiers jsonb);
 CREATE TABLE tier_lists(id text PRIMARY KEY,tiers jsonb,unranked text[]);`)
 const fixture=abridgedReplacement()
 Object.assign(fixture.data,{figure_book_contents:[{content_id:'work'}],figure_book_products:[{id:91,edition_id:19916,is_active:false}],celeb_contents:[{id:'celeb-review',content_id:'work',review:'Protected Korean reading',review_en:'Protected English reading',source_url:'https://interview.example/reading'}],
  curated_list_items:[{id:'curated',content_id:'work',note:'Protected selection'}],flow_nodes:[{id:'node',content_id:'work',bonus_content_ids:['work']}],
  records:[{id:'record',content_id:'work',body:'Protected record'}],notes:[{id:'note',content_id:'work',memo:'Protected note'}],activity_logs:[{id:'activity',content_id:'work',metadata:{keep:true}}],
  commerce_events:[{id:1,content_id:'work',kind:'click'}],profession_book_picks:[{content_id:'work',profession:'writer'}],flows:[{id:'flow',tiers:{S:['work']}}],tier_lists:[{id:'tier',tiers:{S:['work']},unranked:['work']}]})
 const reset=()=>query(`TRUNCATE ${SNAPSHOT_TABLES.join(',')} CASCADE;`+SNAPSHOT_TABLES.filter(table=>fixture.data[table].length)
  .map(table=>`INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},${literal(JSON.stringify(fixture.data[table]))}::jsonb);`).join('\n'))
 const capture=()=>JSON.parse(query(buildCatalogRepairSnapshotSql(['work'])))
 const changesFor=snapshot=>fixture.changes.map(change=>({...structuredClone(change),before:structuredClone(snapshot[change.table].find(row=>change.table==='content_locales'?row.content_id===change.before.content_id&&row.locale===change.before.locale:String(row.id)===String(change.before.id)))}))
 reset()
 const before=capture(),changes=changesFor(before),expected=planGuardedCatalogRepairs(['work'],before,changes).expected
 query(buildGuardedCatalogRepairSql(['work'],before,changes))
 const actual=capture(),canonical=rows=>rows.map(row=>JSON.stringify(row)).sort()
 for(const table of SNAPSHOT_TABLES)assert.deepEqual(canonical(actual[table]),canonical(expected[table]),table)
 assert.equal(actual.figure_book_editions[0].id,19916)
 reset()
 const stale=capture(),staleSql=buildGuardedCatalogRepairSql(['work'],stale,changesFor(stale))
 query("UPDATE member_contents SET review='Concurrent human edit' WHERE id='reading';")
 assert.throws(()=>query(staleSql),/rowset mismatch in member_contents/)
 assert.equal(query('SELECT count(*) FROM figure_book_editions'),'2')
 assert.equal(query('SELECT isbn FROM content_locales'),'9788949706634')
 assert.equal(query("SELECT review FROM member_contents WHERE id='reading'"),'Concurrent human edit')
})

test('actual catalog repair rejects dry-run options before any capture or execution',async()=>{
 for(const options of [{apply:false},{dryRun:true},{apply:true,dryRun:true},{apply:false,dryRun:false}]){
  const data=snapshot();let captured=0,executed=0
  await assert.rejects(guardedCatalogRepairs(null,['work'],[change(data)],{...options,
   capture:async()=>{captured++;return data},execute:()=>{executed++;return 'MERGE_COMMITTED'}}),/use planGuardedCatalogRepairs for dry-run/)
  assert.equal(captured,0);assert.equal(executed,0)
 }
})

test('explicit apply true retains actual write and full readback behavior',async()=>{
 const data=snapshot(),changes=[change(data)],expected=planGuardedCatalogRepairs(['work'],data,changes).expected
 let captured=0,executed=0
 const result=await guardedCatalogRepairs(null,['work'],changes,{apply:true,
  capture:async()=>structuredClone(captured++?expected:data),execute:()=>{executed++;return 'MERGE_COMMITTED'}})
 assert.equal(captured,2);assert.equal(executed,1);assert.equal(result.changed,1);assert.equal(result.checkedTables,18)
})

test('execute failures still remove owned temporary files',async()=>{
 const data=snapshot();let path
 await assert.rejects(guardedCatalogRepairs(null,['work'],[change(data)],{capture:async()=>data,execute:file=>{path=file;throw Error('Mock SQL rejected')}}),/Mock SQL rejected/)
 assert.equal(existsSync(path),false)
})

const unwantedSnapshot=()=>{
 const data=snapshot();data.member_contents=[];data.faction_lv2=[]
 data.figure_book_editions[0].isbn='9780140449136'
 data.content_locales[0].isbn='9780140449136'
 data.figure_book_contents=[{content_id:'work',metadata:{}}]
 data.figure_book_characters=[{content_id:'work',celeb_id:'figure',description:'Existing appearance relation'}]
 return data
}
const exclusion=()=>({contentId:'work',isbns:['9780140449136'],reason:'LLM reviewed the entire work and every edition: this entry is an unwanted abridged reader, not the original.',sourceUrl:'https://publisher.example/books/reader'})

test('whole-work exclusion requires explicit independent evidence covering every actual ISBN',()=>{
 const data=unwantedSnapshot(),proof=exclusion()
 assert.equal(planGuardedCatalogExclusions(['work'],data,[proof]).excluded.length,1)
 // An ISBN10 equivalent is accepted, but a single bad edition cannot cover another current edition.
 assert.equal(planGuardedCatalogExclusions(['work'],data,[{...proof,isbns:['0140449132']}]).excluded.length,1)
 data.figure_book_editions.push({...data.figure_book_editions[0],id:2,title:'Unabridged original',isbn:'9780140449181'})
 assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[proof]),/EVERY/)
 data.figure_book_editions.pop();data.content_locales.push({...data.content_locales[0],locale:'ko',isbn:'9780140449181'})
 assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[proof]),/EVERY/)
 data.content_locales.at(-1).sources={primary:'none',title:'display_only'}
 assert.equal(planGuardedCatalogExclusions(['work'],data,[proof]).excluded.length,1)
 for(const bad of [{...proof,reason:''},{...proof,sourceUrl:'http://publisher.example/book'},{...proof,sourceUrl:'https://openlibrary.org/books/OL1M'},
  {...proof,sourceUrl:'https://publisher.example/?api_key=secret'},{...proof,contentId:'outside'},{...proof,isbns:['invalid']}])assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[bad]))
 assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[proof,proof]))
})

test('every protected table, array-only references and inactive product history block exclusion',async()=>{
 const allowed=new Set(['contents','content_locales','figure_book_contents','figure_book_editions','figure_book_characters'])
 for(const table of SNAPSHOT_TABLES.filter(table=>!allowed.has(table))){
  const data=unwantedSnapshot()
  data[table]=[table==='figure_book_products'?{edition_id:1,is_active:false}:table==='flows'?{tiers:{A:['work']}}:
   table==='tier_lists'?{tiers:{},unranked:['work']}:table==='faction_lv2'?{theme_book_ids:['work']}:
    table==='flow_nodes'?{content_id:'other',bonus_content_ids:['work']}:{content_id:'work',review:'Protected human review',rating:5}]
  let executed=false
  const result=await guardedCatalogExclusions(null,['work'],[exclusion()],{capture:async()=>data,checkReferences:()=>{},execute:()=>{executed=true}})
  assert.equal(executed,false,table)
  assert.deepEqual(result.blocked[0].references,[{table,count:1}])
 }
})

test('fixed-reference guard receives the exact content ID and blocks the entire batch before SQL',async()=>{
 const data=unwantedSnapshot();let captured=0,executed=false,checked=[]
 const result=await guardedCatalogExclusions(null,['work'],[exclusion()],{capture:async()=>{captured++;return data},checkReferences:id=>{checked.push(id);throw Error('Code still uses ID')},execute:()=>{executed=true}})
 assert.deepEqual(checked,['work']);assert.equal(captured,1);assert.equal(executed,false)
 assert.deepEqual(result.blocked,[{contentId:'work',reason:'fixed_references'}]);assert.equal(result.excluded,0)
})

test('exclusion SQL orders five deletes, guards unknown FK cascades, and checks exact 18 rowsets twice',()=>{
 const data=unwantedSnapshot(),sql=buildGuardedCatalogExclusionSql(['work'],data,[exclusion()])
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 const tables=['figure_book_characters','figure_book_editions','figure_book_contents','content_locales','contents']
 assert.deepEqual([...sql.matchAll(/DELETE FROM public\.(\w+)/gu)].map(match=>match[1]),tables)
 assert.ok(sql.includes('ISOLATION LEVEL READ COMMITTED'))
 assert.ok(sql.includes('unhandled foreign reference'))
 assert.ok(sql.includes("c.confrelid IN ('public.figure_book_characters'::regclass"))
 assert.ok(sql.includes('cardinality(c.confkey)<>1'))
 assert.ok(sql.includes('LOCK TABLE public.activity_logs,public.flow_nodes,public.flows,public.tier_lists,public.faction_lv2'))
 assert.ok(!sql.includes('LOCK TABLE public.contents'))
 assert.ok(!sql.includes('UPDATE public.'))
 assert.ok(sql.indexOf(';COMMIT;')>sql.lastIndexOf('rowset mismatch'))
})

test('successful exclusion deletes only reviewed works and self-reads all 18 tables with temporary cleanup',async()=>{
 const data=unwantedSnapshot();data.contents.push({id:'other',type:'BOOK'})
 data.member_contents=[{content_id:'other',review:'Retained review',rating:4}]
 data.faction_lv2=[{id:'theme',theme_book_ids:['other']}]
 const expected=planGuardedCatalogExclusions(['work','other'],data,[exclusion()]).expected
 let reads=0,path
 const result=await guardedCatalogExclusions(null,['work','other'],[exclusion()],{capture:async()=>structuredClone(reads++?expected:data),checkReferences:id=>assert.equal(id,'work'),execute:file=>{path=file;assert.ok(readFileSync(file,'utf8').includes('protected figure_book_products'));return 'MERGE_COMMITTED'}})
 assert.equal(reads,2);assert.equal(existsSync(path),false);assert.equal(result.excluded,1)
 assert.equal(result.checkedTables,SNAPSHOT_TABLES.length)
 assert.equal(expected.contents[0].id,'other')
 assert.equal(expected.member_contents[0].review,'Retained review')
 for(const table of ['content_locales','figure_book_contents','figure_book_editions','figure_book_characters'])assert.equal(expected[table].length,0)
})

test('exclusion rejects unexpected readback changes and cleans its SQL on execution failure',async()=>{
 const data=unwantedSnapshot(),expected=planGuardedCatalogExclusions(['work'],data,[exclusion()]).expected
 expected.notes=[{content_id:'work',body:'Unexpected trigger side effect'}];let reads=0
 await assert.rejects(guardedCatalogExclusions(null,['work'],[exclusion()],{capture:async()=>structuredClone(reads++?expected:data),checkReferences:()=>{},execute:()=>'MERGE_COMMITTED'}),/notes/)
 let path
 await assert.rejects(guardedCatalogExclusions(null,['work'],[exclusion()],{capture:async()=>data,checkReferences:()=>{},execute:file=>{path=file;throw Error('Exclusion SQL failed')}}),/Exclusion SQL failed/)
 assert.equal(existsSync(path),false)
})

test('catalog_only explicitly removes three catalog tables and preserves contents, locales and every protected row',async()=>{
 const data=unwantedSnapshot()
 for(const table of SNAPSHOT_TABLES.filter(table=>!['contents','content_locales','figure_book_contents','figure_book_editions','figure_book_characters','figure_book_products'].includes(table)))
  data[table]=[table==='flows'?{id:'flow',tiers:{A:['work']}}:table==='tier_lists'?{id:'tiers',tiers:{A:['work']},unranked:['work']}:
   table==='faction_lv2'?{id:'faction',theme_book_ids:['work']}:table==='flow_nodes'?{id:'node',content_id:'work',bonus_content_ids:['work']}:
    {id:table,content_id:'work',review:'Protected prose',rating:5,updated_at:'unchanged'}]
 data.celeb_contents.push({...data.celeb_contents[0],id:'second-celeb',review:'Second public review'})
 assert.equal(planGuardedCatalogExclusions(['work'],data,[exclusion()]).excluded.length,0)
 const plan=planGuardedCatalogExclusions(['work'],data,[exclusion()],{mode:'catalog_only'})
 assert.equal(plan.blocked.length,0)
 const deleted=['figure_book_characters','figure_book_editions','figure_book_contents']
 for(const table of SNAPSHOT_TABLES){
  if(deleted.includes(table))assert.equal(plan.expected[table].length,0)
  else assert.deepEqual(plan.expected[table],data[table])
 }
 const sql=buildGuardedCatalogExclusionSql(['work'],data,[exclusion()],{mode:'catalog_only'})
 assert.deepEqual([...sql.matchAll(/DELETE FROM public\.(\w+)/gu)].map(match=>match[1]),deleted)
 assert.ok(!sql.includes('CATALOG_EXCLUSION: protected celeb_contents'))
 assert.ok(sql.includes('CATALOG_EXCLUSION: protected figure_book_products'))
 for(const table of SNAPSHOT_TABLES)assert.equal(sql.split('CATALOG_REPAIR: rowset mismatch in '+table+"'").length-1,2)
 let reads=0
 const result=await guardedCatalogExclusions(null,['work'],[exclusion()],{mode:'catalog_only',capture:async()=>structuredClone(reads++?plan.expected:data),checkReferences:()=>assert.fail('The BOOK ID survives catalog-only exclusion, including fixed code references'),execute:()=> 'MERGE_COMMITTED'})
 assert.deepEqual(result,{excluded:0,mode:'catalog_only',catalogExcluded:1,contentIds:['work'],blocked:[],checkedTables:18})
 assert.equal(reads,2)
})

test('catalog_only still blocks inactive products and missing ISBN evidence',async()=>{
 const data=unwantedSnapshot();data.figure_book_products=[{id:2,edition_id:1,is_active:false}]
 let executed=false
 const options={mode:'catalog_only',capture:async()=>data,checkReferences:()=>{},execute:()=>{executed=true}}
 const result=await guardedCatalogExclusions(null,['work'],[exclusion()],options)
 assert.equal(executed,false);assert.equal(result.catalogExcluded,0)
 assert.deepEqual(result.blocked[0].references,[{table:'figure_book_products',count:1}])
 data.figure_book_products=[]
 data.figure_book_editions.push({...data.figure_book_editions[0],id:2,isbn:'9780140449181'})
 assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[exclusion()],{mode:'catalog_only'}),/EVERY/)
 assert.throws(()=>planGuardedCatalogExclusions(['work'],data,[exclusion()],{mode:'unapproved'}),/mode/)
})

test('catalog_only readback rejects altered public prose and consumer records',async()=>{
 for(const table of ['contents','content_locales','celeb_contents']){
  const data=unwantedSnapshot();data.celeb_contents=[{content_id:'work',review:'Public review',rating:4}]
  const expected=planGuardedCatalogExclusions(['work'],data,[exclusion()],{mode:'catalog_only'}).expected
  if(table==='contents')expected.contents[0].metadata={unexpected:'change'}
  else if(table==='content_locales')expected.content_locales[0].description='Unexpected introduction edit'
  else expected.celeb_contents[0].review='Unexpected review edit'
  let reads=0
  await assert.rejects(guardedCatalogExclusions(null,['work'],[exclusion()],{mode:'catalog_only',capture:async()=>structuredClone(reads++?expected:data),checkReferences:()=>{},execute:()=>'MERGE_COMMITTED'}),new RegExp(table))
 }
})

function catalogRepresentativeSelection(){
 const data=Object.fromEntries(SNAPSHOT_TABLES.map(table=>[table,[]]));
 const figure={workTitle:'Tristan und Isolde',workCreator:'Richard Wagner',workIdentity:'richard-wagner/tristan-und-isolde'};
 const discardedWork={id:'discard',type:'BOOK',metadata:{figureBook:{...figure}},external_id:'9781434434715'};
 const referenceWork={id:'normal',type:'BOOK',metadata:{figureBook:{...figure}},external_id:'9780714538495'};
 data.contents=[discardedWork,referenceWork];
 const discarded={id:39531,content_id:'discard',locale:'en',title:'Tristan and Isolde: Libretto, German and English Text',creator:'Richard Wagner',isbn:'9781434434715',publisher:'Wildside Press',thumbnail_url:null,verified:true,edition_kind:'full',text_scope:'German and English libretto; English translator unverified',description:'This Wildside edition presents the German and English libretto of Wagner’s opera.',sources:{primary:'openlibrary',description:'https://indigo.example/old-unavailable',description_method:'editorial',description_source_locale:'en'}};
 const reference={id:39520,content_id:'normal',locale:'en',title:'Tristan and Isolde',creator:'Richard Wagner',isbn:'9780714538495',publisher:'J. Calder',thumbnail_url:null,verified:true,edition_kind:'full',text_scope:'German and English libretto with introductory essays',description:'This English National Opera Guide presents Wagner’s Tristan und Isolde libretto in German and Andrew Porter’s English translation. Essays discuss its literary sources, musical structure and stage history.',sources:{primary:'openlibrary',description:'https://publisher.example/9780714538495',description_method:'editorial',description_source_locale:'en',translators:['Andrew Porter']}};
 data.figure_book_editions=[discarded,reference];
 const card=edition=>Object.fromEntries(['content_id','locale','title','creator','isbn','publisher','thumbnail_url','verified','description','sources'].map(key=>[key,structuredClone(edition[key])]));
 const discardedCard={...card(discarded),affiliate_url:null,updated_at:'before'},referenceCard={...card(reference),affiliate_url:null,updated_at:'before'};
 data.content_locales=[discardedCard,referenceCard];
 data.figure_book_characters=[{content_id:'discard',celeb_id:'tristan',relation_type:'appearance',description:null},{content_id:'normal',celeb_id:'tristan',relation_type:'appearance',description:null}];
 const sourceReview=(row,sourceUrl)=>({llmReviewed:true,isbn:row.isbn,locale:row.locale,editionTitle:row.title,editionCreator:row.creator,sourceUrl,...figure,creditedTranslators:structuredClone(row.sources.translators??null),creditEvidence:'The exact ISBN publication credits name Wagner and identify the stated translator only when credited.',bodyEvidence:'The publisher’s exact ISBN description identifies Wagner’s German and English opera libretto.',scopeEvidence:'The stated publication contents are preserved; no claim is made that the two English translations are identical.'});
 const proof={method:CATALOG_REPRESENTATIVE_SELECTION_REVIEW,llmReviewed:true,decision:'select_existing_verified_representative',identicalBody:false,...figure,
 discardedWork:structuredClone(discardedWork),referenceWork:structuredClone(referenceWork),discardedEdition:structuredClone(discarded),referenceEdition:structuredClone(reference),discardedLocaleCard:structuredClone(discardedCard),referenceLocaleCard:structuredClone(referenceCard),
 discardedSourceReview:sourceReview(discarded,'https://publisher.example/9781434434715'),referenceSourceReview:sourceReview(reference,reference.sources.description),reason:'The existing verified Porter representative is selected; the additional uncredited translation product is excluded without claiming equivalent text.'};
 const selection={method:'independent_selection_review',content_id:'discard',isbn:discarded.isbn,locale:'en',edition_title:discarded.title,reason:'editorial_exclusion',source_url:proof.discardedSourceReview.sourceUrl,explanation:proof.reason,replacementIntroduction:proof};
 const patch=Object.fromEntries(['title','creator','description','isbn','publisher','thumbnail_url','sources','affiliate_url','verified'].map(key=>[key,structuredClone(referenceCard[key]??null)]));
 const changes=[{table:'figure_book_editions',before:discarded,remove:true,reviewedSelectionExclusion:selection},{table:'content_locales',before:discardedCard,patch,reviewedIntroductionCorrection:{method:CATALOG_REPRESENTATIVE_SELECTION_REVIEW,llmReviewed:true,contentId:'discard',referenceEditionId:reference.id,isbn:discardedCard.isbn,locale:'en',editionTitle:reference.title,sourceUrl:referenceCard.sources.description,reason:proof.reason}}];
 return {data,changes,proof,assigned:['discard','normal']};
}

function legacyRepresentativeReview(data,reference,card){
 const work=data.contents.find(row=>row.id===reference.content_id)
 return {method:'independent_existing_legacy_introduction_review',llmReviewed:true,work:structuredClone(work),
  workAnchor:Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work.metadata.figureBook[key]??null])),
  referenceEdition:structuredClone(reference),referenceLocaleCard:structuredClone(card),
  sourceReview:{llmReviewed:true,introductionIsValid:true,bodyLanguage:reference.locale,isbn:reference.isbn,
   editionTitle:reference.title,editionCreator:reference.creator,locale:reference.locale,description:reference.description,
   sourceUrl:reference.sources.description,creditedTranslators:structuredClone(reference.sources.translators),
   bodyEvidence:'The exact ISBN source identifies the original work, actual translator and language of this existing representative.',
   introductionEvidence:'The existing introduction was read against that exact book source and accurately describes this edition without invented contents.',
   scopeEvidence:'The existing publication scope is preserved; the additional edition is not asserted to have identical translation text.'},
  reason:'Retain the already verified representative introduction and its legacy method without relabelling the source or writing new prose.'}
}

function legacyCatalogSelection(){
 const f=catalogRepresentativeSelection(),{data,changes,proof}=f,reference=data.figure_book_editions[1],card=data.content_locales[1]
 reference.sources.description_method='editorial_summary';delete reference.sources.description_source_locale
 card.sources=structuredClone(reference.sources)
 proof.referenceEdition=structuredClone(reference);proof.referenceLocaleCard=structuredClone(card)
 proof.reviewedLegacyRepresentativeIntroduction=legacyRepresentativeReview(data,reference,card)
 changes[1].patch.sources=structuredClone(card.sources)
 return f
}

test('representative selection preserves a reviewed exact legacy editorial introduction and absent locale without rewriting provenance',()=>{
 const {data,changes,assigned}=legacyCatalogSelection(),plan=planGuardedCatalogRepairs(assigned,data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 assert.deepEqual(plan.expected.content_locales[1],data.content_locales[1])
 assert.equal(plan.expected.content_locales[0].sources.description_method,'editorial_summary')
 assert.equal(plan.expected.content_locales[0].sources.description_source_locale,undefined)
 for(const table of SNAPSHOT_TABLES.filter(table=>!['content_locales','figure_book_editions'].includes(table)))assert.deepEqual(plan.expected[table],data[table],table)
})

test('legacy representative review refuses stale original/card/edition, wrong ISBN/language/source, missing body review and altered introduction',()=>{
 const mutations=[
  f=>{delete f.proof.reviewedLegacyRepresentativeIntroduction},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.referenceEdition.publisher='Another publisher'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.referenceLocaleCard.description+=' changed'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.work.metadata.figureBook.workIdentity='another work'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.workAnchor.originalTitle='foreign title'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.isbn=f.data.figure_book_editions[0].isbn},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.bodyLanguage='ko'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.sourceUrl='https://openlibrary.org/books/OL1M'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.bodyEvidence='title only'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.introductionEvidence='not read'},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.introductionIsValid=false},
  f=>{f.proof.reviewedLegacyRepresentativeIntroduction.sourceReview.creditedTranslators=['invented translator']},
  f=>{f.changes[1].patch.description+=' new prose'},
  f=>{f.data.figure_book_products.push({id:'old-product',edition_id:39531})},
  f=>{f.data.member_contents.push({id:'old-member',content_id:'discard',edition_id:39531})}
 ]
 for(const mutate of mutations){const f=legacyCatalogSelection();mutate(f);assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative|product history/)}
 for(const badSource of [null,'https://openlibrary.org/books/OL1M']){
  const f=legacyCatalogSelection(),reference=f.data.figure_book_editions[1],card=f.data.content_locales[1]
  reference.sources.description=badSource;card.sources.description=badSource
  f.proof.referenceEdition=structuredClone(reference);f.proof.referenceLocaleCard=structuredClone(card)
  f.proof.referenceSourceReview.sourceUrl=badSource
  f.proof.reviewedLegacyRepresentativeIntroduction=legacyRepresentativeReview(f.data,reference,card)
  f.changes[1].patch.sources=structuredClone(card.sources)
  f.changes[1].reviewedIntroductionCorrection.sourceUrl=badSource
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)
 }
})

test('editorial selection retains an already selected legacy reviewed summary without mapping distinct scopes or changing sources',()=>{
 const {data,changes,contentId}=editorialReplacement(),reference=data.figure_book_editions[1]
 reference.verified=true
 reference.sources.description_method='reviewed_summary';delete reference.sources.description_source_locale
 const card=data.content_locales[0]
 Object.assign(card,Object.fromEntries(['title','creator','isbn','publisher','thumbnail_url','verified','description','sources'].map(key=>[key,structuredClone(reference[key])])))
 const removal=changes[0],proof=removal.reviewedSelectionExclusion.replacementIntroduction
 proof.referenceEdition=structuredClone(reference)
 proof.reviewedLegacyRepresentativeIntroduction=legacyRepresentativeReview(data,reference,card)
 const plan=planGuardedCatalogRepairs([contentId],data,[removal])
 assert.deepEqual(plan.expected.content_locales,data.content_locales)
 assert.deepEqual(plan.expected.figure_book_editions,[reference])
 assert.deepEqual(plan.expected.contents,data.contents)
 assert.equal(plan.expected.figure_book_editions[0].sources.description_method,'reviewed_summary')
 assert.notEqual(reference.text_scope,removal.before.text_scope)
 const invalid=structuredClone(removal);invalid.reviewedSelectionExclusion.replacementIntroduction.reviewedLegacyRepresentativeIntroduction.sourceReview.description+=' incorrect'
 assert.throws(()=>planGuardedCatalogRepairs([contentId],data,[invalid]),/Editorial introduction replacement/)
})

test('catalog selection keeps the exact existing editorial representative and all other rows without claiming translation equivalence',()=>{
 const {data,changes,assigned}=catalogRepresentativeSelection();const plan=planGuardedCatalogRepairs(assigned,data,changes);
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]]);
 assert.deepEqual(plan.expected.content_locales[1],data.content_locales[1]);
 assert.equal(plan.expected.content_locales[0].description,data.content_locales[1].description);
 assert.equal(plan.expected.content_locales[0].sources.description_method,'editorial');
 for(const table of SNAPSHOT_TABLES.filter(table=>!['content_locales','figure_book_editions'].includes(table)))assert.deepEqual(plan.expected[table],data[table],table);
 const sql=buildGuardedCatalogRepairSql(assigned,data,changes);assert.ok(!sql.includes(CATALOG_REPRESENTATIVE_SELECTION_REVIEW));assert.ok(!sql.includes('discardedSourceReview'));
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table);
});

test('catalog selection refuses stale rows, another original, known translations, discarded product history, new prose, scope and other edition changes',()=>{
 const cases=[
 f=>{f.proof.referenceEdition.publisher='stale'},
 f=>{f.proof.discardedWork.external_id='stale'},
 f=>{f.data.contents[1].metadata.figureBook.workIdentity='another-original';f.proof.referenceWork=structuredClone(f.data.contents[1])},
 f=>{f.data.figure_book_editions[0].sources.translators=['Other translator'];f.proof.discardedEdition=structuredClone(f.data.figure_book_editions[0]);f.proof.discardedSourceReview.creditedTranslators=['Other translator']},
 f=>{f.data.figure_book_products=[{id:1,edition_id:39531}]},
 f=>{f.data.member_contents=[{id:1,content_id:'discard',edition_id:39531}]},
 f=>{f.changes[1].patch.description+=' Newly written contents.'},
 f=>{f.changes[1].patch.sources.description_method='provider'},
 f=>{f.changes.push({table:'figure_book_editions',before:f.data.figure_book_editions[1],patch:{text_scope:'complete'}})},
 f=>{f.changes.push({table:'figure_book_editions',before:f.data.figure_book_editions[1],patch:{publisher:'Another publisher'}})},
 f=>{f.proof.referenceSourceReview.llmReviewed=false},
 f=>{f.proof.discardedSourceReview.isbn='9780140449136'},
 f=>{f.proof.referenceSourceReview.sourceUrl='https://openlibrary.org/books/OL1M'},
 f=>{f.proof.identicalBody=true},
 f=>{f.proof.discardedSourceReview.bodyEvidence='title only'},
 f=>{f.changes[1].reviewedIntroductionCorrection.referenceEditionId=99999}
 ];
 for(const mutate of cases){const fixture=catalogRepresentativeSelection();mutate(fixture);assert.throws(()=>planGuardedCatalogRepairs(fixture.assigned,fixture.data,fixture.changes),/Catalog representative|product history/);}
 const fixture=catalogRepresentativeSelection();assert.throws(()=>planGuardedCatalogRepairs(['discard'],fixture.data,fixture.changes),/Catalog representative/);
});

test('catalog selection preserves existing member records, reviews and normal product history, including an already selected same-owner card',()=>{
 for(const sameOwner of [false,true]){
  const fixture=catalogRepresentativeSelection(),{data,changes,proof}=fixture;
  if(sameOwner){
   data.contents=[data.contents[0]];data.figure_book_editions[1].content_id='discard';
   data.content_locales=[{...data.content_locales[1],content_id:'discard'}];
   proof.referenceWork=structuredClone(data.contents[0]);proof.referenceEdition=structuredClone(data.figure_book_editions[1]);
   proof.referenceLocaleCard=structuredClone(data.content_locales[0]);proof.discardedLocaleCard=structuredClone(data.content_locales[0]);
   changes.pop();fixture.assigned=['discard'];
  }
  data.member_contents=[{id:'member',content_id:sameOwner?'discard':'normal',status:'FINISHED',rating:5}];
  data.celeb_contents=[{id:'reading',content_id:sameOwner?'discard':'normal',review:'Existing normal reading remains unchanged.',source_url:'https://interview.example/original'}];
  data.figure_book_products=[{id:'normal-product',edition_id:39520,status:'inactive'}];
  data.commerce_events=[{id:'purchase',content_id:sameOwner?'discard':'normal'}];
  const plan=planGuardedCatalogRepairs(fixture.assigned,data,changes);
  for(const table of ['member_contents','celeb_contents','figure_book_products','commerce_events'])assert.deepEqual(plan.expected[table],data[table],table);
  if(sameOwner)assert.deepEqual(plan.expected.content_locales,data.content_locales);
 }
});

test('catalog selection actual readback rejects altered member contents and celebrity reviews',async()=>{
 for(const table of ['member_contents','celeb_contents']){
  const {data,changes,assigned}=catalogRepresentativeSelection();data[table]=[{id:'protected',content_id:'normal',review:'The original review is preserved.',status:'FINISHED'}];
  const after=structuredClone(planGuardedCatalogRepairs(assigned,data,changes).expected);after[table][0].review='An unrelated modified review.';
  let captures=0;await assert.rejects(guardedCatalogRepairs(null,assigned,changes,{capture:async()=>structuredClone(captures++?after:data),execute:()=> 'MERGE_COMMITTED'}),new RegExp('readback mismatch: '+table));
 }
});

test('catalog selection clears only the exact excluded cross-owner ISBN pointer and rejects identity or normal ISBN duplication',()=>{
 const {data,changes,proof,assigned}=catalogRepresentativeSelection();proof.clearDiscardedExternalIsbn=true;changes.push({table:'contents',before:data.contents[0],patch:{external_id:null}});
 const plan=planGuardedCatalogRepairs(assigned,data,changes);assert.deepEqual(plan.expected.contents[0],{...data.contents[0],external_id:null});assert.deepEqual(plan.expected.contents[1],data.contents[1]);
 for(const mutate of [f=>{f.changes[2].patch.external_id=f.data.contents[1].external_id},f=>{f.changes[2].before=f.data.contents[1]},f=>{f.changes[2].patch.external_source='another-provider'},f=>{f.changes[2].patch.metadata={figureBook:{workIdentity:'another-original'}}},f=>{delete f.proof.clearDiscardedExternalIsbn},f=>{f.data.contents[0].external_id='9780140449136';f.proof.discardedWork=structuredClone(f.data.contents[0])}]){
  const f=catalogRepresentativeSelection();f.proof.clearDiscardedExternalIsbn=true;f.changes.push({table:'contents',before:f.data.contents[0],patch:{external_id:null}});mutate(f);assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/);
 }
});

function unknownCreditOpeningPartsSnapshot(){
 const {data,removal}=openingOmnibusSnapshot(),[later,first]=data.figure_book_editions
 delete later.sources.translators;delete first.sources.translators
 later.locale=first.locale=data.content_locales[0].locale='en'
 data.contents[0].metadata.figureBook.series.creator=first.creator
 const proof=removal.reviewedNonstartEditionRemoval
 proof.locale='en';proof.referenceOpeningOmnibusReview.sourceReview.bodyLanguage='en'
 proof.referenceOpeningOmnibusReview.selectedLocaleCard=structuredClone(data.content_locales[0])
 proof.referenceOpeningOmnibusReview.currentWork=structuredClone(data.contents[0])
 proof.referenceOpeningOmnibusReview.referenceEdition=structuredClone(first)
 delete proof.reviewedContinuousTranslationParts
 const source=(row,url)=>({llmReviewed:true,sourceKind:'publisher',sourceUrl:url,isbn:row.isbn,currentEditionTitle:row.title,
  actualEditionTitle:'Publisher actual volume-specific edition title',editionCreator:row.creator,seriesTitle:'Continuous novel',publisher:'Series publisher',bodyLanguage:'en',
  bodyEvidence:'The publisher describes the actual English publication and its volume-specific story, without identifying any translator.',
  scopeEvidence:'Exact ISBN and series responsibility tie this publication to its stated original-volume position.'})
 proof.reviewedUnknownCreditContinuousParts={method:'independent_unknown_credit_continuous_parts_review',llmReviewed:true,currentWork:structuredClone(data.contents[0]),
  firstEdition:structuredClone(first),laterEdition:structuredClone(later),workIdentity:data.contents[0].metadata.figureBook.workIdentity,
  seriesTitle:data.contents[0].metadata.figureBook.series.title,seriesCreator:first.creator,publisherSeriesTitle:'Continuous novel',publisher:'Series publisher',
  translatorIdentityClaimed:false,originalLanguageClaimed:false,equivalentBodyClaimed:false,
  firstSourceReview:{...source(first,proof.referenceSourceUrl),includedOriginalVolumes:[1,2,3]},
  laterSourceReview:{...source(later,proof.sourceUrl),originalVolumeNumber:26},
  wrongStartingSelectionEvidence:'The current later ISBN is mislabeled as the first volume; the publisher identifies it as volume twenty-six.'}
 return {data,removal}
}
test('unknown-credit opening and later parts preserve unknown credits and remove only the misselected later publication',()=>{
 const {data,removal}=unknownCreditOpeningPartsSnapshot(),plan=planGuardedCatalogRepairs(['work'],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[data.figure_book_editions[1]])
 assert.equal(plan.expected.contents[0].metadata.figureBook.originalLanguage,undefined)
 assert.equal(plan.expected.figure_book_editions[0].sources.translators,undefined)
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
})
test('unknown-credit parts reject stale rows, guessed credits, foreign bodies, other works, unbound ISBNs and incomplete publisher evidence',()=>{
 for(const mutate of [
  p=>{p.llmReviewed=false},p=>{p.currentWork.metadata.figureBook.workIdentity='other'},p=>{p.firstEdition.text_scope='volume/1'},
  p=>{p.laterEdition.publisher='Other publisher'},p=>{p.workIdentity='other'},p=>{p.seriesCreator='Other author'},
  p=>{p.seriesTitle='Other series'},p=>{p.translatorIdentityClaimed=true},p=>{p.originalLanguageClaimed=true},p=>{p.equivalentBodyClaimed=true},
  p=>{p.firstSourceReview.isbn='9780140449136'},p=>{p.laterSourceReview.bodyLanguage='fr'},p=>{p.firstSourceReview.sourceKind='api'},
  p=>{p.laterSourceReview.editionCreator='Other author'},p=>{p.laterSourceReview.publisher='Other publisher'},p=>{p.firstSourceReview.seriesTitle='Other series'},
  p=>{p.firstSourceReview.includedOriginalVolumes=[1,2]},p=>{p.laterSourceReview.originalVolumeNumber=1},p=>{p.laterSourceReview.sourceUrl=null},
  p=>{p.laterSourceReview.bodyEvidence='Title only'},p=>{p.wrongStartingSelectionEvidence='Uncertain'},p=>{p.firstSourceReview.actualEditionTitle=''}]){
  const {data,removal}=unknownCreditOpeningPartsSnapshot();mutate(removal.reviewedNonstartEditionRemoval.reviewedUnknownCreditContinuousParts)
  assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]),/Unknown-credit/)
 }
 for(const mutate of [
  (d,r)=>{d.figure_book_editions[0].sources.translators=['Known translator'];r.reviewedNonstartEditionRemoval.reviewedUnknownCreditContinuousParts.laterEdition=structuredClone(d.figure_book_editions[0])},
  (d,r)=>delete r.reviewedNonstartEditionRemoval.referenceOpeningOmnibusReview,
  (d,r)=>{r.reviewedNonstartEditionRemoval.referenceAfterPatch=true},
  d=>d.figure_book_products.push({id:'sale',edition_id:d.figure_book_editions[0].id})]){
  const {data,removal}=unknownCreditOpeningPartsSnapshot();mutate(data,removal);assert.throws(()=>planGuardedCatalogRepairs(['work'],data,[removal]))
 }
})
test('unknown-credit parts retain eighteen-table CAS and reject protected actual readback drift',async()=>{
 for(const drift of ['none','member','source']){
  const {data,removal}=unknownCreditOpeningPartsSnapshot(),after=structuredClone(planGuardedCatalogRepairs(['work'],data,[removal]).expected)
  if(drift==='member')after.member_contents[0].review='Changed member review'
  if(drift==='source')after.figure_book_editions[0].sources.description='https://publisher.example/other'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,['work'],[removal],{capture:async()=>structuredClone(captures++?after:data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

const existingShortEditorialResearch=()=>{
 const {data,changes,contentId}=editorialReplacement(),reference=data.figure_book_editions[1]
 const description='The prince returns to Russia after years of treatment. His kindness draws him into a troubled circle of love, jealousy and money, where compassion cannot prevent tragedy.'
 for(const row of data.figure_book_editions)row.locale='en'
 reference.description=description
 reference.sources={...reference.sources,description_method:'research',description_source_locale:'en'}
 const card=data.content_locales[0]
 Object.assign(card,Object.fromEntries(['title','creator','isbn','publisher','thumbnail_url','description','sources'].map(key=>[key,structuredClone(reference[key])])),{locale:'en'})
 const removal=changes[0],selection=removal.reviewedSelectionExclusion,proof=selection.replacementIntroduction
 selection.locale='en';proof.discardedEdition=structuredClone(removal.before);proof.referenceEdition=structuredClone(reference);proof.referenceDescription=description
 const cardCorrection={...changes[2].reviewedIntroductionCorrection,locale:'en'}
 return {data,removal,reference,card,contentId,cardCorrection}
}

test('editorial selection preserves an unchanged short existing research introduction without applying new-writing length',()=>{
 const {data,removal,reference,contentId}=existingShortEditorialResearch()
 assert.ok(reference.description.replace(/\s/g,'').length<350)
 const plan=planGuardedCatalogRepairs([contentId],data,[removal])
 assert.deepEqual(plan.expected.figure_book_editions,[reference])
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='figure_book_editions'))assert.deepEqual(plan.expected[table],data[table],table)
})

test('short research preservation refuses changed description/source/method/locale, unreviewed originals and product history',()=>{
 for(const mutate of [
  f=>{f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceDescription+=' Changed'},
  f=>{f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceEdition.isbn='9780140449136'},
  f=>{f.removal.reviewedSelectionExclusion.replacementIntroduction.workIdentity='another-original'},
  f=>{f.removal.reviewedSelectionExclusion.replacementIntroduction.llmReviewed=false},
  f=>{f.card.sources.description=null},
  f=>{f.reference.sources.description_source_locale='ko';f.card.sources.description_source_locale='ko';f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceEdition=structuredClone(f.reference)},
  f=>{f.reference.description='<p>'+f.reference.description+'</p>';f.card.description=f.reference.description;f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceDescription=f.reference.description;f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceEdition=structuredClone(f.reference)},
  f=>{f.data.figure_book_products.push({id:'history',edition_id:f.removal.before.id,is_active:false})}
 ]){const f=existingShortEditorialResearch();mutate(f);assert.throws(()=>planGuardedCatalogRepairs([f.contentId],f.data,[f.removal]))}
 {const f=existingShortEditorialResearch();f.reference.sources.description_method='provider';f.card.sources.description_method='provider'
  f.removal.reviewedSelectionExclusion.replacementIntroduction.referenceEdition=structuredClone(f.reference)
  const sources={...f.reference.sources,description_method:'research'}
  assert.throws(()=>planGuardedCatalogRepairs([f.contentId],f.data,[f.removal,
   {table:'figure_book_editions',before:f.reference,patch:{sources}},
   {table:'content_locales',before:f.card,patch:{sources},reviewedIntroductionCorrection:f.cardCorrection}]),/Invalid research introduction/)}
 {const f=existingShortEditorialResearch();const sources={...f.reference.sources,description:'https://publisher.example/new-source'}
  assert.throws(()=>planGuardedCatalogRepairs([f.contentId],f.data,[f.removal,{table:'figure_book_editions',before:f.reference,patch:{sources}}]),/Editorial introduction replacement/)}
}
)

function isbnlessOriginalProviderSelection(){
 const data=Object.fromEntries(SNAPSHOT_TABLES.map(table=>[table,[]])),providerUrl='https://search.daum.net/search?w=bookpage&bookId=19899&q=book',sourceUrl='https://kupress.com/books/3202/'
 const original={id:'discard',type:'BOOK',metadata:{figureBook:{workTitle:'정약용(사상총서 1)',workCreator:'윤사순',workIdentity:'book/legacy'}}}
 const normal={id:'normal',type:'BOOK',metadata:{figureBook:{workTitle:'정약용',workCreator:'윤사순',originalLanguage:'ko',identityEvidence:sourceUrl}}}
 data.contents=[original,normal]
 const before={id:54718,content_id:'discard',locale:'ko',isbn:null,title:'정약용(사상총서 1)',creator:'윤사순',publisher:'고려대학교출판부',thumbnail_url:'https://image.example/19899',
  description:'윤사순이 정약용의 생애와 사상을 살피는 한국어 연구 입문서다. 사상총서 첫 권으로 다산의 철학을 여러 분야에서 설명한다.',edition_kind:null,text_scope:null,verified:true,
  sources:{primary:'kakao_book',provider_product_id:'19899',provider_edition_url:providerUrl,description:'https://www.yes24.com/product/goods/173057',description_method:'research',description_source_locale:'ko',translators:[]}}
 const reference={...structuredClone(before),id:54530,content_id:'normal',isbn:'9788976412454',edition_kind:'full',text_scope:'complete',
  description:'정약용의 생애와 사상을 여러 분야에서 살피는 연구 입문서다. 윤사순을 비롯한 연구자들의 글을 개관과 문학, 철학, 사회, 과학, 예술로 묶고 연보로 마무리한다.',
  sources:{...before.sources,isbn:sourceUrl,provider_edition_isbn:'9788976412454',description:sourceUrl}}
 const card=row=>Object.fromEntries(Object.entries(structuredClone(row)).filter(([key])=>!['id','edition_kind','text_scope'].includes(key)))
 const oldCard=card(before),normalCard=card(reference);normalCard.verified=null
 data.figure_book_editions=[before,reference];data.content_locales=[oldCard,normalCard]
 data.celeb_contents=[{id:'reading',content_id:'discard',review:'Keep existing testimony.',source_url:'https://interview.example/book'}]
 data.member_contents=[{id:'member',content_id:'normal',review:'Keep existing member reading.'}]
 data.curated_list_items=[{id:1,content_id:'discard',sort_order:7}]
 const anchor=row=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,row.metadata.figureBook[key]??null]))
 const proof={method:'independent_isbnless_original_provider_product_review',reason:'same_provider_product',llmReviewed:true,contentId:'discard',
  originalWork:structuredClone(original),referenceWork:structuredClone(normal),workAnchor:anchor(original),referenceWorkAnchor:anchor(normal),
  discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),previousLocaleCard:structuredClone(oldCard),referenceLocaleCard:structuredClone(normalCard),
  explanation:'Both live rows point to the same Daum product. Select the independently identified original ISBN and preserve the exact normal introduction, without asserting identical body scope.',
  sourceReview:{llmReviewed:true,sourceKind:'publisher',sourceUrl,isbn:reference.isbn,editionTitle:reference.title,editionCreator:reference.creator,publisher:reference.publisher,
   providerProductId:'19899',providerUrl,bodyLanguage:'ko',sameProviderProductConfirmed:true,physicalIdentityConfirmed:true,
   bodyEquivalenceClaimed:false,translatorIdentityClaimed:false,scopeClaimed:false,description:reference.description,
   bodyEvidence:'The publisher describes a Korean introduction to Dasan, with seventeen studies in six subjects and a chronology.',
   physicalIdentityEvidence:'The publisher lists ISBN 89-7641-245-1, Yoon Sa-soon, the thought series first volume and the same university press.'},
  discardedSourceReview:{llmReviewed:true,sourceUrl:before.sources.description,isbn:null,editionTitle:before.title,editionCreator:before.creator,publisher:before.publisher,bodyLanguage:'ko',providerProductId:'19899',providerUrl,
   bodyEvidence:'The actual bookstore source describes this Korean research introduction on Dasan and identifies the thought series first volume.',
   physicalIdentityEvidence:'The source lists the same university press and Yoon Sa-soon, while the exact live row shares Daum product 19899 with the normal ISBN row.'}}
 return {data,proof,before,reference,oldCard,normalCard,assigned:['discard','normal'],changes:[
  {table:'figure_book_editions',before,remove:true,reviewedIsbnlessEditionRemoval:proof},
  {table:'content_locales',before:oldCard,patch:{sources:{...oldCard.sources,primary:'none'}}}]}
}

test('ISBN-less same Daum original product selects the current real ISBN without changing either valid introduction or inventing scope',()=>{
 const {data,changes,assigned,reference,oldCard}=isbnlessOriginalProviderSelection(),plan=planGuardedCatalogRepairs(assigned,data,changes)
 assert.deepEqual(plan.expected.figure_book_editions,[reference])
 assert.deepEqual(plan.expected.content_locales[0],{...oldCard,sources:{...oldCard.sources,primary:'none'}})
 assert.deepEqual(plan.expected.content_locales[1],data.content_locales[1])
 for(const table of SNAPSHOT_TABLES.filter(t=>!['figure_book_editions','content_locales'].includes(t)))assert.deepEqual(plan.expected[table],data[table],table)
 const sql=buildGuardedCatalogRepairSql(assigned,data,changes)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('same_provider_product'))
})

test('same-provider original selection refuses stale rows, other products/authors/publishers, unknown language or scope claims and product history',()=>{
 for(const mutate of [
  f=>f.proof.llmReviewed=false,f=>f.proof.referenceWork.metadata.figureBook.workCreator='Other writer',
  f=>f.proof.workAnchor.workIdentity='other',f=>f.proof.referenceEdition.isbn='9780140449136',
  f=>f.proof.referenceLocaleCard.description+=' changed',f=>f.proof.discardedEdition.publisher='Other publisher',
  f=>f.proof.sourceReview.sourceKind='api',f=>f.proof.sourceReview.sourceUrl=null,f=>f.proof.sourceReview.sourceUrl='https://unread.example/book',
  f=>f.proof.sourceReview.isbn=null,f=>f.proof.sourceReview.editionCreator='Other writer',f=>f.proof.sourceReview.publisher='Other publisher',
  f=>f.proof.sourceReview.providerProductId='19898',f=>f.proof.sourceReview.providerUrl='https://search.daum.net/search?w=bookpage&bookId=999',
  f=>f.proof.sourceReview.bodyLanguage='en',f=>f.proof.discardedSourceReview.bodyLanguage='en',f=>f.proof.discardedSourceReview.sourceUrl=null,f=>f.proof.sourceReview.sameProviderProductConfirmed=false,
  f=>f.proof.sourceReview.physicalIdentityConfirmed=false,f=>f.proof.sourceReview.bodyEquivalenceClaimed=true,f=>f.proof.sourceReview.translatorIdentityClaimed=true,
  f=>f.proof.sourceReview.scopeClaimed=true,f=>f.proof.sourceReview.bodyEvidence='',f=>f.proof.sourceReview.physicalIdentityEvidence='',
  f=>f.proof.sourceReview.description+=' changed',f=>f.changes[1].patch.sources.description='https://unread.example/book',
  f=>f.changes[1].patch.publisher=null,f=>f.changes.pop(),
  f=>f.data.figure_book_products.push({id:'old-sale',edition_id:54718,is_active:false}),
  f=>f.data.figure_book_products.push({id:'normal-sale',edition_id:54530,is_active:false}),
  f=>f.data.member_contents.push({id:'direct-edition',content_id:'discard',edition_id:54718})
 ]){const f=isbnlessOriginalProviderSelection();mutate(f);assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes))}
 {const f=isbnlessOriginalProviderSelection();f.reference.sources.translators=['A translator'];f.proof.referenceEdition=structuredClone(f.reference)
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/ISBN-less original provider/)}
 {const f=isbnlessOriginalProviderSelection();f.reference.sources.provider_product_id='19898';f.proof.referenceEdition=structuredClone(f.reference)
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/ISBN-less original provider/)}
}
)

test('same-provider original removal preserves eighteen-table CAS and rejects protected reading or retained normal drift',async()=>{
 for(const drift of ['none','normal','source','member']){
  const f=isbnlessOriginalProviderSelection(),after=structuredClone(planGuardedCatalogRepairs(f.assigned,f.data,f.changes).expected)
  if(drift==='normal')after.figure_book_editions[0].text_scope=null
  if(drift==='source')after.content_locales[1].sources.description='https://unread.example/book'
  if(drift==='member')after.member_contents[0].review='Changed member review'
  let captures=0
  const run=()=>guardedCatalogRepairs(null,f.assigned,f.changes,{capture:async()=>structuredClone(captures++?after:f.data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

test('same-provider physical selection does not require or synthesize an original-language assertion',()=>{
 const f=isbnlessOriginalProviderSelection();delete f.data.contents[1].metadata.figureBook.originalLanguage
 f.proof.referenceWork=structuredClone(f.data.contents[1])
 const plan=planGuardedCatalogRepairs(f.assigned,f.data,f.changes)
 assert.deepEqual(plan.expected.contents,f.data.contents)
 for(const unsupported of [{originalLanguage:'ko'},{originalWorkConfirmed:true},{completeTranslationConfirmed:true}]){
  const g=isbnlessOriginalProviderSelection();Object.assign(g.proof.sourceReview,unsupported)
  assert.throws(()=>planGuardedCatalogRepairs(g.assigned,g.data,g.changes),/ISBN-less original provider/)
 }
})

test('same-provider selection requires both existing works in the explicit assigned scope',()=>{
 const f=isbnlessOriginalProviderSelection()
 assert.throws(()=>planGuardedCatalogRepairs(['discard'],f.data,f.changes),/ISBN-less original provider/)
})

function unknownCreditCatalogSelection(){
 const f=catalogRepresentativeSelection(),reference=f.data.figure_book_editions[1],card=f.data.content_locales[1]
 delete reference.sources.translators;delete card.sources.translators
 reference.description='This illustrated book follows the artist’s career and describes the paintings in their historical setting. It includes the author’s account and a selection of images.'
 card.description=reference.description
 f.proof.referenceEdition=structuredClone(reference);f.proof.referenceLocaleCard=structuredClone(card)
 f.proof.referenceSourceReview.creditedTranslators=null
 for(const review of [f.proof.referenceSourceReview,f.proof.discardedSourceReview]){
  review.bodyLanguage='en';review.creditStatus='unconfirmed';review.sourceKind='publisher'
  review.creditEvidence='The exact independent ISBN source identifies the author and this English publication, but does not establish the translator’s name.'
 }
 const anchor=w=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,w.metadata.figureBook[key]??null]))
 f.proof.reviewedUnknownCreditRepresentative={method:'independent_unknown_credit_representative_review',llmReviewed:true,sameOriginalConfirmed:true,
  creditStatus:'unconfirmed',originalLanguageClaimed:false,translatorIdentityClaimed:false,scopeClaimed:false,identicalBody:false,
  discardedWorkAnchor:anchor(f.data.contents[0]),referenceWorkAnchor:anchor(f.data.contents[1]),
  originalIdentityEvidence:'The actual independent descriptions for both ISBNs identify the same author’s existing illustrated book, rather than another author’s criticism or a later independent work.',
  reason:'Select the currently verified representative and preserve its exact valid introduction; neither translator nor identical translation or complete scope is inferred.'}
 f.changes[1].patch=Object.fromEntries(['title','creator','description','isbn','publisher','thumbnail_url','sources','affiliate_url','verified'].map(key=>[key,structuredClone(card[key]??null)]))
 return f
}

test('unknown-credit representative selection is an explicit same-original review and preserves the current normal fields and eighteen protected tables',()=>{
 const f=unknownCreditCatalogSelection(),plan=planGuardedCatalogRepairs(f.assigned,f.data,f.changes)
 assert.deepEqual(plan.expected.figure_book_editions,[f.data.figure_book_editions[1]])
 assert.deepEqual(plan.expected.content_locales[1],f.data.content_locales[1])
 assert.deepEqual(plan.expected.contents,f.data.contents)
 for(const table of SNAPSHOT_TABLES.filter(t=>!['content_locales','figure_book_editions'].includes(t)))assert.deepEqual(plan.expected[table],f.data[table],table)
 const sql=buildGuardedCatalogRepairSql(f.assigned,f.data,f.changes)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
})

test('unknown-credit default remains closed and optional review rejects invented credits, languages, identical bodies and scope claims',()=>{
 for(const mutate of [
  f=>delete f.proof.reviewedUnknownCreditRepresentative,f=>f.proof.reviewedUnknownCreditRepresentative.llmReviewed=false,
  f=>f.proof.reviewedUnknownCreditRepresentative.sameOriginalConfirmed=false,f=>f.proof.reviewedUnknownCreditRepresentative.originalIdentityEvidence='',
  f=>f.proof.reviewedUnknownCreditRepresentative.originalLanguageClaimed=true,f=>f.proof.reviewedUnknownCreditRepresentative.translatorIdentityClaimed=true,
  f=>f.proof.reviewedUnknownCreditRepresentative.scopeClaimed=true,f=>f.proof.reviewedUnknownCreditRepresentative.identicalBody=true,
  f=>f.proof.reviewedUnknownCreditRepresentative.discardedWorkAnchor.originalCreator='Other writer',
  f=>f.proof.referenceSourceReview.bodyLanguage='fr',f=>f.proof.referenceSourceReview.creditStatus='known',
  f=>f.proof.referenceSourceReview.originalLanguage='en',f=>f.proof.referenceSourceReview.completeTranslationConfirmed=true,
  f=>f.proof.referenceSourceReview.sourceKind='api',f=>f.proof.referenceSourceReview.sourceUrl=null,
  f=>f.proof.referenceSourceReview.bodyEvidence='',f=>f.proof.discardedSourceReview.sourceUrl=f.proof.referenceSourceReview.sourceUrl,
  f=>f.proof.referenceEdition.text_scope='complete',f=>f.proof.referenceLocaleCard.sources.description='https://unread.example/changed',
  f=>f.data.figure_book_products.push({id:'old-sale',edition_id:f.data.figure_book_editions[0].id,is_active:false}),
  f=>f.data.figure_book_products.push({id:'normal-sale',edition_id:f.data.figure_book_editions[1].id,is_active:false}),
  f=>f.data.member_contents.push({id:'direct-member',edition_id:f.data.figure_book_editions[1].id,content_id:'normal'})
 ]){const f=unknownCreditCatalogSelection();mutate(f);assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative|product history/)}
 for(const key of ['translators','translator']){
  const f=unknownCreditCatalogSelection(),reference=f.data.figure_book_editions[1];reference.sources[key]=key==='translators'?['A translator']:'A translator'
  f.proof.referenceEdition=structuredClone(reference)
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)
 }
 {const f=unknownCreditCatalogSelection(),reference=f.data.figure_book_editions[1],card=f.data.content_locales[1]
  reference.description='<p>'+reference.description+'</p>';card.description=reference.description
  f.proof.referenceEdition=structuredClone(reference);f.proof.referenceLocaleCard=structuredClone(card);f.changes[1].patch.description=reference.description
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)}
 {const f=catalogRepresentativeSelection();f.proof.reviewedUnknownCreditRepresentative=unknownCreditCatalogSelection().proof.reviewedUnknownCreditRepresentative
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)}
})

test('unknown-credit representative actual readback refuses normal-source, scope and member-reading drift',async()=>{
 for(const drift of ['none','source','scope','reading']){
  const f=unknownCreditCatalogSelection(),after=structuredClone(planGuardedCatalogRepairs(f.assigned,f.data,f.changes).expected)
  if(drift==='source')after.figure_book_editions[0].sources.description='https://unread.example/book'
  if(drift==='scope')after.figure_book_editions[0].text_scope='complete'
  if(drift==='reading')after.member_contents.push({id:'unexpected',content_id:'normal',review:'Changed member reading.'})
  let reads=0
  const run=()=>guardedCatalogRepairs(null,f.assigned,f.changes,{capture:async()=>structuredClone(reads++?after:f.data),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

function koreanUnknownCreditCatalogSelection(){
 const f=unknownCreditCatalogSelection(),before=f.data.figure_book_editions[0],reference=f.data.figure_book_editions[1]
 for(const work of f.data.contents)work.metadata.figureBook={workTitle:'유종원 산문집',workCreator:'유종원',workIdentity:'liu-zongyuan/prose-editor-project'}
 for(const row of [before,reference]){row.locale='ko';row.title='유종원 산문집';row.creator='오수형 편저';row.sources.editors=['오수형'];row.sources.description_source_locale='ko'
  row.description='유종원의 산문을 오수형이 엮어 한국어로 소개하는 책이다. 원문 작품과 편저자의 설명을 함께 읽도록 구성했으며, 현재 편저자의 역할과 기존 판본의 수록 범위를 그대로 보존한다.'}
 const fields=['content_id','locale','title','creator','isbn','publisher','thumbnail_url','verified','description','sources']
 for(const [i,row] of [before,reference].entries())Object.assign(f.data.content_locales[i],Object.fromEntries(fields.map(k=>[k,structuredClone(row[k])])) )
 const proof=f.proof,figure=f.data.contents[0].metadata.figureBook
 Object.assign(proof,figure,{discardedWork:structuredClone(f.data.contents[0]),referenceWork:structuredClone(f.data.contents[1]),discardedEdition:structuredClone(before),referenceEdition:structuredClone(reference),discardedLocaleCard:structuredClone(f.data.content_locales[0]),referenceLocaleCard:structuredClone(f.data.content_locales[1])})
 const anchor=w=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(k=>[k,w.metadata.figureBook[k]??null]))
 proof.reviewedUnknownCreditRepresentative.discardedWorkAnchor=anchor(f.data.contents[0]);proof.reviewedUnknownCreditRepresentative.referenceWorkAnchor=anchor(f.data.contents[1])
 for(const [i,review] of [proof.discardedSourceReview,proof.referenceSourceReview].entries())Object.assign(review,figure,{locale:'ko',bodyLanguage:'ko',editionTitle:'유종원 산문집',editionCreator:'오수형 편저',creditedTranslators:null})
 f.changes[0].reviewedSelectionExclusion.locale='ko';f.changes[0].reviewedSelectionExclusion.edition_title=before.title
 f.changes[1].patch=Object.fromEntries(['title','creator','description','isbn','publisher','thumbnail_url','sources','affiliate_url','verified'].map(k=>[k,structuredClone(f.data.content_locales[1][k]??null)]))
 Object.assign(f.changes[1].reviewedIntroductionCorrection,{locale:'ko',editionTitle:reference.title})
 return f
}

test('unknown-credit Korean representative preserves the same edited project and actual editor role without inventing translators or original language',()=>{
 const f=koreanUnknownCreditCatalogSelection(),plan=planGuardedCatalogRepairs(f.assigned,f.data,f.changes)
 assert.deepEqual(plan.expected.figure_book_editions,[f.data.figure_book_editions[1]])
 assert.deepEqual(plan.expected.figure_book_editions[0].sources.editors,['오수형'])
 assert.equal(plan.expected.contents[0].metadata.figureBook.originalLanguage,undefined)
 assert.deepEqual(plan.expected.content_locales[1],f.data.content_locales[1])
})

test('unknown-credit Korean selection rejects an unsupported locale, mismatched source language, forged translator and changed normal fields',()=>{
 for(const mutate of [
  f=>f.proof.referenceSourceReview.bodyLanguage='en',f=>f.proof.discardedSourceReview.bodyLanguage='zh',
  f=>f.proof.referenceSourceReview.creditedTranslators=['오수형'],f=>f.proof.reviewedUnknownCreditRepresentative.translatorIdentityClaimed=true,
  f=>f.proof.referenceLocaleCard.sources.editors=['Other editor'],f=>f.proof.referenceEdition.text_scope='complete'
 ]){const f=koreanUnknownCreditCatalogSelection();mutate(f);assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)}
 {const f=koreanUnknownCreditCatalogSelection();f.data.figure_book_editions[0].locale='fr';f.proof.discardedEdition.locale='fr';f.changes[0].reviewedSelectionExclusion.locale='fr'
  assert.throws(()=>planGuardedCatalogRepairs(f.assigned,f.data,f.changes),/Catalog representative/)}
})
