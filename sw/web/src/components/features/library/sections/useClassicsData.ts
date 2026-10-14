'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getClassicsLibrary } from '@/actions/library/classics'
import type { LibraryResult } from '@/actions/library/types'
import { initialClassicsQuery } from '@/lib/library/classicsQuery'
import { createClassicsRequests, CLASSICS_SLOW_NOTICE_MS } from './classicsRequests'

export function useClassicsData(initialData: LibraryResult, firstProfession: string) {
  const [requests] = useState(() => createClassicsRequests(initialClassicsQuery(firstProfession), initialData, getClassicsLibrary))
  const state = useSyncExternalStore(requests.subscribe, requests.getSnapshot, requests.getSnapshot)
  const [slowRevision, setSlowRevision] = useState(-1)

  useEffect(() => {
    requests.activate()
    return requests.deactivate
  }, [requests])

  useEffect(() => {
    if (!state.pending) return
    const timer = setTimeout(() => setSlowRevision(state.revision), CLASSICS_SLOW_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [state.pending, state.revision])

  return { ...state, isSlow: state.pending && slowRevision === state.revision,
    load: requests.load, retry: () => requests.load({}, true) }
}
