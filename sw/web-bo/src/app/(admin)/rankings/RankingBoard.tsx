'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Plus, Users } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty, FactionTableCount,
  type FactionTableColumn,
} from '@/components/factions/FactionTable'
import { createRankingEpisode, type RankingEpisodeSummary } from '@/actions/admin/rankings/script'

const COLUMNS: FactionTableColumn[] = [
  { key: 'title', header: '편' },
  { key: 'categories', header: '축', width: '5rem', align: 'right' },
  { key: 'entries', header: '인물', width: '5rem', align: 'right' },
]

export default function RankingBoard({
  episodes,
  remotionLocal,
}: {
  episodes: RankingEpisodeSummary[]
  remotionLocal: boolean
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [newFolder, setNewFolder] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const create = () => {
    const folder = newFolder.trim()
    if (!folder) { showToast('error', '폴더명을 적어주세요'); return }
    startTransition(async () => {
      try {
        const created = await createRankingEpisode(folder, newTitle.trim())
        showToast('success', `${created} 편을 만들었습니다`)
        setCreating(false)
        setNewFolder('')
        setNewTitle('')
        router.push(`/rankings/${created}`)
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCreating(v => !v)}
          disabled={!remotionLocal}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> 새 랭킹
        </button>
        {!remotionLocal && (
          <span className="text-xs text-text-secondary">
            렌더 저장소가 이 컴퓨터에 없어 편집이 꺼져 있습니다(.env 의 REMOTION_LOCAL).
          </span>
        )}
      </div>

      {creating && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-bg-card p-3">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            폴더명 (영문·숫자·하이픈)
            <input
              value={newFolder}
              onChange={e => setNewFolder(e.target.value)}
              placeholder="greece-top10"
              className="w-56 rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            영상 명칭
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="비워 두면 폴더명을 씁니다"
              className="w-72 rounded border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={create}
            className="rounded-md border border-accent bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
          >
            만들기
          </button>
        </div>
      )}

      <FactionTable columns={COLUMNS}>
        {episodes.length === 0 && (
          <FactionTableEmpty colSpan={COLUMNS.length}>아직 랭킹 편이 없습니다.</FactionTableEmpty>
        )}
        {episodes.map(ep => (
          <FactionTableRow key={ep.folder} onOpen={() => router.push(`/rankings/${ep.folder}`)}>
            <FactionTableCell>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-text-primary">{ep.title}</span>
                <span className="text-[11px] text-text-secondary">{ep.folder}</span>
              </div>
            </FactionTableCell>
            <FactionTableCell align="right">
              <FactionTableCount value={ep.categoryCount} icon={<Layers className="h-3.5 w-3.5" />} title="축 수" />
            </FactionTableCell>
            <FactionTableCell align="right">
              <FactionTableCount value={ep.entryCount} icon={<Users className="h-3.5 w-3.5" />} title="인물 수" />
            </FactionTableCell>
          </FactionTableRow>
        ))}
      </FactionTable>
    </div>
  )
}
