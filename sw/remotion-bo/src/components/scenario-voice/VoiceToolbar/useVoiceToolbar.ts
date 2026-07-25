'use client'

import { useState, useCallback } from 'react'
import type { EpisodeData } from '../../EpisodeEditor'
import { resolveSegmentEngine } from '../../voice-utils'
import { type EleSettings, type EleSendOpts, buildEleText } from '../types'

// ── VoiceToolbar 상태·로직 ──

type UseVoiceToolbarArgs = {
  episode: EpisodeData
  series: string
  name: string
  eleSettings: EleSettings
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  onRefresh: () => void
}

export function useVoiceToolbar({
  episode, series, name, eleSettings, eleSendOpts, onEleSendOptsChange, onRefresh,
}: UseVoiceToolbarArgs) {
  const [engine, setEngine] = useState('gemini')
  const [role, setRole] = useState('')
  const [only, setOnly] = useState('')
  const [thenAlign, setThenAlign] = useState(false)
  const [eleSettingsOpen, setEleSettingsOpen] = useState(false)
  const [eleBatchRunning, setEleBatchRunning] = useState(false)
  const [eleBatchStatus, setEleBatchStatus] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  // shorts 배열 정규화 (단일 객체 호환)
  const shortsArr: Array<{ segments: Array<{ id: string; role: string; text?: string }> }> =
    Array.isArray(episode.shorts) ? episode.shorts as any : (episode.shorts ? [episode.shorts as any] : [])
  const hasShorts = shortsArr.some(s => s?.segments?.length > 0)

  /** 옵션 2: 모든 쇼츠의 셀럽 구간을 (key, text) 페어로. 접두사 `shorts-{N}/` 필수 (1-based). */
  const collectShortsCelebKeys = (predicate: (seg: { role: string; text?: string }) => boolean) => {
    const out: { key: string; text: string }[] = []
    shortsArr.forEach((cfg, sIdx) => {
      const prefix = `shorts-${sIdx + 1}/`  // 1-based
      cfg?.segments?.forEach((s, i) => {
        if (!predicate(s)) return
        const idx = String(i + 1).padStart(2, '0')
        out.push({ key: `${prefix}S${idx}-${s.id}`, text: s.text ?? '' })
      })
    })
    return out
  }

  const runEleBatch = async () => {
    if (eleBatchRunning) return
    setEleBatchRunning(true)
    const ho = episode.host!
    const targets: { key: string; text: string; voiceId: string }[] = []
    if (ho.philosophy) targets.push({ key: 'B2-philosophy', text: ho.philosophy, voiceId: ho.elevenlabsVoiceId! })
    if (ho.featuredQuote) targets.push({ key: 'A3-featured-quote', text: ho.featuredQuote, voiceId: ho.elevenlabsVoiceId! })
    // 캐릭터 보이스(geminiVoice) 오버라이드 segment는 ELE 일괄 생성 대상에서 제외.
    // segment·speaker 우선순위로 해소된 voiceId가 segment마다 다를 수 있다.
    for (const t of collectShortsCelebKeys(s => s.role === 'celeb' && !!s.text)) {
      const spec = resolveSegmentEngine(t.key, episode)
      if (spec?.engine !== 'elevenlabs') continue
      if (t.text) targets.push({ ...t, voiceId: spec.voiceParam })
    }
    let ok = 0, fail = 0
    for (const t of targets) {
      setEleBatchStatus(`${t.key} 생성 중...`)
      try {
        const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: t.voiceId, text: buildEleText(t.text, eleSendOpts), settings: eleSettings }),
        })
        const d = await res.json()
        if (!d.success) { fail++; continue }
        const sr = await fetch(`/api/${series}/voice/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode: name, fileName: `elevenlabs/${t.key}.wav`, base64: d.base64 }),
        })
        const sd = await sr.json()
        if (sd.success) ok++; else fail++
      } catch { fail++ }
      await new Promise(r => setTimeout(r, 500))
    }
    setEleBatchRunning(false)
    setEleBatchStatus(`완료: 성공 ${ok}개, 실패 ${fail}개`)
    if (ok > 0) onRefresh()
    setTimeout(() => setEleBatchStatus(null), 3000)
  }

  return {
    engine, setEngine,
    role, setRole,
    only, setOnly,
    thenAlign, setThenAlign,
    eleSettingsOpen, setEleSettingsOpen,
    eleBatchRunning,
    eleBatchStatus,
    expanded, setExpanded,
    hasShorts,
    runEleBatch,
  }
}
