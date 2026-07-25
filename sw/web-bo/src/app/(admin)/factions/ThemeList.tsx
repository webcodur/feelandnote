'use client'

/**
 * 도감 테마 목록 — 줄 하나가 테마 하나다.
 *
 * 영상으로 나간 편만 보이던 예전 목록과 달리 여기에는 글만으로 성립하는 테마도 전부 나온다.
 * 줄을 누르면 그 테마의 편집 화면으로 넘어가고, 붙잡아 끌면 노출 순서가 바뀐다.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical, Plus, Sparkles, Users, Image as ImageIcon, UserSquare2, Video, FileText } from 'lucide-react'
import { type CelebTag, updateTagOrder } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import ThemeFormModal from './ThemeFormModal'

export default function ThemeList({ initialThemes }: { initialThemes: FactionThemeSummary[] }) {
  const router = useRouter()
  const [themes, setThemes] = useState(initialThemes)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // #region 새 테마
  const handleCreateClose = (newTag?: CelebTag) => {
    setIsCreateOpen(false)
    // 만든 즉시 편집 화면으로 — 인물·사진은 거기서 채운다
    if (newTag) router.push(`/factions/themes/${newTag.id}`)
  }
  // #endregion

  // #region 순서 바꾸기
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...themes]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(index, 0, dragged)
    setThemes(next)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    await updateTagOrder(themes.map(t => t.id))
  }
  // #endregion

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">도감 테마</h2>
          <p className="mt-1 text-sm text-text-secondary">
            테마 {themes.length}개. 영상으로 나가지 않은 테마도 글과 사진만으로 도감에 실립니다.
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

        {themes.map((theme, index) => (
          <div
            key={theme.id}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3 hover:border-accent/60 ${
              draggedIndex === index ? 'opacity-50' : ''
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
