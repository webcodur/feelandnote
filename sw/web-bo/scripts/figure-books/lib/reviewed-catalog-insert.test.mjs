import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES } from './merge-work-sql.mjs'
import { applyReviewedCatalogInsert, bindReviewedCatalogInsertIdentity, buildReviewedCatalogInsertSql, planReviewedCatalogInsert, verifyReviewedCatalogInsertReadback } from './reviewed-catalog-insert.mjs'

const ids = ['existing-a', 'existing-b']
const timestamp = '2026-10-11T07:00:00+00:00'
function additionalTranslationFixture(){
  const {before}=fixture(),work=before.contents[0],card=before.content_locales[0]
  work.metadata.figureBook={workTitle:'Faust',workCreator:'Johann Wolfgang von Goethe',workIdentity:'goethe/faust',originalTitle:'Faust',originalCreator:'Johann Wolfgang von Goethe'}
  Object.assign(card,{title:'Faust, Part One',creator:'Johann Wolfgang von Goethe',isbn:'9780140448238',verified:true})
  card.sources.translators=['Randall Jarrell']
  before.figure_book_contents=[{content_id:ids[0],created_at:timestamp,updated_at:timestamp}]
  before.figure_book_editions=[{id:20,content_id:ids[0],locale:'en',title:card.title,creator:card.creator,isbn:card.isbn,publisher:card.publisher,
    description:card.description,thumbnail_url:null,release_date:null,edition_kind:'volume',text_scope:'Part One; Randall Jarrell translation',sort_order:0,verified:true,sources:structuredClone(card.sources),created_at:timestamp,updated_at:timestamp}]
  const sourceUrl='https://yalebooks.yale.edu/book/9780300189698/faust/',providerUrl='https://openlibrary.org/books/OL27164181M'
  const review={contentId:ids[0],locale:'en',isbn:'9780300189698',title:'Faust',creator:'Johann Wolfgang von Goethe',workTitle:'Faust',workCreator:'Johann Wolfgang von Goethe',
    translators:['Martin Greenberg'],textLanguage:'en',sourceUrl,reason:'Yale identifies Greenberg’s English translation of Parts One and Two as revised in 2014; no claim of identical earlier bytes or line-by-line unabridged text.',editionKind:null,textScope:'Parts One and Two; 2014 revised Martin Greenberg translation',editionReleaseDate:'2014-07-29'}
  const edition={content_id:review.contentId,locale:'en',isbn:review.isbn,title:review.title,creator:review.creator,publisher:'Yale University Press',description:null,thumbnail_url:null,
    release_date:review.editionReleaseDate,edition_kind:null,text_scope:review.textScope,sort_order:0,verified:true,sources:{primary:'openlibrary',isbn:providerUrl,title:providerUrl,creator:providerUrl,publisher:providerUrl,translators:['Martin Greenberg'],translator_source_url:sourceUrl}}
  review.additionalTranslationReview={method:'independent_existing_translation_addition_review',llmReviewed:true,officialProviderUnavailable:false,currentWork:structuredClone(work),
    workAnchor:structuredClone(work.metadata.figureBook),beforeLocaleCards:structuredClone(before.content_locales),beforeEditions:structuredClone(before.figure_book_editions),currentGlobalIsbnOwners:[],edition,
    officialProvider:{httpStatus:200,sourceUrl:providerUrl,response:{key:'/books/OL27164181M',type:{key:'/type/edition'},title:'Faust',isbn_13:[review.isbn],publishers:['Yale University Press'],languages:[{key:'/languages/eng'}],by_statement:'Johann Wolfgang von Goethe ; translated from the German by Martin Greenberg ; introduction by W. Daniel Wilson'}},
    sourceUrl,physicalMedium:'paper',bodyLanguage:'en',bodyEvidence:'The actual Yale description presents Goethe’s dramatic text in Greenberg’s English translation in one volume.',
    creditEvidence:'The actual responsibility statement separates Goethe as author, Greenberg as translator and Wilson as introduction writer.',distinctTranslationEvidence:'Greenberg is a separately credited translator from the retained Jarrell edition, which remains untouched.',
    scopeReview:{llmReviewed:true,editionKind:null,textScope:review.textScope,sourceUrl,unabridgedVerified:false,equivalentEarlierBodyClaimed:false,includedOriginalParts:[1,2],scopeEvidence:'The actual subtitle and description identify Parts One and Two and a revised 2014 translation; every-line unabridged text was not established.'}}
  return {before,reviews:[review]}
}

test('additional verified translation adds one exact official edition without replacing the selected card or any protected row',()=>{
  const {before,reviews}=additionalTranslationFixture(),copy=structuredClone(before),plan=planReviewedCatalogInsert(ids,before,reviews)
  assert.deepEqual(before,copy);assert.deepEqual(plan.newParentIds,[]);assert.equal(plan.editions.length,1)
  assert.equal(plan.editions[0].isbn,'9780300189698');assert.deepEqual(plan.editions[0].sources.translators,['Martin Greenberg'])
  assert.equal(plan.editions[0].edition_kind,null);assert.equal(plan.editions[0].description,null);assert.equal(plan.editions[0].sources.officialProvider,undefined)
  const after=committed(before,reviews);assert.doesNotThrow(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after))
  assert.deepEqual(after.content_locales,before.content_locales);assert.deepEqual(after.figure_book_editions[0],before.figure_book_editions[0])
  const sql=buildReviewedCatalogInsertSql(ids,before,reviews)
  assert.match(sql,/additional translation ISBN already registered globally/);assert.ok(sql.includes("E'0300189699'"))
  assert.doesNotMatch(sql,/INSERT INTO public.contents|UPDATE public.content_locales|DELETE FROM public.figure_book_editions/)
  for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table))
})

test('additional translation rejects stale anchors/cards/editions, fake provider availability, unknown or repeated translators and exaggerated scope',()=>{
  for(const mutate of [p=>p.llmReviewed=false,p=>p.officialProviderUnavailable=true,p=>p.currentWork.metadata.figureBook.workTitle='Other',
    p=>p.workAnchor.workIdentity='other',p=>p.beforeLocaleCards[0].description='Lost existing introduction',p=>p.beforeEditions[0].sources.translators=['Other'],
    p=>p.currentGlobalIsbnOwners=['other'],p=>p.edition.creator='Wilson',p=>p.edition.description='Unreviewed generated English',p=>p.edition.publisher='Other',
    p=>p.edition.thumbnail_url='https://covers.openlibrary.org/b/id/999-L.jpg',p=>p.edition.sources.rawResponse={private:'copied response'},p=>p.edition.sources.description_source_locale='ko',p=>p.edition.sources.workKey='/works/OL1W',p=>p.officialProvider.httpStatus=404,p=>p.officialProvider.sourceUrl='https://openlibrary.org/books/OL1M',
    p=>p.officialProvider.response.key='/works/OL1W',p=>p.officialProvider.response.type.key='/type/work',p=>p.officialProvider.response.isbn_13=['9780300146431'],
    p=>p.officialProvider.response.languages=[{key:'/languages/ger'}],p=>p.officialProvider.response.by_statement='Introduction by W. Daniel Wilson',
    p=>p.physicalMedium='audio',p=>p.bodyLanguage='ko',p=>p.creditEvidence='',p=>p.distinctTranslationEvidence='',p=>p.bodyEvidence='',
    p=>p.scopeReview.includedOriginalParts=[2],p=>p.scopeReview.equivalentEarlierBodyClaimed=true,p=>p.scopeReview.unabridgedVerified=true,p=>p.scopeReview.scopeEvidence='guess',
  ]){const {before,reviews}=additionalTranslationFixture();mutate(reviews[0].additionalTranslationReview);assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)}
  for(const mutate of [(b,r)=>delete r.additionalTranslationReview,(b,r)=>r.registeredBookSourceReview={officialProviderUnavailable:true},
    (b,r)=>{r.translators=['Randall Jarrell'];r.additionalTranslationReview.edition.sources.translators=r.translators},
    (b,r)=>{b.figure_book_editions[0].sources.translators=[];r.additionalTranslationReview.beforeEditions=structuredClone(b.figure_book_editions)},
    (b,r)=>{r.editionKind='full';r.additionalTranslationReview.edition.edition_kind='full';r.additionalTranslationReview.scopeReview.editionKind='full'},
    (b,r)=>{r.textScope='complete';r.additionalTranslationReview.edition.text_scope='complete';r.additionalTranslationReview.scopeReview.textScope='complete'},
    (b,r)=>{b.contents[1].external_id=r.isbn;r.additionalTranslationReview.currentGlobalIsbnOwners=[]},
  ]){const {before,reviews}=additionalTranslationFixture();mutate(before,reviews[0]);assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)}
})

test('additional translation independent readback rejects any old-row edit or generated-edition credit/prose drift',()=>{
  for(const table of SNAPSHOT_TABLES){const {before,reviews}=additionalTranslationFixture(),after=committed(before,reviews);after[table].push({id:'unexpected'});assert.throws(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after),/CATALOG_INSERT_READBACK/)}
  for(const mutate of [a=>a.figure_book_editions[0].description='Lost old intro',a=>a.figure_book_editions.at(-1).sources.translators=['Wilson'],a=>a.content_locales[0].isbn='9780300189698',a=>a.celeb_contents[0].review='Changed Korean reading',a=>a.member_contents[0].rating=0]){
    const {before,reviews}=additionalTranslationFixture(),after=committed(before,reviews);mutate(after);assert.throws(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after),/CATALOG_INSERT_READBACK/)
  }
})

test('local PostgreSQL adds the distinct translation and rejects global ISBN races and protected-row drift atomically',{
 skip:!process.env.PG_TEST_BIN&&'PG_TEST_BIN requires a local PostgreSQL bin directory',timeout:120000,
},async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join,resolve,basename}=await import('node:path')
 const {spawnSync}=await import('node:child_process'),{createServer}=await import('node:net')
 const {buildCatalogRepairSnapshotSql}=await import('./guarded-catalog-repairs.mjs')
 const directory=mkdtempSync(join(tmpdir(),'feelandnote-additional-translation-test-')),data=join(directory,'db')
 const run=(name,args,input,options={})=>{const r=spawnSync(join(process.env.PG_TEST_BIN,name+(process.platform==='win32'?'.exe':'')),args,{input,encoding:'utf8',windowsHide:true,shell:false,timeout:15000,maxBuffer:10000000,...options});if(r.error||r.status!==0)throw Error(r.error?.message??r.stderr);return r.stdout?.trim()??''}
 const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));const port=server.address().port;await new Promise(done=>server.close(done));let started=false
 t.after(()=>{if(started)run('pg_ctl',['-D',data,'-m','immediate','-w','stop']);assert(resolve(directory).startsWith(resolve(tmpdir())+(process.platform==='win32'?'\\':'/'))&&basename(directory).startsWith('feelandnote-additional-translation-test-'));if(process.platform==='win32'){const r=spawnSync('powershell',['-NoProfile','-Command',`Remove-Item -LiteralPath '${directory.replaceAll("'","''")}' -Recurse`],{windowsHide:true,shell:false,encoding:'utf8'});assert.equal(r.status,0,r.stderr)}else rmSync(directory,{recursive:true})})
 run('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8'],undefined,{timeout:120000});run('pg_ctl',['-D',data,'-l',join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],undefined,{stdio:'ignore'});started=true
 const query=sql=>run('psql',['-XqAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres'],sql),literal=value=>"'"+value.replaceAll("'","''")+"'"
 const f=additionalTranslationFixture(),candidate=planReviewedCatalogInsert(ids,f.before,f.reviews).editions[0]
 const defaults={contents:{id:'',type:'',external_id:null,metadata:{}},content_locales:{content_id:'',locale:'',isbn:null},figure_book_contents:{content_id:'',created_at:timestamp,updated_at:timestamp},figure_book_editions:{id:0,content_id:'',...candidate,created_at:timestamp,updated_at:timestamp},figure_book_products:{id:0,edition_id:0},flows:{id:'',tiers:{}},tier_lists:{id:'',tiers:{},unranked:[]},faction_lv2:{id:'',theme_book_ids:[]},flow_nodes:{id:'',content_id:'',bonus_content_ids:[]}}
 for(const table of SNAPSHOT_TABLES){
  const rows=[defaults[table]??{id:'',content_id:''},...f.before[table]],keys=[...new Set(rows.flatMap(row=>Object.keys(row)))],definitions=keys.map(key=>{
   const value=rows.map(row=>row[key]).find(value=>value!==null&&value!==undefined),arrayText=key==='theme_book_ids'||key==='unranked'
   const type=arrayText?'text[]':key==='created_at'||key==='updated_at'?'timestamptz':key==='edition_id'?'bigint':typeof value==='boolean'?'boolean':typeof value==='number'?'bigint':value&&typeof value==='object'?'jsonb':'text'
   return key+' '+(table==='figure_book_editions'&&key==='id'?'bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY':type)
  });if(table==='contents')definitions.push('PRIMARY KEY(id)');if(table==='figure_book_contents')definitions.push('PRIMARY KEY(content_id)');if(table==='content_locales')definitions.push('PRIMARY KEY(content_id,locale)')
  if(keys.includes('content_id'))definitions.push(`FOREIGN KEY(content_id) REFERENCES ${['figure_book_editions','figure_book_characters'].includes(table)?'figure_book_contents(content_id)':'contents(id)'}`)
  if(table==='figure_book_products')definitions.push('FOREIGN KEY(edition_id) REFERENCES figure_book_editions(id)')
  query(`CREATE TABLE ${table}(${definitions.join(',')});`)
 }
 const reset=()=>query(`TRUNCATE ${SNAPSHOT_TABLES.join(',')} RESTART IDENTITY CASCADE;`+SNAPSHOT_TABLES.filter(table=>f.before[table].length).map(table=>`INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},${literal(JSON.stringify(f.before[table]))}::jsonb);`).join('\n')+'SELECT setval(pg_get_serial_sequence(\'figure_book_editions\',\'id\'),100,true);')
 const capture=()=>JSON.parse(query(buildCatalogRepairSnapshotSql(ids)))
 const reviewsFor=before=>{const r=structuredClone(f.reviews[0]),p=r.additionalTranslationReview;p.currentWork=structuredClone(before.contents.find(row=>row.id===r.contentId));p.beforeLocaleCards=structuredClone(before.content_locales);p.beforeEditions=structuredClone(before.figure_book_editions);return [r]}
 reset();let before=capture(),reviews=reviewsFor(before);query(buildReviewedCatalogInsertSql(ids,before,reviews));const after=capture();assert.doesNotThrow(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after));assert.equal(after.figure_book_editions.length,2);assert.deepEqual(after.content_locales,before.content_locales)
 reset();before=capture();reviews=reviewsFor(before);const stale=buildReviewedCatalogInsertSql(ids,before,reviews);query("UPDATE member_contents SET rating=1 WHERE id='2';");assert.throws(()=>query(stale),/rowset mismatch in member_contents/);assert.equal(query('SELECT count(*) FROM figure_book_editions'),'1');assert.equal(query('SELECT rating FROM member_contents'),'1')
 for(const table of ['contents','content_locales','figure_book_editions']){
  reset();before=capture();reviews=reviewsFor(before);const sql=buildReviewedCatalogInsertSql(ids,before,reviews);query("INSERT INTO contents(id,type) VALUES('outside-owner','BOOK'); INSERT INTO figure_book_contents(content_id) VALUES('outside-owner');")
  if(table==='contents')query("UPDATE contents SET external_id='0-300-18969-9' WHERE id='outside-owner';")
  else if(table==='content_locales')query("INSERT INTO content_locales(content_id,locale,isbn) VALUES('outside-owner','en','0-300-18969-9');")
  else query("INSERT INTO figure_book_editions(content_id,locale,isbn) VALUES('outside-owner','en','0-300-18969-9');")
  assert.throws(()=>query(sql),/additional translation ISBN already registered globally/);assert.equal(query("SELECT count(*) FROM figure_book_editions WHERE content_id='existing-a'"),'1')
 }
})
function fixture() {
  const before = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  before.contents = [
    { id: ids[0], type: 'BOOK', release_date: '2013-10-10', metadata: { figureBook: { workTitle: 'Existing original A', workCreator: 'Original Author A' } }, member_count: 1, celeb_count: 1 },
    { id: ids[1], type: 'BOOK', release_date: null, metadata: { figureBook: { workTitle: 'Existing original B', workCreator: 'Original Author B' } } },
  ]
  before.content_locales = [
    { content_id: ids[0], locale: 'en', title: 'Original A', creator: 'Original Author A', isbn: '9780451464163', publisher: ' English Publisher ',
      description: 'A complete introduction already written by a person.', thumbnail_url: null, verified: false,
      sources: { primary: 'openlibrary', isbn: 'https://openlibrary.org/books/OL1234M', description: 'https://publisher.example/a', translators: [] } },
    { content_id: ids[0], locale: 'ko', title: '한국어 번역 A', creator: '원저자 A', isbn: '9791167972064', publisher: '한국 출판사',
      description: '기존 한국어 소개는 글자와 출처를 그대로 보존한다.', thumbnail_url: 'https://publisher.example/cover.jpg', verified: true,
      sources: { primary: 'kakao_book', title: 'https://search.daum.net/search?w=bookpage&bookId=123', translators: ['실제 역자'], description: 'https://publisher.example/ko-a' } },
    { content_id: ids[1], locale: 'ko', title: '기존 국내 저작', creator: '국내 작가', isbn: '9788932042596', publisher: '국내 출판사',
      description: null, thumbnail_url: null, verified: true,
      sources: { primary: 'kakao_book', isbn: 'https://dapi.kakao.com/v3/search/book?target=isbn&query=9788932042596' } },
    { content_id: ids[1], locale: 'en', title: 'Display title only', creator: 'Author', isbn: null, sources: { primary: 'none', title: 'translated' }, description: 'Preserved display introduction.' },
  ]
  before.celeb_contents = [{ id: 1, content_id: ids[0], celeb_id: 'celeb', review: '감상 원문', review_en: 'Original reading account', source_url: 'https://example.org/account', visibility: 'public', rating: 5 }]
  before.member_contents = [{ id: 2, content_id: ids[0], member_id: 'member', status: 'completed', rating: 5 }]
  before.flows = [{ id: 3, tiers: { shelf: [ids[0], 'other', ids[1]] } }]
  before.activity_logs = [{ id: 4, content_id: ids[0], data: { ordered: [1, 2] } }]
  const reviews = [
    { contentId: ids[0], locale: 'en', textLanguage: 'en', isbn: '9780451464163', title: 'Original A', creator: 'Original Author A',
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/a', reason: 'Exact publisher ISBN and English original reviewed; scope has not been asserted.', editionKind: null, textScope: null },
    { contentId: ids[0], locale: 'ko', textLanguage: 'ko', isbn: '9791167972064', title: '한국어 번역 A', creator: '원저자 A', translators: ['실제 역자'],
      workTitle: 'Existing original A', workCreator: 'Original Author A', sourceUrl: 'https://publisher.example/ko-a', reason: '정확한 ISBN과 실제 역자·전체 번역 목차를 확인했다.', editionKind: 'full', textScope: 'complete' },
    { contentId: ids[1], locale: 'ko', textLanguage: 'ko', isbn: '9788932042596', title: '기존 국내 저작', creator: '국내 작가',
      workTitle: 'Existing original B', workCreator: 'Original Author B', sourceUrl: 'https://publisher.example/b', reason: '실제 한국어 원문과 시작권 목차를 확인했다.', editionKind: 'volume', textScope: '한국어 원작 분권 1권; 시작권 대표' },
  ]
  return { before, reviews }
}
function fallbackFixture() {
  const { before, reviews } = fixture(), review = reviews[0], card = before.content_locales[0]
  const sourceUrl = 'https://publisher.example/a'
  Object.assign(card, { verified: true, sources: { ...card.sources,
    ...Object.fromEntries(['primary', 'isbn', 'title', 'creator', 'publisher'].map(key => [key, sourceUrl])) } })
  review.registeredBookSourceReview = { method: 'independent_registered_book_source_review', llmReviewed: true,
    userAuthorized: true, officialProviderUnavailable: true, contentId: review.contentId, locale: 'en', isbn: review.isbn,
    title: review.title, creator: review.creator, workTitle: review.workTitle, workCreator: review.workCreator,
    workIdentity: null, publisher: card.publisher.trim(), sourceUrl, textLanguage: 'en', physicalMedium: 'paper',
    sourceKind: 'publisher', corroboratingSourceUrl: 'https://library.example/exact-isbn',
    bodyEvidence: 'The LLM read the English novel excerpt and exact paperback bibliography from both actual sources.' }
  return { before, reviews }
}
function epubFallbackFixture(){
 const {before,reviews}=fallbackFixture(),review=reviews[0],card=before.content_locales[0],work=before.contents[0]
 const sourceUrl='https://ridibooks.com/books/834000014'
 Object.assign(work,{metadata:{figureBook:{workTitle:'명철 범려전',workCreator:'임안수',workIdentity:'im-an-su/fan-li'}}})
 Object.assign(card,{locale:'ko',title:'명철 범려전 1 초지광자',creator:'임안수',isbn:'9788997869244',publisher:'글나눔',
  sources:{...Object.fromEntries(['primary','isbn','title','creator','publisher','description'].map(key=>[key,sourceUrl])),
   physical_format:'EPUB',description_method:'research',description_source_locale:'ko',translators:[]}})
 // 이 대상의 다른 언어 카드는 표시 카드이며 새 실물 판본을 만들지 않는다.
 before.content_locales=before.content_locales.filter(row=>row.content_id!==review.contentId||row===card)
 Object.assign(review,{locale:'ko',textLanguage:'ko',isbn:card.isbn,title:card.title,creator:card.creator,workTitle:'명철 범려전',workCreator:'임안수',
  sourceUrl,translators:[],editionKind:'volume',textScope:'volume/1',editionReleaseDate:'2013-03-04'})
 review.registeredBookSourceReview={...review.registeredBookSourceReview,contentId:review.contentId,locale:'ko',isbn:review.isbn,title:review.title,
  creator:review.creator,workTitle:review.workTitle,workCreator:review.workCreator,workIdentity:'im-an-su/fan-li',publisher:card.publisher,
  sourceUrl,textLanguage:'ko',physicalMedium:'ebook',sourceKind:'bookseller',corroboratingSourceUrl:sourceUrl,
  bodyEvidence:'실제 리디 첫 권 페이지의 출판사 서평을 읽고 발표한 여섯 권이 기획한 세 편 중 제1편이라고 확인했다.',
  digitalEditionReview:{method:'independent_registered_epub_start_review',llmReviewed:true,currentWork:structuredClone(work),currentLocaleCard:structuredClone(card),
   workAnchor:{workTitle:'명철 범려전',workCreator:'임안수',workIdentity:'im-an-su/fan-li',originalTitle:null,originalCreator:null},
   isbn:review.isbn,title:review.title,creator:review.creator,publisher:card.publisher,releaseDate:review.editionReleaseDate,
   metadataSourceUrl:sourceUrl,bodySourceUrl:sourceUrl,bodySourceKind:'publisher_text',format:'EPUB',bodyLanguage:'ko',
   metadataEvidence:'첫 권의 정확한 EPUB ISBN과 임안수 저자, 글나눔 출판, 2013년 3월 4일 출간을 실제 서지에서 읽었다.',
   languageEvidence:'출판사가 제공한 본문 소개의 실제 한국어 문장을 읽어 한국어 역사소설임을 확인했다.',
   bodyEvidence:'범려의 출세기를 다루는 역사소설이라는 출판사 소개를 읽고 실제 저작과 범려 등장 관계를 구분했다.',
   scopeEvidence:'발표한 여섯 권은 기획한 세 편 가운데 입신 평천하 제1편이며 해당 ISBN은 그 여섯 권 중 첫 권이다.',
   firstVolume:1,publishedVolumes:6,plannedParts:3,publishedPart:1,workScope:'published_part_of_planned_work'}}
 return {before,reviews:reviews.filter(row=>row.contentId!==review.contentId||row===review)}
}

test('등록 BOOK의 공식결손 EPUB 첫 권은 실제 형식·한국어·출판사 범위를 검수하고 종이판으로 꾸미지 않는다',()=>{
 const {before,reviews}=epubFallbackFixture(),copy=structuredClone(before),plan=planReviewedCatalogInsert(ids,before,reviews)
 assert.equal(plan.editions[0].isbn,'9788997869244');assert.equal(plan.editions[0].sources.physical_format,'EPUB')
 assert.equal(plan.editions[0].edition_kind,'volume');assert.equal(plan.editions[0].text_scope,'volume/1')
 assert.equal(plan.editions[0].release_date,'2013-03-04');assert.deepEqual(before,copy)
 assert.equal(plan.editions[0].sources.digitalEditionReview,undefined)
 assert.doesNotThrow(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,committed(before,reviews)))
 const sql=buildReviewedCatalogInsertSql(ids,before,reviews)
 assert.doesNotMatch(sql,/INSERT INTO public.contents|UPDATE public.celeb_contents/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table))
})

test('EPUB 예외는 오래된 원작·카드, 제3권과 전체분량 위장, 미확인 언어·형식·출판사 본문을 거부한다',()=>{
 for(const mutate of [
  p=>p.llmReviewed=false,p=>p.currentWork.metadata.figureBook.workIdentity='other',
  p=>p.currentLocaleCard.isbn='9788997869268',p=>p.workAnchor.workCreator='범려',
  p=>p.format='paper',p=>p.bodyLanguage='en',p=>p.languageEvidence='',p=>p.metadataEvidence='',
  p=>p.scopeEvidence='',p=>p.bodyEvidence='',p=>p.bodySourceKind='search_snippet',
  p=>p.bodySourceUrl='https://ridibooks.com/books/834000016',p=>p.releaseDate='2013-03-05',
  p=>p.firstVolume=3,p=>p.publishedVolumes=1,p=>p.publishedPart=3,
 ]){
  const {before,reviews}=epubFallbackFixture();mutate(reviews[0].registeredBookSourceReview.digitalEditionReview)
  assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/fallback EPUB/)
 }
 for(const mutate of [
  (d,r)=>r.editionKind='full',(d,r)=>r.textScope='complete',
  (d,r)=>delete r.registeredBookSourceReview.digitalEditionReview,
  (d,r)=>r.registeredBookSourceReview.physicalMedium='paper',
  (d,r)=>d.content_locales[0].sources.physical_format='PDF',
  (d,r)=>r.registeredBookSourceReview.officialProviderUnavailable=false,
  (d,r)=>d.figure_book_editions.push({id:9,content_id:r.contentId,locale:'ko',isbn:r.isbn}),
 ]){
  const {before,reviews}=epubFallbackFixture();mutate(before,reviews[0])
  assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)
 }
 const {before,reviews}=epubFallbackFixture(),after=committed(before,reviews);after.celeb_contents[0].review='Changed protected reading'
 assert.throws(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after),/celeb_contents/)
})

test('authorized source fallback restores only existing BOOK editions with truthful source URLs and unchanged histories', () => {
  const { before, reviews } = fallbackFixture(), copy = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(before, copy)
  assert.equal(plan.editions[0].sources.primary, 'https://publisher.example/a')
  assert.equal(plan.editions[0].sources.isbn, 'https://publisher.example/a')
  assert.equal(plan.editions[0].sources.registeredBookSourceReview, undefined)
  assert.doesNotThrow(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, committed(before, reviews)))
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.doesNotMatch(sql, /INSERT INTO public.contents|UPDATE public.celeb_contents|DELETE FROM public.celeb_contents/)
  for (const table of SNAPSHOT_TABLES) assert.ok(sql.includes('rowset mismatch in ' + table))
})
test('fallback refuses guessed identities, wrong language/medium, unapproved or uncorroborated source decisions', () => {
  for (const diff of [{ llmReviewed: false }, { userAuthorized: false }, { officialProviderUnavailable: false },
    { contentId: 'other' }, { isbn: '9780140449136' }, { title: 'Other' }, { creator: 'Other' },
    { workTitle: 'Other' }, { workCreator: 'Other' }, { workIdentity: 'other' }, { publisher: 'Other' },
    { locale: 'ko' }, { textLanguage: 'ko' }, { physicalMedium: 'ebook' }, { sourceKind: 'search_snippet' },
    { corroboratingSourceUrl: 'https://publisher.example/another-page' }, { bodyEvidence: 'Guess' },
    { corroboratingSourceUrl: 'https://localhost/book' }, { sourceUrl: 'https://openlibrary.org/books/OL1234M' },
    { sourceUrl: 'https://amazon.com/dp/book' }, { sourceUrl: 'https://books.google.com/books?id=one' }]) {
    const { before, reviews } = fallbackFixture()
    Object.assign(reviews[0].registeredBookSourceReview, diff)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /existing-book fallback/)
  }
  for (const key of ['primary', 'isbn', 'title', 'creator', 'publisher']) {
    const { before, reviews } = fallbackFixture();before.content_locales[0].sources[key] = 'https://publisher.example/stale'
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /existing-book fallback/)
  }
  const { before, reviews } = fallbackFixture();delete reviews[0].registeredBookSourceReview
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /wrong primary/)
})
test('fallback still rejects protected changes and duplicate product history in actual readback', () => {
  const { before, reviews } = fallbackFixture(), after = committed(before, reviews)
  after.celeb_contents[0].review = 'Changed prose'
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /celeb_contents/)
})
function committed(before, reviews) {
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = structuredClone(before)
  for (const content_id of plan.newParentIds) after.figure_book_contents.push({ content_id, created_at: timestamp, updated_at: timestamp })
  plan.editions.forEach((row, index) => after.figure_book_editions.push({ ...row, id: 100 + index, created_at: timestamp, updated_at: timestamp }))
  return after
}

function isbnlessFixture() {
  const { before } = fixture()
  before.contents[0].metadata.figureBook = { workTitle: 'Apology; Protagoras', workCreator: 'Plato' }
  const providerUrl = 'https://search.daum.net/search?w=bookpage&bookId=74319'
  Object.assign(before.content_locales[0], { isbn: null, sources: { primary: 'none', title: 'original' } })
  Object.assign(before.content_locales[1], { title: '플라톤(상)', creator: '플라톤', isbn: null, publisher: '명지', verified: true,
    sources: { primary: 'kakao_book', title: providerUrl, provider_product_id: '74319', provider_edition_url: providerUrl,
      translators: ['박양운'], description: 'https://www.nl.go.kr/contents/CNTS-00055343841' } })
  const review = { contentId: ids[0], locale: 'ko', textLanguage: 'ko', isbn: null, title: '플라톤(상)', creator: '플라톤',
    workTitle: 'Apology; Protagoras', workCreator: 'Plato', translators: ['박양운'],
    sourceUrl: 'https://www.nl.go.kr/contents/CNTS-00055343841',
    reason: '국립중앙도서관 판권과 목차를 읽고 1975년 명지문고 21의 박양운 번역, 222쪽짜리 플라톤(상) 실물 판본임을 확인했다. 본문에는 소크라테스의 변명과 프로타고라스 두 대화편이 수록되어 있다.',
    editionKind: 'volume', textScope: '플라톤 대화편 선집 상권; 『소크라테스의 변명』·『프로타고라스』 합본, 시작권 대표' }
  review.isbnlessPhysicalEditionReview = { method: 'independent_isbnless_physical_edition_review', llmReviewed: true,
    contentId: review.contentId, locale: review.locale, isbn: null, title: review.title, creator: review.creator,
    workTitle: review.workTitle, workCreator: review.workCreator, translators: [...review.translators], publisher: '명지',
    providerProductId: '74319', providerUrl, sourceUrl: review.sourceUrl, reason: review.reason,
    editionKind: review.editionKind, textScope: review.textScope }
  return { before, reviews: [review] }
}

function englishIsbnlessFixture() {
  const { before } = fixture()
  before.contents[0].metadata.figureBook = { workTitle: 'Paradise Lost', workCreator: 'John Milton' }
  const providerProductId = 'OL20458778M', providerUrl = `https://openlibrary.org/books/${providerProductId}`
  // 실제 OL의 1826년 영어 서지를 사용한다. 독립 판권·본문 근거는 명시적인 테스트 대역이다.
  const sourceUrl = 'https://library.example/fixtures/milton-1826-title-page-and-text'
  Object.assign(before.content_locales[0], { title: 'Paradise Lost: A Poem in Twelve Books', creator: 'John Milton', isbn: null,
    publisher: 'T. Bedlington', verified: true, sources: { primary: 'openlibrary', title: providerUrl,
      provider_product_id: providerProductId, provider_edition_url: providerUrl,
      provider_edition_key: `/books/${providerProductId}`, provider_language_keys: ['/languages/eng'],
      provider_physical_format: null, translators: [], description: sourceUrl } })
  Object.assign(before.content_locales[1], { isbn: null, sources: { primary: 'none', title: 'translated' } })
  const card = before.content_locales[0]
  const review = { contentId: ids[0], locale: 'en', textLanguage: 'en', isbn: null, title: card.title, creator: card.creator,
    workTitle: 'Paradise Lost', workCreator: 'John Milton', translators: [], sourceUrl,
    reason: '독립 도서관의 판권·영문 본문 검토를 대체하는 테스트 입력이다. 1826년 T. Bedlington 영어 종이책 판본이며, 수록 권 범위를 확인하지 않아 kind와 scope는 null로 둔다.',
    editionKind: null, textScope: null }
  review.isbnlessPhysicalEditionReview = { method: 'independent_isbnless_physical_edition_review', llmReviewed: true,
    contentId: review.contentId, locale: review.locale, isbn: null, title: review.title, creator: review.creator,
    workTitle: review.workTitle, workCreator: review.workCreator, translators: [], publisher: card.publisher,
    providerProductId, providerUrl, providerEditionKey: `/books/${providerProductId}`, providerLanguageKeys: ['/languages/eng'],
    providerPhysicalFormat: null, physicalMedium: 'paper', sourceUrl, reason: review.reason, editionKind: null, textScope: null }
  return { before, reviews: [review] }
}

function omnibusFixture() {
  const { before } = fixture(), isbn = '9781584653530'
  const title = "Letter to D'Alembert and writings for the theater", creator = 'Jean-Jacques Rousseau'
  const originals = [
    { content_id: ids[0], work_identity: 'Jean-Jacques Rousseau/Pygmalion', title: 'Pygmalion', creator,
      text_scope: 'English anthology; Pygmalion pp230–236 complete; also contains separate theatrical and political writings' },
    { content_id: ids[1], work_identity: 'wikidata:q6533603', title: "Letter to M. D'Alembert on Spectacles", creator,
      text_scope: "English anthology; Letter to M. D'Alembert on Spectacles pp251–352 complete; also contains separate plays and correspondence" },
  ]
  originals.forEach((original, index) => { before.contents[index].metadata.figureBook = {
    workTitle: original.title, workCreator: creator, workIdentity: original.work_identity } })
  const proof = index => ({ method: 'independent_omnibus_review', content_id: ids[index], locale: 'en', isbn,
    work_identity: originals[index].work_identity, original_title: originals[index].title, original_creator: creator,
    edition_title: title, edition_creator: creator, edition_kind: 'selection', text_scope: originals[index].text_scope,
    source_url: 'https://books.google.co.kr/books?id=8PXayjdeC1gC&pg=PR3',
    toc_source_url: 'https://books.google.co.kr/books?id=8PXayjdeC1gC&pg=PR5', reviewed_at: '2026-10-12T10:00:00Z',
    owner_content_ids: [...ids], contained_originals: structuredClone(originals) })
  const card = (index, translators) => ({ content_id: ids[index], locale: 'en', isbn, title, creator,
    publisher: 'Dartmouth College', description: 'The exact original and its anthology scope are described here.',
    thumbnail_url: null, verified: true, sources: { primary: 'openlibrary', translators,
      provider_edition_url: 'https://openlibrary.org/books/OL3679063M', work_attribution: proof(index) } })
  before.content_locales[0] = card(0, ['Christopher Kelly'])
  Object.assign(before.content_locales[1], { isbn: null, sources: { primary: 'none', title: 'translated' } })
  before.content_locales[3] = card(1, ['Allan Bloom'])
  before.figure_book_contents.push({ content_id: ids[1], created_at: timestamp, updated_at: timestamp })
  before.figure_book_editions.push({ ...card(1, ['Allan Bloom']), id: 99, edition_kind: 'selection',
    text_scope: originals[1].text_scope, sort_order: 0, release_date: null, created_at: timestamp, updated_at: timestamp })
  const reviews = [{ contentId: ids[0], locale: 'en', textLanguage: 'en', isbn, title, creator,
    workTitle: originals[0].title, workCreator: creator, translators: ['Christopher Kelly'],
    sourceUrl: proof(0).source_url, reason: 'The source-approved title, copyright, named translator, TOC and opening/ending of the complete Pygmalion were read; registered owners identify distinct originals, not the entire book contents.',
    editionKind: 'selection', textScope: originals[0].text_scope }]
  return { before, reviews }
}

test('a stored independent omnibus review shares the actual ISBN across distinct originals without merging or changing the retained edition', async () => {
  const { before, reviews } = omnibusFixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), plan)
  assert.deepEqual(plan.omnibusGroups, [{ isbn: reviews[0].isbn, ownerIds: ids, currentOwnerIds: ids }])
  const after = committed(before, reviews); let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, compact, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.checkedTables, 18); assert.equal(result.insertedParents, 1)
  assert.deepEqual(after.figure_book_editions.find(row => row.id === 99), before.figure_book_editions[0])
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_contents', 'figure_book_editions'].includes(table)))
    assert.deepEqual(after[table], before[table])
  assert.deepEqual(before, original)
  assert.notEqual(after.contents[0].metadata.figureBook.workIdentity, after.contents[1].metadata.figureBook.workIdentity)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /omnibus ISBN owner set changed/)
  assert.match(sql, /'1584653531'/); assert.match(sql, /'9781584653530'/)
  assert.match(sql, /FROM public.contents WHERE type='BOOK'/)
  assert.match(sql, /UNION SELECT content_id::text FROM public.content_locales/)
  assert.match(sql, /UNION SELECT content_id::text FROM public.figure_book_editions/)
  assert.match(sql, /LOCK TABLE[^;]*public.contents,\s*public.content_locales IN SHARE ROW EXCLUSIVE MODE/)
  assert.doesNotMatch(sql, /ISBN already registered|UPDATE public.figure_book_editions[^;]*WHERE id=99|DELETE FROM|SET content_id=/)
})

test('omnibus sharing refuses missing/stale owner proofs, different originals or scope, unsupported official cards and unassigned owners', () => {
  const changes = [
    s => { delete s.content_locales[0].sources.work_attribution },
    s => { delete s.figure_book_editions[0].sources.work_attribution },
    s => { s.content_locales[0].sources.primary = 'none' },
    s => { s.figure_book_editions[0].verified = false },
    s => { s.figure_book_editions[0].sources.provider_edition_url = 'https://publisher.example/edition' },
    s => { s.contents[1].metadata.figureBook.workIdentity = s.contents[0].metadata.figureBook.workIdentity },
    s => { s.figure_book_editions[0].text_scope = 'different scope' },
    s => { s.content_locales.push({ content_id: 'unknown-owner', locale: 'en', isbn: '1584653531' }) },
  ]
  for (const field of ['content_id', 'locale', 'isbn', 'work_identity', 'original_title', 'original_creator', 'edition_title',
    'edition_creator', 'edition_kind', 'text_scope', 'reviewed_at', 'source_url', 'toc_source_url'])
    for (const place of ['card', 'retained']) changes.push(s => {
      const row = place === 'card' ? s.content_locales[0] : s.figure_book_editions[0]
      row.sources.work_attribution[field] = 'different'
    })
  for (const place of ['card', 'retained']) {
    const getProof = s => (place === 'card' ? s.content_locales[0] : s.figure_book_editions[0]).sources.work_attribution
    changes.push(s => { getProof(s).owner_content_ids = [ids[0]] })
    changes.push(s => { getProof(s).owner_content_ids.push('unknown-owner') })
    changes.push(s => { getProof(s).contained_originals.pop() })
    for (const field of ['work_identity', 'title', 'creator', 'text_scope']) changes.push(s => {
      getProof(s).contained_originals[1][field] = 'different'
    })
  }
  for (const change of changes) {
    const { before, reviews } = omnibusFixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /omnibus reviews|wrong primary/)
  }
  const { before, reviews } = omnibusFixture()
  assert.throws(() => planReviewedCatalogInsert([ids[0]], before, reviews), /assigned original/)
  reviews[0].work_attribution = before.figure_book_editions[0].sources.work_attribution
  delete before.content_locales[0].sources.work_attribution
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /omnibus reviews/)
  const sameOwner = fixture()
  sameOwner.before.content_locales[1].isbn = sameOwner.reviews[1].isbn = sameOwner.reviews[0].isbn
  sameOwner.before.content_locales[1].sources.isbn = 'https://search.daum.net/search?w=bookpage&bookId=123'
  assert.throws(() => planReviewedCatalogInsert(ids, sameOwner.before, sameOwner.reviews), /duplicate locale or ISBN/)
})

test('omnibus ISBN owner races fail in the transaction and protected or retained-row mutations fail independent readback', async () => {
  const { before, reviews } = omnibusFixture(), paths = []; let reads = 0, writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => { reads++; return before }, execute(path) {
      paths.push(path); writes++
      const sql = readFileSync(path, 'utf8')
      assert.ok(sql.indexOf('omnibus ISBN owner set changed') < sql.indexOf('INSERT INTO public.figure_book_contents'))
      throw Error('CATALOG_INSERT: omnibus ISBN owner set changed')
    },
  }), /owner set changed/)
  assert.equal(reads, 1); assert.equal(writes, 1); assert.ok(paths.every(path => !existsSync(path)))
  for (const change of [s => { s.celeb_contents[0].review = 'changed' }, s => { s.celeb_contents[0].visibility = 'private' },
    s => { s.member_contents[0].rating = 1 }, s => { s.figure_book_editions[0].sources.translators = ['wrong translator'] },
    s => { s.figure_book_editions[0].text_scope = 'changed' }, s => { s.content_locales[3].isbn = '9780140449136' }]) {
    const after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
})

test('independently reviewed pre-ISBN English paper edition binds the actual OpenLibrary M and raw language', async () => {
  const { before, reviews } = englishIsbnlessFixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), plan)
  assert.deepEqual(plan.editions[0].sources.isbnless_physical_edition_evidence, reviews[0].isbnlessPhysicalEditionReview)
  assert.equal(plan.editions[0].isbn, null); assert.equal(plan.editions[0].edition_kind, null)
  const after = committed(before, reviews); let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, compact, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.checkedTables, 18); assert.deepEqual(before, original)
  assert.deepEqual(result.insertedEditions, [{ contentId: ids[0], locale: 'en', isbn: null, id: 100 }])
  before.figure_book_contents.push({ content_id: ids[0], created_at: timestamp, updated_at: timestamp })
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.doesNotMatch(sql, /ISBN already registered|isbn=NULL|isbn IN \(\)/)
})

test('ISBN-less English proof rejects display cards, foreign or unknown language, changed M keys and forged provider URLs', () => {
  const changes = [
    s => { s.content_locales[0].sources.primary = 'none' },
    s => { s.content_locales[0].sources.primary = 'kakao_book' },
    s => { s.content_locales[0].sources.title = 'display_only' },
    s => { s.content_locales[0].verified = false },
    (s, r) => { delete r.isbnlessPhysicalEditionReview },
    (s, r) => { r.isbnlessPhysicalEditionReview.locale = 'ko' },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 'OL20458778W' },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 'OL16920547M' },
    s => { s.content_locales[0].sources.provider_edition_key = '/books/OL16920547M' },
    s => { delete s.content_locales[0].sources.provider_edition_key },
    s => { delete s.content_locales[0].sources.provider_language_keys },
    (s, r) => { s.content_locales[0].sources.provider_language_keys = r.isbnlessPhysicalEditionReview.providerLanguageKeys = [] },
    (s, r) => { s.content_locales[0].sources.provider_language_keys = r.isbnlessPhysicalEditionReview.providerLanguageKeys = ['/languages/fre'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerLanguageKeys = ['/languages/eng', '/languages/fre'] },
    (s, r) => { delete r.isbnlessPhysicalEditionReview.providerPhysicalFormat },
    s => { delete s.content_locales[0].sources.provider_physical_format },
    (s, r) => { r.isbnlessPhysicalEditionReview.physicalMedium = 'digital' },
    (s, r) => { r.isbnlessPhysicalEditionReview.translators = ['Unverified Translator'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.publisher = 'Different Publisher' },
  ]
  for (const format of ['Microform', 'Microfilm', 'Microfiche', 'Audio CD', 'eBook', 'Electronic resource', 'Digital'])
    changes.push((s, r) => { s.content_locales[0].sources.provider_physical_format = r.isbnlessPhysicalEditionReview.providerPhysicalFormat = format })
  for (const url of ['https://openlibrary.org/books/OL16920547M', 'https://openlibrary.org/works/OL20458778W',
    'https://openlibrary.org/books/OL20458778M?lang=en', 'https://openlibrary.org/books/OL20458778M#paper',
    'http://openlibrary.org/books/OL20458778M', 'https://openlibrary.org.example/books/OL20458778M'])
    changes.push((s, r) => { s.content_locales[0].sources.provider_edition_url = r.isbnlessPhysicalEditionReview.providerUrl = url })
  for (const change of changes) {
    const { before, reviews } = englishIsbnlessFixture(); change(before, reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical|verified translators/)
  }
})

test('ISBN-less English paper proof remains subject to full CAS and all protected relationships', async () => {
  for (const change of [s => { s.celeb_contents[0].review = '변경' }, s => { s.celeb_contents[0].source_url = 'https://other.example' },
    s => { s.celeb_contents[0].visibility = 'private' }, s => { s.member_contents[0].rating = 1 },
    s => { s.content_locales[0].sources.provider_language_keys = [] },
    s => { s.figure_book_editions[0].sources.isbnless_physical_edition_evidence.providerEditionKey = '/books/OL16920547M' }]) {
    const { before, reviews } = englishIsbnlessFixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
  const { before, reviews } = englishIsbnlessFixture(), compact = compactReviews(before, reviews)
  before.content_locales[0].sources.provider_edition_key = '/books/OL16920547M'
  let writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, compact, { capture: async () => before,
    execute: () => { writes++; return '' } }), /ISBN-less physical/)
  assert.equal(writes, 0)
})

test('independently read ISBN-less Kakao physical editions retain NULL and exact provider/source identity', async () => {
  const { before, reviews } = isbnlessFixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), plan)
  assert.equal(plan.editions[0].isbn, null)
  assert.deepEqual(plan.editions[0].sources.isbnless_physical_edition_evidence, reviews[0].isbnlessPhysicalEditionReview)
  assert.equal(plan.editions[0].sources.edition_text_scope_evidence.isbn, null)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /AND isbn IS NULL;/)
  assert.match(sql, /active automatic edition seed required/)
  assert.doesNotMatch(sql, /isbn=E'null'|isbn=NULL|isbn IN \(\)|ISBN already registered/)
  const after = committed(before, reviews), paths = []; let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, compact, {
    capture: async () => ++reads === 1 ? before : after,
    execute(path) { paths.push(path); return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' },
  })
  assert.deepEqual(result.insertedEditions, [{ contentId: ids[0], locale: 'ko', isbn: null, id: 100 }])
  assert.equal(result.checkedTables, 18); assert.equal(reads, 2)
  assert.ok(paths.every(path => !existsSync(path))); assert.deepEqual(before, original)
})

test('unrelated NULL editions and two distinct ISBN-less works are not global ISBN duplicates', () => {
  const { before, reviews } = isbnlessFixture()
  before.figure_book_contents.push({ content_id: ids[1], created_at: timestamp, updated_at: timestamp })
  before.figure_book_editions.push({ id: 99, content_id: ids[1], locale: 'en', isbn: null, title: 'Unrelated physical original' })
  assert.equal(planReviewedCatalogInsert(ids, before, reviews).editions.length, 1)
  const second = structuredClone(reviews[0]), card = before.content_locales[2]
  Object.assign(card, structuredClone(before.content_locales[1]), { content_id: ids[1], title: '두 번째 실물', creator: '다른 작가',
    sources: { ...structuredClone(before.content_locales[1].sources), provider_product_id: '74320',
      provider_edition_url: 'https://search.daum.net/search?w=bookpage&bookId=74320' } })
  Object.assign(second, { contentId: ids[1], title: card.title, creator: card.creator,
    workTitle: 'Existing original B', workCreator: 'Original Author B' })
  Object.assign(second.isbnlessPhysicalEditionReview, { contentId: second.contentId, title: second.title, creator: second.creator,
    workTitle: second.workTitle, workCreator: second.workCreator, providerProductId: '74320', providerUrl: card.sources.provider_edition_url })
  const selected = [...reviews, second], sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.equal(planReviewedCatalogInsert(ids, before, selected).editions.length, 2)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.doesNotMatch(sql, /ISBN already registered/)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, selected, committed(before, selected)).checkedTables, 18)
  assert.throws(() => planReviewedCatalogInsert(ids, before, [...selected, second]), /duplicate locale/)
})

test('ISBN-less display cards, missing independent proof and stale live/proof identities are refused', () => {
  const changes = [
    (s, r) => { delete r.isbnlessPhysicalEditionReview },
    (s, r) => { r.isbnlessPhysicalEditionReview.llmReviewed = false },
    (s, r) => { r.isbnlessPhysicalEditionReview.method = 'machine_review' },
    s => { s.content_locales[1].sources.primary = 'none' },
    s => { s.content_locales[1].sources.primary = 'openlibrary' },
    s => { s.content_locales[1].sources.title = 'display_only' },
    s => { s.content_locales[1].sources.title = 'kakao_title_search' },
    s => { s.content_locales[1].verified = false },
    s => { s.content_locales[1].publisher = null },
    s => { delete s.contents[0].metadata.figureBook.workTitle },
    s => { s.content_locales[1].sources.provider_product_id = '999' },
    s => { delete s.content_locales[1].sources.provider_edition_url },
    s => { s.content_locales[1].sources.translators = ['다른 역자'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = 74319 },
    (s, r) => { r.isbnlessPhysicalEditionReview.providerProductId = '999' },
    (s, r) => { r.isbnlessPhysicalEditionReview.translators = ['다른 역자'] },
    (s, r) => { r.isbnlessPhysicalEditionReview.publisher = '다른 출판사' },
  ]
  for (const field of ['contentId', 'locale', 'isbn', 'title', 'creator', 'workTitle', 'workCreator', 'sourceUrl', 'reason', 'editionKind', 'textScope'])
    changes.push((s, r) => { r.isbnlessPhysicalEditionReview[field] = 'different' })
  for (const change of changes) {
    const { before, reviews } = isbnlessFixture(); change(before, reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical|verified translators/)
  }
  for (const url of ['http://search.daum.net/search?w=bookpage&bookId=74319',
    'https://search.daum.net/search?w=bookpage&bookId=999', 'https://search.daum.net/other?w=bookpage&bookId=74319',
    'https://search.daum.net/search?w=book&bookId=74319', 'https://example.org/search?w=bookpage&bookId=74319']) {
    const { before, reviews } = isbnlessFixture()
    before.content_locales[1].sources.provider_edition_url = reviews[0].isbnlessPhysicalEditionReview.providerUrl = url
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /ISBN-less physical/)
  }
  for (const sourceUrl of ['https://search.daum.net/search?w=bookpage&bookId=74319',
    'https://dapi.kakao.com/v3/search/book?query=플라톤', 'https://openlibrary.org/books/OL123M']) {
    const { before, reviews } = isbnlessFixture()
    reviews[0].sourceUrl = reviews[0].isbnlessPhysicalEditionReview.sourceUrl = sourceUrl
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /independent|ISBN-less physical/)
  }
  const real = fixture(); real.reviews[1].isbnlessPhysicalEditionReview = isbnlessFixture().reviews[0].isbnlessPhysicalEditionReview
  assert.throws(() => planReviewedCatalogInsert(ids, real.before, real.reviews), /explicitly null ISBN/)
})

test('ISBN-less physical insertion retains full snapshot CAS and all protected rows', async () => {
  for (const table of SNAPSHOT_TABLES) {
    const { before, reviews } = isbnlessFixture(), after = committed(before, reviews)
    after[table].push({ id: 'unexpected' })
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ|identity/)
  }
  for (const change of [s => { s.celeb_contents[0].review = '감상 변경' }, s => { s.celeb_contents[0].source_url = 'https://other.example' },
    s => { s.celeb_contents[0].visibility = 'private' }, s => { s.member_contents[0].rating = 1 },
    s => { s.contents[0].member_count = 0 }, s => { s.content_locales[1].isbn = '9780140449273' },
    s => { s.figure_book_editions[0].sources.isbnless_physical_edition_evidence.reason = '변경' }]) {
    const { before, reviews } = isbnlessFixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
  const { before, reviews } = isbnlessFixture(), after = committed(before, reviews); let reads = 0
  after.celeb_contents[0].review_en = 'Unexpected change'
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => { reads++; return before },
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /celeb_contents rows differ/)
  assert.equal(reads, 1)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.doesNotMatch(sql, /DISABLE TRIGGER|UPDATE public\.(?:contents|content_locales|celeb_contents|member_contents)/)
})

test('one parent per original seeds both reviewed real languages while preserving display cards and unknown scope', () => {
  const { before, reviews } = fixture(), original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(plan.parentIds, ids); assert.equal(plan.editions.length, 3)
  assert.equal(plan.editions[0].edition_kind, null); assert.equal(plan.editions[0].text_scope, null)
  assert.equal(plan.editions[0].publisher, 'English Publisher'); assert.equal(plan.editions[0].release_date, null)
  assert.deepEqual(plan.editions[1].sources.translators, ['실제 역자'])
  assert.equal(plan.editions[1].description, before.content_locales[1].description)
  assert.equal(plan.editions[1].sources.description, before.content_locales[1].sources.description)
  assert.deepEqual(before, original)
})

test('physical edition dates remain unknown unless independently reviewed for each ISBN', () => {
  const { before, reviews } = fixture()
  const original = structuredClone(before)
  reviews[0].editionReleaseDate = '2017-02-28'
  reviews[1].editionReleaseDate = '2024-02-29'
  const plan = planReviewedCatalogInsert(ids, before, reviews)
  assert.deepEqual(plan.editions.map(row => row.release_date), ['2017-02-28', '2024-02-29', null])
  assert.deepEqual(before, original)
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.match(sql, /release_date=E'2017-02-28'/)
  assert.match(sql, /release_date=E'2024-02-29'/)
  assert.match(sql, /release_date=NULL/)
  for (const invalid of ['2023-02-29', '2024-02-30', '2024-13-01', '2024-01', '2024-01-01T00:00:00Z', '', 20240101]) {
    reviews[0].editionReleaseDate = invalid
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /invalid reviewed edition release date/)
  }
})
const compactReviews = (before, reviews) => bindReviewedCatalogInsertIdentity(before, reviews.map(review => {
  const result = { ...review }
  for (const key of ['title', 'creator', 'workTitle', 'workCreator', 'translators']) delete result[key]
  return result
}))

test('explicitly reviewed snapshot identity produces the identical plan and SQL without duplicating bibliography', () => {
  const { before, reviews } = fixture(), original = structuredClone(before), compact = compactReviews(before, reviews)
  assert.deepEqual(planReviewedCatalogInsert(ids, before, compact), planReviewedCatalogInsert(ids, before, reviews))
  assert.equal(buildReviewedCatalogInsertSql(ids, before, compact), buildReviewedCatalogInsertSql(ids, before, reviews))
  const after = committed(before, compact)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, compact, after).checkedTables, 18)
  assert.deepEqual(before, original)
  assert.deepEqual(compact, compactReviews(before, reviews))
})

test('compact input cannot silently invent an anchor, mask conflicting explicit identity or infer the review decision', () => {
  for (const change of [s => { delete s.contents[0].metadata.figureBook.workTitle },
    s => { s.contents[0].metadata.figureBook.workCreator = '' },
    s => { s.content_locales.push(structuredClone(s.content_locales[0])) }]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => compactReviews(before, reviews), /reviewed original anchor/)
  }
  for (const key of ['title', 'creator', 'workTitle', 'workCreator', 'translators']) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews)
    compact[0][key] = key === 'translators' ? [] : 'Conflicting input'
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /mixed with explicit identity/)
  }
  for (const [field, value, message] of [['useReviewedSnapshotIdentity', false, /independent work review/],
    ['isbn', '9780140444964', /live locale/], ['textLanguage', 'ko', /exact text language/],
    ['sourceUrl', 'https://openlibrary.org/books/OL1234M', /independent work review/],
    ['reason', '', /independent work review/], ['editionKind', undefined, /reviewed kind/],
    ['textScope', undefined, /reviewed kind/]]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews); compact[0][field] = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), message)
  }
})

test('compact decisions stay bound to the exact reviewed identity before a fresh live capture', () => {
  for (const change of [s => { s.content_locales[0].title = 'Other book' }, s => { s.content_locales[0].creator = 'Other writer' },
    s => { s.contents[0].metadata.figureBook.workTitle = 'Other original' },
    s => { s.contents[0].metadata.figureBook.workCreator = 'Other original writer' },
    s => { s.content_locales[1].sources.translators = ['다른 역자'] }]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /snapshot identity changed/)
  }
  for (const value of [undefined, '', '0'.repeat(64)]) {
    const { before, reviews } = fixture(), compact = compactReviews(before, reviews)
    compact[0].reviewedIdentityHash = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, compact), /binding missing/)
  }
})

test('missing 18-table state, absent BOOK and unassigned work fail before execution', () => {
  const { before, reviews } = fixture()
  const missing = structuredClone(before); delete missing.tier_lists
  assert.throws(() => planReviewedCatalogInsert(ids, missing, reviews), /full snapshot tier_lists/)
  const video = structuredClone(before); video.contents[0].type = 'VIDEO'
  assert.throws(() => planReviewedCatalogInsert(ids, video, reviews), /existing assigned BOOK/)
  assert.throws(() => planReviewedCatalogInsert([ids[0]], before, reviews), /assigned owner/)
  assert.throws(() => planReviewedCatalogInsert([ids[0], ids[0]], before, reviews), /distinct assigned/)
})

test('existing editions, duplicate parents and duplicate ISBNs are refused instead of being duplicated', () => {
  for (const change of [s => s.figure_book_contents.push({ content_id: ids[0] }, { content_id: ids[0] }), s => s.figure_book_editions.push({ id: 99, content_id: ids[0], isbn: null }),
    s => s.figure_book_editions.push({ id: 99, content_id: 'other', isbn: '9780451464163' }), s => s.content_locales.push({ content_id: 'other', locale: 'en', isbn: '9780451464163' })]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /existing catalog|existing edition|ISBN already/)
  }
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [...reviews, reviews[0]]), /duplicate locale or ISBN/)
  const duplicate = structuredClone(reviews); duplicate[2].isbn = reviews[0].isbn
  assert.throws(() => planReviewedCatalogInsert(ids, before, duplicate), /duplicate locale or ISBN|live locale/)
})

test('a reviewed missing language preserves the existing physical edition and its product history exactly', () => {
  const { before, reviews } = fixture()
  before.figure_book_contents.push({ content_id: ids[0], created_at: timestamp, updated_at: timestamp })
  const retained = { ...planReviewedCatalogInsert(ids, fixture().before, reviews).editions[1], id: 99, created_at: timestamp, updated_at: timestamp }
  before.figure_book_editions.push(retained)
  before.figure_book_products.push({ id: 70, edition_id: 99, platform: 'shop', is_active: true })
  const selected = [reviews[0]], original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, selected)
  assert.deepEqual(plan.newParentIds, []); assert.deepEqual(plan.existingParentIds, [ids[0]])
  const after = committed(before, selected)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, selected, after).checkedTables, 18)
  assert.deepEqual(after.figure_book_editions.find(row => row.id === 99), retained)
  assert.deepEqual(after.figure_book_products, before.figure_book_products)
  assert.deepEqual(before, original)
  const sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_contents/)
  assert.match(sql, /INSERT INTO public.figure_book_editions/)
  assert.throws(() => planReviewedCatalogInsert(ids, before, [reviews[1]]), /existing edition for locale/)
  const changed = structuredClone(after); changed.figure_book_editions.find(row => row.id === 99).description = 'Unexpected change'
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, selected, changed), /figure_book_editions/)
  const orphan = structuredClone(before); orphan.figure_book_contents = []
  assert.throws(() => planReviewedCatalogInsert(ids, orphan, selected), /without catalog parent/)
})

test('English Kakao, swapped providers and unbound official URLs are rejected by the plan', () => {
  for (const change of [s => { s.content_locales[0].sources.primary = 'kakao_book' }, s => { s.content_locales[1].sources.primary = 'openlibrary' },
    s => { s.content_locales[0].sources.isbn = 'https://publisher.example/a' }, s => { s.content_locales[2].sources.isbn += '999' }]) {
    const { before, reviews } = fixture(); change(before)
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /wrong primary|official ISBN binding/)
  }
})

test('every real card must be reviewed before the parent trigger runs; no-ISBN real placeholders are refused', () => {
  const { before, reviews } = fixture()
  assert.throws(() => planReviewedCatalogInsert(ids, before, [reviews[0], reviews[2]]), /unreviewed locale/)
  const real = structuredClone(before); real.content_locales[3].sources.primary = 'openlibrary'
  assert.throws(() => planReviewedCatalogInsert(ids, real, reviews), /unreviewed locale/)
  const invalidDisplay = structuredClone(before); invalidDisplay.content_locales[3].isbn = '9780140444964'
  assert.throws(() => planReviewedCatalogInsert(ids, invalidDisplay, reviews), /unreviewed locale/)
})

test('a source-reviewed excluded card is preserved while only the other real language is registered', () => {
  const {before,reviews}=fixture(),card=before.content_locales[1]
  const proof={method:'independent_selection_review',reason:'abridged',isbn:card.isbn,locale:card.locale,edition_title:card.title,
    source_url:'https://publisher.example/exact-abridged-isbn',explanation:'Publisher explicitly confirms that this ISBN reduces the original chapter bodies.'}
  card.sources.edition_selection_evidence=[proof]
  const selected=[reviews[0],reviews[2]],original=structuredClone(before)
  assert.equal(planReviewedCatalogInsert(ids,before,selected).editions.length,2)
  assert.deepEqual(before,original)
  for(const changed of [{isbn:'9780451464163'},{locale:'en'},{edition_title:'Different edition'},
    {source_url:'https://openlibrary.org/books/OL123M'},{reason:'low_rating'},{method:'machine_review'},{explanation:''}]) {
    const stale=structuredClone(before);stale.content_locales[1].sources.edition_selection_evidence=[{...proof,...changed}]
    assert.throws(()=>planReviewedCatalogInsert(ids,stale,selected),/unreviewed locale/)
  }
})

test('source, original anchor, actual language, live bibliography and known translators are explicit and cannot be fabricated', () => {
  for (const [field, value, message] of [
    ['sourceUrl', 'https://openlibrary.org/books/OL1234M', /independent work review/],
    ['sourceUrl', 'https://publisher.example/a?token=secret', /independent work review/],
    ['workTitle', 'Different original', /live work anchor/], ['workCreator', 'Different original author', /live work anchor/],
    ['textLanguage', 'ko', /exact text language/], ['isbn', '9780451464164', /real ISBN13/],
    ['title', 'Other product title', /live locale/], ['creator', 'Other contributor', /live locale/],
    ['editionKind', 'invented', /reviewed kind/], ['textScope', '', /reviewed kind/],
  ]) {
    const { before, reviews } = fixture(); reviews[0][field] = value
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), message)
  }
  const { before, reviews } = fixture(); reviews[1].translators = ['다른 역자']
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
  delete reviews[1].translators
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /verified translators/)
})

test('abridged, graded, later-volume and wrong-language cards remain subject to existing policy', () => {
  for (const change of [r => { r.editionKind = 'abridged' }, r => { r.textScope = 'abridged' },
    r => { r.textScope = 'volume 2 of 3' }]) {
    const { before, reviews } = fixture(); change(reviews[0])
    assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /reviewed kind|excluded or non-start/)
  }
  const { before, reviews } = fixture()
  before.content_locales[0].title = reviews[0].title = 'Oxford Bookworms Original A'
  assert.throws(() => planReviewedCatalogInsert(ids, before, reviews), /excluded or non-start/)
  const other = fixture(); other.before.contents[0].metadata.fictionSource = { editionKind: 'abridged' }
  assert.throws(() => planReviewedCatalogInsert(ids, other.before, other.reviews), /excluded or non-start/)
})

test('SQL uses automatic seed once per original and retains 18 before/after guards, FK checks and live trigger', () => {
  const { before, reviews } = fixture(), sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_editions/)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 3)
  assert.match(sql, /BEGIN ISOLATION LEVEL READ COMMITTED/)
  assert.match(sql, /active automatic edition seed required/); assert.match(sql, /unhandled foreign reference/)
  assert.match(sql, /ISBN already registered/); assert.match(sql, /SHARE ROW EXCLUSIVE MODE/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.doesNotMatch(sql, /DISABLE TRIGGER|session_replication_role|DELETE FROM|UPDATE public\.(?:contents|content_locales|celeb_contents|member_contents)/)
  assert.ok(sql.indexOf('CATALOG_INSERT_EXPECTED:') < sql.indexOf('\nCOMMIT;'))
})

test('successful execution has two full reads, one transaction and compact actual generated IDs', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews), calls = [], paths = []
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async (_db, owned) => { assert.deepEqual(owned, ids); calls.push('read'); return ++reads === 1 ? before : after },
    execute(path) { paths.push(path); calls.push('execute'); const sql = readFileSync(path, 'utf8'); assert.match(sql, /expected_editions/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED\n' },
  })
  assert.deepEqual(calls, ['read', 'execute', 'read'])
  assert.equal(result.completed, true); assert.equal(result.insertedParents, 2); assert.equal(result.checkedTables, 18)
  assert.deepEqual(result.insertedEditions.map(row => row.id), [100, 101, 102]); assert.ok(paths.every(path => !existsSync(path)))
})

test('every table and protected field is compared even if the emitted snapshot and actual readback agree', () => {
  for (const table of SNAPSHOT_TABLES) {
    const { before, reviews } = fixture(), after = committed(before, reviews)
    after[table].push({ id: 'unreviewed', field: 'unexpected' })
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), new RegExp(table + ' rows differ'))
  }
  for (const change of [s => { s.celeb_contents[0].review = 'changed' }, s => { s.member_contents[0].rating = 1 },
    s => { s.flows[0].tiers.shelf.reverse() }, s => { s.content_locales[0].description = 'changed' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ/)
  }
})

test('seeded bibliography, description/source, kind/scope, arbitrary columns and generated timestamps cannot be silently accepted', () => {
  for (const change of [s => { s.figure_book_editions[0].description = 'changed' }, s => { s.figure_book_editions[0].sources.description = 'other source' },
    s => { s.figure_book_editions[0].text_scope = 'complete' }, s => { s.figure_book_editions[0].extra_column = 'unknown' },
    s => { s.figure_book_contents[0].extra_column = 'unknown' }, s => { s.figure_book_editions[0].id = -1 },
    s => { s.figure_book_editions[1].id = s.figure_book_editions[0].id }, s => { s.figure_book_editions[0].updated_at = 'later' },
    s => { s.figure_book_contents[1].created_at = '2026-10-12T00:00:00Z' }]) {
    const { before, reviews } = fixture(), after = committed(before, reviews); change(after)
    assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, after), /rows differ|identity\/timestamp/)
  }
})

test('execution failures and missing commit proof stop with no retry and clean temporary SQL', async () => {
  const { before, reviews } = fixture(), paths = []; let writes = 0
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute(path) { paths.push(path); writes++; throw Error('seed trigger rejected') } }), /seed trigger rejected/)
  assert.equal(writes, 1); assert.ok(paths.every(path => !existsSync(path)))
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, { capture: async () => before,
    execute: () => 'MERGE_COMMITTED' }), /committed expected snapshot missing/)
})

test('a later live readback discrepancy fails even after a valid committed snapshot', async () => {
  const { before, reviews } = fixture(), committedState = committed(before, reviews), changed = structuredClone(committedState); let reads = 0
  changed.celeb_contents[0].review_en = 'corrupted'
  await assert.rejects(applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : changed,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(committedState) + '\nMERGE_COMMITTED',
  }), /actual celeb_contents rows differ/)
  assert.equal(reads, 2)
})

test('an original referenced by Remotion keeps its exact BOOK ID, locale cards and all existing references when the catalog is added', async () => {
  const { before, reviews } = fixture(), after = committed(before, reviews); let reads = 0
  // 삭제·통합용 가드를 읽지 않고 추가 경로 자체의 전후 18표 계약을 확인한다.
  const fixedOriginalId = before.contents[0].id
  const result = await applyReviewedCatalogInsert(null, ids, reviews, {
    capture: async () => ++reads === 1 ? before : after,
    execute(path) {
      const sql = readFileSync(path, 'utf8')
      assert.doesNotMatch(sql, /DELETE FROM|UPDATE public\.(?:contents|content_locales)|SET content_id=/)
      assert.match(sql, /unhandled foreign reference/)
      return 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED'
    },
  })
  assert.equal(result.completed, true)
  assert.equal(after.contents[0].id, fixedOriginalId)
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_contents', 'figure_book_editions'].includes(table)))
    assert.deepEqual(after[table], before[table])
  assert.equal(after.figure_book_contents[0].content_id, fixedOriginalId)
  assert.ok(after.figure_book_editions.filter(row => row.content_id === fixedOriginalId).length === 2)
  assert.doesNotMatch(readFileSync(new URL('./reviewed-catalog-insert.mjs', import.meta.url), 'utf8'), /checkFixedReferences/)
})

test('existing zero-edition parents keep every original field and timestamp and receive only explicitly reviewed real cards', async () => {
  const { before, reviews } = fixture()
  before.figure_book_contents = ids.map(content_id => ({ content_id, created_at: '2020-01-01T00:00:00+00:00', updated_at: '2023-02-03T04:05:06+00:00', synopsis: '기존 값' }))
  // 자동 seed가 없는 기존 부모 경로에서는 ISBN 미확인 카드를 추가하지 않는다.
  before.content_locales[1].isbn = null
  const selected = [reviews[0], reviews[2]], original = structuredClone(before)
  const plan = planReviewedCatalogInsert(ids, before, selected), after = committed(before, selected)
  assert.deepEqual(plan.newParentIds, []); assert.deepEqual(plan.existingParentIds, ids)
  assert.equal(plan.editions.length, 2)
  const sql = buildReviewedCatalogInsertSql(ids, before, selected)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/RETURNING id INTO seeded_id/g)?.length, 2)
  assert.doesNotMatch(sql, /INSERT INTO public.figure_book_contents|UPDATE public.figure_book_contents|SELECT id INTO STRICT seeded_id/)
  assert.match(sql, /unhandled foreign reference/)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  let reads = 0
  const result = await applyReviewedCatalogInsert(null, ids, selected, {
    capture: async () => ++reads === 1 ? before : after,
    execute: () => 'CATALOG_INSERT_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED',
  })
  assert.equal(result.insertedParents, 0); assert.equal(result.insertedEditions.length, 2)
  assert.deepEqual(before, original)
  for (const table of SNAPSHOT_TABLES.filter(table => table !== 'figure_book_editions')) assert.deepEqual(after[table], before[table])
  const changed = structuredClone(after); changed.figure_book_contents[0].updated_at = timestamp
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, selected, changed), /figure_book_contents rows differ/)
})

test('mixed missing-parent automatic seed and existing-parent zero-edition insert remain one atomic plan', () => {
  const { before, reviews } = fixture()
  before.figure_book_contents.push({ content_id: ids[0], created_at: '2018-01-01T00:00:00Z', updated_at: '2019-01-01T00:00:00Z' })
  const plan = planReviewedCatalogInsert(ids, before, reviews), after = committed(before, reviews)
  assert.deepEqual(plan.newParentIds, [ids[1]]); assert.deepEqual(plan.existingParentIds, [ids[0]])
  const sql = buildReviewedCatalogInsertSql(ids, before, reviews)
  assert.equal(sql.match(/INSERT INTO public.figure_book_contents\(/g)?.length, 1)
  assert.equal(sql.match(/INSERT INTO public.figure_book_editions\(/g)?.length, 2)
  assert.equal(sql.match(/SELECT id INTO STRICT seeded_id/g)?.length, 1)
  assert.match(sql, /active automatic edition seed required/)
  assert.equal(verifyReviewedCatalogInsertReadback(ids, before, reviews, after).insertedParents, 1)
  const altered = structuredClone(after); altered.figure_book_editions[0].created_at = '2026-10-12T00:00:00Z'
  altered.figure_book_editions[0].updated_at = altered.figure_book_editions[0].created_at
  assert.throws(() => verifyReviewedCatalogInsertReadback(ids, before, reviews, altered), /identity\/timestamp/)
})

function existingOriginalVolumeFixture(){
 const {before}=fixture(),work=before.contents[0]
 work.metadata.figureBook={workTitle:'John Maynard Keynes: 1883-1946',workCreator:'Robert Skidelsky',workIdentity:'robert-skidelsky/john-maynard-keynes-1883-1946',originalTitle:'John Maynard Keynes',originalCreator:'Robert Skidelsky'}
 for(const card of before.content_locales.filter(c=>c.content_id===ids[0])){card.creator='Robert Skidelsky';if(card.locale==='en'){card.isbn='9780143036159';card.description='The revised and abridged definitive single-volume biography remains unchanged.'}}
 before.figure_book_contents=[{content_id:ids[0],created_at:timestamp,updated_at:timestamp}];before.figure_book_editions=[]
 const sourceUrl='https://www.cambridge.org/core/services/aop-cambridge-core/content/view/first-volume-penguin-advertisement.pdf',providerUrl='https://openlibrary.org/books/OL7350863M'
 const review={contentId:ids[0],locale:'en',isbn:'9780140235548',title:'John Maynard Keynes: Volume 1',creator:'Robert Skidelsky',workTitle:work.metadata.figureBook.workTitle,workCreator:'Robert Skidelsky',translators:[],textLanguage:'en',sourceUrl,reason:'The actual Penguin advertisement identifies the original biography first volume Hopes Betrayed 1883–1920 and exact ISBN; preserve the old single-volume cards and do not copy their introduction.',editionKind:'volume',textScope:'volume/1',editionReleaseDate:null}
 const edition={content_id:ids[0],locale:'en',isbn:review.isbn,title:review.title,creator:review.creator,publisher:'Penguin (Non-Classics)',description:null,thumbnail_url:'https://covers.openlibrary.org/b/id/98649-L.jpg',release_date:null,edition_kind:'volume',text_scope:'volume/1',sort_order:0,verified:true,sources:{primary:'openlibrary',isbn:providerUrl,title:providerUrl,creator:providerUrl,publisher:providerUrl,workKey:'/works/OL7975009W',provider_edition_url:providerUrl}}
 review.existingOriginalVolumeReview={method:'independent_existing_original_first_volume_review',llmReviewed:true,currentWork:structuredClone(work),workAnchor:structuredClone(work.metadata.figureBook),beforeLocaleCards:structuredClone(before.content_locales),beforeEditions:[],currentGlobalIsbnOwners:[],edition,
 officialProvider:{httpStatus:200,sourceUrl:providerUrl,fetchedUrl:'https://openlibrary.org/isbn/9780140235548.json',response:{key:'/books/OL7350863M',type:{key:'/type/edition'},title:review.title,subtitle:'Hopes Betrayed 1883-1920 (John Maynard Keynes)',authors:[{key:'/authors/OL2657967A'}],publishers:['Penguin (Non-Classics)'],publish_date:'January 1, 1994',isbn_13:[review.isbn],isbn_10:['014023554X'],covers:[98649],languages:[{key:'/languages/eng'}],works:[{key:'/works/OL7975009W'}]},authorRecords:[{httpStatus:200,sourceUrl:'https://openlibrary.org/authors/OL2657967A',fetchedUrl:'https://openlibrary.org/authors/OL2657967A.json',response:{key:'/authors/OL2657967A',type:{key:'/type/author'},name:'Robert Skidelsky'}}]},
 sourceUrl,sourceKind:'publisher',bodyLanguage:'en',physicalMedium:'paper',bodyEvidence:'The actual Penguin advertisement distinguishes the English first biography volume Hopes Betrayed 1883–1920 from later volumes.',creditEvidence:'The author is Robert Skidelsky in the edition author record and the independent Penguin original-biography advertisement.',physicalIdentityEvidence:'The publisher advertisement explicitly lists the print first-volume ISBN 0-14-023554-x, bound to the exact edition record.',
 originalLanguageReview:{llmReviewed:true,originalLanguage:'en',sourceUrl,originalPublicationConfirmed:true,bodyEvidence:'The independently read publisher advertisement identifies the original English biography series, not an English translation.',creditEvidence:'The actual original publisher credits Skidelsky as writer of the English biography first volume.'},
 scopeReview:{llmReviewed:true,sourceUrl,isbn:review.isbn,editionTitle:review.title,firstVolume:1,includedOriginalParts:[1],editionKind:'volume',textScope:'volume/1',wholeWorkClaimed:false,translationClaimed:false,equivalentSingleVolumeBodyClaimed:false,scopeEvidence:'VOL.1:HOPES BETRAYED1883–1920 0-14-023554-x is listed separately from VOL.2 and VOL.3 in the Penguin advertisement.'}}
 return {before,reviews:[review]}
}

test('existing ED0 original first volume adds only the source-bound official edition with no copied description or card changes',()=>{
 const {before,reviews}=existingOriginalVolumeFixture(),copy=structuredClone(before),plan=planReviewedCatalogInsert(ids,before,reviews)
 assert.deepEqual(before,copy);assert.deepEqual(plan.newParentIds,[]);assert.equal(plan.editions.length,1)
 assert.equal(plan.editions[0].description,null);assert.equal(plan.editions[0].sources.description,undefined)
 assert.equal(plan.editions[0].sources.description_method,undefined);assert.equal(plan.editions[0].sources.description_source_locale,undefined)
 assert.equal(plan.editions[0].edition_kind,'volume');assert.equal(plan.editions[0].text_scope,'volume/1')
 assert.equal(plan.editions[0].sources.existingOriginalVolumeReview,undefined)
 const after=committed(before,reviews);assert.doesNotThrow(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after));assert.deepEqual(after.content_locales,before.content_locales)
 const sql=buildReviewedCatalogInsertSql(ids,before,reviews)
 assert.match(sql,/original starting volume ISBN already registered globally/);assert.ok(sql.includes("E'014023554X'"))
 assert.match(sql,/public.contents/);assert.match(sql,/public.content_locales/);assert.match(sql,/SHARE ROW EXCLUSIVE MODE/)
 assert.doesNotMatch(sql,/UPDATE public.content_locales|INSERT INTO public.contents|DELETE FROM public.figure_book_editions/)
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
})

test('original starting volume rejects stale cards/anchors, wrong author/language/body, later parts, whole claims and copied introductions',()=>{
 for(const mutate of [
 p=>p.llmReviewed=false,p=>p.currentWork.metadata.figureBook.workCreator='Other author',p=>p.workAnchor.workIdentity='other',
 p=>p.beforeLocaleCards[0].description='Changed existing introduction',p=>p.beforeEditions=[{id:1}],p=>p.currentGlobalIsbnOwners=['outside-owner'],
 p=>p.edition.description='Copied single-volume introduction',p=>p.edition.sources.description='https://publisher.example/old',p=>p.edition.sources.description_method='research',
 p=>p.edition.sources.description_source_locale='en',p=>p.edition.sources.translators=['Invented translator'],p=>p.edition.sources.rawResponse={},
 p=>p.edition.publisher='Other publisher',p=>p.edition.thumbnail_url='https://covers.openlibrary.org/b/id/999-L.jpg',p=>p.edition.sources.workKey='/works/OL1W',
 p=>p.officialProvider.httpStatus=404,p=>p.officialProvider.fetchedUrl='https://openlibrary.org/isbn/9780143036159.json',p=>p.officialProvider.response.isbn_13=['9780143036159'],
 p=>p.officialProvider.response.isbn_13=['9780140235548','9780143036159'],p=>p.officialProvider.response.isbn_10=['0143036157'],
 p=>p.officialProvider.response.languages=[],p=>p.officialProvider.response.languages=[{key:'/languages/ger'}],p=>p.officialProvider.response.physical_format='ebook',
 p=>p.officialProvider.response.authors=[{key:'/authors/OL1A'}],p=>p.officialProvider.authorRecords[0].response.name='Another writer',
 p=>p.officialProvider.authorRecords[0].httpStatus=404,p=>p.sourceKind='search_snippet',p=>p.bodyLanguage='ko',p=>p.bodyEvidence='',
 p=>p.originalLanguageReview.originalLanguage='und',p=>p.originalLanguageReview.originalPublicationConfirmed=false,p=>p.originalLanguageReview.creditEvidence='',
 p=>p.scopeReview.firstVolume=2,p=>p.scopeReview.includedOriginalParts=[2],p=>p.scopeReview.isbn='9780143036159',p=>p.scopeReview.scopeEvidence='',
 p=>p.scopeReview.wholeWorkClaimed=true,p=>p.scopeReview.translationClaimed=true,p=>p.scopeReview.equivalentSingleVolumeBodyClaimed=true
 ]){const {before,reviews}=existingOriginalVolumeFixture();mutate(reviews[0].existingOriginalVolumeReview);assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)}
 for(const mutate of [
 (b,r)=>delete r.existingOriginalVolumeReview,(b,r)=>r.additionalTranslationReview={},(b,r)=>r.registeredBookSourceReview={},(b,r)=>r.translators=['Invented translator'],
 (b,r)=>{r.editionKind='full';r.existingOriginalVolumeReview.edition.edition_kind='full'},
 (b,r)=>{r.textScope='complete';r.existingOriginalVolumeReview.edition.text_scope='complete'},
 (b,r)=>{r.title='John Maynard Keynes: Volume 2';r.existingOriginalVolumeReview.edition.title=r.title;r.existingOriginalVolumeReview.officialProvider.response.title=r.title},
 (b,r)=>b.figure_book_contents=[],(b,r)=>b.figure_book_editions=[{id:99,content_id:ids[0],locale:'ko',isbn:'9788990106940'}],
 (b,r)=>{b.contents[0].metadata.figureBook.originalLanguage='de';r.existingOriginalVolumeReview.currentWork=structuredClone(b.contents[0])},
 (b,r)=>{b.contents[0].metadata.figureBook.originalCreator='Other author';r.existingOriginalVolumeReview.currentWork=structuredClone(b.contents[0]);r.existingOriginalVolumeReview.workAnchor.originalCreator='Other author'}
 ]){const {before,reviews}=existingOriginalVolumeFixture();mutate(before,reviews[0]);assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)}
})

test('original starting volume refuses ISBN10/13 owners and protects all eighteen rowsets during independent readback',()=>{
 for(const table of ['contents','content_locales','figure_book_editions']){
  const {before,reviews}=existingOriginalVolumeFixture()
  before[table].push(table==='contents'?{id:'outside-owner',type:'BOOK',external_id:'014023554X'}:{content_id:'outside-owner',isbn:'014023554X',locale:'en'})
  if(table==='figure_book_editions')reviews[0].existingOriginalVolumeReview.beforeEditions=structuredClone(before.figure_book_editions)
  if(table==='content_locales')reviews[0].existingOriginalVolumeReview.beforeLocaleCards=structuredClone(before.content_locales)
  assert.throws(()=>planReviewedCatalogInsert(ids,before,reviews),/CATALOG_INSERT/)
 }
 for(const mutate of [a=>a.content_locales[0].description='Changed single-volume introduction',a=>a.contents[0].metadata.figureBook.originalLanguage='en',
  a=>a.celeb_contents[0].review='Changed existing testimony',a=>a.member_contents[0].rating=0,a=>a.figure_book_editions[0].description='Old single-volume introduction',
  a=>a.figure_book_editions[0].sources.description='https://publisher.example/old',a=>a.figure_book_editions[0].text_scope='complete']){
  const {before,reviews}=existingOriginalVolumeFixture(),after=committed(before,reviews);mutate(after)
  assert.throws(()=>verifyReviewedCatalogInsertReadback(ids,before,reviews,after),/CATALOG_INSERT_READBACK/)
 }
})
