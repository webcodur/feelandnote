'use client'

/**
 * 도감 테마 기준 목록.
 *
 * 기준은 도감 테마다. 한 줄이 서비스 세력도감에 진열되는 테마 하나이고, 그 테마가 어느 영상 편에
 * 쓰였는지는 「영상」 칸의 배지로 붙는다(한 테마가 여러 편에 걸릴 수 있다). 배지를 누르면 그 편의
 * 편집기로 간다.
 *
 * 표 아래는 두 구획뿐이다 — 「옮길 수 있는 편」(인물이 인명부에 있어 바로 손댈 수 있다)과
 * 「못 옮기는 편」(출연진이 사람이 아니거나 등록 인물이 셋에 못 미친다). 예전에 있던
 * 「미연결 영상」·「아이디어 후보」·「접어둠」 세 구획은 26.07.27 에 이 둘로 합쳤다.
 *
 * 위계: 아래에 테마를 거느린 테마가 묶음 머리로 뜨고(굵게·바탕 살짝 다르게) 그 소속 테마가
 * 한 칸 들여쓰기로 따라붙는다. 묶음 관계 자체는 각 테마의 편집 화면에서 정한다.
 *
 * 묶음 머리는 처음에 접혀 있고, 줄을 누르면 소속 테마가 펼쳐진다. 예전에는 누르는 즉시
 * 그 테마의 편집 화면으로 넘어가 버려서 아래에 뭐가 달려 있는지 볼 방법이 없었다.
 * 편집 화면으로는 줄 오른쪽의 「편집」 단추로 간다 — 모든 줄이 같은 자리에 같은 단추를 갖는다.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Users, Image as ImageIcon, UserSquare2,
  Video, FileText, Layers, ChevronDown, ArrowRight,
} from 'lucide-react'
import { updateTagOrder } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import FactionEpisodeActions, { FACTION_STATUS_OPTIONS } from '@/components/factions/FactionEpisodeActions'
import {
  FactionTable, FactionTableRow, FactionTableCell, FactionTableEmpty, FactionTableSection,
  FactionTableBadge, FactionTableCount, type FactionTableColumn,
} from '@/components/factions/FactionTable'
import { folderToParam } from '@/lib/faction-edit-route'
import FactionSearchField from '../FactionSearchField'
import { getFactionSearchTokens, matchesFactionSearch } from '../factionSearch'

const COLUMNS: FactionTableColumn[] = [
  { key: 'name', header: '테마' },
  { key: 'celebs', header: '인물', width: '5.5rem', align: 'center' },
  { key: 'featured', header: '도감 노출', width: '7rem', align: 'center' },
  { key: 'images', header: '단체샷 / 개인샷', width: '10rem', align: 'center' },
  { key: 'episodes', header: '영상', width: '15rem' },
  { key: 'open', header: '', width: '7rem', align: 'center' },
]

/** 줄 오른쪽에 붙는 편집 단추 */
const OPEN_BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent'

/*
 * 여기 있던 보관함 분류 사전(미래 기술·글로벌 비즈니스 …)은 26.07.27 에 지웠다.
 * 그 분류는 작업하다 만든 폴더 서랍일 뿐이라 못 옮기는 이유를 뭉뚱그렸다.
 * 이제 편마다 이유 한 줄(`blockNote`)을 그대로 보인다.
 */

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

export default function FactionThemeTable({
  themes,
  episodes,
  factionLocal,
  onThemesChange,
  query,
  onQueryChange,
}: {
  themes: FactionThemeSummary[]
  episodes: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
  onThemesChange: (themes: FactionThemeSummary[]) => void
  query: string
  onQueryChange: (value: string) => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [blockedOpen, setBlockedOpen] = useState(false)
  /** 펼쳐 둔 묶음 머리. 비어 있으면 전부 접힌 상태다 */
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  /** 순서 저장은 접힘과 무관하게 전체를 넘겨야 하므로 온전한 목록을 따로 둔다 */
  const allRows = useMemo(() => toRows(themes), [themes])
  const searchTokens = useMemo(() => getFactionSearchTokens(query), [query])
  const isSearching = searchTokens.length > 0
  const episodesByFolder = useMemo(
    () => new Map(episodes.map(episode => [episode.folder, episode])),
    [episodes],
  )

  const matchingThemeIds = useMemo(() => {
    const result = new Set<string>()

    for (const { theme } of allRows) {
      if (matchesFactionSearch(searchTokens, [
        theme.name,
        theme.name_en,
        theme.description,
        theme.description_en,
        theme.slug,
        ...theme.episodes.flatMap(episode => {
          const summary = episodesByFolder.get(episode.folder)
          return [
            episode.title,
            episode.folder,
            summary?.titleEn,
            summary?.logline,
            summary?.blockNote,
          ]
        }),
      ])) {
        result.add(theme.id)
      }
    }

    return result
  }, [allRows, episodesByFolder, searchTokens])

  const searchContextParentIds = useMemo(() => {
    const result = new Set<string>()
    for (const { theme } of allRows) {
      if (matchingThemeIds.has(theme.id) && theme.parent_id) result.add(theme.parent_id)
    }
    return result
  }, [allRows, matchingThemeIds])

  /** 화면에 실제로 그릴 줄 — 접힌 묶음의 소속 테마는 뺀다 */
  const rows = useMemo(
    () => allRows.filter(row => {
      if (isSearching) {
        return matchingThemeIds.has(row.theme.id) || searchContextParentIds.has(row.theme.id)
      }
      return !row.isChild || openGroups.has(row.theme.parent_id ?? '')
    }),
    [allRows, isSearching, matchingThemeIds, openGroups, searchContextParentIds],
  )

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * 아직 테마에 안 걸렸지만 옮길 수 있는 편 — 인물이 인명부에 있어 바로 손댈 수 있다.
   * 표에서 가장 눈에 띄어야 하는 줄이라 펼친 채로 둔다.
   */
  const readyEpisodes = useMemo(() => {
    const linked = new Set<string>()
    for (const t of themes) for (const ep of t.episodes) linked.add(ep.folder)
    return episodes.filter(ep => ep.status === 'ready' && !linked.has(ep.folder))
  }, [themes, episodes])

  /**
   * 지금은 못 옮기는 편 — 출연진이 사람이 아니거나(로봇·로켓·기관) 등록된 인물이 셋에 못 미친다.
   * 지우지 않고 맨 아래로 내려 접어 둔다. 인물을 채우면 그대로 살아난다.
   */
  const blockedEpisodes = useMemo(
    // 인물이 많이 모인 편일수록 채우면 바로 살아나므로 앞에 세운다
    () => episodes
      .filter(ep => ep.status === 'blocked')
      .sort((a, b) => b.personCount - a.personCount),
    [episodes],
  )

  const visibleReadyEpisodes = useMemo(
    () => readyEpisodes.filter(episode => matchesFactionSearch(searchTokens, [
      episode.title,
      episode.titleEn,
      episode.folder,
      episode.logline,
      episode.blockNote,
    ])),
    [readyEpisodes, searchTokens],
  )

  const visibleBlockedEpisodes = useMemo(
    () => blockedEpisodes.filter(episode => matchesFactionSearch(searchTokens, [
      episode.title,
      episode.titleEn,
      episode.folder,
      episode.logline,
      episode.blockNote,
    ])),
    [blockedEpisodes, searchTokens],
  )

  const matchingEpisodeCount = visibleReadyEpisodes.length + visibleBlockedEpisodes.length
  const hasResults = rows.length > 0 || matchingEpisodeCount > 0

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
    onThemesChange(next)
  }

  const handleDragEnd = async () => {
    if (!draggedId) return
    setDraggedId(null)
    await updateTagOrder(toRows(themes).map(r => r.theme.id))
  }
  // #endregion

  /** 영상 편 한 줄 — 옮길 수 있는 편과 못 옮기는 편이 같은 모양을 쓴다 */
  const renderEpisodeRow = (ep: FactionEpisodeSummary) => (
    <FactionTableRow
      key={ep.id}
    >
      <FactionTableCell isFirst>
        <span className="flex min-w-0 items-center gap-2">
          <Video className="ml-4 h-4.5 w-4.5 shrink-0 text-text-secondary" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-text-primary">
              {ep.title.split('\n')[0]}
            </span>
            {/* 못 옮기는 편은 폴더 대신 그 이유를 보인다 — 열어 보지 않아도 알게 */}
            {ep.blockNote ? (
              <span className="block truncate text-sm text-amber-500/80" title={ep.blockNote}>
                {ep.blockNote}
              </span>
            ) : (
              <span className="block truncate font-mono text-sm text-text-secondary">{ep.folder}</span>
            )}
          </span>
          {!ep.blockNote && (
            <FactionTableBadge title="도감으로 옮길 수 있는지">
              <span className={`h-1.5 w-1.5 rounded-full ${FACTION_STATUS_OPTIONS.find(o => o.value === ep.status)?.dot}`} />
              {FACTION_STATUS_OPTIONS.find(o => o.value === ep.status)?.label}
            </FactionTableBadge>
          )}
        </span>
      </FactionTableCell>

      <FactionTableCell align="right">
        <FactionTableCount value={ep.personCount} icon={<Users className="h-4.5 w-4.5" />} title="인물 수" />
      </FactionTableCell>

      <FactionTableCell align="center">
        <span className="text-text-secondary opacity-40">—</span>
      </FactionTableCell>

      <FactionTableCell align="right">
        <FactionTableCount value={ep.groupCount} icon={<Layers className="h-4.5 w-4.5" />} title="세력 수" />
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
        <span className="flex items-center justify-center gap-1.5">
          <Link
            href={`/factions/${folderToParam(ep.folder)}`}
            title={`${ep.title.split('\n')[0]} 편집 화면으로`}
            className={OPEN_BUTTON}
          >
            편집
            <ArrowRight className="h-4 w-4" />
          </Link>
          <FactionEpisodeActions folder={ep.folder} variant="menu" factionLocal={factionLocal} />
        </span>
      </FactionTableCell>
    </FactionTableRow>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FactionSearchField
          value={query}
          onChange={onQueryChange}
          label="도감 테마 검색"
          placeholder="테마명·설명·연결 영상 검색"
          resultText={isSearching
            ? `테마 ${matchingThemeIds.size} · 영상 ${matchingEpisodeCount}`
            : `테마 ${themes.length}`}
          className="w-full sm:w-[30rem]"
        />
      </div>

      <FactionTable columns={COLUMNS}>
        {!hasResults && (
          <FactionTableEmpty colSpan={COLUMNS.length}>
            {isSearching ? '검색어와 일치하는 테마나 영상 편이 없습니다.' : '아직 아무것도 없습니다.'}
          </FactionTableEmpty>
        )}

        {rows.map(({ theme, isChild, childCount }) => (
          <FactionTableRow
            key={theme.id}
            tone={childCount > 0 ? 'group' : isChild ? 'child' : 'default'}
            dragging={draggedId === theme.id}
            draggable={!isSearching}
            onDragStart={() => {
              if (!isSearching) setDraggedId(theme.id)
            }}
            onDragOver={e => handleDragOver(e, theme.id)}
            onDragEnd={handleDragEnd}
            // 묶음 머리는 행 클릭으로 펼치고 접는다
            onOpen={childCount > 0 && !isSearching ? () => toggleGroup(theme.id) : undefined}
          >
            <FactionTableCell isFirst>
              <span className="flex min-w-0 items-center gap-2">
                {/* 소속 테마는 한 칸 들여쓰기만 한다 */}
                {isChild && <span className="w-4 shrink-0" />}
                {/* 묶음 머리에만 화살표 — 버튼으로 직접 펼치고 접는다 */}
                {!isChild && (
                  <>
                    {childCount > 0 && !isSearching && (
                      <button type="button" onClick={() => toggleGroup(theme.id)} className="shrink-0 p-0.5 hover:text-accent">
                        <ChevronDown className={`h-5 w-5 text-text-secondary ${openGroups.has(theme.id) ? '' : '-rotate-90'}`} />
                      </button>
                    )}
                    {childCount > 0 && isSearching && (
                      <span className="shrink-0 p-0.5">
                        <ChevronDown className="h-5 w-5 text-text-secondary" />
                      </span>
                    )}
                    {childCount === 0 && <span className="h-5 w-5 shrink-0" />}
                  </>
                )}
                {/* 테마 색 동그라미 */}
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: theme.color }} />
                {/* 이름 + 설명을 세로로 */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-text-primary">
                      {theme.name}
                    </span>
                    {childCount > 0 && (
                      <FactionTableBadge
                        className="bg-accent/15 text-accent"
                        icon={<Layers className="h-3.5 w-3.5" />}
                        title="아래에 테마를 거느린 묶음"
                      >
                        묶음 {childCount}
                      </FactionTableBadge>
                    )}
                  </span>
                  {(theme.description || theme.name_en) && (
                    <span className="block truncate text-sm text-text-primary/50 mt-0.5">
                      {theme.description || theme.name_en}
                    </span>
                  )}
                </span>
              </span>
            </FactionTableCell>

            <FactionTableCell align="right">
              <FactionTableCount value={theme.celeb_count ?? 0} icon={<Users className="h-4.5 w-4.5" />} title="소속 인물" />
            </FactionTableCell>

            <FactionTableCell align="center">
              <span title={theme.is_featured ? '도감에 노출' : '도감에 숨김'}>
                <Sparkles
                  className={`mx-auto h-5 w-5 ${theme.is_featured ? 'text-accent' : 'text-text-secondary opacity-30'}`}
                />
              </span>
            </FactionTableCell>

            <FactionTableCell align="right">
              <span className="flex items-center justify-end gap-3">
                <FactionTableCount value={theme.teamImageCount} icon={<ImageIcon className="h-4.5 w-4.5" />} title="단체 사진" />
                <FactionTableCount value={theme.soloImageCount} icon={<UserSquare2 className="h-4.5 w-4.5" />} title="인물 사진을 가진 인물 수" />
              </span>
            </FactionTableCell>

            <FactionTableCell>
              {theme.episodes.length === 0 ? (
                <FactionTableBadge icon={<FileText className="h-3.5 w-3.5" />}>글 전용</FactionTableBadge>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {theme.episodes.map(ep => (
                    <Link
                      key={ep.folder}
                      href={`/factions/${folderToParam(ep.folder)}`}
                      title={`${ep.title} — 영상 편집기로`}
                      draggable={false}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/25"
                    >
                      <Video className="h-3.5 w-3.5" />{ep.folder}
                    </Link>
                  ))}
                </span>
              )}
            </FactionTableCell>

            <FactionTableCell align="center">
              <Link
                href={`/factions/themes/${theme.id}`}
                draggable={false}
                title={`${theme.name} 편집 화면으로`}
                className={OPEN_BUTTON}
              >
                편집
                <ArrowRight className="h-4 w-4" />
              </Link>
            </FactionTableCell>
          </FactionTableRow>
        ))}

        {/* 옮길 수 있는데 아직 안 옮긴 편 — 다음에 손댈 자리라 펼친 채로 둔다 */}
        {visibleReadyEpisodes.length > 0 && (
          <>
            <FactionTableSection
              colSpan={COLUMNS.length}
              title={`옮길 수 있는 편 ${visibleReadyEpisodes.length}`}
              note="인물이 인명부에 있어 도감 테마로 바로 옮길 수 있습니다"
            />
            {visibleReadyEpisodes.map(renderEpisodeRow)}
          </>
        )}

        {/* 못 옮기는 편 — 맨 아래. 지운 게 아니라 내려 둔 것이라 인물만 채우면 살아난다 */}
        {visibleBlockedEpisodes.length > 0 && (
          <>
            <FactionTableSection
              colSpan={COLUMNS.length}
              title={`못 옮기는 편 ${visibleBlockedEpisodes.length}`}
              note={isSearching
                ? '검색어와 일치하는 이관 보류 편입니다'
                : blockedOpen
                ? '출연진이 사람이 아니거나 인명부에 등록된 인물이 셋에 못 미칩니다. 인물을 채우면 옮길 수 있습니다'
                : '눌러서 펼치기 — 인물이 모자라거나 출연진이 사람이 아닌 편'}
              open={isSearching || blockedOpen}
              onToggle={isSearching ? undefined : () => setBlockedOpen(v => !v)}
            />
            {(isSearching || blockedOpen) && visibleBlockedEpisodes.map(renderEpisodeRow)}
          </>
        )}
      </FactionTable>

    </div>
  )
}
