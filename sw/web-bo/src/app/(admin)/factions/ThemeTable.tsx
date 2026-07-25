'use client'

/**
 * 도감 테마 표 — 한 줄이 서비스 세력도감에 진열되는 테마 하나다.
 *
 * 영상으로 나간 편만 보이던 예전 목록과 달리 여기에는 글만으로 성립하는 테마도 전부 나온다.
 * 줄을 누르면 그 테마의 편집 화면으로 넘어가고, 붙잡아 끌면 진열 순서가 바뀐다.
 *
 * 위계: 아래에 테마를 거느린 테마가 묶음 머리로 뜨고(굵게·바탕 살짝 다르게) 그 소속 테마가
 * 한 칸 들여쓰기로 따라붙는다. 묶음 관계 자체는 각 테마의 편집 화면에서 정한다.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical, Plus, Sparkles, Users, Image as ImageIcon, UserSquare2, Video, FileText, Layers } from 'lucide-react'
import { type CelebTag, updateTagOrder } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty,
  FactionTableBadge, FactionTableCount, type FactionTableColumn,
} from '@/components/factions/FactionTable'
import ThemeFormModal from './ThemeFormModal'

const COLUMNS: FactionTableColumn[] = [
  { key: 'name', header: '테마' },
  { key: 'celebs', header: '인물', width: '4.5rem', align: 'right' },
  { key: 'featured', header: '도감 노출', width: '6.5rem', align: 'center' },
  { key: 'images', header: '단체샷 / 개인샷', width: '9rem', align: 'right' },
  { key: 'episodes', header: '연결 영상 편', width: '14rem' },
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

export default function ThemeTable({ initialThemes }: { initialThemes: FactionThemeSummary[] }) {
  const router = useRouter()
  const [themes, setThemes] = useState(initialThemes)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const rows = useMemo(() => toRows(themes), [themes])
  const groupCount = rows.filter(r => r.childCount > 0).length

  // #region 새 테마
  const handleCreateClose = (newTag?: CelebTag) => {
    setIsCreateOpen(false)
    // 만든 즉시 편집 화면으로 — 인물·사진은 거기서 채운다
    if (newTag) router.push(`/factions/themes/${newTag.id}`)
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

  return (
    <section className="space-y-4">
      {/* 머리 — 정체 한 줄 + 새 테마 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">도감 테마</h2>
          <p className="mt-1 text-sm text-text-secondary">
            서비스 세력도감에 진열되는 테마(인물 배정·소개문·화보). 테마 {themes.length}개
            {groupCount > 0 ? `, 그중 묶음 ${groupCount}개` : ''}. 영상으로 나가지 않아도 글과 사진만으로 실립니다.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 테마 만들기
        </button>
      </div>

      <FactionTable columns={COLUMNS}>
        {rows.length === 0 && (
          <FactionTableEmpty colSpan={COLUMNS.length}>아직 테마가 없습니다.</FactionTableEmpty>
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
                      title={ep.title}
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
      </FactionTable>

      {isCreateOpen && <ThemeFormModal tag={null} onClose={handleCreateClose} />}
    </section>
  )
}
