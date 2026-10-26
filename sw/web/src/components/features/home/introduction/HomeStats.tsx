import { getLocale, getTranslations } from 'next-intl/server'
import { getHomeStats } from '@/actions/home/getHomeStats'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'
import LinkPending from '@/components/ui/pending/LinkPending'
import { Link } from '@/i18n/navigation'
import { ArrowDown, ArrowRight } from 'lucide-react'
import styles from './HomeStats.module.css'

export function HomeStatsPending({ label }: { label: string }) {
  return <div className={styles.stats}>
    {[0, 1].map(index => <div key={index} className={styles.statPending}><PendingBlock variant="panel" minHeight="min-h-full" label={label} /></div>)}
  </div>
}

export default async function HomeStats() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('home.landing')])
  let stats
  try { stats = await getHomeStats() }
  catch (error) { console.error('[home] 공개 수치 조회 실패', error); return <RetryBlock /> }
  const format = new Intl.NumberFormat(locale)
  return <div className={styles.stats}>
    <Link href="/explore" className={styles.stat} data-home-stat="people">
      <span className={styles.statLabel}>{t('statsPeople')}</span>
      <strong>{format.format(stats.people)}</strong>
      <span className={styles.statAction}><span>{t('explorePeople')}</span><span className={styles.statArrow}><LinkPending><ArrowRight size={17} aria-hidden /></LinkPending></span></span>
    </Link>
    <a href="#hub-home-0" className={styles.stat} data-home-stat="records">
      <span className={styles.statLabel}>{t('statsRecords')}</span>
      <strong>{format.format(stats.records)}</strong>
      <span className={styles.statAction}><span>{t('readAppreciations')}</span><span className={styles.statArrow}><ArrowDown size={17} aria-hidden /></span></span>
    </a>
  </div>
}
