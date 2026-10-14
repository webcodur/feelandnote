import test from 'node:test'
import assert from 'node:assert/strict'
import {SNAPSHOT_TABLES} from './merge-work-sql.mjs'
import {planReviewedReadingReassignment,buildReviewedReadingReassignmentSql,verifyReviewedReadingReassignment,applyReviewedReadingReassignment} from './reviewed-reading-reassignment.mjs'
function fixture(){
 const before=Object.fromEntries(SNAPSHOT_TABLES.map(t=>[t,[]]))
 before.contents=[{id:'wrong-work',type:'BOOK',metadata:{figureBook:{workTitle:'Talking to Strangers',workCreator:'Malcolm Gladwell',workIdentity:'work:talking'}},member_count:1,celeb_count:2,record_count:3},
  {id:'right-work',type:'BOOK',metadata:{figureBook:{workTitle:'The Bomber Mafia',workCreator:'Malcolm Gladwell',workIdentity:'work:bomber'}},member_count:0,celeb_count:1,record_count:1}]
 before.celeb_contents=[{id:'reading-mixed',content_id:'wrong-work',celeb_id:'adam',review:'An unchanged recommendation about precision bombing in World War II.',review_en:'Keep this entire original English recommendation.',source_url:'https://www.linkedin.com/pulse/original-reading/',visibility:'public',status:'FINISHED',rating:5,created_at:'2020-01-01',updated_at:'2021-01-01'},
  {id:'reading-valid',content_id:'wrong-work',celeb_id:'aman',review:'A valid reading of Talking to Strangers.',source_url:'https://www.goodreads.com/review/show/123',visibility:'public'},
  {id:'other-reading',content_id:'right-work',celeb_id:'other',review:'Preserve another person’s reading.'}]
 before.member_contents=[{id:'member-record',content_id:'wrong-work',member_id:'member',rating:4,status:'completed'}]
 before.figure_book_editions=[{id:22,content_id:'right-work',locale:'en',isbn:'9780316296816',title:'The Bomber Mafia',creator:'Malcolm Gladwell',edition_kind:'full',text_scope:'complete',sources:{primary:'openlibrary'}}]
 before.content_locales=[{content_id:'wrong-work',locale:'ko',description:'Keep this valid card introduction.'},{content_id:'right-work',locale:'en',isbn:'9780316296816',title:'The Bomber Mafia',description:'Keep the actual target introduction.'}]
 before.figure_book_characters=[{content_id:'wrong-work',celeb_id:'figure',relation_type:'authored'}]
 before.curated_list_items=[{id:30,content_id:'wrong-work',sort_order:2}]
 before.flows=[{id:20,tiers:{shelf:['wrong-work','right-work']}}]
 const target=before.contents[1],workAnchor={...target.metadata.figureBook,originalTitle:null,originalCreator:null}
 const review={method:'independent_existing_reading_reassignment_review',llmReviewed:true,fromContentId:'wrong-work',toContentId:'right-work',fromWork:structuredClone(before.contents[0]),toWork:structuredClone(target),reading:structuredClone(before.celeb_contents[0]),reason:'The original personal source recommends the bombing book, not the separate book about strangers.',
  sourceReview:{llmReviewed:true,celebId:'adam',sourceUrl:before.celeb_contents[0].source_url,targetWorkAnchor:workAnchor,entireExistingReviewSupported:true,distinctOriginalConfirmed:true,originalReadingSourceUrl:before.celeb_contents[0].source_url,originalReadingBodyEvidence:'The actual recommender’s original article directly names this book and explains its bombing content.',readingEvidence:'The original author’s recommendation directly names The Bomber Mafia and its bombing subject.',existingReviewEvidence:'All unchanged sentences refer to precision bombing in World War II and are supported by the original recommendation.',originalDistinctionEvidence:'The target is a separate 2021 work, while Talking to Strangers is a different work from 2019.'},
  referenceEdition:structuredClone(before.figure_book_editions[0]),referenceReview:{llmReviewed:true,workAnchor,isbn:'9780316296816',editionTitle:'The Bomber Mafia',editionCreator:'Malcolm Gladwell',locale:'en',sourceUrl:'https://publisher.example/bomber-mafia',bodyEvidence:'The publisher identifies the exact original and ISBN and describes its actual World War II bombing content.',scopeEvidence:'This exact normal English paper edition contains the full original work, rather than the other book.'}}
 return {before,review,ids:['wrong-work','right-work']}
}
test('moves only the exact source-reviewed reading; keeps prose, member records and all unrelated relationships',()=>{
 const {before,review,ids}=fixture(),original=structuredClone(before),plan=planReviewedReadingReassignment(ids,before,[review]),after=plan.expected
 assert.deepEqual(before,original);assert.deepEqual(after.celeb_contents[0],{...before.celeb_contents[0],content_id:'right-work'})
 assert.deepEqual(after.celeb_contents.slice(1),before.celeb_contents.slice(1))
 assert.equal(after.contents[0].celeb_count,1);assert.equal(after.contents[0].record_count,2);assert.equal(after.contents[1].celeb_count,2);assert.equal(after.contents[1].record_count,2)
 for(const t of SNAPSHOT_TABLES.filter(t=>!['celeb_contents','contents'].includes(t)))assert.deepEqual(after[t],before[t],t)
 assert.equal(verifyReviewedReadingReassignment(ids,before,[review],after).checkedTables,18)
 assert.ok(!JSON.stringify(after).includes('entireExistingReviewSupported'))
})
test('rejects wrong ownership, stale original/reading, unreviewed source, altered prose and original ambiguity',()=>{
 const {before,review,ids}=fixture()
 for(const patch of [{method:'unreviewed'},{llmReviewed:false},{fromContentId:'unassigned'},{toContentId:'unassigned'},{toContentId:'wrong-work'},{fromWork:{...review.fromWork,external_id:'changed'}},{toWork:{...review.toWork,metadata:{}}},{reading:{...review.reading,review:'Altered original prose'}},{sourceReview:{...review.sourceReview,sourceUrl:'https://example.org/new-source'}},{sourceReview:{...review.sourceReview,celebId:'someoneelse'}},{sourceReview:{...review.sourceReview,entireExistingReviewSupported:false}},{sourceReview:{...review.sourceReview,distinctOriginalConfirmed:false}},{sourceReview:{...review.sourceReview,readingEvidence:'not read'}},{sourceReview:{...review.sourceReview,targetWorkAnchor:{...review.sourceReview.targetWorkAnchor,workIdentity:'other'}}}])assert.throws(()=>planReviewedReadingReassignment(ids,before,[{...review,...patch}]),/READING_REASSIGN/)
 assert.throws(()=>planReviewedReadingReassignment(['wrong-work'],before,[review]),/assigned/)
 assert.throws(()=>planReviewedReadingReassignment(ids,before,[review,review]),/exact current/)
 const missing=structuredClone(before);delete missing.notes;assert.throws(()=>planReviewedReadingReassignment(ids,missing,[review]),/full18/)
})
test('requires exact normal target physical body and rejects excluded, stale or unrelated editions',()=>{
 const {before,review,ids}=fixture()
 for(const patch of [{referenceEdition:{...review.referenceEdition,isbn:'9780140444124'}},{referenceReview:{...review.referenceReview,sourceUrl:'https://openlibrary.org/books/OL1M'}},{referenceReview:{...review.referenceReview,scopeEvidence:'not read'}},{referenceReview:{...review.referenceReview,locale:'ko'}}])assert.throws(()=>planReviewedReadingReassignment(ids,before,[{...review,...patch}]),/normal target/)
 const bad=structuredClone(before);bad.figure_book_editions[0].edition_kind='abridged';assert.throws(()=>planReviewedReadingReassignment(ids,bad,[{...review,referenceEdition:bad.figure_book_editions[0]}]),/normal target/)
})
test('target reading collision never deletes or combines records',()=>{
 const {before,review,ids}=fixture();before.celeb_contents.push({...before.celeb_contents[0],id:'existing-target',content_id:'right-work'})
 assert.throws(()=>planReviewedReadingReassignment(ids,before,[review]),/collision/)
})
test('SQL changes only content_id; locks and compares all18 before and after, never changes prose or schema',()=>{
 const {before,review,ids}=fixture(),sql=buildReviewedReadingReassignmentSql(ids,before,[review])
 assert.match(sql,/SERIALIZABLE/);assert.match(sql,/LOCK TABLE public.celeb_contents/);assert.match(sql,/GET DIAGNOSTICS affected_rows/)
 assert.match(sql,/UPDATE public.celeb_contents SET content_id=/)
 assert.doesNotMatch(sql,/DELETE FROM|INSERT INTO|ALTER TABLE|DISABLE TRIGGER|UPDATE public.contents|SET review=|SET source_url=/)
 for(const t of SNAPSHOT_TABLES)assert.equal(sql.split('READING_REASSIGN: rowset mismatch '+t+"'").length-1,2,t)
})
test('full18 readback rejects every side effect, including a protected review or source edit',()=>{
 const {before,review,ids}=fixture(),after=planReviewedReadingReassignment(ids,before,[review]).expected
 for(const t of SNAPSHOT_TABLES){const bad=structuredClone(after);bad[t].push({unexpected:true});assert.throws(()=>verifyReviewedReadingReassignment(ids,before,[review],bad),new RegExp(t))}
 for(const key of ['review','review_en','source_url','status','visibility','created_at','updated_at']){const bad=structuredClone(after);bad.celeb_contents[0][key]='Changed';assert.throws(()=>verifyReviewedReadingReassignment(ids,before,[review],bad),/celeb_contents/)}
})
test('actual apply checks committed and fresh18, propagates failure and never retries uncertain writes',async()=>{
 const {before,review,ids}=fixture(),after=planReviewedReadingReassignment(ids,before,[review]).expected;let captures=0,executions=0
 const options={capture:async()=>++captures===1?before:after,execute:()=>{executions++;return 'READING_REASSIGN_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'}}
 assert.equal((await applyReviewedReadingReassignment(null,ids,[review],options)).completed,true);assert.equal(captures,2);assert.equal(executions,1)
 captures=0;executions=0;await assert.rejects(applyReviewedReadingReassignment(null,ids,[review],{capture:async()=>{captures++;return before},execute:()=>{executions++;return 'transport uncertain'}}),/inspect owned IDs/);assert.equal(captures,1);assert.equal(executions,1)
 captures=0;const bad=structuredClone(after);bad.member_contents[0].rating=1;await assert.rejects(applyReviewedReadingReassignment(null,ids,[review],{...options,capture:async()=>++captures===1?before:bad}),/actual member_contents/)
 captures=0;executions=0;await assert.rejects(applyReviewedReadingReassignment(null,ids,[review],{capture:async()=>{captures++;return before},execute:()=>{executions++;throw Error('DB policy rollback')}}),/DB policy rollback/);assert.equal(captures,1);assert.equal(executions,1)
})
test('false apply and dry-run flags reject before any capture or actual SQL',async()=>{
 const {before,review,ids}=fixture();let calls=0
 for(const flags of [{apply:false},{dryRun:true},{apply:false,dryRun:false},{apply:true,dryRun:true}])await assert.rejects(applyReviewedReadingReassignment(null,ids,[review],{...flags,capture:async()=>{calls++;return before},execute:()=>{calls++}}),/use plan/)
 assert.equal(calls,0)
})
