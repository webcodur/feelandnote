import type { ImageField } from '../types'
import type { SoloFreeSection } from './types'

// 솔로는 책 단위 그룹·field 분류가 없어 이미지 풀 그룹핑 맵을 비운다 (참조 안정성 위해 모듈 상수).
export const EMPTY_FILE_BOOK_MAP = new Map<string, number>()
export const EMPTY_FILE_FIELD_MAP = new Map<string, ImageField>()

/** 기존 id와 겹치지 않는 다음 섹션 id (`s{n}`). 삭제 후 재추가해도 충돌 없게 max+1. */
export function nextId(sections: SoloFreeSection[]): string {
  let max = 0
  for (const s of sections) {
    const m = /^s(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `s${max + 1}`
}
