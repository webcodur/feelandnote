import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { Link } from '@/i18n/navigation'
import { NoticeBody } from '@/components/features/board/notices/NoticeContent'
import { formatKST } from '@/lib/utils/date'
import { resolveLocale } from '@/types/locale'
import styles from './HomeNoticeList.module.css'

export default async function HomeNoticeList({ notices }: { notices: NoticeWithAuthor[] }) {
  const [rawLocale, t] = await Promise.all([
    getLocale(), getTranslations('board.notice'),
  ])
  const locale = resolveLocale(rawLocale)
  if (notices.length === 0) return null

  return <div className={styles.container} data-home-notices>
    {notices.map(notice => <details key={notice.id} className={styles.notice} data-home-notice>
      <summary className={styles.summary}>
        <h3 className={styles.title}>{notice.title}</h3>
        <time className={styles.date} dateTime={notice.created_at}>
          {formatKST(notice.created_at, { year: 'numeric', month: '2-digit', day: '2-digit' }, locale)}
        </time>
        <ChevronDown size={18} className={styles.chevron} aria-hidden />
      </summary>
      <div className={styles.content}>
        <NoticeBody content={notice.content} className={styles.body} />
        <div className={styles.footer}>
          <Link href={`/agora/board/notice/${notice.id}`} className={styles.detail}>
            {t('viewDetail')}<ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </details>)}
  </div>
}
