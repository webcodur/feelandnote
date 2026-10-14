import test from 'node:test'
import assert from 'node:assert/strict'
import {SNAPSHOT_TABLES} from './merge-work-sql.mjs'
import {planReviewedLocaleInsert,buildReviewedLocaleInsertSql,verifyReviewedLocaleInsertReadback,applyReviewedLocaleInsert,
 planReviewedLocaleRelocation,buildReviewedLocaleRelocationSql,verifyReviewedLocaleRelocationReadback,applyReviewedLocaleRelocation} from './guarded-locale-inserts.mjs'
const id='existing-book',ts='2026-10-12T04:00:00+00:00'
function fixture(){
 const before=Object.fromEntries(SNAPSHOT_TABLES.map(t=>[t,[]]))
 before.contents=[{id,type:'BOOK',metadata:{figureBook:{workTitle:'Original work',workCreator:'Original author'}}}]
 before.content_locales=[{content_id:id,locale:'ko',isbn:null,title:'Existing display',creator:'Author',description:'Existing human introduction.',sources:{primary:'none',title:'display_only'}}]
 before.celeb_contents=[{id:1,content_id:id,celeb_id:'person',review:'Keep every original word.',review_en:'Keep English.',source_url:'https://example.org/reading',visibility:'public',rating:5}]
 before.member_contents=[{id:2,content_id:id,member_id:'member',rating:4,status:'completed'}]
 before.flows=[{id:3,tiers:{shelf:[id,'other']}}]
 const review={contentId:id,locale:'en',textLanguage:'en',isbn:'9780451464163',title:'Actual title',creator:'Actual author',publisher:'Actual publisher',thumbnailUrl:null,translators:[],workTitle:'Original work',workCreator:'Original author',metadataSourceUrl:'https://openlibrary.org/books/OL1234M',sourceUrl:'https://publisher.example/exact-isbn',reason:'Exact ISBN, English original, whole original and actual author independently reviewed.',editionKind:'full',textScope:'complete'}
 return {before,review}
}
function committed(before,review){const plan=planReviewedLocaleInsert([id],before,[review]),after=structuredClone(before);after.content_locales.push({...plan.newLocales[0],created_at:ts,updated_at:ts});return after}
function displayFixture(){
 const {before,review:physical}=fixture();before.content_locales=[]
 const ref={id:20,content_id:id,locale:'en',isbn:physical.isbn,title:physical.title,creator:physical.creator,edition_kind:'full',text_scope:'complete',sources:{primary:'openlibrary'}}
 const card={content_id:id,locale:'en',isbn:ref.isbn,title:ref.title,creator:ref.creator,sources:{primary:'openlibrary'},description:'Existing independently verified introduction.'}
 before.figure_book_editions=[ref];before.content_locales=[card]
 const review={method:'independent_existing_display_locale_review',llmReviewed:true,contentId:id,locale:'ko',textLanguage:'ko',title:'한국어 표시 제목',creator:'원저자',workTitle:physical.workTitle,workCreator:physical.workCreator,workAnchor:{workTitle:physical.workTitle,workCreator:physical.workCreator,workIdentity:null,originalTitle:null,originalCreator:null},isbn:null,publisher:null,thumbnailUrl:null,description:null,sourceUrl:physical.sourceUrl,reason:'Actual original and English registered edition reviewed; translated display asserts no Korean publication.',referenceEdition:structuredClone(ref),referenceLocaleCard:structuredClone(card),sourceReview:{llmReviewed:true,workTitle:physical.workTitle,workCreator:physical.workCreator,isbn:ref.isbn,editionTitle:ref.title,editionCreator:ref.creator,locale:'en',sourceUrl:physical.sourceUrl,bodyEvidence:'Independent publisher text identifies this exact original and its actual English ISBN.',scopeEvidence:'Actual publisher contents and body correspond to the registered complete original.'}}
 return {before,review}
}
test('missing translated display has no invented physical edition and preserves all18',()=>{
 const {before,review}=displayFixture(),original=structuredClone(before),row=planReviewedLocaleInsert([id],before,[review]).newLocales[0]
 assert.deepEqual(row,{content_id:id,locale:'ko',title:review.title,creator:review.creator,isbn:null,publisher:null,thumbnail_url:null,description:null,affiliate_url:null,verified:false,sources:{primary:'none',title:'translated'}})
 assert.equal(verifyReviewedLocaleInsertReadback([id],before,[review],committed(before,review)).checkedTables,18);assert.deepEqual(before,original)
 const sql=buildReviewedLocaleInsertSql([id],before,[review]);assert.doesNotMatch(sql,/IN \(\)|INSERT INTO public.figure_book_editions/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('LOCALE_INSERT: rowset mismatch '+table))
})
test('display rejects publication claims, stale original/card/edition, excluded text and absent actual body',()=>{
 const {before,review}=displayFixture()
 for(const patch of [{llmReviewed:false},{workAnchor:{...review.workAnchor,workIdentity:'other'}},{isbn:'9780451464163'},{publisher:'Invented Korean publisher'},{thumbnailUrl:'https://example.org/cover.jpg'},{description:'Invented new prose'},{editionKind:'full'},{textScope:'complete'},{translators:['Unknown']},{referenceEdition:{...review.referenceEdition,title:'Other edition'}},{referenceLocaleCard:{...review.referenceLocaleCard,description:'Stale introduction'}},{sourceReview:{...review.sourceReview,llmReviewed:false}},{sourceReview:{...review.sourceReview,bodyEvidence:'not read'}},{sourceReview:{...review.sourceReview,isbn:'9780140444124'}},{sourceUrl:'https://localhost/book'},{sourceUrl:'https://openlibrary.org/books/OL1234M'}])assert.throws(()=>planReviewedLocaleInsert([id],before,[{...review,...patch}]))
 const bad=structuredClone(before);bad.figure_book_editions[0].edition_kind='abridged';const excluded={...review,referenceEdition:bad.figure_book_editions[0]};assert.throws(()=>planReviewedLocaleInsert([id],bad,[excluded]),/normal reference/)
 assert.throws(()=>planReviewedLocaleInsert([id],before,[review,review]),/duplicate review/)
 const existing=committed(before,review);assert.throws(()=>planReviewedLocaleInsert([id],existing,[review]),/locale exists/)
})
test('display readback catches automatic edition creation and all preserved record changes',()=>{
 const {before,review}=displayFixture(),after=committed(before,review)
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='content_locales')){const bad=structuredClone(after);bad[table].push({unexpected:true});assert.throws(()=>verifyReviewedLocaleInsertReadback([id],before,[review],bad),new RegExp(table))}
})
test('mixed physical and display insertion guards only real normalized ISBN ownership',()=>{
 const a=fixture(),b=displayFixture(),other='display-book'
 b.before.contents[0].id=other;b.before.content_locales[0].content_id=other;b.before.figure_book_editions[0].content_id=other;b.before.figure_book_editions[0].isbn='9780140444124';b.before.content_locales[0].isbn='9780140444124'
 b.review.contentId=other;b.review.referenceEdition=structuredClone(b.before.figure_book_editions[0]);b.review.referenceLocaleCard=structuredClone(b.before.content_locales[0]);b.review.sourceReview.isbn='9780140444124'
 const before=Object.fromEntries(SNAPSHOT_TABLES.map(t=>[t,[...a.before[t],...b.before[t]]])),sql=buildReviewedLocaleInsertSql([id,other],before,[a.review,b.review])
 assert.match(sql,/IN \(E'9780451464163',E'0451464168'\)/);assert.doesNotMatch(sql,/IN \(\)/)
})
test('adds only a missing official locale to an existing reviewed original, preserving all reading data',()=>{
 const {before,review}=fixture(),original=structuredClone(before),after=committed(before,review)
 assert.equal(planReviewedLocaleInsert([id],before,[review]).newLocales[0].description,null)
 assert.deepEqual(before,original)
 assert.equal(verifyReviewedLocaleInsertReadback([id],before,[review],after).checkedTables,18)
 assert.deepEqual(after.celeb_contents,before.celeb_contents);assert.deepEqual(after.member_contents,before.member_contents)
})
test('rejects existing display cards instead of silently replacing them',()=>{
 const {before,review}=fixture();review.locale='ko';review.textLanguage='ko';review.metadataSourceUrl='https://search.daum.net/search?w=bookpage&bookId=123'
 assert.throws(()=>planReviewedLocaleInsert([id],before,[review]),/locale exists/)
})
test('requires matching original, actual text language, official provider and independent source',()=>{
 const {before,review}=fixture()
 for(const patch of [{workTitle:'Other work'},{workCreator:'Other author'},{textLanguage:'ko'},{metadataSourceUrl:'https://books.google.com/book/1'},{metadataSourceUrl:'https://openlibrary.org/works/OL1234W'},{sourceUrl:'https://openlibrary.org/books/OL1234M'},{isbn:'2004051001083'},{editionKind:'abridged'},{editionKind:'invented'},{textScope:'Volume 2 of 3'}])assert.throws(()=>planReviewedLocaleInsert([id],before,[{...review,...patch}]))
})
test('does not turn an unreviewed existing foreign-language card into a second language',()=>{
 const {before,review}=fixture();before.content_locales[0].isbn=review.isbn
 assert.throws(()=>planReviewedLocaleInsert([id],before,[review]),/independently rejected/)
 before.content_locales[0].sources.edition_selection_evidence=[{method:'independent_selection_review',reason:'wrong_locale',content_id:id,isbn:review.isbn,locale:'ko',edition_title:before.content_locales[0].title,source_url:'https://publisher.example/exact',explanation:'Exact publisher page confirms the actual text is English, not a Korean translation.'}]
 assert.equal(planReviewedLocaleInsert([id],before,[review]).newLocales.length,1)
})
test('rejects ISBNs assigned to another original within the full snapshot',()=>{
 const {before,review}=fixture();before.figure_book_editions.push({id:1,content_id:'another',locale:'en',isbn:review.isbn})
 assert.throws(()=>planReviewedLocaleInsert([id],before,[review]),/another original/)
})
test('full18 verification rejects any side effect, including automatic edition changes and reading edits',()=>{
 const {before,review}=fixture(),after=committed(before,review)
 for(const table of SNAPSHOT_TABLES.filter(t=>t!=='content_locales')){const bad=structuredClone(after);bad[table].push({unexpected:true});assert.throws(()=>verifyReviewedLocaleInsertReadback([id],before,[review],bad),new RegExp(table))}
 const bad=structuredClone(after);bad.content_locales[0].description='Changed human text';assert.throws(()=>verifyReviewedLocaleInsertReadback([id],before,[review],bad),/content_locales/)
})
test('SQL guards current full18, global normalized ISBN10/13 ownership and all other17 before commit',()=>{
 const {before,review}=fixture(),sql=buildReviewedLocaleInsertSql([id],before,[review])
 assert.match(sql,/SERIALIZABLE/);assert.match(sql,/LOCK TABLE public.content_locales,public.figure_book_editions/)
 assert.match(sql,/0451464168/);assert.match(sql,/9780451464163/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('LOCALE_INSERT: rowset mismatch '+table))
 assert.ok(sql.indexOf('rowset mismatch celeb_contents')<sql.indexOf('COMMIT;'))
 assert.doesNotMatch(sql,/UPDATE public|DELETE FROM|ALTER TABLE|DISABLE TRIGGER/)
})
test('apply compares committed expected full18 with a fresh actual snapshot and never retries uncertain outcomes',async()=>{
 const {before,review}=fixture(),after=committed(before,review);let captures=0,executions=0
 const options={capture:async()=>++captures===1?before:after,execute:()=>{executions++;return 'LOCALE_INSERT_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'}}
 const result=await applyReviewedLocaleInsert(null,[id],[review],options)
 assert.equal(result.completed,true);assert.equal(captures,2);assert.equal(executions,1)
 const bad=structuredClone(after);bad.celeb_contents[0].rating=1;captures=0
 await assert.rejects(applyReviewedLocaleInsert(null,[id],[review],{...options,capture:async()=>++captures===1?before:bad}),/actual celeb_contents/)
 captures=0;executions=0
 await assert.rejects(applyReviewedLocaleInsert(null,[id],[review],{capture:async()=>{captures++;return before},execute:()=>{executions++;return 'transport uncertain'}}),/inspect owned IDs/)
 assert.equal(captures,1);assert.equal(executions,1)
})


test('missing OL authors may retain only the exact verified existing original creator with honest independent provenance',()=>{
 const {before,review}=fixture();review.creator=review.workCreator
 review.existingCreatorEvidence={method:'independent_existing_original_creator_review',llmReviewed:true,contentId:id,workTitle:review.workTitle,workCreator:review.workCreator,creator:review.creator,isbn:review.isbn,metadataSourceUrl:review.metadataSourceUrl,providerAuthorsMissing:true,sourceUrl:'https://library.example/exact-isbn',reason:'Exact ISBN edition and live original author independently read and matched; missing provider authors are not fabricated.'}
 const original=structuredClone(before),row=planReviewedLocaleInsert([id],before,[review]).newLocales[0]
 assert.equal(row.sources.primary,'openlibrary');assert.equal(row.sources.isbn,review.metadataSourceUrl)
 assert.equal(row.sources.creator,review.existingCreatorEvidence.sourceUrl);assert.equal(row.creator,review.workCreator)
 assert.deepEqual(before,original);assert.equal(verifyReviewedLocaleInsertReadback([id],before,[review],committed(before,review)).checkedTables,18)
 for(const patch of [{llmReviewed:false},{providerAuthorsMissing:false},{contentId:'different'},{workTitle:'different'},{workCreator:'different'},{creator:'different'},{isbn:'9780140444124'},{metadataSourceUrl:'https://openlibrary.org/books/OL5678M'},{sourceUrl:'https://openlibrary.org/books/OL1234M'},{reason:'missing'}]){
  assert.throws(()=>planReviewedLocaleInsert([id],before,[{...review,existingCreatorEvidence:{...review.existingCreatorEvidence,...patch}}]),/existing original creator/)
 }
 assert.throws(()=>planReviewedLocaleInsert([id],before,[{...review,creator:'Invented new author'}]),/existing original creator/)
})

function relocationFixture(){
 const {before}=fixture(),provider='https://search.daum.net/search?w=bookpage&bookId=123'
 const card={content_id:id,locale:'ko',title:'Existing English title',creator:'Existing author',isbn:'9780451464163',publisher:'Existing publisher',
  thumbnail_url:'https://publisher.example/cover.jpg',affiliate_url:'https://shop.example/existing',verified:true,description:'기존 한국어 소개를 모두 보존한다.',
  sources:{primary:'kakao_book',isbn:provider,title:provider,creator:provider,publisher:provider,thumbnail:provider,
   description:'https://publisher.example/korean-introduction',description_method:'source_summary',description_locale:'ko',description_source_locale:'ko',
   translators:['Existing translator'],edition_work_evidence:[{preserved:true}]},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'}
 const edition={...card,id:20,sort_order:0,edition_kind:'full',text_scope:'complete',release_date:'2020-01-01'};delete edition.affiliate_url
 before.content_locales=[card];before.figure_book_editions=[edition]
 before.figure_book_products=[{id:30,edition_id:20,is_active:true,url:'https://shop.example/product'}]
 before.commerce_events=[{id:40,content_id:id,edition_id:20,action:'view'}]
 const review={method:'independent_existing_locale_relocation_review',llmReviewed:true,contentId:id,fromLocale:'ko',toLocale:'en',isbn:card.isbn,
  beforeWork:structuredClone(before.contents[0]),beforeLocale:structuredClone(card),beforeEdition:structuredClone(edition),
  displayTitle:'한국어 표시 제목',displayCreator:'표시 저자',descriptionLanguage:'ko',sourceUrl:'https://publisher.example/exact-english-isbn',
  reason:'The existing ISBN is an English print edition mistakenly classified as Korean; all current publication metadata is retained.',
  languageReview:{llmReviewed:true,contentId:id,isbn:card.isbn,editionTitle:edition.title,editionCreator:edition.creator,textLanguage:'en',
   sourceUrl:'https://publisher.example/exact-english-isbn',bodyEvidence:'The publisher names this exact ISBN and English language, and the inspected body is English.'}}
 return {before,review}
}
function relocated(before,review){
 const move=planReviewedLocaleRelocation([id],before,[review]).relocations[0],after=structuredClone(before)
 after.content_locales=[{...move.display,updated_at:ts},{...move.actual,created_at:ts,updated_at:ts}]
 after.figure_book_editions=[{...move.actualEdition,updated_at:ts}]
 return after
}
test('existing English relocation keeps exact Kakao provenance and Korean introduction without inventing metadata',()=>{
 const {before,review}=relocationFixture(),original=structuredClone(before),move=planReviewedLocaleRelocation([id],before,[review]).relocations[0]
 assert.equal(move.actual.sources.primary,'kakao_book');assert.equal(move.actual.sources.isbn,before.content_locales[0].sources.isbn)
 assert.equal(move.actual.description,null);assert.equal(move.actual.sources.description,undefined)
 assert.equal(move.actual.sources.description_method,undefined);assert.equal(move.actual.sources.description_locale,undefined)
 assert.equal(move.actual.sources.description_source_locale,undefined);assert.equal(move.actualEdition.sources.description_source_locale,undefined)
 assert.deepEqual(move.actual.sources.edition_work_evidence,before.content_locales[0].sources.edition_work_evidence)
 assert.deepEqual(move.actual.sources.translators,before.content_locales[0].sources.translators)
 assert.equal(move.display.description,before.content_locales[0].description)
 assert.equal(move.display.sources.description,before.content_locales[0].sources.description)
 assert.equal(move.display.sources.description_source_locale,'ko')
 for(const field of ['primary','isbn','title','creator','publisher','thumbnail']){
  assert.equal(move.actual.sources[field],before.content_locales[0].sources[field])
  assert.equal(move.actualEdition.sources[field],before.figure_book_editions[0].sources[field])
 }
 for(const field of ['isbn','publisher','thumbnail_url','affiliate_url'])assert.equal(move.display[field],null)
 assert.equal(move.display.verified,false);assert.equal(move.display.sources.primary,'none')
 assert.equal(move.actualEdition.id,20);assert.equal(move.actualEdition.locale,'en');assert.equal(move.actualEdition.description,null)
 assert.deepEqual(before,original)
 const after=relocated(before,review);assert.equal(verifyReviewedLocaleRelocationReadback([id],before,[review],after).checkedTables,18)
 assert.deepEqual(after.figure_book_products,before.figure_book_products);assert.deepEqual(after.commerce_events,before.commerce_events)
})
test('relocation refuses stale rows, another publication, non-English text, unsupported credit and differing introductions',()=>{
 const {before,review}=relocationFixture()
 for(const patch of [{llmReviewed:false},{fromLocale:'en'},{toLocale:'ja'},{isbn:'9780140444124'},
  {beforeWork:{...review.beforeWork,title:'changed'}},{beforeLocale:{...review.beforeLocale,publisher:'changed'}},
  {beforeEdition:{...review.beforeEdition,text_scope:'changed'}},{descriptionLanguage:'en'},
  {sourceUrl:'https://openlibrary.org/books/OL123M'},{languageReview:{...review.languageReview,llmReviewed:false}},
  {languageReview:{...review.languageReview,textLanguage:'de'}},{languageReview:{...review.languageReview,isbn:'other'}},
  {languageReview:{...review.languageReview,bodyEvidence:'not read'}}])assert.throws(()=>planReviewedLocaleRelocation([id],before,[{...review,...patch}]))
 for(const [table,row] of [['content_locales',{...before.content_locales[0],locale:'en'}],
  ['figure_book_editions',{...before.figure_book_editions[0],id:21,isbn:'9780140444124'}],
  ['figure_book_editions',{...before.figure_book_editions[0],id:21,content_id:'other'}]]){
  const bad=structuredClone(before);bad[table].push(row);assert.throws(()=>planReviewedLocaleRelocation([id],bad,[review]))
 }
 const bad=structuredClone(before);bad.figure_book_editions[0].description='다른 소개';
 assert.throws(()=>planReviewedLocaleRelocation([id],bad,[{...review,beforeEdition:bad.figure_book_editions[0]}]),/introductions/)
})
test('null introductions remain unknown and source-reserved Korean introductions remain on the display',()=>{
 for(const description of [null,'KAKAO','DAUM']){
  const {before,review}=relocationFixture();before.content_locales[0].description=description;before.figure_book_editions[0].description=description
  review.beforeLocale=structuredClone(before.content_locales[0]);review.beforeEdition=structuredClone(before.figure_book_editions[0]);review.descriptionLanguage=description===null?null:'ko'
  const move=planReviewedLocaleRelocation([id],before,[review]).relocations[0]
  assert.equal(move.display.description,description);assert.equal(move.actual.description,null)
  assert.equal(verifyReviewedLocaleRelocationReadback([id],before,[review],relocated(before,review)).checkedTables,18)
 }
})
test('atomic relocation SQL guards all18 and moves the same edition ID before adding English locale',()=>{
 const {before,review}=relocationFixture(),sql=buildReviewedLocaleRelocationSql([id],before,[review])
 assert.match(sql,/SERIALIZABLE/);assert.match(sql,/LOCK TABLE public.content_locales,public.figure_book_editions/)
 assert.match(sql,/0451464168/);assert.match(sql,/9780451464163/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch '+table))
 assert.match(sql,/UPDATE public.figure_book_editions SET locale='en',description=NULL/)
 assert.match(sql,/WHERE id=20;/);assert.match(sql,/INSERT INTO public.content_locales/)
 assert.ok(sql.indexOf('UPDATE public.figure_book_editions')<sql.indexOf('INSERT INTO public.content_locales'))
 assert.doesNotMatch(sql,/DELETE FROM|INSERT INTO public.figure_book_editions|ALTER TABLE|DISABLE TRIGGER|openlibrary/)
 assert.ok(sql.lastIndexOf('rowset mismatch commerce_events')<sql.indexOf('COMMIT;'))
})
test('relocation readback rejects every protected table change, lost prose, false provider and edition ID replacement',()=>{
 const {before,review}=relocationFixture(),after=relocated(before,review)
 for(const table of SNAPSHOT_TABLES){const bad=structuredClone(after);bad[table].push({unexpected:true});assert.throws(()=>verifyReviewedLocaleRelocationReadback([id],before,[review],bad),new RegExp(table))}
 for(const change of [a=>a.content_locales[0].description='lost',a=>a.content_locales[1].sources.primary='openlibrary',
  a=>a.content_locales[1].description=before.content_locales[0].description,a=>a.figure_book_editions[0].id=21,
  a=>a.figure_book_editions[0].created_at=ts,a=>a.content_locales[0].created_at=ts]){
  const bad=structuredClone(after);change(bad);assert.throws(()=>verifyReviewedLocaleRelocationReadback([id],before,[review],bad))
 }
})
test('relocation apply checks fresh actual18 and never retries uncertain transport or post-commit drift',async()=>{
 const {before,review}=relocationFixture(),after=relocated(before,review);let captures=0,executions=0
 const execute=()=>{executions++;return 'LOCALE_RELOCATION_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'}
 const result=await applyReviewedLocaleRelocation(null,[id],[review],{capture:async()=>++captures===1?before:after,execute})
 assert.equal(result.completed,true);assert.equal(captures,2);assert.equal(executions,1)
 const bad=structuredClone(after);bad.member_contents[0].rating=1;captures=0;executions=0
 await assert.rejects(applyReviewedLocaleRelocation(null,[id],[review],{capture:async()=>++captures===1?before:bad,execute}),/actual member_contents/)
 assert.equal(executions,1);captures=0;executions=0
 await assert.rejects(applyReviewedLocaleRelocation(null,[id],[review],{capture:async()=>{captures++;return before},execute:()=>{executions++;return 'unknown outcome'}}),/inspect owned IDs/)
 assert.equal(captures,1);assert.equal(executions,1)
})
