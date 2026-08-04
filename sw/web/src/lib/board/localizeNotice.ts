import type { NoticeWithAuthor } from '@/types/database'
import type { Locale } from '@/types/locale'

export function localizeNotice(notice: NoticeWithAuthor, locale: Locale): NoticeWithAuthor {
  if (locale === 'ko') return notice

  return {
    ...notice,
    title: notice.title_en,
    content: notice.content_en,
  }
}
