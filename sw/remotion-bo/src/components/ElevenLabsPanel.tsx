'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { EpisodeData } from './EpisodeEditor'
import { Waveform } from './Waveform'

const BTN = 'px-2 py-0.5 rounded text-xs font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

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
}

/** PCM -> WAV encoding (mono/stereo, 16-bit, with trim range) */
function encodeWAV(buf: AudioBuffer, startSec = 0, endSec?: number): ArrayBuffer {
  const sr = buf.sampleRate
  const s0 = Math.round(startSec * sr)
  const s1 = Math.round((endSec ?? buf.duration) * sr)
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

/** Apply gain (dB) with limiter */
async function applyGain(buf: AudioBuffer, gainDb: number): Promise<AudioBuffer> {
  if (gainDb <= 0) return buf
  const ratio = Math.pow(10, gainDb / 20)
  const offCtx = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate)
  const src = offCtx.createBufferSource()
  src.buffer = buf
  const gain = offCtx.createGain()
  gain.gain.value = ratio
  const limiter = offCtx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 6
  limiter.ratio.value = 20
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  src.connect(gain)
  gain.connect(limiter)
  limiter.connect(offCtx.destination)
  src.start(0)
  return offCtx.startRendering()
}

interface CelebLine {
  key: string
  label: string
  text: string
  fileName: string
}

interface ElevenLabsPanelProps {
  episode: EpisodeData
  series: string
  name: string
  onRefresh: () => void
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-text-secondary w-20 shrink-0">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-accent"
      />
      <span className="text-xs text-text-dim w-10 text-right font-mono">
        {suffix ? `${value}${suffix}` : value.toFixed(2)}
      </span>
    </div>
  )
}

function CelebLineEditor({ line, voiceId, settings, series, name, playbackSpeed, onRefresh }: {
  line: CelebLine
  voiceId: string
  settings: VoiceSettings
  series: string
  name: string
  playbackSpeed: number
  onRefresh: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ttsText, setTtsText] = useState(line.text)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Sync ttsText when line.text changes (e.g. episode reload)
  useEffect(() => { setTtsText(line.text) }, [line.text])

  // Apply playbackRate when speed changes during playback
  useEffect(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const stopPlayback = useCallback(() => {
    sourceRef.current?.stop()
    sourceRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
  }, [])

  const handlePreview = useCallback(async () => {
    if (!ttsText.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text: ttsText, settings }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? '생성 실패')
        return
      }
      // ElevenLabs returns MP3 -> decode to AudioBuffer -> apply gain -> convert to WAV
      const mp3Bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(mp3Bytes.buffer.slice(0) as ArrayBuffer)
      const boosted = await applyGain(audioBuf, settings.volumeBoost)
      const wavAb = encodeWAV(boosted)
      const wavBase64 = abToBase64(wavAb)
      const blob = new Blob([wavAb], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      // Clean up old preview
      if (preview) URL.revokeObjectURL(preview.blobUrl)
      setPreview({
        blobUrl: url,
        base64: wavBase64,
        bytes: wavAb.byteLength,
        duration: boosted.duration,
        trimStart: 0,
        trimEnd: boosted.duration,
      })
      await audioCtx.close()
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }, [voiceId, ttsText, settings, series, preview])

  const handlePlay = useCallback(() => {
    if (!preview) return
    if (isPlaying) {
      stopPlayback()
      return
    }

    const isTrimmed = preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01

    if (isTrimmed) {
      // Use AudioBufferSourceNode for trimmed playback
      fetch(preview.blobUrl)
        .then(r => r.arrayBuffer())
        .then(buf => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext()
          }
          return audioCtxRef.current.decodeAudioData(buf)
        })
        .then(audioBuf => {
          const ctx = audioCtxRef.current!
          const src = ctx.createBufferSource()
          src.buffer = audioBuf
          src.connect(ctx.destination)
          src.onended = () => { sourceRef.current = null; setIsPlaying(false) }
          src.start(0, preview.trimStart, preview.trimEnd - preview.trimStart)
          sourceRef.current = src
          setIsPlaying(true)
        })
        .catch(() => setIsPlaying(false))
    } else {
      const audio = new Audio(preview.blobUrl)
      audio.preservesPitch = true
      audio.playbackRate = playbackSpeed
      audioRef.current = audio
      audio.onended = () => { audioRef.current = null; setIsPlaying(false) }
      audio.onpause = () => setIsPlaying(false)
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying, preview, playbackSpeed, stopPlayback])

  const handleSave = useCallback(async () => {
    if (!preview) return
    setSaving(true)
    setError(null)
    try {
      const isTrimmed = preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01
      let saveBase64 = preview.base64
      if (isTrimmed) {
        // Re-encode with trim range
        const resp = await fetch(preview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, preview.trimStart, preview.trimEnd)
        saveBase64 = abToBase64(wavBuf)
        await audioCtx.close()
      }
      const res = await fetch(`/api/${series}/voice/elevenlabs/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: line.fileName, base64: saveBase64 }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? '저장 실패')
      } else {
        onRefresh()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }, [preview, series, name, line.fileName, onRefresh])

  const handleLoadExisting = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch existing file via play API
      const url = `/api/${series}/voice/play/${name}/${line.fileName}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('파일 없음')
      const ab = await res.arrayBuffer()
      const blob = new Blob([ab], { type: 'audio/wav' })
      const blobUrl = URL.createObjectURL(blob)
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(ab.slice(0))
      const duration = audioBuf.duration
      await audioCtx.close()
      if (preview) URL.revokeObjectURL(preview.blobUrl)
      setPreview({
        blobUrl,
        base64: abToBase64(ab),
        bytes: ab.byteLength,
        duration,
        trimStart: 0,
        trimEnd: duration,
      })
    } catch (e) {
      setError(`로드 실패: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [series, name, line.fileName, preview])

  const handleDownload = useCallback(() => {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview.blobUrl
    a.download = `${name}_${line.key}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [preview, name, line.key])

  const handleTrimChange = useCallback((start: number, end: number) => {
    setPreview(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null)
  }, [])

  const handleTrimReset = useCallback(() => {
    setPreview(prev => prev ? { ...prev, trimStart: 0, trimEnd: prev.duration } : null)
  }, [])

  const isTrimmed = preview ? (preview.trimStart > 0.01 || preview.trimEnd < preview.duration - 0.01) : false

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-accent">{line.label}</span>
        <span className="text-[10px] text-text-dim font-mono">{line.fileName}</span>
      </div>

      {/* Editable TTS text */}
      <textarea
        value={ttsText}
        onChange={e => setTtsText(e.target.value)}
        rows={2}
        className="w-full text-xs text-text-secondary bg-bg-main rounded px-2 py-1.5 leading-relaxed border border-border focus:outline-none focus:border-accent resize-y"
        placeholder="TTS 텍스트 없음"
      />

      {/* Preview section */}
      {preview && (
        <div className="space-y-1.5 p-2 rounded-lg bg-accent/5 border border-accent/20">
          <Waveform
            audioUrl={preview.blobUrl}
            isPlaying={isPlaying}
            duration={preview.duration}
            trimStart={preview.trimStart}
            trimEnd={preview.trimEnd}
            onTrimChange={handleTrimChange}
          />
          {/* Trim info */}
          <div className="flex items-center gap-2 text-[10px] text-text-dim font-mono">
            <span className={isTrimmed ? 'text-amber-400' : ''}>
              {preview.trimStart.toFixed(2)}s – {preview.trimEnd.toFixed(2)}s
            </span>
            <span>/ {preview.duration.toFixed(2)}s</span>
            <span>· {(preview.bytes / 1024).toFixed(0)}KB</span>
            {isTrimmed && (
              <button onClick={handleTrimReset} className="text-amber-400 hover:text-amber-300">reset</button>
            )}
          </div>
          {/* Controls row */}
          <div className="flex items-center gap-2">
            <button onClick={handlePlay} className={BTN_SECONDARY}>
              {isPlaying ? '■ 정지' : '▶ 재생'}
            </button>
            <button onClick={handleDownload} className={BTN_SECONDARY} title="다운로드">
              ↓ 다운로드
            </button>
            <button
              onClick={() => { stopPlayback(); URL.revokeObjectURL(preview.blobUrl); setPreview(null) }}
              className="text-[10px] text-text-dim hover:text-danger-text ml-auto"
            >
              ✕ 닫기
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-xs text-danger-text">{error}</div>}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={generating || !ttsText.trim()}
          className={BTN_PRIMARY}
        >
          {generating ? '생성 중...' : '프리뷰 생성'}
        </button>
        {preview && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={BTN_SECONDARY}
          >
            {saving ? '저장 중...' : '저장 (WAV)'}
          </button>
        )}
        {!preview && (
          <button
            onClick={handleLoadExisting}
            disabled={loading}
            className={BTN_SECONDARY}
            title="기존 파일 로드 (트림 편집)"
          >
            {loading ? '로드 중...' : '기존 파일 로드'}
          </button>
        )}
      </div>
    </div>
  )
}

export function ElevenLabsPanel({ episode, series, name, onRefresh }: ElevenLabsPanelProps) {
  const voiceId = episode.host.elevenlabsVoiceId
  if (!voiceId) return null

  const [settings, setSettings] = useState<VoiceSettings>({ ...DEFAULT_SETTINGS })
  const [open, setOpen] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)

  const locale = (episode as Record<string, unknown>).locale === 'en' ? 'en' : 'ko'

  // Collect celeb lines: philosophy, featuredQuote, shorts celeb segments
  const celebLines: CelebLine[] = []

  if (episode.host.philosophy) {
    celebLines.push({
      key: 'philosophy',
      label: 'B2-philosophy',
      text: episode.host.philosophy,
      fileName: 'elevenlabs/B2-philosophy.wav',
    })
  }

  if (episode.host.featuredQuote) {
    celebLines.push({
      key: 'featured-quote',
      label: 'A3-featured-quote',
      text: episode.host.featuredQuote,
      fileName: 'elevenlabs/A3-featured-quote.wav',
    })
  }

  // 옵션 2: Shorts celeb segments — 접두사 `shorts-{N}/` 필수 (1-based)
  const shortsArrPanel: Array<{ segments?: Array<{ id: string; role: string; visual?: string; text?: string }> }> =
    Array.isArray(episode.shorts) ? (episode.shorts as any) : (episode.shorts ? [episode.shorts as any] : [])
  shortsArrPanel.forEach((cfg, sIdx) => {
    if (!cfg?.segments) return
    const shortsIndex = sIdx + 1  // 1-based
    const prefix = `shorts-${shortsIndex}/`
    let si = 0
    for (const seg of cfg.segments) {
      if (seg.visual === 'hook') { si++; continue }
      if (seg.role === 'celeb' && seg.text) {
        const baseKey = `S${String(si + 1).padStart(2, '0')}-${seg.id}`
        const key = `${prefix}${baseKey}`
        celebLines.push({
          key,
          label: `${key} (쇼츠${shortsArrPanel.length === 1 ? '' : ` ${shortsIndex}`})`,
          text: seg.text,
          fileName: `elevenlabs/${key}.wav`,
        })
      }
      si++
    }
  })

  if (celebLines.length === 0) return null

  const handleReset = () => setSettings({ ...DEFAULT_SETTINGS })

  // Batch generation: generate all celeb lines sequentially and save directly
  const handleBatchGenerate = useCallback(async () => {
    setBatchRunning(true)
    let ok = 0
    let fail = 0

    for (const line of celebLines) {
      if (!line.text.trim()) continue
      setBatchStatus(`${line.label} 생성 중...`)
      try {
        const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId, text: line.text, settings }),
        })
        const data = await res.json()
        if (!data.success) { fail++; continue }

        // Decode and apply gain
        const mp3Bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(mp3Bytes.buffer.slice(0) as ArrayBuffer)
        const boosted = await applyGain(audioBuf, settings.volumeBoost)
        const wavAb = encodeWAV(boosted)
        const wavBase64 = abToBase64(wavAb)
        await audioCtx.close()

        // Save directly
        const saveRes = await fetch(`/api/${series}/voice/elevenlabs/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode: name, fileName: line.fileName, base64: wavBase64 }),
        })
        const saveData = await saveRes.json()
        if (saveData.success) { ok++ } else { fail++ }
      } catch {
        fail++
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 500))
    }

    setBatchRunning(false)
    setBatchStatus(`완료: 성공 ${ok}개, 실패 ${fail}개`)
    if (ok > 0) onRefresh()
    setTimeout(() => setBatchStatus(null), 3000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebLines, voiceId, settings, series, name, onRefresh])

  return (
    <div className="space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="text-[11px] text-text-secondary font-medium flex items-center gap-2">
          ELEVENLABS
          <span className="text-[10px] text-text-dim font-mono">{voiceId}</span>
        </div>
        <span className="text-text-dim text-xs">{open ? '▼' : '▶'}</span>
      </div>

      {open && (
        <div className="space-y-4 pl-1">
          {/* Settings */}
          <div className="space-y-2 bg-bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary font-medium">설정</span>
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="text-[10px] text-text-dim hover:text-text-secondary">
                  기본값 복원
                </button>
              </div>
            </div>
            <Slider label="stability" value={settings.stability} onChange={v => setSettings(s => ({ ...s, stability: v }))} />
            <Slider label="similarity" value={settings.similarity_boost} onChange={v => setSettings(s => ({ ...s, similarity_boost: v }))} />
            <Slider label="style" value={settings.style} onChange={v => setSettings(s => ({ ...s, style: v }))} />
            <Slider label="speed" value={settings.speed} onChange={v => setSettings(s => ({ ...s, speed: v }))} min={0.5} max={2.0} />
            <Slider label="vol boost" value={settings.volumeBoost} onChange={v => setSettings(s => ({ ...s, volumeBoost: v }))} min={0} max={12} step={1} suffix="dB" />

            {/* Playback speed control */}
            <div className="flex items-center gap-3 pt-1 border-t border-border/50">
              <span className="text-[11px] text-text-secondary w-20 shrink-0">재생 배속</span>
              <input
                type="range" min={0.5} max={2.0} step={0.1} value={playbackSpeed}
                onChange={e => setPlaybackSpeed(Number(e.target.value))}
                className="flex-1 h-1 accent-accent"
              />
              <span className={`text-xs w-10 text-right font-mono ${playbackSpeed !== 1.0 ? 'text-amber-400' : 'text-text-dim'}`}>
                {playbackSpeed.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Batch generate button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchGenerate}
              disabled={batchRunning}
              className={BTN_PRIMARY}
            >
              {batchRunning ? '생성 중...' : '전체 생성'}
            </button>
            {batchStatus && (
              <span className="text-[10px] text-text-dim">{batchStatus}</span>
            )}
          </div>

          {/* Celeb lines */}
          {celebLines.map(line => (
            <div key={line.key} className="bg-bg-card rounded-lg p-3 border border-border">
              <CelebLineEditor
                line={line}
                voiceId={voiceId}
                settings={settings}
                series={series}
                name={name}
                playbackSpeed={playbackSpeed}
                onRefresh={onRefresh}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
