'use client'

/**
 * 영상 편 표 — 한 줄이 유튜브로 나가는 영상 한 편이다.
 *
 * 데이터는 전부 DB 에서 온다(문서 §0). 사진·음원만 이 컴퓨터의 렌더 저장소에 남아 있고,
 * 그 폴더를 만지는 기능(내보내기·복제 시 사진 복사·이름변경 시 폴더 이동)은
 * 로컬 자산 창구가 켜져 있을 때만 눌린다.
 *
 * 아래쪽 도감 테마 표와 같은 부품을 쓴다 — 한 화면에서 카드와 줄이 따로 놀지 않게.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Trash2, PenLine, FileDown, Plus, Layers } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  createFactionEpisode, duplicateFactionEpisode, renameFactionEpisode,
  deleteFactionEpisode, setFactionEpisodeStatus, setFactionEpisodeRegistered,
  type FactionEpisodeSummary, type FactionEpisodeStatus,
} from '@/actions/admin/factions/episodes'
import { exportFactionEpisode, regenerateFactionRegistry } from '@/actions/admin/factions/export'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty,
  FactionTableBadge, FactionTableCount, type FactionTableColumn,
} from '@/components/factions/FactionTable'

const STATUS_OPTIONS: { value: FactionEpisodeStatus; label: string; dot: string }[] = [
  { value: 'todo', label: '준비', dot: 'bg-gray-400' },
  { value: 'live', label: '작업 중', dot: 'bg-amber-400' },
  { value: 'done', label: '완료', dot: 'bg-green-500' },
]

const COLUMNS: FactionTableColumn[] = [
  { key: 'title', header: '제목' },
  { key: 'status', header: '상태', width: '9rem' },
  { key: 'registered', header: '렌더 편성', width: '8rem' },
  { key: 'groups', header: '세력', width: '4.5rem', align: 'right' },
  { key: 'people', header: '인물', width: '4.5rem', align: 'right' },
  { key: 'themes', header: '연결 테마', width: '16rem' },
  { key: 'actions', header: '', width: '9rem', align: 'right' },
]

/** 한 편에 걸린 도감 테마 (`faction_groups.tag_id` 로 이어진다) */
export interface EpisodeThemeLink {
  id: string
  name: string
  color: string
}

export default function EpisodeTable({
  items, factionLocal, themesByFolder,
}: {
  items: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
  themesByFolder: Record<string, EpisodeThemeLink[]>
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
    <section className="space-y-4">
      {/* 머리 — 정체 한 줄 + 새로 만들기 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">영상 편</h2>
          <p className="mt-1 text-sm text-text-secondary">
            유튜브로 나가는 영상 편(제작 데이터). 폴더명은 사진·음원 경로에 그대로 쓰이니 영문·숫자·하이픈만 쓰세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            placeholder="폴더명 (예: llm-wars)"
            className="w-44 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
          />
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="영상 제목 (비우면 폴더명)"
            className="w-52 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary"
          />
          <button
            onClick={create}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />새 영상 편
          </button>
        </div>
      </div>

      {!factionLocal && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          렌더 저장소가 연결되지 않았습니다. 사진·음원·파일 내보내기는 쓸 수 없고, 글과 구성 편집만 됩니다.
          연결하려면 <code className="font-mono">sw/web-bo/.env</code> 에 <code className="font-mono">FACTION_LOCAL=1</code> 을
          넣고 개발 서버를 다시 띄우세요.
        </p>
      )}

      <FactionTable columns={COLUMNS}>
        {items.length === 0 && (
          <FactionTableEmpty colSpan={COLUMNS.length}>아직 영상 편이 없습니다.</FactionTableEmpty>
        )}

        {items.map(ep => {
          const themes = themesByFolder[ep.folder] ?? []
          return (
            <FactionTableRow key={ep.id} onOpen={() => router.push(`/factions/${encodeURIComponent(ep.folder)}`)}>
              <FactionTableCell>
                <span className="block truncate font-medium text-text-primary group-hover:text-accent">
                  {ep.title.split('\n')[0]}
                </span>
                <span className="block truncate font-mono text-xs text-text-secondary">{ep.folder}</span>
              </FactionTableCell>

              <FactionTableCell>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_OPTIONS.find(o => o.value === ep.status)?.dot}`} />
                  <select
                    value={ep.status}
                    disabled={pending}
                    onChange={e => run('상태 변경', () =>
                      setFactionEpisodeStatus(ep.folder, e.target.value as FactionEpisodeStatus).then(() => undefined))}
                    className="rounded border border-border bg-bg-card px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </span>
              </FactionTableCell>

              <FactionTableCell>
                <label className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary">
                  <input
                    type="checkbox"
                    checked={ep.registered}
                    disabled={pending}
                    onChange={e => run('편성 변경', () =>
                      setFactionEpisodeRegistered(ep.folder, e.target.checked).then(() => undefined))}
                  />
                  {ep.registered ? `편성 ${ep.sortOrder}` : '제외'}
                </label>
              </FactionTableCell>

              <FactionTableCell align="right">
                <FactionTableCount value={ep.groupCount} title="세력 수" />
              </FactionTableCell>

              <FactionTableCell align="right">
                <FactionTableCount value={ep.personCount} title="인물 수" />
              </FactionTableCell>

              <FactionTableCell>
                {themes.length === 0 ? (
                  <span className="text-text-secondary opacity-40">—</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {themes.map(t => (
                      <FactionTableBadge key={t.id} color={t.color} icon={<Layers className="h-3 w-3" />}>
                        {t.name}
                      </FactionTableBadge>
                    ))}
                  </span>
                )}
              </FactionTableCell>

              <FactionTableCell align="right">
                <span className="flex justify-end gap-1">
                  {factionLocal && (
                    <IconButton onClick={() => exportOne(ep.folder)} disabled={pending} title="렌더용 파일 다시 쓰기">
                      <FileDown className="h-4 w-4" />
                    </IconButton>
                  )}
                  <IconButton onClick={() => renameOne(ep.folder)} disabled={pending} title="폴더명 바꾸기">
                    <PenLine className="h-4 w-4" />
                  </IconButton>
                  <IconButton onClick={() => duplicate(ep.folder)} disabled={pending} title="복제">
                    <Copy className="h-4 w-4" />
                  </IconButton>
                  <IconButton onClick={() => removeOne(ep.folder)} disabled={pending} title="목록에서 지우기 (사진·음원은 남습니다)" danger>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </span>
              </FactionTableCell>
            </FactionTableRow>
          )
        })}
      </FactionTable>

      {factionLocal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary px-4 py-3">
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
    </section>
  )
}

// #region Sub Components
function IconButton({
  onClick, disabled, title, danger, children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md border border-border bg-bg-card p-1.5 disabled:opacity-40 ${
        danger ? 'text-red-400 hover:bg-red-500 hover:text-white' : 'text-text-secondary hover:text-accent'
      }`}
    >
      {children}
    </button>
  )
}
// #endregion
