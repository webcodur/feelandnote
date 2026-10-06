'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useLocale } from 'next-intl'
import { getBookSearchLanguage, type BookSearchLanguage } from '@feelandnote/content-search/book-search-language'

const CHANGE_EVENT = 'book-search-language-change'
const STORAGE_KEY = 'book-search-language:ko'
let fallback: BookSearchLanguage = 'ko'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function useBookSearchLanguage() {
  const locale = useLocale()
  const canSelectBookLanguage = locale === 'ko'
  const read = useCallback(() => {
    if (!canSelectBookLanguage) return getBookSearchLanguage(locale)
    try { return getBookSearchLanguage(localStorage.getItem(STORAGE_KEY)) }
    catch { return fallback }
  }, [canSelectBookLanguage, locale])
  const bookLanguage = useSyncExternalStore(subscribe, read, () => getBookSearchLanguage(locale))
  const setBookLanguage = useCallback((language: BookSearchLanguage) => {
    if (!canSelectBookLanguage) return
    try { localStorage.setItem(STORAGE_KEY, language) }
    catch { fallback = language }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [canSelectBookLanguage])
  return { bookLanguage, setBookLanguage, canSelectBookLanguage }
}
