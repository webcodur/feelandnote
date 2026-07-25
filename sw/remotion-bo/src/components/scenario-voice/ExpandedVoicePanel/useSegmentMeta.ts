import { useEffect, useMemo, useState } from 'react'
import type { EpisodeData } from '../../EpisodeEditor'
import type { SegmentEngineSpec } from '@feelandnote/shared/bo/voice-utils'
import { shortsArrIndexBySlot } from '@feelandnote/shared/bo/voice-utils'
import { type EleSendOpts, type VoiceMeta } from '../types'
import { sectionVoicePath, readSegmentVoiceMeta, sectionStyleKey } from '../utils'

type SegmentLocator = { shortsIndex: number; segmentId: string } | null

type UseSegmentMetaArgs = {
  secKey: string
  episode: EpisodeData
  series: string
  name: string
  eleSendOpts: EleSendOpts
  segmentLocator: SegmentLocator
  geminiSpec: SegmentEngineSpec
  onEpisodeChange: (ep: EpisodeData) => void
  setError: (e: string | null) => void
}

export function useSegmentMeta({
  secKey, episode, series, name, eleSendOpts,
  segmentLocator, geminiSpec, onEpisodeChange, setError,
}: UseSegmentMetaArgs) {
  // ── segment별 voice 메타 (ELE 전용 — 감정 태그·trail) ──
  const segmentPath = useMemo(() => sectionVoicePath(secKey, episode), [secKey, episode])
  const segmentMeta = useMemo(() => readSegmentVoiceMeta(episode, segmentPath), [episode, segmentPath])
  const effectiveOpts: EleSendOpts = useMemo(() => ({
    emotionEnabled: (segmentMeta?.tags?.length ?? 0) > 0 ? true : eleSendOpts.emotionEnabled,
    emotions: segmentMeta?.tags && segmentMeta.tags.length > 0 ? segmentMeta.tags : eleSendOpts.emotions,
    trailEnabled: typeof segmentMeta?.trail === 'boolean' ? segmentMeta.trail : eleSendOpts.trailEnabled,
  }), [segmentMeta, eleSendOpts])
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  const handleSegmentMetaChange = async (next: VoiceMeta) => {
    if (!segmentPath) return
    // 낙관적 업데이트 — episode 객체 깊은 set
    const ep = JSON.parse(JSON.stringify(episode)) as typeof episode
    const segs: Array<string | number> = []
    let i = 0
    while (i < segmentPath.length) {
      if (segmentPath[i] === '.') { i++; continue }
      if (segmentPath[i] === '[') {
        const close = segmentPath.indexOf(']', i)
        segs.push(Number(segmentPath.slice(i + 1, close)))
        i = close + 1
        continue
      }
      let j = i
      while (j < segmentPath.length && segmentPath[j] !== '.' && segmentPath[j] !== '[') j++
      segs.push(segmentPath.slice(i, j))
      i = j
    }
    let cur: any = ep
    for (let k = 0; k < segs.length - 1; k++) {
      if (cur[segs[k]] === undefined || cur[segs[k]] === null) {
        cur[segs[k]] = typeof segs[k + 1] === 'number' ? [] : {}
      }
      cur = cur[segs[k]]
    }
    const last = segs[segs.length - 1]
    const isEmpty = !next.tags?.length && typeof next.trail !== 'boolean' && !next.emphasis?.length
    if (isEmpty) delete cur[last]
    else cur[last] = next
    onEpisodeChange(ep)

    setMetaSaving(true)
    setMetaError(null)
    try {
      const res = await fetch(`/api/${series}/voice/meta/${name}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: segmentPath, value: next, locale: 'both' }),
      })
      const data = await res.json()
      if (!data.success) setMetaError(data.error ?? 'voice 메타 저장 실패')
    } catch (e) {
      setMetaError(String(e))
    } finally {
      setMetaSaving(false)
    }
  }

  // segment 필드 편집 (geminiVoice·style) — 낙관적 업데이트 + 디스크 PATCH
  const handleSegmentFieldChange = async (field: 'geminiVoice' | 'style', value: string | undefined) => {
    if (!segmentLocator) return
    const { shortsIndex, segmentId } = segmentLocator
    const ep = JSON.parse(JSON.stringify(episode)) as EpisodeData
    const arr = Array.isArray(ep.shorts) ? ep.shorts : []
    const target = arr[shortsArrIndexBySlot(arr, shortsIndex)]?.segments?.find((s: { id: string }) => s.id === segmentId)
    if (!target) return
    const t = target as Record<string, unknown>
    if (value === undefined || value === '') delete t[field]
    else t[field] = value
    onEpisodeChange(ep)
    try {
      await fetch(`/api/${series}/episodes/${name}/segment`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortsIndex, segmentId, segment: target }),
      })
    } catch (e) {
      setError(`segment 저장 실패: ${String(e)}`)
    }
  }

  // 롱폼 구간 스타일 저장 — episode.voiceStyles[구간키]. 낙관적 갱신 + 디스크 PATCH.
  const handleLongformStyleChange = async (value: string) => {
    const key = sectionStyleKey(secKey)
    if (!key) return
    const trimmed = value.trim()
    const ep = JSON.parse(JSON.stringify(episode)) as EpisodeData
    const vs = { ...(ep.voiceStyles ?? {}) }
    if (trimmed) vs[key] = trimmed
    else delete vs[key]
    if (Object.keys(vs).length > 0) ep.voiceStyles = vs
    else delete ep.voiceStyles
    onEpisodeChange(ep)
    try {
      await fetch(`/api/${series}/voice/style/${name}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey: key, value: trimmed || null }),
      })
    } catch (e) {
      setError(`스타일 저장 실패: ${String(e)}`)
    }
  }

  // 스타일 입력 — 로컬 state로 묶고 blur 시 저장 (매 키스트로크 디스크 쓰기 방지)
  const [styleEdit, setStyleEdit] = useState<string>(geminiSpec.stylePrefix ?? '')
  useEffect(() => { setStyleEdit(geminiSpec.stylePrefix ?? '') }, [geminiSpec.stylePrefix])

  return {
    segmentPath,
    segmentMeta,
    effectiveOpts,
    metaSaving,
    metaError,
    handleSegmentMetaChange,
    handleSegmentFieldChange,
    handleLongformStyleChange,
    styleEdit, setStyleEdit,
  }
}
