import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES } from './merge-work-sql.mjs'
import { applyReviewedEditionConsolidation, planReviewedEditionConsolidation, buildReviewedEditionConsolidationSql } from './reviewed-edition-consolidation.mjs'

const review = { contentId: 'work', keepEditionId: 1, dropEditionId: 2, keepIsbn: '9780500295779', dropIsbn: '9780500544785',
  locale: 'en', sourceUrl: 'https://publisher.example/books/instant-stories', reason: 'Publisher confirms the same photographs in a reduced-format paperback.', textIdentity: 'original' }
function fixture() {
  const snapshot = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  snapshot.contents = [{ id: 'work', type: 'BOOK', metadata: { figureBook: { workIdentity: 'author/instant-stories' } }, member_count: 1, celeb_count: 1, record_count: 2 }]
  snapshot.figure_book_contents = [{ content_id: 'work', sort_order: 0 }]
  snapshot.figure_book_editions = [
    { id: 1, content_id: 'work', locale: 'en', title: 'Instant Stories', creator: 'Author', isbn: review.keepIsbn, description: null, edition_kind: 'full', text_scope: 'complete', sources: { primary: 'openlibrary', title: 'https://openlibrary.org/books/OL1M' }, updated_at: 'before' },
    { id: 2, content_id: 'work', locale: 'en', title: 'Instant Stories, Hardcover', creator: 'Author', isbn: review.dropIsbn, description: null, edition_kind: 'full', text_scope: 'complete', sources: { primary: 'openlibrary', title: 'https://openlibrary.org/books/OL2M' }, updated_at: 'before' },
  ]
  snapshot.content_locales = [{ content_id: 'work', locale: 'en', title: 'Instant Stories', isbn: review.keepIsbn, description: null, sources: { primary: 'openlibrary' } }]
  snapshot.figure_book_products = [
    { id: 10, edition_id: 1, platform: 'amazon', is_active: true, affiliate_url: 'https://amazon.example/paper', updated_at: 'before' },
    { id: 11, edition_id: 2, platform: 'amazon', is_active: true, affiliate_url: 'https://amazon.example/hardcover', updated_at: 'before' },
    { id: 12, edition_id: 2, platform: 'coupang', is_active: true, affiliate_url: 'https://shop.example/old', updated_at: 'before' },
    { id: 13, edition_id: 2, platform: 'amazon', is_active: false, affiliate_url: 'https://amazon.example/history', updated_at: 'before' },
  ]
  snapshot.member_contents = [{ id: 'member-record', content_id: 'work', review: 'Exact protected review.' }]
  snapshot.celeb_contents = [{ id: 'celeb-record', content_id: 'work', review: 'Exact celebrity review.' }]
  snapshot.flows = [{ id: 'flow', tiers: { Historical: ['work'] } }]
  return snapshot
}
test('explicit consolidation preserves all product IDs and noncatalog records while only colliding active products deactivate', () => {
  const before = fixture(), untouched = structuredClone(before), plan = planReviewedEditionConsolidation(before, [review])
  assert.deepEqual(before, untouched)
  assert.equal(plan.expected.figure_book_editions.length, 1)
  assert.deepEqual(plan.expected.figure_book_products.map(row => [row.id, row.edition_id, row.is_active]), [[10, 1, true], [11, 1, false], [12, 1, true], [13, 1, false]])
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_editions', 'figure_book_products'].includes(table))) assert.deepEqual(plan.expected[table], before[table])
  const sources = plan.expected.figure_book_editions[0].sources
  assert.equal(sources.title, before.figure_book_editions[0].sources.title)
  assert.equal(sources.edition_work_evidence[0].source_url, review.sourceUrl)
  assert.equal(sources.edition_work_evidence[0].isbn, review.keepIsbn)
  assert.equal(sources.edition_work_evidence[0].original_language, undefined)
  assert.ok(!JSON.stringify(sources).includes('OL2M')); assert.ok(!JSON.stringify(sources).includes('archived'))
})
test('source judgment is mandatory and ownership, exact current checked ISBNs, language and IDs fail closed', () => {
  for (const patch of [{ contentId: 'other' }, { keepEditionId: 2 }, { dropEditionId: 999 }, { keepIsbn: review.dropIsbn },
    { dropIsbn: '9780500544786' }, { locale: 'ko' }, { textIdentity: 'same_book' }, { reason: '' }, { sourceUrl: 'http://publisher.example' },
    { sourceUrl: 'https://openlibrary.org/books/OL1M' }, { sourceUrl: 'https://sub.openlibrary.org./x' }, {sourceUrl:'https://books.google.com/books?id=other'}, {sourceUrl:'https://www.googleapis.com/books/v1/volumes/other'}, { sourceUrl: 'https://user:pass@publisher.example' },
    { sourceUrl: 'https://publisher.example?api_key=secret' }, { sourceUrl: 'https://localhost/book' }, { keepEditionId: '1;DELETE' }]) {
    assert.throws(() => planReviewedEditionConsolidation(fixture(), [{ ...review, ...patch }]), /EDITION_REVIEW/, JSON.stringify(patch))
  }
  assert.throws(() => planReviewedEditionConsolidation(fixture(), [review, review]), /mutually distinct/)
  assert.throws(() => planReviewedEditionConsolidation(fixture(), []), /1\.\.20/)
  const missing = fixture(); delete missing.notes
  assert.throws(() => planReviewedEditionConsolidation(missing, [review]), /missing snapshot notes/)
})
test('known different translators and body scopes never become equivalent through source URL alone', () => {
  const before = fixture(); before.figure_book_editions[0].sources.translators = ['Translator A']; before.figure_book_editions[1].sources.translators = ['Translator B']
  assert.throws(() => planReviewedEditionConsolidation(before, [{ ...review, textIdentity: 'translation' }]), /translator conflict/)
  before.figure_book_editions[1].sources.translators = ['Translator A']
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /translator conflict/)
  const plan = planReviewedEditionConsolidation(before, [{ ...review, textIdentity: 'translation' }])
  assert.equal(plan.expected.figure_book_editions[0].sources.edition_work_evidence[0].original_language, undefined)
  assert.deepEqual(plan.expected.figure_book_editions[0].sources.translators, ['Translator A'])
  const scoped = fixture(); scoped.figure_book_editions[1].text_scope = 'complete revised appendix'
  assert.throws(() => planReviewedEditionConsolidation(scoped, [review]), /text scope conflict/)
})
test('explicit ISBN body review resolves wording-only scope differences without merging later volumes or conflicting translators',()=>{
 const before=fixture();before.figure_book_editions[0].text_scope='Complete seven-story collection (US 2021)';before.figure_book_editions[1].text_scope='Complete seven-story collection (UK 2022)'
 const scope={method:'independent_same_body_scope',keepBeforeEditionKind:'full',dropBeforeEditionKind:'full',keepBeforeTextScope:before.figure_book_editions[0].text_scope,
  dropBeforeTextScope:before.figure_book_editions[1].text_scope,keepSourceUrl:'https://publisher.example/us',dropSourceUrl:'https://publisher.example/uk',reason:'Both exact ISBN tables of contents contain the same complete seven stories, with only regional publication details differing.'}
 const mapping={...review,reviewedScopeEquivalence:scope}
 assert.throws(()=>planReviewedEditionConsolidation(before,[review]),/text scope conflict/)
 const plan=planReviewedEditionConsolidation(before,[mapping]);assert.equal(plan.expected.figure_book_editions.length,1)
 assert.equal(plan.expected.figure_book_editions[0].text_scope,scope.keepBeforeTextScope)
 assert.deepEqual(plan.expected.figure_book_editions[0].sources.edition_work_evidence[0].scope_source_urls,[scope.keepSourceUrl,scope.dropSourceUrl])
 assert.ok(!JSON.stringify(plan.expected.figure_book_editions[0].sources).includes('BeforeTextScope'))
 for(const table of SNAPSHOT_TABLES.filter(table=>!['figure_book_editions','figure_book_products'].includes(table)))assert.deepEqual(plan.expected[table],before[table])
 for(const patch of [{dropBeforeTextScope:'wrong'},{keepSourceUrl:'https://books.google.com/books?id=x'},{dropSourceUrl:scope.keepSourceUrl},{reason:''}])
  assert.throws(()=>planReviewedEditionConsolidation(before,[{...mapping,reviewedScopeEquivalence:{...scope,...patch}}]),/scope equivalence/)
 const later=structuredClone(before);later.figure_book_editions[1].edition_kind='volume';later.figure_book_editions[1].text_scope='volume/2'
 assert.throws(()=>planReviewedEditionConsolidation(later,[{...mapping,reviewedScopeEquivalence:{...scope,dropBeforeEditionKind:'volume',dropBeforeTextScope:'volume/2'}}]),/excluded edition/)
 const translated=structuredClone(before);translated.figure_book_editions[0].sources.translators=['A'];translated.figure_book_editions[1].sources.translators=['B']
 assert.throws(()=>planReviewedEditionConsolidation(translated,[{...mapping,textIdentity:'translation'}]),/translator conflict/)
})
test('an original-text equivalence never invents the language of a bilingual commentary', () => {
  const before = fixture()
  assert.equal(planReviewedEditionConsolidation(before, [review]).expected.figure_book_editions[0].sources.edition_work_evidence[0].original_language, undefined)
  before.contents[0].metadata.figureBook.originalLanguage = 'en'
  assert.equal(planReviewedEditionConsolidation(before, [review]).expected.figure_book_editions[0].sources.edition_work_evidence[0].original_language, undefined)
  before.contents[0].metadata.figureBook.identityEvidence = 'https://author.example/work'
  assert.equal(planReviewedEditionConsolidation(before, [review]).expected.figure_book_editions[0].sources.edition_work_evidence[0].original_language, 'en')
})

test('independent exact-ISBN review completes omitted co-translator credits without storing old row copies',()=>{
 const before=fixture();before.figure_book_editions[0].sources.translators=['Translator A','Translator B'];before.figure_book_editions[1].sources.translators=['Translator A']
 const completion={method:'independent_translator_completion',translators:['Translator A','Translator B'],keepBeforeTranslators:['Translator A','Translator B'],dropBeforeTranslators:['Translator A'],
  keepSourceUrl:'https://publisher.example/paper',dropSourceUrl:'https://publisher.example/hardcover',reason:'The two exact ISBN copyright credits identify the same joint translation by Translator A and Translator B.'}
 const mapping={...review,textIdentity:'translation',reviewedTranslatorCompletion:completion}
 assert.throws(()=>planReviewedEditionConsolidation(before,[{...review,textIdentity:'translation'}]),/translator conflict/)
 const plan=planReviewedEditionConsolidation(before,[mapping]),canonical=plan.expected.figure_book_editions[0]
 assert.deepEqual(canonical.sources.translators,completion.translators)
 assert.deepEqual(canonical.sources.edition_work_evidence[0].translator_source_urls,[completion.keepSourceUrl,completion.dropSourceUrl])
 assert.ok(!JSON.stringify(canonical.sources).includes('BeforeTranslators'))
 for(const table of SNAPSHOT_TABLES.filter(table=>!['figure_book_editions','figure_book_products'].includes(table)))assert.deepEqual(plan.expected[table],before[table])
 const sql=buildReviewedEditionConsolidationSql(before,[mapping]);assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions SET sources'))
 for(const patch of [{translators:['Translator A']},{dropBeforeTranslators:[]},{keepSourceUrl:'https://openlibrary.org/books/OL1M'},
  {dropSourceUrl:completion.keepSourceUrl},{reason:''}])assert.throws(()=>planReviewedEditionConsolidation(before,[{...mapping,reviewedTranslatorCompletion:{...completion,...patch}}]),/translator completion/)
 const conflict=structuredClone(before);conflict.figure_book_editions[1].sources.translators=['Other translator']
 assert.throws(()=>planReviewedEditionConsolidation(conflict,[{...mapping,reviewedTranslatorCompletion:{...completion,dropBeforeTranslators:['Other translator']}}]),/translator completion/)
})
function jointCreditFixture(){
 const before=fixture(),[keep,drop]=before.figure_book_editions
 before.contents[0].metadata.figureBook={workTitle:'Memories Dreams Reflections',workCreator:'Carl Jung',workIdentity:'carl-jung/memories-dreams-reflections'}
 for(const row of [keep,drop])Object.assign(row,{title:'Memories, Dreams, Reflections',creator:'Carl Gustav Jung',edition_kind:null,text_scope:null})
 keep.isbn='9780679723950';drop.isbn='9780006540274'
 keep.sources.translators=['Richard and Clara Winston'];drop.sources.translators=['Richard Winston','Clara Winston']
 keep.description='Carl Gustav Jung recounts his memories and dreams, working with Aniela Jaffé to prepare a memoir of his inner life. The selected US edition is corrected and includes the additional VII Sermones ad Mortuos.'
 drop.description='The UK edition presents the memoir and its listed appendices, with a different publisher introduction.'
 keep.sources.description='https://publisher.example/us-introduction';drop.sources.description='https://publisher.example/uk-introduction'
 before.figure_book_products=before.figure_book_products.filter(row=>row.edition_id===keep.id)
 Object.assign(before.content_locales[0],{isbn:keep.isbn,description:keep.description,sources:structuredClone(keep.sources)})
 const keepSourceUrl='https://publisher.example/us-isbn',dropSourceUrl='https://publisher.example/uk-isbn',translators=['Richard Winston','Clara Winston']
 const source=(row,sourceUrl)=>({llmReviewed:true,isbn:row.isbn,editionTitle:row.title,editionCreator:row.creator,locale:row.locale,
  sourceUrl,creditedTranslators:translators,creditEvidence:'The exact title page separately identifies Richard Winston and Clara Winston as the English translators.',
  bodyEvidence:'The independently read book discusses Jung’s childhood, Freud, the unconscious, travels and visions through his memoir.',
  scopeEvidence:row===keep?'The corrected US edition includes an additional VII Sermones ad Mortuos; this is a revised representative.':'The UK preview lists twelve chapters, Retrospect and its appendices; it does not list the additional VII separately.'})
 const mapping={...review,keepIsbn:keep.isbn,dropIsbn:drop.isbn,textIdentity:'translation',sourceUrl:keepSourceUrl,
  reason:'The actual two translators are the same; choose the corrected US memoir as representative while respecting differences in its additional material.',
  reviewedRepresentativeIntroduction:{method:'independent_representative_introduction',locale:'en',keepBeforeDescription:keep.description,
   dropBeforeDescription:drop.description,keepBeforeSource:keep.sources.description,dropBeforeSource:drop.sources.description,
   keepSourceUrl,dropSourceUrl,reason:'The LLM independently read both ISBN introductions and chooses the normal US representative without claiming identical appendix scope.'},
  reviewedJointTranslatorCreditAlias:{method:'independent_joint_translator_credit_alias_review',llmReviewed:true,
   originalWork:structuredClone(before.contents[0]),keepEdition:structuredClone(keep),dropEdition:structuredClone(drop),translators,
   keepReview:source(keep,keepSourceUrl),dropReview:source(drop,dropSourceUrl),identicalBody:false,editionRelationship:'revised_same_translation',
   editionDifferences:'The corrected US edition includes VII Sermones ad Mortuos; the UK contents list differs. Credit normalization establishes no identical body scope.',
   reason:'Both independently read title pages identify exactly Richard Winston and Clara Winston; the shared surname in the joint credit belongs to both people.'}}
 return {before,mapping}
}

test('공동역자 alias 검수는 정확한 두 역자만 정규화하고 개정판 수록범위·소개·13표를 그대로 보존한다',()=>{
 const {before,mapping}=jointCreditFixture(),original=structuredClone(before)
 assert.throws(()=>planReviewedEditionConsolidation(before,[{...mapping,reviewedJointTranslatorCreditAlias:undefined}]),/translator conflict/)
 const plan=planReviewedEditionConsolidation(before,[mapping]),keep=plan.expected.figure_book_editions[0]
 assert.deepEqual(keep.sources.translators,['Richard Winston','Clara Winston']);assert.equal(keep.text_scope,null);assert.equal(keep.edition_kind,null)
 assert.equal(keep.description,before.figure_book_editions[0].description);assert.equal(keep.sources.description,before.figure_book_editions[0].sources.description)
 assert.deepEqual(before,original)
 for(const table of SNAPSHOT_TABLES.filter(t=>!['figure_book_editions'].includes(t)))assert.deepEqual(plan.expected[table],before[table],table)
 assert.ok(!JSON.stringify(keep.sources).includes('joint_translator_credit_alias'));assert.ok(!JSON.stringify(keep.sources).includes('keepEdition'))
 assert.equal(keep.sources.edition_work_evidence.at(-1).scope_source_urls,undefined)
 const sql=buildReviewedEditionConsolidationSql(before,[mapping])
 assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions')<sql.indexOf('UPDATE public.figure_book_editions SET sources'))
 for(const table of SNAPSHOT_TABLES)assert.ok(sql.includes('rowset mismatch in '+table),table)
 assert.ok(!sql.includes('DISABLE TRIGGER'))
})

test('공동역자 alias는 오래된 원작·실물 행, 제3역자, 다른 책임표시, 근거 없는 본문동등성 및 상품이력을 거부한다',()=>{
 for(const mutate of [
  p=>p.llmReviewed=false,p=>p.originalWork.metadata.figureBook.workIdentity='other',
  p=>p.keepEdition.publisher='Other publisher',p=>p.dropEdition.isbn='9780140449136',
  p=>p.translators.push('Aniela Jaffé'),p=>p.translators=['Richard Winston','Other Winston'],
  p=>p.keepReview.sourceUrl='https://openlibrary.org/books/OL1M',p=>p.dropReview.sourceUrl=p.keepReview.sourceUrl,
  p=>p.dropReview.isbn='9780007381630',p=>p.keepReview.creditEvidence='Surname matches',
  p=>p.dropReview.bodyEvidence='',p=>p.dropReview.scopeEvidence='',p=>p.identicalBody=true,
  p=>p.editionDifferences='',p=>p.editionRelationship='identical_body',
 ]){
  const {before,mapping}=jointCreditFixture();mutate(mapping.reviewedJointTranslatorCreditAlias)
  assert.throws(()=>planReviewedEditionConsolidation(before,[mapping]),/joint credit alias/)
 }
 for(const mutate of [
  (d,r)=>{d.figure_book_editions[0].sources.translators=['Jane and Clara Winston'];r.reviewedJointTranslatorCreditAlias.keepEdition=structuredClone(d.figure_book_editions[0])},
  (d,r)=>r.reviewedTranslatorCompletion={method:'independent_translator_completion'},
  (d,r)=>r.reviewedScopeEquivalence={method:'independent_same_body_scope'},
  (d,r)=>delete r.reviewedRepresentativeIntroduction,
  (d,r)=>d.figure_book_products.push({id:22,edition_id:2,is_active:false}),
 ]){
  const {before,mapping}=jointCreditFixture();mutate(before,mapping)
  assert.throws(()=>planReviewedEditionConsolidation(before,[mapping]),/EDITION_REVIEW/)
 }
 const {before,mapping}=jointCreditFixture();before.figure_book_editions[1].text_scope='UK appendix scope'
 mapping.reviewedJointTranslatorCreditAlias.dropEdition=structuredClone(before.figure_book_editions[1])
 before.figure_book_editions[0].text_scope='US corrected edition with VII'
 mapping.reviewedJointTranslatorCreditAlias.keepEdition=structuredClone(before.figure_book_editions[0])
 assert.throws(()=>planReviewedEditionConsolidation(before,[mapping]),/known text scope conflict/)
})

test('공동역자 정규화도 실제 18표 재조회와 보존한 상품·감상·표시카드의 불변을 요구한다',async()=>{
 for(const drift of ['none','review','product','card','scope']){
  const {before,mapping}=jointCreditFixture(),after=structuredClone(planReviewedEditionConsolidation(before,[mapping]).expected)
  if(drift==='review')after.celeb_contents[0].review='Changed reading scope'
  if(drift==='product')after.figure_book_products[0].affiliate_url='https://shop.example/changed'
  if(drift==='card')after.content_locales[0].description='Changed original introduction'
  if(drift==='scope')after.figure_book_editions[0].text_scope='complete'
  let count=0
  const run=()=>applyReviewedEditionConsolidation(null,[mapping],{capture:async()=>structuredClone(count++?after:before),execute:()=>({status:0,stdout:'MERGE_COMMITTED',stderr:''})})
  if(drift==='none')assert.equal((await run()).checkedTables,18);else await assert.rejects(run,/readback mismatch/)
 }
})

test('the same source-reviewed translation preserves known duplicate credits without inventing unknown translators', () => {
  const before = fixture(); before.figure_book_editions[1].sources.translators = ['Known Translator']
  const plan = planReviewedEditionConsolidation(before, [{ ...review, textIdentity: 'translation' }])
  assert.deepEqual(plan.expected.figure_book_editions[0].sources.translators, ['Known Translator'])
  assert.equal(plan.expected.figure_book_editions[0].sources.edition_work_evidence[0].original_language, undefined)
  assert.equal(planReviewedEditionConsolidation(fixture(), [{ ...review, textIdentity: 'translation' }]).expected.figure_book_editions[0].sources.translators, undefined)
  before.figure_book_editions[0].sources.edition_work_evidence = { source_url: 'https://author.example/existing-important-proof' }
  assert.throws(() => planReviewedEditionConsolidation(before, [{ ...review, textIdentity: 'translation' }]), /malformed canonical work evidence/)
})
test('unique introductions and their source cannot be lost, but a surviving real locale preserves the exact original text', () => {
  const before = fixture(), drop = before.figure_book_editions[1]
  drop.description = 'The complete stored original introduction.'; drop.sources.description = 'https://publisher.example/introduction'
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
  const locale = before.content_locales[0]; locale.description = drop.description; locale.sources.description = drop.sources.description
  assert.doesNotThrow(() => planReviewedEditionConsolidation(before, [review]))
  locale.sources.description = 'https://publisher.example/different'
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
  locale.sources.description = drop.sources.description; locale.sources.primary = 'none'
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
  locale.sources.primary = 'openlibrary'; locale.isbn = null
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
})
test('LLM selects one sourced representative introduction after reviewing both products without retaining old prose copies', () => {
  const before = fixture(), keep = before.figure_book_editions[0], drop = before.figure_book_editions[1]
  keep.description = 'The verified representative introduction describes the complete original book.'
  keep.sources.description = 'https://publisher.example/paper-introduction'
  drop.description = 'A different hardcover advertisement describes the same original book.'
  drop.sources.description = 'https://publisher.example/hard-introduction'
  const proof = { method: 'independent_representative_introduction', locale: 'en',
    keepBeforeDescription: keep.description, dropBeforeDescription: drop.description,
    keepBeforeSource: keep.sources.description, dropBeforeSource: drop.sources.description,
    keepSourceUrl: 'https://publisher.example/paper', dropSourceUrl: 'https://publisher.example/hard',
    reason: 'Both ISBNs contain the same original body; the paperback introduction explains that body without the hardcover sales advertisement.' }
  const mapping = { ...review, reviewedRepresentativeIntroduction: proof }
  assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
  const plan = planReviewedEditionConsolidation(before, [mapping]), representative = plan.expected.figure_book_editions[0]
  assert.equal(representative.description, keep.description)
  assert.equal(representative.sources.description, keep.sources.description)
  assert.equal(representative.sources.edition_work_evidence[0].introduction_source_url, keep.sources.description)
  assert.ok(!JSON.stringify(representative.sources).includes(drop.description))
  assert.ok(!JSON.stringify(representative.sources).includes('BeforeDescription'))
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_editions', 'figure_book_products'].includes(table))) assert.deepEqual(plan.expected[table], before[table])
  for (const patch of [{ locale: 'ko' }, { keepBeforeDescription: 'changed' }, { dropBeforeSource: null },
    { keepSourceUrl: 'https://books.google.com/books?id=x' }, { dropSourceUrl: proof.keepSourceUrl }, { reason: '' }])
    assert.throws(() => planReviewedEditionConsolidation(before, [{ ...mapping, reviewedRepresentativeIntroduction: { ...proof, ...patch } }]), /representative introduction/)
  for (const prose of [null, 'OPEN', 'too short']) {
    const missing = structuredClone(before); missing.figure_book_editions[0].description = prose
    assert.throws(() => planReviewedEditionConsolidation(missing, [{ ...mapping, reviewedRepresentativeIntroduction: { ...proof, keepBeforeDescription: prose } }]), /representative introduction/)
  }
  const translated = structuredClone(before); translated.figure_book_editions[0].sources.translators = ['A']; translated.figure_book_editions[1].sources.translators = ['B']
  assert.throws(() => planReviewedEditionConsolidation(translated, [{ ...mapping, textIdentity: 'translation' }]), /translator conflict/)
  const later = structuredClone(before); later.figure_book_editions[1].text_scope = 'volume/2'
  assert.throws(() => planReviewedEditionConsolidation(later, [mapping]), /text scope conflict|excluded edition/)
})

test('source markers are not introduction prose, while similar real text remains protected', () => {
  for (const marker of ['KAKAO', 'DAUM', 'OPEN']) {
    const before = fixture(), drop = before.figure_book_editions[1]
    drop.description = marker; drop.sources.description = 'https://publisher.example/marker-source'
    const plan = planReviewedEditionConsolidation(before, [review])
    assert.equal(plan.expected.figure_book_editions.length, 1)
    assert.deepEqual(plan.expected.content_locales, before.content_locales)
    assert.deepEqual(plan.expected.celeb_contents, before.celeb_contents)
  }
  for (const prose of ['KAKAO 소개 본문', 'OPEN: actual introduction', 'DAUM source discussion']) {
    const before = fixture(); before.figure_book_editions[1].description = prose
    assert.throws(() => planReviewedEditionConsolidation(before, [review]), /preserve exact introduction/)
  }
})
test('an introduction on a second drop row in the same batch is not considered surviving', () => {
  const before = fixture()
  const a = { ...review, keepEditionId: 3, dropEditionId: 4 }
  before.figure_book_editions.push({ ...structuredClone(before.figure_book_editions[0]), id: 3 }, { ...structuredClone(before.figure_book_editions[1]), id: 4 })
  for (const row of before.figure_book_editions.filter(row => [2, 4].includes(row.id))) { row.description = 'Identical introduction on two doomed rows.'; row.sources.description = 'https://publisher.example/intro' }
  assert.throws(() => planReviewedEditionConsolidation(before, [review, a]), /preserve exact introduction/)
})
test('READ COMMITTED SQL locks products before CAS and retains all18 pre/post checks and unknown FK guard', () => {
  const sql = buildReviewedEditionConsolidationSql(fixture(), [review])
  assert.match(sql, /BEGIN ISOLATION LEVEL READ COMMITTED/)
  assert.match(sql, /LOCK TABLE public\.figure_book_products.*IN SHARE ROW EXCLUSIVE MODE/)
  assert.ok(sql.indexOf('LOCK TABLE') < sql.indexOf('FOR UPDATE')); assert.ok(sql.indexOf('FOR UPDATE') < sql.indexOf('rowset mismatch'))
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('rowset mismatch in ' + table + "'", 'g'))?.length, 2)
  assert.match(sql, /unhandled edition foreign reference/); assert.match(sql, /cardinality\(c\.confkey\)<>1/)
  assert.ok(sql.indexOf('SET is_active=false') < sql.indexOf('SET edition_id=1'))
  assert.ok(sql.indexOf('SET edition_id=1') < sql.indexOf('DELETE FROM public.figure_book_editions'))
  assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions') < sql.indexOf('SET sources='))
  assert.doesNotMatch(sql, /DELETE FROM public.figure_book_products|DISABLE TRIGGER|session_replication_role/)
  assert.equal(sql.match(/COMMIT;/g)?.length, 1)
})
test('20 nonoverlapping pairs are supported without assuming that 21 are approved', () => {
  const before = fixture(), reviews = []
  before.figure_book_editions = []; before.figure_book_products = []
  for (let n = 0; n < 20; n++) {
    const pair = { ...review, keepEditionId: 2 * n + 1, dropEditionId: 2 * n + 2 }; reviews.push(pair)
    before.figure_book_editions.push(...fixture().figure_book_editions.map((row, index) => ({ ...row, id: index ? pair.dropEditionId : pair.keepEditionId })))
  }
  assert.equal(planReviewedEditionConsolidation(before, reviews).expected.figure_book_editions.length, 20)
  assert.throws(() => planReviewedEditionConsolidation(before, [...reviews, { ...review, keepEditionId: 41, dropEditionId: 42 }]), /1\.\.20/)
})
test('three reviewed formats consolidate to one representative before its uniqueness-triggered update',()=>{
  const before=fixture();before.figure_book_editions.push({...structuredClone(before.figure_book_editions[1]),id:3})
  before.figure_book_products.push({id:14,edition_id:3,platform:'amazon',is_active:true,updated_at:'before'})
  const reviews=[review,{...review,dropEditionId:3,reason:'The second reprint contains the same original photographs.'}]
  const plan=planReviewedEditionConsolidation(before,reviews)
  assert.deepEqual(plan.expected.figure_book_editions.map(row=>row.id),[1])
  assert.equal(plan.expected.figure_book_editions[0].sources.edition_work_evidence.length,2)
  assert.deepEqual(plan.expected.figure_book_products.at(-1),{id:14,edition_id:1,platform:'amazon',is_active:false,updated_at:'before'})
  assert.deepEqual(plan.expected.celeb_contents,before.celeb_contents)
  const sql=buildReviewedEditionConsolidationSql(before,reviews)
  assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions WHERE id=3;')<sql.indexOf('SET sources='))
  assert.equal(sql.match(/UPDATE public.figure_book_editions SET sources=/g)?.length,1)
})
test('a shared unknown canonical never combines two known different translators or a removal cycle',()=>{
  const before=fixture();before.figure_book_editions[1].sources.translators=['Translator A']
  before.figure_book_editions.push({...structuredClone(before.figure_book_editions[1]),id:3,sources:{translators:['Translator B']}})
  const a={...review,textIdentity:'translation'},b={...a,dropEditionId:3}
  assert.throws(()=>planReviewedEditionConsolidation(before,[a,b]),/translator conflict across mappings/)
  assert.throws(()=>planReviewedEditionConsolidation(before,[review,{...review,keepEditionId:2,dropEditionId:3}]),/representative cannot also be removed/)
})
test('execution reads full18 twice, cleans temporary SQL and returns actual moved-product count', async () => {
  const before = fixture(), expected = planReviewedEditionConsolidation(before, [review]).expected, paths = [], calls = []
  const after = structuredClone(expected); after.figure_book_products[1].updated_at = 'trigger'; after.figure_book_editions[0].updated_at = 'trigger'
  const result = await applyReviewedEditionConsolidation(null, [review], { capture: async (_db, assigned) => { assert.deepEqual(assigned, ['work']); calls.push('capture'); return calls.length === 1 ? before : after },
    execute: path => { paths.push(path); calls.push('execute'); assert.match(readFileSync(path, 'utf8'), /READ COMMITTED/); return 'MERGE_COMMITTED' } })
  assert.deepEqual(calls, ['capture', 'execute', 'capture']); assert.deepEqual(result, { completed: true, consolidated: 1, removed: 1, productsMoved: 3, checkedTables: 18 })
  assert.ok(paths.every(path => !existsSync(path)))
})
test('each protected or bibliographic table is checked on readback without ignored rows', async () => {
  for (const table of SNAPSHOT_TABLES) {
    const before = fixture(), after = planReviewedEditionConsolidation(before, [review]).expected
    after[table].push({ id: 'unexpected', content_id: 'work' })
    let reads = 0
    await assert.rejects(applyReviewedEditionConsolidation(null, [review], { capture: async () => ++reads === 1 ? before : after, execute: () => 'MERGE_COMMITTED' }), new RegExp('readback mismatch in ' + table))
  }
})
test('SQL policy errors propagate with no second capture and no successful partial return', async () => {
  const paths = []; let reads = 0
  await assert.rejects(applyReviewedEditionConsolidation(null, [review], { capture: async () => { reads++; return fixture() }, execute: path => { paths.push(path); throw Error('trigger refuses mutation') } }), /trigger refuses/)
  assert.equal(reads, 1); assert.ok(paths.every(path => !existsSync(path)))
})

function crossFixture() {
  const before = fixture(), drop = before.figure_book_editions[1]
  drop.content_id = 'wrong-owner'; drop.title = 'Generic Original Title'
  drop.description = 'Exact retained introduction in the original source work.'
  drop.sources.description = 'https://search.daum.net/search?w=bookpage&bookId=1261143'
  before.contents.push({ id: 'wrong-owner', type: 'BOOK', metadata: { figureBook: { workIdentity: 'original/work', identityEvidence: 'https://library.example/catalog/original' } } })
  before.figure_book_contents.push({ content_id: 'wrong-owner' })
  before.content_locales.push({ content_id: 'wrong-owner', locale: 'en', title: 'Original Source Work', isbn: null,
    description: drop.description, sources: { primary: 'none', title: 'translated', description: drop.sources.description, description_method: 'translation', description_source_locale: 'ko' } })
  before.celeb_contents.push({ id: 'original-review', content_id: 'wrong-owner', review: 'Protected original record.' })
  const cross = { ...review, dropContentId: 'wrong-owner', workAttribution: { method: 'independent_work_review', content_id: review.contentId,
    work_identity: 'author/instant-stories', isbn: review.dropIsbn, locale: 'en', edition_title: drop.title, edition_creator: drop.creator,
    edition_kind: drop.edition_kind, text_scope: drop.text_scope,
    source_url: 'https://publisher.example/independent-edition-attribution', explanation: 'Publisher confirms the cloth ISBN belongs to this separate scholarly edited work.' } }
  return { before, cross }
}
test('explicit source-reviewed wrong-owner consolidation never moves the edition or changes either parent/protected rows', () => {
  const { before, cross } = crossFixture(), plan = planReviewedEditionConsolidation(before, [cross]), sql = buildReviewedEditionConsolidationSql(before, [cross])
  assert.deepEqual(plan.assigned, ['work', 'wrong-owner'])
  for (const table of SNAPSHOT_TABLES.filter(table => !['figure_book_editions', 'figure_book_products'].includes(table))) assert.deepEqual(plan.expected[table], before[table])
  assert.equal(plan.expected.figure_book_editions.length, 1)
  assert.ok(plan.expected.figure_book_products.every(row => row.edition_id === 1))
  assert.doesNotMatch(sql, /SET content_id=|DELETE FROM public.contents|DELETE FROM public.figure_book_contents|UPDATE public.content_locales/)
  assert.match(sql, /DELETE FROM public.figure_book_editions WHERE id=2/)
  assert.ok(sql.includes("E'wrong-owner'"))
})
test('wrong-owner removal refuses fake or stale attribution and does not loosen ordinary same-work placeholder introduction rules', () => {
  const { before, cross } = crossFixture()
  for (const change of [{ method: 'machine_match' }, { content_id: 'wrong-owner' }, { work_identity: 'other/work' }, { isbn: review.keepIsbn },
    { edition_title: 'Some Other Title' }, { edition_creator: 'Unknown Author' }, { locale: 'ko' }, { source_url: 'https://openlibrary.org/books/OL2M' }, { explanation: '' }]) {
    assert.throws(() => planReviewedEditionConsolidation(before, [{ ...cross, workAttribution: { ...cross.workAttribution, ...change } }]), /exact independent work attribution/)
  }
  assert.throws(() => planReviewedEditionConsolidation(before, [{ ...cross, workAttribution: undefined }]), /exact independent work attribution/)
  const unconfirmed = structuredClone(before); delete unconfirmed.contents[1].metadata.figureBook.identityEvidence
  assert.throws(() => planReviewedEditionConsolidation(unconfirmed, [cross]), /preserve exact introduction/)
  const unchanged = fixture(); unchanged.figure_book_editions[1].description = 'Exact retained introduction'; unchanged.figure_book_editions[1].sources.description = 'https://publisher.example/intro'
  unchanged.content_locales[0] = { ...unchanged.content_locales[0], isbn: null, description: unchanged.figure_book_editions[1].description,
    sources: { primary: 'none', title: 'translated', description: unchanged.figure_book_editions[1].sources.description } }
  unchanged.contents[0].metadata.figureBook.identityEvidence = 'https://library.example/catalog/original'
  assert.throws(() => planReviewedEditionConsolidation(unchanged, [review]), /preserve exact introduction/)
})
test('wrong-owner scope corrections require exact source-reviewed before and selected scope values', () => {
  const { before, cross } = crossFixture(); before.figure_book_editions[1].text_scope = 'volume/3'
  assert.throws(() => planReviewedEditionConsolidation(before, [cross]), /known text scope conflict/)
  const corrected = { ...cross, workAttribution: { ...cross.workAttribution, before_text_scope: 'volume/3', text_scope: 'complete' } }
  assert.doesNotThrow(() => planReviewedEditionConsolidation(before, [corrected]))
  assert.throws(() => planReviewedEditionConsolidation(before, [{ ...corrected, workAttribution: { ...corrected.workAttribution, before_text_scope: 'volume/4' } }]), /known text scope conflict/)
  assert.throws(() => planReviewedEditionConsolidation(before, [{ ...corrected, workAttribution: { ...corrected.workAttribution, text_scope: 'another scope' } }]), /known text scope conflict/)
  before.figure_book_editions[0].text_scope = null
  const unknown = { ...cross, workAttribution: { ...cross.workAttribution, text_scope: null } }
  assert.throws(() => planReviewedEditionConsolidation(before, [unknown]), /known text scope conflict/)
  assert.doesNotThrow(() => planReviewedEditionConsolidation(before, [{ ...unknown, workAttribution: { ...unknown.workAttribution, before_text_scope: 'volume/3' } }]))
})
test('cross-work consolidation reads both parents before and after and detects any old-owner record change', async () => {
  const { before, cross } = crossFixture(), expected = planReviewedEditionConsolidation(before, [cross]).expected
  let reads = 0
  const result = await applyReviewedEditionConsolidation(null, [cross], { capture: async (_db, assigned) => { assert.deepEqual(assigned, ['work', 'wrong-owner']); return ++reads === 1 ? before : expected }, execute: () => 'MERGE_COMMITTED' })
  assert.equal(result.consolidated, 1); assert.equal(reads, 2)
  const damaged = structuredClone(expected); damaged.celeb_contents.find(row => row.content_id === 'wrong-owner').review = 'changed'
  reads = 0
  await assert.rejects(applyReviewedEditionConsolidation(null, [cross], { capture: async () => ++reads === 1 ? before : damaged, execute: () => 'MERGE_COMMITTED' }), /readback mismatch in celeb_contents/)
})
