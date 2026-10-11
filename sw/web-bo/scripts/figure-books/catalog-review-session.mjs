/** Loopback-only, RAM-only review assignment. Components coordinate ownership, never infer merges. */
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadSeriesAuditCatalog } from './series-split-audit.mjs'
import { detectSplitSeries, detectEditionAttributionRisks } from './lib/series-audit.mjs'
import { planEditionTranslations } from './lib/edition-translation-policy.mjs'
import { foreignKoEditionCandidates } from './lib/foreign-edition-audit.mjs'
import { nonReadingFormatReviewSignals } from './lib/edition-catalog-checks.mjs'
import { toIsbn13 } from '../../../../packages/content-search/src/book-isbn.ts'
import { bookEditionTitleKey } from '../../../../packages/content-search/src/book-series.ts'
import { isBookIntroductionSource } from '../../../../packages/content-search/src/book-introduction-contract.ts'

const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const unique = values => [...new Set(values)]
const safeKey = /(?:password|secret|token|authorization|api[_-]?key|credential)/iu
// Source metadata contains public bibliography, not configuration. Still strip credential fields/URLs.
export function publicMetadata(value) {
  if (Array.isArray(value)) return value.map(publicMetadata)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !safeKey.test(key)).map(([key, entry]) => [key, publicMetadata(entry)]))
  if (typeof value === 'string' && /^https?:\/\//u.test(value)) {
    try { const url = new URL(value); let changed = !!url.username || !!url.password; url.username = ''; url.password = ''
      for (const key of [...url.searchParams.keys()]) if (safeKey.test(key)) { url.searchParams.delete(key); changed = true }
      return changed ? url.href : value
    } catch { return null }
  }
  return value
}
function sourceUrls(value, found = new Set()) {
  if (typeof value === 'string' && /^https?:\/\//u.test(value)) found.add(value)
  else if (Array.isArray(value)) for (const entry of value) sourceUrls(entry, found)
  else if (value && typeof value === 'object') for (const entry of Object.values(value)) sourceUrls(entry, found)
  return [...found]
}
const relevantEvidence = sources => Object.fromEntries(Object.entries(sources ?? {}).filter(([key, value]) =>
  /evidence|attribution|translat|original|workkey|workidentity|edition_key/iu.test(key)
  || (typeof value === 'string' && /^https?:\/\//u.test(value)) || key === 'primary'))

export function loadFullLocaleMetadata() {
  const sql = `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT jsonb_build_object('observedAt',transaction_timestamp(),'locales',coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.content_id,l.locale),'[]'::jsonb))
FROM content_locales l JOIN contents c ON c.id=l.content_id AND c.type='BOOK'; COMMIT;`
  const command = "docker exec feelandnote-db psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d postgres -c '" + sql.replaceAll("'", "'\\''") + "'"
  const result = spawnSync('ssh', ['-i', 'C:/Users/webco/.ssh/feelandnote_oracle', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'ubuntu@152.67.198.197', command],
    { encoding: 'utf8', windowsHide: true, timeout: 80000, maxBuffer: 128 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error('Full locale source read failed')
  const data = JSON.parse(result.stdout)
  if (!Array.isArray(data.locales)) throw new Error('Full locale source read returned no locales')
  return data
}

export function reviewCandidates(catalog) {
  const split = detectSplitSeries(catalog), translations = planEditionTranslations(catalog)
  const internal = translations.duplicates.map(({ keep, drops }) => ({
    contentIds: [keep.content_id], signals: ['same-work-edition-duplicate'], warnings: [],
    editionIds: [keep.id, ...drops.map(row => row.id)],
    evidence: [{ kind: 'edition-translation-policy', locale: keep.locale, editionIds: [keep.id, ...drops.map(row => row.id)] }],
  }))
  const risks = new Map()
  const addRisk = (row, signal, evidence) => {
    const contentId = row.content_id ?? row.contentId, candidate = risks.get(contentId) ?? { contentIds: [contentId], signals: [], warnings: [], evidence: [] }
    candidate.signals = unique([...candidate.signals, signal]); candidate.evidence.push({ kind: signal, ...evidence }); risks.set(contentId, candidate)
  }
  for (const row of detectEditionAttributionRisks(catalog)) addRisk(row, 'edition-attribution-risk', row)
  for (const row of translations.unresolved) addRisk(row, 'translation-identity-unresolved', { editionId: row.id, locale: row.locale, title: row.title, isbn: row.isbn })
  for (const row of foreignKoEditionCandidates(catalog)) addRisk(row, 'foreign-ko-edition', { editionId: row.id, locale: row.locale, title: row.title, isbn: row.isbn })
  for (const [table, rows] of [['content_locales', catalog.locales], ['figure_book_editions', catalog.editions]]) for (const row of rows) {
    const signals = nonReadingFormatReviewSignals(row)
    if (signals.length) addRisk(row, 'non-reading-format-review', { table, id: row.id, locale: row.locale, isbn: row.isbn, title: row.title, signals })
    if (isBookIntroductionSource(row.description) && ((row.locale === 'ko' && row.description === 'OPEN') || (row.locale === 'en' && row.description !== 'OPEN')))
      addRisk(row, 'introduction-source-locale-conflict', { table, id: row.id, locale: row.locale, description: row.description })
  }
  const candidates = [...split.candidates, ...internal, ...risks.values()]
  return { candidates, diagnostics: split.diagnostics,
    bySignal: Object.fromEntries(unique(candidates.flatMap(row => row.signals)).map(signal => [signal, candidates.filter(row => row.signals.includes(signal)).length])) }
}

export function fullCatalogReviewCandidates(catalog, detected = reviewCandidates(catalog)) {
  const works = catalog.contents.filter(work => work.type === undefined || work.type === 'BOOK')
  const candidates = [...detected.candidates, ...works.map(work => ({ contentIds: [work.id], signals: ['full-catalog-quality-review'], warnings: [], evidence: [] }))]
  return { candidates, diagnostics: { ...detected.diagnostics, fullCatalogPass: true },
    bySignal: Object.fromEntries(unique(candidates.flatMap(row => row.signals)).map(signal => [signal, candidates.filter(row => row.signals.includes(signal)).length])) }
}

function validateReport({ result, counts, reason, keptIds, droppedIds, independentSourceUrls }, allowed = null) {
  if (!['completed', 'unresolved'].includes(result)) fail(400, 'Invalid result')
  if (!counts || Array.isArray(counts) || typeof counts !== 'object' || Object.entries(counts).some(([key, n]) => !/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/u.test(key) || !Number.isSafeInteger(n) || n < 0)) fail(400, 'counts must contain nonnegative integers')
  if (typeof reason !== 'string' || reason.length > 8000 || (result === 'unresolved' && !reason.trim())) fail(400, 'A reason string is required; unresolved requires a nonempty reason')
  for (const ids of [keptIds, droppedIds]) if (!Array.isArray(ids) || ids.some(id => !['string', 'number'].includes(typeof id) || !String(id) || (allowed && !allowed.has(String(id)))) || unique(ids.map(String)).length !== ids.length) fail(400, 'Reported IDs must be unique and owned by this component')
  if (keptIds.some(id => droppedIds.map(String).includes(String(id)))) fail(400, 'An ID cannot be both kept and dropped')
  if (!Array.isArray(independentSourceUrls) || independentSourceUrls.some(value => {
    try { const url = new URL(value); return typeof value !== 'string' || url.protocol !== 'https:' || !!url.username || !!url.password || [...url.searchParams.keys()].some(key => safeKey.test(key)) } catch { return true }
  }) || (droppedIds.length && !independentSourceUrls.length)) fail(400, 'Independent HTTPS source URLs are required for reported drops')
  return { result, counts: { ...counts }, reason, keptIds: [...keptIds], droppedIds: [...droppedIds], independentSourceUrls: unique(independentSourceUrls) }
}

export function connectedReviewComponents(candidates) {
  const parent = new Map()
  const root = id => { if (!parent.has(id)) parent.set(id, id)
    let current = id; while (parent.get(current) !== current) current = parent.get(current)
    while (parent.get(id) !== id) { const next = parent.get(id); parent.set(id, current); id = next }
    return current
  }
  for (const candidate of candidates) {
    if (!Array.isArray(candidate.contentIds) || !candidate.contentIds.length) throw new Error('Candidate requires content IDs')
    const first = root(candidate.contentIds[0])
    for (const id of candidate.contentIds.slice(1)) parent.set(root(id), root(first))
  }
  const groups = new Map()
  for (const candidate of candidates) {
    const key = root(candidate.contentIds[0]), group = groups.get(key) ?? { contentIds: [], candidates: [] }
    group.contentIds.push(...candidate.contentIds); group.candidates.push(candidate); groups.set(key, group)
  }
  return [...groups.values()].map((group, index) => ({ id: 'job-' + (index + 1),
    contentIds: unique(group.contentIds).sort(), candidates: group.candidates, state: 'queued', lane: null }))
}

export function createReviewSession(catalog, detected, { maxLanes = 8, fullCatalogPass = false } = {}) {
  if (!Number.isSafeInteger(maxLanes) || maxLanes < 1 || maxLanes > 32) throw new Error('maxLanes must be an integer from 1 to 32')
  if (typeof fullCatalogPass !== 'boolean') throw new Error('fullCatalogPass must be boolean')
  detected = fullCatalogPass ? fullCatalogReviewCandidates(catalog, detected) : detected ?? reviewCandidates(catalog)
  const started = Date.now(), jobs = connectedReviewComponents(detected.candidates), lanes = new Set()
  const workById = new Map(catalog.contents.map(row => [row.id, row]))
  const bookIds = new Set(catalog.contents.filter(row => row.type === undefined || row.type === 'BOOK').map(row => row.id))
  const workToJob = new Map(jobs.flatMap(job => job.contentIds.map(id => [id, job])))
  let nextJobNumber = jobs.length + 1
  const locales = new Map(), editions = new Map()
  for (const [rows, index] of [[catalog.locales, locales], [catalog.editions, editions]]) for (const row of rows) {
    const group = index.get(row.content_id) ?? []; group.push(row); index.set(row.content_id, group)
  }
  const titleIndex = new Map(), creatorIndex = new Map(), titleCreatorIndex = new Map(), isbnIndex = new Map()
  const textKey = value => bookEditionTitleKey(String(value ?? '').normalize('NFKC').toLowerCase())
  const addIndex = (index, key, id) => { if (!key) return; const ids = index.get(key) ?? new Set(); ids.add(id); index.set(key, ids) }
  for (const work of catalog.contents) {
    const figure = work.figureBook ?? {}, variants = [...(locales.get(work.id) ?? []), ...(editions.get(work.id) ?? []),
      { title: figure.workTitle, creator: figure.workCreator }, { title: figure.originalTitle, creator: figure.originalCreator }]
    for (const row of variants) {
      const title = textKey(row.title), creator = textKey(row.creator)
      addIndex(titleIndex, title, work.id); addIndex(creatorIndex, creator, work.id)
      if (title && creator) addIndex(titleCreatorIndex, title + '|' + creator, work.id)
      addIndex(isbnIndex, toIsbn13(row.isbn ?? ''), work.id)
    }
    addIndex(isbnIndex, toIsbn13(work.external_id ?? ''), work.id)
  }
  let lease = null
  const leaseWaiters = []
  const cleanWaiters = () => {
    for (let i = leaseWaiters.length - 1; i >= 0; i--) {
      const waiter = leaseWaiters[i], job = jobs.find(row => row.id === waiter.jobId)
      if (!job || job.state !== 'claimed' || job.lane !== waiter.lane) leaseWaiters.splice(i, 1)
    }
  }
  const previousCounts = job => {
    const counts = Object.create(null)
    for (const report of job.reportHistory ?? []) for (const [key, n] of Object.entries(report.counts)) counts[key] = (counts[key] ?? 0) + n
    return counts
  }
  const reportCounts = job => {
    const counts = previousCounts(job)
    for (const [key, n] of Object.entries(job.report?.counts ?? {})) counts[key] = (counts[key] ?? 0) + n
    return counts
  }
  const owned = (lane, jobId) => {
    const job = jobs.find(row => row.id === jobId)
    if (!job) fail(404, 'Unknown job')
    if (job.lane !== lane || job.state !== 'claimed') fail(409, 'Lane does not own an outstanding job')
    return job
  }
  const laneName = lane => {
    if (typeof lane !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/u.test(lane)) fail(400, 'Invalid lane name')
    if (!lanes.has(lane) && lanes.size >= maxLanes) fail(409, 'Maximum review lanes are already registered')
  }
  const fullJob = job => {
    const ids = new Set(job.contentIds), personIds = new Set([...catalog.relations, ...catalog.readings].filter(row => ids.has(row.content_id)).map(row => row.celeb_id))
    return publicMetadata({ id: job.id, lane: job.lane, state: job.state, contentIds: job.contentIds, candidates: job.candidates,
      contents: job.contentIds.map(id => workById.get(id)), locales: job.contentIds.flatMap(id => locales.get(id) ?? []),
      editions: job.contentIds.flatMap(id => editions.get(id) ?? []),
      products: (catalog.products ?? []).filter(row => job.contentIds.some(id => (editions.get(id) ?? []).some(e => e.id === row.edition_id))),
      relations: catalog.relations.filter(row => ids.has(row.content_id)), readings: catalog.readings.filter(row => ids.has(row.content_id)),
      people: catalog.people.filter(row => personIds.has(row.id)), report: job.report ?? null, previousReports: job.reportHistory ?? [] })
  }
  const introductionFlags = row => {
    const description = String(row.description ?? '').trim(), marker = isBookIntroductionSource(row.description)
    return { introductionStatus: !description ? 'missing' : marker
      ? ((row.locale === 'ko' && row.description === 'OPEN') || (row.locale === 'en' && row.description !== 'OPEN') ? 'source_locale_conflict' : 'source_registered') : 'stored_text',
      introductionSource: marker ? row.description : null,
      descriptionSourceUrl: publicMetadata(/^https:\/\//u.test(row.sources?.description ?? '') ? row.sources.description : null) }
  }
  const compactJob = job => ({ id: job.id, lane: job.lane, contentIds: job.contentIds, previousCounts: previousCounts(job),
    // Keep original candidate boundaries: an overlapping component is not a same-work assertion.
    candidates: job.candidates.map(({ contentIds, signals, warnings, evidence, editionIds }) => ({ contentIds, signals, warnings, evidence, editionIds })),
    works: job.contentIds.map(id => {
      const work = workById.get(id), cards = locales.get(id) ?? [], rows = editions.get(id) ?? []
      const sources = publicMetadata({ figureBook: work?.figureBook, locales: cards.map(row => ({ locale: row.locale, sources: relevantEvidence(row.sources) })),
        editions: rows.map(row => ({ id: row.id, sources: relevantEvidence(row.sources) })) })
      return { id, title: work?.figureBook?.workTitle ?? cards[0]?.title ?? rows[0]?.title ?? null,
        creator: work?.figureBook?.workCreator ?? cards[0]?.creator ?? rows[0]?.creator ?? null,
        identity: work?.figureBook?.workIdentity ?? work?.metadata?.workIdentity ?? null,
        isbns: unique([work?.external_id, ...cards.map(row => row.isbn), ...rows.map(row => row.isbn)].filter(Boolean)),
        locales: cards.map(row => ({ locale: row.locale, title: row.title, creator: row.creator, isbn: row.isbn,
          ...(fullCatalogPass ? { hasRealIsbn: !!toIsbn13(row.isbn ?? ''), ...introductionFlags(row) } : {}) })),
        editions: rows.map(row => ({ id: row.id, locale: row.locale, title: row.title, creator: row.creator, isbn: row.isbn,
          translators: row.sources?.translators ?? null, edition_kind: row.edition_kind, text_scope: row.text_scope,
          ...(fullCatalogPass ? { hasRealIsbn: !!toIsbn13(row.isbn ?? ''), publisher: row.publisher, release_date: row.release_date, ...introductionFlags(row) } : {}) })),
        evidence: sources, sourceUrls: sourceUrls(publicMetadata([work?.figureBook, ...cards.map(row => row.sources), ...rows.map(row => row.sources)])) }
    }) })
  const claimJob = (lane, target) => {
    laneName(lane)
    const outstanding = jobs.find(row => row.lane === lane && row.state === 'claimed')
    if (outstanding) { if (target && target !== outstanding) fail(409, 'Lane already owns another component'); return compactJob(outstanding) }
    const job = target ?? jobs.find(row => row.state === 'queued')
    if (!job) return null
    if (job.state !== 'queued') fail(409, 'Component is already claimed or finished')
    lanes.add(lane); job.lane = lane; job.state = 'claimed'; return compactJob(job)
  }
  return {
    status() {
      const counts = Object.create(null)
      for (const job of jobs) for (const [key, n] of Object.entries(reportCounts(job))) counts[key] = (counts[key] ?? 0) + n
      // Action totals may repeat on reopen. Full-review coverage counts each owned BOOK only once.
      const workCount = state => unique(jobs.filter(job => job.state === state && (state !== 'done'
        || Number.isSafeInteger(job.report?.counts.reviewedWorks) && job.report.counts.reviewedWorks >= job.contentIds.length))
        .flatMap(job => job.contentIds).filter(id => bookIds.has(id))).length
      return { elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)), observedAt: catalog.observedAt,
        fullCatalogPass, mode: fullCatalogPass ? 'full-catalog-quality-review' : 'duplicate-and-risk-review',
        localeSourcesObservedAt: catalog.localeSourcesObservedAt ?? catalog.observedAt,
        countOriginalCandidate: detected.candidates.length, groupsTotal: jobs.length,
        ...Object.fromEntries(['queued', 'claimed', 'done', 'unresolved'].map(state => ['groups' + state[0].toUpperCase() + state.slice(1), jobs.filter(row => row.state === state).length])),
        worksTotal: bookIds.size, ...Object.fromEntries(['queued', 'claimed', 'done', 'unresolved'].map(state => ['works' + state[0].toUpperCase() + state.slice(1), workCount(state)])),
        catalogCounts: Object.fromEntries(['contents', 'locales', 'editions', 'relations', 'readings'].map(key => [key, catalog[key].length])),
        counts, maxLanes, lanes: [...lanes], lease, mutationQueue: leaseWaiters.map(row => ({ ...row })), diagnostics: detected.diagnostics, bySignal: detected.bySignal,
        unresolved: jobs.filter(row => row.state === 'unresolved').map(row => ({ jobId: row.id, lane: row.lane, contentIds: row.contentIds, reason: row.report.reason })) }
    },
    claim({ lane }) { return claimJob(lane) },
    claimBatch({ lane, maxWorks = 20 }) {
      laneName(lane)
      if (!Number.isSafeInteger(maxWorks) || maxWorks < 1 || maxWorks > 20) fail(400, 'maxWorks must be an integer from 1 to 20')
      const outstanding = jobs.find(job => job.lane === lane && job.state === 'claimed')
      if (outstanding) return compactJob(outstanding)
      const simple = job => job.state === 'queued' && (fullCatalogPass
        ? job.contentIds.length <= maxWorks
        : job.contentIds.length <= 2 && job.candidates.length > 0
        && job.candidates.every(candidate => !(candidate.warnings?.length) && candidate.contentIds.length <= 2
          && candidate.signals?.some(signal => ['same-title', 'provider-work-key'].includes(signal))
          && candidate.signals.every(signal => ['same-title', 'provider-work-key', 'work-identity', 'shared-isbn'].includes(signal))))
      const selected = []; let count = 0
      for (const job of jobs) {
        if (job.state !== 'queued') continue
        // Full mode preserves risk-first FIFO and whole components. Oversized first work uses /claim.
        if (fullCatalogPass && (!simple(job) || count + job.contentIds.length > maxWorks)) break
        if (simple(job) && count + job.contentIds.length <= maxWorks) { selected.push(job); count += job.contentIds.length }
      }
      if (!selected.length) return null
      const first = selected[0]
      first.contentIds = unique(selected.flatMap(job => job.contentIds)).sort()
      first.candidates = selected.flatMap(job => job.candidates)
      for (const other of selected.slice(1)) jobs.splice(jobs.indexOf(other), 1)
      for (const id of first.contentIds) workToJob.set(id, first)
      return claimJob(lane, first)
    },
    reserve({ lane, contentIds }) {
      if (!Array.isArray(contentIds) || !contentIds.length || contentIds.some(id => typeof id !== 'string')) fail(400, 'contentIds must be a nonempty string array')
      const matches = jobs.filter(job => contentIds.some(id => job.contentIds.includes(id)))
      if (matches.length !== 1 || !contentIds.every(id => matches[0].contentIds.includes(id))) fail(409, 'Requested IDs must belong to one existing component')
      return claimJob(lane, matches[0])
    },
    reopen({ lane, contentIds }) {
      laneName(lane)
      if (!Array.isArray(contentIds) || !contentIds.length || contentIds.some(id => typeof id !== 'string')) fail(400, 'contentIds required')
      const surviving = contentIds.filter(id => workById.has(id)), matches = unique(surviving.map(id => workToJob.get(id)).filter(Boolean))
      if (matches.length !== 1 || matches[0].state !== 'unresolved' || !surviving.every(id => matches[0].contentIds.includes(id))
        || !contentIds.every(id => matches[0].contentIds.includes(id) || (matches[0].reportContentIds ?? []).includes(id))) fail(409, 'Reopen requires one matching unresolved component')
      if (jobs.some(job => job.lane === lane && job.state === 'claimed')) fail(409, 'Lane already owns another component')
      const job = matches[0]
      job.reportHistory ??= []; job.reportHistory.push(job.report); job.report = null
      job.state = 'claimed'; job.lane = lane; lanes.add(lane); cleanWaiters()
      return compactJob(job)
    },
    extend({ lane, jobId, contentIds }) {
      const job = owned(lane, jobId)
      if (!Array.isArray(contentIds) || !contentIds.length || contentIds.some(id => typeof id !== 'string' || !workById.has(id))) fail(400, 'Extension IDs must exist in the original catalog snapshot')
      const absorbed = unique(contentIds.map(id => workToJob.get(id)).filter(other => other && other !== job))
      if (absorbed.some(other => other.state !== 'queued')) fail(409, 'Extension overlaps another claimed or finished component')
      job.contentIds = unique([...job.contentIds, ...contentIds, ...absorbed.flatMap(other => other.contentIds)]).sort()
      if (job.reportContentIds) job.reportContentIds = unique([...job.reportContentIds, ...job.contentIds])
      job.candidates.push(...absorbed.flatMap(other => other.candidates))
      for (const other of absorbed) jobs.splice(jobs.indexOf(other), 1)
      for (const id of job.contentIds) workToJob.set(id, job)
      return compactJob(job)
    },
    lookup({ contentIds = [], isbns = [], title, creator }) {
      if (!Array.isArray(contentIds) || !Array.isArray(isbns) || contentIds.some(id => typeof id !== 'string') || isbns.some(isbn => typeof isbn !== 'string')
        || (title !== undefined && typeof title !== 'string') || (creator !== undefined && typeof creator !== 'string')) fail(400, 'Invalid lookup fields')
      const exactIds = new Set(contentIds.filter(id => workById.has(id)))
      for (const raw of isbns) { const isbn = toIsbn13(raw); if (!isbn) fail(400, 'Invalid lookup ISBN'); for (const id of isbnIndex.get(isbn) ?? []) exactIds.add(id) }
      const titleKey = textKey(title), creatorKey = textKey(creator)
      const textMatches = titleKey && creatorKey ? titleCreatorIndex.get(titleKey + '|' + creatorKey)
        : titleKey ? titleIndex.get(titleKey) : creatorKey ? creatorIndex.get(creatorKey) : null
      if (titleKey || creatorKey) for (const id of textMatches ?? []) exactIds.add(id)
      if (!contentIds.length && !isbns.length && !titleKey && !creatorKey) fail(400, 'At least one exact lookup criterion is required')
      return { works: compactJob({ id: null, lane: null, contentIds: [...exactIds].sort(), candidates: [] }).works }
    },
    exportProgress() { return { reports: jobs.filter(job => ['done', 'unresolved'].includes(job.state))
      .map(job => ({ contentIds: [...(job.reportContentIds ?? job.contentIds)], report: structuredClone({ ...job.report, counts: reportCounts(job) }) })) } },
    restoreProgress({ reports }) {
      if (!Array.isArray(reports)) fail(400, 'reports array required')
      const planned = [], used = new Set()
      for (const entry of reports) {
        if (!entry || !Array.isArray(entry.contentIds) || !entry.contentIds.length || entry.contentIds.some(id => typeof id !== 'string' || !id)
          || unique(entry.contentIds).length !== entry.contentIds.length) fail(400, 'Invalid report content IDs')
        const report = validateReport(entry.report ?? {}), surviving = entry.contentIds.filter(id => workById.has(id))
        if (!surviving.length) fail(409, 'Report has no surviving work ID in the fresh snapshot')
        if (fullCatalogPass && !(Number.isSafeInteger(report.counts.reviewedWorks) && report.counts.reviewedWorks >= surviving.length)) fail(409, 'Full catalog restore requires an explicit reviewedWorks count covering every surviving work')
        if (surviving.some(id => used.has(id))) fail(409, 'Restored reports overlap')
        const matches = unique(surviving.map(id => workToJob.get(id)).filter(Boolean))
        if ((!fullCatalogPass && matches.length > 1) || matches.some(job => job.state !== 'queued' || job.contentIds.some(id => !surviving.includes(id)))) fail(409, 'Report cannot unambiguously cover unclaimed components')
        surviving.forEach(id => used.add(id)); planned.push({ job: matches[0], absorbed: matches.slice(1), surviving, original: [...entry.contentIds], report })
      }
      for (const entry of planned) {
        const job = entry.job ?? { id: 'job-' + nextJobNumber++, candidates: [], lane: null }
        if (!entry.job) jobs.push(job)
        for (const other of entry.absorbed) { job.candidates.push(...other.candidates); jobs.splice(jobs.indexOf(other), 1) }
        job.contentIds = entry.surviving; job.reportContentIds = entry.original; job.report = entry.report
        job.state = entry.report.result === 'completed' ? 'done' : 'unresolved'
        for (const id of job.contentIds) workToJob.set(id, job)
      }
      return { restored: planned.length }
    },
    job(id) { const job = jobs.find(row => row.id === id); if (!job) fail(404, 'Unknown job'); return fullJob(job) },
    acquire({ lane, jobId }) { owned(lane, jobId); cleanWaiters()
      if (lease?.lane === lane && lease.jobId === jobId) return { acquired: true, busy: false, lease }
      if (!leaseWaiters.some(row => row.lane === lane && row.jobId === jobId)) leaseWaiters.push({ lane, jobId })
      if (lease || leaseWaiters[0].lane !== lane || leaseWaiters[0].jobId !== jobId)
        return { acquired: false, busy: true, lease, position: leaseWaiters.findIndex(row => row.lane === lane && row.jobId === jobId) + 1 }
      leaseWaiters.shift(); lease = { lane, jobId }; return { acquired: true, busy: false, lease }
    },
    release({ lane, jobId }) { owned(lane, jobId)
      if (lease && (lease.lane !== lane || lease.jobId !== jobId)) fail(409, 'Mutation lease belongs to another job')
      lease = null
      for (let i = leaseWaiters.length - 1; i >= 0; i--) if (leaseWaiters[i].lane === lane && leaseWaiters[i].jobId === jobId) leaseWaiters.splice(i, 1)
      cleanWaiters(); return { released: true }
    },
    finish({ lane, jobId, result, counts, reason, keptIds, droppedIds, independentSourceUrls }) {
      const job = owned(lane, jobId)
      const allowed = new Set([...job.contentIds, ...job.contentIds.flatMap(id => (editions.get(id) ?? []).map(row => String(row.id)))])
      const report = validateReport({ result, counts, reason, keptIds, droppedIds, independentSourceUrls }, allowed)
      if (fullCatalogPass && result === 'completed' && report.counts.reviewedWorks !== job.contentIds.length)
        fail(409, 'Full catalog completion requires an explicit reviewedWorks count for every owned work')
      job.report = report
      job.state = result === 'completed' ? 'done' : 'unresolved'
      if (lease?.lane === lane && lease.jobId === jobId) lease = null
      cleanWaiters()
      return { accepted: true, jobId, result }
    },
  }
}

function researchInput({ provider, isbns }) {
  if (!['kakao', 'openlibrary', 'yes24'].includes(provider) || !Array.isArray(isbns) || !isbns.length || isbns.length > 20
    || isbns.some(isbn => typeof isbn !== 'string' || !/^(?:\d{9}[\dXx]|\d{13})$/u.test(isbn))) fail(400, 'Invalid research provider or ISBN list (1..20)')
  isbns = unique(isbns.map(toIsbn13))
  if (isbns.some(isbn => !isbn)) fail(400, 'Invalid ISBN checksum')
  return { provider, isbns }
}
export function createResearchCollector(factory) {
  let helper
  const tails = new Map(), cache = new Map()
  return async input => {
    const { provider, isbns } = researchInput(input)
    const previous = tails.get(provider) ?? Promise.resolve()
    const pending = previous.catch(() => {}).then(async () => {
      helper ??= Promise.resolve().then(factory)
      const research = await helper, missing = unique(isbns).filter(isbn => !cache.has(provider + '|' + isbn))
      if (missing.length) {
        const collected = new Map((await research.collect(provider, missing)).map(row => [row.isbn, row.data]))
        for (const isbn of missing) cache.set(provider + '|' + isbn, publicMetadata(collected.get(isbn) ?? null))
      }
      return { provider, results: unique(isbns).map(isbn => ({ isbn, data: cache.get(provider + '|' + isbn) })) }
    })
    tails.set(provider, pending); return pending
  }
}

function researchCoordinatorUrl(value) {
  if (typeof value !== 'string' || !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):[1-9]\d{0,4}\/?$/iu.test(value)) throw Error('Research coordinator must be a loopback HTTP origin with an explicit port and no credentials, query or path')
  const url = new URL(value)
  if (Number(url.port) > 65535 || !url.port) throw Error('Invalid research coordinator port')
  return url.origin
}
/** Delegates every request to the existing quota/cache owner; creates no provider helper or cache. */
export function createResearchDelegate(coordinator, { fetchImpl = fetch } = {}) {
  const endpoint = researchCoordinatorUrl(coordinator) + '/research'
  return async input => {
    const request = researchInput(input)
    try {
      const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
        redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(120000) })
      if (!response.ok) throw Error('Research coordinator rejected request')
      const value = await response.json()
      if (value?.provider !== request.provider || !Array.isArray(value.results) || value.results.length !== request.isbns.length
        || unique(value.results.map(row => row?.isbn)).length !== request.isbns.length || value.results.some(row => !request.isbns.includes(row?.isbn))) throw Error('Research coordinator response mismatched requested ISBNs')
      return publicMetadata(value)
    } catch { fail(502, 'Research coordinator failed; credentials and raw provider errors are withheld') }
  }
}

export function createReviewHttpServer(session, { research } = {}) {
  const server = createServer(async (request, response) => {
    const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)) }
    try {
      const host = '127.0.0.1:' + server.address().port
      if (request.headers.host !== host && request.headers.host !== 'localhost:' + server.address().port) fail(403, 'Loopback host required')
      if (request.headers.origin && request.headers.origin !== 'http://' + request.headers.host) fail(403, 'Foreign origin rejected')
      const path = new URL(request.url, 'http://' + host).pathname
      if (request.method === 'GET' && path === '/status') return send(200, session.status())
      if (request.method === 'GET' && /^\/job\/job-\d+$/u.test(path)) return send(200, session.job(path.slice(5)))
      if (request.method !== 'POST') fail(404, 'Unknown endpoint')
      let body = '', size = 0
      for await (const chunk of request) { size += chunk.length; if (size > 1024 * 1024) fail(413, 'Request too large'); body += chunk.toString('utf8') }
      let input; try { input = body ? JSON.parse(body) : {} } catch { fail(400, 'Invalid JSON') }
      if (!input || Array.isArray(input) || typeof input !== 'object') fail(400, 'JSON object required')
      const methods = { '/claim': 'claim', '/claim-batch': 'claimBatch', '/reserve': 'reserve', '/reopen': 'reopen', '/extend': 'extend', '/work-lookup': 'lookup', '/export-progress': 'exportProgress',
        '/restore-progress': 'restoreProgress', '/finish': 'finish', '/mutation-lease': 'acquire', '/mutation-release': 'release' }
      if (methods[path]) return send(200, session[methods[path]](input))
      if (path === '/research') {
        if (!research) fail(503, 'Research collector unavailable')
        try { return send(200, await research(input)) } catch (error) { if (error.status) throw error; fail(502, 'Research failed; credentials and raw provider errors are withheld') }
      }
      if (path === '/shutdown') { send(200, { shutdown: true }); server.close(); server.closeIdleConnections(); return }
      fail(404, 'Unknown endpoint')
    } catch (error) { if (!response.headersSent) send(error.status ?? 500, { error: error.status ? error.message : 'Internal session error' }) }
  })
  server.requestTimeout = 120000
  return server
}

export function parseReviewSessionArgs(args) {
  let port = 0, maxLanes = 8, fullCatalogPass = false, researchCoordinator
  const seen = new Set()
  for (let i = 0; i < args.length; i++) {
    const option = args[i]
    if (!['--port', '--max-lanes', '--full-catalog-pass', '--research-coordinator'].includes(option) || seen.has(option)) throw new Error('Usage: catalog-review-session.mjs [--port 0..65535] [--max-lanes 1..32] [--full-catalog-pass] [--research-coordinator http://127.0.0.1:port]')
    seen.add(option)
    if (option === '--full-catalog-pass') { fullCatalogPass = true; continue }
    const value = args[++i]
    if (option === '--research-coordinator') { researchCoordinator = researchCoordinatorUrl(value); continue }
    if (!/^\d{1,5}$/u.test(value ?? '')) throw new Error('Numeric CLI option value required')
    if (option === '--port') { port = Number(value); if (port > 65535) throw new Error('Invalid port') }
    else { maxLanes = Number(value); if (maxLanes < 1 || maxLanes > 32) throw new Error('Invalid max lanes') }
  }
  if (researchCoordinator && Number(new URL(researchCoordinator).port) === port) throw Error('Research coordinator cannot be the session itself')
  return { port, maxLanes, fullCatalogPass, ...(researchCoordinator ? { researchCoordinator } : {}) }
}

export async function main(args = process.argv.slice(2)) {
  const { port, maxLanes, fullCatalogPass, researchCoordinator } = parseReviewSessionArgs(args)
  const catalog = loadSeriesAuditCatalog(), full = loadFullLocaleMetadata()
  catalog.locales = full.locales; catalog.localeSourcesObservedAt = full.observedAt
  const session = createReviewSession(catalog, undefined, { maxLanes, fullCatalogPass })
  const research = researchCoordinator ? createResearchDelegate(researchCoordinator) : createResearchCollector(async () => {
    const { createCatalogReviewResearch } = await import('./lib/catalog-review-research.mjs')
    return createCatalogReviewResearch()
  })
  const server = createReviewHttpServer(session, { research })
  await new Promise((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready) })
  console.log('READY ' + server.address().port)
  return server
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('Catalog review session startup failed'); process.exitCode = 1 })
