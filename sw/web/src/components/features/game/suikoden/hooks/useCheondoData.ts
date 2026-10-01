/*
  천도 v2 — 서버 자료 훅: 인물 명부(한 번), 인물 대사(필요한 사람만), 대사 음성
*/
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { loadCheondoLines, loadCheondoRoster, type CheondoLines } from '@/actions/game/suikoden'
import { buildRoster } from '@/lib/game/suikoden/roster'
import type { Hero, Roster } from '@/lib/game/suikoden/types'
import { getVoiceUrl } from '@/lib/game/voice/voiceUrl'
import type { Locale } from '@/types/locale'
import { stripEmotionTag } from '@/components/features/game/shared/hooks/useDialogue'
import { gameText } from '@/lib/game/text'

const FALLBACK_AVATAR_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? 'https://assets.feelandnote.com'

export type RosterStatus = 'loading' | 'ready' | 'error'

export function useRoster(): { roster: Roster | null; status: RosterStatus; retry: () => void } {
  const [roster, setRoster] = useState<Roster | null>(null)
  const [status, setStatus] = useState<RosterStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    loadCheondoRoster()
      .then((payload) => {
        if (!alive) return
        if (!payload.rows.length) { setStatus('error'); return }
        setRoster(buildRoster(payload.rows, payload.avatarBase || FALLBACK_AVATAR_BASE))
        setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false }
  }, [attempt])
  // 다시 받기는 누른 자리에서 '받는 중'으로 돌린다(효과 안에서 상태를 바로 바꾸지 않는다)
  return { roster, status, retry: () => { setStatus('loading'); setAttempt((n) => n + 1) } }
}

// ── 대사 ──

const linesCache = new Map<string, CheondoLines | null>()
const inflight = new Map<string, Promise<void>>()

async function fetchLines(ids: string[]): Promise<void> {
  const need = ids.filter((id) => !linesCache.has(id) && !inflight.has(id))
  if (need.length === 0) {
    await Promise.all(ids.map((id) => inflight.get(id)).filter(Boolean))
    return
  }
  const job = loadCheondoLines(need)
    .then((result) => { for (const id of need) linesCache.set(id, result[id] ?? null) })
    .catch(() => { for (const id of need) linesCache.set(id, null) })
    .finally(() => { for (const id of need) inflight.delete(id) })
  for (const id of need) inflight.set(id, job)
  await job
}

/** 화면에 나온 인물들의 대사. 없으면 null */
export function useLines(ids: (string | null | undefined)[]): Record<string, CheondoLines | null> {
  const key = ids.filter(Boolean).join(',')
  const [, force] = useState(0)
  useEffect(() => {
    const list = key ? key.split(',') : []
    if (list.length === 0) return
    let alive = true
    fetchLines(list).then(() => { if (alive) force((n) => n + 1) })
    return () => { alive = false }
  }, [key])
  const out: Record<string, CheondoLines | null> = {}
  for (const id of key ? key.split(',') : []) out[id] = linesCache.get(id) ?? null
  return out
}

export function pickLine(lines: CheondoLines | null | undefined, kind: keyof Omit<CheondoLines, 'quote'>, seed = 0): { text: string; variant: number } | null {
  const list = lines?.[kind]
  if (!list || list.length === 0) return null
  const i = Math.abs(seed) % list.length
  const text = gameText(stripEmotionTag(list[i])).trim()
  return text ? { text, variant: i + 1 } : null
}

export function quoteOf(lines: CheondoLines | null | undefined): string | null {
  const q = lines?.quote?.trim()
  if (!q) return null
  const bare = q.startsWith('"') && q.endsWith('"') ? q.slice(1, -1) : q
  return gameText(stripEmotionTag(bare)).trim() || null
}

// ── 음성 ──

const VOICE_LABEL: Record<string, string> = {
  greeting: 'greeting', rollCall: 'roll_call', deploy: 'deploy', clash: 'clash_attack', win: 'battle_win', lose: 'battle_lose',
}

/** 대사 음성을 한 번에 하나만 튼다 */
export function useVoice(locale: Locale, muted: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { audioRef.current?.pause() }, [])
  return useCallback((hero: Pick<Hero, 'id' | 'voiceV'> | null | undefined, kind: keyof typeof VOICE_LABEL, variant: number) => {
    if (!hero || hero.voiceV <= 0 || muted) return
    const url = getVoiceUrl(hero.id, locale, VOICE_LABEL[kind], variant, hero.voiceV)
    if (!url) return
    audioRef.current?.pause()
    const audio = new Audio(url)
    audio.volume = 0.9
    audioRef.current = audio
    void audio.play().catch(() => {})
  }, [locale, muted])
}
