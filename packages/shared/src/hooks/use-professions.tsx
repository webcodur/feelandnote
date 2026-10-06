'use client'

import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import { getCelebProfession, getCelebProfessionLabel, type ProfessionOption } from '../constants/celeb-professions'

const ProfessionContext = createContext<readonly ProfessionOption[] | null>(null)

export function ProfessionProvider({ professions, children }: { professions: readonly ProfessionOption[]; children: ReactNode }) {
  return createElement(ProfessionContext.Provider, { value: professions }, children)
}

/** 서버가 읽은 DB 직군 목록을 모든 클라이언트 화면이 공유한다. */
export function useProfessions() {
  const professions = useContext(ProfessionContext)
  if (!professions) throw new Error('ProfessionProvider is required')
  return useMemo(() => ({
    professions,
    filters: [{ value: 'all', label: '전체', label_en: 'All' }, ...professions],
    getLabel: (value: string | null | undefined, locale?: string) => getCelebProfessionLabel(value, locale, professions),
    getProfession: (value: string | null | undefined) => getCelebProfession(value, professions),
  }), [professions])
}
