/*
  천도 v2 — 넓은 화면(md 이상)인지. 지도 초점을 창에 가리지 않는 곳으로 옮길 때 쓴다.
*/
'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 768px)'

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true)
}
