'use client'

import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import Button from '@/components/ui/Button'
import type { CelebImageFilter } from '@/actions/admin/celebs'

interface CelebFilterProps {
  action?: string
  showImageFilter?: boolean
  tags?: { id: string; name: string }[]
  defaultValues: {
    search: string
    status: string
    profession: string
    tier: string
    imageFilter: CelebImageFilter
    faction?: string
  }
}

export default function CelebFilter({ action = '/celebs', showImageFilter = false, tags = [], defaultValues }: CelebFilterProps) {
  const { search, status, profession, tier, imageFilter, faction = 'all' } = defaultValues

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
      <form action={action} className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
        <CelebSearchBar
          name="search"
          initialQuery={search}
          autoFocus
          className="flex-1 min-w-0 sm:min-w-[220px]"
        />

        <div className={`grid gap-2 sm:flex sm:flex-wrap md:gap-3 ${showImageFilter ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <select
            name="faction"
            defaultValue={faction}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 세력</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비공개</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="profession"
            defaultValue={profession}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 직업</option>
            {CELEB_PROFESSIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            name="tier"
            defaultValue={tier}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 티어</option>
            <option value="full">full</option>
            <option value="light">light</option>
          </select>

          {showImageFilter && (
            <select
              name="image"
              defaultValue={imageFilter}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">모든 이미지 상태</option>
              <option value="missing-avatar">아바타 없는 인물</option>
              <option value="missing-portrait">대표 화보 없는 인물</option>
            </select>
          )}
        </div>

        <Button type="submit" size="sm" className="w-full sm:w-auto">
          검색
        </Button>
      </form>
    </div>
  )
}
