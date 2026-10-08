/** 작품의 원문·번역이 판본이다. 판매 형식은 판본 정체성이 아니다. */
export const SERVICE_BOOK_EDITION_KINDS = ['full', 'retelling', 'adaptation', 'selection', 'volume'] as const
export type BookEditionPolicyInput = {
  locale?: string; title?: string | null; isbn?: string | null; publisher?: string | null; releaseDate?: string | null; release_date?: string | null; editionKind?: string | null; textScope?: string | null
  workTitles?: readonly string[]; reviewedSeries?: boolean; translator?: string | null; translators?: unknown; sources?: unknown; providerDescription?: string | null
}
export const BOOK_EDITION_EXCLUDED_TITLE = /축약(?:본|판)|축역|요약본|원서\s*발췌|[（(]발췌[）)]|천줄읽기|진형준\s*교수의\s*세계문학컬렉션|\babridg(?:ed|ement|ment)\b|^(?:인스타리드\s|Instaread\b|Outlines and Highlights for\b)/iu
export const BOOK_EDITION_ENGLISH_SOURCE_TITLE = /(?:[（(\[|]\s*(?:영문판|영문원서|영어\s*원서)\s*(?:[）)\]|]|[-–])|(?:^|[\s/|\-–])(?:영문판|영문원서|영어\s*원서)\s*$)/u
export const BOOK_EDITION_GRADED_READER = /\b(?:penguin\s+(?:longman\s+)?readers?|(?:oxford\s+)?bookworms)\b/iu
export const BOOK_EDITION_EXCLUDED_SCOPE = /^(?:abridg(?:ed|ement|ment)|selection\/abridged|축약(?:본|판)|축역(?:본|판)|요약본|발췌·요약\s*단권|two-percent-original-extract|selection\/approximately-\d+-percent)(?=$|[\s/:;,])/iu
export const BOOK_EDITION_KAKAO_PAGE = /^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u
export const BOOK_EDITION_NONSTART_SCOPE = /^(?:(?:[a-z]+[-/])*(?:volume|part)[-/\s]+(?:book\/)?(?:0*(?:[2-9]|\d{2,3})|II|III|IV|V|VI|VII|VIII|IX|X)(?=$|[-\s/:])|『[^』]+』\s*제\s*0*(?:[2-9]|\d{2,3})권;\s*(?:전체\s*)?시리즈\s*중\s*해당\s*권의\s*본문|(?:한국어\s*(?:번역|원작)\s*분권|원작\s*분권)\s*(?:하권|0*(?:[2-9]|\d{2,3})권)(?=$|[\s(])|제\s*0*(?:[2-9]|\d{2,3})권\s)|\bvolume\s+(?:0*(?:[2-9]|\d{2,3})|VIII|VII|III|VI|IV|IX|II|X)\s+of\s+(?:\d{1,3}|VIII|VII|III|VI|IV|IX|II|X|V|the\s+Loeb\s+Classical\s+Library\s+translation)\b/iu
export const BOOK_EDITION_EXCLUDED_PROVIDER_DESCRIPTION = /세계명작다이제스트\s*시리즈|세계문학\s*축역본의\s*정본|축역본\(remaster edition\)의\s*정본|\bSheet\s+eBook\b|\d+(?:\.\d+)?\s*%\s*(?:를\s*)?발췌(?:로|해|하여)\s*번역|반복되는\s*부분을\s*덜어내[^.。\n]{0,40}축약(?:했|하였)|한\s*품도\s*빠뜨리지\s*않고\s*그\s*요지를\s*간추렸/iu
/** 총서·독립 작품의 제목은 건드리지 않고, 부모 작품 제목 뒤에 명시된 본문 분권만 찾는다. */
export const BOOK_EDITION_VOLUME_TITLE = /^(.+?)[\s,:\-]+(?:vol(?:ume)?\.?|part|book)\s*(\d{1,3}|VIII|VII|III|VI|IV|IX|II|X|V|I)(?=$|[\s,:.])/iu
export const BOOK_EDITION_VOLUME_TITLE_FORMAT = /,\s*revised edition/giu
export const BOOK_EDITION_WORK_TITLE_ARTICLE = /^the\s+/iu
export const BOOK_EDITION_WORK_TITLE_PUNCTUATION = /[\s,:.\-]/gu
export function bookWorkVolumeNumber(title: string, workTitles: readonly string[]): number | null {
  const normalized = title.normalize('NFKC').replace(BOOK_EDITION_VOLUME_TITLE_FORMAT, '')
  const match = normalized.match(BOOK_EDITION_VOLUME_TITLE)
  if (!match) return null
  const key = (value: string) => value.normalize('NFKC').toLowerCase().replace(BOOK_EDITION_WORK_TITLE_ARTICLE, '').replace(BOOK_EDITION_WORK_TITLE_PUNCTUATION, '')
  if (!workTitles.some(root => key(root) === key(match[1]))) return null
  return /^\d+$/u.test(match[2]) ? Number(match[2]) : ['I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(match[2].toUpperCase()) + 1
}
export const BOOK_TRANSLATOR_IGNORED_CHARACTERS = /[\s.’']/gu
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function excludedBookEditionReason(input: BookEditionPolicyInput): string | null {
  if (input.locale === 'ko' && BOOK_EDITION_ENGLISH_SOURCE_TITLE.test(input.title ?? '')) return 'wrong_locale'
  if (input.editionKind === 'abridged') return 'abridged'
  if (BOOK_EDITION_EXCLUDED_TITLE.test(input.title ?? '')) return 'abridged'
  if (BOOK_EDITION_GRADED_READER.test(input.title ?? '')) return 'graded_reader'
  if (BOOK_EDITION_EXCLUDED_SCOPE.test(input.textScope ?? '')) return 'abridged'
  if (BOOK_EDITION_NONSTART_SCOPE.test(input.textScope ?? '') || ((input.reviewedSeries || (!!input.textScope && !/^(?:complete|full|unknown)$/iu.test(input.textScope))) && (bookWorkVolumeNumber(input.title ?? '', input.workTitles ?? []) ?? 0) > 1)) return 'nonstart_volume'
  const sources = object(input.sources)
  const providerTitle=sources.provider_edition_isbn===input.isbn && typeof sources.provider_edition_title==='string' ? sources.provider_edition_title : ''
  if (BOOK_EDITION_EXCLUDED_TITLE.test(providerTitle)) return 'abridged'
  if (BOOK_EDITION_GRADED_READER.test(providerTitle)) return 'graded_reader'
  if (input.locale === 'ko' && BOOK_EDITION_ENGLISH_SOURCE_TITLE.test(providerTitle)) return 'wrong_locale'
  const providerDescription = input.providerDescription ?? sources.provider_scope_description ?? object(sources.provider_metadata).contents
  if (typeof providerDescription === 'string' && BOOK_EDITION_GRADED_READER.test(providerDescription)) return 'graded_reader'
  if (typeof providerDescription === 'string' && BOOK_EDITION_EXCLUDED_PROVIDER_DESCRIPTION.test(providerDescription)) return 'abridged'
  if (sources.primary === 'none' && sources.title === 'display_only') return 'display_only'
  if (!input.isbn && sources.title === 'kakao_title_search' && !BOOK_EDITION_KAKAO_PAGE.test(String(sources.series_source_url ?? ''))) return 'unverified_placeholder'
  if (!input.isbn && !input.publisher && !input.releaseDate && !input.release_date
    && ['manual','manual-research','wikidata'].includes(String(sources.primary))
    && !sources.edition_key && !sources.provider_edition_url
    && ![sources.title,sources.isbn,sources.primary].some(value => BOOK_EDITION_KAKAO_PAGE.test(String(value ?? '')) || /^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(String(value ?? '')))) return 'unverified_placeholder'
  return null
}
export function bookTranslatorKey(value: unknown): string | null {
  const names = typeof value === 'string' ? value.split(/[,;·]/u) : Array.isArray(value) ? value : []
  const keys = names.filter((name): name is string => typeof name === 'string' && !!name.trim())
    .map(name => name.normalize('NFKC').toLowerCase().replace(BOOK_TRANSLATOR_IGNORED_CHARACTERS, '')).filter(Boolean).sort()
  return keys.length ? [...new Set(keys)].join('|') : null
}
/** 역자를 모르면 같다고 추정하지 않는다. 독립 확인된 원문만 원문 키로 합친다. */
export function bookEditionTranslationKey(input: BookEditionPolicyInput, originalLocale = false): string | null {
  const sources = object(input.sources)
  const translator = bookTranslatorKey(input.translators ?? sources.translators ?? input.translator)
  return translator ? `${input.locale}|translation|${translator}` : originalLocale ? `${input.locale}|original` : null
}
