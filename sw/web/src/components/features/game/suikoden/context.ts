/*
  천도 v2 — 화면들이 함께 쓰는 것: 명부, 문구, 이름 찾기, 소리, 알림
*/
'use client'

import { createContext, useContext } from 'react'
import { territoryName, type TerritoryId } from '@/lib/game/suikoden/map'
import type { GameState, Hero, Roster } from '@/lib/game/suikoden/types'
import type { CheondoSfx } from './hooks/useSuikodenAudio'
import type { CheondoText, Locale, NameLookup } from './i18n'

export interface CheondoCtx {
  roster: Roster
  locale: Locale
  T: CheondoText
  sfx: (name: CheondoSfx) => void
  voice: (hero: Pick<Hero, 'id' | 'voiceV'> | null | undefined, kind: 'greeting' | 'rollCall' | 'deploy' | 'clash' | 'win' | 'lose', variant: number) => void
  toast: (text: string, tone?: 'good' | 'bad' | 'info') => void
  openHero: (id: string) => void
}

export const CheondoContext = createContext<CheondoCtx | null>(null)

export function useCheondo(): CheondoCtx {
  const ctx = useContext(CheondoContext)
  if (!ctx) throw new Error('CheondoContext missing')
  return ctx
}

/** 상태를 보고 이름을 찾는다(세력은 군주 이름으로) */
export function makeNames(roster: Roster, locale: Locale, T: CheondoText, state: GameState | null): NameLookup {
  return {
    hero: (id) => roster.byId.get(id)?.name ?? (id.startsWith('militia:') ? T.battle.militia : id),
    territory: (id) => territoryName(id as TerritoryId, locale),
    faction: (id) => {
      const f = state?.factions[id]
      if (!f) return T.neutral
      return T.faction(roster.byId.get(f.lordId)?.name ?? id)
    },
  }
}
