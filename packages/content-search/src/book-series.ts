/** 검수한 시리즈의 후속권과 판형만 다른 책이 새 작품으로 갈라지는 것을 막는다. */
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase() : ''
const creatorKey = (value: unknown) => text(value).split(/[,，]/u).map(name=>name.replace(/\s/gu, '')).filter(Boolean).sort().join('|')
const EDITION_LABEL = /[([](?:개정(?:증보)?판|증보판|양장본|문고판|보급판|큰글자(?:책|도서)|큰글씨(?:책|도서)|전자책|하드커버|paperback|hardback|hardcover|revised edition|large print(?: edition)?)[^\])]*[\])]/giu
export const stripBookEditionLabels = (value: unknown) => typeof value === 'string' ? value.replace(EDITION_LABEL, '') : ''
export const bookEditionTitleKey = (value: unknown) => text(stripBookEditionLabels(value)).replace(/[\p{P}\p{Z}]/gu, '')
/** 영문 목록의 출판사 뒤 미국 배급 표기는 별도 출판사로 가르지 않는다. */
export const bookPublisherKey = (value: unknown, locale?: string) => {
  const publisher = text(value)
  return (locale === 'en' ? publisher.replace(/,\s*u\.?s\.?a\.?$/iu, '') : publisher).replace(/\s/gu, '')
}

export interface SeriesVolumeEdition {
  locale?: string
  title: string
  creator: string | null
  publisher: string | null
  translator?: string | null
  editionKind: string | null
  textScope: string | null
}

/** 검수된 시리즈의 같은 출간본만 구분한다. 총서 번호·곡별 악보는 연속권으로 읽지 않는다. */
export function seriesVolumeInfo(seriesValue: unknown, edition: SeriesVolumeEdition): { family: string; number: number } | null {
  const series = object(seriesValue)
  let reviewedSeries = false
  try { reviewedSeries = new URL(String(series.sourceUrl)).protocol === 'https:' } catch { /* 권별 범위가 명시된 기존 원전은 아래에서 확인한다. */ }
  const recordedScope = edition.textScope?.match(/(?:^|[-/\s])volume[-/\s]+(\d{1,3})(?=$|[-\s/:])/iu)
  if (recordedScope || !reviewedSeries) {
    // 같은 작품 아래 이미 권별 범위가 기록된 판본도 시리즈 메타의 유무에 따라 중간 권을 노출하지 않는다.
    if (!edition.locale || !creatorKey(edition.creator)) return null
    const scope = recordedScope
    if (!scope || Number(scope[1]) < 1) return null
    const title = text(stripBookEditionLabels(edition.title))
    const numbered = title.match(/^(.+?)[\s.:：\-]+(?:제\s*|(?:vol(?:ume)?\.?|book|part)\s*)?(\d{1,3})(?=$|[\s권화,\-:：.)(\[/])/iu)
    const roman = title.match(/^(.+?)[\s.:：\-]+(?:vol(?:ume)?\.?|book|part)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)(?=$|[\s:：.)(/])/iu)
    // Volume II Part 1의 뒤쪽 Part 1을 전체 시리즈의 시작권으로 읽지 않는다.
    const useRoman = roman && (!numbered || roman[1].length < numbered[1].length)
    const number = useRoman ? ['I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(roman[2].toUpperCase()) + 1 : numbered ? Number(numbered[2]) : Number(scope[1])
    if (number !== Number(scope[1])) return null
    const prefix = (useRoman ? roman[1] : numbered?.[1] ?? title).replace(/[\s.:：\-]+$/u, '')
    const translator = creatorKey(edition.translator), publisher = bookPublisherKey(edition.publisher, edition.locale)
    if (!prefix || (!translator && !publisher)) return null
    return { family: [edition.locale, prefix, creatorKey(edition.creator), translator || publisher].join('|'), number }
  }
  if (edition.locale !== series.locale || !creatorKey(series.creator)
    || creatorKey(edition.creator) !== creatorKey(series.creator)) return null
  if (edition.editionKind && edition.editionKind !== 'volume') return null
  const title = text(stripBookEditionLabels(edition.title))
  const prefixes = [series.title, ...(Array.isArray(series.aliases) ? series.aliases : [])]
    .map(text).filter(Boolean).sort((a, b) => b.length - a.length)
  const prefix = prefixes.find(value => title.startsWith(value)
    && /^(?:[\s.:：\-]+|\()/u.test(title.slice(value.length)))
  if (!prefix) return null
  const suffix = title.slice(prefix.length).replace(/^[\s.:：\-(]+/u, '')
  const numbered = suffix.match(/^(?:제\s*|(?:vol(?:ume)?\.?|book|part)\s*)?(\d{1,3})(?=$|[\s권화,\-:：.)(\[/])/iu)
  const roman = suffix.match(/^(?:vol(?:ume)?\.?|book|part)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)(?=$|[\s:：.)(/])/iu)
  const korean = suffix.match(/^(상|중|하)(?=$|[\s권:：.)])/u)
  const scope = edition.editionKind === 'volume' && edition.textScope?.match(/^volume[\/\s]+(\d{1,3})(?=$|[-\s/:])/iu)
  const number = numbered ? Number(numbered[1]) : roman ? ['I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(roman[1].toUpperCase()) + 1
    : korean ? ({ 상: 1, 중: 2, 하: 3 } as Record<string, number>)[korean[1]] : scope ? Number(scope[1]) : null
  if (!number || (scope && Number(scope[1]) !== number)) return null
  // 역자가 없을 때 출판사를 넘겨 같은 번역이라고 추측하지 않는다. 서로 다른 출간명도 별개다.
  const translator = creatorKey(edition.translator)
  const publisher = bookPublisherKey(edition.publisher, edition.locale)
  if (!translator && !publisher) return null
  return { family: [edition.locale, prefix, creatorKey(edition.creator), translator || publisher].join('|'), number }
}

/** 책장에는 같은 출간본의 시작권 하나를 둔다. 시작권 없는 임의의 중간 권은 대표로 고르지 않는다. */
export function selectSeriesRepresentatives<T extends SeriesVolumeEdition>(editions: readonly T[], series: unknown): T[] {
  const groups = new Map<string, { edition: T; number: number }[]>()
  const unnumbered = new Set<T>()
  for (const edition of editions) {
    const info = seriesVolumeInfo(series, edition)
    if (!info) { unnumbered.add(edition); continue }
    const group = groups.get(info.family) ?? []
    group.push({ edition, number: info.number }); groups.set(info.family, group)
  }
  const starts = new Set([...groups.values()].flatMap(group => group.filter(item => item.number === 1).map(item => item.edition)))
  return editions.filter(edition => unnumbered.has(edition) || starts.has(edition))
}

export function registeredSeriesMatches(
  works: readonly { id: string; metadata?: unknown }[],
  editions: readonly { title: string; creator: string | null; locale: string }[],
): {contentId: string; title: string; sourceUrl: string}[] {
  return works.flatMap(work => {
    const metadata = object(work.metadata), figure = object(metadata.figureBook), series = object(figure.series)
    // 판형 수식어가 다른 같은 표제는 새 작품으로 등록하기 전에 실제 판본으로 검수한다.
    const formatTitle = typeof figure.workTitle === 'string' ? figure.workTitle : ''
    const hasFormatLabel = (title: string) => bookEditionTitleKey(title) !== text(title).replace(/[\p{P}\p{Z}]/gu, '')
    if (formatTitle && creatorKey(figure.workCreator) && editions.some(edition =>
      creatorKey(edition.creator) === creatorKey(figure.workCreator)
      && (hasFormatLabel(formatTitle) || hasFormatLabel(edition.title))
      && bookEditionTitleKey(edition.title) === bookEditionTitleKey(formatTitle))) {
      const sourceUrl = [figure.identityEvidence, metadata.link, series.sourceUrl].find(value => {
        try { return typeof value === 'string' && new URL(value).protocol === 'https:' } catch { return false }
      })
      if (typeof sourceUrl === 'string') return [{contentId:work.id,title:formatTitle,sourceUrl}]
    }
    if (!text(series.title) || !creatorKey(series.creator)) return []
    if (typeof series.sourceUrl !== 'string') return []
    try { if (new URL(series.sourceUrl).protocol !== 'https:') return [] } catch { return [] }
    const prefixes = [text(series.title), ...(Array.isArray(series.aliases) ? series.aliases.map(text).filter(Boolean) : [])]
    const matches = editions.some(edition => {
      if (edition.locale !== series.locale || creatorKey(edition.creator) !== creatorKey(series.creator)) return false
      const title = text(edition.title)
      return prefixes.some(prefix => title === prefix || (title.startsWith(prefix) && /^[\s:：\-–—([\d]/u.test(title.slice(prefix.length))))
    })
    return matches ? [{ contentId: work.id, title: String(series.title), sourceUrl: series.sourceUrl }] : []
  })
}
