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
