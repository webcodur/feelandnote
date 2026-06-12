// 천도 — 에셋 매니저
// 에셋이 없으면 폴백(CSS/텍스트)으로 렌더링한다.
// /public/assets/suikoden/ 에 파일을 넣으면 자동으로 사용된다.

import type { GameCharacter, UnitClass } from './types'
import { CLASS_INFO, GRADE_COLORS, NATIONALITY_SKIN } from './constants'

const assetCache = new Map<string, boolean>()
const checkPromises = new Map<string, Promise<boolean>>()

/** 에셋 존재 여부 비동기 체크 (캐시 사용) */
async function checkAssetExists(path: string): Promise<boolean> {
  if (assetCache.has(path)) return assetCache.get(path)!
  if (checkPromises.has(path)) return checkPromises.get(path)!

  const promise = fetch(path, { method: 'HEAD' })
    .then(res => {
      const exists = res.ok
      assetCache.set(path, exists)
      return exists
    })
    .catch(() => {
      assetCache.set(path, false)
      return false
    })

  checkPromises.set(path, promise)
  return promise
}

/** 캐릭터 초상화 경로 (동기 — 캐시에서 확인) */
export function getPortraitUrl(char: GameCharacter): string | null {
  // 1) DB avatar_url이 있으면 사용
  if (char.avatarUrl) return char.avatarUrl
  // 2) 개별 초상화 파일
  const individualPath = `/assets/suikoden/portraits/${char.id}.png`
  if (assetCache.get(individualPath)) return individualPath
  // 3) 템플릿 초상화
  const skin = NATIONALITY_SKIN[char.nationality] ?? 'medium'
  const gender = char.gender === false ? 'f' : 'm'
  const templatePath = `/assets/suikoden/portraits/${char.unitClass}_${gender}_${skin}.png`
  if (assetCache.get(templatePath)) return templatePath
  return null
}

/** 캐릭터 폴백 렌더 정보 (에셋 없을 때) */
export function getCharacterFallback(char: GameCharacter): {
  bgColor: string
  borderColor: string
  label: string
  icon: string
} {
  const classInfo = CLASS_INFO[char.unitClass]
  const gradeColor = GRADE_COLORS[char.grade]
  return {
    bgColor: classInfo.color + '33', // 20% 투명
    borderColor: gradeColor,
    label: char.nickname.slice(0, 2),
    icon: classInfo.icon,
  }
}

/** 게임 시작 시 에셋 프리로드 */
export async function preloadAssets(characters: GameCharacter[]): Promise<void> {
  const paths: string[] = []

  // 템플릿 초상화 체크
  const classes: UnitClass[] = ['general', 'strategist', 'artisan', 'official', 'artist', 'ranger']
  const genders = ['m', 'f']
  const skins = ['light', 'medium', 'dark']
  for (const c of classes) {
    for (const g of genders) {
      for (const s of skins) {
        paths.push(`/assets/suikoden/portraits/${c}_${g}_${s}.png`)
      }
    }
  }

  // 주요 캐릭터 개별 초상화 체크 (상위 30명만)
  for (const char of characters.slice(0, 30)) {
    paths.push(`/assets/suikoden/portraits/${char.id}.png`)
  }

  // 병렬 체크
  await Promise.allSettled(paths.map(p => checkAssetExists(p)))
}
