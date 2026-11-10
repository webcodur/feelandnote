'use client'

import { createContext, type ReactNode } from 'react'

/** 「개별 보기 | 전체 보기」 줄 왼쪽 빈자리에 상위 화면이 얹는 짧은 표시(인물 상세의 분류 이름). */
export const LibraryShelfLeadingContext = createContext<ReactNode>(null)
