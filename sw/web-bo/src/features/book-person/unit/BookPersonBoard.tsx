'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty, FactionTableCount,
  type FactionTableColumn,
} from '@/components/factions/FactionTable'
import type { BookPersonSummary } from '@/features/book-person/types'

const COLUMNS: FactionTableColumn[] = [
  { key: 'person', header: '인물' },
  { key: 'role', header: '한 줄' },
  { key: 'draft', header: '원고', width: '4.5rem', align: 'center' },
  { key: 'books', header: '책', width: '5rem', align: 'right' },
  { key: 'lead', header: '제목', width: '4.5rem', align: 'center' },
]

export default function BookPersonBoard({
  people,
  remotionLocal,
}: {
  people: BookPersonSummary[]
  remotionLocal: boolean
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [draftOnly, setDraftOnly] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return people.filter(p => {
      if (draftOnly && !p.hasDraft) return false
      if (!needle) return true
      return [p.person, p.folder, p.role].some(v => v.toLowerCase().includes(needle))
    })
  }, [people, q, draftOnly])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="이름·연결 키·한 줄"
          className="w-72 rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary"
        />
        <button
          type="button"
          onClick={() => setDraftOnly(v => !v)}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            draftOnly
              ? 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
              : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-accent'
          }`}
        >
          작성한 편만
        </button>
        <span className="text-xs text-text-secondary">
          {rows.length} / {people.length}명
        </span>
        {!remotionLocal && (
          <span className="text-xs text-text-secondary">
            렌더 저장소가 이 컴퓨터에 없다. .env에 REMOTION_LOCAL=1을 넣어라.
          </span>
        )}
      </div>

      <FactionTable columns={COLUMNS}>
        {rows.length === 0 && (
          <FactionTableEmpty colSpan={COLUMNS.length}>맞는 인물이 없다.</FactionTableEmpty>
        )}
        {rows.map(ep => (
          <FactionTableRow
            key={ep.folder}
            onOpen={() => router.push(`/book-person/${encodeURIComponent(ep.folder)}`)}
          >
            <FactionTableCell>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-text-primary">{ep.person}</span>
                <span className="text-[11px] text-text-secondary">{ep.folder}</span>
              </div>
            </FactionTableCell>
            <FactionTableCell>
              <span className="text-xs text-text-secondary">{ep.role || '—'}</span>
            </FactionTableCell>
            <FactionTableCell align="center">
              <span className={`text-xs ${ep.hasDraft ? 'text-accent' : 'text-text-secondary'}`}>
                {ep.hasDraft ? '있음' : '없음'}
              </span>
            </FactionTableCell>
            <FactionTableCell align="right">
              <FactionTableCount value={ep.bookCount} icon={<BookOpen className="h-3.5 w-3.5" />} title="책 수" />
            </FactionTableCell>
            <FactionTableCell align="center">
              <span className="text-xs text-text-secondary">{ep.hasLead ? '있음' : '없음'}</span>
            </FactionTableCell>
          </FactionTableRow>
        ))}
      </FactionTable>
    </div>
  )
}
