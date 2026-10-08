/** 작품의 원문·번역이 판본이다. 판매 형식은 판본 정체성이 아니다. */
export const SERVICE_BOOK_EDITION_KINDS = ['full', 'retelling', 'adaptation', 'selection', 'volume'] as const
export type BookEditionPolicyInput = {
  locale?: string; title?: string | null; editionKind?: string | null; textScope?: string | null
  translator?: string | null; translators?: unknown; sources?: unknown
}
export const BOOK_EDITION_EXCLUDED_TITLE = /축약(?:본|판)|축역|요약본|원서\s*발췌|천줄읽기|\babridg(?:ed|ement|ment)\b/iu
export const BOOK_EDITION_GRADED_READER = /\b(?:penguin\s+(?:longman\s+)?readers|(?:oxford\s+)?bookworms)\b/iu
export const BOOK_EDITION_EXCLUDED_SCOPE = /^(?:abridg(?:ed|ement|ment)|축약|축역|요약본)(?=$|[\s/:;,])/iu
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export function excludedBookEditionReason(input: BookEditionPolicyInput): string | null {
  if (input.editionKind === 'abridged') return 'abridged'
  if (BOOK_EDITION_EXCLUDED_TITLE.test(input.title ?? '')) return 'abridged'
  if (BOOK_EDITION_GRADED_READER.test(input.title ?? '')) return 'graded_reader'
  if (BOOK_EDITION_EXCLUDED_SCOPE.test(input.textScope ?? '')) return 'abridged'
  return null
}
export function bookTranslatorKey(value: unknown): string | null {
  const names = typeof value === 'string' ? value.split(/[,;·]/u) : Array.isArray(value) ? value : []
  const keys = names.filter((name): name is string => typeof name === 'string' && !!name.trim())
    .map(name => name.normalize('NFKC').toLowerCase().replace(/\s+/gu, '')).sort()
  return keys.length ? [...new Set(keys)].join('|') : null
}
/** 역자를 모르면 같다고 추정하지 않는다. 독립 확인된 원문만 원문 키로 합친다. */
export function bookEditionTranslationKey(input: BookEditionPolicyInput, originalLocale = false): string | null {
  const sources = object(input.sources)
  const translator = bookTranslatorKey(input.translators ?? sources.translators ?? input.translator)
  return translator ? `${input.locale}|translation|${translator}` : originalLocale ? `${input.locale}|original` : null
}
