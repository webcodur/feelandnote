'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, Trash2, Loader2, FolderUp } from 'lucide-react'
import { uploadVoiceFile, toggleHasVoice, deleteAllVoiceFiles, getVoiceStatus } from '@/actions/admin/voice'
import { bumpVoiceVersion } from '@/actions/admin/voice-gen'
import { useToast } from '@/contexts/ToastContext'
import { LOCALES, allVoiceSlots, voicePublicUrl } from '@/lib/voice-path'

const SLOTS = allVoiceSlots()
const VALID_FILES = new Set(SLOTS.map((s) => s.fileName))

interface VoiceSectionProps {
  celebId: string
  initialHasVoice: boolean
}

export default function VoiceSection({ celebId, initialHasVoice }: VoiceSectionProps) {
  const { showToast } = useToast()
  const [hasVoice, setHasVoice] = useState(initialHasVoice)
  const [voiceV, setVoiceV] = useState(0)
  const [activeLang, setActiveLang] = useState<'ko' | 'en'>('ko')
  const [uploading, setUploading] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null)
  const [batchResults, setBatchResults] = useState<{ matched: string[]; skipped: string[] } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    getVoiceStatus(celebId).then(({ voiceV: v }) => setVoiceV(v)).catch(() => {})
  }, [celebId])

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
      const newV = await bumpVoiceVersion(celebId)
      setVoiceV(newV)
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
    const audio = new Audio(voicePublicUrl(celebId, activeLang, fileName, voiceV))
    audio.addEventListener('ended', () => setPlaying(null), { once: true })
    audio.addEventListener('error', () => {
      showToast('error', '파일이 없거나 재생 불가')
      setPlaying(null)
    }, { once: true })
    audio.play().catch(() => setPlaying(null))
    audioRef.current = audio
    setPlaying(key)
  }, [celebId, activeLang, voiceV, playing, showToast])

  const handleDeleteAll = useCallback(async () => {
    if (!confirm('모든 음성 파일을 삭제하시겠습니까?')) return
    setDeleting(true)
    await deleteAllVoiceFiles(celebId)
    setHasVoice(false)
    setVoiceV(0)
    showToast('success', '전체 음성 삭제 완료')
    setDeleting(false)
  }, [celebId, showToast])

  const handleBatchUpload = useCallback(async (files: FileList) => {
    const matched: { file: File; fileName: string }[] = []
    const skipped: string[] = []

    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase()
      if (VALID_FILES.has(name)) {
        matched.push({ file, fileName: name })
      } else {
        skipped.push(file.name)
      }
    }

    setBatchResults({ matched: matched.map(m => m.fileName), skipped })

    if (matched.length === 0) {
      showToast('error', '매칭되는 파일이 없다. (g1~3, r1~3, d1~3, bw1~3, bd1~3, bl1~3, c1~3, quote)')
      return
    }

    setBatchProgress({ done: 0, total: matched.length, current: matched[0].fileName })

    let success = 0
    let fail = 0
    for (let i = 0; i < matched.length; i++) {
      const { file, fileName } = matched[i]
      setBatchProgress({ done: i, total: matched.length, current: fileName })
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadVoiceFile(celebId, activeLang, fileName, fd)
      if (result.success) success++
      else fail++
    }

    // 배치 완료 후 1회 bump
    if (success > 0) {
      const newV = await bumpVoiceVersion(celebId)
      setVoiceV(newV)
    }

    setBatchProgress(null)
    showToast('success', `배치 업로드 완료: ${success}개 성공${fail > 0 ? `, ${fail}개 실패` : ''}`)
  }, [celebId, activeLang, showToast])

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

      {/* 언어 토글 + 배치 업로드 */}
      <div className="flex items-center gap-3">
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

        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${batchProgress ? 'pointer-events-none opacity-50 bg-accent/10 text-accent' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}>
          <FolderUp className="w-4 h-4" />
          {batchProgress
            ? `${batchProgress.done}/${batchProgress.total} ${batchProgress.current}`
            : '배치 업로드'}
          <input
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleBatchUpload(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* 배치 결과 */}
      {batchResults && (
        <div className="text-xs space-y-1">
          {batchResults.matched.length > 0 && (
            <p className="text-emerald-400">매칭: {batchResults.matched.join(', ')}</p>
          )}
          {batchResults.skipped.length > 0 && (
            <p className="text-amber-400">스킵: {batchResults.skipped.join(', ')}</p>
          )}
        </div>
      )}

      {/* 파일 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {SLOTS.map(({ label, fileName }) => {
          const key = `${activeLang}/${fileName}`
          const isPlaying = playing === key
          const isUploading = uploading === fileName
          return (
            <div key={fileName} className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border">
              <span className="text-xs text-text-secondary w-16 shrink-0 truncate">{label}</span>

              <button
                type="button"
                onClick={() => handlePlay(fileName)}
                className={`p-1 rounded hover:bg-white/10 transition-colors ${isPlaying ? 'text-emerald-400' : 'text-text-tertiary'}`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

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
