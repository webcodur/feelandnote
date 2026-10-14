import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES, sqlLiteral, validateReviewedNonstartEditionRemovals, validateReviewedCurationResolutions, findConflicts } from './merge-work-sql.mjs'
import { applyReviewedMergeBatch, buildReviewedMergeBatchSql, buildReviewedMergeSnapshotSql, captureReviewedMergeSnapshot, sliceReviewedMergeSnapshot, verifyReviewedMergePair } from './reviewed-merge-batch.mjs'

const pairs = [{ keep: 'keep-a', drop: 'drop-a' }, { keep: 'keep-b', drop: 'drop-b' }]
const empty = () => Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
function unselectedStartFixture(combined=false){
 const before=empty(),pair=pairs[0],creator='Johann Wolfgang von Goethe',locale=combined?'en':'ko'
 const sourceUrl='https://publisher.example/faust-part-two',startSourceUrl='https://publisher.example/faust-first-or-combined',selectedUrl='https://library.example/selected-translation'
 const figures=id=>({workTitle:'Faust',workCreator:creator,workIdentity:'goethe/faust',originalTitle:'Faust',originalCreator:creator,foreignEditions:[]})
 before.contents=[pair.keep,pair.drop].map(id=>({id,type:'BOOK',external_id:null,metadata:{figureBook:figures(id)},member_count:0,celeb_count:0,record_count:0}))
 before.figure_book_contents=[{content_id:pair.keep},{content_id:pair.drop}]
 const translator=combined?'Martin Greenberg':'최두환',otherTranslator=combined?'Randall Jarrell':'정경석'
 const reference={id:1,content_id:pair.keep,locale,isbn:'9781781945155',title:combined?'Faust: Parts One and Two':'괴테 파우스트 1',creator:combined?creator:'요한 볼프강 폰 괴테',publisher:'Publisher',edition_kind:null,text_scope:combined?'Parts One and Two; 2014 revised translation':null,verified:true,description:'An existing verified introduction to the first or combined edition, retained without rewriting.',sources:{translators:[translator],description:startSourceUrl,primary:combined?'openlibrary':'kakao_book'}}
 const discarded={id:2,content_id:pair.drop,locale,isbn:'9781781945162',title:'Faust, Part Two',creator:reference.creator,publisher:'Publisher',edition_kind:null,text_scope:null,verified:true,description:'An existing valid introduction to the second part, reviewed when selecting the first or combined representative.',sources:{translators:[translator],description:sourceUrl,primary:reference.sources.primary}}
 const selected={id:3,content_id:pair.keep,locale,isbn:'9780140448238',title:combined?'Faust, Part One':'파우스트',creator:combined?creator:'괴테',publisher:'Selected publisher',edition_kind:null,text_scope:null,verified:true,description:'The current default introduction stays exactly unchanged for its separately credited translation.',sources:{translators:[otherTranslator],description:selectedUrl,primary:reference.sources.primary}}
 before.figure_book_editions=[reference,discarded,selected]
 const card=row=>({content_id:row.content_id,locale,title:row.title,creator:row.creator,isbn:row.isbn,description:row.description,verified:row.verified,sources:structuredClone(row.sources)})
 before.content_locales=[card(selected),card(discarded)]
 before.celeb_contents=[{id:'reading',celeb_id:'reader',content_id:pair.keep,review:'기존 감상 원문',review_en:'Existing English reading',source_url:'https://interview.example/faust',visibility:'public'}]
 const bibliography={isbn:discarded.isbn,title:discarded.title,creator:discarded.creator,locale,publisher:discarded.publisher,source_url:sourceUrl,part:2,translators:[translator]};before.contents[0].metadata.figureBook.foreignEditions.push(bibliography)
 const anchor=work=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work.metadata.figureBook[key]??null]))
 const sourceReview=(row,url,numbers)=>({llmReviewed:true,contentId:row.content_id,isbn:row.isbn,locale:row.locale,editionTitle:row.title,editionCreator:row.creator,editionKind:row.edition_kind,textScope:row.text_scope,sourceUrl:url,creditedOriginalCreator:creator,creditedTranslators:structuredClone(row.sources.translators),includedOriginalParts:numbers,bodyEvidence:'The actual original dramatic text and the separately identified part were read in the independent source.',creditEvidence:'The actual responsibility statement identifies Goethe as author and the named translator, rather than an editor or introduction writer.',scopeEvidence:'The actual contents identify the named original part; no byte equivalence of different publication bodies is claimed.',introductionEvidence:'The current introduction accurately describes its actual part and is reviewed when selecting the retained representative.'})
 const removal={keepEditionId:1,dropEditionId:2,keepIsbn:reference.isbn,dropIsbn:discarded.isbn,keepTitle:reference.title,dropTitle:discarded.title,locale,volumeNumber:2,sourceUrl,startSourceUrl,startTextScope:reference.text_scope,startVolumeNumbers:combined?[1,2]:[1],reason:'Independent actual sources identify the first or combined edition and later part of the same credited translation, while the selected other translation remains unchanged.'}
 removal.unselectedTranslationStartReview={method:'independent_unselected_translation_start_review',llmReviewed:true,identicalBody:false,reason:removal.reason,introductionSelectionReason:'The valid first or revised combined representative is selected without rewriting existing intros or declaring its body identical to the older second-part product.',
  currentKeepWork:structuredClone(before.contents[0]),currentDropWork:structuredClone(before.contents[1]),keepWorkAnchor:anchor(before.contents[0]),dropWorkAnchor:anchor(before.contents[1]),beforeLocaleCards:structuredClone(before.content_locales),beforeEditions:structuredClone(before.figure_book_editions),referenceEdition:structuredClone(reference),discardedEdition:structuredClone(discarded),selectedLocaleCard:structuredClone(before.content_locales[0]),selectedEdition:structuredClone(selected),
  referenceSourceReview:sourceReview(reference,startSourceUrl,removal.startVolumeNumbers),discardedSourceReview:sourceReview(discarded,sourceUrl,[2]),selectedSourceReview:sourceReview(selected,selectedUrl,combined?[1]:[1,2]),retainedBibliography:structuredClone(bibliography),
  originalWorkReview:{llmReviewed:true,continuousOriginalPartsReviewed:true,workTitle:'Faust',workCreator:creator,keepWorkIdentity:'goethe/faust',dropWorkIdentity:'goethe/faust',referenceSourceUrl:startSourceUrl,discardedSourceUrl:sourceUrl,bodyEvidence:'Both actual source passages identify continuous first/second parts of Goethe’s same dramatic original, not independent criticism.',creditEvidence:'Each edition’s actual author credit was reviewed against the exact current original anchors, without mechanically inferring a creator alias.'}}
 return {before,pair,removal}
}

test('explicit unselected same-translation first/combined edition removes only the later part while preserving another default translation',()=>{
 for(const combined of [false,true]){
  const {before,pair,removal}=unselectedStartFixture(combined),copy=structuredClone(before)
  assert.deepEqual(validateReviewedNonstartEditionRemovals(pair,before,[removal]),[before.figure_book_editions[1]])
  const sql=buildReviewedMergeBatchSql([{...pair,reviewedNonstartEditionRemovals:[removal]}],before)
  assert.match(sql,/DELETE FROM public.figure_book_editions WHERE content_id=drop_id AND id IN \(2\)/)
  assert.match(sql,/canonical_id := NULL/);assert.deepEqual(before,copy)
  assert.doesNotMatch(sql,/UPDATE public.figure_book_editions SET edition_kind|UPDATE public.figure_book_editions SET text_scope/)
 }
})

test('unselected translation optional proof rejects stale originals, missing actual part/credit/intro sources and forged aliases or preserved bibliography',()=>{
 for(const mutate of [p=>p.llmReviewed=false,p=>p.identicalBody=true,p=>p.currentKeepWork.metadata.figureBook.workCreator='Other',p=>p.dropWorkAnchor.workIdentity='other',
  p=>p.beforeLocaleCards[0].description='Rewritten',p=>p.beforeEditions=[p.beforeEditions[0],p.beforeEditions[0],p.beforeEditions[0]],p=>p.referenceEdition.creator='Guessed alias',p=>p.discardedEdition.sources.translators=['Other'],p=>p.selectedLocaleCard.isbn='9781781945155',p=>p.selectedEdition.description='Changed default intro',
  p=>p.referenceSourceReview.includedOriginalParts=[2],p=>p.referenceSourceReview.scopeEvidence='',p=>p.referenceSourceReview.creditEvidence='',p=>p.referenceSourceReview.creditedOriginalCreator='Alias guessed by machine',p=>p.discardedSourceReview.includedOriginalParts=[1],p=>p.discardedSourceReview.introductionEvidence='',p=>p.selectedSourceReview.sourceUrl='https://localhost/book',p=>p.selectedSourceReview.creditedTranslators=['Other'],p=>p.originalWorkReview.continuousOriginalPartsReviewed=false,p=>p.originalWorkReview.bodyEvidence='',p=>p.retainedBibliography.part=1,p=>p.retainedBibliography.source_url='https://publisher.example/wrong',p=>p.introductionSelectionReason='',
 ]){const {before,pair,removal}=unselectedStartFixture();mutate(removal.unselectedTranslationStartReview);assert.throws(()=>validateReviewedNonstartEditionRemovals(pair,before,[removal]),/nonstart unselected translation/)}
 for(const mutate of [(b,r)=>delete r.unselectedTranslationStartReview,(b,r)=>r.startVolumeNumbers=[2],(b,r)=>r.startTextScope='complete',
  (b,r)=>b.figure_book_products.push({id:99,edition_id:2}), (b,r)=>b.member_contents.push({id:98,content_id:r.unselectedTranslationStartReview.currentDropWork.id,edition_id:2}),
  (b,r)=>{b.figure_book_editions[0].sources.translators=[];r.unselectedTranslationStartReview.referenceEdition=structuredClone(b.figure_book_editions[0]);r.unselectedTranslationStartReview.beforeEditions=structuredClone(b.figure_book_editions)},
 ]){const {before,pair,removal}=unselectedStartFixture();mutate(before,removal);assert.throws(()=>validateReviewedNonstartEditionRemovals(pair,before,[removal]),/nonstart/)}
})

test('local PostgreSQL nonstart optional review preserves both distinct default and reference translations and rejects CAS/product references',{
 skip:!process.env.PG_TEST_BIN&&'PG_TEST_BIN requires a local PostgreSQL bin directory',timeout:120000,
},async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join,resolve,basename}=await import('node:path')
 const {spawnSync}=await import('node:child_process'),{createServer}=await import('node:net'),{buildCatalogRepairSnapshotSql}=await import('./guarded-catalog-repairs.mjs')
 const directory=mkdtempSync(join(tmpdir(),'feelandnote-unselected-start-test-')),data=join(directory,'db')
 const run=(name,args,input,options={})=>{const r=spawnSync(join(process.env.PG_TEST_BIN,name+(process.platform==='win32'?'.exe':'')),args,{input,encoding:'utf8',windowsHide:true,shell:false,timeout:15000,maxBuffer:10000000,...options});if(r.error||r.status!==0)throw Error(r.error?.message??r.stderr);return r.stdout?.trim()??''}
 const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));const port=server.address().port;await new Promise(done=>server.close(done));let started=false
 t.after(()=>{if(started)run('pg_ctl',['-D',data,'-m','immediate','-w','stop']);assert(resolve(directory).startsWith(resolve(tmpdir())+(process.platform==='win32'?'\\':'/'))&&basename(directory).startsWith('feelandnote-unselected-start-test-'));if(process.platform==='win32'){const r=spawnSync('powershell',['-NoProfile','-Command',`Remove-Item -LiteralPath '${directory.replaceAll("'","''")}' -Recurse`],{windowsHide:true,shell:false,encoding:'utf8'});assert.equal(r.status,0,r.stderr)}else rmSync(directory,{recursive:true})})
 run('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8'],undefined,{timeout:120000});run('pg_ctl',['-D',data,'-l',join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],undefined,{stdio:'ignore'});started=true
 const query=sql=>run('psql',['-XqAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres'],sql)
 query(`CREATE TABLE contents(id text PRIMARY KEY,type text,external_id text,metadata jsonb,member_count int,celeb_count int,record_count int);
 CREATE TABLE content_locales(content_id text REFERENCES contents,locale text,title text,creator text,isbn text,publisher text,description text,thumbnail_url text,verified bool,sources jsonb,PRIMARY KEY(content_id,locale));
 CREATE TABLE figure_book_contents(content_id text PRIMARY KEY REFERENCES contents);
 CREATE TABLE figure_book_characters(content_id text REFERENCES figure_book_contents,celeb_id text,relation_type text,description text,description_en text);
 CREATE TABLE figure_book_editions(id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,content_id text REFERENCES figure_book_contents,locale text,title text,creator text,isbn text,publisher text,description text,thumbnail_url text,release_date text,edition_kind text,text_scope text,sort_order int,verified bool,sources jsonb);
 CREATE UNIQUE INDEX edition_isbn ON figure_book_editions(content_id,locale,isbn) WHERE isbn IS NOT NULL;
 CREATE TABLE figure_book_products(id bigint PRIMARY KEY,edition_id bigint REFERENCES figure_book_editions,platform text,is_active bool);
 CREATE TABLE member_contents(id text PRIMARY KEY,content_id text REFERENCES contents,member_id text,review text);
 CREATE TABLE celeb_contents(id text PRIMARY KEY,content_id text REFERENCES contents,celeb_id text,review text,review_en text,source_url text,visibility text,status text,contributor_member_id text,created_at text,updated_at text);
 CREATE TABLE curated_list_items(id text PRIMARY KEY,content_id text REFERENCES contents);
 CREATE TABLE flow_nodes(id text PRIMARY KEY,content_id text REFERENCES contents,bonus_content_ids jsonb);
 CREATE TABLE records(id text PRIMARY KEY,content_id text REFERENCES contents);
 CREATE TABLE notes(id text PRIMARY KEY,content_id text REFERENCES contents);
 CREATE TABLE activity_logs(id text PRIMARY KEY,content_id text REFERENCES contents);
 CREATE TABLE commerce_events(id text PRIMARY KEY,content_id text REFERENCES contents);
 CREATE TABLE profession_book_picks(content_id text REFERENCES contents);
 CREATE TABLE faction_lv2(id text PRIMARY KEY,theme_book_ids text[]);
 CREATE TABLE flows(id text PRIMARY KEY,tiers jsonb);
 CREATE TABLE tier_lists(id text PRIMARY KEY,tiers jsonb,unranked text[]);`)
 const reset=f=>query(`TRUNCATE ${SNAPSHOT_TABLES.join(',')} RESTART IDENTITY CASCADE;`+SNAPSHOT_TABLES.filter(table=>f.before[table].length).map(table=>`INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},${sqlLiteral(JSON.stringify(f.before[table]))}::jsonb);`).join('\n')+"UPDATE contents SET celeb_count=1,record_count=1 WHERE id='keep-a';")
 const capture=()=>JSON.parse(query(buildCatalogRepairSnapshotSql([pairs[0].keep,pairs[0].drop])))
 const reviewedPair=(f,s)=>{const r=structuredClone(f.removal),p=r.unselectedTranslationStartReview;p.currentKeepWork=s.contents.find(row=>row.id===f.pair.keep);p.currentDropWork=s.contents.find(row=>row.id===f.pair.drop);p.beforeLocaleCards=structuredClone(s.content_locales);p.beforeEditions=structuredClone(s.figure_book_editions);p.referenceEdition=s.figure_book_editions.find(row=>row.id===1);p.discardedEdition=s.figure_book_editions.find(row=>row.id===2);p.selectedEdition=s.figure_book_editions.find(row=>row.id===3);p.selectedLocaleCard=s.content_locales.find(row=>row.content_id===f.pair.keep);return {...f.pair,reviewedNonstartEditionRemovals:[r]}}
 for(const combined of [false,true]){const f=unselectedStartFixture(combined);reset(f);const before=capture(),pair=reviewedPair(f,before);query(buildReviewedMergeBatchSql([pair],before));const after=capture();assert.doesNotThrow(()=>verifyReviewedMergePair(before,after,pair));assert.equal(after.figure_book_editions.length,2);assert.deepEqual(after.figure_book_editions,before.figure_book_editions.filter(row=>row.id!==2));assert.deepEqual(after.content_locales,[before.content_locales.find(row=>row.content_id===f.pair.keep)]);assert.deepEqual(after.celeb_contents,before.celeb_contents)}
 const f=unselectedStartFixture();reset(f);let before=capture(),pair=reviewedPair(f,before),sql=buildReviewedMergeBatchSql([pair],before);query("UPDATE celeb_contents SET review='Concurrent human edit' WHERE id='reading';");assert.throws(()=>query(sql),/concurrent change in celeb_contents/);assert.equal(query('SELECT count(*) FROM figure_book_editions'),'3');assert.equal(query('SELECT count(*) FROM contents'),'2')
 reset(f);before=capture();pair=reviewedPair(f,before);sql=buildReviewedMergeBatchSql([pair],before);query("INSERT INTO figure_book_products(id,edition_id,platform,is_active) VALUES(90,2,'amazon',false);");assert.throws(()=>query(sql),/concurrent change in figure_book_products/);assert.equal(query('SELECT count(*) FROM figure_book_editions'),'3');assert.equal(query('SELECT edition_id FROM figure_book_products'),'2')
 // The optional public/private conflict is deletion-only, including under actual triggers and FK races.
 const privateF=unselectedStartFixture(),publicRow={id:'public-original',content_id:privateF.pair.keep,celeb_id:'same-reader',review:'Existing identical Korean review; no newly generated claim.',review_en:'Existing identical English review; no newly generated claim.',source_url:'https://source.example/existing-reading',visibility:'public',status:'FINISHED',contributor_member_id:null,created_at:'public-created',updated_at:'public-updated'}
 privateF.before.celeb_contents=[publicRow,{...publicRow,id:'private-duplicate',content_id:privateF.pair.drop,visibility:'private',created_at:'private-created',updated_at:'private-updated'}]
 const privatePair=s=>{const p=reviewedPair(privateF,s);p.reviewedCurationResolutions=[privateDuplicateReview(s,p,s.celeb_contents.find(row=>row.id==='public-original'),s.celeb_contents.find(row=>row.id==='private-duplicate'))];return p}
 query(`CREATE FUNCTION reject_public_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.visibility='public' THEN RAISE EXCEPTION 'public original update forbidden'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER reject_public_change BEFORE UPDATE ON celeb_contents FOR EACH ROW EXECUTE FUNCTION reject_public_change();
 CREATE TABLE curation_child(id text PRIMARY KEY,curation_id text REFERENCES celeb_contents);`)
 reset(privateF);before=capture();pair=privatePair(before);sql=buildReviewedMergeBatchSql([pair],before);query(sql);let privateAfter=capture()
 assert.doesNotThrow(()=>verifyReviewedMergePair(before,privateAfter,pair));assert.deepEqual(privateAfter.celeb_contents,[before.celeb_contents.find(row=>row.id==='public-original')]);assert.equal(query('SELECT count(*) FROM contents'),'1')
 for(const child of ['public-original','private-duplicate']){reset(privateF);before=capture();pair=privatePair(before);sql=buildReviewedMergeBatchSql([pair],before);query(`INSERT INTO curation_child VALUES('child',${sqlLiteral(child)});`);assert.throws(()=>query(sql),/curation resolution child references/);assert.equal(query('SELECT count(*) FROM celeb_contents'),'2');assert.equal(query('SELECT count(*) FROM contents'),'2')}
 reset(privateF);before=capture();pair=privatePair(before);sql=buildReviewedMergeBatchSql([pair],before);query("UPDATE celeb_contents SET visibility='public' WHERE id='private-duplicate';");assert.throws(()=>query(sql),/concurrent change in celeb_contents/);assert.equal(query('SELECT count(*) FROM celeb_contents'),'2')
 query(`DROP TRIGGER reject_public_change ON celeb_contents;
 CREATE FUNCTION corrupt_public_after_private_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.visibility='private' THEN UPDATE celeb_contents SET updated_at='unexpected public modification' WHERE id='public-original'; END IF; RETURN OLD; END $$;
 CREATE TRIGGER corrupt_public_after_private_delete AFTER DELETE ON celeb_contents FOR EACH ROW EXECUTE FUNCTION corrupt_public_after_private_delete();`)
 reset(privateF);before=capture();pair=privatePair(before);sql=buildReviewedMergeBatchSql([pair],before);assert.throws(()=>query(sql),/curation resolution protected readback mismatch/);assert.equal(query('SELECT count(*) FROM celeb_contents'),'2');assert.deepEqual(capture().celeb_contents,before.celeb_contents)
})
function fixture() {
  const before = empty()
  for (const [index, pair] of pairs.entries()) {
    before.contents.push(...[pair.keep, pair.drop].map(id => ({ id, type: 'BOOK', external_id: null, metadata: {}, member_count: 0, celeb_count: 0, record_count: 0 })))
    before.figure_book_contents.push({ content_id: pair.keep }, { content_id: pair.drop })
    before.content_locales.push({ content_id: pair.keep, locale: 'en', title: 'Book ' + index, isbn: null, sources: {} }, { content_id: pair.drop, locale: 'en', title: 'Book ' + index, isbn: null, sources: {} })
    before.member_contents.push({ id: index + 1, member_id: 'member-' + index, content_id: pair.drop, memo: 'Keep the full original value', updated_at: 'before' })
    before.flows.push({ id: index + 1, tiers: { Adult: [pair.drop, 'other', pair.keep, 'other'] }, updated_at: 'before' })
  }
  return before
}
function committed(before) {
  const after = structuredClone(before)
  for (const pair of pairs) {
    after.contents = after.contents.filter(row => row.id !== pair.drop)
    Object.assign(after.contents.find(row => row.id === pair.keep), { member_count: 1, celeb_count: 0, record_count: 1 })
    after.figure_book_contents = after.figure_book_contents.filter(row => row.content_id !== pair.drop)
    after.content_locales = after.content_locales.filter(row => row.content_id !== pair.drop)
    for (const row of after.member_contents) if (row.content_id === pair.drop) row.content_id = pair.keep
    for (const row of after.flows) if (row.tiers.Adult.includes(pair.drop)) row.tiers.Adult = [pair.keep, 'other', 'other']
  }
  return after
}
test('one stdin read snapshots every protected table and preserves remapped array rows in readback', async () => {
  const before = fixture(), calls = []
  const result = await captureReviewedMergeSnapshot(null, pairs, { previousSnapshot: before, spawn(command, args, options) {
    calls.push({ command, args, options }); return { status: 0, stdout: JSON.stringify(before), stderr: '' }
  } })
  assert.deepEqual(result, before); assert.equal(calls.length, 1)
  assert.equal(calls[0].command, 'ssh'); assert.match(calls[0].args.at(-1), /docker exec -i.*psql -XqAt/)
  assert.ok(calls[0].args.every(arg => !arg.includes('jsonb_build_object')))
  assert.match(calls[0].options.input, /REPEATABLE READ READ ONLY/)
  for (const table of SNAPSHOT_TABLES) assert.ok(calls[0].options.input.includes('FROM public.' + table))
  assert.match(calls[0].options.input, /t\.id::text IN \(E'1',E'2'\)/)
  assert.doesNotMatch(calls[0].options.input, /INSERT|UPDATE|DELETE/u)
})
test('incomplete snapshots and real transport errors fail closed', async () => {
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ status: 0, stdout: '{}', stderr: '' }) }), /missing snapshot table/)
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ status: 1, stderr: 'read failed' }) }), /read failed/)
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ error: Error('ENAMETOOLONG') }) }), /ENAMETOOLONG/)
})
test('all IDs must be distinct and shared physical array/protected rows are rejected before writing', async () => {
  assert.throws(() => buildReviewedMergeSnapshotSql([pairs[0], { keep: pairs[0].keep, drop: 'third' }]), /overlapping/)
  const shared = fixture(); shared.flows.push({ id: 99, tiers: { Adult: [pairs[0].drop, pairs[1].drop] } })
  assert.throws(() => buildReviewedMergeBatchSql(pairs, shared), /shared flows row/)
  const cross = fixture(); cross.flow_nodes.push({ id: 99, content_id: pairs[0].keep, bonus_content_ids: [pairs[1].drop] })
  assert.throws(() => buildReviewedMergeBatchSql(pairs, cross), /shared flow_nodes row/)
  let writes = 0
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => shared, execute() { writes++ } }), /shared/)
  assert.equal(writes, 0)
})
test('compiled SQL is one atomic transaction with every existing CAS/FK/trigger guard and pair-specific errors', () => {
  const sql = buildReviewedMergeBatchSql(pairs, fixture())
  assert.equal(sql.match(/^BEGIN;$/gm)?.length, 1); assert.equal(sql.match(/^COMMIT;$/gm)?.length, 1)
  assert.equal(sql.match(/SELECT 'MERGE_COMMITTED'/g)?.length, 1)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('concurrent change in ' + table + "'", 'g'))?.length, pairs.length)
  assert.equal(sql.match(/unhandled edition FK/g)?.length, 2)
  assert.equal(sql.match(/product history lost/g)?.length, 2)
  assert.match(sql, /MERGE_BATCH pair 1 keep-b\/drop-b/); assert.match(sql, /ERRCODE=SQLSTATE/)
  assert.match(sql, /MERGE_BATCH_EXPECTED:/); assert.ok(sql.indexOf('MERGE_BATCH_EXPECTED:') < sql.indexOf('\nCOMMIT;'))
  assert.doesNotMatch(sql, /DISABLE TRIGGER|session_replication_role/)
})
test('one execution and two full reads return the normal completed plans and clean local temporary SQL', async () => {
  const before = fixture(), after = committed(before), calls = [], paths = []
  const result = await applyReviewedMergeBatch(null, pairs, {
    checkReferences: pair => calls.push('fixed:' + pair.drop),
    captureMany: async (_db, ownedPairs, options) => { assert.equal(ownedPairs, pairs); calls.push(options ? 'readback' : 'before'); if (options) assert.equal(options.previousSnapshot, before); return options ? after : before },
    execute(path) { paths.push(path); calls.push('execute'); assert.match(readFileSync(path, 'utf8'), /MERGE_BATCH_EXPECTED:/); return 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED\n' }
  })
  assert.deepEqual(calls, ['fixed:drop-a', 'fixed:drop-b', 'before', 'execute', 'readback'])
  assert.equal(result.length, 2); assert.ok(result.every(row => row.completed && !row.skip)); assert.ok(paths.every(path => !existsSync(path)))
})
test('a failure of any pair propagates without retrying another pair or taking readback', async () => {
  const calls = [], paths = []
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => { calls.push('capture'); return fixture() }, execute(path) { paths.push(path); calls.push('execute'); throw Error('MERGE_BATCH pair 1: policy trigger rejected') } }), /pair 1.*policy trigger/)
  assert.deepEqual(calls, ['capture', 'execute']); assert.ok(paths.every(path => !existsSync(path)))
})
test('every final table and every field is compared, including tables usually overlooked', async () => {
  for (const table of SNAPSHOT_TABLES) {
    const before = fixture(), expected = committed(before), actual = structuredClone(expected)
    actual[table].push({ id: 'unexpected', preserved: 'changed' })
    await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? actual : before,
      execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(expected) + '\nMERGE_COMMITTED' }), new RegExp(table + ' rows differ'))
  }
})
test('normal postconditions independently reject loss, hidden memo changes and array reorder even if emitted/readback states agree', async () => {
  for (const change of [after => { after.member_contents[0].memo = 'corrupted' }, after => { after.flows[0].tiers.Adult.reverse() }, after => { after.contents[0].member_count = 999 }]) {
    const before = fixture(), after = committed(before); change(after)
    await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? after : before,
      execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /MERGE_BATCH_READBACK/)
  }
})
test('missing commit proof never claims completed and original missing-work/conflict checks run before execution', async () => {
  let writes = 0
  const before = fixture(); before.member_contents.push({ id: 99, member_id: 'member-0', content_id: pairs[0].keep })
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => before, execute() { writes++ } }), /member-duplicate/)
  assert.equal(writes, 0)
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => fixture(), execute: () => 'MERGE_COMMITTED' }), /expected snapshot missing/)
})
test('explicit source-reviewed edition mappings reach the unchanged canonical product mapping', () => {
  const before = fixture()
  before.figure_book_editions.push({ id: 1, content_id: pairs[0].keep, locale: 'en', isbn: '9780500295779', title: 'Instant Stories', sources: {} },
    { id: 2, content_id: pairs[0].drop, locale: 'en', isbn: '9780500544785', title: 'Instant Stories', sources: {} })
  const reviewed = [{ ...pairs[0], reviewedEditionMappings: [{ keepEditionId: 1, dropEditionId: 2, keepIsbn: '9780500295779', dropIsbn: '9780500544785', locale: 'en', sourceUrl: 'https://www.thamesandhudson.com/products/wim-wenders-instant-stories', reason: 'Publisher confirms identical photographs in reduced format.' }] }, pairs[1]]
  assert.match(buildReviewedMergeBatchSql(reviewed, before), /canonical_id := CASE duplicate_edition.id WHEN 2 THEN 1 ELSE NULL END/)
  const wrong = structuredClone(reviewed); wrong[0].reviewedEditionMappings[0].keepEditionId = 999
  assert.throws(() => buildReviewedMergeBatchSql(wrong, before), /owner\/locale\/duplicate/)
})

test('reviewed later parts are removed without equivalent mapping, title guesses, or product reassignment', () => {
  const before = fixture(), pair = pairs[0]
  before.figure_book_editions.push({id:1,content_id:pair.keep,locale:'en',isbn:'9781781945155',title:'My Great Predecessors Part 1',text_scope:'volume/1',sources:{}},
    {id:2,content_id:pair.drop,locale:'en',isbn:'9781781945162',title:'My Great Predecessors Part 2',sources:{}})
  Object.assign(before.content_locales.find(row=>row.content_id===pair.keep),{isbn:'9781781945155'})
  Object.assign(before.content_locales.find(row=>row.content_id===pair.drop),{isbn:'9781781945162'})
  const removal={keepEditionId:1,dropEditionId:2,keepIsbn:'9781781945155',dropIsbn:'9781781945162',keepTitle:'My Great Predecessors Part 1',dropTitle:'My Great Predecessors Part 2',locale:'en',volumeNumber:2,
    sourceUrl:'https://publisher.example/part-2',startSourceUrl:'https://publisher.example/part-1',reason:'LLM read both publisher descriptions and confirmed parts of one continuous original, not independent sequels.'}
  const reviewed=[{...pair,reviewedNonstartEditionRemovals:[removal]},pairs[1]]
  const sql=buildReviewedMergeBatchSql(reviewed,before)
  assert.match(sql,/DELETE FROM public.figure_book_editions WHERE content_id=drop_id AND id IN \(2\)/)
  assert.match(sql,/canonical_id := NULL/)
  assert.match(sql,/AND NOT \(\(l.content_id=E'drop-a' AND l.locale=E'en' AND l.isbn IS NOT DISTINCT FROM E'9781781945162'\)\)/)
  for(const changed of [{keepEditionId:999},{dropIsbn:'9781781945179'},{dropTitle:'Another work'},{volumeNumber:1},{reason:'machine match'},
    {sourceUrl:'https://openlibrary.org/books/OL1M'},{startSourceUrl:'http://publisher.example/part-1'}]) {
    assert.throws(()=>buildReviewedMergeBatchSql([{...pair,reviewedNonstartEditionRemovals:[{...removal,...changed}]},pairs[1]],before),/MERGE_REVIEW: nonstart/)
  }
  const otherTranslation=structuredClone(before);otherTranslation.figure_book_editions[0].sources.translators=['A'];otherTranslation.figure_book_editions[1].sources.translators=['B']
  assert.throws(()=>buildReviewedMergeBatchSql(reviewed,otherTranslation),/different verified translators/)
  const products=structuredClone(before);products.figure_book_products.push({id:1,edition_id:2})
  assert.throws(()=>buildReviewedMergeBatchSql(reviewed,products),/product references require separate review/)
  const nonstart=structuredClone(before);nonstart.figure_book_editions[0].text_scope='volume/3'
  assert.throws(()=>buildReviewedMergeBatchSql(reviewed,nonstart),/existing selected first or complete/)
})
test('pair context keeps SQL literals and replacement metacharacters inside the error string', () => {
  const pair = { keep: "keep$&'\\", drop: 'drop$1' }, before = empty()
  before.contents = [pair.keep, pair.drop].map(id => ({ id, type: 'BOOK', external_id: null, metadata: {} }))
  const sql = buildReviewedMergeBatchSql([pair], before)
  assert.ok(sql.includes("MESSAGE=E'MERGE_BATCH pair 0 keep$&''\\\\/drop$1: ' || SQLERRM"))
  assert.equal(sql.match(/EXCEPTION WHEN OTHERS/g)?.length, 1)
  assert.equal(sql.match(/^COMMIT;$/gm)?.length, 1)
})
test('fixed-reference refusal aborts before the one-read snapshot and never reaches executor', async () => {
  await assert.rejects(applyReviewedMergeBatch(null, pairs, {
    checkReferences() { throw Error('existing Remotion fixed reference') },
    captureMany() { assert.fail('must not capture') }, execute() { assert.fail('must not execute') }
  }), /existing Remotion/)
})

function wrongSpeakerFixture() {
  const before = fixture(), pair = pairs[0]
  before.celeb_contents = [
    { id: 'invalid-keep', content_id: pair.keep, celeb_id: 'guest', review: 'The guest supposedly read this book.', review_en: 'Original English claim A.', source_url: 'https://podcast.example/original', contributor_member_id: null },
    { id: 'invalid-drop', content_id: pair.drop, celeb_id: 'guest', review: 'The guest supposedly recommended this book.', review_en: 'Original English claim B.', source_url: 'https://podcast.example/republication', contributor_member_id: null },
    ...Array.from({ length: 4 }, (_, index) => ({ id: 'valid-' + index, content_id: pair.keep, celeb_id: 'reader-' + index,
      review: 'Original valid review ' + index, review_en: 'Original valid English review ' + index, source_url: 'https://evidence.example/' + index,
      contributor_member_id: index === 3 ? 'real-contributor' : null, is_recommended: false }))
  ]
  const reviewedInvalidCurationRemovals = before.celeb_contents.slice(0, 2).map(row => ({ id: row.id, celebId: row.celeb_id, contentId: row.content_id,
    sourceUrl: row.source_url, before: structuredClone(row), method: 'llm_source_body_review', llmReviewed: true, decision: 'remove_wrong_speaker',
    reason: 'The reviewed original passage explicitly attributes this reading statement to the host, not the registered guest.',
    bodyFinding: 'The original book list includes works mentioned by both speakers; it is not a list of books read by the guest.',
    speakerEvidence: { sourceUrl: 'https://podcast.example/republication', actualSpeaker: 'The host', registeredSpeaker: 'The guest', registeredCelebId: 'guest',
      locator: 'Opening self-introduction and the book passage at 20:27.', bodyEvidence: 'The host identifies himself and then asks the guest a question after describing his own reading.' } }))
  const ownedPairs = [{ ...pair, reviewedInvalidCurationRemovals }, pairs[1]], after = committed(before)
  after.celeb_contents = after.celeb_contents.filter(row => row.celeb_id !== 'guest')
  Object.assign(after.contents.find(row => row.id === pair.keep), { member_count: 1, celeb_count: 4, record_count: 5 })
  return { before, after, ownedPairs }
}

test('wrong-speaker removal is explicit, exact-row bound and does not weaken default curation conflicts', () => {
  const { before, ownedPairs } = wrongSpeakerFixture()
  assert.throws(() => buildReviewedMergeBatchSql(pairs, before), /celeb-review-needs-review/)
  const sql = buildReviewedMergeBatchSql(ownedPairs, before)
  assert.match(sql, /DELETE FROM public.celeb_contents WHERE id::text IN \(E'invalid-keep',E'invalid-drop'\) AND content_id IN \(keep_id,drop_id\)/)
  assert.ok(sql.indexOf('concurrent change in celeb_contents') < sql.indexOf('invalid curation child references'))
  assert.match(sql, /invalid curation removal count changed/)
  assert.match(sql, /celeb_contents WHERE content_id=keep_id\) <> 4/)
  for (const changes of [{ method: undefined }, { llmReviewed: false }, { decision: 'remove_unverified' }, { before: {} }, { contentId: pairs[1].keep },
    { sourceUrl: 'https://podcast.example/other' }, { reason: 'machine match' }, { bodyFinding: '' }, { speakerEvidence: {} }]) {
    const changed = structuredClone(ownedPairs)
    Object.assign(changed[0].reviewedInvalidCurationRemovals[0], changes)
    assert.throws(() => buildReviewedMergeBatchSql(changed, before), /invalid curation/)
  }
  const stale = structuredClone(before); stale.celeb_contents[0].review += ' changed after review'
  assert.throws(() => buildReviewedMergeBatchSql(ownedPairs, stale), /exact before/)
  const duplicate = structuredClone(ownedPairs); duplicate[0].reviewedInvalidCurationRemovals.push(duplicate[0].reviewedInvalidCurationRemovals[0])
  assert.throws(() => buildReviewedMergeBatchSql(duplicate, before), /owner\/source mismatch/)
  const outside = structuredClone(ownedPairs); outside[0].reviewedInvalidCurationRemovals[0].id = 'valid-unknown'
  assert.throws(() => buildReviewedMergeBatchSql(outside, before), /owner\/source mismatch/)
})

test('curation removals with contributor or member data fail before any executor call', async () => {
  for (const key of ['contributor_member_id', 'contributor_nickname', 'member_id']) {
    const { before, ownedPairs } = wrongSpeakerFixture()
    before.celeb_contents[0][key] = 'protected-member-value'
    ownedPairs[0].reviewedInvalidCurationRemovals[0].before = structuredClone(before.celeb_contents[0])
    await assert.rejects(applyReviewedMergeBatch(null, ownedPairs, { checkReferences() {}, captureMany: async () => before, execute() { assert.fail('must not execute') } }), /member\/contributor/)
  }
})

test('reviewed wrong-speaker removal preserves four valid curations and every other protected row', async () => {
  const { before, after, ownedPairs } = wrongSpeakerFixture()
  const result = await applyReviewedMergeBatch(null, ownedPairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? after : before,
    execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' })
  assert.ok(result.every(row => row.completed))
  assert.equal(after.celeb_contents.length, 4)
  assert.deepEqual(after.celeb_contents, before.celeb_contents.slice(2))
})

test('reviewed removal readback rejects surviving invalid rows, additional losses and prose/source changes', async () => {
  for (const change of [after => after.celeb_contents.push({ id: 'invalid-keep', content_id: pairs[0].keep, celeb_id: 'guest' }),
    after => after.celeb_contents.pop(), after => { after.celeb_contents[0].review = 'corrupted' },
    after => { after.celeb_contents[0].source_url = 'https://wrong.example' }, after => { after.celeb_contents[3].contributor_member_id = null },
    after => { after.celeb_contents[0].updated_at = 'unauthorized normal-row update' }]) {
    const { before, after, ownedPairs } = wrongSpeakerFixture(); change(after)
    await assert.rejects(applyReviewedMergeBatch(null, ownedPairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? after : before,
      execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /MERGE_BATCH_READBACK/)
  }
  const { before, after, ownedPairs } = wrongSpeakerFixture(), actual = structuredClone(after)
  actual.celeb_contents[0].review_en = 'post-commit concurrent alteration'
  await assert.rejects(applyReviewedMergeBatch(null, ownedPairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? actual : before,
    execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /celeb_contents rows differ/)
})

function curationResolutionFixture(decision = 'same_source_translation_variants') {
  const before = fixture(), pair = pairs[0], republication = decision === 'same_source_republication'
  const keep = {id:'curation-keep',content_id:pair.keep,celeb_id:'shared-reader',review:'Original canonical Korean translation of the source.',
    review_en:'Original English reading passage from the same source.',source_url:republication?'https://article.example/requotation':'https://interview.example/original',
    status:'FINISHED',visibility:'public',contributor_member_id:null,updated_at:'canonical-before'}
  const drop = {...keep,id:'curation-drop',content_id:pair.drop,review:'Another existing Korean translation of the same original passage.',updated_at:'duplicate-before'}
  if(republication)Object.assign(drop,{review:'Existing complete Korean reading passage; no newly generated content.',review_en:'Existing complete original English reading passage; no newly generated content.',source_url:'https://interview.example/original'})
  before.celeb_contents=[keep,drop,...Array.from({length:37},(_,index)=>({id:'normal-'+index,content_id:pair.keep,celeb_id:'other-'+index,
    review:'Preserved other reading '+index,review_en:'Preserved other English '+index,source_url:'https://reading.example/'+index,
    contributor_member_id:index===3?'protected-contributor':null,updated_at:'unchanged-normal'}))]
  const resolution={keepCurationId:keep.id,dropCurationId:drop.id,keepBefore:structuredClone(keep),dropBefore:structuredClone(drop),celebId:keep.celeb_id,
    method:'llm_source_body_review',llmReviewed:true,decision,selectedCurationId:republication?drop.id:keep.id,allowedFields:republication?['review','review_en','source_url']:['review'],
    reason:'The LLM read the exact live source bodies and selected the existing correct canonical passage without composing a new reading.',
    bodyFinding:republication?'The secondary article excerpts and requotes the primary source; it contains no separate reading experience.':'Both Korean texts translate the identical English reading passage published at the same exact URL.',
    evidence:[...new Set([keep.source_url,drop.source_url])].map(url=>({url,bodyFinding:'The LLM read the actual named book passage in this source and checked the registered reading against it.'})),
    ...(republication?{additionalSourceUrl:keep.source_url}:{})}
  const ownedPairs=[{...pair,reviewedCurationResolutions:[resolution]},pairs[1]],after=committed(before)
  after.celeb_contents=after.celeb_contents.filter(row=>row.id!==drop.id)
  const surviving=after.celeb_contents.find(row=>row.id===keep.id)
  if(republication)Object.assign(surviving,{review:drop.review+'\n\n추가 출처: '+keep.source_url,review_en:drop.review_en+'\n\nAdditional source: '+keep.source_url,source_url:drop.source_url})
  Object.assign(after.contents.find(row=>row.id===pair.keep),{member_count:1,celeb_count:38,record_count:39})
  return {before,after,ownedPairs,resolution}
}

function privateDuplicateReview(before,pair,keep,drop){
  const anchor=work=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work.metadata.figureBook[key]??null]))
  const keepWork=before.contents.find(row=>row.id===pair.keep),dropWork=before.contents.find(row=>row.id===pair.drop)
  return {decision:'existing_public_identical_private_duplicate',method:'llm_source_body_review',llmReviewed:true,
    keepCurationId:keep.id,dropCurationId:drop.id,celebId:keep.celeb_id,keepBefore:structuredClone(keep),dropBefore:structuredClone(drop),
    selectedCurationId:keep.id,allowedFields:[],reason:'The exact public row is retained byte for byte; only its identical private duplicate is removed without publishing any private text.',
    bodyFinding:'The actual source supports the unchanged existing passage; no new reading claim or differently scoped experience is added.',
    evidence:[{url:keep.source_url,bodyFinding:'The actual named person passage was read and compared with both identical existing Korean and English reviews.'}],
    originalWorkReview:{method:'independent_existing_original_review',llmReviewed:true,sameOriginal:true,
      currentKeepWork:structuredClone(keepWork),currentDropWork:structuredClone(dropWork),keepWorkAnchor:anchor(keepWork),dropWorkAnchor:anchor(dropWork),
      sourceUrl:keep.source_url,bodyFinding:'The existing original and its continuous later part were independently reviewed; this source is not expanded into an assertion of reading a particular part.',
      creditFinding:'The current original title, author and individually retained identity anchors were checked against the existing independently reviewed original editions.'}}
}
function privateDuplicateFixture(){
  const state=curationResolutionFixture(),pair=pairs[0],keep=state.before.celeb_contents[0],drop=state.before.celeb_contents[1]
  for(const row of state.before.contents.filter(row=>[pair.keep,pair.drop].includes(row.id)))row.metadata={figureBook:{workTitle:'Faust',workCreator:'Johann Wolfgang von Goethe',workIdentity:row.id===pair.keep?'goethe/faust':'goethe/faust-part-two'}}
  Object.assign(drop,{review:keep.review,review_en:keep.review_en,visibility:'private'})
  state.resolution=privateDuplicateReview(state.before,pair,keep,drop)
  state.ownedPairs[0].reviewedCurationResolutions=[state.resolution]
  return state
}
test('reviewed public original remains byte-identical while only its identical private duplicate is deleted',async()=>{
  const {before,after,ownedPairs}=privateDuplicateFixture(),pair=ownedPairs[0]
  assert.equal(findConflicts(before,pairs[0]),'celeb-visibility-needs-review')
  assert.equal(findConflicts(before,pair),null)
  const sql=buildReviewedMergeBatchSql(ownedPairs,before)
  assert.match(sql,/DELETE FROM public.celeb_contents WHERE id::text=E'curation-drop' AND content_id=drop_id AND visibility='private'/)
  assert.doesNotMatch(sql,/UPDATE public.celeb_contents SET .*curation-keep|SET visibility=/)
  const result=await applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
    execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'})
  assert.ok(result.every(row=>row.completed));assert.deepEqual(after.celeb_contents,before.celeb_contents.filter(row=>row.id!=='curation-drop'))
})
test('private duplicate approval rejects changed prose/source/state/protected values, reverse visibility, missing work evidence and children',()=>{
  for(const change of [s=>s.resolution.llmReviewed=false,s=>s.resolution.allowedFields=['visibility'],s=>s.resolution.selectedCurationId='curation-drop',
    s=>s.resolution.additionalSourceUrl=undefined,s=>s.resolution.preserveBothExistingReviews=false,s=>s.resolution.evidence=[],
    s=>s.resolution.originalWorkReview.sameOriginal=false,s=>s.resolution.originalWorkReview.keepWorkAnchor.workIdentity='stale',
    s=>s.resolution.originalWorkReview.currentDropWork.metadata={},s=>s.resolution.originalWorkReview.bodyFinding='short',
    s=>s.resolution.keepBefore={},s=>s.before.notes.push({id:'child',content_id:pairs[0].keep,celeb_content_id:'curation-drop'}),
    s=>s.before.records.push({id:'child',content_id:pairs[0].keep,curation_id:'curation-keep'})]){
    const s=privateDuplicateFixture();change(s);assert.throws(()=>buildReviewedMergeBatchSql(s.ownedPairs,s.before),/MERGE_REVIEW/)
  }
  for(const key of ['review','review_en','source_url','status','contributor_member_id','member_id','visibility','extra_metadata']){
    const s=privateDuplicateFixture(),drop=s.before.celeb_contents[1];drop[key]=key==='visibility'?'public':'changed';s.resolution.dropBefore=structuredClone(drop)
    assert.throws(()=>buildReviewedMergeBatchSql(s.ownedPairs,s.before),/MERGE_REVIEW/)
  }
  const reverse=privateDuplicateFixture();reverse.before.celeb_contents[0].visibility='private';reverse.before.celeb_contents[1].visibility='public';
  reverse.resolution.keepBefore=structuredClone(reverse.before.celeb_contents[0]);reverse.resolution.dropBefore=structuredClone(reverse.before.celeb_contents[1]);assert.throws(()=>buildReviewedMergeBatchSql(reverse.ownedPairs,reverse.before),/MERGE_REVIEW/)
  for(const key of ['review','review_en']){const s=privateDuplicateFixture();for(const row of s.before.celeb_contents.slice(0,2))row[key]='';s.resolution.keepBefore=structuredClone(s.before.celeb_contents[0]);s.resolution.dropBefore=structuredClone(s.before.celeb_contents[1]);assert.throws(()=>buildReviewedMergeBatchSql(s.ownedPairs,s.before),/MERGE_REVIEW/)}
})
test('private duplicate independent readback rejects any public-row edit or retained/published private row',()=>{
  for(const change of [s=>s.after.celeb_contents[0].updated_at='changed',s=>s.after.celeb_contents[0].created_at='changed',
    s=>s.after.celeb_contents[0].visibility='private',s=>s.after.celeb_contents[0].review+=' changed',s=>s.after.celeb_contents[0].source_url='https://other.example/',
    s=>s.after.celeb_contents.push({...s.before.celeb_contents[1],content_id:pairs[0].keep}),s=>s.after.celeb_contents.push({...s.before.celeb_contents[1],content_id:pairs[0].keep,visibility:'public'})]){
    const s=privateDuplicateFixture();change(s);assert.throws(()=>verifyReviewedMergePair(sliceReviewedMergeSnapshot(s.before,s.ownedPairs[0]),sliceReviewedMergeSnapshot(s.after,s.ownedPairs[0]),s.ownedPairs[0]),/MERGE_BATCH_READBACK/)
  }
})

test('exact reviewed translation selection preserves canonical prose, source, 37 other readings and the member record', async () => {
  const {before,after,ownedPairs}=curationResolutionFixture()
  assert.throws(()=>buildReviewedMergeBatchSql(pairs,before),/celeb-review-needs-review/)
  const sql=buildReviewedMergeBatchSql(ownedPairs,before)
  assert.match(sql,/UPDATE public.celeb_contents SET review=E'Original canonical Korean translation of the source.'/)
  assert.doesNotMatch(sql.split('\n').find(line=>line.includes("SET review=E'Original canonical Korean translation of the source.'")),/review_en=|source_url=/)
  assert.match(sql,/curation resolution protected readback mismatch/)
  assert.ok(sql.indexOf('concurrent change in celeb_contents')<sql.indexOf('curation resolution child references'))
  const result=await applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
    execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'})
  assert.ok(result.every(row=>row.completed))
  assert.deepEqual(after.celeb_contents,before.celeb_contents.filter(row=>row.id!=='curation-drop'))
})

test('reviewed primary-source selection keeps existing full prose and both URLs in supported text fields', async () => {
  const {before,after,ownedPairs}=curationResolutionFixture('same_source_republication')
  const sql=buildReviewedMergeBatchSql(ownedPairs,before)
  assert.match(sql,/Additional source: https:\/\/article.example\/requotation/)
  const result=await applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
    execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'})
  assert.ok(result.every(row=>row.completed))
  const selected=before.celeb_contents.find(row=>row.id==='curation-drop'),canonical=after.celeb_contents.find(row=>row.id==='curation-keep')
  assert.equal(canonical.source_url,selected.source_url)
  assert.equal(canonical.review,selected.review+'\n\n추가 출처: https://article.example/requotation')
  assert.equal(canonical.review_en,selected.review_en+'\n\nAdditional source: https://article.example/requotation')
})

test('resolution without proof, exact current rows, allowed fields or source bodies never reaches execution', async () => {
  for(const patch of [{llmReviewed:false},{method:'machine_match'},{decision:'choose_any_prose'},{keepBefore:{}},{selectedCurationId:'another-row'},
    {allowedFields:['review','status']},{bodyFinding:'same'},{evidence:[]},{additionalSourceUrl:'https://other.example/source'}]) {
    const {before,ownedPairs}=curationResolutionFixture();Object.assign(ownedPairs[0].reviewedCurationResolutions[0],patch)
    await assert.rejects(applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async()=>before,execute(){assert.fail('must not execute')}}),/curation resolution|translation resolution/)
  }
  for(const decision of ['same_source_translation_variants','same_source_republication'])for(const key of ['status','visibility','contributor_member_id','review_en','source_url']) {
    if(decision==='same_source_republication'&&['review_en','source_url'].includes(key))continue
    const {before,ownedPairs}=curationResolutionFixture(decision)
    before.celeb_contents[1][key]='drifted protected value'
    ownedPairs[0].reviewedCurationResolutions[0].dropBefore=structuredClone(before.celeb_contents[1])
    assert.throws(()=>buildReviewedMergeBatchSql(ownedPairs,before),/protected field|member\/contributor|reviewed source|translation resolution/)
  }
  const stale=curationResolutionFixture();stale.before.celeb_contents[0].review+=' altered';assert.throws(()=>buildReviewedMergeBatchSql(stale.ownedPairs,stale.before),/exact before/)
  const invalidSource=curationResolutionFixture('same_source_republication');invalidSource.ownedPairs[0].reviewedCurationResolutions[0].additionalSourceUrl='https://other.example';assert.throws(()=>buildReviewedMergeBatchSql(invalidSource.ownedPairs,invalidSource.before),/exact second source/)
})

test('resolution independent readback rejects unapproved prose, source, status, other readings and member edits', async () => {
  for(const change of [s=>{s.celeb_contents[0].review+=' unapproved';},s=>{s.celeb_contents[0].source_url='https://wrong.example';},
    s=>{s.celeb_contents[0].visibility='private';},s=>{s.celeb_contents[1].updated_at='changed';},s=>{s.celeb_contents.pop();},
    s=>{s.member_contents[0].memo='altered member';}]) {
    const {before,after,ownedPairs}=curationResolutionFixture('same_source_republication');change(after)
    await assert.rejects(applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
      execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'}),/MERGE_BATCH_READBACK/)
  }
})

function preserveBothRepublicationFixture(selectedId = 'curation-drop') {
  const state = curationResolutionFixture('same_source_republication')
  for (const row of state.before.celeb_contents.filter(row => ['curation-keep','curation-drop'].includes(row.id))) {
    row.review = '  '+row.review+"\r\n원문의 '인용'과 공백 $& 그대로  "
    row.review_en = '  '+row.review_en+"\r\nOriginal 'quotation' and spaces $& unchanged  "
    state.resolution[row.id === 'curation-keep' ? 'keepBefore' : 'dropBefore'] = structuredClone(row)
  }
  const selected = state.before.celeb_contents.find(row => row.id === selectedId)
  const other = state.before.celeb_contents.find(row => ['curation-keep','curation-drop'].includes(row.id) && row !== selected)
  Object.assign(state.resolution,{preserveBothExistingReviews:true,selectedCurationId:selected.id,additionalSourceUrl:other.source_url})
  Object.assign(state.after.celeb_contents.find(row => row.id === 'curation-keep'),{
    review:selected.review+'\n\n'+other.review+'\n\n추가 출처: '+other.source_url,
    review_en:selected.review_en+'\n\n'+other.review_en+'\n\nAdditional source: '+other.source_url,
    source_url:selected.source_url,
  })
  return {...state,selected,other}
}

test('explicit republication preservation keeps both original languages in selected order and both exact URLs through SQL and readback', async () => {
  for (const selectedId of ['curation-drop','curation-keep']) {
    const {before,after,ownedPairs,selected,other} = preserveBothRepublicationFixture(selectedId)
    const original = structuredClone(before), expected = after.celeb_contents.find(row => row.id === 'curation-keep')
    const sql = buildReviewedMergeBatchSql(ownedPairs,before)
    assert.ok(sql.includes('review='+sqlLiteral(expected.review)))
    assert.ok(sql.includes('review_en='+sqlLiteral(expected.review_en)))
    assert.ok(sql.includes('source_url='+sqlLiteral(selected.source_url)))
    assert.equal(expected.review,selected.review+'\n\n'+other.review+'\n\n추가 출처: '+other.source_url)
    assert.equal(expected.review_en,selected.review_en+'\n\n'+other.review_en+'\n\nAdditional source: '+other.source_url)
    const result = await applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
      execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'})
    assert.ok(result.every(row=>row.completed))
    assert.deepEqual(before,original)
  }
})

test('false republication preservation flag retains the existing single-passage behavior', () => {
  const {before,ownedPairs} = curationResolutionFixture('same_source_republication')
  const baseline = buildReviewedMergeBatchSql(ownedPairs,before)
  ownedPairs[0].reviewedCurationResolutions[0].preserveBothExistingReviews = false
  assert.equal(buildReviewedMergeBatchSql(ownedPairs,before),baseline)
})

test('both-review preservation rejects invalid flags, translation mode, empty languages and changed source or protected current rows before execution', async () => {
  const invalid = [
    state=>{state.resolution.preserveBothExistingReviews='true'},
    state=>{state.resolution.preserveBothExistingReviews=null},
    state=>{state.resolution.preserveBothExistingReviews=1},
    state=>{state.resolution.preserveBothExistingReviews={}},
    state=>{state.resolution.preserveBothExistingReviews=[]},
    state=>{state.resolution.decision='same_source_translation_variants'},
    state=>{state.resolution.keepBefore.review+=' stale'},
    state=>{state.resolution.dropBefore.review_en+=' stale'},
    state=>{state.resolution.additionalSourceUrl='https://different.example/source'},
    state=>{state.resolution.selectedCurationId='unknown'},
    state=>{state.resolution.evidence=[]},
    state=>{state.resolution.llmReviewed=false},
  ]
  for (const rowId of ['curation-keep','curation-drop']) for (const field of ['review','review_en']) invalid.push(state=>{
    state.before.celeb_contents.find(row=>row.id===rowId)[field]=' '
    state.resolution[rowId==='curation-keep'?'keepBefore':'dropBefore']=structuredClone(state.before.celeb_contents.find(row=>row.id===rowId))
  })
  for (const field of ['status','visibility','contributor_member_id','member_id','source_url']) invalid.push(state=>{
    const row=state.before.celeb_contents.find(row=>row.id==='curation-drop');row[field]='changed protected value'
    state.resolution.dropBefore=structuredClone(row)
  })
  for (const change of invalid) {
    const state = preserveBothRepublicationFixture();change(state)
    await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async()=>state.before,
      execute(){assert.fail('invalid preservation must not execute')}}),/MERGE_REVIEW|MERGE_BATCH_REVIEW/)
  }
})

test('both-review preservation readback rejects loss, rewriting, reordering, either URL or protected metadata changes', async () => {
  for (const change of [
    s=>{s.after.celeb_contents[0].review=s.selected.review+'\n\n추가 출처: '+s.other.source_url},
    s=>{s.after.celeb_contents[0].review_en=s.selected.review_en+'\n\nAdditional source: '+s.other.source_url},
    s=>{s.after.celeb_contents[0].review=s.other.review+'\n\n'+s.selected.review+'\n\n추가 출처: '+s.other.source_url},
    s=>{s.after.celeb_contents[0].review_en+=' newly translated sentence'},
    s=>{s.after.celeb_contents[0].review=s.after.celeb_contents[0].review.replace(s.other.source_url,'https://wrong.example')},
    s=>{s.after.celeb_contents[0].review_en=s.after.celeb_contents[0].review_en.replace(s.other.source_url,'https://wrong.example')},
    s=>{s.after.celeb_contents[0].source_url=s.other.source_url},
    s=>{s.after.celeb_contents[0].status='PLANNED'},
    s=>{s.after.celeb_contents[0].visibility='private'},
    s=>{s.after.celeb_contents[0].contributor_member_id='added-contributor'},
    s=>{s.after.member_contents[0].memo='changed member record'},
  ]) {
    const state=preserveBothRepublicationFixture();change(state)
    await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?state.after:state.before,
      execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(state.after)+'\nMERGE_COMMITTED'}),/MERGE_BATCH_READBACK/)
  }
  const state=preserveBothRepublicationFixture(), actual=structuredClone(state.after)
  actual.celeb_contents[0].review_en+=' post-commit mutation'
  await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?actual:state.before,
    execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(state.after)+'\nMERGE_COMMITTED'}),/celeb_contents rows differ/)
})

function sameSourceReviewVariantsFixture(selectedId = 'curation-drop') {
  const state=preserveBothRepublicationFixture(selectedId),source='https://interview.example/original'
  for (const row of [state.selected,state.other]) row.source_url=source
  Object.assign(state.resolution,{decision:'same_source_review_variants',allowedFields:['review','review_en'],
    keepBefore:structuredClone(state.before.celeb_contents.find(row=>row.id==='curation-keep')),
    dropBefore:structuredClone(state.before.celeb_contents.find(row=>row.id==='curation-drop')),
    bodyFinding:'The LLM read this one exact source body and confirmed both existing bilingual accounts describe the same reading.',
    evidence:[{url:source,bodyFinding:'Both existing Korean and English passages were checked against the book reading passage in this exact source body.'}]})
  delete state.resolution.additionalSourceUrl
  Object.assign(state.after.celeb_contents[0],{review:state.selected.review+'\n\n'+state.other.review,
    review_en:state.selected.review_en+'\n\n'+state.other.review_en,source_url:source})
  return state
}

test('explicit same-source bilingual variants preserve both exact passages in selected order without changing the one source URL', async () => {
  for (const selectedId of ['curation-keep','curation-drop']) {
    const {before,after,ownedPairs,selected,other}=sameSourceReviewVariantsFixture(selectedId),original=structuredClone(before)
    const canonical=after.celeb_contents[0],sql=buildReviewedMergeBatchSql(ownedPairs,before)
    assert.equal(canonical.review,selected.review+'\n\n'+other.review)
    assert.equal(canonical.review_en,selected.review_en+'\n\n'+other.review_en)
    assert.equal(canonical.source_url,selected.source_url)
    const updateStart=sql.indexOf('UPDATE public.celeb_contents SET review=')
    const update=sql.slice(updateStart,sql.indexOf(' WHERE id::text IN',updateStart))
    assert.ok(update.includes('review='+sqlLiteral(canonical.review)))
    assert.ok(update.includes('review_en='+sqlLiteral(canonical.review_en)))
    assert.doesNotMatch(update,/source_url=|status=|visibility=|Additional source:|추가 출처:/)
    const result=await applyReviewedMergeBatch(null,ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?after:before,
      execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(after)+'\nMERGE_COMMITTED'})
    assert.ok(result.every(row=>row.completed));assert.deepEqual(before,original)
  }
})

test('same-source variants require explicit true, exact same source and before rows, actual body review, both languages and unchanged protected fields', async () => {
  const invalid=[
    s=>{delete s.resolution.preserveBothExistingReviews},s=>{s.resolution.preserveBothExistingReviews=false},
    s=>{s.resolution.preserveBothExistingReviews='true'},s=>{s.resolution.preserveBothExistingReviews=null},
    s=>{s.resolution.additionalSourceUrl=s.selected.source_url},s=>{s.resolution.additionalSourceUrl=undefined},
    s=>{s.resolution.decision='same_source_translation_variants'},s=>{s.resolution.decision='same_source_republication'},
    s=>{s.resolution.allowedFields=['review','review_en','source_url']},s=>{s.resolution.allowedFields=['review']},
    s=>{s.resolution.selectedCurationId='new-text'},s=>{s.resolution.celebId='other-person'},
    s=>{s.resolution.keepBefore.review+=' stale'},s=>{s.resolution.dropBefore.review_en+=' stale'},
    s=>{s.resolution.llmReviewed=false},s=>{s.resolution.method='machine_match'},
    s=>{s.resolution.evidence=[]},s=>{s.resolution.evidence[0].url='https://different.example/source'},
    s=>{s.resolution.evidence[0].bodyFinding='same'},
  ]
  for (const id of ['curation-keep','curation-drop']) for (const field of ['review','review_en']) invalid.push(s=>{
    const row=s.before.celeb_contents.find(r=>r.id===id);row[field]=' '
    s.resolution[id==='curation-keep'?'keepBefore':'dropBefore']=structuredClone(row)
  })
  for (const field of ['source_url','status','visibility','contributor_member_id','contributor_id_snapshot','member_id']) invalid.push(s=>{
    s.other[field]=field==='source_url'?'https://different.example/source':'changed protected value'
    s.resolution[s.other.id==='curation-keep'?'keepBefore':'dropBefore']=structuredClone(s.other)
  })
  for (const change of invalid) {
    const state=sameSourceReviewVariantsFixture();change(state)
    await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async()=>state.before,
      execute(){assert.fail('unreviewed variants must not execute')}}),/MERGE_REVIEW|MERGE_BATCH_REVIEW/)
  }
})

test('same-source variants independent 18-table readback rejects prose loss, reorder, generated additions, source and protected record mutations', async () => {
  for (const change of [
    s=>{s.after.celeb_contents[0].review=s.selected.review},
    s=>{s.after.celeb_contents[0].review_en=s.other.review_en},
    s=>{s.after.celeb_contents[0].review=s.other.review+'\n\n'+s.selected.review},
    s=>{s.after.celeb_contents[0].review_en=s.other.review_en+'\n\n'+s.selected.review_en},
    s=>{s.after.celeb_contents[0].review=s.after.celeb_contents[0].review.trim()},
    s=>{s.after.celeb_contents[0].review_en+=' new summary'},
    s=>{s.after.celeb_contents[0].source_url='https://changed.example/source'},
    s=>{s.after.celeb_contents[0].status='PLANNED'},s=>{s.after.celeb_contents[0].visibility='private'},
    s=>{s.after.celeb_contents[0].contributor_member_id='new-member'},
    s=>{s.after.celeb_contents[1].review_en='changed unrelated reading'},
    s=>{s.after.member_contents[0].memo='changed member record'},
  ]) {
    const state=sameSourceReviewVariantsFixture();change(state)
    await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?state.after:state.before,
      execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(state.after)+'\nMERGE_COMMITTED'}),/MERGE_BATCH_READBACK/)
  }
  const state=sameSourceReviewVariantsFixture(),actual=structuredClone(state.after)
  actual.celeb_contents[0].review+=' altered after committed expected capture'
  await assert.rejects(applyReviewedMergeBatch(null,state.ownedPairs,{checkReferences(){},captureMany:async(_db,_pairs,options)=>options?actual:state.before,
    execute:()=> 'MERGE_BATCH_EXPECTED:'+JSON.stringify(state.after)+'\nMERGE_COMMITTED'}),/celeb_contents rows differ/)
})
