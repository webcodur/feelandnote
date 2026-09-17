'use client'

/** 세력도감 관리 화면 껍데기 — 세력 목록 하나와 새 도감 행 만들기 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { FactionEntry } from '@/actions/admin/factions/entries'
import type { FactionEntrySummary, Lv1Option } from '@/actions/admin/factions/board'
import FactionFormModal from './FactionFormModal'
import FactionTable from './FactionBoard/sections/FactionTable'

export default function FactionBoard({ entries }: { entries: FactionEntrySummary[] }) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [query, setQuery] = useState('')

  const lv1Options = useMemo<Lv1Option[]>(() => {
    const childCounts = new Map<string, number>()
    for (const e of entries) {
      if (e.lv1_id) childCounts.set(e.lv1_id, (childCounts.get(e.lv1_id) ?? 0) + 1)
    }
    return entries
      .filter(e => e.level === 1)
      .map(e => ({ id: e.id, name: e.name, color: e.color, childCount: childCounts.get(e.id) ?? 0, is_myth: e.is_myth }))
  }, [entries])

  const handleCreated = (newEntry?: FactionEntry) => {
    setIsFormOpen(false)
    if (newEntry) router.push(`/factions/${newEntry.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 도감 행
        </button>
      </div>

      <section aria-label="세력도감 목록">
        <FactionTable entries={entries} query={query} onQueryChange={setQuery} />
      </section>

      {isFormOpen && <FactionFormModal entry={null} lv1Options={lv1Options} onClose={handleCreated} />}
    </div>
  )
}
