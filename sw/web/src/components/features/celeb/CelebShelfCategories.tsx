'use client'

import { Activity, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { ContentTypeCounts } from '@/actions/user/getCelebBySlug'
import ShelfCategoryTabs from '@/components/shared/ShelfCategoryTabs/ShelfCategoryTabs'
import { SHELF_DIRECT_TYPES } from '@/components/shared/ShelfCategoryTabs/shelfCategories'
import { SHELF_CATEGORY_ICONS } from '@/components/shared/ShelfCategoryTabs/shelfCategoryIcons'
import { CATEGORIES } from '@/constants/categories'
import { LIBRARY_CONTROL_LAYOUT as layout } from '@/components/shared/libraryControlLayout'
import { LibraryShelfLeadingContext } from '@/components/shared/LibraryShelfLeadingContext'
import { CELEB_SHELF_EXPLORE_KEYS, CelebShelfContext, type CelebShelfExploreState } from './CelebShelfContext'

/** 첫 인물 탐색 분류를 고르라는 뜻. 책 수가 도착하기 전에도 주소·목차 이동을 받는다. */
const FIRST_EXPLORE = 'explore'
const isDirect = (key: string) => (SHELF_DIRECT_TYPES as readonly string[]).includes(key)
const isExplore = (key: string | null): key is typeof CELEB_SHELF_EXPLORE_KEYS[number] => (CELEB_SHELF_EXPLORE_KEYS as readonly (string | null)[]).includes(key)

/** 인물 상세의 책장. 「직접 감상」과 「인물 탐색」을 한 선택기에 두고 감상 기록과 관련 도서를 전환한다. */
export default function CelebShelfCategories({ directCounts, librarySlot, booksSlot }: {
  /** 공개 감상 기록이 없는 인물은 null이며 직접 감상 줄을 비활성으로 둔다. */
  directCounts: ContentTypeCounts | null
  librarySlot: ReactNode
  booksSlot: ReactNode
}) {
  const t = useTranslations('celebPage')
  const tCategory = useTranslations('content.category')
  const rootRef = useRef<HTMLDivElement>(null)
  const [picked, setPicked] = useState<string>(() => SHELF_DIRECT_TYPES.find(type => (directCounts?.[type] ?? 0) > 0) ?? FIRST_EXPLORE)
  const [choice, setChoice] = useState<string>()
  const [explore, setExplore] = useState<CelebShelfExploreState | null>(null)
  const category = picked === FIRST_EXPLORE
    ? CELEB_SHELF_EXPLORE_KEYS.find(key => (explore?.counts[key] ?? 0) > 0) ?? CELEB_SHELF_EXPLORE_KEYS[0] : picked
  const direct = isDirect(category)
  const activeChoice = explore?.choices.find(item => item.key === choice && !item.disabled)?.key
    ?? explore?.choices.find(item => !item.disabled)?.key

  const select = useCallback((key: string) => {
    rootRef.current?.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => media.pause())
    setPicked(key)
  }, [])
  const reportExplore = useCallback((next: CelebShelfExploreState) => {
    setExplore(current => JSON.stringify(current) === JSON.stringify(next) ? current : next)
  }, [])

  // 예전 주소(#library·#affiliate-books·#archive)와 분류 주소(?category=·?shelf=)를 같은 선택기로 연결한다.
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search)
      const type = CATEGORIES.find(item => item.id === params.get('category'))?.dbType
      const shelf = params.get('shelf')
      const hash = window.location.hash
      const next = type && (directCounts?.[type] ?? 0) > 0 ? type
        : isExplore(shelf) ? shelf
        : hash === '#affiliate-books' || hash === '#archive' ? FIRST_EXPLORE
        : hash === '#library' ? SHELF_DIRECT_TYPES.find(item => (directCounts?.[item] ?? 0) > 0) : undefined
      if (next) select(next)
    }
    const frame = requestAnimationFrame(sync)
    window.addEventListener('hashchange', sync)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', sync) }
  }, [directCounts, select])

  const control = useMemo(() => ({ category, choice: activeChoice, select, selectChoice: setChoice, reportExplore }),
    [category, activeChoice, select, reportExplore])
  const exploreLabels = { appeared: t('shelfCategories.appeared'), authored: t('shelfCategories.authored'), profession: t('shelfCategories.profession'), faction: t('shelfCategories.faction') }
  const exploreIcons = { appeared: SHELF_CATEGORY_ICONS.appeared, authored: SHELF_CATEGORY_ICONS.authored, profession: SHELF_CATEGORY_ICONS.profession, faction: SHELF_CATEGORY_ICONS.theme }
  const directLabel = (type: string) => tCategory(CATEGORIES.find(item => item.dbType === type)!.id)
  const CategoryIcon = direct ? SHELF_CATEGORY_ICONS[category as typeof SHELF_DIRECT_TYPES[number]] : exploreIcons[category as keyof typeof exploreIcons]
  // 폰 폭의 칩은 아이콘뿐이라 고른 분류의 이름을 보기 전환 줄 왼쪽 빈자리에 글자로 보여준다.
  const categoryName = <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent @[440px]:hidden" data-shelf-category-name
    title={t(direct ? 'shelfCategories.directRow' : 'shelfCategories.exploreRow')}>
    <CategoryIcon size={15} strokeWidth={1.75} aria-hidden />{direct ? directLabel(category) : exploreLabels[category as keyof typeof exploreLabels]}
  </p>
  return <CelebShelfContext.Provider value={control}><LibraryShelfLeadingContext.Provider value={categoryName}>
    <div ref={rootRef} data-celeb-shelf className="@container relative min-w-0 [overflow-anchor:none]">
      <span id="affiliate-books" aria-hidden className="absolute top-0 scroll-mt-20" />
      <span id="archive" aria-hidden className="absolute top-0 scroll-mt-20" />
      <div className={`mx-auto w-full max-w-xl ${layout.contentGap}`}>
        <ShelfCategoryTabs value={category} onChange={select} rows={[
          { key: 'direct', label: t('shelfCategories.directRow'), icon: SHELF_CATEGORY_ICONS.direct, options: SHELF_DIRECT_TYPES.map(type => {
            const count = directCounts?.[type] ?? 0
            return { key: type, label: directLabel(type), icon: SHELF_CATEGORY_ICONS[type], count, disabled: count === 0 }
          }) },
          { key: 'explore', label: t('shelfCategories.exploreRow'), icon: SHELF_CATEGORY_ICONS.explore, options: CELEB_SHELF_EXPLORE_KEYS.map(key => {
            const count = explore ? explore.counts[key] : null
            return { key, label: exploreLabels[key], icon: exploreIcons[key], count, disabled: count === 0 }
          }) },
        ]} choices={category === 'profession' && explore?.choices.length
          ? { label: t('groupProfession'), options: explore.choices, value: activeChoice, onChange: setChoice } : undefined} />
      </div>
      {librarySlot && <div data-shelf-pane="reviews" hidden={!direct} inert={!direct}>
        <Activity mode={direct ? 'visible' : 'hidden'}>{librarySlot}</Activity>
      </div>}
      {/* 인물 탐색의 책 수를 선택기에 채우도록 처음부터 마운트하고 숨기기만 한다. */}
      <div data-shelf-pane="references" hidden={direct} inert={direct}>{booksSlot}</div>
    </div>
  </LibraryShelfLeadingContext.Provider></CelebShelfContext.Provider>
}
