import type { Metadata } from 'next'
import Link from 'next/link'
import { Film } from 'lucide-react'
import { listEpisodes } from '@/actions/admin/episodes'

export const metadata: Metadata = { title: '영상 대본' }

export default async function EpisodesPage() {
  const episodes = await listEpisodes()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Film className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold text-text-primary">영상 대본</h1>
        <span className="text-sm text-text-secondary">{episodes.length}개 에피소드</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {episodes.map((ep) => (
          <Link
            key={ep.name}
            href={`/episodes/${ep.name}`}
            className="bg-bg-card border border-border rounded-lg p-5 hover:border-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <img
                src={ep.avatar_url}
                alt={ep.nickname}
                className="w-14 h-14 rounded-full object-cover border border-border"
              />
              <div className="flex-1 min-w-0">
                <div className="text-text-primary font-semibold group-hover:text-accent transition-colors truncate">
                  {ep.nickname}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {ep.bookCount}권 · {ep.name}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {episodes.length === 0 && (
        <div className="text-center py-20 text-text-secondary">
          에피소드가 없습니다. <code className="text-accent">remotion/episodes/</code>에 JSON 파일을 추가하세요.
        </div>
      )}
    </div>
  )
}
