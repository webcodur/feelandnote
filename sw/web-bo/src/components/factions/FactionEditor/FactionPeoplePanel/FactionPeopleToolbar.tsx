'use client'

import { CheckCircle2, ImageOff, Search, UserRound, Users } from 'lucide-react'

export type ImageFilter = 'all' | 'missing' | 'avatar' | 'portrait' | 'complete' | 'unlinked'

export interface FactionPeopleCounts {
  all: number
  avatar: number
  portrait: number
  complete: number
  unlinked: number
}

const FILTERS: { value: ImageFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'missing', label: '이미지 부족' },
  { value: 'avatar', label: '아바타 없음' },
  { value: 'portrait', label: '대표 사진 없음' },
  { value: 'complete', label: '완료' },
  { value: 'unlinked', label: '프로필 미연결' },
]

export function FactionPeopleToolbar({
  counts,
  filter,
  query,
  onFilter,
  onQuery,
}: {
  counts: FactionPeopleCounts
  filter: ImageFilter
  query: string
  onFilter: (filter: ImageFilter) => void
  onQuery: (query: string) => void
}) {
  const filterCount = (value: ImageFilter) => {
    if (value === 'all') return counts.all
    if (value === 'avatar') return counts.avatar
    if (value === 'portrait') return counts.portrait
    if (value === 'complete') return counts.complete
    if (value === 'unlinked') return counts.unlinked
    return counts.all - counts.complete
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="이 편 등장인물 이미지 현황">
        <Summary label="전체 인물" value={counts.all} icon={<Users className="h-4 w-4" />} />
        <Summary label="아바타 없음" value={counts.avatar} icon={<UserRound className="h-4 w-4" />} warn={counts.avatar > 0} />
        <Summary label="대표 사진 없음" value={counts.portrait} icon={<ImageOff className="h-4 w-4" />} warn={counts.portrait > 0} />
        <Summary label="두 사진 완료" value={counts.complete} icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary p-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="등장인물 이미지 필터">
          {FILTERS.map(option => {
            const selected = filter === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${selected
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-text-primary'}`}
              >
                {option.label}<span className="ms-1.5 tabular-nums">{filterCount(option.value)}</span>
              </button>
            )
          })}
        </div>
        <label className="relative min-w-60 flex-1 sm:max-w-sm">
          <span className="sr-only">이 편 등장인물 검색</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={event => onQuery(event.target.value)}
            placeholder="이름·slug·세력 검색"
            className="h-10 w-full rounded-lg border border-border bg-bg-card pe-3 ps-10 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </>
  )
}

function Summary({ label, value, icon, warn = false }: { label: string; value: number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-bg-card p-3 ${warn ? 'border-warning/50' : 'border-border'}`}>
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${warn ? 'text-warning-text' : 'text-text-secondary'}`}>{icon}{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  )
}
