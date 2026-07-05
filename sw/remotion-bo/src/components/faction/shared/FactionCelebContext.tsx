'use client'

import { createContext, useContext } from 'react'

/** 셀럽 DB 대조 결과 — 인물 행 등록 배지 판정용 */
export interface FactionCelebCtx {
  /** DB에 실존하는 slug 집합 */
  existing: Set<string>
  /** 대조 완료 여부 — false면 배지를 그리지 않는다(로딩 중 오판 방지) */
  loaded: boolean
}

const Ctx = createContext<FactionCelebCtx | null>(null)

export const FactionCelebProvider = Ctx.Provider

export function useFactionCeleb(): FactionCelebCtx | null {
  return useContext(Ctx)
}
