'use client'

/** 세력도감 관리 화면 껍데기 — 테마 목록 하나와 새 테마 만들기 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { CelebTag } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import ThemeFormModal from './ThemeFormModal'
import FactionAtlasTable from './FactionBoard/sections/FactionAtlasTable'

export default function FactionBoard({ themes }: { themes: FactionThemeSummary[] }) {
  const router = useRouter()
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleThemeCreated = (newTag?: CelebTag) => {
    setIsThemeModalOpen(false)
    if (newTag) router.push(`/factions/${newTag.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsThemeModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 테마
        </button>
      </div>

      <section aria-label="세력도감 테마 목록">
        <FactionAtlasTable themes={themes} query={query} onQueryChange={setQuery} />
      </section>

      {isThemeModalOpen && <ThemeFormModal tag={null} onClose={handleThemeCreated} />}
    </div>
  )
}
