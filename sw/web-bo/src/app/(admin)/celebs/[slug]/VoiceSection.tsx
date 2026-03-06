'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Play, Pause, Trash2, Check, Loader2, Volume2, VolumeX } from 'lucide-react'
import { uploadVoiceFile, toggleHasVoice, deleteAllVoiceFiles } from '@/actions/admin/voice'
import { useToast } from '@/contexts/ToastContext'

const R2_PUBLIC_URL = 'https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev'

const DIALOGUE_TYPES = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack'] as const
const TYPE_PREFIX: Record<string, string> = {
  greeting: 'g', roll_call: 'a', deploy: 'd',
  battle_win: 'bw', battle_draw: 'bd', battle_lose: 'bl', clash_attack: 'c',
}
const TYPE_LABELS: Record<string, string> = {
  greeting: '인사', roll_call: '호명', deploy: '출전',
  battle_win: '승리', battle_draw: '무승부', battle_lose: '패배', clash_attack: '공격',
}
const LOCALES = ['ko', 'en'] as const

interface VoiceSectionProps {
  celebId: string
  initialHasVoice: boolean
}

function voiceUrl(celebId: string, locale: string, file: string) {
  return `${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/${file}`
}

export default function VoiceSection({ celebId, initialHasVoice }: VoiceSectionProps) {
  const { showToast } = useToast()
  const [hasVoice, setHasVoice] = useState(initialHasVoice)
  const [activeLang, setActiveLang] = useState<'ko' | 'en'>('ko')
  const [uploading, setUploading] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleToggle = useCallback(async () => {
    const next = !hasVoice
    setHasVoice(next)
    const result = await toggleHasVoice(celebId, next)
    if (!result.success) {
      setHasVoice(!next)
      showToast('error', result.error || '토글 실패')
    }
  }, [celebId, hasVoice, showToast])

  const handleUpload = useCallback(async (fileName: string, file: File) => {
    setUploading(fileName)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadVoiceFile(celebId, activeLang, fileName, fd)
    if (result.success) {
      showToast('success', `${fileName} 업로드 완료`)
    } else {
      showToast('error', result.error || '업로드 실패')
    }
    setUploading(null)
  }, [celebId, activeLang, showToast])

  const handlePlay = useCallback((fileName: string) => {
    const key = `${activeLang}/${fileName}`
    if (playing === key) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(voiceUrl(celebId, activeLang, fileName))
    audio.addEventListener('ended', () => setPlaying(null), { once: true })
    audio.addEventListener('error', () => {
      showToast('error', '파일이 없거나 재생 불가')
      setPlaying(null)
    }, { once: true })
    audio.play().catch(() => setPlaying(null))
    audioRef.current = audio
    setPlaying(key)
  }, [celebId, activeLang, playing, showToast])

  const handleDeleteAll = useCallback(async () => {
    if (!confirm('모든 음성 파일을 삭제하시겠습니까?')) return
    setDeleting(true)
    await deleteAllVoiceFiles(celebId)
    setHasVoice(false)
    showToast('success', '전체 음성 삭제 완료')
    setDeleting(false)
  }, [celebId, showToast])

  const slots: { label: string; fileName: string }[] = []
  for (const type of DIALOGUE_TYPES) {
    const prefix = TYPE_PREFIX[type]
    for (const v of [1, 2, 3]) {
      slots.push({ label: `${TYPE_LABELS[type]} ${v}`, fileName: `${prefix}${v}.mp3` })
    }
  }
  slots.push({ label: '명언', fileName: 'quote.mp3' })

  return (
    <div className="space-y-4">
      {/* has_voice 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className={`relative w-10 h-5 rounded-full transition-colors ${hasVoice ? 'bg-emerald-500' : 'bg-bg-secondary border border-border'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hasVoice ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-text-primary">
            음성 활성화
          </span>
          {hasVoice && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">ON</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={deleting}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          전체 삭제
        </button>
      </div>

      {/* 언어 토글 */}
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => { audioRef.current?.pause(); setPlaying(null); setActiveLang(l) }}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeLang === l ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
          >
            {l === 'ko' ? '한국어' : 'English'}
          </button>
        ))}
      </div>

      {/* 파일 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {slots.map(({ label, fileName }) => {
          const key = `${activeLang}/${fileName}`
          const isPlaying = playing === key
          const isUploading = uploading === fileName
          return (
            <div key={fileName} className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border">
              {/* 라벨 */}
              <span className="text-xs text-text-secondary w-16 shrink-0 truncate">{label}</span>

              {/* 미리듣기 */}
              <button
                type="button"
                onClick={() => handlePlay(fileName)}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${isPlaying ? 'text-emerald-400' : 'text-text-tertiary'}`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {/* 업로드 */}
              <label className={`p-1 rounded cursor-pointer hover:bg-white/10 text-text-tertiary transition-colors ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleUpload(fileName, f)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
