'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { SupportProduct } from '@/constants/supportProducts'

const STORAGE_KEY = 'feelandnote:support-shopping:v1'
const CHANGE_EVENT = 'feelandnote:support-shopping-change'
let unsavedSnapshot: string | null = null

function readSnapshot() {
  if (unsavedSnapshot !== null) return unsavedSnapshot
  try { return window.localStorage.getItem(STORAGE_KEY) } catch { return null }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      unsavedSnapshot = null
      onChange()
    }
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function parseSnapshot(snapshot: string | null): { urls: string[]; showFresh: boolean } {
  try {
    const value = JSON.parse(snapshot ?? 'null')
    return {
      urls: Array.isArray(value?.urls) ? [...new Set<string>(value.urls.filter((url: unknown) => typeof url === 'string'))] : [],
      showFresh: value?.showFresh !== false,
    }
  } catch { return { urls: [], showFresh: true } }
}

function save(value: ReturnType<typeof parseSnapshot>) {
  const snapshot = JSON.stringify(value)
  try {
    window.localStorage.setItem(STORAGE_KEY, snapshot)
    unsavedSnapshot = null
  } catch {
    // 저장을 막은 브라우저에서도 이번 방문 중 즐겨찾기와 필터는 사용할 수 있다.
    unsavedSnapshot = snapshot
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const serverSnapshot = () => null

export default function useSupportShopping(products: SupportProduct[]) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  const { urls, showFresh } = parseSnapshot(snapshot)
  const selectedUrls = new Set(urls)
  const selected = products.filter(product => selectedUrls.has(product.productUrl))
  const toggleProduct = useCallback((url: string) => {
    const current = parseSnapshot(readSnapshot())
    const validUrls = new Set(products.map(product => product.productUrl))
    const next = current.urls.filter(item => validUrls.has(item) && item !== url)
    if (!current.urls.includes(url) && validUrls.has(url)) next.push(url)
    save({ ...current, urls: next })
  }, [products])
  const toggleFresh = useCallback(() => {
    const current = parseSnapshot(readSnapshot())
    save({ ...current, showFresh: !current.showFresh })
  }, [])

  return { selected, selectedUrls, showFresh, toggleProduct, toggleFresh }
}
