'use client'

import { X, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const SORT_LABELS: Record<string, string> = {
  avatar_url: '이미지',
  title: '수식어',
  nickname: '닉네임',
  profession: '직군',
  nationality: '국적',
  gender: '성별',
  status: '상태',
  influence_total: '영향력',
  celeb_tier: '티어',
  content_count: '콘텐츠',
  follower_count: '팔로워',
  created_at: '등록일',
}

export default function ActiveSortChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sort = searchParams.get('sort')
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // 기본 정렬(created_at desc)이면 칩 표시 안 함
  if (!sort || (sort === 'created_at' && sortOrder === 'desc')) return null

  const label = SORT_LABELS[sort] || sort
  const isAsc = sortOrder === 'asc'

  const handleRemove = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('sort')
    params.delete('sortOrder')
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary">정렬:</span>
      <button
        onClick={handleRemove}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
      >
        {isAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {label}
        <X className="w-3 h-3 ml-0.5" />
      </button>
    </div>
  )
}
