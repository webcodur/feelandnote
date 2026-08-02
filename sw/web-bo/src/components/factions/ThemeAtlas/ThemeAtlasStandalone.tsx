'use client'

/**
 * 웹 전용 테마 화면 — 영상 편이 없는 테마를 편 편집기와 같은 틀에서 연다.
 *
 * 주소는 편 편집기와 같은 자리다(`/factions/<테마 slug 또는 id>`). 편 폴더가 아니면
 * 라우트가 테마로 해석해 이 화면을 그린다. 영상 구획(대본·음성·편성)이 없을 뿐,
 * 도감 구획의 부품(ThemeAtlasSettings)은 편 편집기의 상세 설정과 동일하다.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, VideoOff } from 'lucide-react'
import type { ThemeEditorData } from '@/actions/admin/factions/themes'
import { ThemeAtlasSettings } from './ThemeAtlasSettings'

export function ThemeAtlasStandalone({ data }: { data: ThemeEditorData }) {
  const { tag } = data

  useEffect(() => {
    document.title = `${tag.name} — 세력도감`
  }, [tag.name])

  return (
    <div className="faction-ui space-y-6 pb-12">
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
        <span className="flex items-center gap-1 rounded bg-bg-card px-2 py-1 text-xs text-text-secondary" title="이 테마는 영상 제작 없이 글과 사진만으로 도감에 실립니다">
          <VideoOff className="h-3.5 w-3.5" />영상 없음 — 웹 전용 테마
        </span>
      </div>

      <ThemeAtlasSettings tagId={tag.id} variant="standalone" initialData={data} />
    </div>
  )
}
