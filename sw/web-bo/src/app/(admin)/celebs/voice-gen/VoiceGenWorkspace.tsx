'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Star, Play, Pause, Loader2, Check, Volume2, Upload, Scissors,
  ChevronDown, ChevronRight, Save, Zap, X, Download,
} from 'lucide-react'
import {
  generateVoicePreview,
  uploadVoiceFromPreview,
  bumpVoiceVersion,
  fetchVoiceFile,
  enableHasVoice,
  saveVoiceId,
  saveQuote,
  type VoiceGenCeleb,
} from '@/actions/admin/voice-gen'
import { saveCelebDialogues, updateSpeechTone, updateVoiceSpeed, type DialogueLines } from '@/actions/admin/dialogues'
import { getVoiceStatus } from '@/actions/admin/voice'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import { useToast } from '@/contexts/ToastContext'
import { DIALOGUE_TYPES, TYPE_LABELS } from '@/lib/voice-path'

const SPEECH_TONES = ['loyal', 'composed', 'bold', 'humble', 'gentle', 'free'] as const
const VOICE_GEN_SEARCH_PLACEHOLDER =
  '\uC140\uB7FD \uC774\uB984 \uAC80\uC0C9 \uD6C4 Enter\uB85C \uC791\uC5C5 \uB300\uC0C1 \uC120\uD0DD'
const VOICE_GEN_EMPTY_MESSAGE = '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'
const VOICE_BADGE_LABEL = '\uC74C\uC131'
const VOICE_ON_BADGE_LABEL = '\uC74C\uC131 ON'
const PREVIEW_PLAY_LABEL = '\uD504\uB9AC\uBDF0 \uC7AC\uC0DD'
const DELETE_LABEL = '\uC0AD\uC81C'
const SAVE_DONE_LABEL = '\uC800\uC7A5 \uC644\uB8CC'
const SAVE_FAIL_LABEL = '\uC800\uC7A5 \uC2E4\uD328'
const PLAY_FAIL_LABEL = '\uC7AC\uC0DD \uC2E4\uD328'
const GENERATE_FAIL_LABEL = '\uC0DD\uC131 \uC2E4\uD328'
const UPLOAD_FAIL_LABEL = '\uC5C5\uB85C\uB4DC \uC2E4\uD328'
const INPUT_VOICE_ID_LABEL = 'Voice ID\uB97C \uC785\uB825\uD558\uC138\uC694'
const ENTER_VOICE_ID_FIRST_LABEL = 'Voice ID ({locale})\uB97C \uBA3C\uC800 \uC785\uB825\uD558\uC138\uC694'
const VOICE_ID_SAVED_LABEL = 'Voice ID ({locale}) \uC800\uC7A5 \uC644\uB8CC'
const EMPTY_TTS_TEXT_LABEL = 'TTS \uD14D\uC2A4\uD2B8\uAC00 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.'
const PREVIEW_DONE_LABEL = '\uD504\uB9AC\uBDF0 \uC0DD\uC131'
const UPLOAD_DONE_LABEL = '{key} R2 \uC5C5\uB85C\uB4DC \uC644\uB8CC'
const BATCH_GENERATE_LABEL = '\uC804\uCCB4 \uC0DD\uC131'
const RESET_DEFAULTS_LABEL = '\uAE30\uBCF8\uAC12 \uBCF5\uC6D0'
const DIALOGUE_EDITOR_LABEL = '\uB300\uC0AC \uD3B8\uC9D1 + TTS'
const SAVE_BUTTON_LABEL = '\uC800\uC7A5'
const DIALOGUE_INPUT_PLACEHOLDER = '\uB300\uC0AC \uC785\uB825...'
const EXISTING_VOICE_PLAY_LABEL = '\uAE30\uC874 \uC74C\uC131 \uC7AC\uC0DD'
const NO_SAVED_VOICE_LABEL = '\uC800\uC7A5\uB41C \uC74C\uC131 \uC5C6\uC74C'
const GENERATE_PREVIEW_LABEL = 'TTS \uC0DD\uC131 (\uD504\uB9AC\uBDF0)'
const DOWNLOAD_LABEL = '다운로드'
const DOWNLOAD_FAIL_LABEL = '다운로드 실패'
const QUOTE_LABEL = '\uBA85\uC5B8'
const QUOTE_INPUT_PLACEHOLDER = '\uBA85\uC5B8 \uC785\uB825...'
const SELECT_CELEB_FIRST_LABEL =
  '\uC0C1\uB2E8\uC5D0\uC11C \uC140\uB7FD\uC744 \uAC80\uC0C9\uD558\uACE0 \uC120\uD0DD\uD558\uC138\uC694'

type Locale = 'ko' | 'en'

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  speed: number
  volumeBoost: number
}

const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  speed: 1.0,
  volumeBoost: 0,
}

interface Preview {
  blobUrl: string
  base64: string
  bytes: number
  duration: number
  trimStart: number
  trimEnd: number
  boostedBlobUrl?: string
  boostedBase64?: string
  boostDb?: number
}

/** AudioBuffer에 gain(dB) 적용 + 리미터로 클리핑 방지 → 새 AudioBuffer 반환 */
async function applyGain(buf: AudioBuffer, gainDb: number): Promise<AudioBuffer> {
  if (gainDb <= 0) return buf
  const ratio = Math.pow(10, gainDb / 20)
  const offCtx = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate)
  const src = offCtx.createBufferSource()
  src.buffer = buf
  const gain = offCtx.createGain()
  gain.gain.value = ratio
  // 리미터: 클리핑 방지용 컴프레서
  const limiter = offCtx.createDynamicsCompressor()
  limiter.threshold.value = -6   // -6dB부터 압축 (여유 확보)
  limiter.knee.value = 6         // 소프트 니 (자연스러운 전환)
  limiter.ratio.value = 20       // 거의 리미터
  limiter.attack.value = 0.003   // 약간 느린 어택 (트랜지언트 보존)
  limiter.release.value = 0.15   // 자연스러운 릴리즈
  src.connect(gain)
  gain.connect(limiter)
  limiter.connect(offCtx.destination)
  src.start(0)
  return offCtx.startRendering()
}

/** PCM → WAV 인코딩 (트리밍 구간) */
function encodeWAV(buf: AudioBuffer, startSec: number, endSec: number): ArrayBuffer {
  const sr = buf.sampleRate
  const s0 = Math.round(startSec * sr)
  const s1 = Math.round(endSec * sr)
  const len = s1 - s0
  const ch = buf.numberOfChannels
  const bps = 2
  const dataLen = len * ch * bps
  const ab = new ArrayBuffer(44 + dataLen)
  const v = new DataView(ab)
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, ch, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * ch * bps, true); v.setUint16(32, ch * bps, true)
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, dataLen, true)
  let off = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const sample = Math.max(-1, Math.min(1, buf.getChannelData(c)[s0 + i]))
      v.setInt16(off, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      off += 2
    }
  }
  return ab
}

function abToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

// 파형 컴포넌트 (트리밍 핸들 + 플레이헤드)
function Waveform({ blobUrl, duration, trimStart, trimEnd, onTrimChange, isPlaying }: {
  blobUrl: string
  duration: number
  trimStart: number
  trimEnd: number
  onTrimChange?: (start: number, end: number) => void
  isPlaying?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  // 파형 그리기
  useEffect(() => {
    if (!blobUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    fetch(blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => new AudioContext().decodeAudioData(buf))
      .then((audioBuffer) => {
        const data = audioBuffer.getChannelData(0)
        const barCount = Math.floor(canvas.width / 2)
        const step = Math.floor(data.length / barCount)
        const amp = canvas.height / 2
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const h = Math.max(1, (sum / step) * amp * 2)
          ctx.fillStyle = 'rgb(99 102 241 / 0.7)'
          ctx.fillRect(i * 2, amp - h / 2, 1.5, h)
        }
      })
      .catch(() => {})
  }, [blobUrl])

  // 플레이헤드 CSS transition 애니메이션
  useEffect(() => {
    const el = playheadRef.current
    if (!el) return
    if (isPlaying && duration > 0) {
      const sPct = (trimStart / duration) * 100
      const ePct = (trimEnd / duration) * 100
      el.style.transition = 'none'
      el.style.left = `${sPct}%`
      el.style.display = 'block'
      // force reflow
      void el.offsetHeight
      el.style.transition = `left ${trimEnd - trimStart}s linear`
      el.style.left = `${ePct}%`
    } else {
      el.style.transition = 'none'
      el.style.display = 'none'
    }
  }, [isPlaying, trimStart, trimEnd, duration])

  // 컨테이너 클릭으로 가까운 핸들 드래그 시작
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onTrimChange || !containerRef.current || duration <= 0) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * duration
    const t0 = calcT(e.clientX)

    // 가까운 핸들 결정
    const handle = Math.abs(t0 - trimStart) < Math.abs(t0 - trimEnd) ? 'start' : 'end'

    // 최신 값 추적용
    let curStart = trimStart
    let curEnd = trimEnd

    const apply = (cx: number) => {
      const t = calcT(cx)
      if (handle === 'start') {
        curStart = Math.max(0, Math.min(t, curEnd - 0.02))
        onTrimChange(curStart, curEnd)
      } else {
        curEnd = Math.min(duration, Math.max(t, curStart + 0.02))
        onTrimChange(curStart, curEnd)
      }
    }

    apply(e.clientX)

    const onMove = (ev: PointerEvent) => apply(ev.clientX)
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [onTrimChange, duration, trimStart, trimEnd])

  const sPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const ePct = duration > 0 ? (trimEnd / duration) * 100 : 100

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 select-none touch-none ${onTrimChange ? 'cursor-ew-resize' : ''}`}
      onPointerDown={onTrimChange ? handlePointerDown : undefined}
    >
      <canvas ref={canvasRef} width={400} height={36} className="w-full h-9 rounded bg-bg-secondary" />
      {/* 플레이헤드 (재생 위치) */}
      <div ref={playheadRef} className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-20 pointer-events-none" style={{ display: 'none' }} />
      {duration > 0 && (
        <>
          {/* 트림 오버레이 */}
          {sPct > 0.5 && (
            <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l pointer-events-none" style={{ width: `${sPct}%` }} />
          )}
          {ePct < 99.5 && (
            <div className="absolute inset-y-0 right-0 bg-red-900/40 rounded-r pointer-events-none" style={{ width: `${100 - ePct}%` }} />
          )}
          {/* 트림 핸들 (시각 전용, 이벤트는 컨테이너에서 처리) */}
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${sPct}%` }} />
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${ePct}%` }} />
        </>
      )}
    </div>
  )
}

// 설정 슬라이더 (외부 정의 - 내부 정의 시 매 렌더마다 리마운트)
function SliderField({ label, value, onChange, min = 0, max = 1, step = 0.05, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-text-secondary w-20 shrink-0">{label}</label>
      <span className="text-xs font-mono text-text-primary w-10 shrink-0 text-right">{suffix ? `${value}${suffix}` : value.toFixed(2)}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-bg-secondary accent-accent cursor-pointer"
      />
    </div>
  )
}

// 메인 컴포넌트
interface Props {
  celebs: VoiceGenCeleb[]
  initialSlug?: string
}

export default function VoiceGenWorkspace({ celebs, initialSlug }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  // 셀럽 선택
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = celebs.find((c) => c.id === selectedId) ?? null

  // Voice ID 입력
  const [voiceIdKo, setVoiceIdKo] = useState('')
  const [voiceIdEn, setVoiceIdEn] = useState('')

  // 설정
  const [locale, setLocale] = useState<Locale>('ko')
  const [settings, setSettings] = useState<VoiceSettings>({ ...DEFAULT_SETTINGS })

  // 생성 상태
  const [generating, setGenerating] = useState<string | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)

  // 프리뷰(생성 결과)
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  // R2 기존 파일 존재 여부: key = "ko/greeting-1", "en/quote" 등
  const [voiceFiles, setVoiceFiles] = useState<Record<string, boolean>>({})
  const [voiceFilesLoading, setVoiceFilesLoading] = useState(false)
  // 업로드 중
  const [uploading, setUploading] = useState<string | null>(null)

  // 오디오
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 아코디언 토글
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(DIALOGUE_TYPES))

  // TTS 전송용 텍스트
  const [ttsTexts, setTtsTexts] = useState<Record<string, string>>({})

  // 대사 편집 (DB 저장용)
  const [editDialogues, setEditDialogues] = useState<Record<string, string>>({})
  const [editQuotes, setEditQuotes] = useState<Record<string, string>>({})
  const [speechTone, setSpeechTone] = useState('')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [dialogueSaving, setDialogueSaving] = useState(false)

  /** 셀럽 데이터로 모든 편집 상태 초기화 */
  function initEditState(celeb: VoiceGenCeleb) {
    const texts: Record<string, string> = {}
    const dialogues: Record<string, string> = {}
    for (const loc of ['ko', 'en'] as const) {
      const lines = loc === 'ko' ? celeb.dialogue_lines : celeb.dialogue_lines_en
      if (lines) {
        for (const type of DIALOGUE_TYPES) {
          const arr = lines[type]
          if (!arr) continue
          for (let i = 0; i < arr.length; i++) {
            const key = `${loc}/${type}-${i + 1}`
            dialogues[key] = arr[i] || ''
            if (arr[i]?.trim()) texts[key] = arr[i]
          }
        }
      }
      for (const type of DIALOGUE_TYPES) {
        for (let i = 0; i < 3; i++) {
          const key = `${loc}/${type}-${i + 1}`
          if (!(key in dialogues)) dialogues[key] = ''
        }
      }
      const quote = loc === 'ko'
        ? (celeb.dialogue_lines as any)?.quote ?? ''
        : (celeb.dialogue_lines_en as any)?.quote ?? ''
      if (quote?.trim()) texts[`${loc}/quote`] = quote
    }
    setTtsTexts(texts)
    setEditDialogues(dialogues)
    setEditQuotes({
      ko: (celeb.dialogue_lines as any)?.quote ?? '',
      en: (celeb.dialogue_lines_en as any)?.quote ?? '',
    })
    setSpeechTone(celeb.speech_tone || 'free')
    setVoiceSpeed(celeb.voice_speed ?? 1.0)
  }

  function setTtsText(key: string, value: string) {
    setTtsTexts((prev) => ({ ...prev, [`${locale}/${key}`]: value }))
  }

  function setEditDialogue(key: string, value: string) {
    const fullKey = `${locale}/${key}`
    setEditDialogues((prev) => ({ ...prev, [fullKey]: value }))
    setTtsTexts((prev) => ({ ...prev, [fullKey]: value }))
  }

  /** blob URL 정리 */
  function clearPreview(fullKey: string) {
    setPreviews((prev) => {
      const p = prev[fullKey]
      if (p) URL.revokeObjectURL(p.blobUrl)
      const next = { ...prev }
      delete next[fullKey]
      return next
    })
  }

  /** 트림 범위 업데이트 */
  function updateTrim(fullKey: string, start: number, end: number) {
    setPreviews((prev) => prev[fullKey] ? { ...prev, [fullKey]: { ...prev[fullKey], trimStart: start, trimEnd: end } } : prev)
  }

  /** 대사 + 명언 + speech_tone DB 저장 */
  const handleSaveDialogues = useCallback(async () => {
    if (!selected) return
    setDialogueSaving(true)

    const buildLines = (loc: string): DialogueLines => {
      const result: Record<string, unknown> = {}
      for (const type of DIALOGUE_TYPES) {
        result[type] = [
          editDialogues[`${loc}/${type}-1`] || '',
          editDialogues[`${loc}/${type}-2`] || '',
          editDialogues[`${loc}/${type}-3`] || '',
        ]
      }
      result.quote = editQuotes[loc] ?? ''
      return result as unknown as DialogueLines
    }

    try {
      await saveCelebDialogues(selected.id, buildLines('ko'), buildLines('en'))
      if (speechTone !== (selected.speech_tone || '')) {
        await updateSpeechTone(selected.id, speechTone)
      }
      showToast('success', SAVE_DONE_LABEL)
    } catch (err) {
      showToast('error', `${SAVE_FAIL_LABEL}: ${String(err)}`)
    }
    setDialogueSaving(false)
  }, [selected, editDialogues, editQuotes, speechTone, showToast])

  // 셀럽 선택 핸들러
  const selectCeleb = useCallback((celeb: VoiceGenCeleb, pushUrl = true) => {
    // 기존 프리뷰 정리
    setPreviews((prev) => {
      Object.values(prev).forEach((p) => URL.revokeObjectURL(p.blobUrl))
      return {}
    })
    setSelectedId(celeb.id)
    setVoiceIdKo(celeb.voice_id_ko || '')
    setVoiceIdEn(celeb.voice_id_en || '')
    setVoiceFiles({})
    setPlaying(null)
    audioRef.current?.pause()
    initEditState(celeb)
    // URL 변경
    if (pushUrl && celeb.slug) {
      router.push(`/celebs/voice-gen/${celeb.slug}`, { scroll: false })
    }
    // R2 파일 존재 여부 + voice_v 로드
    setVoiceFilesLoading(true)
    getVoiceStatus(celeb.id).then(({ files }) => {
      setVoiceFiles(files)
      setVoiceFilesLoading(false)
    }).catch(() => setVoiceFilesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // initialSlug로 자동 선택
  const initialCeleb = useMemo(
    () => initialSlug ? celebs.find((c) => c.slug === initialSlug) : null,
    [initialSlug, celebs],
  )
  const didInit = useRef(false)
  useEffect(() => {
    if (initialCeleb && !didInit.current) {
      didInit.current = true
      selectCeleb(initialCeleb, false)
    }
  }, [initialCeleb, selectCeleb])

  // 액션 핸들러

  const handleSaveVoiceId = useCallback(async (loc: Locale) => {
    if (!selected) return
    const vid = loc === 'ko' ? voiceIdKo : voiceIdEn
    if (!vid.trim()) return showToast('error', INPUT_VOICE_ID_LABEL)
    const result = await saveVoiceId(selected.id, loc, vid.trim())
    if (result.success) {
      showToast('success', VOICE_ID_SAVED_LABEL.replace('{locale}', loc.toUpperCase()))
    } else {
      showToast('error', result.error || SAVE_FAIL_LABEL)
    }
  }, [selected, voiceIdKo, voiceIdEn, showToast])

  // Web Audio 구간 재생용
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  // 배속 변경 시 재생 중인 HTMLAudioElement에 즉시 반영 (피치 보존)
  useEffect(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.playbackRate = voiceSpeed
    }
  }, [voiceSpeed])

  // 재생 핸들러
  // blobUrl: 로컬 프리뷰 재생 (trim 지원)
  // dialogueType + variant: R2 파일 재생 (서버 경유 CORS 우회)
  const handlePlay = useCallback((key: string, source: { blobUrl: string; trim?: { start: number; end: number } } | { dialogueType: string; variant?: number }) => {
    if (playing === key) {
      sourceRef.current?.stop()
      sourceRef.current = null
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    sourceRef.current?.stop()
    sourceRef.current = null
    audioRef.current?.pause()

    const trim = 'blobUrl' in source ? source.trim : undefined

    // trim 구간 재생은 AudioBufferSourceNode (배속 미적용)
    const playTrimmed = (buf: ArrayBuffer) => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext()
      }
      audioCtxRef.current.decodeAudioData(buf).then((audioBuf) => {
        const ctx = audioCtxRef.current!
        const src = ctx.createBufferSource()
        src.buffer = audioBuf
        src.connect(ctx.destination)
        src.onended = () => { sourceRef.current = null; setPlaying(null) }
        src.start(0, trim!.start, trim!.end - trim!.start)
        sourceRef.current = src
        setPlaying(key)
      }).catch(() => { showToast('error', PLAY_FAIL_LABEL); setPlaying(null) })
    }

    // 전체 재생은 HTMLAudioElement (preservesPitch로 피치 보존 배속)
    const playWithHtmlAudio = (url: string) => {
      const audio = new Audio(url)
      audio.preservesPitch = true
      audio.playbackRate = voiceSpeed
      audio.onended = () => { audioRef.current = null; setPlaying(null) }
      audio.onerror = () => { audioRef.current = null; showToast('error', PLAY_FAIL_LABEL); setPlaying(null) }
      audio.play().catch(() => { showToast('error', PLAY_FAIL_LABEL); setPlaying(null) })
      audioRef.current = audio
      setPlaying(key)
    }

    if ('blobUrl' in source) {
      if (trim && (trim.start > 0 || trim.end < Infinity)) {
        fetch(source.blobUrl).then((r) => r.arrayBuffer()).then(playTrimmed)
          .catch(() => { showToast('error', PLAY_FAIL_LABEL); setPlaying(null) })
      } else {
        playWithHtmlAudio(source.blobUrl)
      }
    } else {
      if (!selected) return
      setPlaying(key)
      fetchVoiceFile({ celebId: selected.id, locale, dialogueType: source.dialogueType, variant: source.variant })
        .then((res) => {
          if (!res.success || !res.base64) {
            showToast('error', res.error || PLAY_FAIL_LABEL)
            setPlaying(null)
            return
          }
          const blob = new Blob([Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))], { type: 'audio/mpeg' })
          playWithHtmlAudio(URL.createObjectURL(blob))
        })
        .catch(() => { showToast('error', PLAY_FAIL_LABEL); setPlaying(null) })
    }
  }, [playing, selected, locale, voiceSpeed, showToast])

  // 단일 생성 (프리뷰)
  const handleGenerate = useCallback(async (type: string, variant: number | undefined) => {
    if (!selected) return
    const vid = locale === 'ko' ? voiceIdKo : voiceIdEn
    if (!vid.trim()) {
      return showToast('error', ENTER_VOICE_ID_FIRST_LABEL.replace('{locale}', locale.toUpperCase()))
    }

    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${locale}/${key}`
    const text = ttsTexts[fullKey] || ''
    if (!text.trim()) return showToast('error', EMPTY_TTS_TEXT_LABEL)

    setGenerating(key)

    const result = await generateVoicePreview({ voiceId: vid.trim(), text, settings })

    if (result.success && result.base64) {
      // 기존 프리뷰 정리
      clearPreview(fullKey)

      const rawBytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(rawBytes.buffer.slice(0) as ArrayBuffer)
      const duration = audioBuf.duration

      let finalBase64 = result.base64
      let finalBytes = result.bytes || 0
      let boostDb = 0

      // 볼륨 부스트 적용
      if (settings.volumeBoost > 0) {
        const boosted = await applyGain(audioBuf, settings.volumeBoost)
        const wavBuf = encodeWAV(boosted, 0, boosted.duration)
        finalBase64 = abToBase64(wavBuf)
        finalBytes = wavBuf.byteLength
        boostDb = settings.volumeBoost
      }
      await audioCtx.close()

      const blob = new Blob(
        [Uint8Array.from(atob(finalBase64), (c) => c.charCodeAt(0))],
        { type: boostDb > 0 ? 'audio/wav' : 'audio/mpeg' },
      )
      const blobUrl = URL.createObjectURL(blob)

      setPreviews((prev) => ({
        ...prev,
        [fullKey]: { blobUrl, base64: finalBase64, bytes: finalBytes, duration, trimStart: 0, trimEnd: duration, boostDb },
      }))
      showToast('success', `${PREVIEW_DONE_LABEL} (${(finalBytes / 1024).toFixed(0)}KB, ${duration.toFixed(1)}s${boostDb > 0 ? `, +${boostDb}dB` : ''})`)
    } else {
      showToast('error', result.error || GENERATE_FAIL_LABEL)
    }
    setGenerating(null)
  }, [selected, locale, voiceIdKo, voiceIdEn, settings, ttsTexts, showToast])

  // 프리뷰를 R2 업로드
  const handleUpload = useCallback(async (type: string, variant: number | undefined) => {
    if (!selected) return
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${locale}/${key}`
    const preview = previews[fullKey]
    if (!preview) return

    setUploading(key)

    // 부스트 적용된 경우 이미 WAV
    let uploadBase64 = preview.base64
    let contentType = preview.boostDb && preview.boostDb > 0 ? 'audio/wav' : 'audio/mpeg'
    const isTrimmed = preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01
    if (isTrimmed) {
      try {
        const resp = await fetch(preview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, preview.trimStart, preview.trimEnd)
        uploadBase64 = abToBase64(wavBuf)
        contentType = 'audio/wav'
        await audioCtx.close()
      } catch (err) {
        showToast('error', `트림 인코딩 실패: ${String(err)}`)
        setUploading(null)
        return
      }
    }

    try {
      const result = await uploadVoiceFromPreview({
        celebId: selected.id,
        base64: uploadBase64,
        locale,
        dialogueType: type,
        variant,
        contentType,
      })

      if (result.success && result.url) {
        await bumpVoiceVersion(selected.id)
        setVoiceFiles((prev) => ({ ...prev, [fullKey]: true }))
        clearPreview(fullKey)
        showToast('success', UPLOAD_DONE_LABEL.replace('{key}', key))

        if (!selected.has_voice) {
          await enableHasVoice(selected.id)
        }
      } else {
        showToast('error', result.error || UPLOAD_FAIL_LABEL)
      }
    } catch (err) {
      showToast('error', `업로드 실패: ${String(err)}`)
    }
    setUploading(null)
  }, [selected, locale, previews, showToast])

  // R2 기존 파일 다운로드
  const [downloading, setDownloading] = useState<string | null>(null)
  const handleDownload = useCallback(async (type: string, variant: number | undefined) => {
    if (!selected) return
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    setDownloading(key)
    try {
      const result = await fetchVoiceFile({ celebId: selected.id, locale, dialogueType: type, variant })
      if (!result.success || !result.base64) throw new Error(result.error || '파일 없음')
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected.slug || selected.id}_${locale}_${key}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast('error', `${DOWNLOAD_FAIL_LABEL}: ${String(err)}`)
    }
    setDownloading(null)
  }, [selected, locale, showToast])

  // 기존 R2 파일을 프리뷰로 로드 (트림 편집용, 서버 경유 CORS 우회)
  const [loadingExisting, setLoadingExisting] = useState<string | null>(null)
  const handleLoadExisting = useCallback(async (type: string, variant: number | undefined) => {
    if (!selected) return
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${locale}/${key}`

    setLoadingExisting(key)
    try {
      const result = await fetchVoiceFile({ celebId: selected.id, locale, dialogueType: type, variant })
      if (!result.success || !result.base64) throw new Error(result.error || '파일 없음')

      const blob = new Blob(
        [Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))],
        { type: 'audio/mpeg' },
      )
      const blobUrl = URL.createObjectURL(blob)

      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await blob.arrayBuffer())
      const duration = audioBuf.duration
      await audioCtx.close()

      clearPreview(fullKey)
      setPreviews((prev) => ({
        ...prev,
        [fullKey]: { blobUrl, base64: result.base64!, bytes: result.bytes || 0, duration, trimStart: 0, trimEnd: duration },
      }))
    } catch (err) {
      showToast('error', `로드 실패: ${String(err)}`)
    }
    setLoadingExisting(null)
  }, [selected, locale, showToast])

  // 전체 생성 (배치: 프리뷰 없이 직접 업로드)
  const handleBatchGenerate = useCallback(async () => {
    if (!selected) return
    const vid = locale === 'ko' ? voiceIdKo : voiceIdEn
    if (!vid.trim()) {
      return showToast('error', ENTER_VOICE_ID_FIRST_LABEL.replace('{locale}', locale.toUpperCase()))
    }

    setBatchRunning(true)
    let ok = 0, fail = 0

    for (const type of DIALOGUE_TYPES) {
      for (let i = 0; i < 3; i++) {
        const key = `${type}-${i + 1}`
        const fullKey = `${locale}/${key}`
        const text = ttsTexts[fullKey] || ''
        if (!text.trim()) continue
        setGenerating(key)
        const gen = await generateVoicePreview({ voiceId: vid.trim(), text, settings })
        if (gen.success && gen.base64) {
          let uploadB64 = gen.base64
          let ct = 'audio/mpeg'
          if (settings.volumeBoost > 0) {
            const raw = Uint8Array.from(atob(gen.base64), (c) => c.charCodeAt(0))
            const actx = new AudioContext()
            const abuf = await actx.decodeAudioData(raw.buffer.slice(0) as ArrayBuffer)
            const boosted = await applyGain(abuf, settings.volumeBoost)
            const wav = encodeWAV(boosted, 0, boosted.duration)
            uploadB64 = abToBase64(wav)
            ct = 'audio/wav'
            await actx.close()
          }
          const up = await uploadVoiceFromPreview({
            celebId: selected.id, base64: uploadB64, locale, dialogueType: type, variant: i + 1, contentType: ct,
          })
          if (up.success) {
            setVoiceFiles((prev) => ({ ...prev, [fullKey]: true }))
            ok++
          } else { fail++ }
        } else { fail++ }
        await new Promise((r) => setTimeout(r, 800))
      }
    }

    // quote
    const quoteText = ttsTexts[`${locale}/quote`] || ''
    if (quoteText.trim()) {
      setGenerating('quote')
      const gen = await generateVoicePreview({ voiceId: vid.trim(), text: quoteText, settings })
      if (gen.success && gen.base64) {
        let uploadB64 = gen.base64
        let ct = 'audio/mpeg'
        if (settings.volumeBoost > 0) {
          const raw = Uint8Array.from(atob(gen.base64), (c) => c.charCodeAt(0))
          const actx = new AudioContext()
          const abuf = await actx.decodeAudioData(raw.buffer.slice(0) as ArrayBuffer)
          const boosted = await applyGain(abuf, settings.volumeBoost)
          const wav = encodeWAV(boosted, 0, boosted.duration)
          uploadB64 = abToBase64(wav)
          ct = 'audio/wav'
          await actx.close()
        }
        const up = await uploadVoiceFromPreview({
          celebId: selected.id, base64: uploadB64, locale, dialogueType: 'quote', contentType: ct,
        })
        if (up.success) {
          setVoiceFiles((prev) => ({ ...prev, [`${locale}/quote`]: true }))
          ok++
        } else { fail++ }
      } else { fail++ }
    }

    // 배치 완료 후 1회 bump (캐시 버스터)
    if (ok > 0) {
      await bumpVoiceVersion(selected.id)
      if (!selected.has_voice) await enableHasVoice(selected.id)
    }

    setGenerating(null)
    setBatchRunning(false)
    showToast(fail === 0 ? 'success' : 'error', `생성 완료: 성공 ${ok}개, 실패 ${fail}개`)
  }, [selected, locale, voiceIdKo, voiceIdEn, settings, ttsTexts, showToast])

  // 프리뷰 행 렌더 (일반 함수 - 컴포넌트로 쓰면 매 렌더마다 리마운트되어 드래그 깨짐)
  function renderPreview(fullKey: string, type: string, variant?: number) {
    const preview = previews[fullKey]
    if (!preview) return null
    const isPlay = playing === `preview:${fullKey}`
    const isUp = uploading === (type === 'quote' ? 'quote' : `${type}-${variant}`)
    const isTrimmed = preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01

    return (
      <div className="ml-6 mt-1 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
        <div className="flex items-center gap-2">
          <Waveform
            blobUrl={preview.blobUrl}
            duration={preview.duration}
            trimStart={preview.trimStart}
            trimEnd={preview.trimEnd}
            onTrimChange={(s, e) => updateTrim(fullKey, s, e)}
            isPlaying={isPlay}
          />
          <button
            type="button"
            onClick={() => handlePlay(`preview:${fullKey}`, { blobUrl: preview.blobUrl, trim: { start: preview.trimStart, end: preview.trimEnd } })}
            className={`p-1 rounded hover:bg-white/10 shrink-0 ${isPlay ? 'text-emerald-400' : 'text-text-tertiary'}`}
            title={PREVIEW_PLAY_LABEL}
          >
            {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => handleUpload(type, variant)}
            disabled={!!isUp}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0"
            title="R2 Upload"
          >
            {isUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload
          </button>
          <a
            href={preview.blobUrl}
            download={`preview_${fullKey.replace('/', '_')}.${preview.boostDb && preview.boostDb > 0 ? 'wav' : 'mp3'}`}
            className="p-1 rounded text-text-tertiary hover:text-blue-400 shrink-0"
            title={DOWNLOAD_LABEL}
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => clearPreview(fullKey)}
            className="p-1 rounded text-text-tertiary hover:text-red-400 shrink-0"
            title={DELETE_LABEL}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-mono">
          <span className={isTrimmed ? 'text-amber-400' : ''}>
            {preview.trimStart.toFixed(2)}s – {preview.trimEnd.toFixed(2)}s
          </span>
          <span>/ {preview.duration.toFixed(2)}s</span>
          <span>· {(preview.bytes / 1024).toFixed(0)}KB</span>
          {isTrimmed && (
            <button type="button" onClick={() => updateTrim(fullKey, 0, preview.duration)}
              className="text-amber-400 hover:text-amber-300">reset</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 상단: 검색바 */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <CelebSearchBar
            items={celebs}
            maxResults={20}
            clearOnSelect
            className="flex-1 max-w-sm"
            placeholder={VOICE_GEN_SEARCH_PLACEHOLDER}
            emptyMessage={VOICE_GEN_EMPTY_MESSAGE}
            onSelect={(celeb) => selectCeleb(celeb)}
            renderSuggestionExtra={(celeb) => (
              <div className="flex items-center gap-1">
                {celeb.has_voice && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400">
                    {VOICE_BADGE_LABEL}
                  </span>
                )}
                {celeb.voice_id_ko && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-blue-500/15 text-blue-400">
                    KO
                  </span>
                )}
                {celeb.voice_id_en && (
                  <span className="px-1 py-px rounded text-[9px] font-medium bg-purple-500/15 text-purple-400">
                    EN
                  </span>
                )}
              </div>
            )}
          />

          {selected && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-bg-secondary rounded-lg border border-border">
              <div className="relative w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {selected.avatar_url ? (
                  <Image src={selected.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <Star className="w-3 h-3 text-yellow-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{selected.nickname}</p>
                <p className="text-[10px] text-text-tertiary">{selected.slug}</p>
              </div>
              {selected.has_voice && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400">
                  {VOICE_ON_BADGE_LABEL}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 워크스페이스 */}
      {!selected ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-text-tertiary">
          <Volume2 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">{SELECT_CELEB_FIRST_LABEL}</p>
        </div>
      ) : (
        <>
          {/* Voice ID */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Voice ID (KO)</label>
                <div className="flex gap-1.5">
                  <input type="text" value={voiceIdKo} onChange={(e) => setVoiceIdKo(e.target.value)}
                    placeholder="ElevenLabs Voice ID"
                    className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => handleSaveVoiceId('ko')}
                    className="px-2 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Voice ID (EN)</label>
                <div className="flex gap-1.5">
                  <input type="text" value={voiceIdEn} onChange={(e) => setVoiceIdEn(e.target.value)}
                    placeholder="ElevenLabs Voice ID"
                    className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-accent" />
                  <button type="button" onClick={() => handleSaveVoiceId('en')}
                    className="px-2 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 설정 패널 */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Voice Settings</h3>
              <div className="flex items-center gap-2">
                <select value={speechTone} onChange={(e) => setSpeechTone(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent">
                  {SPEECH_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  {(['ko', 'en'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLocale(l)}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${locale === l ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={handleBatchGenerate} disabled={batchRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
                  {batchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {BATCH_GENERATE_LABEL} ({locale.toUpperCase()})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <SliderField label="Stability" value={settings.stability} onChange={(v) => setSettings((s) => ({ ...s, stability: v }))} />
              <SliderField label="Similarity" value={settings.similarity_boost} onChange={(v) => setSettings((s) => ({ ...s, similarity_boost: v }))} />
              <SliderField label="Style" value={settings.style} onChange={(v) => setSettings((s) => ({ ...s, style: v }))} />
              <SliderField label="Speed" value={settings.speed} onChange={(v) => setSettings((s) => ({ ...s, speed: v }))} min={0.7} max={1.2} step={0.05} />
              <SliderField label="Vol Boost" value={settings.volumeBoost} onChange={(v) => setSettings((s) => ({ ...s, volumeBoost: v }))} min={0} max={12} step={1} suffix="dB" />
            </div>
            <div className="flex items-center mt-3">
              <button type="button" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}
                className="ml-auto text-xs text-text-tertiary hover:text-text-primary">{RESET_DEFAULTS_LABEL}</button>
            </div>
          </div>

          {/* 대사 목록 */}
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{DIALOGUE_EDITOR_LABEL}</h3>
                {voiceFilesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />}
              </div>
              <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-text-tertiary">재생 배속</span>
                <select value={voiceSpeed} onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setVoiceSpeed(v)
                    if (selected) updateVoiceSpeed(selected.id, v).then(() => showToast('success', `배속 ${v}x 저장`)).catch(() => showToast('error', '배속 저장 실패'))
                  }}
                  className={`bg-bg-secondary border rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:border-accent ${voiceSpeed !== 1.0 ? 'text-amber-400 border-amber-500/30' : 'text-text-primary border-border'}`}>
                  {Array.from({ length: 31 }, (_, i) => +(0.5 + i * 0.05).toFixed(2)).map((v) => (
                    <option key={v} value={v}>{v}x</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleSaveDialogues} disabled={dialogueSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {dialogueSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {SAVE_BUTTON_LABEL}
              </button>
              </div>
            </div>

            {DIALOGUE_TYPES.map((type) => {
              const isExpanded = expandedTypes.has(type)
              const filledCount = [0, 1, 2].filter((i) => editDialogues[`${locale}/${type}-${i + 1}`]?.trim()).length
              return (
                <div key={type} className="border-b border-border last:border-b-0">
                  <button type="button"
                    onClick={() => setExpandedTypes((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next })}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-bg-secondary/50 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-text-tertiary" /> : <ChevronRight className="w-4 h-4 text-text-tertiary" />}
                    <span className="text-sm font-medium text-text-primary">{TYPE_LABELS[type]}</span>
                    <span className="text-xs text-text-tertiary">{filledCount}/3</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-3">
                      {[0, 1, 2].map((i) => {
                        const key = `${type}-${i + 1}`
                        const fullKey = `${locale}/${key}`
                        const editValue = editDialogues[fullKey] ?? ''
                        const ttsValue = ttsTexts[fullKey] ?? editValue
                        const isGen = generating === key
                        const isPlay = playing === fullKey
                        const hasPreview = !!previews[fullKey]
                        const hasFile = voiceFiles[fullKey]

                        return (
                          <div key={i} className="space-y-1">
                            {/* 원본 대사 */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-tertiary font-mono w-4 shrink-0">{i + 1}</span>
                              <input type="text" value={editValue} onChange={(e) => setEditDialogue(key, e.target.value)}
                                className="flex-1 bg-transparent border-b border-border/50 hover:border-border focus:border-accent px-1 py-0.5 text-xs text-text-secondary focus:text-text-primary focus:outline-none"
                                placeholder={DIALOGUE_INPUT_PLACEHOLDER} />
                              {/* 파일 존재 표시 */}
                              {hasFile && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                            </div>
                            {/* TTS 텍스트 + 생성 + 기존 재생 */}
                            {editValue.trim() && (
                              <div className="flex items-center gap-2 ml-6">
                                <input type="text" value={ttsValue} onChange={(e) => setTtsText(key, e.target.value)}
                                  className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
                                  placeholder="TTS text"
                                />
                                {/* 기존 R2 음성 재생 */}
                                <button type="button"
                                  onClick={() => handlePlay(fullKey, { dialogueType: type, variant: i + 1 })}
                                  disabled={!hasFile}
                                  className={`p-1 rounded transition-colors shrink-0 ${
                                    !hasFile ? 'text-text-tertiary/30 cursor-not-allowed' :
                                    isPlay ? 'text-emerald-400 hover:bg-white/10' : 'text-text-tertiary hover:bg-white/10'
                                  }`}
                                  title={hasFile ? EXISTING_VOICE_PLAY_LABEL : NO_SAVED_VOICE_LABEL}>
                                  {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                {/* 기존 파일 다운로드 */}
                                {hasFile && (
                                  <button type="button"
                                    onClick={() => handleDownload(type, i + 1)}
                                    disabled={downloading === key}
                                    className="p-1 rounded hover:bg-blue-500/10 text-text-tertiary hover:text-blue-400 disabled:opacity-30 transition-colors shrink-0"
                                    title={DOWNLOAD_LABEL}>
                                    {downloading === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {/* 기존 파일 트림 편집 */}
                                {hasFile && !hasPreview && (
                                  <button type="button"
                                    onClick={() => handleLoadExisting(type, i + 1)}
                                    disabled={loadingExisting === key}
                                    className="p-1 rounded hover:bg-amber-500/10 text-text-tertiary hover:text-amber-400 disabled:opacity-30 transition-colors shrink-0"
                                    title="트림 편집">
                                    {loadingExisting === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {/* 생성 (프리뷰) */}
                                <button type="button"
                                  onClick={() => handleGenerate(type, i + 1)}
                                  disabled={!ttsValue?.trim() || isGen || batchRunning}
                                  className="p-1 rounded hover:bg-accent/10 text-text-tertiary hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                                  title={GENERATE_PREVIEW_LABEL}>
                                  {isGen ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Zap className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                            {/* 프리뷰 파형 */}
                            {hasPreview && renderPreview(fullKey, type, i + 1)}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Quote 섹션 */}
            <div className="border-t border-border">
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{QUOTE_LABEL}</span>
                  {voiceFiles[`${locale}/quote`] && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" value={editQuotes[locale] ?? ''}
                    onChange={(e) => {
                      setEditQuotes((prev) => ({ ...prev, [locale]: e.target.value }))
                      setTtsTexts((prev) => ({ ...prev, [`${locale}/quote`]: e.target.value }))
                    }}
                    className="flex-1 bg-transparent border-b border-border/50 hover:border-border focus:border-accent px-1 py-0.5 text-xs text-text-secondary focus:text-text-primary focus:outline-none"
                    placeholder={QUOTE_INPUT_PLACEHOLDER} />
                </div>
                {(editQuotes[locale] ?? '').trim() && (() => {
                  const ttsKey = `${locale}/quote`
                  const ttsValue = ttsTexts[ttsKey] ?? editQuotes[locale] ?? ''
                  const isGen = generating === 'quote'
                  const isPlay = playing === ttsKey
                  const hasPreview = !!previews[ttsKey]
                  const hasFile = voiceFiles[ttsKey]

                  return (
                    <>
                      <div className="flex items-center gap-2 ml-6">
                        <input type="text" value={ttsValue} onChange={(e) => setTtsText('quote', e.target.value)}
                          className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
                          placeholder="TTS text"
                        />
                        <button type="button" onClick={() => handlePlay(ttsKey, { dialogueType: 'quote' })}
                          disabled={!hasFile}
                          className={`p-1 rounded transition-colors shrink-0 ${
                            !hasFile ? 'text-text-tertiary/30 cursor-not-allowed' :
                            isPlay ? 'text-emerald-400 hover:bg-white/10' : 'text-text-tertiary hover:bg-white/10'
                          }`}
                          title={hasFile ? EXISTING_VOICE_PLAY_LABEL : NO_SAVED_VOICE_LABEL}>
                          {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        {hasFile && (
                          <button type="button"
                            onClick={() => handleDownload('quote', undefined)}
                            disabled={downloading === 'quote'}
                            className="p-1 rounded hover:bg-blue-500/10 text-text-tertiary hover:text-blue-400 disabled:opacity-30 transition-colors shrink-0"
                            title={DOWNLOAD_LABEL}>
                            {downloading === 'quote' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {hasFile && !hasPreview && (
                          <button type="button"
                            onClick={() => handleLoadExisting('quote', undefined)}
                            disabled={loadingExisting === 'quote'}
                            className="p-1 rounded hover:bg-amber-500/10 text-text-tertiary hover:text-amber-400 disabled:opacity-30 transition-colors shrink-0"
                            title="트림 편집">
                            {loadingExisting === 'quote' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button type="button" onClick={() => handleGenerate('quote', undefined)}
                          disabled={!ttsValue?.trim() || isGen || batchRunning}
                          className="p-1 rounded hover:bg-accent/10 text-text-tertiary hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed">
                          {isGen ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Zap className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {hasPreview && renderPreview(ttsKey, 'quote')}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

