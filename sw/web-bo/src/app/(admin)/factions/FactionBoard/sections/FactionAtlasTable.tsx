'use client'

/**
 * 세력도감 테마 목록 — 서비스 도감과 같은 갈래(인공지능·권력과 전쟁·신화와 이야기 …)로 묶어
 * 접었다 폈다 한다. 갈래의 정본은 `celeb_tags.parent_id` 하나이고, 갈래 자체인 테마는
 * 제 줄 대신 묶음 머리로 올라선다. 어느 갈래에도 안 걸린 테마는 맨 아래 「분류 없음」에 모인다.
 */

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import {
  BoardTable,
  BoardTableEmpty,
  BoardTableSection,
  type BoardTableColumn,
} from '@/components/ui/BoardTable'
import FactionSearchField from '../FactionSearchField'
import { getFactionSearchTokens, matchesFactionSearch } from '../factionSearch'
import { OPEN_BUTTON, ThemeActiveToggle, ThemeAtlasRow, themeEditPath } from './AtlasRows'
import { buildAtlasSections, groupTagIds } from './atlasGrouping'
import InlineThemeName from './InlineThemeName'

const COLUMNS: BoardTableColumn[] = [
  { key: 'item', header: '테마', width: '16rem' },
  { key: 'members', header: '인물', width: '6rem', align: 'center' },
  { key: 'photos', header: '사진', width: '11rem' },
  { key: 'active', header: '활성화 여부', width: '9rem' },
  { key: 'updated', header: '수정', width: '6.5rem', align: 'center' },
  { key: 'open', header: '', width: '8rem', align: 'center' },
]

export default function FactionAtlasTable({
  themes,
  query,
  onQueryChange,
}: {
  themes: FactionThemeSummary[]
  query: string
  onQueryChange: (value: string) => void
}) {
  /** 펼친 상위분류 — 기본값을 비워 처음에는 모든 세력이 접혀 있게 한다 */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const groupIds = useMemo(() => groupTagIds(themes), [themes])
  /** 제 줄을 갖는 테마 — 상위분류 테마는 묶음 머리로 올라서므로 뺀다 */
  const rowThemes = useMemo(() => themes.filter(theme => !groupIds.has(theme.id)), [themes, groupIds])

  const searchTokens = useMemo(() => getFactionSearchTokens(query), [query])

  const visibleThemes = useMemo(
    () => rowThemes.filter(theme => matchesFactionSearch(searchTokens, [
      theme.name,
      theme.name_en,
      theme.description,
      theme.description_en,
      theme.slug,
    ])),
    [rowThemes, searchTokens],
  )

  const sections = useMemo(
    () => buildAtlasSections({ themes: visibleThemes, allThemes: themes }),
    [visibleThemes, themes],
  )

  /** 찾는 중에는 접힘을 무시한다 — 찾은 것이 접힌 묶음 안에 숨으면 못 찾은 것과 같다 */
  const searching = searchTokens.length > 0
  const allCollapsed = sections.length > 0 && sections.every(section => !expanded.has(section.key))

  const toggleSection = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setExpanded(allCollapsed ? new Set(sections.map(section => section.key)) : new Set())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggleAll}
          disabled={sections.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
          title="상위분류를 한꺼번에 접거나 폅니다"
        >
          {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
          {allCollapsed ? '모두 펼치기' : '모두 접기'}
        </button>

        <FactionSearchField
          value={query}
          onChange={onQueryChange}
          label="세력도감 검색"
          placeholder="테마 이름·설명·주소 검색"
          resultText={searching ? `${visibleThemes.length}/${rowThemes.length}건` : `${rowThemes.length}건`}
          className="w-full sm:w-[28rem]"
        />
      </div>

      <BoardTable columns={COLUMNS}>
        {visibleThemes.length === 0 ? (
          <BoardTableEmpty colSpan={COLUMNS.length}>
            조건에 맞는 테마가 없습니다.
          </BoardTableEmpty>
        ) : (
          sections.map(section => {
            const open = searching || expanded.has(section.key)
            const groupTheme = section.tagId ? themes.find(t => t.id === section.tagId) : undefined

            return (
              <Fragment key={section.key}>
                <BoardTableSection
                  colSpan={COLUMNS.length}
                  open={open}
                  onToggle={searching ? undefined : () => toggleSection(section.key)}
                  title={
                    <span className="flex items-center gap-2">
                      {section.color && (
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: section.color }}
                        />
                      )}
                      {groupTheme ? (
                        <InlineThemeName
                          key={`${groupTheme.id}:${groupTheme.name}`}
                          themeId={groupTheme.id}
                          name={groupTheme.name}
                          className="group-hover/section:text-accent"
                        />
                      ) : section.name}
                    </span>
                  }
                  note={`${section.themes.length}건`}
                  action={
                    groupTheme ? (
                      <span className="flex items-center gap-2">
                        <ThemeActiveToggle
                          themeId={groupTheme.id}
                          themeName={groupTheme.name}
                          initialActive={groupTheme.is_featured}
                        />
                        <Link
                          href={themeEditPath(groupTheme)}
                          title={`${groupTheme.name} 상위분류 화면으로`}
                          className={OPEN_BUTTON}
                        >
                          분류 편집
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">
                        상위분류가 없는 테마입니다
                      </span>
                    )
                  }
                />

                {open && section.themes.map(theme => (
                  <ThemeAtlasRow key={theme.id} theme={theme} />
                ))}
              </Fragment>
            )
          })
        )}
      </BoardTable>
    </div>
  )
}
