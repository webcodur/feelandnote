import { notFound } from 'next/navigation'
import { listRankingThemes } from '@/actions/admin/rankings/celebs'
import { loadRankingScript } from '@/actions/admin/rankings/script'
import RankingEditor from './RankingEditor'

export default async function RankingEpisodePage({
  params,
}: {
  params: Promise<{ episode: string }>
}) {
  const { episode } = await params
  let script
  try {
    script = await loadRankingScript(episode)
  } catch {
    notFound()
  }
  const themes = await listRankingThemes()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{script.title.split('\n')[0]}</h1>
        <p className="mt-1 text-sm text-text-secondary">{episode}</p>
      </div>
      <RankingEditor folder={episode} initial={script} themes={themes} />
    </div>
  )
}
