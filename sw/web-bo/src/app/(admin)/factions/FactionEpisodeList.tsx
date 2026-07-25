'use client'

/**
 * 세력도 목록 — 카드 한 장이 영상 한 편이다.
 *
 * 데이터는 전부 DB 에서 온다(문서 §0). 사진·음원만 이 컴퓨터의 렌더 저장소에 남아 있고,
 * 그 폴더를 만지는 기능(내보내기·복제 시 사진 복사·이름변경 시 폴더 이동)은
 * 로컬 자산 창구가 켜져 있을 때만 눌린다.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Trash2, PenLine, FileDown, Users, Layers } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  createFactionEpisode, duplicateFactionEpisode, renameFactionEpisode,
  deleteFactionEpisode, setFactionEpisodeStatus, setFactionEpisodeRegistered,
  type FactionEpisodeSummary, type FactionEpisodeStatus,
} from '@/actions/admin/factions/episodes'
import { exportFactionEpisode, regenerateFactionRegistry } from '@/actions/admin/factions/export'

const STATUS_OPTIONS: { value: FactionEpisodeStatus; label: string; dot: string }[] = [
  { value: 'todo', label: '준비', dot: 'bg-gray-400' },
  { value: 'live', label: '작업 중', dot: 'bg-amber-400' },
  { value: 'done', label: '완료', dot: 'bg-green-500' },
]

export default function FactionEpisodeList({
  items, factionLocal,
}: {
  items: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [newFolder, setNewFolder] = useState('')
  const [newTitle, setNewTitle] = useState('')

  /** 서버 작업 한 번 — 실패는 그대로 보여준다(조용한 실패 금지) */
  const run = (label: string, fn: () => Promise<string | void>) => {
    startTransition(async () => {
      try {
        const msg = await fn()
        showToast('success', msg || `${label} 완료`)
        router.refresh()
      } catch (e) {
        showToast('error', `${label} 실패 — ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  const create = () => {
    if (!newFolder.trim()) { showToast('error', '폴더명을 입력하세요'); return }
    run('만들기', async () => {
      const r = await createFactionEpisode(newFolder, newTitle)
      setNewFolder(''); setNewTitle('')
      return `${r.folder} 을 만들었습니다`
    })
  }

  const duplicate = (folder: string) => {
    const dst = window.prompt(`"${folder}" 복제본의 새 폴더명:`, `${folder}-copy`)
    if (!dst) return
    run('복제', async () => {
      const r = await duplicateFactionEpisode(folder, dst)
      return `${r.folder} 로 복제했습니다${r.imagesCopied ? ' (사진 포함)' : ''}`
    })
  }

  const renameOne = (folder: string) => {
    const dst = window.prompt('새 폴더명 — 사진·음원 폴더도 함께 옮깁니다:', folder)
    if (!dst || dst === folder) return
    run('이름 변경', async () => {
      const r = await renameFactionEpisode(folder, dst)
      return `${r.folder} 로 바꿨습니다${r.assetsMoved ? ' (사진·음원 폴더도 옮김)' : ''}`
    })
  }

  const removeOne = (folder: string) => {
    if (!window.confirm(`"${folder}" 을 목록에서 지웁니다.\n사진과 음원 파일은 그대로 남습니다. 계속할까요?`)) return
    const typed = window.prompt(`확인을 위해 폴더명을 그대로 입력하세요: ${folder}`)
    if (typed === null) return
    run('삭제', async () => {
      const r = await deleteFactionEpisode(folder, typed)
      return r.assetsKept
        ? `${r.deleted} 을 지웠습니다. 사진·음원은 남겨 뒀습니다`
        : `${r.deleted} 을 지웠습니다`
    })
  }

  const exportOne = (folder: string) => {
    run('내보내기', async () => {
      const r = await exportFactionEpisode(folder)
      if (!r.written) throw new Error(`${r.reason}${r.diffs?.length ? ` (차이 ${r.diffs.length}곳)` : ''}`)
      return `${folder} 파일을 새로 썼습니다 — ${r.reason}`
    })
  }

  return (
    <div className="space-y-6">
      {!factionLocal && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          렌더 저장소가 연결되지 않았습니다. 사진·음원·파일 내보내기는 쓸 수 없고, 글과 구성 편집만 됩니다.
          연결하려면 <code className="font-mono">sw/web-bo/.env</code> 에 <code className="font-mono">FACTION_LOCAL=1</code> 을
          넣고 개발 서버를 다시 띄우세요.
        </p>
      )}

      {/* 새로 만들기 */}
      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">새 세력도</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            placeholder="폴더명 (예: llm-wars)"
            className="w-56 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
          />
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="영상 제목 (비우면 폴더명)"
            className="flex-1 min-w-56 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
          />
          <button
            onClick={create}
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
          >
            만들기
          </button>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          폴더명은 사진·음원 경로에 그대로 쓰입니다. 영문·숫자·하이픈만 쓰고, 나중에 바꾸면 그 폴더도 함께 옮겨집니다.
        </p>
      </div>

      {/* 목록 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(ep => (
          <div
            key={ep.id}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-bg-secondary p-4 hover:border-accent/60"
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/factions/${encodeURIComponent(ep.folder)}`} className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-text-primary group-hover:text-accent">
                  {ep.title.split('\n')[0]}
                </span>
                <span className="block truncate font-mono text-xs text-text-secondary">{ep.folder}</span>
              </Link>
              {ep.registered && (
                <span className="shrink-0 rounded bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent">
                  편성 {ep.sortOrder}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />세력 {ep.groupCount}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />인물 {ep.personCount}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_OPTIONS.find(o => o.value === ep.status)?.dot}`} />
              <select
                value={ep.status}
                disabled={pending}
                onChange={e => run('상태 변경', () =>
                  setFactionEpisodeStatus(ep.folder, e.target.value as FactionEpisodeStatus).then(() => undefined))}
                className="rounded border border-border bg-bg-card px-2 py-1 text-xs text-text-secondary"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={ep.registered}
                  disabled={pending}
                  onChange={e => run('편성 변경', () =>
                    setFactionEpisodeRegistered(ep.folder, e.target.checked).then(() => undefined))}
                />
                편성에 넣기
              </label>
            </div>

            <div className="mt-auto flex justify-end gap-1 border-t border-border/50 pt-3">
              {factionLocal && (
                <button
                  onClick={() => exportOne(ep.folder)}
                  disabled={pending}
                  title="렌더용 파일 다시 쓰기"
                  className="rounded-md border border-border bg-bg-card p-1.5 text-text-secondary hover:text-accent disabled:opacity-40"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => renameOne(ep.folder)}
                disabled={pending}
                title="폴더명 바꾸기"
                className="rounded-md border border-border bg-bg-card p-1.5 text-text-secondary hover:text-accent disabled:opacity-40"
              >
                <PenLine className="h-4 w-4" />
              </button>
              <button
                onClick={() => duplicate(ep.folder)}
                disabled={pending}
                title="복제"
                className="rounded-md border border-border bg-bg-card p-1.5 text-text-secondary hover:text-accent disabled:opacity-40"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeOne(ep.folder)}
                disabled={pending}
                title="목록에서 지우기 (사진·음원은 남습니다)"
                className="rounded-md border border-border bg-bg-card p-1.5 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="col-span-full rounded-xl border border-border bg-bg-secondary py-12 text-center text-sm text-text-secondary">
            아직 세력도가 없습니다.
          </p>
        )}
      </div>

      {factionLocal && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-xs text-text-secondary">
            편성 목록 파일을 다시 만듭니다. 렌더가 이 파일을 보고 어떤 편을 만들지 정합니다.
          </p>
          <button
            onClick={() => run('편성 목록 재생성', async () => {
              const r = await regenerateFactionRegistry()
              return r.changed ? `편성 ${r.list.length}편으로 갱신했습니다` : '이미 최신입니다'
            })}
            disabled={pending}
            className="shrink-0 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-secondary hover:text-accent disabled:opacity-50"
          >
            편성 목록 다시 만들기
          </button>
        </div>
      )}
    </div>
  )
}
