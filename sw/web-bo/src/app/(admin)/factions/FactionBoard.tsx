'use client'

/**
 * 세력도 판 — 표 하나.
 *
 * 기준은 도감 테마다. 한 줄이 서비스 세력도감에 진열되는 테마 하나이고, 그 테마가 어느 영상 편에
 * 쓰였는지는 「영상」 칸의 배지로 붙는다(한 테마가 여러 편에 걸릴 수 있다). 배지를 누르면 그 편의
 * 편집기로 간다.
 *
 * 예전에는 영상 편 목록과 테마 목록이 위아래 두 덩어리로 나뉘어 있었는데, 같은 화면에서 서로
 * 다른 물건처럼 보여 계속 헷갈렸다. 그래서 표 하나로 합치고, 어느 테마에도 안 걸린 편만
 * 맨 아래 「미연결 영상」 구분 줄 밑에 모아 둔다.
 *
 * 위계: 아래에 테마를 거느린 테마가 묶음 머리로 뜨고(굵게·바탕 살짝 다르게) 그 소속 테마가
 * 한 칸 들여쓰기로 따라붙는다. 묶음 관계 자체는 각 테마의 편집 화면에서 정한다.
 */

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GripVertical, Plus, Sparkles, Users, Image as ImageIcon, UserSquare2,
  Video, FileText, Layers,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { type CelebTag, updateTagOrder } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import { regenerateFactionRegistry } from '@/actions/admin/factions/export'
import FactionEpisodeActions, { FACTION_STATUS_OPTIONS } from '@/components/factions/FactionEpisodeActions'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty, FactionTableSection,
  FactionTableBadge, FactionTableCount, type FactionTableColumn,
} from '@/components/factions/FactionTable'
import ThemeFormModal from './ThemeFormModal'
import EpisodeFormModal from './EpisodeFormModal'

const COLUMNS: FactionTableColumn[] = [
  { key: 'name', header: '테마' },
  { key: 'celebs', header: '인물', width: '4.5rem', align: 'right' },
  { key: 'featured', header: '도감 노출', width: '6.5rem', align: 'center' },
  { key: 'images', header: '단체샷 / 개인샷', width: '9rem', align: 'right' },
  { key: 'episodes', header: '영상', width: '14rem' },
  { key: 'order', header: '순서', width: '4rem', align: 'center' },
]

/** 화면에 그릴 한 줄 — 테마 + 들여쓰기 여부 + 아래에 거느린 테마 수 */
interface ThemeRow {
  theme: FactionThemeSummary
  isChild: boolean
  childCount: number
}

/**
 * 저장된 순서를 묶음 머리 → 소속 테마 차례로 펼친다.
 *
 * 부모로 지정된 테마가 목록에 없으면(지워졌거나 걸러졌으면) 그 테마는 무소속으로 취급해
 * 화면에서 사라지지 않게 한다.
 */
function toRows(themes: FactionThemeSummary[]): ThemeRow[] {
  const ids = new Set(themes.map(t => t.id))
  const childrenOf = new Map<string, FactionThemeSummary[]>()
  for (const t of themes) {
    if (t.parent_id && ids.has(t.parent_id)) {
      const list = childrenOf.get(t.parent_id) ?? []
      list.push(t)
      childrenOf.set(t.parent_id, list)
    }
  }

  const rows: ThemeRow[] = []
  for (const t of themes) {
    if (t.parent_id && ids.has(t.parent_id)) continue
    const children = childrenOf.get(t.id) ?? []
    rows.push({ theme: t, isChild: false, childCount: children.length })
    for (const c of children) rows.push({ theme: c, isChild: true, childCount: 0 })
  }
  return rows
}

export default function FactionBoard({
  initialThemes,
  episodes,
  factionLocal,
}: {
  initialThemes: FactionThemeSummary[]
  episodes: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [themes, setThemes] = useState(initialThemes)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const rows = useMemo(() => toRows(themes), [themes])

  /** 어느 테마에도 안 걸린 편 — 표 맨 아래 구분 줄 밑에 모은다 */
  const looseEpisodes = useMemo(() => {
    const linked = new Set<string>()
    for (const t of themes) for (const ep of t.episodes) linked.add(ep.folder)
    return episodes.filter(ep => !linked.has(ep.folder))
  }, [themes, episodes])

  // #region 새로 만들기
  const handleThemeCreated = (newTag?: CelebTag) => {
    setIsThemeModalOpen(false)
    // 만든 즉시 편집 화면으로 — 인물·사진은 거기서 채운다
    if (newTag) router.push(`/factions/themes/${newTag.id}`)
  }

  const handleEpisodeCreated = (folder?: string) => {
    setIsEpisodeModalOpen(false)
    if (folder) router.push(`/factions/${encodeURIComponent(folder)}`)
  }
  // #endregion

  // #region 순서 바꾸기
  /**
   * 같은 층끼리만 자리를 바꾼다. 묶음 머리를 끌면 소속 테마가 통째로 따라 움직이고,
   * 소속 테마는 자기 묶음 안에서만 자리를 옮긴다. 다른 묶음으로 옮기는 일은
   * 순서가 아니라 소속을 바꾸는 것이므로 테마 편집 화면이 맡는다.
   */
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const dragged = themes.find(t => t.id === draggedId)
    const target = themes.find(t => t.id === targetId)
    if (!dragged || !target) return
    if ((dragged.parent_id ?? null) !== (target.parent_id ?? null)) return

    const from = themes.findIndex(t => t.id === draggedId)
    const to = themes.findIndex(t => t.id === targetId)
    const next = [...themes]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setThemes(next)
  }

  const handleDragEnd = async () => {
    if (!draggedId) return
    setDraggedId(null)
    await updateTagOrder(toRows(themes).map(r => r.theme.id))
  }
  // #endregion

  const regenerate = () => {
    startTransition(async () => {
      try {
        const r = await regenerateFactionRegistry()
        showToast('success', r.changed ? `편성 ${r.list.length}편으로 갱신했습니다` : '이미 최신입니다')
        router.refresh()
      } catch (e) {
        showToast('error', `편성 목록 재생성 실패 — ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 표 머리 오른쪽 — 새로 만들기 두 갈래 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => setIsEpisodeModalOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-accent hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          새 영상 편
        </button>
        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 테마
        </button>
      </div>

      {!factionLocal && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          렌더 저장소가 연결되지 않았습니다. 사진·음원·파일 내보내기는 쓸 수 없고, 글과 구성 편집만 됩니다.
          연결하려면 <code className="font-mono">sw/web-bo/.env</code> 에 <code className="font-mono">FACTION_LOCAL=1</code> 을
          넣고 개발 서버를 다시 띄우세요.
        </p>
      )}

      <FactionTable columns={COLUMNS}>
        {rows.length === 0 && looseEpisodes.length === 0 && (
          <FactionTableEmpty colSpan={COLUMNS.length}>아직 아무것도 없습니다.</FactionTableEmpty>
        )}

        {rows.map(({ theme, isChild, childCount }) => (
          <FactionTableRow
            key={theme.id}
            tone={childCount > 0 ? 'group' : isChild ? 'child' : 'default'}
            dragging={draggedId === theme.id}
            draggable
            onDragStart={() => setDraggedId(theme.id)}
            onDragOver={e => handleDragOver(e, theme.id)}
            onDragEnd={handleDragEnd}
            onOpen={() => router.push(`/factions/themes/${theme.id}`)}
          >
            <FactionTableCell>
              <span className="flex min-w-0 items-center gap-2">
                {/* 소속 테마는 한 칸 들여쓰고 세로선으로 묶음에 매달린 것을 보인다 */}
                {isChild && <span className="ml-4 h-5 w-px shrink-0 bg-accent/40" />}
                {/* 줄 전체를 끌어 순서를 바꾸므로 링크 자체는 끌리지 않게 막는다(주소가 끌려간다) */}
                <Link
                  href={`/factions/themes/${theme.id}`}
                  draggable={false}
                  className="shrink-0 rounded-full px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
                >
                  {theme.name}
                </Link>
                {childCount > 0 && (
                  <FactionTableBadge
                    className="bg-accent/15 text-accent"
                    icon={<Layers className="h-3 w-3" />}
                    title="아래에 테마를 거느린 묶음"
                  >
                    묶음 {childCount}
                  </FactionTableBadge>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-normal text-text-secondary group-hover:text-accent">
                  {theme.description || theme.name_en || ''}
                </span>
              </span>
            </FactionTableCell>

            <FactionTableCell align="right">
              <FactionTableCount value={theme.celeb_count ?? 0} icon={<Users className="h-3.5 w-3.5" />} title="소속 인물" />
            </FactionTableCell>

            <FactionTableCell align="center">
              <span title={theme.is_featured ? '도감에 노출' : '도감에 숨김'}>
                <Sparkles
                  className={`mx-auto h-4 w-4 ${theme.is_featured ? 'text-accent' : 'text-text-secondary opacity-30'}`}
                />
              </span>
            </FactionTableCell>

            <FactionTableCell align="right">
              <span className="flex items-center justify-end gap-3">
                <FactionTableCount value={theme.teamImageCount} icon={<ImageIcon className="h-3.5 w-3.5" />} title="단체 사진" />
                <FactionTableCount value={theme.soloImageCount} icon={<UserSquare2 className="h-3.5 w-3.5" />} title="인물 사진을 가진 인물 수" />
              </span>
            </FactionTableCell>

            <FactionTableCell>
              {theme.episodes.length === 0 ? (
                <FactionTableBadge icon={<FileText className="h-3 w-3" />}>글 전용</FactionTableBadge>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {theme.episodes.map(ep => (
                    <Link
                      key={ep.folder}
                      href={`/factions/${encodeURIComponent(ep.folder)}`}
                      title={`${ep.title} — 영상 편집기로`}
                      draggable={false}
                      className="flex items-center gap-1 whitespace-nowrap rounded bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/25"
                    >
                      <Video className="h-3 w-3" />{ep.folder}
                    </Link>
                  ))}
                </span>
              )}
            </FactionTableCell>

            <FactionTableCell align="center">
              <GripVertical className="mx-auto h-4 w-4 cursor-grab text-text-secondary" />
            </FactionTableCell>
          </FactionTableRow>
        ))}

        {/* 어느 테마에도 안 걸린 편 — 아이디어 단계이거나 아직 진열 대상이 아닌 것들 */}
        {looseEpisodes.length > 0 && (
          <>
            <FactionTableSection
              colSpan={COLUMNS.length}
              title={`미연결 영상 ${looseEpisodes.length}`}
              note="아직 어느 도감 테마에도 걸리지 않은 제작 편. 줄을 누르면 영상 편집기로 갑니다"
            />
            {looseEpisodes.map(ep => (
              <FactionTableRow
                key={ep.id}
                onOpen={() => router.push(`/factions/${encodeURIComponent(ep.folder)}`)}
              >
                <FactionTableCell>
                  <span className="flex min-w-0 items-center gap-2">
                    <Video className="ml-4 h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary group-hover:text-accent">
                        {ep.title.split('\n')[0]}
                      </span>
                      <span className="block truncate font-mono text-xs text-text-secondary">{ep.folder}</span>
                    </span>
                    <FactionTableBadge title="제작 진행 상태">
                      <span className={`h-1.5 w-1.5 rounded-full ${FACTION_STATUS_OPTIONS.find(o => o.value === ep.status)?.dot}`} />
                      {FACTION_STATUS_OPTIONS.find(o => o.value === ep.status)?.label}
                    </FactionTableBadge>
                  </span>
                </FactionTableCell>

                <FactionTableCell align="right">
                  <FactionTableCount value={ep.personCount} icon={<Users className="h-3.5 w-3.5" />} title="인물 수" />
                </FactionTableCell>

                <FactionTableCell align="center">
                  <span className="text-text-secondary opacity-40">—</span>
                </FactionTableCell>

                <FactionTableCell align="right">
                  <FactionTableCount value={ep.groupCount} icon={<Layers className="h-3.5 w-3.5" />} title="세력 수" />
                </FactionTableCell>

                <FactionTableCell>
                  {ep.registered ? (
                    <FactionTableBadge className="bg-accent/15 text-accent" title="렌더 편성에 들어 있음">
                      렌더 편성 {ep.sortOrder}
                    </FactionTableBadge>
                  ) : (
                    <span className="text-text-secondary opacity-40">—</span>
                  )}
                </FactionTableCell>

                <FactionTableCell align="center">
                  <span className="flex justify-center">
                    <FactionEpisodeActions folder={ep.folder} variant="menu" factionLocal={factionLocal} />
                  </span>
                </FactionTableCell>
              </FactionTableRow>
            ))}
          </>
        )}
      </FactionTable>

      {factionLocal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary px-4 py-3">
          <p className="text-xs text-text-secondary">
            편성 목록 파일을 다시 만듭니다. 렌더가 이 파일을 보고 어떤 편을 만들지 정합니다.
          </p>
          <button
            onClick={regenerate}
            disabled={pending}
            className="shrink-0 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-secondary hover:text-accent disabled:opacity-50"
          >
            편성 목록 다시 만들기
          </button>
        </div>
      )}

      {isThemeModalOpen && <ThemeFormModal tag={null} onClose={handleThemeCreated} />}
      {isEpisodeModalOpen && <EpisodeFormModal onClose={handleEpisodeCreated} />}
    </div>
  )
}
