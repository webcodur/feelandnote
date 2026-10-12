import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {SNAPSHOT_TABLES} from './merge-work-sql.mjs'
import {buildCatalogRepairSnapshotSql,captureCatalogRepairSnapshot,expandReviewedExactIsbnIntroductionChanges,planGuardedCatalogRepairs,buildGuardedCatalogRepairSql,guardedCatalogRepairs,
 planGuardedCatalogExclusions,buildGuardedCatalogExclusionSql,guardedCatalogExclusions} from './guarded-catalog-repairs.mjs'

const snapshot=()=>({...Object.fromEntries(SNAPSHOT_TABLES.map(table=>[table,[]])),contents:[{id:'work',type:'BOOK',metadata:{figureBook:{workTitle:'Title'}},external_id:'old',updated_at:'old'}],
 content_locales:[{content_id:'work',locale:'en',title:'Title',description:null,sources:{primary:'openlibrary'},updated_at:'old'}],
 figure_book_editions:[{id:1,content_id:'work',locale:'en',title:'Title',description:null,sources:{},updated_at:'old'}],
 member_contents:[{id:'reading',content_id:'work',review:'Human review',rating:5}],faction_lv2:[{id:'theme',theme_book_ids:['other','work']}]})
const change=data=>({table:'contents',before:data.contents[0],patch:{metadata:{figureBook:{workTitle:'Confirmed Title'}},external_id:'confirmed'}})

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
 for(const [beforeRole,afterRole] of [['authored','appearance'],['appearance','authored']]){
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
