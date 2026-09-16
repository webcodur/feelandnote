'use client'

/** 세력도감 테마 편집 화면 — 머리(돌아가기·테마 이름)와 설정 한 벌 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ThemeEditorData } from '@/actions/admin/factions/themes'
import { ThemeAtlasSettings } from './ThemeAtlasSettings'

export function ThemeEditor({ data }: { data: ThemeEditorData }) {
  const { tag } = data

  useEffect(() => {
    document.title = `${tag.name} — 세력도감`
  }, [tag.name])

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
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
        >
          {tag.name}
        </span>
        {tag.name_en && <span className="text-sm text-text-tertiary">{tag.name_en}</span>}
      </div>

      <ThemeAtlasSettings key={tag.id} data={data} />
    </div>
  )
}
