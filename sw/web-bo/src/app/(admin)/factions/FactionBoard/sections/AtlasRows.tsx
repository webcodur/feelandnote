'use client'

/**
 * 세력도감 목록의 테마 한 줄 — 누르면 테마 편집 화면(`/factions/<테마 id>`)으로 간다.
 */

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, EyeOff, Layers3, Loader2, Sparkles, Users, Image as ImageIcon, UserSquare2,
} from 'lucide-react'
import { updateTag } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import { useToast } from '@/contexts/ToastContext'
import { BoardTableCell, BoardTableCount, BoardTableRow } from '@/components/ui/BoardTable'
import InlineThemeName from './InlineThemeName'

export const OPEN_BUTTON = 'pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent'

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
})

export function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

/** 켜고 끄는 축. 세력도감 노출과 신화 공개는 서로 다른 축이라 한 화면에 둘 다 선다 */
const TOGGLE_AXES = {
  is_featured: { long: '웹 활성', off: '웹 비공개', short: '활성', shortOff: '비공개', noun: '웹 활성 상태' },
  atlas_published: { long: '신화 공개', off: '신화 잠금', short: '공개', shortOff: '잠금', noun: '신화 공개 상태' },
} as const

export function ThemeActiveToggle({
  themeId,
  themeName,
  initialActive,
  compact = false,
  axis = 'is_featured',
}: {
  themeId: string
  themeName: string
  initialActive: boolean
  compact?: boolean
  axis?: keyof typeof TOGGLE_AXES
}) {
  const label = TOGGLE_AXES[axis]
  const router = useRouter()
  const { showToast } = useToast()
  const [active, setActive] = useState(initialActive)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setActive(initialActive)
  }, [initialActive])

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const previous = active
    const next = !previous
    setActive(next)

    startTransition(async () => {
      try {
        const result = await updateTag({ id: themeId, [axis]: next })
        if (!result.success) {
          setActive(previous)
          showToast('error', result.error ?? `${label.noun}를 저장하지 못했습니다.`)
          return
        }

        showToast('success', `${themeName} · ${next ? label.long : label.off}으로 바꿨습니다.`)
        router.refresh()
      } catch (error) {
        setActive(previous)
        showToast('error', `${label.noun} 저장 실패: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${themeName} ${active ? `${label.off}으로 변경` : label.long}`}
      title={`${themeName} · ${active ? `${label.long} — 누르면 ${label.off}` : `${label.off} — 누르면 ${label.long}`}`}
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'bg-accent/15 text-accent hover:bg-amber-500/15 hover:text-amber-300'
          : 'bg-amber-500/10 text-amber-400 hover:bg-accent/15 hover:text-accent'
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Sparkles className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {compact ? (active ? label.short : label.shortOff) : (active ? label.long : label.off)}
    </button>
  )
}

/** 테마 편집 주소 — 진입점이 id 를 해석한다 */
export function themeEditPath(theme: Pick<FactionThemeSummary, 'id'>): string {
  return `/factions/${theme.id}`
}

export function ThemeAtlasRow({ theme }: { theme: FactionThemeSummary }) {
  const router = useRouter()
  const editPath = themeEditPath(theme)

  return (
    <BoardTableRow onOpen={() => router.push(editPath)}>
      <BoardTableCell isFirst>
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-md p-2" style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
            <Layers3 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <InlineThemeName
              key={`${theme.id}:${theme.name}`}
              themeId={theme.id}
              name={theme.name}
              className="group-hover:text-accent"
            />
            <span className="mt-0.5 block truncate text-xs text-text-secondary">
              {theme.description || theme.name_en || (theme.slug ? `/explore/faction/${theme.slug}` : '설명 없음')}
            </span>
          </span>
        </span>
      </BoardTableCell>

      <BoardTableCell align="center">
        <BoardTableCount
          value={theme.celeb_count ?? 0}
          icon={<Users className="h-4 w-4" />}
          title="소속 인물 수"
        />
      </BoardTableCell>

      <BoardTableCell>
        <span className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-text-tertiary">사진 소재</span>
          <span className="inline-flex items-center gap-4">
            <BoardTableCount
              value={theme.teamImageCount}
              icon={<ImageIcon className="h-4 w-4" />}
              title="단체샷 장수"
            />
            <BoardTableCount
              value={theme.soloImageCount}
              icon={<UserSquare2 className="h-4 w-4" />}
              title="개인샷을 가진 인물 수"
            />
          </span>
        </span>
      </BoardTableCell>

      <BoardTableCell>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ThemeActiveToggle
            themeId={theme.id}
            themeName={theme.name}
            initialActive={theme.is_featured}
            compact
          />
          {/* 신화 갈래만 신화의 세계 공개 축을 함께 다룬다 */}
          {theme.is_fiction && (
            <ThemeActiveToggle
              themeId={theme.id}
              themeName={theme.name}
              initialActive={theme.atlas_published}
              axis="atlas_published"
              compact
            />
          )}
        </span>
      </BoardTableCell>

      <BoardTableCell align="center">
        <span className="text-sm tabular-nums text-text-secondary" title={theme.updated_at}>
          {formatUpdatedAt(theme.updated_at)}
        </span>
      </BoardTableCell>

      <BoardTableCell align="center">
        <Link href={editPath} title={`${theme.name} 테마 화면으로`} className={OPEN_BUTTON}>
          편집
          <ArrowRight className="h-4 w-4" />
        </Link>
      </BoardTableCell>
    </BoardTableRow>
  )
}
