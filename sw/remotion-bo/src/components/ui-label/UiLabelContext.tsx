'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/** UI 이름표 표시 여부를 앱 전역에 공유한다. 평소 꺼짐, 토글로 켜면 각 주요 화면·패널 모서리에 이름표가 뜬다. */
const STORAGE_KEY = 'remotionbo:ui-label'

type UiLabelCtx = { enabled: boolean; toggle: () => void }

const Ctx = createContext<UiLabelCtx>({ enabled: false, toggle: () => {} })

export function useUiLabel(): UiLabelCtx {
  return useContext(Ctx)
}

export function UiLabelProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)

  // 마지막 토글 상태 복원 (SSR 깜빡임 방지를 위해 mount 후 1회만 읽는다)
  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  const toggle = useCallback(() => {
    setEnabled(v => {
      const next = !v
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // F2 단축키로도 토글 (입력 중에도 동작 — 화면 전체에 해당하는 표시라 입력 컨텍스트와 무관)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return <Ctx.Provider value={{ enabled, toggle }}>{children}</Ctx.Provider>
}
