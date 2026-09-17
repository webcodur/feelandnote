'use client'

/**
 * 세력도감 목록 — 서비스 도감과 같은 분류(인공지능·권력과 전쟁·한국 …)로 묶어
 * 접었다 폈다 한다. 분류(L1)는 제 줄 대신 묶음 머리로 올라서고, 세력 카드(L2)가 줄을 갖는다.
 */

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import type { FactionEntrySummary } from '@/actions/admin/factions/board'
import {
  BoardTable,
  BoardTableEmpty,
  BoardTableSection,
  type BoardTableColumn,
} from '@/components/ui/BoardTable'
import FactionSearchField from '../FactionSearchField'
import { getFactionSearchTokens, matchesFactionSearch } from '../factionSearch'
import { OPEN_BUTTON, FactionActiveToggle, FactionEntryRow, entryEditPath } from './EntryRows'
import { buildFactionSections } from './grouping'
import InlineEntryName from './InlineEntryName'

const COLUMNS: BoardTableColumn[] = [
  { key: 'item', header: '세력', width: '16rem' },
  { key: 'members', header: '인물', width: '6rem', align: 'center' },
  { key: 'photos', header: '사진', width: '11rem' },
  { key: 'active', header: '활성화 여부', width: '9rem' },
  { key: 'updated', header: '수정', width: '6.5rem', align: 'center' },
  { key: 'open', header: '', width: '8rem', align: 'center' },
]

export default function FactionTable({
  entries,
  query,
  onQueryChange,
}: {
  entries: FactionEntrySummary[]
  query: string
  onQueryChange: (value: string) => void
}) {
  /** 펼친 분류 — 기본값을 비워 처음에는 모든 세력이 접혀 있게 한다 */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  /** 제 줄을 갖는 세력 — 분류(L1)는 묶음 머리로 올라서므로 뺀다 */
  const rowEntries = useMemo(() => entries.filter(entry => entry.level === 2), [entries])

  const searchTokens = useMemo(() => getFactionSearchTokens(query), [query])

  const visibleEntries = useMemo(
    () => rowEntries.filter(entry => matchesFactionSearch(searchTokens, [
      entry.name,
      entry.name_en,
      entry.description,
      entry.description_en,
      entry.slug,
    ])),
    [rowEntries, searchTokens],
  )

  const sections = useMemo(
    () => buildFactionSections({ entries: visibleEntries, allEntries: entries }),
    [visibleEntries, entries],
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
          title="분류를 한꺼번에 접거나 폅니다"
        >
          {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
          {allCollapsed ? '모두 펼치기' : '모두 접기'}
        </button>

        <FactionSearchField
          value={query}
          onChange={onQueryChange}
          label="세력도감 검색"
          placeholder="세력 이름·설명·주소 검색"
          resultText={searching ? `${visibleEntries.length}/${rowEntries.length}건` : `${rowEntries.length}건`}
          className="w-full sm:w-[28rem]"
        />
      </div>

      <BoardTable columns={COLUMNS}>
        {visibleEntries.length === 0 ? (
          <BoardTableEmpty colSpan={COLUMNS.length}>
            조건에 맞는 세력이 없습니다.
          </BoardTableEmpty>
        ) : (
          sections.map(section => {
            const open = searching || expanded.has(section.key)
            const head = section.lv1Id ? entries.find(e => e.id === section.lv1Id) : undefined

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
                      {head ? (
                        <InlineEntryName
                          key={`${head.id}:${head.name}`}
                          entryId={head.id}
                          name={head.name}
                          className="group-hover/section:text-accent"
                        />
                      ) : section.name}
                    </span>
                  }
                  note={`${section.entries.length}건`}
                  action={
                    head ? (
                      <span className="flex items-center gap-2">
                        <FactionActiveToggle
                          entryId={head.id}
                          entryName={head.name}
                          initialActive={head.is_featured}
                        />
                        <Link
                          href={entryEditPath(head)}
                          title={`${head.name} 분류 화면으로`}
                          className={OPEN_BUTTON}
                        >
                          분류 편집
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">
                        분류가 없는 세력입니다
                      </span>
                    )
                  }
                />

                {open && section.entries.map(entry => (
                  <FactionEntryRow key={entry.id} entry={entry} />
                ))}
              </Fragment>
            )
          })
        )}
      </BoardTable>
    </div>
  )
}
