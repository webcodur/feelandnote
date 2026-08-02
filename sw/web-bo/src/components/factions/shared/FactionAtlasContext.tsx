'use client'

/**
 * 편 편집기의 도감 상태 공급자 — 세력별 연결 테마와 인물별 도감 손질(web_*)을 화면 전체에 나눈다.
 *
 * 대본(JSON)과 별개 축이다: 대본은 영상 원문, 이 컨텍스트는 도감 표기. 자리는 저장된 DB
 * 기준(position)이라 저장 전의 구조 편집(인물 추가·이동)과는 어긋날 수 있다 — 그래서
 * 자리 조회에 신원(celeb id·slug·이름) 대조를 함께 걸고, 어긋나면 같은 세력 안에서 신원으로
 * 다시 찾는다. 저장이 끝나면 reloadKey 로 다시 읽는다.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  getEpisodeAtlas,
  type AtlasGroupLink, type AtlasPersonState, type AtlasTheme, type EpisodeAtlas,
} from '@/actions/admin/factions/atlas'

export type { AtlasGroupLink, AtlasPersonState, AtlasTheme }

/** 인물 자리 대조에 쓰는 신원 — 편집기 인물(FactionPerson)에서 뽑는다 */
export interface AtlasIdentity {
  celebId?: string
  slug?: string
  name: string
}

interface FactionAtlasValue {
  loaded: boolean
  /** 세력(0-based 인덱스)의 테마 연결 — 없으면 null */
  groupLink: (groupIndex: number) => AtlasGroupLink | null
  /** 인물 자리(0-based 3종)의 도감 상태 — 신원이 안 맞으면 같은 세력에서 신원으로 재탐색, 그래도 없으면 null */
  personState: (groupIndex: number, clusterIndex: number, personIndex: number, identity: AtlasIdentity) => AtlasPersonState | null
  /** 테마 간판 저장 성공 후 화면 반영 */
  patchTheme: (tagId: string, patch: Partial<AtlasTheme>) => void
  /** 인물 손질 저장 성공 후 화면 반영 */
  patchPerson: (personId: string, patch: Partial<AtlasPersonState>) => void
  refresh: () => void
}

const Ctx = createContext<FactionAtlasValue | null>(null)

export function useFactionAtlas(): FactionAtlasValue | null {
  return useContext(Ctx)
}

export function FactionAtlasProvider({
  folder, reloadKey = 0, children,
}: {
  folder: string
  /** 대본 저장 등으로 DB 자리가 바뀌면 올려서 다시 읽게 한다 */
  reloadKey?: number
  children: React.ReactNode
}) {
  const [atlas, setAtlas] = useState<EpisodeAtlas | null>(null)

  const load = useCallback(() => {
    getEpisodeAtlas(folder)
      .then(setAtlas)
      .catch(e => {
        // 도감 구획은 보조 정보다 — 편집기 본체를 막지 않고 상태만 비운다
        console.error('도감 상태 조회 실패:', e)
        setAtlas(null)
      })
  }, [folder])

  useEffect(() => { load() }, [load, reloadKey])

  const groupLink = useCallback((groupIndex: number): AtlasGroupLink | null => {
    if (!atlas) return null
    return atlas.groups.find(g => g.position === groupIndex + 1) ?? null
  }, [atlas])

  const personState = useCallback((
    groupIndex: number, clusterIndex: number, personIndex: number, identity: AtlasIdentity,
  ): AtlasPersonState | null => {
    if (!atlas) return null
    const matches = (p: AtlasPersonState) =>
      (!!identity.celebId && p.celebId === identity.celebId)
      || (!!identity.slug && p.slug === identity.slug)
      || p.name === identity.name

    const atSeat = atlas.people.find(p =>
      p.groupPos === groupIndex + 1 && p.clusterPos === clusterIndex + 1 && p.personPos === personIndex + 1)
    if (atSeat && matches(atSeat)) return atSeat

    // 저장 전 이동으로 자리가 어긋난 경우 — 같은 세력 안에서 신원으로 찾는다
    return atlas.people.find(p => p.groupPos === groupIndex + 1 && matches(p)) ?? null
  }, [atlas])

  const patchTheme = useCallback((tagId: string, patch: Partial<AtlasTheme>) => {
    setAtlas(prev => prev ? {
      ...prev,
      groups: prev.groups.map(g =>
        g.tagId === tagId && g.theme ? { ...g, theme: { ...g.theme, ...patch } } : g),
    } : prev)
  }, [])

  const patchPerson = useCallback((personId: string, patch: Partial<AtlasPersonState>) => {
    setAtlas(prev => prev ? {
      ...prev,
      people: prev.people.map(p => (p.personId === personId ? { ...p, ...patch } : p)),
    } : prev)
  }, [])

  return (
    <Ctx.Provider value={{ loaded: !!atlas, groupLink, personState, patchTheme, patchPerson, refresh: load }}>
      {children}
    </Ctx.Provider>
  )
}
