import { notFound, redirect } from 'next/navigation'
import { episodeHomePath } from '@/lib/series-registry'

/** /[series]/[name] — 시리즈 정의의 진입 경로(episodeHome)로 보낸다 */
export default async function EpisodePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name: rawName } = await params
  const home = episodeHomePath(series, decodeURIComponent(rawName))
  if (!home) notFound()
  redirect(home)
}
