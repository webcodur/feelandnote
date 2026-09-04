/*
  파일명: /actions/celebs/findCelebsByNames.ts
  기능: 작품에 적힌 창작자 이름과 이름이 같은 등록 인물을 찾는다.
  책임: 이름이 같다고 같은 사람이라 단정하지 않는다 — 후보를 돌려줄 뿐이고, 누구인지는 사람이 고른다.
        『무소유』의 저자 법정과 촉한의 모사 법정처럼 이름만 겹치는 쌍이 실제로 있다.
        그래서 한 명만 걸려도 곧장 잇지 않도록 언제나 목록으로 돌려준다.
*/ // ------------------------------
'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { normalizeCreatorName } from '@/lib/utils/creator-names'

/** 한 번에 대조할 이름 상한 — 출연진이 길어도 조회 한 번으로 끝낸다 */
const MAX_NAMES = 24

export interface CelebNameMatch {
  slug: string
  /** 화면 언어에 맞춘 이름 */
  nickname: string
  /** 누구인지 가르는 한 줄. 생몰년과 함께 다른 사람을 걸러 낸다 */
  headline: string | null
  avatarUrl: string | null
  birthDate: string | null
  deathDate: string | null
}

const SELECT =
  'slug, nickname, nickname_en, headline, headline_en, avatar_url, birth_date, death_date'

interface CelebRow {
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  headline: string | null
  headline_en: string | null
  avatar_url: string | null
  birth_date: string | null
  death_date: string | null
}

function toMatch(row: CelebRow, isEn: boolean): CelebNameMatch | null {
  if (!row.slug) return null
  const nickname = isEn ? row.nickname_en || row.nickname : row.nickname
  if (!nickname) return null
  return {
    slug: row.slug,
    nickname,
    headline: (isEn ? row.headline_en || row.headline : row.headline) ?? null,
    avatarUrl: row.avatar_url,
    birthDate: row.birth_date,
    deathDate: row.death_date,
  }
}

async function fetchCelebsByNames(
  names: string[],
  locale: string,
): Promise<Record<string, CelebNameMatch[]>> {
  if (names.length === 0) return {}

  const isEn = locale === 'en'
  const db = createStaticClient()
  const wanted = names.slice(0, MAX_NAMES)

  // 한글 이름과 영문 이름은 서로 다른 칸에 있어 각각 대조한다.
  // .or()에 이름을 이어 붙이면 쉼표·괄호가 든 표기에서 필터가 깨진다.
  const base = () =>
    db
      .from('celebs')
      .select(SELECT)
      .eq('publication_status', 'active')

  const [ko, en] = await Promise.all([
    base().in('nickname', wanted),
    base().in('nickname_en', wanted),
  ])

  if (ko.error) throw new Error(`findCelebsByNames(nickname) 실패: ${ko.error.message}`)
  if (en.error) throw new Error(`findCelebsByNames(nickname_en) 실패: ${en.error.message}`)

  const map: Record<string, CelebNameMatch[]> = {}
  const placed = new Set<string>()

  for (const row of [...(ko.data ?? []), ...(en.data ?? [])] as CelebRow[]) {
    const match = toMatch(row, isEn)
    if (!match) continue

    // 한 인물이 한글·영문 양쪽으로 걸릴 수 있다. 걸린 이름 칸마다 한 번씩만 담는다.
    for (const raw of [row.nickname, row.nickname_en]) {
      if (!raw) continue
      const key = normalizeCreatorName(raw)
      if (!wanted.some((name) => normalizeCreatorName(name) === key)) continue
      const seat = `${key}:${row.slug}`
      if (placed.has(seat)) continue
      placed.add(seat)
      ;(map[key] ??= []).push(match)
    }
  }

  return map
}

/**
 * 이름 목록으로 등록 인물 후보를 찾는다. 열쇠는 normalizeCreatorName을 거친 이름이다.
 * RSC 직접 조회는 캐시를 우회하므로 반드시 이 액션을 거친다.
 */
export const findCelebsByNames = unstable_cache(
  fetchCelebsByNames,
  ['celebs-by-names'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
)
