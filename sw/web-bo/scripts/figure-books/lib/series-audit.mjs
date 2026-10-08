import { toIsbn13 } from '../../../../../packages/content-search/src/book-isbn.ts'
import { registeredSeriesMatches, bookEditionTitleKey, stripBookEditionLabels } from './series-work.mjs'
import { requiresIndependentBookWorkReview } from '../../../../../packages/content-search/src/book-work-risk.ts'
import bookEditionWork from '../../../src/lib/book-edition-work.ts'
const { verifiedOmnibusIsbn, normalizeOpenLibraryWorkKey } = bookEditionWork

// 후보 생성의 상수는 여기만 쓴다. 점수로 동일 저작을 확정하지 않는다.
export const SERIES_AUDIT_LIMITS = Object.freeze({ maxPrefixWords: 5, maxWeakGroupWorks: 100, minPrefixChars: 6 })
const PRIORITY = ['work-identity', 'shared-isbn', 'provider-work-key', 'registered-series', 'numbered-series', 'numbered-series-creator-variant', 'same-title', 'subtitle-series', 'shared-prefix']
const INDEPENDENT = /해설|입문|따라\s*쓰기|필사|재화|각색|워크북|study\s*guide|workbook|retelling|adaptation/iu
const GENERIC_CREATORS = /^(?:편집부|편집팀|저자미상|작자미상|various|anonymous|unknown|editorial)$/iu
const COLLECTION = /세트|합본|전집|총서|collected|complete works|and other (?:stories|plays)|box(?:ed)?\s*set/iu
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const string = value => typeof value === 'string' ? value.trim() : ''
export const normalizeAuditText = value => string(value).normalize('NFKC').toLowerCase()
  .replace(/[“”‘’]/gu, '').replace(/\s*([:·.,])\s*/gu, '$1').replace(/\s+/gu, ' ').trim()
const titleKey = value => bookEditionTitleKey(normalizeAuditText(value))
const creatorKey = value => normalizeAuditText(value).replace(/\s+(?:저자|지음|저)$/u, '').replace(/[\p{P}\p{Z}]/gu, '')
const isbn = value => toIsbn13(string(value))

/** Also inspect editions inside one owner; duplicate-work detection alone misses bad attribution. */
export function detectEditionAttributionRisks(catalog) {
  const works = new Map(catalog.contents.map(work => [work.id, work]))
  const koreanCards = new Map((catalog.locales ?? []).filter(row => row.locale === 'ko').map(row => [row.content_id, row]))
  const authorTokens = value => normalizeAuditText(value).normalize('NFKD').replace(/\p{M}/gu,'').match(/[a-z]{3,}/g) ?? []
  return catalog.editions.flatMap(edition => {
    const figure = object(works.get(edition.content_id)?.figureBook), reasons = []
    if (requiresIndependentBookWorkReview(edition.publisher)) reasons.push('study_guide_publisher_requires_independent_work_review')
    const author = string(figure.workCreator ?? figure.originalCreator)
    const koreanAuthor = string(koreanCards.get(edition.content_id)?.creator)
    const koreanNames = value => value.match(/[가-힣]{2,}/gu) ?? []
    // 같은 제목 검색이 다른 저자의 책을 가져오는 오류를 찾는다. 음역·공저·역자 차이는 검수 후보로만 남긴다.
    if (edition.locale === 'ko' && koreanNames(koreanAuthor).length && koreanNames(string(edition.creator)).length
      && creatorKey(koreanAuthor) !== creatorKey(edition.creator)
      && !koreanNames(koreanAuthor).some(name => koreanNames(string(edition.creator)).includes(name))) reasons.push('korean_edition_card_creator_mismatch')
    // 한국어 이름이 함께 적힌 영문 크레딧도 대조한다. 번역가 표기는 검수 후보일 뿐 통합 근거가 아니다.
    if (edition.locale === 'en' && authorTokens(author).length >= 2
      && author && !GENERIC_CREATORS.test(author) && authorTokens(edition.creator).length >= 2
      && creatorKey(author) !== creatorKey(edition.creator)
      && !authorTokens(author).some(token => authorTokens(edition.creator).includes(token))) reasons.push('english_edition_original_creator_mismatch')
    const numbered = numberedTitle(edition.title)
    if (numbered && edition.edition_kind === 'full' && edition.text_scope === 'complete') reasons.push('numbered_edition_claims_complete_text')
    // 한 선집 자체의 완본과 원전의 발췌를 구별한다. 부록·주석의 설명은 본문 범위로 읽지 않는다.
    if (edition.edition_kind === 'full' && edition.text_scope === 'complete'
      && (/발췌|천줄읽기/iu.test(edition.title ?? '')
        || (!/\bselected\b/iu.test(figure.workTitle ?? '') && /\b(?:selected|excerpts?|abridged)\b/iu.test(edition.title ?? '')))) reasons.push('partial_text_claims_full_edition')
    const evidence = edition.sources?.edition_work_evidence
    const reviewedOriginal = (Array.isArray(evidence) ? evidence : []).some(p => p && p.method === 'independent_work_review'
      && p.content_id === edition.content_id && p.work_identity === figure.workIdentity && p.text_scope === edition.text_scope
      && p.locale === edition.locale && (p.isbn ?? null) === (edition.isbn ?? null)
      && p.edition_kind === edition.edition_kind && normalizeAuditText(p.edition_title) === normalizeAuditText(edition.title)
      && normalizeAuditText(p.edition_creator) === normalizeAuditText(edition.creator)
      && normalizeAuditText(p.original_title) === normalizeAuditText(figure.workTitle ?? figure.originalTitle)
      && normalizeAuditText(p.original_creator) === normalizeAuditText(figure.workCreator ?? figure.originalCreator)
      && /^https:\/\//.test(p.source_url ?? ''))
    if (figure.workIdentity && !figure.workIdentity.startsWith('book/') && !reviewedOriginal
      && /^(?:complete\s+)?(?:commentary|retelling|adaptation)\b|^complete.*\bretelling\b|^독립\s*(?:해설|재화|각색)/iu.test(edition.text_scope ?? '')) reasons.push('independent_text_attached_to_original')
    return reasons.length ? [{contentId:edition.content_id,editionId:edition.id,isbn:edition.isbn,title:edition.title,
      creator:edition.creator,originalCreator:author,editionKind:edition.edition_kind,textScope:edition.text_scope,reasons}] : []
  })
}

/** 권수만 걷는다. 1984·1Q84·제2차 세계대전 같은 표제 내부 숫자는 보존한다. */
export function numberedTitle(value) {
  const title = stripBookEditionLabels(string(value).normalize('NFKC'))
    .replace(/\[(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\]/giu, '').trim()
  const part = '(\\d{1,3}(?:-\\d{1,3})?)'
  const suffix = '(?:\\s*[:：,]\\s*.+|\\s*\\(.+\\)(?:\\s*[:：,]\\s*.+)?)?'
  // 제42화의 부제에 붙은 (중)을 권수로 먼저 잡으면 같은 연속 작품을 놓친다.
  let match = title.match(/^(.+?)\s*[-:]?\s*제\s*(\d{1,3})\s*화(?:\s+.+)?$/u)
    ?? title.match(/^(.+?)[\s,.:：\-]+(?:vol(?:ume)?\.?|book|part)\s*(\d{1,3}|[ivx]{1,6})(?:\s*[:：].+)?$/iu)
    ?? title.match(new RegExp('^(.+?)\\s*[.:：\\-]?\\s+(?:제\\s*)?' + part + '(?:\\s*권)?' + suffix + '$', 'u'))
    ?? title.match(new RegExp('^(.+?)[\\s.:：\\-]*(?:제\\s*)?' + part + '\\s*권' + suffix + '$', 'u'))
    ?? title.match(new RegExp('^(.+?\\))' + part + suffix + '$', 'u'))
    ?? title.match(/^(.+?)\s*\(\s*(\d{1,3}|상|중|하)\s*\)(?:\s*[:：].+)?$/u)
    ?? title.match(/^(.+?)[\s.:：\-]+(상|중|하)$/u)
  if (!match) return null
  const stem = match[1].replace(/[\s.:：\-]+$/u, '').trim()
  if (!stem || /^[\d\s\p{P}]+$/u.test(stem)) return null
  return { stem, part: match[2], title }
}

function displayOnly(row) {
  const sources = object(row.sources)
  return sources.primary === 'none' && ['translated', 'romanized', 'original'].includes(sources.title)
}
/** 같은 표제의 권별 책과 대조할 수 있는 명시적 세트 표기만 푼다. 독립 선집 표제는 받지 않는다. */
export function seriesSetTitle(value) {
 const title=String(value??'').trim().replace(/\(재판\)|\(특별\s*한정\s*보급판\)/gu,'').trim()
 const cleanStem=stem=>stem.replace(/\(\d{1,3}\s*권\s*세트\)|\(상[.·/]하\)|\(합본\)/gu,'').replace(/\s*(?:시리즈\s*)?세트$/u,'').trim()
 const range=title.match(/^(.+?)\s*(\d{1,3})\s*[~～]\s*(\d{1,3})\s*권\s*세트$/u)??title.match(/^(.+?)\s*세트\(\s*(\d{1,3})\s*[-~～]\s*(\d{1,3})\s*권\s*\)$/u)
 if(range&&Number(range[2])>=1&&Number(range[3])>=Number(range[2]))return {stem:range[1].trim(),scope:`volumes/${Number(range[2])}-${Number(range[3])}`}
 const count=title.match(/^(.+?)\s*(?:시리즈\s*)?(?:세트\s*)?\(\s*전\s*(\d{1,3})\s*권\s*(?:\/\s*합본)?\s*\)\s*(?:세트)?$/u)
 if(count&&Number(count[2])>=2)return {stem:cleanStem(count[1]),scope:`volumes/1-${Number(count[2])}`}
 const set=title.match(/^(.+?)\s*(?:시리즈\s*)?세트$/u)
 return set?{stem:set[1].trim(),scope:null}:null
}

function add(index, key, entry) {
  if (!key) return
  if (!index.has(key)) index.set(key, new Map())
  const owners = index.get(key)
  if (!owners.has(entry.contentId)) owners.set(entry.contentId, [])
  const rows = owners.get(entry.contentId)
  if (!rows.some(row => row.title === entry.title && row.isbn === entry.isbn && row.locale === entry.locale)) rows.push(entry)
}
const sorted = values => [...new Set(values.filter(Boolean))].sort()

/** 인덱스만 사용한다. 모든 작품 쌍의 N² 비교와 전이적 자동 통합은 하지 않는다. */
export function detectSplitSeries(catalog) {
  const works = new Map(catalog.contents.map(row => [row.id, {...row,figureBook:{...object(row.figureBook),workIdentity:object(row.figureBook).workIdentity??object(row.metadata).workIdentity}}]))
  const variants = new Map([...works.keys()].map(id => [id, []]))
  const people = new Map([...works.keys()].map(id => [id, new Set()]))
  const personById = new Map(catalog.people.map(row => [row.id, row]))
  for (const row of [...catalog.relations, ...catalog.readings]) people.get(row.content_id)?.add(row.celeb_id)
  for (const row of [...catalog.locales.map(row => ({ ...row, origin: 'locale' })),
    ...catalog.editions.map(row => ({ ...row, origin: 'edition' }))]) {
    if (!works.has(row.content_id) || displayOnly(row) || !string(row.title)) continue
    const entry = { contentId: row.content_id, locale: row.locale, title: string(row.title), creator: string(row.creator),
      publisher: string(row.publisher), isbn: isbn(row.isbn), origin: row.origin,
      editionId: row.origin === 'edition' ? row.id : null, editionKind: row.edition_kind ?? null, textScope: row.text_scope ?? null,
      providerWorkKey: row.sources?.primary === 'openlibrary' && isbn(row.isbn) ? normalizeOpenLibraryWorkKey(row.sources?.workKey) : null }
    variants.get(row.content_id).push(entry)
  }
  const identities = new Map(), isbns = new Map(), providerWorks = new Map(), titles = new Map(), numbered = new Map(), numberedPublisher = new Map(), subtitles = new Map(), prefixes = new Map(), byCreator = new Map()
  const numberedRoots = new Map()
  let indexedVariants = 0
  for (const work of works.values()) {
    const figure = object(work.figureBook), metadata = object(work.metadata)
    const anchor = variants.get(work.id).find(row => row.locale === 'ko') ?? variants.get(work.id)[0]
      ?? { contentId: work.id, title: figure.workTitle || '', creator: figure.workCreator || '', locale: 'original', isbn: null }
    for (const key of sorted([figure.workIdentity, figure.wikidataQid && `wikidata:${String(figure.wikidataQid).toLowerCase()}`,
      figure.originalTitle && figure.originalCreator && `original:${titleKey(figure.originalTitle)}|${creatorKey(figure.originalCreator)}`,
      ...[metadata.workKey, figure.workKey, figure.openlibraryWorkKey, figure.openLibraryWorkKey, figure.openLibraryWork]
        .map(normalizeOpenLibraryWorkKey).filter(Boolean).map(key => `openlibrary:${key}`)])) {
      const openLibraryKey = normalizeOpenLibraryWorkKey(key)
      add(identities, normalizeAuditText(openLibraryKey ? `openlibrary:${openLibraryKey}` : key), anchor)
    }
    const externalIsbn = isbn(work.external_id)
    if (externalIsbn) add(isbns, externalIsbn, anchor)
    const seen = new Set()
    for (const entry of variants.get(work.id)) {
      if (entry.isbn) add(isbns, entry.isbn, entry)
      if (entry.providerWorkKey) add(providerWorks, entry.providerWorkKey, entry)
      const creator = creatorKey(entry.creator), normalized = titleKey(entry.title)
      if (!creator || !normalized) continue
      const unique = `${entry.locale}|${creator}|${normalized}`
      if (seen.has(unique)) continue
      seen.add(unique); indexedVariants++
      const common = `${entry.locale}|${creator}|`
      if (!byCreator.has(common)) byCreator.set(common, [])
      byCreator.get(common).push(entry)
      add(titles, common + normalized, entry)
      const number = numberedTitle(entry.title)
      if (number) {
        const key = common + titleKey(number.stem)
        add(numbered, key, { ...entry, part: number.part, stem: number.stem })
        if (entry.publisher) add(numberedPublisher, entry.locale + '|' + normalizeAuditText(entry.publisher) + '|' + titleKey(number.stem), { ...entry, part: number.part, stem: number.stem })
        numberedRoots.set(key, { common, normalized: titleKey(number.stem) })
      }
      if (GENERIC_CREATORS.test(creator) || !entry.publisher) continue
      const label = entry.title.split(/[:：]/u)
      if (label.length > 1 && titleKey(label[0]).length >= 3) {
        add(subtitles, common + normalizeAuditText(entry.publisher) + '|' + titleKey(label[0]), { ...entry, stem: label[0].trim() })
      }
      const words = normalizeAuditText(entry.title).replace(/[:：]/gu, ' ').split(' ')
      for (let depth = 2; depth <= Math.min(words.length - 1, SERIES_AUDIT_LIMITS.maxPrefixWords); depth++) {
        const stem = words.slice(0, depth).join(' ')
        if (titleKey(stem).length < SERIES_AUDIT_LIMITS.minPrefixChars) continue
        add(prefixes, common + normalizeAuditText(entry.publisher) + '|' + stem, { ...entry, stem })
      }
    }
  }
  // 첫 권을 권수 없는 제목으로 저장한 경우도 후속권과 대조한다.
  for (const [key, root] of numberedRoots) for (const rows of titles.get(root.common + root.normalized)?.values() ?? []) {
    for (const entry of rows) add(numbered, key, { ...entry, part: null, stem: entry.title })
  }
  const findings = new Map(), verifiedOmnibusGroups=new Map(), suppressed = { broadWeakGroups: 0, differentOriginals: 0, prefixWithoutSharedPerson: 0, verifiedOmnibusIsbns: 0 }
  function register(kind, key, owners) {
    if (owners.size < 2) return
    const ids = [...owners.keys()].sort(), rows = [...owners.values()].flat()
    if(kind==='shared-isbn'&&verifiedOmnibusIsbn(key,ids,ids.map(id=>({id,type:'BOOK',metadata:{...works.get(id).metadata,figureBook:works.get(id).figureBook}})),catalog.locales.filter(l=>ids.includes(l.content_id)),catalog.editions.filter(e=>ids.includes(e.content_id)&&isbn(e.isbn)===key))) {verifiedOmnibusGroups.set(ids.join('|'),key);suppressed.verifiedOmnibusIsbns++;return}
    if(kind!=='work-identity'&&verifiedOmnibusGroups.has(ids.join('|'))&&rows.every(row=>row.isbn===verifiedOmnibusGroups.get(ids.join('|'))))return
    const distinctTitles = sorted(rows.map(row => titleKey(row.title)))
    if (['subtitle-series', 'shared-prefix'].includes(kind) && distinctTitles.length < 2) return
    if (kind.startsWith('numbered-series') && new Set(rows.filter(row => row.part).map(row => row.part)).size < 2
      && !rows.some(row => row.part == null)) return
    if (kind === 'numbered-series-creator-variant' && new Set(rows.map(row => creatorKey(row.creator))).size < 2) return
    if (['subtitle-series', 'shared-prefix'].includes(kind) && ids.length > SERIES_AUDIT_LIMITS.maxWeakGroupWorks) { suppressed.broadWeakGroups++; return }
    const shared = new Map()
    for (const id of ids) for (const celeb of people.get(id)) shared.set(celeb, (shared.get(celeb) ?? 0) + 1)
    const sharedPeople = [...shared].filter(([,count]) => count > 1)
    const originals = sorted(ids.map(id => {
      const figure = object(works.get(id).figureBook)
      return figure.originalTitle && figure.originalCreator ? titleKey(figure.originalTitle) + '|' + creatorKey(figure.originalCreator) : null
    }))
    const qids = sorted(ids.map(id => object(works.get(id).figureBook).wikidataQid))
    const originalIdentities = sorted(ids.map(id => string(object(works.get(id).figureBook).workIdentity)).filter(identity => identity && !/^book\//iu.test(identity)))
    if (kind === 'shared-prefix' && originals.length > 1) { suppressed.differentOriginals++; return }
    if (kind === 'shared-prefix' && sharedPeople.length === 0) { suppressed.prefixWithoutSharedPerson++; return }
    const signature = ids.join('|')
    if (!findings.has(signature)) findings.set(signature, { contentIds: ids, signals: [], evidence: [], sharedPeople, warnings: [] })
    const candidate = findings.get(signature)
    if (!candidate.signals.includes(kind)) candidate.signals.push(kind)
    candidate.evidence.push({ kind, key, stem: rows.find(row => row.stem)?.stem ?? null,
      titles: sorted(rows.map(row => row.title)), parts: sorted(rows.map(row => row.part)) })
    if (originals.length > 1 || qids.length > 1) candidate.warnings.push('different_originals_or_qids')
    if (originalIdentities.length > 1) candidate.warnings.push('different_original_work_identities')
    const enTitles = sorted(ids.flatMap(id => variants.get(id).filter(row => row.locale === 'en').map(row => titleKey(row.title))))
    if (enTitles.length > 1) candidate.warnings.push('different_english_titles')
    if (kind === 'numbered-series-creator-variant') candidate.warnings.push('creator_variants')
    const allTitles = ids.flatMap(id => variants.get(id).map(row => row.title))
    if (allTitles.some(title => INDEPENDENT.test(title))) candidate.warnings.push('independent_editing_or_commentary')
    if (allTitles.some(title => COLLECTION.test(title))) candidate.warnings.push('collection_or_set')
    if (rows.some(row => GENERIC_CREATORS.test(creatorKey(row.creator)))) candidate.warnings.push('generic_creator')
  }
  for (const [kind,index] of [['work-identity',identities],['shared-isbn',isbns],['provider-work-key',providerWorks],['numbered-series',numbered],['numbered-series-creator-variant',numberedPublisher],['same-title',titles],['subtitle-series',subtitles],['shared-prefix',prefixes]]) {
    for (const [key, owners] of index) register(kind,key,owners)
  }
  // 시리즈명 표시를 정리한 작품과 여전히 따로 남은 권. 내부 판본 여럿만으로는 후보를 만들지 않는다.
  for (const work of works.values()) {
    const series = object(object(work.figureBook).series)
    if (!series.title || !series.creator || !series.sourceUrl) continue
    const owners = new Map([[work.id, [variants.get(work.id)[0] ?? {contentId:work.id,title:series.title}]]])
    for (const entry of byCreator.get(`${series.locale}|${creatorKey(series.creator)}|`) ?? []) {
      if (entry.contentId === work.id) continue
      if (!registeredSeriesMatches([{id:work.id,metadata:{figureBook:{series}}}], [entry]).length) continue
      if (!owners.has(entry.contentId)) owners.set(entry.contentId, [])
      owners.get(entry.contentId).push(entry)
    }
    register('registered-series', series.title, owners)
  }
  const candidates = [...findings.values()].map(candidate => {
    candidate.signals.sort((a,b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))
    candidate.warnings = sorted(candidate.warnings)
    candidate.sharedPeople = candidate.sharedPeople.map(([id,count]) => ({id,count,...personById.get(id)})).sort((a,b)=>b.count-a.count || a.id.localeCompare(b.id))
    candidate.works = candidate.contentIds.map(id => {
      const work = works.get(id), entries = variants.get(id)
      return { id, identity: object(work.figureBook).workIdentity ?? null, originalTitle: object(work.figureBook).originalTitle ?? null,
        originalCreator: object(work.figureBook).originalCreator ?? null, wikidataQid: object(work.figureBook).wikidataQid ?? null, catalog: work.catalog,
        titles: sorted(entries.map(row=>row.title)), creators: sorted(entries.map(row=>row.creator)), publishers: sorted(entries.map(row=>row.publisher)),
        isbns: sorted([isbn(work.external_id), ...entries.map(row=>row.isbn)]), editions: entries.filter(row=>row.origin==='edition'),
        referenceCounts: work.referenceCounts ?? {}, personIds: [...people.get(id)].sort() }
    })
    return candidate
  })
  // 작품 집합이 같으면 여러 탐지 근거를 한 후보에 모은다.
  const strongByOwner = new Map()
  for (const candidate of candidates.filter(row => row.signals.some(signal => signal !== 'shared-prefix'))) {
    const ids = new Set(candidate.contentIds)
    for (const id of ids) {
      if (!strongByOwner.has(id)) strongByOwner.set(id, [])
      strongByOwner.get(id).push(ids)
    }
  }
  // 이미 더 구체적인 근거로 잡힌 집합의 일부를 공통어 후보로 다시 나열하지 않는다.
  suppressed.redundantPrefixGroups = 0
  const output = candidates.filter(candidate => {
    if (candidate.signals.length !== 1 || candidate.signals[0] !== 'shared-prefix') return true
    if ((strongByOwner.get(candidate.contentIds[0]) ?? []).some(ids => candidate.contentIds.every(id => ids.has(id)))) {
      suppressed.redundantPrefixGroups++; return false
    }
    candidate.warnings.push('prefix_only_requires_source')
    return true
  })
  output.sort((a,b)=>PRIORITY.indexOf(a.signals[0])-PRIORITY.indexOf(b.signals[0]) || b.sharedPeople.length-a.sharedPeople.length
    || b.contentIds.length-a.contentIds.length || a.contentIds[0].localeCompare(b.contentIds[0]))
  return { candidates:output, diagnostics:{ indexedVariants,
    worksWithoutActualTitles:[...variants.values()].filter(rows => rows.length === 0).length,
    worksWithoutCreators:[...variants.values()].filter(rows => rows.length && rows.every(row => !row.creator)).length,
    skippedDisplayTitles:catalog.locales.filter(displayOnly).length + catalog.editions.filter(displayOnly).length,
    suppressed }, bySignal:Object.fromEntries(PRIORITY.map(signal=>[signal,output.filter(row=>row.signals.includes(signal)).length])) }
}
