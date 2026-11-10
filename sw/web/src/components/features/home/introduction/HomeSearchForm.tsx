'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { CELEB_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { CATEGORIES } from '@/constants/categories'
import { getPathname, useRouter } from '@/i18n/navigation'
import styles from './HomeIntroduction.module.css'

const PERSON = 'celeb'

/** 인물과 작품 매체 중 무엇을 찾을지 먼저 고르고 헤더 검색과 같은 결과 화면으로 보낸다. */
export default function HomeSearchForm() {
  const t = useTranslations('home.landing')
  const tMode = useTranslations('shared.search')
  const tCategory = useTranslations('content.category')
  const router = useRouter()
  const locale = useLocale()
  const [target, setTarget] = useState(PERSON)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    if (!query) return
    const q = encodeURIComponent(query)
    router.push(target === PERSON
      ? `/explore?search=${q}&reality=${CELEB_REALITIES.join(',')}&contentPresence=all`
      : `/search?mode=content&category=${target}&q=${q}`)
  }

  // 스크립트가 붙기 전에 제출해도 작품 검색 결과로 간다.
  return <form action={getPathname({ locale, href: '/search' })} onSubmit={submit} className={styles.search} role="search" data-home-search>
    <label className={styles.searchMode}>
      <select value={target} onChange={event => setTarget(event.target.value)} aria-label={t('searchTarget')} data-home-search-target>
        <option value={PERSON}>{tMode('mode.celeb')}</option>
        {CATEGORIES.map(category => <option key={category.id} value={category.id}>{tCategory(category.id)}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden />
    </label>
    <input type="search" name="q" aria-label={t('searchLabel')} placeholder={t('searchPlaceholder')} required />
    <button type="submit">{t('searchAction')}<ArrowRight size={18} aria-hidden /></button>
  </form>
}
