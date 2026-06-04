import { redirect } from 'next/navigation'
import { isFactionSeries } from '@/lib/series-registry'
import { FactionEditor } from '@/components/faction/FactionEditor'

export default async function EpisodePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (isFactionSeries(series)) return <FactionEditor series={series} name={name} />
  redirect(`/${series}/${name}/scenario`)
}
