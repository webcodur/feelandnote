'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * 행 단위 접기/펼치기 컨텍스트.
 *
 * 각 행이 마운트 시 register(key) 로 자기를 등록하고, ScenarioView 상단의
 * 전체 토글 버튼이 등록된 모든 키를 일괄 collapsed Set 에 넣거나 비운다.
 * 개별 행 토글은 그 행의 키 하나만 다룬다.
 *
 * 기본값은 expanded (펼침). collapsed Set 에 포함된 키만 접힌 것으로 본다.
 */
type Ctx = {
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
  collapseAll: () => void
  expandAll: () => void
  register: (key: string) => void
  unregister: (key: string) => void
  totalCount: number
  collapsedCount: number
}

const RowCollapseContext = createContext<Ctx | null>(null)

export function RowCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const registered = useRef<Set<string>>(new Set())
  const [, force] = useState(0)
  const bump = () => force(n => n + 1)

  const register = useCallback((key: string) => {
    if (!key) return
    registered.current.add(key)
    bump()
  }, [])
  const unregister = useCallback((key: string) => {
    if (!key) return
    registered.current.delete(key)
    bump()
  }, [])

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsed(new Set(registered.current))
  }, [])
  const expandAll = useCallback(() => {
    setCollapsed(new Set())
  }, [])

  const isCollapsed = useCallback((key: string) => collapsed.has(key), [collapsed])

  const value = useMemo<Ctx>(() => ({
    isCollapsed, toggle, collapseAll, expandAll, register, unregister,
    totalCount: registered.current.size,
    collapsedCount: collapsed.size,
  }), [isCollapsed, toggle, collapseAll, expandAll, register, unregister, collapsed])

  return <RowCollapseContext.Provider value={value}>{children}</RowCollapseContext.Provider>
}

export function useRowCollapse() {
  const ctx = useContext(RowCollapseContext)
  if (!ctx) throw new Error('useRowCollapse must be used within RowCollapseProvider')
  return ctx
}

/** 행 내부에서 자기 키만 다루는 훅 — register/unregister 자동 처리. */
export function useRowCollapseState(key: string | undefined) {
  const ctx = useContext(RowCollapseContext)
  useEffect(() => {
    if (!ctx || !key) return
    ctx.register(key)
    return () => ctx.unregister(key)
  }, [ctx, key])
  if (!ctx || !key) return { collapsed: false, toggle: () => {} }
  return {
    collapsed: ctx.isCollapsed(key),
    toggle: () => ctx.toggle(key),
  }
}
