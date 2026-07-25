'use client'

/**
 * 도감 테마 목록 — 줄 하나가 테마 하나다.
 *
 * 영상으로 나간 편만 보이던 예전 목록과 달리 여기에는 글만으로 성립하는 테마도 전부 나온다.
 * 줄을 누르면 그 테마의 편집 화면으로 넘어가고, 붙잡아 끌면 노출 순서가 바뀐다.
 *
 * 위계: 아래에 테마를 거느린 테마가 묶음 머리로 뜨고 그 소속 테마가 한 칸 들여쓰기로 따라붙는다.
 * 어디에도 속하지 않은 테마는 예전처럼 한 줄로 나온다. 묶음 관계는 각 테마의 편집 화면에서 정한다.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical, Plus, Sparkles, Users, Image as ImageIcon, UserSquare2, Video, FileText, Layers } from 'lucide-react'
import { type CelebTag, updateTagOrder } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import ThemeFormModal from './ThemeFormModal'

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

export default function ThemeList({ initialThemes }: { initialThemes: FactionThemeSummary[] }) {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">도감 테마</h2>
          <p className="mt-1 text-sm text-text-secondary">
            테마 {themes.length}개{groupCount > 0 ? `, 그중 묶음 ${groupCount}개` : ''}. 영상으로 나가지 않은 테마도 글과 사진만으로 도감에 실립니다.
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

      <div className="space-y-2">
        {themes.length === 0 && (
          <p className="rounded-xl border border-border bg-bg-secondary py-12 text-center text-sm text-text-secondary">
            아직 테마가 없습니다.
          </p>
        )}

        {rows.map(({ theme, isChild, childCount }) => (
          <div
            key={theme.id}
            draggable
            onDragStart={() => setDraggedId(theme.id)}
            onDragOver={e => handleDragOver(e, theme.id)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 rounded-xl border bg-bg-secondary p-3 hover:border-accent/60 ${
              draggedId === theme.id ? 'opacity-50' : ''
            } ${
              isChild
                ? 'ml-8 border-border/60 border-l-2 border-l-accent/40'
                : childCount > 0
                  ? 'border-accent/40'
                  : 'border-border'
            }`}
          >
            <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-text-secondary" />

            {/* 줄 전체를 끌어서 순서를 바꾸므로 링크 자체는 끌리지 않게 막는다(주소가 끌려간다) */}
            <Link
              href={`/factions/themes/${theme.id}`}
              draggable={false}
              className="group flex min-w-0 flex-1 items-center gap-3"
            >
              <span
                className="inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
              >
                {theme.name}
              </span>
              {childCount > 0 && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent"
                  title="아래에 테마를 거느린 묶음"
                >
                  <Layers className="h-3 w-3" />묶음 {childCount}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-text-secondary group-hover:text-accent">
                {theme.description || theme.name_en || ''}
              </span>
            </Link>

            {/* 영상 연결 — 없으면 글 전용 */}
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              {theme.episodes.length === 0 ? (
                <span className="flex items-center gap-1 rounded bg-bg-card px-2 py-0.5 text-[11px] text-text-secondary">
                  <FileText className="h-3 w-3" />글 전용
                </span>
              ) : (
                theme.episodes.map(ep => (
                  <Link
                    key={ep.folder}
                    href={`/factions/${encodeURIComponent(ep.folder)}`}
                    title={ep.title}
                    draggable={false}
                    className="flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/25"
                  >
                    <Video className="h-3 w-3" />{ep.folder}
                  </Link>
                ))
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1" title="소속 인물">
                <Users className="h-3.5 w-3.5" />{theme.celeb_count ?? 0}
              </span>
              <span
                className={`flex items-center gap-1 ${theme.teamImageCount === 0 ? 'opacity-40' : ''}`}
                title="단체 사진"
              >
                <ImageIcon className="h-3.5 w-3.5" />{theme.teamImageCount}
              </span>
              <span
                className={`flex items-center gap-1 ${theme.soloImageCount === 0 ? 'opacity-40' : ''}`}
                title="인물 사진을 가진 인물 수"
              >
                <UserSquare2 className="h-3.5 w-3.5" />{theme.soloImageCount}
              </span>
              <span title={theme.is_featured ? '도감에 노출' : '도감에 숨김'}>
                <Sparkles
                  className={`h-4 w-4 ${theme.is_featured ? 'text-accent' : 'text-text-secondary opacity-30'}`}
                />
              </span>
            </div>
          </div>
        ))}
      </div>

      {isCreateOpen && <ThemeFormModal tag={null} onClose={handleCreateClose} />}
    </div>
  )
}
