'use client'

/**
 * 가상 담화 판 — 편 목록 표 하나.
 *
 * 한 줄이 담화 한 편이다. 위쪽에 노출로 켠 편이 편성 순서대로 오고, 그 아래 구분 줄 밑에
 * 아직 안 켠 편이 폴더명순으로 모인다. 줄을 누르면 그 편의 원고 편집 화면으로 간다.
 *
 * 표 부품은 세력도 화면이 쓰던 것(`components/factions/FactionTable`)을 그대로 쓴다.
 * 머리줄·행·배지·손 올림 반응이 이미 정해져 있고 시리즈 고유 지식이 없는 순수 표 부품이라,
 * 같은 생김새를 다시 만드는 대신 빌려 쓴다(이름만 세력도 시절 것이다).
 */

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Users, Plus, Eye, EyeOff, FileText } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty, FactionTableSection,
  FactionTableBadge, FactionTableCount, type FactionTableColumn,
} from '@/components/factions/FactionTable'
import {
  createDiscourseEpisode, setDiscourseEpisodeRegistered, setDiscourseEpisodeStatus,
  type DiscourseEpisodeSummary, type DiscourseEpisodeStatus,
} from '@/actions/admin/discourses/episodes'
import { regenerateDiscourseRegistry } from '@/actions/admin/discourses/export'
import { folderToParam } from '@/lib/discourse-edit-route'

const COLUMNS: FactionTableColumn[] = [
  { key: 'title', header: '편' },
  { key: 'topic', header: '논제' },
  { key: 'cast', header: '인물', width: '4.5rem', align: 'right' },
  { key: 'turns', header: '발언', width: '4.5rem', align: 'right' },
  { key: 'status', header: '진행', width: '7rem', align: 'center' },
  { key: 'registered', header: '노출', width: '6rem', align: 'center' },
]

const STATUS_OPTIONS: { value: DiscourseEpisodeStatus; label: string }[] = [
  { value: 'todo', label: '작업 전' },
  { value: 'live', label: '작업 중' },
  { value: 'done', label: '완료' },
]

/** 영상 명칭은 통합형(앞부분\n뒷부분)이라 목록에는 앞부분만 보인다 */
const titleHead = (s: string) => s.split('\n')[0]

export default function DiscourseBoard({
  episodes,
  remotionLocal,
}: {
  episodes: DiscourseEpisodeSummary[]
  remotionLocal: boolean
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [newFolder, setNewFolder] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const { shown, hidden } = useMemo(() => ({
    shown: episodes.filter(e => e.registered),
    hidden: episodes.filter(e => !e.registered),
  }), [episodes])

  const openEditor = (folder: string) => {
    router.push(`/discourses/${folderToParam(folder)}/both/shorts`)
  }

  const run = (fn: () => Promise<unknown>, okMsg: string) => {
    startTransition(async () => {
      try {
        await fn()
        showToast('success', okMsg)
        router.refresh()
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : String(e))
      }
    })
  }

  const create = () => {
    const folder = newFolder.trim()
    if (!folder) { showToast('error', '폴더명을 적어주세요'); return }
    run(async () => {
      await createDiscourseEpisode(folder, newTitle.trim())
      setCreating(false)
      setNewFolder('')
      setNewTitle('')
    }, `${folder} 편을 만들었습니다`)
  }

  const row = (ep: DiscourseEpisodeSummary) => (
    <FactionTableRow key={ep.id} onOpen={() => openEditor(ep.folder)}>
      <FactionTableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-text-primary">{titleHead(ep.title)}</span>
          <span className="text-[11px] text-text-secondary">{ep.folder}</span>
        </div>
      </FactionTableCell>
      <FactionTableCell>
        <span className="text-xs text-text-secondary">{ep.topic ?? ep.logline ?? '—'}</span>
      </FactionTableCell>
      <FactionTableCell align="right">
        <FactionTableCount value={ep.castCount} icon={<Users className="h-3.5 w-3.5" />} title="등장 인물 수" />
      </FactionTableCell>
      <FactionTableCell align="right">
        <FactionTableCount value={ep.turnCount} icon={<MessageSquare className="h-3.5 w-3.5" />} title="발언 수" />
      </FactionTableCell>
      <FactionTableCell align="center">
        <select
          value={ep.status}
          disabled={pending}
          onChange={e => run(
            () => setDiscourseEpisodeStatus(ep.folder, e.target.value as DiscourseEpisodeStatus),
            '진행 상태를 바꿨습니다',
          )}
          className="rounded border border-border bg-bg-card px-1.5 py-1 text-xs text-text-primary"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FactionTableCell>
      <FactionTableCell align="center">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(
            () => setDiscourseEpisodeRegistered(ep.folder, !ep.registered),
            ep.registered ? '목록에서 내렸습니다' : '목록에 올렸습니다',
          )}
          title={ep.registered ? '영상 목록에서 내린다' : '영상 목록에 올린다'}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-white/5 hover:text-accent"
        >
          {ep.registered ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {ep.registered ? `${ep.sortOrder}번` : '내림'}
        </button>
      </FactionTableCell>
    </FactionTableRow>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCreating(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-accent"
        >
          <Plus className="h-4 w-4" /> 새 담화
        </button>
        {remotionLocal && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(
              async () => {
                const r = await regenerateDiscourseRegistry()
                if (!r.changed) showToast('info', '목록 파일은 이미 최신입니다')
              },
              '영상 목록 파일을 다시 만들었습니다',
            )}
            title="노출로 켠 편을 순서대로 담아 렌더가 읽는 목록 파일을 다시 만든다"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-accent"
          >
            <FileText className="h-4 w-4" /> 영상 목록 다시 만들기
          </button>
        )}
        {!remotionLocal && (
          <span className="text-xs text-text-secondary">
            렌더 저장소가 이 컴퓨터에 없어 파일 내보내기는 꺼져 있습니다(.env 의 REMOTION_LOCAL).
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
              placeholder="musk-altman"
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
          <FactionTableEmpty colSpan={COLUMNS.length}>아직 담화 편이 없습니다.</FactionTableEmpty>
        )}
        {shown.map(row)}
        {hidden.length > 0 && (
          <FactionTableSection
            colSpan={COLUMNS.length}
            title="목록에 안 올린 편"
            note={<FactionTableBadge>{hidden.length}편</FactionTableBadge>}
          />
        )}
        {hidden.map(row)}
      </FactionTable>
    </div>
  )
}
