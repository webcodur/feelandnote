'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import { VoiceTimingEditor } from '@/components/VoiceTimingEditor'

/**
 * 세력도 SYNC 패널 — whisper가 잘못 잡은 발화 시각을 음원 들으며 드래그로 교정한다.
 * 북리커맨드 SyncModeContent 와 같은 VoiceTimingEditor를 쓰되, 데이터 연결만 세력도에 맞춘다:
 *  - 발화 시각: /faction-voice/{ep}/timing (편별 data.timing.p<N>.<lang>.json 에서 stem 으로 검색/저장)
 *  - 음원: /faction-voice/{ep}/{voiceFile}
 * 인물 대사는 한 세그먼트(그 안 sub=의미 덩어리) 구조라, 세그먼트 1개 + sub 경계(subTimings)를 드래그한다.
 */

type Timing = { start: number; end: number; text?: string; sub?: string[]; subTimings?: number[] }

export function FactionSyncContent({ series, episodeName, voiceFile, person }: {
  series: string; episodeName: string; voiceFile: string; person: FactionPerson
}) {
  const stem = voiceFile.replace(/\.wav$/i, '')
  const [timings, setTimings] = useState<Timing[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const segmentsRef = useRef<string[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/timing?stem=${encodeURIComponent(stem)}&lang=ko`)
      .then(r => r.json())
      .then(d => { if (alive) setTimings(Array.isArray(d.timings) ? d.timings : null) })
      .catch(() => { if (alive) setTimings(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [series, episodeName, stem])

  const save = useCallback(async (t: Timing[]) => {
    setSaving(true); setSaved(false)
    try {
      await fetch(`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/timing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stem, lang: 'ko', timings: t }),
      })
      setSaved(true)
    } finally { setSaving(false) }
  }, [series, episodeName, stem])

  const onChange = (t: Timing[]) => {
    setTimings(t)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void save(t) }, 500)
  }
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const quote = person.quoteChunks?.length ? person.quoteChunks.join(' ') : (person.quote ?? '')
  const sentences = quote ? [quote] : []
  const audioUrl = `/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}`
  const dur = timings?.[timings.length - 1]?.end ?? 0

  if (loading) return <div className="text-xs text-text-dim px-1 py-2">발화 시각 로드 중…</div>
  if (!timings || timings.length === 0) {
    return <div className="text-xs text-text-dim px-1 py-2">발화 시각이 없다. 팩션 sync(전사 + faction-align)를 먼저 실행한다.</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
        <span>세그 {timings.length} / {dur.toFixed(2)}초</span>
        {saving && <span className="text-amber-400">저장 중…</span>}
        {!saving && saved && <span className="text-emerald-500">저장됨</span>}
      </div>
      <div className="bg-bg-main rounded p-2">
        <VoiceTimingEditor
          audioUrl={audioUrl}
          duration={dur}
          sentences={sentences}
          timings={timings}
          segmentsRef={segmentsRef}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
