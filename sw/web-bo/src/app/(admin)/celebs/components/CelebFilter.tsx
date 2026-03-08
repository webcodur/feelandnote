'use client'

import { useEffect, useState } from 'react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import Button from '@/components/ui/Button'

interface CelebFilterProps {
  defaultValues: {
    search: string
    status: string
    profession: string
    tier: string
  }
}

export default function CelebFilter({ defaultValues }: CelebFilterProps) {
  const { search, status, profession, tier } = defaultValues

  const [statusValue, setStatusValue] = useState(status)
  const [professionValue, setProfessionValue] = useState(profession)
  const [tierValue, setTierValue] = useState(tier)

  useEffect(() => {
    setStatusValue(status)
    setProfessionValue(profession)
    setTierValue(tier)
  }, [status, profession, tier])

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
      <form action="/celebs" className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
        <CelebSearchBar
          name="search"
          initialQuery={search}
          autoFocus
          className="flex-1 min-w-0 sm:min-w-[220px]"
        />

        <div className="grid grid-cols-3 sm:flex gap-2 md:gap-3">
          <select
            name="status"
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value)}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비공개</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="profession"
            value={professionValue}
            onChange={(event) => setProfessionValue(event.target.value)}
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
            value={tierValue}
            onChange={(event) => setTierValue(event.target.value)}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">모든 티어</option>
            <option value="full">full</option>
            <option value="light">light</option>
          </select>
        </div>

        <Button type="submit" size="sm" className="w-full sm:w-auto">
          검색
        </Button>
      </form>
    </div>
  )
}
