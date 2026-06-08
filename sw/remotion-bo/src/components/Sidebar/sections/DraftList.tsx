import Link from 'next/link'
import { fmtYear } from '../utils'
import type { CandidateSummary } from '../types'

type DraftListProps = {
  filteredCandidates: CandidateSummary[]
  activeSeries: string
  pathname: string
  candidatesLength: number
}

export function DraftList({ filteredCandidates, activeSeries, pathname, candidatesLength }: DraftListProps) {
  return (
    <div className="space-y-0.5">
      {filteredCandidates.map(d => {
        const active = pathname.startsWith(`/${activeSeries}/${d.name}`)
        return (
          <Link key={d.name} href={`/${activeSeries}/${d.name}`}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${active ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
            <span className="text-zinc-500 text-[10px]">◇</span>
            <span className="font-semibold truncate">{d.nickname}</span>
            <span className="ml-auto text-[10px] text-text-dim shrink-0">{fmtYear(d.birthYear)}</span>
          </Link>
        )
      })}
      {filteredCandidates.length === 0 && (
        <div className="text-xs text-text-dim py-4 text-center">
          {candidatesLength === 0 ? 'Draft 없음' : '검색 결과 없음'}
        </div>
      )}
    </div>
  )
}
