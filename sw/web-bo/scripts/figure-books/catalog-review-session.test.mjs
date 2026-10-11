import test from 'node:test'
import assert from 'node:assert/strict'
import { connectedReviewComponents, createReviewSession, createReviewHttpServer, createResearchCollector, createResearchDelegate, publicMetadata, reviewCandidates, fullCatalogReviewCandidates, parseReviewSessionArgs } from './catalog-review-session.mjs'

const catalog = () => ({ observedAt: 'snapshot', contents: ['a', 'b', 'c', 'd'].map(id => ({ id, figureBook: { workTitle: id, workCreator: 'Author' } })),
  locales: [{ content_id: 'a', locale: 'en', title: 'A', sources: { edition_work_evidence: [{ source_url: 'https://publisher.test/work', independent: true }] } }],
  editions: [{ id: 11, content_id: 'a', locale: 'en', title: 'A', sources: { translators: ['Translator'] }, text_scope: 'complete' }],
  products: [], relations: [], readings: [], people: [] })
const detected = { candidates: [{ contentIds: ['a', 'b'], signals: ['same-title'], evidence: [], warnings: [] },
  { contentIds: ['b', 'c'], signals: ['shared-isbn'], evidence: [], warnings: [] },
  { contentIds: ['d'], signals: ['same-work-edition-duplicate'], evidence: [], warnings: [] }] }
const finish = (lane, jobId, extra = {}) => ({ lane, jobId, result: 'completed', counts: { merged: 1 }, reason: '', keptIds: ['a'], droppedIds: ['b'], independentSourceUrls: ['https://publisher.test/work'], ...extra })
const rejects = (fn, status) => assert.throws(fn, error => error.status === status)

test('CLI full-catalog flag is opt-in and composes with existing port/lane options without a DB read', () => {
  assert.deepEqual(parseReviewSessionArgs([]), { port: 0, maxLanes: 8, fullCatalogPass: false })
  assert.deepEqual(parseReviewSessionArgs(['--full-catalog-pass', '--max-lanes', '8', '--port', '0']), { port: 0, maxLanes: 8, fullCatalogPass: true })
  assert.deepEqual(parseReviewSessionArgs(['--port', '1234', '--full-catalog-pass']), { port: 1234, maxLanes: 8, fullCatalogPass: true })
  assert.throws(() => parseReviewSessionArgs(['--full-catalog-pass', '--full-catalog-pass']), /Usage/)
  assert.deepEqual(parseReviewSessionArgs(['--port','2414','--full-catalog-pass','--research-coordinator','http://127.0.0.1:2412/']),
    {port:2414,maxLanes:8,fullCatalogPass:true,researchCoordinator:'http://127.0.0.1:2412'})
  for(const value of ['https://127.0.0.1:2412','http://outside.test:2412','http://user:secret@127.0.0.1:2412','http://127.0.0.1:2412/research',
    'http://127.0.0.1:2412?token=secret','http://127.0.0.1:2412/#fragment','http://127.0.0.1:0'])assert.throws(()=>parseReviewSessionArgs(['--research-coordinator',value]))
  assert.throws(()=>parseReviewSessionArgs(['--port','2414','--research-coordinator','http://localhost:2414']),/itself/)
})

test('full-catalog mode combines risk-connected ownership and every registered work in a single review', () => {
  const data = catalog(), session = createReviewSession(data, detected, { fullCatalogPass: true })
  assert.equal(session.status().countOriginalCandidate, data.contents.length + detected.candidates.length)
  assert.equal(session.status().groupsQueued, 2)
  assert.equal(session.status().groupsDone, 0)
  assert.equal(session.status().mode, 'full-catalog-quality-review')
  const job = session.claim({ lane: 'one' })
  assert.deepEqual(job.contentIds, ['a', 'b', 'c'])
  assert.deepEqual(job.candidates[0].signals, ['same-title'])
  assert.deepEqual(job.candidates.filter(row => row.signals.includes('full-catalog-quality-review')).map(row => row.contentIds), [['a'], ['b'], ['c']])
  assert.equal(job.candidates[0].works, undefined)
  assert.equal(createReviewSession(data, detected).status().groupsQueued, 2)
})

test('default full candidates retain actual risk evidence before healthy singleton work and exclude non-BOOK denominator', () => {
  const data = catalog(); data.locales[0].description = 'KAKAO'
  data.contents.push({ id: 'video', type: 'VIDEO', figureBook: { workTitle: 'Video' } })
  const candidates = fullCatalogReviewCandidates(data)
  assert.ok(candidates.candidates[0].signals.includes('introduction-source-locale-conflict'))
  assert.equal(candidates.bySignal['full-catalog-quality-review'], 4)
  const session = createReviewSession(data, undefined, { fullCatalogPass: true })
  assert.equal(session.status().worksTotal, 4)
  const job = session.claim({ lane: 'risk-first' })
  assert.deepEqual(job.contentIds, ['a'])
  assert.ok(job.candidates.some(row => row.signals.includes('full-catalog-quality-review')))
  assert.ok(job.candidates.some(row => row.signals.includes('introduction-source-locale-conflict')))
})

test('full batches preserve risky components and risk-first FIFO instead of filling around a non-fitting component', () => {
  const data = catalog(); data.contents = Array.from({ length: 24 }, (_,i) => ({ id: 'w' + String(i).padStart(2,'0') }))
  data.locales = []; data.editions = []
  const all = data.contents.map(row => row.id), first = all.slice(0,12), second = all.slice(12,21)
  const session = createReviewSession(data, { candidates: [
    { contentIds: first, signals: ['same-title'], warnings: ['scope_needs_review'], evidence: [{ source_url: 'https://publisher.test/first' }] },
    { contentIds: second, signals: ['shared-isbn'], warnings: [], evidence: [] },
  ] }, { fullCatalogPass: true })
  const one = session.claimBatch({ lane: 'one', maxWorks: 20 })
  assert.deepEqual(one.contentIds, first)
  assert.deepEqual(one.candidates[0].contentIds, first)
  assert.equal(one.candidates.filter(row => row.signals.includes('full-catalog-quality-review')).length,12)
  const two = session.claimBatch({ lane: 'two', maxWorks: 20 })
  assert.deepEqual(two.contentIds, all.slice(12))
  assert.deepEqual(two.candidates[0].contentIds, second)
  assert.equal(session.status().worksClaimed,24)
  rejects(() => session.reserve({ lane:'other',contentIds:[first[0]] }),409)
})

test('full batch returns no bundle before an oversized FIFO component and claim preserves its entire boundary', () => {
  const data = catalog(); data.contents = Array.from({ length: 25 }, (_,i) => ({ id: 'w' + String(i).padStart(2,'0') }))
  data.locales=[]; data.editions=[]
  const large = data.contents.slice(0,21).map(row=>row.id)
  const session = createReviewSession(data,{candidates:[{contentIds:large,signals:['shared-isbn'],warnings:[],evidence:[]}]},{fullCatalogPass:true})
  assert.equal(session.claimBatch({lane:'large'}),null)
  assert.equal(session.status().worksClaimed,0)
  assert.deepEqual(session.claim({lane:'large'}).contentIds,large)
  assert.equal(session.claimBatch({lane:'healthy'}).contentIds.length,4)
})

test('full completion requires explicit complete reviewedWorks and status counts unique works across reopen and restore', () => {
  const data=catalog(),session=createReviewSession(data,detected,{fullCatalogPass:true}),job=session.claim({lane:'full'})
  for(const counts of [{merged:1},{reviewedWorks:1},{reviewedWorks:4}])rejects(()=>session.finish(finish('full',job.id,{counts,keptIds:job.contentIds,droppedIds:[],independentSourceUrls:[]})),409)
  assert.equal(session.status().worksDone,0);assert.equal(session.status().worksClaimed,3)
  session.finish(finish('full',job.id,{result:'unresolved',counts:{reviewedWorks:2},reason:'One source still missing',keptIds:job.contentIds,droppedIds:[],independentSourceUrls:[]}))
  assert.equal(session.status().worksUnresolved,3);assert.equal(session.status().worksDone,0)
  const reopened=session.reopen({lane:'retry',contentIds:job.contentIds})
  session.finish(finish('retry',reopened.id,{counts:{reviewedWorks:3},keptIds:job.contentIds,droppedIds:[],independentSourceUrls:[]}))
  assert.equal(session.status().counts.reviewedWorks,3)
  assert.equal(session.status().worksDone,3);assert.equal(session.status().worksTotal,4)
  const fresh=createReviewSession(data,detected,{fullCatalogPass:true});fresh.restoreProgress(session.exportProgress())
  assert.equal(fresh.status().worksDone,3);assert.equal(fresh.status().worksQueued,1)
  const riskOnly=createReviewSession(data,detected),riskJob=riskOnly.claim({lane:'risk'})
  riskOnly.finish(finish('risk',riskJob.id))
  assert.equal(riskOnly.status().groupsDone,1);assert.equal(riskOnly.status().worksDone,0)
})

test('full restore rejects partial connected-component reports even when reviewedWorks covers the stated surviving IDs',()=>{
  const session=createReviewSession(catalog(),detected,{fullCatalogPass:true})
  rejects(()=>session.restoreProgress({reports:[{contentIds:['a','b'],report:finish('old','old',{counts:{reviewedWorks:2},keptIds:['a','b'],droppedIds:[],independentSourceUrls:[]})}]}),409)
  assert.equal(session.status().worksDone,0);assert.equal(session.status().worksQueued,4)
})

test('full catalog batches exactly twenty singleton boundaries and exposes intro flags without duplicating body text', () => {
  const data = catalog()
  for (let index = 0; index < 20; index++) data.contents.push({ id: 'healthy-' + index })
  data.editions[0].isbn = '9788937460470'
  data.editions[0].description = 'The full source introduction belongs in the detailed artifact only.'
  data.editions[0].sources.description = 'https://publisher.test/introduction'
  const session = createReviewSession(data, undefined, { fullCatalogPass: true }), job = session.claimBatch({ lane: 'full', maxWorks: 20 })
  assert.equal(job.contentIds.length, 20)
  assert.equal(job.candidates.length, 20)
  assert.ok(job.candidates.every(row => row.contentIds.length === 1 && row.signals[0] === 'full-catalog-quality-review'))
  assert.equal(session.status().groupsQueued, 4)
  const edition = job.works.find(row => row.id === 'a').editions[0]
  assert.equal(edition.hasRealIsbn, true)
  assert.equal(edition.introductionStatus, 'stored_text')
  assert.equal(edition.descriptionSourceUrl, 'https://publisher.test/introduction')
  assert.equal(edition.description, undefined)
  assert.equal(session.job(job.id).editions[0].description, data.editions[0].description)
  session.finish(finish('full', job.id, { counts: { reviewedWorks: 20, reviewedEditions: 1 }, keptIds: job.contentIds, droppedIds: [], independentSourceUrls: [] }))
  assert.equal(session.status().counts.reviewedWorks, 20)
  assert.equal(session.status().groupsQueued, 4)
  const refreshed = createReviewSession(data, undefined, { fullCatalogPass: true })
  assert.deepEqual(refreshed.restoreProgress(session.exportProgress()), { restored: 1 })
  assert.equal(refreshed.status().groupsQueued, 4)
  assert.equal(refreshed.status().counts.reviewedWorks, 20)
})

test('full-catalog restore rejects risk-only completion and insufficient full-scope counters without changing queue', () => {
  const session = createReviewSession(catalog(), undefined, { fullCatalogPass: true })
  const riskReport = finish('risk', 'old', { keptIds: ['a'], droppedIds: [], independentSourceUrls: [] })
  rejects(() => session.restoreProgress({ reports: [{ contentIds: ['a'], report: riskReport }] }), 409)
  rejects(() => session.restoreProgress({ reports: [{ contentIds: ['a', 'b'], report: { ...riskReport, counts: { reviewedWorks: 1 } } }] }), 409)
  assert.equal(session.status().groupsDone, 0)
  assert.equal(session.status().groupsQueued, 4)
})

test('overlap creates exclusive components while preserving original pair evidence boundaries', () => {
  const groups = connectedReviewComponents(detected.candidates)
  assert.deepEqual(groups.map(row => row.contentIds), [['a', 'b', 'c'], ['d']])
  assert.deepEqual(groups[0].candidates.map(row => row.contentIds), [['a', 'b'], ['b', 'c']])
  const session = createReviewSession(catalog(), detected), first = session.claim({ lane: 'lane-1' })
  assert.equal(session.claim({ lane: 'lane-1' }).id, first.id)
  assert.deepEqual(session.claim({ lane: 'lane-2' }).contentIds, ['d'])
  assert.equal(session.claim({ lane: 'lane-3' }), null)
  rejects(() => session.reserve({ lane: 'lane-2', contentIds: ['a'] }), 409)
})

test('reserve claims the whole component, rejects cross-component IDs and protects ownership', () => {
  const session = createReviewSession(catalog(), detected)
  const reserved = session.reserve({ lane: 'known', contentIds: ['b'] })
  assert.deepEqual(reserved.contentIds, ['a', 'b', 'c'])
  rejects(() => session.reserve({ lane: 'other', contentIds: ['a'] }), 409)
  rejects(() => session.reserve({ lane: 'other', contentIds: ['a', 'd'] }), 409)
  rejects(() => session.finish(finish('other', reserved.id)), 409)
  assert.equal(session.status().groupsClaimed, 1)
})

test('one mutation lease coordinates independent lanes and is released on finish', () => {
  const session = createReviewSession(catalog(), detected), first = session.claim({ lane: 'one' }), second = session.claim({ lane: 'two' })
  assert.equal(session.acquire({ lane: 'one', jobId: first.id }).acquired, true)
  assert.equal(session.acquire({ lane: 'one', jobId: first.id }).acquired, true)
  assert.equal(session.acquire({ lane: 'two', jobId: second.id }).busy, true)
  rejects(() => session.release({ lane: 'two', jobId: second.id }), 409)
  session.finish(finish('one', first.id))
  assert.equal(session.acquire({ lane: 'two', jobId: second.id }).acquired, true)
  assert.equal(session.release({ lane: 'two', jobId: second.id }).released, true)
})

test('finish validates IDs, provenance, counts and terminal reports without corrupting state', () => {
  const session = createReviewSession(catalog(), detected), job = session.claim({ lane: 'one' })
  for (const change of [{ droppedIds: ['d'] }, { droppedIds: ['a'] }, { counts: { merged: -1 } }, { counts: { merged: 0.5 } },
    { independentSourceUrls: [] }, { independentSourceUrls: ['https://user:password@publisher.test'] },
    { result: 'unresolved', reason: '' }, { keptIds: ['a', 'a'] }]) rejects(() => session.finish(finish('one', job.id, change)), 400)
  assert.equal(session.status().groupsClaimed, 1)
  session.finish(finish('one', job.id, { keptIds: ['a', 11] }))
  assert.equal(session.status().groupsDone, 1)
  assert.equal(session.status().counts.merged, 1)
  rejects(() => session.finish(finish('one', job.id)), 409)
  const next = session.claim({ lane: 'one' })
  session.finish(finish('one', next.id, { result: 'unresolved', counts: { merged: 0 }, reason: 'Independent source unavailable', keptIds: ['d'], droppedIds: [], independentSourceUrls: [] }))
  assert.equal(session.status().groupsUnresolved, 1)
  assert.equal(session.status().unresolved[0].reason, 'Independent source unavailable')
})

test('only four unique lanes can own assignments', () => {
  const session = createReviewSession(catalog(), { candidates: Array.from({ length: 5 }, (_, index) => ({ contentIds: ['w' + index] })) }, { maxLanes: 4 })
  for (let index = 0; index < 4; index++) session.claim({ lane: 'lane' + index })
  rejects(() => session.claim({ lane: 'fifth' }), 409)
})

test('default eight lanes and extended component ownership preserve terminal/claimed boundaries', () => {
  const session = createReviewSession(catalog(), detected), job = session.claim({ lane: 'one' })
  assert.equal(session.status().maxLanes, 8)
  const extended = session.extend({ lane: 'one', jobId: job.id, contentIds: ['d'] })
  assert.deepEqual(extended.contentIds, ['a', 'b', 'c', 'd'])
  assert.equal(session.status().groupsTotal, 1)
  assert.equal(extended.candidates.length, 3)
  assert.equal(session.claim({ lane: 'two' }), null)
  session.finish(finish('one', job.id, { keptIds: ['a', 'd'] }))
  assert.equal(session.job(job.id).contents.length, 4)
  const blocked = createReviewSession(catalog(), detected), first = blocked.claim({ lane: 'one' }), second = blocked.claim({ lane: 'two' })
  rejects(() => blocked.extend({ lane: 'one', jobId: first.id, contentIds: ['d'] }), 409)
  blocked.finish(finish('two', second.id, { keptIds: ['d'], droppedIds: [], independentSourceUrls: [] }))
  rejects(() => blocked.extend({ lane: 'one', jobId: first.id, contentIds: ['d'] }), 409)
  rejects(() => blocked.extend({ lane: 'one', jobId: first.id, contentIds: ['outside-snapshot'] }), 400)
  assert.equal(blocked.job(first.id).contents.length, 3)
})

test('extend includes a snapshot work outside the original candidate queue and its edition finish IDs', () => {
  const data = catalog(); data.contents.push({ id: 'outside', figureBook: { workTitle: 'Canonical' } })
  data.editions.push({ id: 99, content_id: 'outside', locale: 'en', title: 'Canonical', sources: {} })
  const session = createReviewSession(data, detected), job = session.claim({ lane: 'one' })
  session.extend({ lane: 'one', jobId: job.id, contentIds: ['outside'] })
  assert.ok(session.job(job.id).editions.some(row => row.id === 99))
  session.finish(finish('one', job.id, { keptIds: ['outside', 99] }))
  assert.equal(session.status().groupsDone, 1)
})

test('indexed lookup requires exact normalized title/creator pairs or a matching ISBN', () => {
  const data = catalog(); data.editions[0].isbn = '9788937460470'; data.locales[0].creator = 'Author'
  const session = createReviewSession(data, detected)
  assert.deepEqual(session.lookup({ isbns: ['8937460475'] }).works.map(row => row.id), ['a'])
  assert.deepEqual(session.lookup({ title: ' a ', creator: 'AUTHOR' }).works.map(row => row.id), ['a'])
  assert.equal(session.lookup({ title: 'A', creator: 'Different' }).works.length, 0)
  assert.equal(session.lookup({ title: 'Part of A' }).works.length, 0)
  assert.deepEqual(session.lookup({ contentIds: ['d', 'nonexistent'] }).works.map(row => row.id), ['d'])
  rejects(() => session.lookup({}), 400)
})

test('report-only export/restore retains deleted IDs and counts without exporting catalog or claiming new quality work', () => {
  const session = createReviewSession(catalog(), detected), job = session.claim({ lane: 'one' })
  session.finish(finish('one', job.id))
  const progress = session.exportProgress()
  assert.deepEqual(Object.keys(progress), ['reports'])
  assert.deepEqual(Object.keys(progress.reports[0]).sort(), ['contentIds', 'report'])
  const data = catalog(); data.contents = data.contents.filter(row => row.id !== 'b')
  const refreshed = createReviewSession(data, { candidates: [{ contentIds: ['a', 'c'], signals: [] }] })
  assert.deepEqual(refreshed.restoreProgress(progress), { restored: 1 })
  assert.equal(refreshed.status().groupsDone, 1)
  assert.equal(refreshed.status().counts.merged, 1)
  assert.deepEqual(refreshed.exportProgress(), progress)
  const noCandidate = createReviewSession(data, { candidates: [] })
  assert.deepEqual(noCandidate.restoreProgress(progress), { restored: 1 })
  assert.equal(noCandidate.status().groupsDone, 1)
  const expanded = createReviewSession(data, { candidates: [{ contentIds: ['a', 'c', 'd'], signals: [] }] })
  rejects(() => expanded.restoreProgress(progress), 409)
  assert.equal(expanded.status().groupsQueued, 1)
  const claimed = createReviewSession(data, { candidates: [{ contentIds: ['a', 'c'], signals: [] }] })
  claimed.claim({ lane: 'new' }); rejects(() => claimed.restoreProgress(progress), 409)
})

test('restore validates the entire batch before changing any job', () => {
  const data = catalog(), session = createReviewSession(data, detected)
  const report = finish('old', 'old', { keptIds: ['a'], droppedIds: [], independentSourceUrls: [] })
  rejects(() => session.restoreProgress({ reports: [{ contentIds: ['a', 'b', 'c'], report }, { contentIds: ['missing'], report }] }), 409)
  assert.equal(session.status().groupsQueued, 2)
  assert.equal(session.status().groupsDone, 0)
  rejects(() => session.restoreProgress({ reports: [{ contentIds: ['a', 'b', 'c'], report }, { contentIds: ['a', 'b', 'c'], report }] }), 409)
})

test('reopen resumes only unresolved surviving work and preserves prior counts exactly once through another export/restore', () => {
  const old = createReviewSession(catalog(), detected), job = old.claim({ lane: 'old' })
  old.finish(finish('old', job.id, { result: 'unresolved', counts: { merged: 2 }, reason: 'One pair remains blocked' }))
  const data = catalog(); data.contents = data.contents.filter(row => row.id !== 'b')
  const fresh = createReviewSession(data, { candidates: [{ contentIds: ['a', 'c'], signals: [] }] })
  fresh.restoreProgress(old.exportProgress())
  const reopened = fresh.reopen({ lane: 'retry', contentIds: ['a', 'b', 'c'] })
  assert.equal(reopened.previousCounts.merged, 2)
  assert.equal(fresh.status().counts.merged, 2)
  assert.equal(fresh.job(reopened.id).previousReports.length, 1)
  fresh.finish(finish('retry', reopened.id, { counts: { merged: 1 }, keptIds: ['a'], droppedIds: [], independentSourceUrls: [] }))
  assert.equal(fresh.status().counts.merged, 3)
  const progress = fresh.exportProgress()
  assert.equal(progress.reports[0].report.counts.merged, 3)
  assert.deepEqual(progress.reports[0].contentIds, ['a', 'b', 'c'])
  const again = createReviewSession(data, { candidates: [] }); again.restoreProgress(progress)
  assert.equal(again.status().counts.merged, 3)
  rejects(() => fresh.reopen({ lane: 'retry', contentIds: ['a'] }), 409)
})

test('mutation FIFO prevents a just-released lane from jumping ahead of waiting owners', () => {
  const data = catalog(); data.contents.push({ id: 'e' })
  const session = createReviewSession(data, { candidates: [...detected.candidates, { contentIds: ['e'], signals: [] }] })
  const one = session.claim({ lane: 'one' }), two = session.claim({ lane: 'two' }), three = session.claim({ lane: 'three' })
  assert.equal(session.acquire({ lane: 'one', jobId: one.id }).acquired, true)
  assert.equal(session.acquire({ lane: 'two', jobId: two.id }).position, 1)
  assert.equal(session.acquire({ lane: 'three', jobId: three.id }).position, 2)
  assert.equal(session.acquire({ lane: 'two', jobId: two.id }).position, 1)
  session.release({ lane: 'one', jobId: one.id })
  assert.equal(session.acquire({ lane: 'one', jobId: one.id }).position, 3)
  assert.equal(session.acquire({ lane: 'three', jobId: three.id }).busy, true)
  assert.equal(session.acquire({ lane: 'two', jobId: two.id }).acquired, true)
  session.finish(finish('two', two.id, { keptIds: ['d'], droppedIds: [], independentSourceUrls: [] }))
  assert.equal(session.acquire({ lane: 'three', jobId: three.id }).acquired, true)
  session.finish(finish('one', one.id))
  assert.equal(session.status().mutationQueue.length, 0)
})

test('reopening a full review preserves unique coverage while adding actual actions',()=>{
 const session=createReviewSession(catalog(),detected,{fullCatalogPass:true}),job=session.claim({lane:'one'})
 session.finish(finish('one',job.id,{result:'unresolved',counts:{reviewedWorks:3,merged:1},reason:'One item needs source'}))
 for(let i=0;i<2;i++){
  const reopened=session.reopen({lane:'one',contentIds:['a','b','c']})
  assert.equal(reopened.previousCounts.reviewedWorks,3)
  session.finish(finish('one',job.id,{result:'unresolved',counts:{reviewedWorks:3,merged:1},reason:'Source repair continues'}))
 }
 assert.equal(session.status().counts.reviewedWorks,3)
 assert.equal(session.status().counts.merged,3)
 const progress=session.exportProgress();assert.equal(progress.reports[0].report.counts.reviewedWorks,3)
 const restored=createReviewSession(catalog(),detected,{fullCatalogPass:true});restored.restoreProgress(progress)
 assert.equal(restored.status().counts.reviewedWorks,3);assert.equal(restored.status().counts.merged,3)
})

test('claim-batch combines independent simple pairs within maxWorks and leaves complex/claimed components untouched', () => {
  const data = catalog(); for (const id of ['e', 'f', 'g', 'h', 'i']) data.contents.push({ id })
  const candidates = [
    { contentIds: ['a', 'b'], signals: ['same-title'], warnings: [], evidence: [] },
    { contentIds: ['c', 'd'], signals: ['provider-work-key', 'same-title'], warnings: [], evidence: [] },
    { contentIds: ['e', 'f'], signals: ['same-title'], warnings: ['collection_or_set'], evidence: [] },
    { contentIds: ['g', 'h', 'i'], signals: ['same-title'], warnings: [], evidence: [] },
  ]
  const session = createReviewSession(data, { candidates })
  const batch = session.claimBatch({ lane: 'batch', maxWorks: 4 })
  assert.deepEqual(batch.contentIds, ['a', 'b', 'c', 'd'])
  assert.deepEqual(batch.candidates.map(row => row.contentIds), [['a', 'b'], ['c', 'd']])
  assert.equal(session.claimBatch({ lane: 'batch', maxWorks: 4 }).id, batch.id)
  assert.equal(session.status().groupsQueued, 2)
  rejects(() => session.reserve({ lane: 'other', contentIds: ['d'] }), 409)
  assert.equal(session.claimBatch({ lane: 'other' }), null)
  assert.deepEqual(session.claim({ lane: 'other' }).contentIds, ['e', 'f'])
  const limited = createReviewSession(data, { candidates })
  assert.equal(limited.claimBatch({ lane: 'small', maxWorks: 2 }).contentIds.length, 2)
  assert.equal(limited.status().groupsQueued, 3)
})

test('risk candidates preserve unknown translations and explicit locale/source conflicts without queuing empty introductions', () => {
  const data = catalog()
  data.locales.push({ content_id: 'd', locale: 'en', title: 'Notebook', creator: 'Stationery', description: 'KAKAO', sources: {} })
  data.editions.push({ id: 20, content_id: 'b', locale: 'en', title: 'Unknown one', isbn: '9788937460470', sources: {} },
    { id: 21, content_id: 'b', locale: 'en', title: 'Unknown two', isbn: '9788937460487', sources: {} },
    { id: 22, content_id: 'c', locale: 'ko', title: 'Foreign Book', isbn: '9788937460470', sources: {} })
  const candidates = reviewCandidates(data).candidates
  assert.ok(candidates.some(row => row.contentIds.includes('b') && row.signals.includes('translation-identity-unresolved')))
  assert.ok(candidates.some(row => row.contentIds.includes('c') && row.signals.includes('foreign-ko-edition')))
  assert.ok(candidates.some(row => row.contentIds.includes('d') && row.signals.includes('non-reading-format-review') && row.signals.includes('introduction-source-locale-conflict')))
  assert.ok(!candidates.some(row => row.signals.includes('empty-introduction')))
})

test('existing metadata policy contributes internal edition duplicates without unknown-translator inference', () => {
  const data = catalog()
  data.editions = [{ id: 1, content_id: 'a', locale: 'ko', title: '책', isbn: '9788937460470', sources: { translators: ['김철수'] } },
    { id: 2, content_id: 'a', locale: 'ko', title: '책', isbn: '9788937460487', sources: { translators: ['김철수'] } },
    { id: 3, content_id: 'b', locale: 'ko', title: '다른 책', sources: {} }, { id: 4, content_id: 'b', locale: 'ko', title: '다른 책', sources: {} }]
  const internal = reviewCandidates(data).candidates.filter(row => row.signals.includes('same-work-edition-duplicate'))
  assert.equal(internal.length, 1)
  assert.deepEqual(internal[0].contentIds, ['a'])
  assert.deepEqual(internal[0].editionIds.sort(), [1, 2])
})

test('full job preserves independent locale evidence while metadata excludes sensitive credentials', () => {
  const session = createReviewSession(catalog(), detected), job = session.claim({ lane: 'one' })
  assert.equal(session.job(job.id).locales[0].sources.edition_work_evidence[0].independent, true)
  assert.ok(job.works[0].sourceUrls.includes('https://publisher.test/work'))
  assert.deepEqual(publicMetadata({ title: 'Book', api_key: 'private', source_url: 'https://user:pass@publisher.test/work?token=private&isbn=123' }),
    { title: 'Book', source_url: 'https://publisher.test/work?isbn=123' })
})

test('provider collector serializes overlapping requests and caches each ISBN in RAM', async () => {
  let active = 0, peak = 0, calls = 0, factories = 0
  const research = createResearchCollector(async () => { factories++; return { collect: async (provider, isbns) => {
    calls++; active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10)); active--
    return isbns.map(isbn => ({ isbn, data: { isbn, provider, api_key: 'never-return' } }))
  } } })
  const inputs = { provider: 'kakao', isbns: ['9788937460470'] }
  const results = await Promise.all([research(inputs), research(inputs), research(inputs)])
  assert.equal(factories, 1); assert.equal(calls, 1); assert.equal(peak, 1)
  assert.equal(results[0].results[0].data.api_key, undefined)
  const aliased = await research({ provider: 'kakao', isbns: ['8937460475'] })
  assert.equal(aliased.results[0].isbn, '9788937460470')
  assert.equal(calls, 1)
  await assert.rejects(() => research({ provider: 'other', isbns: ['9788937460470'] }), error => error.status === 400)
})

test('research delegate sends only validated ISBNs to central loopback, strips credentials and has no local cache',async()=>{
  const calls=[]
  const research=createResearchDelegate('http://127.0.0.1:2412',{fetchImpl:async(url,options)=>{
    calls.push({url,options});return {ok:true,json:async()=>({provider:'kakao',results:[{isbn:'9788937460470',data:{title:'Book',api_key:'private',source_url:'https://publisher.test/book?token=private&isbn=9788937460470'}}]})}
  }})
  const input={provider:'kakao',isbns:['8937460475','9788937460470']}
  const first=await research(input);await research(input)
  assert.equal(calls.length,2)
  assert.equal(calls[0].url,'http://127.0.0.1:2412/research')
  assert.deepEqual(JSON.parse(calls[0].options.body),{provider:'kakao',isbns:['9788937460470']})
  assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.credentials,'omit')
  assert.equal(first.results[0].data.api_key,undefined)
  assert.equal(first.results[0].data.source_url,'https://publisher.test/book?isbn=9788937460470')
  await assert.rejects(()=>research({provider:'other',isbns:['9788937460470']}),error=>error.status===400)
  await assert.rejects(()=>research({provider:'kakao',isbns:['9788937460471']}),error=>error.status===400)
  assert.equal(calls.length,2)
})

test('research delegate refuses mismatched central data and withholds raw provider errors',async()=>{
  for(const fetchImpl of [async()=>{throw Error('password=private api_key=private')},async()=>({ok:false,json:async()=>({error:'private'})}),
    async()=>({ok:true,json:async()=>({provider:'openlibrary',results:[{isbn:'9788937460470',data:null}]})}),
    async()=>({ok:true,json:async()=>({provider:'kakao',results:[{isbn:'9788937460487',data:null}]})})]){
    const delegate=createResearchDelegate('http://127.0.0.1:2412',{fetchImpl})
    await assert.rejects(()=>delegate({provider:'kakao',isbns:['9788937460470']}),error=>error.status===502&&!error.message.includes('private'))
  }
})

test('full coordinator research HTTP delegation reuses central serialization/cache without a provider factory',async t=>{
  let providerCalls=0
  const central=createReviewHttpServer(createReviewSession(catalog(),detected),{research:createResearchCollector(async()=>({collect:async(provider,isbns)=>{
    providerCalls++;await new Promise(resolve=>setTimeout(resolve,10));return isbns.map(isbn=>({isbn,data:{title:'Central result'}}))
  }}))})
  await new Promise(resolve=>central.listen(0,'127.0.0.1',resolve))
  const delegate=createReviewHttpServer(createReviewSession(catalog(),detected,{fullCatalogPass:true}),{research:createResearchDelegate('http://127.0.0.1:'+central.address().port)})
  await new Promise(resolve=>delegate.listen(0,'127.0.0.1',resolve))
  t.after(()=>Promise.all([central,delegate].map(server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}))))
  const base='http://127.0.0.1:'+delegate.address().port
  const results=await Promise.all(Array.from({length:3},()=>fetch(base+'/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'kakao',isbns:['9788937460470']})}).then(response=>response.json())))
  assert.equal(providerCalls,1)
  assert.ok(results.every(row=>row.results[0].data.title==='Central result'))
  assert.equal((await(await fetch(base+'/status')).json()).worksDone,0)
})

test('HTTP rejects foreign browser origins, malformed input and wrong-lane finish', async t => {
  const server = createReviewHttpServer(createReviewSession(catalog(), detected))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  const base = 'http://127.0.0.1:' + server.address().port
  const post = (path, value, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) })
  assert.equal((await post('/claim', { lane: 'one' }, { Origin: 'https://external.test' })).status, 403)
  assert.equal((await fetch(base + '/claim', { method: 'POST', body: '{' })).status, 400)
  assert.equal(await (await post('/claim-batch', { lane: 'one', maxWorks: 20 })).json(), null)
  assert.deepEqual((await (await post('/work-lookup', { contentIds: ['d'] })).json()).works.map(row => row.id), ['d'])
  const job = await (await post('/claim', { lane: 'one' })).json()
  const extended = await (await post('/extend', { lane: 'one', jobId: job.id, contentIds: ['d'] })).json()
  assert.deepEqual(extended.contentIds, ['a', 'b', 'c', 'd'])
  const claimedLookup = await (await post('/work-lookup', { contentIds: ['d'] })).json()
  assert.deepEqual(claimedLookup.works[0].assignment, { jobId: job.id, state: 'claimed', lane: 'one' })
  assert.equal((await post('/finish', finish('two', job.id))).status, 409)
  assert.equal((await post('/finish', finish('one', job.id))).status, 200)
  const terminalLookup = await (await post('/work-lookup', { contentIds: ['d'] })).json()
  assert.deepEqual(terminalLookup.works[0].assignment, { jobId: job.id, state: 'done', lane: 'one' })
  const progress = await (await post('/export-progress', {})).json()
  assert.equal(progress.reports.length, 1)
  assert.deepEqual(progress.reports[0].contentIds, ['a', 'b', 'c', 'd'])
  assert.equal((await post('/restore-progress', progress)).status, 409)
  assert.equal((await post('/reopen', { lane: 'one', contentIds: ['a'] })).status, 409)
  assert.equal((await (await fetch(base + '/status')).json()).groupsDone, 1)
})
