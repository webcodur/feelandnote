import { excludedBookEditionReason, bookEditionTranslationKey } from '../../../../../packages/content-search/src/book-edition-policy.ts'
import { toIsbn13 } from '../../../../../packages/content-search/src/book-isbn.ts'
import { seriesVolumeInfo, bookEditionTitleKey } from '../../../../../packages/content-search/src/book-series.ts'
const input = row => ({ ...row, editionKind: row.edition_kind, textScope: row.text_scope })
function providerEditionKey(row) {
  for (const source of [row.sources?.provider_edition_url,row.sources?.title,row.sources?.isbn,row.sources?.series_source_url]) {
    try {
      const url=new URL(source)
      if (row.locale==='ko' && /^(?:m\.)?search\.daum\.net$/u.test(url.hostname) && /^\d+$/u.test(url.searchParams.get('bookId') ?? '')) return 'daum:'+url.searchParams.get('bookId')
      if (url.hostname==='openlibrary.org' && /^\/books\/OL\d+M(?:\/|$)/u.test(url.pathname)) return url.pathname.match(/^\/books\/OL\d+M/u)[0]
    } catch { /* 출처가 없는 표시는 판본 근거가 아니다. */ }
  }
  return null
}
export function isOriginalEdition(row, work) {
  const figure = work.figureBook ?? {}, language = figure.originalLanguage ?? work.metadata?.originalLanguage
  if (language === row.locale && /^https:\/\//u.test(figure.identityEvidence ?? '')) return true
  return (row.sources?.edition_work_evidence ?? []).some(proof => proof.content_id === row.content_id
    && proof.locale === row.locale && proof.original_language === row.locale
    && proof.edition_title === row.title && proof.edition_creator === row.creator
    && proof.isbn === row.isbn && proof.work_identity === figure.workIdentity && /^https:\/\//u.test(proof.source_url ?? ''))
}
export function planEditionTranslations(catalog) {
  const works = new Map(catalog.contents.map(row => [row.id, row])), groups = new Map(), excluded = [], unknown = []
  const originalCreators = new Set(catalog.editions.filter(row => works.has(row.content_id) && isOriginalEdition(row, works.get(row.content_id)))
    .map(row => row.content_id+'|'+row.locale))
  for (const row of catalog.editions) {
    const work = works.get(row.content_id)
    const reason = excludedBookEditionReason({...input(row),reviewedSeries:/^https:\/\//u.test(work?.figureBook?.series?.sourceUrl??''),workTitles:[work?.figureBook?.workTitle,work?.figureBook?.originalTitle].filter(value=>typeof value==='string')})
    if (reason) { excluded.push({ row, reason }); continue }
    const original = originalCreators.has(row.content_id+'|'+row.locale)
    let translation = bookEditionTranslationKey(row, original)
    // 같은 공식 공급자 레코드에 귀속된 ISBN 변형은 같은 실판본이다.
    const provider = providerEditionKey(row)
    if (!translation && provider) translation = row.locale + '|provider|' + provider
    if (!translation) { unknown.push(row); continue }
    const key = row.content_id + '|' + translation, group = groups.get(key) ?? []
    group.push(row); groups.set(key, group)
  }
  const duplicates = []
  for (const rows of groups.values()) {
    if (rows.length < 2) continue
    const work = works.get(rows[0].content_id), volume = row => seriesVolumeInfo(work.figureBook?.series, {
      ...input(row), translator: Array.isArray(row.sources?.translators) ? row.sources.translators.join(', ') : null })
    const starts = rows.filter(row => volume(row)?.number === 1)
    const hasVolumes = rows.some(row => volume(row))
    if (hasVolumes && !starts.length) { unknown.push(...rows); continue }
    const selectable = hasVolumes ? starts : rows
    const score = row => [catalog.products.some(p => p.edition_id === row.id && p.is_active) ? 1 : 0,
      catalog.locales.some(card => card.content_id === row.content_id && card.locale === row.locale && card.isbn === row.isbn) ? 1 : 0,
      row.release_date ?? '', -(row.sort_order ?? 0), -row.id]
    const compare = (a,b) => { const x=score(a),y=score(b); for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return x[i]>y[i]?-1:1; return 0 }
    const keep = [...selectable].sort(compare)[0]
    duplicates.push({ keep, drops: rows.filter(row => row.id !== keep.id) })
  }
  const counts = new Map()
  for (const row of catalog.editions) if (!excluded.some(item=>item.row.id===row.id)) {
    const key=row.content_id+'|'+row.locale;counts.set(key,(counts.get(key)??0)+1)
  }
  const unresolved = unknown.filter(row => (counts.get(row.content_id+'|'+row.locale) ?? 0) > 1)
  return { excluded, duplicates, unresolved }
}

/** 같은 ISBN·제목 또는 실제 다음 bookId가 맞는 공식 응답만 역자 근거로 쓴다. */
export function sameOfficialKakaoEdition(row,official) {
 const isbn=toIsbn13(row.isbn ?? '')
 if(!official || !isbn || toIsbn13(official.metadata?.isbn ?? '')!==isbn)return false
 const rowBase=bookEditionTitleKey(row.title.split(/[（(]/u)[0]),officialBase=bookEditionTitleKey(official.title.split(/[（(]/u)[0])
 if(bookEditionTitleKey(row.title)===bookEditionTitleKey(official.title) || (rowBase && rowBase===officialBase))return true
 return [row.sources?.title,row.sources?.isbn,row.sources?.provider_edition_url].some(source=>{
  try { const old=new URL(source),current=new URL(official.metadata.link);return /^(?:m\.)?search\.daum\.net$/u.test(old.hostname) && !!old.searchParams.get('bookId') && old.searchParams.get('bookId')===current.searchParams.get('bookId') } catch{return false}
 })
}
