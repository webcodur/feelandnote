'use client'

import { useState, useCallback, useEffect } from 'react'
import { ArrowLeft, Save, ChevronDown, Eye, Mic, Copy, ClipboardPaste, Volume2, Cloud, Sparkles, X, Loader2, Headphones, Play, Pause } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import type { EpisodeScript, TtsOverrides } from '@/types/episode'
import { saveEpisodeTexts, generateVoice, getEpisode, getVoiceFiles, getVoiceSelect, saveVoiceSelect } from '@/actions/admin/episodes'
import type { VoiceSelect } from '@/actions/admin/episodes'

interface Props {
  name: string
  initial: EpisodeScript
}

// --- 텍스트 에어리어 (수평: 라벨 좌 | 입력 우) ---
function AutoTextarea({ value, onChange, label, color, rows = 3 }: {
  value: string; onChange: (v: string) => void; label: string; color?: string; rows?: number
}) {
  return (
    <div className="flex gap-4">
      <label className="shrink-0 w-32 pt-2.5 text-sm font-medium text-text-secondary text-right">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="flex-1 bg-bg-main border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm resize-y focus:outline-none focus:border-accent"
        style={color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
      />
    </div>
  )
}

function TextInput({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label: string
}) {
  return (
    <div className="flex gap-4 items-center">
      <label className="shrink-0 w-32 text-sm font-medium text-text-secondary text-right">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-bg-main border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
      />
    </div>
  )
}

// --- TTS 오버라이드 토글 (수평 정렬) ---
function TtsField({ value, onChange, placeholder }: {
  value: string | undefined; onChange: (v: string | undefined) => void; placeholder: string
}) {
  const [open, setOpen] = useState(!!value)
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-32 flex justify-end pt-0.5">
        <button
          type="button"
          onClick={() => { setOpen(!open); if (open) onChange(undefined) }}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent cursor-pointer"
        >
          <Mic className="w-3 h-3" />
          TTS {value ? '✓' : ''}
        </button>
      </div>
      {open && (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
          rows={2}
          placeholder={placeholder}
          className="flex-1 bg-bg-main/50 border border-border/50 rounded px-3 py-2 text-text-secondary text-xs resize-y focus:outline-none focus:border-accent/50"
        />
      )}
    </div>
  )
}

// --- 책 아코디언 ---
function BookItem({ index, total, book, ttsBook, onChange, onTtsChange }: {
  index: number
  total: number
  book: EpisodeScript['books'][0]
  ttsBook: NonNullable<TtsOverrides['books']>[0] | undefined
  onChange: (field: string, value: string) => void
  onTtsChange: (field: string, value: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 cursor-pointer hover:bg-white/5 flex items-center gap-4"
      >
        <img src={book.thumbnail_url} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-text-primary font-semibold text-sm truncate">
            {index + 1}/{total}. {book.title}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{book.creator}</div>
        </div>
        <div className="text-xs text-text-secondary shrink-0 mr-2">
          {book.stats.publishYear}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* 읽기 전용 메타 */}
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            {book.source && <span>출처: {book.source}</span>}
            {book.stats.publisher && <span>· {book.stats.publisher}</span>}
            <span>· 추천 셀럽 {book.stats.celebCount}명</span>
          </div>

          <AutoTextarea label="핵심 요약 (요약맨)" value={book.summary} onChange={v => onChange('summary', v)} color="#8bb8a8" rows={4} />
          <TtsField value={ttsBook?.summary} onChange={v => onTtsChange('summary', v)} placeholder="TTS용 요약 텍스트 (한글 숫자 등)" />

          <AutoTextarea label="추천 경위 (나레이터)" value={book.context} onChange={v => onChange('context', v)} color="#999" rows={4} />
          <TtsField value={ttsBook?.context} onChange={v => onTtsChange('context', v)} placeholder="TTS용 경위 텍스트" />

          {book.directQuote !== undefined && (
            <>
              <AutoTextarea label="직접 인용문 (셀럽)" value={book.directQuote ?? ''} onChange={v => onChange('directQuote', v)} color="#c8a46e" rows={2} />
              <TextInput label="인용 출처" value={book.directQuoteSource ?? ''} onChange={v => onChange('directQuoteSource', v)} />
              <TtsField value={ttsBook?.directQuote} onChange={v => onTtsChange('directQuote', v)} placeholder="TTS용 인용문" />
            </>
          )}

          {book.contextAfter !== undefined && (
            <>
              <AutoTextarea label="후속 맥락 (나레이터)" value={book.contextAfter ?? ''} onChange={v => onChange('contextAfter', v)} color="#999" rows={3} />
              <TtsField value={ttsBook?.contextAfter} onChange={v => onTtsChange('contextAfter', v)} placeholder="TTS용 후속 맥락" />
            </>
          )}

          <TextInput label="리캡 한줄 요약" value={book.oneLiner} onChange={v => onChange('oneLiner', v)} />

          {/* TTS 제목 (화면 대응 없는 독립 필드) */}
          <TtsField value={ttsBook?.title} onChange={v => onTtsChange('title', v)} placeholder="TTS용 제목+저자+연도 (예: 일리아스, 호메로스, 기원전 팔 세기)" />
        </div>
      )}
    </div>
  )
}

// --- 미리보기 ---
type PreviewLine = { type: 'section' | 'line'; speaker?: string; text: string; color?: string }

function ScriptPreview({ data }: { data: EpisodeScript }) {
  const [open, setOpen] = useState(false)
  const lines: PreviewLine[] = []
  const hasInterlude = data.books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(data.books.length / 2) : -1

  // 브랜드
  lines.push({ type: 'section', text: 'BRAND — FEEL AND NOTE' })

  // 서비스 인트로
  if (data.narrator.serviceIntro) {
    lines.push({ type: 'section', text: 'SERVICE INTRO' })
    lines.push({ type: 'line', speaker: '나레이터', text: data.narrator.serviceIntro, color: '#888' })
  }

  // 명언
  if (data.host.featuredQuote) {
    lines.push({ type: 'section', text: 'FEATURED QUOTE' })
    lines.push({ type: 'line', speaker: data.host.nickname, text: `"${data.host.featuredQuote}"`, color: '#c8a46e' })
  }

  // 인물 소개
  lines.push({ type: 'section', text: 'HOST INTRO — 인물 소개' })
  lines.push({ type: 'line', speaker: '나레이터', text: data.narrator.celebIntro, color: '#888' })

  // 감상철학
  lines.push({ type: 'section', text: 'HOST INTRO — 감상철학' })
  lines.push({ type: 'line', speaker: data.host.nickname, text: data.host.philosophy, color: '#c8a46e' })

  // 브릿지
  lines.push({ type: 'section', text: 'BRIDGE' })
  lines.push({ type: 'line', speaker: '나레이터', text: data.narrator.bridge, color: '#666' })

  // 도서
  for (let i = 0; i < data.books.length; i++) {
    // 중간 리캡 + 인터루드
    if (i === interludeIndex) {
      lines.push({ type: 'section', text: 'RECAP — PART I' })
      lines.push({ type: 'section', text: 'INTERLUDE — PART II' })
      if (data.narrator.interlude) {
        lines.push({ type: 'line', speaker: '나레이터', text: data.narrator.interlude, color: '#666' })
      }
    }

    const b = data.books[i]
    lines.push({ type: 'section', text: `BOOK ${i + 1}/${data.books.length} — ${b.title}` })
    lines.push({ type: 'line', speaker: '나레이터', text: `${b.title}, ${b.creator}`, color: '#888' })
    lines.push({ type: 'line', speaker: '요약', text: b.summary, color: '#8bb8a8' })
    lines.push({ type: 'line', speaker: '나레이터', text: b.context, color: '#888' })
    if (b.directQuote) lines.push({ type: 'line', speaker: data.host.nickname, text: `"${b.directQuote}"`, color: '#c8a46e' })
    if (b.contextAfter) lines.push({ type: 'line', speaker: '나레이터', text: b.contextAfter, color: '#888' })
  }

  // 리캡
  lines.push({ type: 'section', text: hasInterlude ? 'RECAP — PART II' : 'RECAP' })

  // 아웃트로
  lines.push({ type: 'section', text: 'OUTRO' })
  lines.push({ type: 'line', speaker: '나레이터', text: data.narrator.outro, color: '#888' })

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 cursor-pointer hover:bg-white/5 flex items-center gap-3"
      >
        <Eye className="w-4 h-4 text-text-secondary" />
        <span className="flex-1 text-left text-sm font-semibold text-text-primary">대본 미리보기</span>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 max-h-[600px] overflow-y-auto">
          {lines.map((l, i) => l.type === 'section' ? (
            <div key={i} className="pt-3 pb-1 border-b border-border/50">
              <span className="text-xs font-semibold text-accent/70 tracking-wider">{l.text}</span>
            </div>
          ) : (
            <div key={i} className="text-sm pl-3">
              <span className="text-xs font-medium mr-2" style={{ color: l.color }}>{l.speaker}</span>
              <span className="text-text-secondary">{l.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- TTS 생성 패널 ---
type TtsTarget = { engine: 'gemini' | 'cloud'; role?: string; label: string }

function TtsPanel({ name, bookCount, hasElevenlabs, onJsonUpdated }: {
  name: string; bookCount: number; hasElevenlabs?: boolean; onJsonUpdated?: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [only, setOnly] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [forceAll, setForceAll] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (target: TtsTarget) => {
    setGenerating(true)
    setActiveLabel(target.label)
    setOutput(null)
    setError(null)

    const result = await generateVoice(
      name, target.engine, only || undefined, autoUpdate, forceAll, target.role,
    )

    if (result.success) {
      setOutput(result.output ?? '완료')
      if (autoUpdate) onJsonUpdated?.()
    } else {
      setError(result.error ?? '알 수 없는 오류')
    }
    setGenerating(false)
    setActiveLabel(null)
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">TTS 음성 생성</span>
        </div>

        {/* 특정 파일만 */}
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            특정 파일만 (비우면 전체, 쉼표 구분)
          </label>
          <input
            type="text"
            value={only}
            onChange={e => setOnly(e.target.value)}
            placeholder="예: book-0-summary,narrator-celeb-intro"
            className="w-full bg-bg-main border border-border rounded px-3 py-1.5 text-text-primary text-xs focus:outline-none focus:border-accent"
            disabled={generating}
          />
        </div>

        {/* 옵션 */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={e => setAutoUpdate(e.target.checked)}
              className="rounded border-border accent-accent"
              disabled={generating}
            />
            <span className="text-xs text-text-secondary">Duration 자동 반영</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceAll}
              onChange={e => setForceAll(e.target.checked)}
              className="rounded border-border accent-accent"
              disabled={generating}
            />
            <span className="text-xs text-text-secondary">전체 재생성 (force)</span>
          </label>
        </div>

        {/* 역할별 버튼 */}
        <div className="space-y-2">
          <div className="text-xs text-text-secondary font-medium">전체 생성</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleGenerate({ engine: 'gemini', label: 'Gemini 전체' })}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {activeLabel === 'Gemini 전체' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gemini 전체
            </button>
            <button
              onClick={() => handleGenerate({ engine: 'cloud', label: 'Cloud 전체' })}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {activeLabel === 'Cloud 전체' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              Cloud 전체
            </button>
          </div>

          <div className="text-xs text-text-secondary font-medium mt-2">역할별 생성</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleGenerate({ engine: 'cloud', role: 'narrator', label: '나레이터' })}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {activeLabel === '나레이터' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
              나레이터 (Cloud)
            </button>
            <button
              onClick={() => handleGenerate({ engine: 'cloud', role: 'summary', label: '요약맨' })}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-900/30 text-teal-300 hover:bg-teal-900/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {activeLabel === '요약맨' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
              요약맨 (Cloud)
            </button>
            <button
              onClick={() => handleGenerate({ engine: 'cloud', role: 'celeb', label: '셀럽' })}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {activeLabel === '셀럽' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              셀럽 {hasElevenlabs ? '(ElevenLabs)' : '(Cloud)'}
            </button>
          </div>

          {generating && (
            <span className="text-xs text-text-secondary">
              {activeLabel} 생성 중... ({bookCount}권, 수 분 소요)
            </span>
          )}
        </div>

        {/* 결과 출력 */}
        {output && (
          <div className="relative">
            <button onClick={() => setOutput(null)} className="absolute top-2 right-2 text-text-secondary hover:text-text-primary cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
            <pre className="bg-bg-main rounded-lg p-3 text-xs text-emerald-400 max-h-64 overflow-y-auto whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        )}
        {error && (
          <div className="relative">
            <button onClick={() => setError(null)} className="absolute top-2 right-2 text-text-secondary hover:text-text-primary cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
            <pre className="bg-red-950/30 rounded-lg p-3 text-xs text-red-400 max-h-64 overflow-y-auto whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// --- 음성 소스 선택 패널 ---
const ENGINES = ['gemini', 'cloud', 'elevenlabs'] as const
const ENGINE_LABELS: Record<string, string> = { gemini: 'Gemini', cloud: 'Cloud', elevenlabs: 'ElevenLabs' }
const ENGINE_COLORS: Record<string, string> = {
  gemini: 'text-amber-300',
  cloud: 'text-blue-300',
  elevenlabs: 'text-purple-300',
}

function VoiceSelectPanel({ name }: { name: string }) {
  const [files, setFiles] = useState<Record<string, string[]>>({})
  const [select, setSelect] = useState<VoiceSelect>({ default: 'gemini' })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useState<HTMLAudioElement | null>(null)

  // 초기 로드
  useEffect(() => {
    async function load() {
      const [f, s] = await Promise.all([getVoiceFiles(name), getVoiceSelect(name)])
      setFiles(f)
      if (s) setSelect(s)
      setLoaded(true)
    }
    load()
  }, [name])

  // 모든 엔진에 존재하는 슬롯 합산 (manifest.json 제외)
  const allSlots = [...new Set(
    ENGINES.flatMap(e => files[e] ?? []).filter(f => f !== 'manifest.json')
  )].sort()

  if (!loaded || allSlots.length === 0) return null

  const getEngine = (slot: string) => select.slots?.[slot] ?? select.default
  const hasFile = (engine: string, slot: string) => files[engine]?.includes(slot) ?? false

  const handleSelect = (slot: string, engine: string) => {
    setSelect(prev => {
      const slots = { ...prev.slots }
      if (engine === prev.default) {
        delete slots[slot]
      } else {
        slots[slot] = engine
      }
      return { ...prev, slots }
    })
    setDirty(true)
  }

  const handleDefault = (engine: string) => {
    setSelect(prev => {
      // 기존 default에 해당하는 slots 항목은 명시적으로 설정
      const slots: Record<string, string> = {}
      for (const slot of allSlots) {
        const current = prev.slots?.[slot] ?? prev.default
        if (current !== engine) {
          slots[slot] = current
        }
      }
      return { default: engine, slots }
    })
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveVoiceSelect(name, select)
    setSaving(false)
    if (result.success) {
      setDirty(false)
      setToast('voice-select.json 저장 완료')
      setTimeout(() => setToast(null), 2000)
    } else {
      setToast(`오류: ${result.error}`)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handlePlay = (engine: string, slot: string) => {
    const key = `${engine}/${slot}`
    if (playing === key) {
      audioRef[0]?.pause()
      setPlaying(null)
      return
    }
    audioRef[0]?.pause()
    const audio = new Audio(`/api/voice/${name}/${engine}/${slot}`)
    audio.onended = () => setPlaying(null)
    audio.play()
    audioRef[0] = audio
    setPlaying(key)
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Headphones className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary flex-1">음성 소스 선택</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">기본:</span>
            <select
              value={select.default}
              onChange={e => handleDefault(e.target.value)}
              className="bg-bg-main border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
            >
              {ENGINES.map(e => (
                <option key={e} value={e}>{ENGINE_LABELS[e]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-text-secondary font-medium w-48">슬롯</th>
                {ENGINES.map(e => (
                  <th key={e} className={`text-center py-2 px-2 font-medium ${ENGINE_COLORS[e]}`}>
                    {ENGINE_LABELS[e]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSlots.map(slot => {
                const selected = getEngine(slot)
                return (
                  <tr key={slot} className="border-b border-border/20 hover:bg-white/3">
                    <td className="py-1.5 px-2 text-text-secondary font-mono truncate" title={slot}>
                      {slot.replace('.wav', '')}
                    </td>
                    {ENGINES.map(engine => {
                      const exists = hasFile(engine, slot)
                      const isSelected = selected === engine
                      const isPlaying = playing === `${engine}/${slot}`

                      if (!exists) {
                        return <td key={engine} className="text-center py-1.5 px-2 text-neutral-700">—</td>
                      }

                      return (
                        <td key={engine} className="text-center py-1.5 px-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSelect(slot, engine)}
                              className={`w-4 h-4 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'border-accent bg-accent'
                                  : 'border-neutral-600 hover:border-neutral-400'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-bg-main" />}
                            </button>
                            <button
                              onClick={() => handlePlay(engine, slot)}
                              className="p-0.5 rounded hover:bg-white/10 cursor-pointer text-text-secondary hover:text-text-primary"
                              title="재생"
                            >
                              {isPlaying
                                ? <Pause className="w-3 h-3" />
                                : <Play className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 범례 + 저장 */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-text-secondary">
            ● 선택됨 · ▶ 재생 · — 파일 없음
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            저장
          </button>
        </div>

        {toast && (
          <div className="bg-bg-main rounded-lg px-3 py-2 text-xs text-emerald-400">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

// --- 메인 편집기 ---
export function EpisodeEditor({ name, initial }: Props) {
  const [data, setData] = useState<EpisodeScript>(initial)
  const [tts, setTts] = useState<TtsOverrides>(initial.tts ?? {})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // TTS 완료 후 JSON 리로드
  const reloadFromJson = useCallback(async () => {
    const fresh = await getEpisode(name)
    setData(fresh)
    setTts(fresh.tts ?? {})
    setToast('Duration 반영됨 — 데이터 새로고침')
    setTimeout(() => setToast(null), 3000)
  }, [name])

  // dirty state 이탈 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const mark = useCallback(() => setDirty(true), [])

  const updateNarrator = useCallback((field: string, value: string) => {
    setData(d => ({ ...d, narrator: { ...d.narrator, [field]: value } }))
    mark()
  }, [mark])

  const updateHost = useCallback((field: string, value: string) => {
    setData(d => ({ ...d, host: { ...d.host, [field]: value } }))
    mark()
  }, [mark])

  const updateBook = useCallback((index: number, field: string, value: string) => {
    setData(d => {
      const books = [...d.books]
      books[index] = { ...books[index], [field]: value }
      return { ...d, books }
    })
    mark()
  }, [mark])

  const updateTtsNarrator = useCallback((field: string, value: string | undefined) => {
    setTts(t => ({ ...t, narrator: { ...t.narrator, [field]: value } }))
    mark()
  }, [mark])

  const updateTtsHost = useCallback((field: string, value: string | undefined) => {
    setTts(t => ({ ...t, host: { ...t.host, [field]: value } }))
    mark()
  }, [mark])

  const updateTtsBook = useCallback((index: number, field: string, value: string | undefined) => {
    setTts(t => {
      const books = [...(t.books ?? [])]
      while (books.length <= index) books.push({})
      books[index] = { ...books[index], [field]: value }
      return { ...t, books }
    })
    mark()
  }, [mark])

  // --- 대본 텍스트 복사/붙여넣기 ---
  const exportText = useCallback(() => {
    const lines: string[] = []
    lines.push(`# ${data.host.nickname} — 영상 대본`)
    lines.push('')
    if (data.narrator.serviceIntro) {
      lines.push('## 서비스 인트로')
      lines.push(data.narrator.serviceIntro)
      lines.push('')
    }
    lines.push('## 인물 소개 (나레이터)')
    lines.push(data.narrator.celebIntro)
    lines.push('')
    lines.push(`## 감상철학 (${data.host.nickname})`)
    lines.push(data.host.philosophy)
    lines.push('')
    lines.push('## 브릿지')
    lines.push(data.narrator.bridge)
    if (data.narrator.interlude) {
      lines.push('')
      lines.push('## 중간안내')
      lines.push(data.narrator.interlude)
    }
    lines.push('')

    for (let i = 0; i < data.books.length; i++) {
      const b = data.books[i]
      lines.push(`---`)
      lines.push(`## ${i + 1}. ${b.title} — ${b.creator}`)
      lines.push('')
      lines.push('### 핵심 요약')
      lines.push(b.summary)
      lines.push('')
      lines.push('### 추천 경위')
      lines.push(b.context)
      if (b.directQuote) {
        lines.push('')
        lines.push('### 직접 인용문')
        lines.push(b.directQuote)
        if (b.directQuoteSource) lines.push(`출처: ${b.directQuoteSource}`)
      }
      if (b.contextAfter) {
        lines.push('')
        lines.push('### 후속 맥락')
        lines.push(b.contextAfter)
      }
      lines.push('')
      lines.push(`### 한줄 요약: ${b.oneLiner}`)
      lines.push('')
    }

    lines.push('---')
    lines.push('## 아웃트로 (나레이터)')
    lines.push(data.narrator.outro)

    return lines.join('\n')
  }, [data])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(exportText())
    setToast('대본 복사됨')
    setTimeout(() => setToast(null), 2000)
  }, [exportText])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.includes('## 인물 소개') && !text.includes('## 감상철학')) {
        setToast('올바른 대본 형식이 아닙니다')
        setTimeout(() => setToast(null), 3000)
        return
      }

      // 파싱
      const section = (header: string, nextHeaders: string[]): string => {
        const idx = text.indexOf(header)
        if (idx === -1) return ''
        const start = text.indexOf('\n', idx) + 1
        let end = text.length
        for (const nh of nextHeaders) {
          const ni = text.indexOf(nh, start)
          if (ni !== -1 && ni < end) end = ni
        }
        return text.slice(start, end).trim()
      }

      const serviceIntro = text.includes('## 서비스 인트로') ? section('## 서비스 인트로', ['## 인물 소개']) : undefined
      const celebIntro = section('## 인물 소개', ['## 감상철학'])
      const philosophy = section('## 감상철학', ['## 브릿지'])
      const bridge = section('## 브릿지', ['## 중간안내', '---'])
      const interlude = text.includes('## 중간안내') ? section('## 중간안내', ['---']) : undefined
      const outro = section('## 아웃트로', [])

      if (serviceIntro !== undefined) updateNarrator('serviceIntro', serviceIntro)
      if (celebIntro) updateNarrator('celebIntro', celebIntro)
      if (philosophy) updateHost('philosophy', philosophy)
      if (bridge) updateNarrator('bridge', bridge)
      if (interlude !== undefined) updateNarrator('interlude', interlude)
      if (outro) updateNarrator('outro', outro)

      // 책 파싱
      const bookPattern = /## \d+\.\s+.+?\s*—\s*.+/g
      const bookHeaders = [...text.matchAll(bookPattern)]
      for (let i = 0; i < bookHeaders.length && i < data.books.length; i++) {
        const start = bookHeaders[i].index!
        const end = i + 1 < bookHeaders.length ? bookHeaders[i + 1].index! : text.indexOf('## 아웃트로')
        const block = text.slice(start, end === -1 ? undefined : end)

        const bookSection = (h: string, nexts: string[]): string => {
          const idx = block.indexOf(h)
          if (idx === -1) return ''
          const s = block.indexOf('\n', idx) + 1
          let e = block.length
          for (const nh of nexts) {
            const ni = block.indexOf(nh, s)
            if (ni !== -1 && ni < e) e = ni
          }
          return block.slice(s, e).trim()
        }

        const summary = bookSection('### 핵심 요약', ['### 추천 경위', '### 직접 인용문', '### 후속 맥락', '### 한줄 요약'])
        const context = bookSection('### 추천 경위', ['### 직접 인용문', '### 후속 맥락', '### 한줄 요약'])
        const directQuote = bookSection('### 직접 인용문', ['### 후속 맥락', '### 한줄 요약'])
        const contextAfter = bookSection('### 후속 맥락', ['### 한줄 요약'])
        const oneLineMatch = block.match(/### 한줄 요약:\s*(.+)/)

        if (summary) updateBook(i, 'summary', summary)
        if (context) updateBook(i, 'context', context)
        if (directQuote) {
          // 출처 분리
          const quoteLines = directQuote.split('\n')
          const sourceLine = quoteLines.find(l => l.startsWith('출처:'))
          const pureQuote = quoteLines.filter(l => !l.startsWith('출처:')).join('\n').trim()
          if (pureQuote) updateBook(i, 'directQuote', pureQuote)
          if (sourceLine) updateBook(i, 'directQuoteSource', sourceLine.replace('출처:', '').trim())
        }
        if (contextAfter) updateBook(i, 'contextAfter', contextAfter)
        if (oneLineMatch?.[1]) updateBook(i, 'oneLiner', oneLineMatch[1].trim())
      }

      setToast(`대본 적용됨 (${bookHeaders.length}권)`)
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('클립보드 읽기 실패')
      setTimeout(() => setToast(null), 3000)
    }
  }, [data.books.length, updateNarrator, updateHost, updateBook])

  const handleSave = async () => {
    setSaving(true)
    // tts에서 빈 오버라이드 정리
    const cleanTts: TtsOverrides = {}
    if (tts.narrator) {
      const n: any = {}
      if (tts.narrator.serviceIntro) n.serviceIntro = tts.narrator.serviceIntro
      if (tts.narrator.celebIntro) n.celebIntro = tts.narrator.celebIntro
      if (tts.narrator.outro) n.outro = tts.narrator.outro
      if (Object.keys(n).length) cleanTts.narrator = n
    }
    if (tts.host) {
      const h: any = {}
      if (tts.host.philosophy) h.philosophy = tts.host.philosophy
      if (Object.keys(h).length) cleanTts.host = h
    }
    if (tts.books?.length) {
      const cleanBooks = tts.books.map(b => {
        const cb: any = {}
        if (b.title) cb.title = b.title
        if (b.summary) cb.summary = b.summary
        if (b.context) cb.context = b.context
        if (b.contextAfter) cb.contextAfter = b.contextAfter
        if (b.directQuote) cb.directQuote = b.directQuote
        return cb
      })
      if (cleanBooks.some((b: any) => Object.keys(b).length)) cleanTts.books = cleanBooks
    }

    const result = await saveEpisodeTexts(name, {
      narrator: {
        serviceIntro: data.narrator.serviceIntro,
        celebIntro: data.narrator.celebIntro,
        bridge: data.narrator.bridge,
        outro: data.narrator.outro,
        interlude: data.narrator.interlude,
      },
      host: { philosophy: data.host.philosophy },
      books: data.books.map(b => ({
        summary: b.summary,
        context: b.context,
        directQuote: b.directQuote,
        directQuoteSource: b.directQuoteSource,
        contextAfter: b.contextAfter,
        oneLiner: b.oneLiner,
      })),
      tts: Object.keys(cleanTts).length ? cleanTts : undefined,
    })

    setSaving(false)
    if (result.success) {
      setDirty(false)
      setToast('저장 완료')
      setTimeout(() => setToast(null), 2000)
    } else {
      setToast(`오류: ${result.error}`)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/episodes" className="p-2 rounded-lg hover:bg-bg-card text-text-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <img src={data.host.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">{data.host.nickname}</h1>
          <div className="text-sm text-text-secondary">{data.books.length}권 · {name}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            <Copy className="w-3.5 h-3.5" />
            대본 복사
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePaste}>
            <ClipboardPaste className="w-3.5 h-3.5" />
            대본 붙여넣기
          </Button>
        </div>
      </div>

      {/* 나레이터/호스트 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">나레이터 / 호스트</h2>
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-4">
          <TextInput label="서비스 인트로 (나레이터)" value={data.narrator.serviceIntro} onChange={v => updateNarrator('serviceIntro', v)} />
          <TtsField value={tts.narrator?.serviceIntro} onChange={v => updateTtsNarrator('serviceIntro', v)} placeholder="TTS용 서비스 인트로" />

          <AutoTextarea label="인물 소개 (나레이터)" value={data.narrator.celebIntro} onChange={v => updateNarrator('celebIntro', v)} color="#888" />
          <TtsField value={tts.narrator?.celebIntro} onChange={v => updateTtsNarrator('celebIntro', v)} placeholder="TTS용 인물 소개" />

          <AutoTextarea label="감상철학 (셀럽 1인칭)" value={data.host.philosophy} onChange={v => updateHost('philosophy', v)} color="#c8a46e" rows={4} />
          <TtsField value={tts.host?.philosophy} onChange={v => updateTtsHost('philosophy', v)} placeholder="TTS용 감상철학" />

          <TextInput label="브릿지" value={data.narrator.bridge} onChange={v => updateNarrator('bridge', v)} />

          {data.narrator.interlude !== undefined && (
            <TextInput label="중간안내" value={data.narrator.interlude ?? ''} onChange={v => updateNarrator('interlude', v)} />
          )}

          <AutoTextarea label="아웃트로 (나레이터)" value={data.narrator.outro} onChange={v => updateNarrator('outro', v)} color="#888" />
          <TtsField value={tts.narrator?.outro} onChange={v => updateTtsNarrator('outro', v)} placeholder="TTS용 아웃트로" />
        </div>
      </section>

      {/* 책 목록 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">도서 ({data.books.length}권)</h2>
        {data.books.map((book, i) => (
          <BookItem
            key={i}
            index={i}
            total={data.books.length}
            book={book}
            ttsBook={tts.books?.[i]}
            onChange={(field, value) => updateBook(i, field, value)}
            onTtsChange={(field, value) => updateTtsBook(i, field, value)}
          />
        ))}
      </section>

      {/* TTS 생성 */}
      <TtsPanel name={name} bookCount={data.books.length} hasElevenlabs={!!data.host.elevenlabsVoiceId} onJsonUpdated={reloadFromJson} />

      {/* 음성 소스 선택 */}
      <VoiceSelectPanel name={name} />

      {/* 미리보기 */}
      <ScriptPreview data={data} />

      {/* 하단 저장 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur border-t border-border px-6 py-3 flex items-center justify-between z-50">
        <div className="text-sm text-text-secondary">
          {dirty ? '변경사항 있음' : '저장됨'}
        </div>
        <Button variant="primary" size="md" onClick={handleSave} disabled={saving || !dirty}>
          <Save className="w-4 h-4" />
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-16 right-6 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
