import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { getTimelineCelebs } from '@/actions/admin/timeline'

export const metadata: Metadata = {
  title: '생애 행적 편집',
}

export default async function TimelineListPage() {
  const celebs = await getTimelineCelebs()
  const listed = celebs.filter((c) => c.slug)
  const totalEvents = listed.reduce((s, c) => s + c.event_count, 0)
  const totalCoords = listed.reduce((s, c) => s + c.coord_count, 0)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">생애 행적 편집</h1>
          <p className="text-sm text-text-secondary mt-1">
            인물 {listed.length}명 · 행적 {totalEvents}건 · 좌표 {totalCoords}건
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {listed.length === 0 ? (
          <p className="text-sm text-text-secondary">
            아직 행적이 등록된 인물이 없습니다.
          </p>
        ) : (
          listed.map((c) => (
            <Link
              key={c.id}
              href={`/celebs/timeline/${c.slug}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary p-3 hover:border-accent"
            >
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatar_url}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="h-10 w-10 flex-shrink-0 rounded-full bg-bg-primary" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {c.nickname}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>행적 {c.event_count}</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {c.coord_count}
                  </span>
                  {c.total_score != null ? <span>영향력 {c.total_score}</span> : null}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
