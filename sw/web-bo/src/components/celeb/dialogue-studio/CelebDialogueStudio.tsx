'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Play, Pause, Loader2, Check, Upload, Scissors, FolderUp, Trash2,
  ChevronDown, ChevronRight, Save, Zap, X, Download, SlidersHorizontal,
} from 'lucide-react'
import {
  generateVoicePreview,
  uploadVoiceFromPreview,
  bumpVoiceVersion,
  fetchVoiceFile,
  enableHasVoice,
  saveVoiceId,
  type VoiceGenCeleb,
} from '@/actions/admin/voice-gen'
import {
  getVoiceStatus, toggleHasVoice, deleteAllVoiceFiles, uploadVoiceFile,
} from '@/actions/admin/voice'
import {
  saveCelebDialogues, updateSpeechTone, updateVoiceSpeed, type DialogueLines,
} from '@/actions/admin/dialogues'
import { useToast } from '@/contexts/ToastContext'
import { DIALOGUE_TYPES, TYPE_LABELS, allVoiceSlots } from '@/lib/voice-path'
import { buildEleText } from '@/components/scenario-voice/types'
import CelebVoiceEditorModal, { type CelebVoiceEditorTarget } from './voice-editor/CelebVoiceEditorModal'
import { Waveform, SliderField } from './Waveform'
import { applyGain, encodeWAV, abToBase64, base64ToBytes, boostToBase64 } from './audio'
import {
  DEFAULT_SETTINGS, LABELS, LOCALE_BADGE, MODE_OPTIONS, SPEECH_TONES, TONE_LABELS,
  localesFor, type Locale, type Preview, type ViewMode, type VoiceSettings,
} from './constants'

const VALID_BULK_FILES = new Set(allVoiceSlots().map((s) => s.fileName))

/** 대사 묶음에서 문자열 항목 하나를 꺼낸다 (없으면 빈 문자열) */
function readText(lines: unknown, key: 'quote' | 'monologue'): string {
  const value = (lines as Record<string, unknown> | null | undefined)?.[key]
  return typeof value === 'string' ? value : ''
}

/** 셀럽 데이터 → 편집 상태 초기값. 키는 모두 "{언어}/{항목}" 꼴이다 */
function buildInitialState(celeb: VoiceGenCeleb) {
  const ttsTexts: Record<string, string> = {}
  const dialogues: Record<string, string> = {}

  for (const loc of ['ko', 'en'] as const) {
    const lines = loc === 'ko' ? celeb.dialogue_lines : celeb.dialogue_lines_en
    for (const type of DIALOGUE_TYPES) {
      const arr = lines?.[type]
      for (let i = 0; i < 3; i++) {
        const key = `${loc}/${type}-${i + 1}`
        const text = arr?.[i] || ''
        dialogues[key] = text
        if (text.trim()) ttsTexts[key] = text
      }
    }
    const quote = readText(loc === 'ko' ? celeb.dialogue_lines : celeb.dialogue_lines_en, 'quote')
    if (quote.trim()) ttsTexts[`${loc}/quote`] = quote
  }

  return {
    ttsTexts,
    dialogues,
    quotes: {
      ko: readText(celeb.dialogue_lines, 'quote'),
      en: readText(celeb.dialogue_lines_en, 'quote'),
    } as Record<string, string>,
    monologues: {
      ko: readText(celeb.dialogue_lines, 'monologue'),
      en: readText(celeb.dialogue_lines_en, 'monologue'),
    } as Record<string, string>,
  }
}

interface Props {
  /** 편집 대상. 다른 인물로 바꿀 때는 호출부에서 key={celeb.id}로 갈아끼운다 */
  celeb: VoiceGenCeleb
}

export default function CelebDialogueStudio({ celeb }: Props) {
  const { showToast } = useToast()
  const initial = useMemo(() => buildInitialState(celeb), [celeb])

  // 목소리 번호
  const [voiceIdKo, setVoiceIdKo] = useState(celeb.voice_id_ko || '')
  const [voiceIdEn, setVoiceIdEn] = useState(celeb.voice_id_en || '')

  // 표시 모드 (한영본 / 국문 / 영문)
  const [mode, setMode] = useState<ViewMode>('both')
  const activeLocales = useMemo(() => localesFor(mode), [mode])

  // 합성 설정
  const [settings, setSettings] = useState<VoiceSettings>({ ...DEFAULT_SETTINGS })

  /**
   * 감정 표식과 끝 여백 — 언어별로 따로 쥔다.
   * 화면을 떠나면 사라진다(안정성·스타일 슬라이더와 같은 취급). 저장할 자리가 아직 없다.
   */
  const [emotions, setEmotions] = useState<Record<Locale, string[]>>({ ko: [], en: [] })
  const [trail, setTrail] = useState(true)

  // 음성 편집 창 — 대사 한 자리를 크게 펼쳐 만들기·들숨 제거를 한다
  const [editorTarget, setEditorTarget] = useState<CelebVoiceEditorTarget | null>(null)

  /** 합성에 실제로 보내는 문장 — 감정 표식과 끝 여백을 붙인다 */
  const composeText = useCallback((loc: Locale, raw: string) => buildEleText(raw, {
    emotionEnabled: emotions[loc].length > 0,
    emotions: emotions[loc],
    trailEnabled: trail,
  }), [emotions, trail])

  // 진행 상태 (키는 모두 "{언어}/{항목}")
  const [generating, setGenerating] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState<string | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)

  // 생성 결과(임시) / R2 보유 현황
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  const [voiceFiles, setVoiceFiles] = useState<Record<string, boolean>>({})
  const [voiceFilesLoading, setVoiceFilesLoading] = useState(true)

  // 음성 파일 전반
  const [hasVoice, setHasVoice] = useState(celeb.has_voice)
  const [deletingAll, setDeletingAll] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkLocale, setBulkLocale] = useState<Locale>('ko')

  // 재생
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  // 접이식 대사 유형
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(DIALOGUE_TYPES))

  // 편집 중인 값
  const [ttsTexts, setTtsTexts] = useState<Record<string, string>>(initial.ttsTexts)
  const [editDialogues, setEditDialogues] = useState<Record<string, string>>(initial.dialogues)
  const [editQuotes, setEditQuotes] = useState<Record<string, string>>(initial.quotes)
  const [editMonologues, setEditMonologues] = useState<Record<string, string>>(initial.monologues)
  const [speechTone, setSpeechTone] = useState(celeb.speech_tone || 'free')
  const [voiceSpeed, setVoiceSpeed] = useState(celeb.voice_speed ?? 1.0)
  const [dialogueSaving, setDialogueSaving] = useState(false)

  // R2 보유 현황 조회
  useEffect(() => {
    let alive = true
    setVoiceFilesLoading(true)
    getVoiceStatus(celeb.id)
      .then(({ files }) => { if (alive) setVoiceFiles(files) })
      .catch(() => {})
      .finally(() => { if (alive) setVoiceFilesLoading(false) })
    return () => { alive = false }
  }, [celeb.id])

  // 떠날 때 임시 음성 정리 (blob URL은 두면 메모리에 남는다)
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((p) => URL.revokeObjectURL(p.blobUrl))
    audioRef.current?.pause()
    sourceRef.current?.stop()
  }, [])

  // 배속 변경 시 재생 중인 소리에 즉시 반영 (음높이 보존)
  useEffect(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.playbackRate = voiceSpeed
    }
  }, [voiceSpeed])

  // #region 편집 값 갱신
  function setTtsText(loc: Locale, key: string, value: string) {
    setTtsTexts((prev) => ({ ...prev, [`${loc}/${key}`]: value }))
  }

  function setEditDialogue(loc: Locale, key: string, value: string) {
    const fullKey = `${loc}/${key}`
    setEditDialogues((prev) => ({ ...prev, [fullKey]: value }))
    setTtsTexts((prev) => ({ ...prev, [fullKey]: value }))
  }

  function clearPreview(fullKey: string) {
    setPreviews((prev) => {
      const p = prev[fullKey]
      if (p) URL.revokeObjectURL(p.blobUrl)
      const next = { ...prev }
      delete next[fullKey]
      return next
    })
  }

  function updateTrim(fullKey: string, start: number, end: number) {
    setPreviews((prev) => prev[fullKey] ? { ...prev, [fullKey]: { ...prev[fullKey], trimStart: start, trimEnd: end } } : prev)
  }
  // #endregion

  // #region 저장
  const handleSaveDialogues = useCallback(async () => {
    setDialogueSaving(true)

    const buildLines = (loc: Locale): DialogueLines => {
      // 편집기가 다루지 않는 잔여 항목(옛 회차가 남긴 키 등)은 원본 그대로 살려 둔다.
      // 통째로 새로 쓰면 화면에 없는 값이 조용히 사라진다.
      const existing = (loc === 'ko' ? celeb.dialogue_lines : celeb.dialogue_lines_en) ?? {}
      const result: Record<string, unknown> = { ...existing }

      for (const type of DIALOGUE_TYPES) {
        result[type] = [
          editDialogues[`${loc}/${type}-1`] || '',
          editDialogues[`${loc}/${type}-2`] || '',
          editDialogues[`${loc}/${type}-3`] || '',
        ]
      }
      result.quote = editQuotes[loc] ?? ''

      // 없던 인물에게 빈 독백 칸을 새로 만들지는 않는다
      const monologue = editMonologues[loc] ?? ''
      if (monologue.trim() || 'monologue' in existing) result.monologue = monologue

      return result as unknown as DialogueLines
    }

    try {
      await saveCelebDialogues(celeb.id, buildLines('ko'), buildLines('en'))
      if (speechTone !== (celeb.speech_tone || '')) {
        await updateSpeechTone(celeb.id, speechTone)
      }
      showToast('success', LABELS.saveDone)
    } catch (err) {
      showToast('error', `${LABELS.saveFail}: ${String(err)}`)
    }
    setDialogueSaving(false)
  }, [celeb, editDialogues, editQuotes, editMonologues, speechTone, showToast])

  const handleSaveVoiceId = useCallback(async (loc: Locale) => {
    const vid = loc === 'ko' ? voiceIdKo : voiceIdEn
    if (!vid.trim()) return showToast('error', LABELS.inputVoiceId)
    const result = await saveVoiceId(celeb.id, loc, vid.trim())
    if (result.success) {
      showToast('success', LABELS.voiceIdSaved.replace('{locale}', loc.toUpperCase()))
    } else {
      showToast('error', result.error || LABELS.saveFail)
    }
  }, [celeb.id, voiceIdKo, voiceIdEn, showToast])
  // #endregion

  // #region 재생
  const handlePlay = useCallback((key: string, source:
    | { blobUrl: string; trim?: { start: number; end: number } }
    | { locale: Locale; dialogueType: string; variant?: number }
  ) => {
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

    // 잘라낸 구간 재생은 배속이 적용되지 않는다
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
      }).catch(() => { showToast('error', LABELS.playFail); setPlaying(null) })
    }

    // 전체 재생은 음높이를 보존한 채 배속을 먹인다
    const playWithHtmlAudio = (url: string) => {
      const audio = new Audio(url)
      audio.preservesPitch = true
      audio.playbackRate = voiceSpeed
      audio.onended = () => { audioRef.current = null; setPlaying(null) }
      audio.onerror = () => { audioRef.current = null; showToast('error', LABELS.playFail); setPlaying(null) }
      audio.play().catch(() => { showToast('error', LABELS.playFail); setPlaying(null) })
      audioRef.current = audio
      setPlaying(key)
    }

    if ('blobUrl' in source) {
      if (trim && (trim.start > 0 || trim.end < Infinity)) {
        fetch(source.blobUrl).then((r) => r.arrayBuffer()).then(playTrimmed)
          .catch(() => { showToast('error', LABELS.playFail); setPlaying(null) })
      } else {
        playWithHtmlAudio(source.blobUrl)
      }
    } else {
      setPlaying(key)
      fetchVoiceFile({ celebId: celeb.id, locale: source.locale, dialogueType: source.dialogueType, variant: source.variant })
        .then((res) => {
          if (!res.success || !res.base64) {
            showToast('error', res.error || LABELS.playFail)
            setPlaying(null)
            return
          }
          const blob = new Blob([base64ToBytes(res.base64)], { type: 'audio/mpeg' })
          playWithHtmlAudio(URL.createObjectURL(blob))
        })
        .catch(() => { showToast('error', LABELS.playFail); setPlaying(null) })
    }
  }, [playing, celeb.id, voiceSpeed, showToast])
  // #endregion

  // #region 생성 · 업로드 · 내려받기
  const handleGenerate = useCallback(async (loc: Locale, type: string, variant?: number) => {
    const vid = loc === 'ko' ? voiceIdKo : voiceIdEn
    if (!vid.trim()) {
      return showToast('error', LABELS.enterVoiceIdFirst.replace('{locale}', loc.toUpperCase()))
    }

    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${loc}/${key}`
    const text = ttsTexts[fullKey] || ''
    if (!text.trim()) return showToast('error', LABELS.emptyTtsText)

    setGenerating(fullKey)
    const result = await generateVoicePreview({ voiceId: vid.trim(), text: composeText(loc, text), settings })

    if (result.success && result.base64) {
      clearPreview(fullKey)

      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(base64ToBytes(result.base64).buffer.slice(0) as ArrayBuffer)
      const duration = audioBuf.duration

      let finalBase64 = result.base64
      let finalBytes = result.bytes || 0
      let boostDb = 0

      if (settings.volumeBoost > 0) {
        const boosted = await applyGain(audioBuf, settings.volumeBoost)
        const wavBuf = encodeWAV(boosted, 0, boosted.duration)
        finalBase64 = abToBase64(wavBuf)
        finalBytes = wavBuf.byteLength
        boostDb = settings.volumeBoost
      }
      await audioCtx.close()

      const blob = new Blob([base64ToBytes(finalBase64)], { type: boostDb > 0 ? 'audio/wav' : 'audio/mpeg' })
      const blobUrl = URL.createObjectURL(blob)

      setPreviews((prev) => ({
        ...prev,
        [fullKey]: { blobUrl, base64: finalBase64, bytes: finalBytes, duration, trimStart: 0, trimEnd: duration, boostDb },
      }))
      showToast('success', `${LOCALE_BADGE[loc].label} ${LABELS.previewDone} (${(finalBytes / 1024).toFixed(0)}KB, ${duration.toFixed(1)}s${boostDb > 0 ? `, +${boostDb}dB` : ''})`)
    } else {
      showToast('error', result.error || LABELS.generateFail)
    }
    setGenerating(null)
  }, [voiceIdKo, voiceIdEn, settings, ttsTexts, composeText, showToast])

  const handleUpload = useCallback(async (loc: Locale, type: string, variant?: number) => {
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${loc}/${key}`
    const preview = previews[fullKey]
    if (!preview) return

    setUploading(fullKey)

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
        celebId: celeb.id, base64: uploadBase64, locale: loc,
        dialogueType: type, variant, contentType,
      })

      if (result.success && result.url) {
        await bumpVoiceVersion(celeb.id)
        setVoiceFiles((prev) => ({ ...prev, [fullKey]: true }))
        clearPreview(fullKey)
        showToast('success', LABELS.uploadDone.replace('{key}', fullKey))
        if (!hasVoice) {
          await enableHasVoice(celeb.id)
          setHasVoice(true)
        }
      } else {
        showToast('error', result.error || LABELS.uploadFail)
      }
    } catch (err) {
      showToast('error', `${LABELS.uploadFail}: ${String(err)}`)
    }
    setUploading(null)
  }, [celeb.id, previews, hasVoice, showToast])

  const handleDownload = useCallback(async (loc: Locale, type: string, variant?: number) => {
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    setDownloading(`${loc}/${key}`)
    try {
      const result = await fetchVoiceFile({ celebId: celeb.id, locale: loc, dialogueType: type, variant })
      if (!result.success || !result.base64) throw new Error(result.error || '파일 없음')
      const blob = new Blob([base64ToBytes(result.base64)], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${celeb.slug || celeb.id}_${loc}_${key}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast('error', `${LABELS.downloadFail}: ${String(err)}`)
    }
    setDownloading(null)
  }, [celeb.id, celeb.slug, showToast])

  /** R2에 있는 음성을 임시 음성으로 불러온다 (앞뒤 자르기 편집용) */
  const handleLoadExisting = useCallback(async (loc: Locale, type: string, variant?: number) => {
    const key = type === 'quote' ? 'quote' : `${type}-${variant}`
    const fullKey = `${loc}/${key}`

    setLoadingExisting(fullKey)
    try {
      const result = await fetchVoiceFile({ celebId: celeb.id, locale: loc, dialogueType: type, variant })
      if (!result.success || !result.base64) throw new Error(result.error || '파일 없음')

      const blob = new Blob([base64ToBytes(result.base64)], { type: 'audio/mpeg' })
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
  }, [celeb.id, showToast])

  /** 전체 생성 — 지금 모드에 해당하는 언어를 차례로 처리한다 */
  const handleBatchGenerate = useCallback(async () => {
    const missing = activeLocales.filter((loc) => !(loc === 'ko' ? voiceIdKo : voiceIdEn).trim())
    if (missing.length > 0) {
      return showToast('error', LABELS.enterVoiceIdFirst.replace('{locale}', missing.map((l) => l.toUpperCase()).join(', ')))
    }

    setBatchRunning(true)
    let ok = 0, fail = 0

    /** 한 자리 생성 → 업로드. 대사가 비었으면 null */
    const runSlot = async (loc: Locale, vid: string, type: string, variant?: number) => {
      const key = type === 'quote' ? 'quote' : `${type}-${variant}`
      const fullKey = `${loc}/${key}`
      const text = ttsTexts[fullKey] || ''
      if (!text.trim()) return null

      setGenerating(fullKey)
      const gen = await generateVoicePreview({ voiceId: vid, text: composeText(loc, text), settings })
      if (!gen.success || !gen.base64) return false

      const { base64, contentType } = await boostToBase64(gen.base64, settings.volumeBoost)
      const up = await uploadVoiceFromPreview({
        celebId: celeb.id, base64, locale: loc, dialogueType: type, variant, contentType,
      })
      if (!up.success) return false
      setVoiceFiles((prev) => ({ ...prev, [fullKey]: true }))
      return true
    }

    for (const loc of activeLocales) {
      const vid = (loc === 'ko' ? voiceIdKo : voiceIdEn).trim()

      for (const type of DIALOGUE_TYPES) {
        for (let i = 0; i < 3; i++) {
          const r = await runSlot(loc, vid, type, i + 1)
          if (r === null) continue
          r ? ok++ : fail++
          await new Promise((res) => setTimeout(res, 800))
        }
      }

      const r = await runSlot(loc, vid, 'quote')
      if (r !== null) r ? ok++ : fail++
    }

    if (ok > 0) {
      await bumpVoiceVersion(celeb.id)
      if (!hasVoice) {
        await enableHasVoice(celeb.id)
        setHasVoice(true)
      }
    }

    setGenerating(null)
    setBatchRunning(false)
    showToast(fail === 0 ? 'success' : 'error', `생성 완료: 성공 ${ok}개, 실패 ${fail}개`)
  }, [celeb.id, activeLocales, voiceIdKo, voiceIdEn, settings, ttsTexts, composeText, hasVoice, showToast])
  // #endregion

  // #region 음성 파일 전반 (켜기 · 묶음 올리기 · 전체 삭제)
  const handleToggleVoice = useCallback(async () => {
    const next = !hasVoice
    setHasVoice(next)
    const result = await toggleHasVoice(celeb.id, next)
    if (!result.success) {
      setHasVoice(!next)
      showToast('error', result.error || LABELS.saveFail)
    }
  }, [celeb.id, hasVoice, showToast])

  const handleDeleteAll = useCallback(async () => {
    if (!confirm(LABELS.deleteAllConfirm)) return
    setDeletingAll(true)
    await deleteAllVoiceFiles(celeb.id)
    setHasVoice(false)
    setVoiceFiles({})
    showToast('success', LABELS.deleteAllDone)
    setDeletingAll(false)
  }, [celeb.id, showToast])

  /** 손에 있는 mp3를 파일명(g1·bw2·quote…)으로 알아서 제자리에 올린다 */
  const handleBulkUpload = useCallback(async (files: FileList) => {
    const matched: { file: File; fileName: string }[] = []
    const skipped: string[] = []
    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase()
      if (VALID_BULK_FILES.has(name)) matched.push({ file, fileName: name })
      else skipped.push(file.name)
    }

    if (matched.length === 0) {
      showToast('error', LABELS.bulkUploadNoMatch)
      return
    }

    setBulkProgress({ done: 0, total: matched.length })
    let ok = 0, fail = 0
    for (let i = 0; i < matched.length; i++) {
      const { file, fileName } = matched[i]
      setBulkProgress({ done: i, total: matched.length })
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadVoiceFile(celeb.id, bulkLocale, fileName, fd)
      if (result.success) ok++
      else fail++
    }

    if (ok > 0) {
      await bumpVoiceVersion(celeb.id)
      if (!hasVoice) {
        await enableHasVoice(celeb.id)
        setHasVoice(true)
      }
      const { files: fresh } = await getVoiceStatus(celeb.id)
      setVoiceFiles(fresh)
    }

    setBulkProgress(null)
    showToast(fail === 0 ? 'success' : 'error',
      `${LOCALE_BADGE[bulkLocale].label} 묶음 올리기: 성공 ${ok}개${fail > 0 ? `, 실패 ${fail}개` : ''}${skipped.length > 0 ? ` · 이름이 안 맞아 건너뜀 ${skipped.length}개` : ''}`)
  }, [celeb.id, bulkLocale, hasVoice, showToast])
  // #endregion

  // #region 렌더 조각
  /** 임시 음성 한 벌 (파형 · 재생 · 올리기 · 내려받기 · 버리기) */
  function renderPreview(loc: Locale, fullKey: string, type: string, variant?: number) {
    const preview = previews[fullKey]
    if (!preview) return null
    const isPlay = playing === `preview:${fullKey}`
    const isUp = uploading === fullKey
    const isTrimmed = preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01

    return (
      <div className="mt-1 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
        <div className="flex items-center gap-2">
          <Waveform
            blobUrl={preview.blobUrl}
            duration={preview.duration}
            trimStart={preview.trimStart}
            trimEnd={preview.trimEnd}
            onTrimChange={(s, e) => updateTrim(fullKey, s, e)}
            isPlaying={isPlay}
          />
          <button type="button"
            onClick={() => handlePlay(`preview:${fullKey}`, { blobUrl: preview.blobUrl, trim: { start: preview.trimStart, end: preview.trimEnd } })}
            className={`p-1 rounded hover:bg-white/10 shrink-0 ${isPlay ? 'text-emerald-400' : 'text-text-tertiary'}`}
            title={LABELS.previewPlay}>
            {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button type="button"
            onClick={() => handleUpload(loc, type, variant)}
            disabled={!!isUp}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0"
            title="R2 Upload">
            {isUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload
          </button>
          <a href={preview.blobUrl}
            download={`preview_${fullKey.replace('/', '_')}.${preview.boostDb && preview.boostDb > 0 ? 'wav' : 'mp3'}`}
            className="p-1 rounded text-text-tertiary hover:text-blue-400 shrink-0"
            title={LABELS.download}>
            <Download className="w-3.5 h-3.5" />
          </a>
          <button type="button" onClick={() => clearPreview(fullKey)}
            className="p-1 rounded text-text-tertiary hover:text-red-400 shrink-0"
            title={LABELS.delete}>
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

  /** 한 언어의 대사 한 자리 (원문 · 읽어줄 문장 · 조작 · 임시 음성) */
  function renderSlotRow(loc: Locale, type: string, variant?: number) {
    const isQuote = type === 'quote'
    const key = isQuote ? 'quote' : `${type}-${variant}`
    const fullKey = `${loc}/${key}`
    const editValue = isQuote ? (editQuotes[loc] ?? '') : (editDialogues[fullKey] ?? '')
    const ttsValue = ttsTexts[fullKey] ?? editValue
    const isGen = generating === fullKey
    const isPlay = playing === fullKey
    const hasPreview = !!previews[fullKey]
    const hasFile = !!voiceFiles[fullKey]
    const badge = LOCALE_BADGE[loc]
    const showBadge = mode === 'both'
    const indent = showBadge ? 'ml-9' : 'ml-6'

    const onEdit = (v: string) => {
      if (isQuote) {
        setEditQuotes((prev) => ({ ...prev, [loc]: v }))
        setTtsTexts((prev) => ({ ...prev, [fullKey]: v }))
      } else {
        setEditDialogue(loc, key, v)
      }
    }

    return (
      <div key={fullKey} className="space-y-1">
        <div className="flex items-center gap-2">
          {showBadge && (
            <span className={`shrink-0 w-7 text-center px-1 py-px rounded border text-[9px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
          <input type="text" value={editValue} onChange={(e) => onEdit(e.target.value)}
            className="flex-1 bg-transparent border-b border-border/50 hover:border-border focus:border-accent px-1 py-0.5 text-xs text-text-secondary focus:text-text-primary focus:outline-none"
            placeholder={isQuote ? LABELS.quotePlaceholder : LABELS.dialoguePlaceholder} />
          {hasFile && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
        </div>

        {editValue.trim() && (
          <div className={`flex items-center gap-2 ${indent}`}>
            <input type="text" value={ttsValue} onChange={(e) => setTtsText(loc, key, e.target.value)}
              className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
              placeholder="TTS text" />
            <button type="button"
              onClick={() => handlePlay(fullKey, { locale: loc, dialogueType: type, variant })}
              disabled={!hasFile}
              className={`p-1 rounded transition-colors shrink-0 ${
                !hasFile ? 'text-text-tertiary/30 cursor-not-allowed' :
                isPlay ? 'text-emerald-400 hover:bg-white/10' : 'text-text-tertiary hover:bg-white/10'
              }`}
              title={hasFile ? LABELS.existingVoicePlay : LABELS.noSavedVoice}>
              {isPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            {hasFile && (
              <button type="button" onClick={() => handleDownload(loc, type, variant)}
                disabled={downloading === fullKey}
                className="p-1 rounded hover:bg-blue-500/10 text-text-tertiary hover:text-blue-400 disabled:opacity-30 transition-colors shrink-0"
                title={LABELS.download}>
                {downloading === fullKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            )}
            {hasFile && !hasPreview && (
              <button type="button" onClick={() => handleLoadExisting(loc, type, variant)}
                disabled={loadingExisting === fullKey}
                className="p-1 rounded hover:bg-amber-500/10 text-text-tertiary hover:text-amber-400 disabled:opacity-30 transition-colors shrink-0"
                title={LABELS.trimEdit}>
                {loadingExisting === fullKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
              </button>
            )}
            <button type="button" onClick={() => handleGenerate(loc, type, variant)}
              disabled={!ttsValue?.trim() || isGen || batchRunning}
              className="p-1 rounded hover:bg-accent/10 text-text-tertiary hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              title={LABELS.generatePreview}>
              {isGen ? <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> : <Zap className="w-3.5 h-3.5" />}
            </button>
            {/* 크게 펼쳐 편집 — 목소리 고르기·감정 표식·파형·들숨 제거 */}
            <button type="button"
              onClick={() => setEditorTarget({ locale: loc, type, variant, text: ttsValue })}
              disabled={!ttsValue?.trim()}
              className="p-1 rounded hover:bg-purple-500/10 text-text-tertiary hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              title={LABELS.openEditor}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {hasPreview && <div className={indent}>{renderPreview(loc, fullKey, type, variant)}</div>}
      </div>
    )
  }
  // #endregion

  const CARD = 'bg-bg-card border border-border rounded-xl'

  return (
    <div className="space-y-4">
      {/* 편집 모드 + 음성 파일 전반 */}
      <div className={`${CARD} p-4 flex flex-wrap items-center gap-x-4 gap-y-3`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary shrink-0">{LABELS.modeSwitch}</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {MODE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium border-r border-border last:border-r-0 ${
                  mode === opt.value
                    ? 'bg-accent/20 text-accent'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 음성 활성화 */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleToggleVoice}
            className={`relative w-10 h-5 rounded-full ${hasVoice ? 'bg-emerald-500' : 'bg-bg-secondary border border-border'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hasVoice ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-text-secondary">{LABELS.voiceEnabled}</span>
        </div>

        {/* 묶음 올리기 */}
        <div className="flex items-center gap-1.5">
          <select value={bulkLocale} onChange={(e) => setBulkLocale(e.target.value as Locale)}
            className="bg-bg-secondary border border-border rounded-lg px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent">
            <option value="ko">KO</option>
            <option value="en">EN</option>
          </select>
          <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-accent/10 text-accent hover:bg-accent/20 ${bulkProgress ? 'pointer-events-none opacity-50' : ''}`}>
            <FolderUp className="w-3.5 h-3.5" />
            {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : LABELS.bulkUpload}
            <input type="file" accept=".mp3,audio/mpeg" multiple className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleBulkUpload(e.target.files)
                e.target.value = ''
              }} />
          </label>
        </div>

        <button type="button" onClick={handleDeleteAll} disabled={deletingAll}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50">
          {deletingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {LABELS.deleteAllVoices}
        </button>
      </div>

      {/* 목소리 번호 (모드에 해당하는 언어만) */}
      <div className={`${CARD} p-5`}>
        <div className={`grid grid-cols-1 gap-3 ${activeLocales.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {activeLocales.map((loc) => (
            <div key={loc}>
              <label className="text-xs text-text-secondary mb-1 block">Voice ID ({LOCALE_BADGE[loc].label})</label>
              <div className="flex gap-1.5">
                <input type="text"
                  value={loc === 'ko' ? voiceIdKo : voiceIdEn}
                  onChange={(e) => (loc === 'ko' ? setVoiceIdKo : setVoiceIdEn)(e.target.value)}
                  placeholder="ElevenLabs Voice ID"
                  className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono placeholder-text-tertiary focus:outline-none focus:border-accent" />
                <button type="button" onClick={() => handleSaveVoiceId(loc)}
                  className="px-2 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20">
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 합성 설정 */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Voice Settings</h3>
          <div className="flex items-center gap-2">
            <select value={speechTone} onChange={(e) => setSpeechTone(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent">
              {SPEECH_TONES.map((t) => <option key={t} value={t}>{TONE_LABELS[t]} ({t})</option>)}
            </select>
            <button type="button" onClick={handleBatchGenerate} disabled={batchRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
              {batchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {LABELS.batchGenerate} ({activeLocales.map((l) => LOCALE_BADGE[l].label).join('+')})
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
            className="ml-auto text-xs text-text-tertiary hover:text-text-primary">{LABELS.resetDefaults}</button>
        </div>
      </div>

      {/* 대사 목록 */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{LABELS.dialogueEditor}</h3>
            {voiceFilesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-tertiary">{LABELS.playbackRate}</span>
              <select value={voiceSpeed} onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setVoiceSpeed(v)
                  updateVoiceSpeed(celeb.id, v)
                    .then(() => showToast('success', `배속 ${v}x 저장`))
                    .catch(() => showToast('error', '배속 저장 실패'))
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
              {LABELS.save}
            </button>
          </div>
        </div>

        {DIALOGUE_TYPES.map((type) => {
          const isExpanded = expandedTypes.has(type)
          return (
            <div key={type} className="border-b border-border last:border-b-0">
              <button type="button"
                onClick={() => setExpandedTypes((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next })}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-bg-secondary/50 transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-text-tertiary" /> : <ChevronRight className="w-4 h-4 text-text-tertiary" />}
                <span className="text-sm font-medium text-text-primary">{TYPE_LABELS[type]}</span>
                {activeLocales.map((loc) => {
                  const filled = [1, 2, 3].filter((v) => editDialogues[`${loc}/${type}-${v}`]?.trim()).length
                  return (
                    <span key={loc} className="text-xs text-text-tertiary">
                      {mode === 'both' && <span className="mr-0.5">{LOCALE_BADGE[loc].label}</span>}
                      {filled}/3
                    </span>
                  )
                })}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-4">
                  {[1, 2, 3].map((v) => (
                    <div key={v} className="flex gap-2">
                      <span className="text-xs text-text-tertiary font-mono w-4 shrink-0 pt-1">{v}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        {activeLocales.map((loc) => renderSlotRow(loc, type, v))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* 명언 */}
        <div className="border-t border-border">
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{LABELS.quote}</span>
              {activeLocales.every((loc) => voiceFiles[`${loc}/quote`]) && <Check className="w-3 h-3 text-emerald-400" />}
            </div>
            <div className="space-y-2">
              {activeLocales.map((loc) => renderSlotRow(loc, 'quote'))}
            </div>
          </div>
        </div>

        {/* 독백 — 음성으로 만들지 않는 글이라 입력칸만 둔다 */}
        <div className="border-t border-border">
          <div className="px-4 py-3 space-y-2">
            <span className="text-sm font-medium text-text-primary">{LABELS.monologue}</span>
            <div className="space-y-2">
              {activeLocales.map((loc) => (
                <div key={loc} className="flex gap-2">
                  {mode === 'both' && (
                    <span className={`shrink-0 h-fit w-7 text-center px-1 py-px rounded border text-[9px] font-medium ${LOCALE_BADGE[loc].className}`}>
                      {LOCALE_BADGE[loc].label}
                    </span>
                  )}
                  <textarea
                    value={editMonologues[loc] ?? ''}
                    onChange={(e) => setEditMonologues((prev) => ({ ...prev, [loc]: e.target.value }))}
                    placeholder={LABELS.monologuePlaceholder}
                    rows={3}
                    className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent resize-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 음성 편집 창 */}
      {editorTarget && (
        <CelebVoiceEditorModal
          celeb={celeb}
          target={editorTarget}
          voiceId={editorTarget.locale === 'ko' ? voiceIdKo : voiceIdEn}
          onVoiceIdChange={(v) => {
            // 창에서 고른 목소리는 그 언어의 목소리 번호 칸에 그대로 들어간다.
            // 인물에 영구히 남기려면 목소리 번호 칸 옆 저장을 누른다.
            if (editorTarget.locale === 'ko') setVoiceIdKo(v)
            else setVoiceIdEn(v)
          }}
          hasFile={!!voiceFiles[
            `${editorTarget.locale}/${editorTarget.type === 'quote' ? 'quote' : `${editorTarget.type}-${editorTarget.variant}`}`
          ]}
          settings={settings}
          onSettingsChange={setSettings}
          emotions={emotions[editorTarget.locale]}
          onEmotionsChange={(next) => setEmotions((prev) => ({ ...prev, [editorTarget.locale]: next }))}
          trail={trail}
          onTrailChange={setTrail}
          playbackRate={voiceSpeed}
          onSaved={() => {
            const key = `${editorTarget.locale}/${editorTarget.type === 'quote' ? 'quote' : `${editorTarget.type}-${editorTarget.variant}`}`
            setVoiceFiles((prev) => ({ ...prev, [key]: true }))
            setHasVoice(true)
          }}
          onClose={() => setEditorTarget(null)}
        />
      )}
    </div>
  )
}
