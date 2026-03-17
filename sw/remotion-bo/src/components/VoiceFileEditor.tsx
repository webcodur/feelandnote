'use client'

import { useState, useRef, useCallback } from 'react'
import type { R2FileInfo } from './R2Status'
import { Waveform } from './Waveform'

const BTN = 'px-2 py-0.5 rounded text-xs font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

function StatusDot({ status }: { status: R2FileInfo['status'] }) {
  if (status === 'synced') return <span className="text-success-text text-xs" title="R2 동기화됨">●</span>
  if (status === 'unsynced') return <span className="text-warning-text text-xs" title="로컬 변경됨">▲</span>
  return <span className="text-text-dim text-xs" title="로컬 전용">○</span>
}

const ENGINE_BADGE: Record<string, { label: string; cls: string }> = {
  gemini: { label: 'GEM', cls: 'text-blue-400 bg-blue-400/10' },
  cloud: { label: 'GCP', cls: 'text-yellow-400 bg-yellow-400/10' },
  elevenlabs: { label: 'ELE', cls: 'text-purple-400 bg-purple-400/10' },
  common: { label: 'CMN', cls: 'text-teal-400 bg-teal-400/10' },
}

/** 파일명 → 한글 설명 */
function describeFile(name: string): string {
  // 엔진 서브디렉토리 제거
  const base = name.replace(/^(gemini|cloud|elevenlabs)\//, '').replace('.wav', '')
  // 직접 매핑
  const direct: Record<string, string> = {
    'A1-service-greeting': '서비스 인사',
    'A2-service-intro': '서비스 소개',
    'A3-featured-quote': '대표 명언',
    'B1-celeb-intro': '인물 소개',
    'B2-philosophy': '감상철학',
    'C1-label-summary': '라벨: 요약',
    'C2-label-context': '라벨: 맥락',
    'E1-outro': '아웃트로',
    'E2-interlude': '중간안내',
    'E3-return-intro': '복귀 인사',
    'E4-prev-recap': '전편 요약',
  }
  if (direct[base]) return direct[base]
  // A1-service-greeting-N (파트)
  const partMatch = base.match(/^A1-service-greeting-(\d+)$/)
  if (partMatch) return `인사 파트${partMatch[1]}`
  // D{NN}{phase}
  const bookMatch = base.match(/^D(\d{2})([a-e])-/)
  if (bookMatch) {
    const n = parseInt(bookMatch[1])
    const phase: Record<string, string> = { a: '제목', b: '요약', c: '맥락', d: '인용', e: '후속' }
    return `책${n} ${phase[bookMatch[2]] ?? ''}`
  }
  // S{NN}-{id}
  const shortMatch = base.match(/^S\d{2}-(.+)$/)
  if (shortMatch) return `쇼츠: ${shortMatch[1]}`
  return ''
}

function EngineBadge({ engine }: { engine: R2FileInfo['engine'] }) {
  const b = ENGINE_BADGE[engine] ?? ENGINE_BADGE.active
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${b.cls} shrink-0 w-9 text-center`}>{b.label}</span>
}

interface VoiceFileEditorProps {
  file: R2FileInfo
  series: string
  episode: string
  onRefresh: () => void
}

export function VoiceFileEditor({ file, series, episode, onRefresh }: VoiceFileEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioUrl = `/api/${series}/voice/play/${episode}/${file.name}`

  const togglePlay = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.onpause = () => setIsPlaying(false)
    audio.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [isPlaying, audioUrl])

  const postAction = useCallback(async (url: string, body: unknown, key: string) => {
    setLoading(key)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        alert('실패: ' + (err.error ?? res.statusText))
      } else {
        onRefresh()
      }
    } finally {
      setLoading(null)
    }
  }, [onRefresh])

  const handleRegenerate = () => {
    // Extract the voice key from file name (e.g. "gemini/A1-service-greeting.wav" -> "A1-service-greeting")
    const baseName = file.name.replace(/^(gemini|cloud)\//, '').replace('.wav', '')
    postAction(`/api/${series}/voice/generate`, { episode, only: baseName }, 'regen')
  }

  const handleUpload = () => {
    postAction(`/api/${series}/voice/upload-file`, { episode, fileName: file.name }, 'upload')
  }

  const handleDownload = () => {
    postAction(`/api/${series}/voice/download-file`, { episode, fileName: file.name }, 'download')
  }

  return (
    <div className="border-b border-bg-main">
      {/* Compact row */}
      <div
        className="flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-bg-hover transition-colors font-mono text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={e => { e.stopPropagation(); togglePlay() }}
          className="text-accent hover:text-accent-hover shrink-0 w-5 text-center"
          title={isPlaying ? '정지' : '재생'}
        >
          {isPlaying ? '■' : '▶'}
        </button>
        <StatusDot status={file.status} />
        <EngineBadge engine={file.engine} />
        <span className="flex-1 text-text-secondary truncate">{file.name}</span>
        <span className="text-text-dim w-24 truncate shrink-0">{describeFile(file.name)}</span>
        <span className="text-success-text w-14 text-right shrink-0">{file.duration}s</span>
        <span className="text-text-dim w-16 text-right shrink-0">{file.sizeKB}KB</span>
        <span className="text-text-dim w-4 text-center shrink-0">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-6 pb-3 space-y-2">
          <Waveform audioUrl={audioUrl} isPlaying={isPlaying} duration={file.duration} />
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={loading === 'regen'}
              className={BTN_SECONDARY}
            >
              {loading === 'regen' ? '생성 중...' : '재생성'}
            </button>
            <button
              onClick={handleUpload}
              disabled={loading === 'upload'}
              className={BTN_PRIMARY}
            >
              {loading === 'upload' ? '업로드 중...' : 'R2 업로드'}
            </button>
            <button
              onClick={handleDownload}
              disabled={loading === 'download'}
              className={BTN_SECONDARY}
            >
              {loading === 'download' ? '다운로드 중...' : 'R2 다운로드'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
