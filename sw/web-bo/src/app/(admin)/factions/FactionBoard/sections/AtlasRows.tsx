'use client'

/**
 * 세력도감 통합 목록의 한 줄 두 종류 — 영상 편과 웹 전용 테마.
 *
 * 한 줄 = 편집 화면 하나다. 영상 편은 편 편집기로, 영상 없는 웹 전용 테마는 같은 자리의
 * 테마 화면(`/factions/<테마>`)으로 이어진다. 제작 편에 연결된 테마는 따로 줄을 갖지 않고
 * 그 편 줄의 표시로만 보인다 — 편집의 집이 편 편집기 하나이기 때문이다.
 */

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, EyeOff, Layers, Layers3, ListVideo, Loader2, Sparkles, Users, Video, VideoOff,
  Image as ImageIcon, UserSquare2,
} from 'lucide-react'
import { updateTag } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import { useToast } from '@/contexts/ToastContext'
import FactionEpisodeActions from '@/components/factions/FactionEpisodeActions'
import {
  FactionTableBadge, FactionTableCell, FactionTableCount, FactionTableRow,
} from '@/components/factions/FactionTable'
import { folderToParam } from '@/lib/faction-edit-route'
import type { AtlasThemeLink } from './atlasGrouping'
import InlineEpisodeTitle from './InlineEpisodeTitle'
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

export function ThemeActiveToggle({
  themeId,
  themeName,
  initialActive,
  compact = false,
}: {
  themeId: string
  themeName: string
  initialActive: boolean
  compact?: boolean
}) {
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
        const result = await updateTag({ id: themeId, is_featured: next })
        if (!result.success) {
          setActive(previous)
          showToast('error', result.error ?? '웹 활성 상태를 저장하지 못했습니다.')
          return
        }

        showToast('success', `${themeName} 웹 ${next ? '활성' : '비공개'}으로 변경했습니다.`)
        router.refresh()
      } catch (error) {
        setActive(previous)
        showToast('error', `웹 활성 상태 저장 실패: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${themeName} 웹 ${active ? '비공개로 변경' : '활성화'}`}
      title={`${themeName} · ${active ? '웹 활성 — 클릭하면 비공개' : '웹 비공개 — 클릭하면 활성'}`}
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'bg-accent/15 text-accent hover:bg-amber-500/15 hover:text-amber-300'
          : 'bg-amber-500/10 text-amber-400 hover:bg-accent/15 hover:text-accent'
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Sparkles className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {compact ? (active ? '활성' : '비공개') : (active ? '웹 활성' : '웹 비공개')}
    </button>
  )
}

/** 웹 전용 테마의 편집 주소 — 통합 진입점이 id 를 해석한다(slug 는 편 폴더와 겹칠 수 있어 id 로 간다) */
export function themeEditPath(theme: Pick<FactionThemeSummary, 'id'>): string {
  return `/factions/${theme.id}`
}

export function EpisodeAtlasRow({
  episode,
  linkedThemes,
  factionLocal,
}: {
  episode: FactionEpisodeSummary
  linkedThemes: AtlasThemeLink[]
  factionLocal: boolean
}) {
  const router = useRouter()
  const editPath = `/factions/${folderToParam(episode.folder)}`

  return (
    <FactionTableRow onOpen={() => router.push(editPath)}>
      <FactionTableCell isFirst>
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-md bg-accent/10 p-2 text-accent">
            <Video className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <InlineEpisodeTitle
              key={`${episode.id}:${episode.title}`}
              folder={episode.folder}
              title={episode.title}
            />
            <span className="mt-0.5 block truncate font-mono text-xs text-text-secondary">
              {episode.folder}
            </span>
          </span>
        </span>
      </FactionTableCell>

      <FactionTableCell>
        {episode.registered ? (
          <FactionTableBadge
            className="bg-accent/15 text-accent"
            icon={<ListVideo className="h-3.5 w-3.5" />}
            title="렌더·음성·출간 대상"
          >
            편성 {episode.sortOrder}
          </FactionTableBadge>
        ) : (
          <FactionTableBadge title="렌더 편성에서 제외됨">미편성</FactionTableBadge>
        )}
      </FactionTableCell>

      <FactionTableCell>
        <span className="flex min-w-0 flex-col items-start gap-1">
          <FactionTableBadge
            className={episode.status === 'ready'
              ? 'bg-green-500/10 text-green-400'
              : 'bg-amber-500/10 text-amber-400'}
            title="영상 제작 진척도가 아니라 도감 테마로 옮길 수 있는지 나타냅니다"
          >
            {episode.status === 'ready' ? '이관 가능' : '이관 보류'}
          </FactionTableBadge>
          {episode.blockNote && (
            <span
              title={episode.blockNote}
              className="block max-w-40 truncate text-xs text-amber-400/80"
            >
              {episode.blockNote}
            </span>
          )}
        </span>
      </FactionTableCell>

      <FactionTableCell align="center">
        <span className="inline-flex items-center gap-4">
          <FactionTableCount
            value={episode.groupCount}
            icon={<Layers className="h-4 w-4" />}
            title="세력 수"
          />
          <FactionTableCount
            value={episode.personCount}
            icon={<Users className="h-4 w-4" />}
            title="인물 수"
          />
        </span>
      </FactionTableCell>

      <FactionTableCell>
        {linkedThemes.length === 0 ? (
          <span className="text-sm text-amber-400">미연결</span>
        ) : (
          <span className="flex flex-col items-start gap-1.5">
            {linkedThemes.map(theme => (
              <span
                key={`${theme.id}:${theme.name}`}
                className="inline-flex items-center gap-2 text-sm text-text-primary"
                title={`${theme.name} — 이 편의 편집기 도감 구획에서 편집합니다`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: theme.color }}
                />
                <InlineThemeName
                  themeId={theme.id}
                  name={theme.name}
                  className="text-sm text-text-primary"
                />
              </span>
            ))}
          </span>
        )}
      </FactionTableCell>

      <FactionTableCell>
        {linkedThemes.length === 0 ? (
          <span className="text-sm text-text-tertiary">—</span>
        ) : (
          <span className="flex flex-col items-start gap-1">
            {linkedThemes.map(theme => (
              <ThemeActiveToggle
                key={theme.id}
                themeId={theme.id}
                themeName={theme.name}
                initialActive={theme.isFeatured}
                compact
              />
            ))}
          </span>
        )}
      </FactionTableCell>

      <FactionTableCell align="center">
        <span className="text-sm tabular-nums text-text-secondary" title={episode.updatedAt}>
          {formatUpdatedAt(episode.updatedAt)}
        </span>
      </FactionTableCell>

      <FactionTableCell align="center">
        <span className="flex items-center justify-center gap-1">
          <Link
            href={editPath}
            title={`${episode.title.split('\n')[0]} 영상 편집기로`}
            className={OPEN_BUTTON}
          >
            편집
            <ArrowRight className="h-4 w-4" />
          </Link>
          <FactionEpisodeActions
            folder={episode.folder}
            variant="menu"
            factionLocal={factionLocal}
          />
        </span>
      </FactionTableCell>
    </FactionTableRow>
  )
}

export function ThemeAtlasRow({ theme }: { theme: FactionThemeSummary }) {
  const router = useRouter()
  const editPath = themeEditPath(theme)

  return (
    <FactionTableRow onOpen={() => router.push(editPath)}>
      <FactionTableCell isFirst>
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
      </FactionTableCell>

      <FactionTableCell>
        <FactionTableBadge
          icon={<VideoOff className="h-3.5 w-3.5" />}
          title="영상 제작 없이 글과 사진만으로 도감에 실리는 테마"
        >
          영상 없음
        </FactionTableBadge>
      </FactionTableCell>

      <FactionTableCell>
        <FactionTableBadge
          icon={<Layers3 className="h-3.5 w-3.5" />}
          title="영상 없이 웹 도감에서 관리하는 테마"
        >
          웹 전용
        </FactionTableBadge>
      </FactionTableCell>

      <FactionTableCell align="center">
        <FactionTableCount
          value={theme.celeb_count ?? 0}
          icon={<Users className="h-4 w-4" />}
          title="소속 인물 수"
        />
      </FactionTableCell>

      <FactionTableCell>
        <span className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-text-tertiary">사진 소재</span>
          <span className="inline-flex items-center gap-4">
          <FactionTableCount
            value={theme.teamImageCount}
            icon={<ImageIcon className="h-4 w-4" />}
            title="단체샷 장수"
          />
          <FactionTableCount
            value={theme.soloImageCount}
            icon={<UserSquare2 className="h-4 w-4" />}
            title="개인샷을 가진 인물 수"
          />
          </span>
        </span>
      </FactionTableCell>

      <FactionTableCell>
        <ThemeActiveToggle
          themeId={theme.id}
          themeName={theme.name}
          initialActive={theme.is_featured}
          compact
        />
      </FactionTableCell>

      <FactionTableCell align="center">
        <span className="text-sm tabular-nums text-text-secondary" title={theme.updated_at}>
          {formatUpdatedAt(theme.updated_at)}
        </span>
      </FactionTableCell>

      <FactionTableCell align="center">
        <Link href={editPath} title={`${theme.name} 테마 화면으로`} className={OPEN_BUTTON}>
          편집
          <ArrowRight className="h-4 w-4" />
        </Link>
      </FactionTableCell>
    </FactionTableRow>
  )
}
