import { useRef, useState } from 'react'
import type { VoiceFile, EngineKind, SegmentEngineSpec } from '../../voice-utils'
import { encodeWAV, abToBase64, engineSlotPrefix } from '../../voice-utils'
import { type EleSettings, type EleSendOpts, buildEleText } from '../types'
import type { TempPreview, GenEngine } from './types'
import { playDing } from './audio'

type UseVoiceGenerationArgs = {
  series: string
  name: string
  activeFile: VoiceFile | undefined
  chosenEngine: GenEngine
  styleEdit: string
  effectiveOpts: EleSendOpts
  eleSettings: EleSettings
  error: string | null
  setError: (e: string | null) => void
  onActivateEngine?: (engine: EngineKind) => void | Promise<void>
  onRefresh: () => void
}

export function useVoiceGeneration({
  series, name, activeFile, chosenEngine, styleEdit,
  effectiveOpts, eleSettings, error, setError,
  onActivateEngine, onRefresh,
}: UseVoiceGenerationArgs) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(() => activeFile?.duration ?? 0)
  const [trimSaving, setTrimSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  // 생성 중 취소용 — handleGenerate가 채우고 취소 버튼이 abort 한다.
  const genAbortRef = useRef<AbortController | null>(null)
  // 저장된 음원 파형 강제 갱신용 — 저장 시 증가시켜 재생 URL에 붙인다(같은 파일명이라 캐시 우회).
  const [reloadTick, setReloadTick] = useState(0)
  const [tempPreview, setTempPreview] = useState<TempPreview | null>(null)

  // ── 미리듣기 생성 (엔진 분기) ──
  // saveImmediately=true 이면 미리듣기·트림 단계를 건너뛰고 생성된 전체 음원을 바로 슬롯에 저장한다.
  const handleGenerate = async (spec: SegmentEngineSpec, key: string, text: string, opts?: { saveImmediately?: boolean }) => {
    if (!text.trim()) return
    if (genAbortRef.current) return // 이미 생성 진행 중 — 중복 호출 차단(빠른 더블클릭 대비)
    const ac = new AbortController()
    genAbortRef.current = ac
    setGenerating(true)
    setError(null)
    try {
      let res: Response
      let format: 'wav' | 'mp3'
      if (spec.engine === 'elevenlabs') {
        res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({ voiceId: spec.voiceParam, text: buildEleText(text, effectiveOpts), settings: eleSettings }),
        })
        format = 'mp3'
      } else {
        // 패널 입력칸 값(styleEdit)이 있으면 우선 사용 — 쇼츠는 저장되지만 롱폼·인트로는
        // 저장처가 없어 미저장. 그래도 현재 생성 호출에는 즉시 반영해 한 번 들어보고 확정.
        const effectiveStyle = (styleEdit?.trim() || spec.stylePrefix || '').trim()
        const styled = effectiveStyle ? `${effectiveStyle}: ${text}` : text
        // gemini-v3(3.1)는 별도 라우트. 출력 wav는 동일 포맷이라 저장 슬롯은 gemini 공유.
        const route = chosenEngine === 'gemini-v3' ? 'gemini-v3' : 'gemini'
        res = await fetch(`/api/${series}/voice/${route}/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({ voiceName: spec.voiceParam, text: styled }),
        })
        format = 'wav'
      }
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '생성 실패'); return }

      // 생성 및 저장 — 미리듣기/트림을 거치지 않고 전체 음원을 바로 슬롯에 박아 넣는다.
      if (opts?.saveImmediately) {
        const slot = engineSlotPrefix(spec.engine)
        const saveRes = await fetch(`/api/${series}/voice/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode: name, fileName: `${slot}/${key}.wav`, base64: data.base64 }),
        })
        const saveData = await saveRes.json()
        if (!saveData.success) { setError(saveData.error ?? '저장 실패'); return }
        if (tempPreview) { URL.revokeObjectURL(tempPreview.blobUrl); setTempPreview(null) }
        // 방금 저장한 엔진을 활성 슬롯으로 전환 — 안 하면 모달 밖 재생이 옛 활성 음원을 계속 내보낸다.
        await onActivateEngine?.(spec.engine)
        setReloadTick(Date.now())
        playDing() // 자동 재생 대신 완료 '띵' 알림만
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
      // 사용자가 취소(abort)한 경우는 오류로 표시하지 않는다.
      if ((e as Error)?.name === 'AbortError') return
      setError(String(e))
    } finally {
      setGenerating(false)
      genAbortRef.current = null
    }
  }

  // 생성 중 취소 — 진행 중인 미리듣기 합성 요청을 중단한다.
  const handleCancelGenerate = () => genAbortRef.current?.abort()

  // ── 미리듣기 저장 (엔진별 슬롯 폴더 분기) ──
  const handleSavePreview = async (key: string) => {
    if (!tempPreview || tempPreview.key !== key) return
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
      const slot = engineSlotPrefix(tempPreview.engine)
      const res = await fetch(`/api/${series}/voice/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: `${slot}/${key}.wav`, base64: saveBase64 }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '저장 실패'); return }
      // 방금 저장한 엔진을 활성 슬롯으로 전환 — 모달 밖 재생이 새 음원을 내보내게 한다.
      await onActivateEngine?.(tempPreview.engine)
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

  const saveTrimmed = async () => {
    const f = activeFile
    if (!f) return
    const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
    if (!isTrimmed) return
    setTrimSaving(true)
    try {
      const url = `/api/${series}/voice/play/${name}/${f.name}`
      const resp = await fetch(url)
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
      const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
      const base64 = abToBase64(wavBuf)
      await audioCtx.close()
      await fetch(`/api/${series}/voice/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: f.name, base64 }),
      })
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
