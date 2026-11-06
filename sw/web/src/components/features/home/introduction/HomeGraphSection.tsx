import { getLocale, getTranslations } from 'next-intl/server'
import { getHomeGraphDeck } from '@/actions/home/getHomeGraphData'
import { RetryBlock } from '@/components/ui/pending'
import { Link } from '@/i18n/navigation'
import HomePersonRotation from './HomePersonRotation'
import type { HomeGraphMode } from './types'

export default async function HomeGraphSection({ mode }: { mode: HomeGraphMode }) {
  const locale = await getLocale()
  let data
  try { data = await getHomeGraphDeck(mode, locale) }
  catch (error) { console.error('[home] 그래프 조회 실패', mode, error); return <RetryBlock /> }
  if (data.length) return <HomePersonRotation mode={mode} people={data} />
  const t = await getTranslations('home.landing.graph')
  return <p className="text-center text-sm text-text-secondary">{t('unavailable')} <Link className="text-accent hover:underline" href="/explore">{t('personLink')} ↗</Link></p>
}
