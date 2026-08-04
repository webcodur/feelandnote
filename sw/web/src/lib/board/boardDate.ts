import { formatDistanceToNow } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
import type { Locale } from '@/types/locale'
import { formatKST } from '@/lib/utils/date'

const DATE_LOCALES = { ko, en: enUS } as const

export function formatBoardRelativeTime(date: string, locale: Locale): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: DATE_LOCALES[locale],
  })
}

export function formatBoardDateTime(date: string, locale: Locale): string {
  return formatKST(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }, locale)
}

export function formatBoardShortDateTime(date: string, locale: Locale): string {
  return formatKST(date, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }, locale)
}
