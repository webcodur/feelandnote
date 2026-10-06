import type { CelebDirectoryRow } from '@/actions/celebs/getCelebDirectory'

type DirectoryName = Pick<CelebDirectoryRow, 'nickname' | 'nickname_en'>
const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

export function directoryName(figure: DirectoryName, locale: string) {
  return locale === 'en' ? figure.nickname_en?.trim() || figure.nickname : figure.nickname
}

export function sortDirectory<T extends DirectoryName>(figures: T[], locale: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  return [...figures].sort((a, b) => collator.compare(directoryName(a, locale), directoryName(b, locale)))
}

export function directoryInitial(name: string, locale: string) {
  const char = name.trim().charAt(0)
  const code = char.charCodeAt(0)
  if (locale === 'ko' && code >= 0xac00 && code <= 0xd7a3) return CHOSUNG[Math.floor((code - 0xac00) / 588)]!
  const letter = char.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
  return /^[A-Z]$/.test(letter) ? letter : '#'
}

export function groupDirectory(figures: CelebDirectoryRow[], locale: string) {
  const groups = new Map<string, CelebDirectoryRow[]>()
  for (const figure of sortDirectory(figures, locale)) {
    const key = directoryInitial(directoryName(figure, locale), locale)
    const items = groups.get(key) ?? []
    items.push(figure)
    groups.set(key, items)
  }
  return [...groups].sort(([a], [b]) => {
    if (a === '#') return 1
    if (b === '#') return -1
    const koA = /[ㄱ-ㅎ]/.test(a), koB = /[ㄱ-ㅎ]/.test(b)
    return koA !== koB ? (koA ? -1 : 1) : a.localeCompare(b, locale)
  })
}
