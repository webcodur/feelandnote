import { useRef, useState } from 'react'
import type { SegmentEngineSpec, VoiceFile } from '../../../../../../voice-utils'
import { encodeWAV, abToBase64 } from '../../../../../../voice-utils'
import type { TempPreview, GenEngine } from '../../../../../../scenario-voice/ExpandedVoicePanel/types'
import { playDing } from '../../../../../../scenario-voice/ExpandedVoicePanel/audio'
import { buildEleText } from '../../../../../../scenario-voice/types'

/**
 * 북리커맨드 useVoiceGeneration 의 세력도 어댑터(통째 복제 후 데이터 연결부만 교체).
 *
 * 차이는 단 두 군데뿐 — 화면(미리듣기·트림·저장 UI)은 동일하게 유지된다:
 *  1. 저장 라우트: 북리커맨드 `/voice/save`(에피소드 + 엔진 슬롯 폴더) →
 *     세력도 `/faction-voice/{episode}/save`(인물 파일 하나, 슬롯 폴더 없음).
 *  2. 저장된 음원 재생/트림 소스: 북리커맨드 `/voice/play/{name}/{file}` →
 *     세력도 `/faction-voice/{episode}/{file}`.
 *
 * 미리듣기 합성 라우트(gemini/gemini-v3/elevenlabs preview)는 series=faction 으로
 * 그대로 재사용한다(북리커맨드와 동일 경로).
 */

type UseFactionVoiceGenerationArgs = {
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav) — 저장·재생 대상 */
  voiceFile: string
  /** 저장된 음원 메타(존재·길이) — 트림 초기값·트림 저장 소스 */
  activeFile: VoiceFile | undefined
  chosenEngine: GenEngine
  /** Gemini 발화 스타일 prefix — 비어 있으면 미적용. 인물 quoteStyle 에서 받아 미리듣기·생성 호출에 prefix 로 붙인다. */
  styleEdit: string
  /** ELE 감정/강도 (인물 quoteEleOptions) — elevenlabs preview/save 호출에 settings 로 전달. 미지정 필드는 라우트 기본값. */
  eleOptions?: { stability?: number; style?: number }
  /** ELE 감정 태그 (인물 quoteEleEmotions, 0~2개) — 본문 앞에 "[tag1, tag2] " 로 삽입. 비면 미삽입. */
  eleEmotions?: string[]
  /** ELE 끝 패딩 (인물 quoteEleTrail) — 본문 끝에 ' ... ... ...' 추가. 미지정이면 추가(기본 켜짐). */
  eleTrail?: boolean
  error: string | null
  setError: (e: string | null) => void
  /** 미리듣기/트림 저장 후 음성 목록 재조회(존재·길이 갱신) */
  onRefresh: () => void
  /**
   * 음원 저장 직후 호출 — 저장된 wav 실측 길이(초)를 전달한다.
   * 호출 측이 인물 quoteDuration 에 기록해 렌더(컷 길이·음성 재생)를 이 음원에 맞춘다.
   * 이 값이 없으면 렌더가 음성을 띄우지 못하고 컷을 글자 수로만 잡아 "안 읽고 넘어가는" 증상이 난다.
   */
  onSaved?: (durationSec: number) => void
}

export function useFactionVoiceGeneration({
  series, episodeName, voiceFile, activeFile, chosenEngine, styleEdit, eleOptions,
  eleEmotions, eleTrail, error, setError, onRefresh, onSaved,
}: UseFactionVoiceGenerationArgs) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(() => activeFile?.duration ?? 0)
  const [trimSaving, setTrimSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const genAbortRef = useRef<AbortController | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [tempPreview, setTempPreview] = useState<TempPreview | null>(null)

  // ── 미리듣기 생성 (엔진 분기) ──
  const handleGenerate = async (spec: SegmentEngineSpec, key: string, text: string, opts?: { saveImmediately?: boolean }) => {
    if (!text.trim()) return
    if (genAbortRef.current) return
    const ac = new AbortController()
    genAbortRef.current = ac
    setGenerating(true)
    setError(null)
    try {
      let res: Response
      let format: 'wav' | 'mp3'
      if (spec.engine === 'elevenlabs') {
        // 인물 감정/강도(quoteEleOptions)를 settings 로 전달. 지정 필드만 보내고 나머지는 라우트 기본값.
        const settings = eleOptions && (typeof eleOptions.stability === 'number' || typeof eleOptions.style === 'number')
          ? { stability: eleOptions.stability, style: eleOptions.style }
          : undefined
        // 감정 태그·끝 패딩은 본문 text 에 삽입(북리커맨드 buildEleText 와 동일 규칙).
        // 감정은 태그가 1개 이상일 때만 켜고, 끝 패딩은 인물 quoteEleTrail(미지정=켜짐)을 따른다.
        const emotions = eleEmotions ?? []
        const eleText = buildEleText(text, {
          emotionEnabled: emotions.length > 0,
          emotions,
          trailEnabled: eleTrail ?? true,
        })
        res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({ voiceId: spec.voiceParam, text: eleText, settings }),
        })
        format = 'mp3'
      } else {
        // 패널 스타일 입력칸 값을 prefix 로 붙인다(저장처 없이 현재 생성 호출에만 반영 — 북리커맨드 롱폼과 동일).
        const effectiveStyle = (styleEdit?.trim() || spec.stylePrefix || '').trim()
        const styled = effectiveStyle ? `${effectiveStyle}: ${text}` : text
        // gemini-v3(3.1)는 별도 라우트. 출력 wav 는 동일 포맷이라 저장 슬롯 없이 공유.
        const route = chosenEngine === 'gemini-v3' ? 'gemini-v3' : 'gemini'
        res = await fetch(`/api/${series}/voice/${route}/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({ voiceName: spec.voiceParam, text: styled }),
        })
        format = 'wav'
      }
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '생성 실패'); return }

      // 생성 및 저장 — 미리듣기/트림 없이 전체 음원을 바로 인물 파일에 박는다.
      if (opts?.saveImmediately) {
        const saveRes = await fetch(`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: voiceFile, base64: data.base64 }),
        })
        const saveData = await saveRes.json()
        if (!saveData.success) { setError(saveData.error ?? '저장 실패'); return }
        if (typeof saveData.duration === 'number' && saveData.duration > 0) onSaved?.(saveData.duration)
        if (tempPreview) { URL.revokeObjectURL(tempPreview.blobUrl); setTempPreview(null) }
        setReloadTick(Date.now())
        playDing()
        onRefresh()
        return
      }

      const rawBytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
      const blob = new Blob([rawBytes], { type: mime })
      const blobUrl = URL.createObjectURL(blob)
      const duration = await new Promise<number>((resolve, reject) => {
        const a = new Audio(blobUrl)
        a.addEventListener('loadedmetadata', () => resolve(a.duration), { once: true })
        a.addEventListener('error', () => reject(new Error('audio load failed')), { once: true })
      })
      if (tempPreview) URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview({ engine: spec.engine, key, blobUrl, base64: data.base64, duration, format })
      setTrimStart(0)
      setTrimEnd(duration)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setError(String(e))
    } finally {
      setGenerating(false)
      genAbortRef.current = null
    }
  }

  const handleCancelGenerate = () => genAbortRef.current?.abort()

  // ── 미리듣기 저장 (인물 파일 하나) ──
  const handleSavePreview = async () => {
    if (!tempPreview) return
    setTrimSaving(true)
    try {
      const isTrimmed = trimStart > 0.01 || trimEnd < tempPreview.duration - 0.01
      let saveBase64 = tempPreview.base64
      if (isTrimmed) {
        const resp = await fetch(tempPreview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
        saveBase64 = abToBase64(wavBuf)
        await audioCtx.close()
      }
      const res = await fetch(`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: voiceFile, base64: saveBase64 }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '저장 실패'); return }
      if (typeof data.duration === 'number' && data.duration > 0) onSaved?.(data.duration)
      URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview(null)
      setReloadTick(Date.now())
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  // ── 저장된 음원 트림 저장 ──
  const saveTrimmed = async () => {
    const f = activeFile
    if (!f) return
    const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
    if (!isTrimmed) return
    setTrimSaving(true)
    try {
      const url = `/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(f.name)}`
      const resp = await fetch(url)
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
      const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
      const base64 = abToBase64(wavBuf)
      await audioCtx.close()
      const saveRes = await fetch(`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: f.name, base64 }),
      })
      const saveData = await saveRes.json().catch(() => ({}))
      // 트림으로 길이가 줄었으니 인물 quoteDuration 도 새 길이로 갱신한다(컷 길이·음성 재생 동기화).
      if (typeof saveData.duration === 'number' && saveData.duration > 0) onSaved?.(saveData.duration)
      setTrimStart(0)
      setTrimEnd(trimEnd - trimStart)
      setReloadTick(Date.now())
      onRefresh()
    } catch (e) {
      alert('트림 저장 실패: ' + String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  return {
    trimStart, setTrimStart,
    trimEnd, setTrimEnd,
    trimSaving,
    generating,
    error,
    reloadTick,
    tempPreview, setTempPreview,
    handleGenerate,
    handleCancelGenerate,
    handleSavePreview,
    saveTrimmed,
  }
}
