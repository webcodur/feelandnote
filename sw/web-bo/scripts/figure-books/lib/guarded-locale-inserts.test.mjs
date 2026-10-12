import test from 'node:test'
import assert from 'node:assert/strict'
import {SNAPSHOT_TABLES} from './merge-work-sql.mjs'
import {planReviewedLocaleInsert,buildReviewedLocaleInsertSql,verifyReviewedLocaleInsertReadback,applyReviewedLocaleInsert} from './guarded-locale-inserts.mjs'
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
