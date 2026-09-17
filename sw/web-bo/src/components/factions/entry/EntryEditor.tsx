'use client'

/** 도감 행 편집 화면 — 머리(돌아가기·이름)와 설정 한 벌 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { FactionEditorData } from '@/actions/admin/factions/board'
import { EntrySettings } from './EntrySettings'

export function EntryEditor({ data }: { data: FactionEditorData }) {
  const { entry } = data

  useEffect(() => {
    document.title = `${entry.name} — 세력도감`
  }, [entry.name])

  return (
    <div className="remotion-ui space-y-6 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/factions"
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span
          className="inline-flex items-center rounded-full px-3 py-1.5 text-base font-medium"
          style={{ backgroundColor: `${entry.color}20`, color: entry.color }}
        >
          {entry.name}
        </span>
        {entry.name_en && <span className="text-sm text-text-tertiary">{entry.name_en}</span>}
        <span className="text-xs text-text-tertiary">{entry.level === 1 ? '분류' : '세력'}</span>
      </div>

      <EntrySettings key={entry.id} data={data} />
    </div>
  )
}
