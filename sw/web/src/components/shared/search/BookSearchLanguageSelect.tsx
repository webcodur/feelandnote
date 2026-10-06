'use client'

import { useLocale, useTranslations } from 'next-intl'
import { BOOK_SEARCH_LANGUAGES, type BookSearchLanguage } from '@feelandnote/content-search/book-search-language'

export default function BookSearchLanguageSelect({ value, onChange, className = '' }: {
  value: BookSearchLanguage
  onChange: (value: BookSearchLanguage) => void
  className?: string
}) {
  const locale = useLocale()
  const t = useTranslations('shared.search')
  if (locale !== 'ko') return null
  return (
    <label className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
      <span className="sr-only">{t('bookLanguage')}</span>
      <select aria-label={t('bookLanguage')} value={value}
        onChange={event => onChange(event.target.value as BookSearchLanguage)}
        className="min-h-11 max-w-full cursor-pointer rounded-control border border-border bg-bg-card px-2 text-text-primary hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {BOOK_SEARCH_LANGUAGES.map(language => <option key={language} value={language}>{t(`bookLanguages.${language}`)}</option>)}
      </select>
    </label>
  )
}
