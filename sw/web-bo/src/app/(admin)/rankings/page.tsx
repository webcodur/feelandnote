import type { Metadata } from 'next'
import { listRankingEpisodes } from '@/actions/admin/rankings/script'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import RankingBoard from './RankingBoard'

export const metadata: Metadata = {
  title: '랭킹',
}

export default async function RankingsPage() {
  const episodes = await listRankingEpisodes()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">랭킹</h1>
        <p className="mt-1 text-sm text-text-secondary">
          한 축의 순위를 나레이터가 읽고, 인물마다 설명과 이미지가 한 번씩 나옵니다.
        </p>
      </div>
      <RankingBoard episodes={episodes} remotionLocal={REMOTION_LOCAL} />
    </div>
  )
}
