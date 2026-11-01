import { getLocale, getTranslations } from 'next-intl/server'
import { getHomeStats } from '@/actions/home/getHomeStats'
import { RetryBlock } from '@/components/ui/pending'
import styles from './HomeStats.module.css'

export function HomeStatsPending({ label }: { label: string }) {
  return <div className={styles.stats} role="status">
    <span className={styles.statPending}>{label}</span>
  </div>
}

export default async function HomeStats() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('home.landing')])
  let stats
  try { stats = await getHomeStats() }
  catch (error) { console.error('[home] 공개 수치 조회 실패', error); return <RetryBlock /> }
  const format = new Intl.NumberFormat(locale)
  return <dl className={styles.stats} data-home-stats>
    <div className={styles.stat} data-home-stat="people">
      <dt>{t('statsPeople')}</dt><dd>{format.format(stats.people)}+</dd>
    </div>
    <div className={styles.stat} data-home-stat="appreciations">
      <dt>{t('statsAppreciations')}</dt><dd>{format.format(stats.records)}+</dd>
    </div>
  </dl>
}
