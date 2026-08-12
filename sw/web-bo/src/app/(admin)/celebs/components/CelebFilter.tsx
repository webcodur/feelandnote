'use client'

import { useState } from 'react'
import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import Button from '@/components/ui/Button'
import type { CelebImageFilter } from '@/actions/admin/celebs'
import { resolveFactionSelection, type FactionTheme } from './factionOptions'

const SELECT_CLASS =
  'px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50'

interface CelebFilterProps {
  action?: string
  showImageFilter?: boolean
  /** 상위 테마와 그 아래 세력들 — 두 칸으로 나눠 고르게 한다 */
  factionThemes?: FactionTheme[]
  defaultValues: {
    search: string
    status: string
    profession: string
    tier: string
    imageFilter: CelebImageFilter
    faction?: string
  }
}

export default function CelebFilter({ action = '/celebs', showImageFilter = false, factionThemes = [], defaultValues }: CelebFilterProps) {
  const { search, status, profession, tier, imageFilter, faction = 'all' } = defaultValues

  const initial = resolveFactionSelection(factionThemes, faction)
  const [themeId, setThemeId] = useState(initial.theme)
  const [factionId, setFactionId] = useState(initial.faction)

  const selectedTheme = factionThemes.find((theme) => theme.id === themeId)
  const subFactions = selectedTheme?.factions ?? []
  // 세력을 고르지 않았으면 테마 전체가 대상이다
  const submittedFaction = factionId !== 'all' ? factionId : themeId

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
      <form action={action} className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
        <CelebSearchBar
          name="search"
          initialQuery={search}
          autoFocus
          className="flex-1 min-w-0 sm:min-w-[220px]"
        />

        <input type="hidden" name="faction" value={submittedFaction} />

        <div className={`grid gap-2 sm:flex sm:flex-wrap md:gap-3 ${showImageFilter ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <select
            value={themeId}
            onChange={(e) => {
              setThemeId(e.target.value)
              setFactionId('all')
            }}
            className={SELECT_CLASS}
            aria-label="테마"
          >
            <option value="all">모든 테마</option>
            {factionThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>

          <select
            value={factionId}
            onChange={(e) => setFactionId(e.target.value)}
            disabled={subFactions.length === 0}
            className={SELECT_CLASS}
            aria-label="세력"
          >
            <option value="all">
              {subFactions.length === 0 ? '세력 없음' : `${selectedTheme?.name} 전체`}
            </option>
            {subFactions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status}
            className={SELECT_CLASS}
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비공개</option>
            <option value="suspended">정지</option>
          </select>

          <select
            name="profession"
            defaultValue={profession}
            className={SELECT_CLASS}
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
            className={SELECT_CLASS}
          >
            <option value="all">모든 티어</option>
            <option value="full">full</option>
            <option value="light">light</option>
            <option value="fiction">fiction</option>
          </select>

          {showImageFilter && (
            <select
              name="image"
              defaultValue={imageFilter}
              className={SELECT_CLASS}
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
