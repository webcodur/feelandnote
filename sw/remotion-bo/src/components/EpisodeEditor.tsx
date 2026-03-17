'use client'

import { useState, useCallback } from 'react'

// --- Types mirroring remotion BookRecommendScript ---
type BookStats = {
  publisher?: string
  originalTitle?: string
  publishYear?: string
  celebCount?: number
}

type BookEntry = {
  title: string
  creator: string
  thumbnail_url: string
  summary: string
  summaryDuration: number
  context: string
  contextDuration: number
  directQuote?: string
  directQuoteSource?: string
  quoteDuration?: number
  contextAfter?: string
  contextAfterDuration?: number
  source?: string
  oneLiner: string
  stats: BookStats
  titleDuration: number
}

type NarratorLines = {
  serviceGreeting?: string
  serviceGreetingDuration?: number
  serviceIntro?: string
  serviceIntroDuration?: number
  celebIntro?: string
  celebIntroDuration?: number
  returnIntro?: string
  returnIntroDuration?: number
  prevRecap?: string
  prevRecapDuration?: number
  bridge: string
  bridgeDuration: number
  labelSummaryDuration?: number
  labelContextDuration?: number
  interlude?: string
  interludeDuration?: number
  outro: string
  outroDuration: number
}

type ShortSegment = {
  id: string
  role: 'narrator' | 'celeb'
  text: string
  visual: 'hook' | 'intro' | 'book' | 'cta'
  duration?: number
}

type ShortsConfig = {
  featuredBookIndex?: number
  segments: ShortSegment[]
}

type CelebHost = {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  bio: string
  title: string
  featuredQuote?: string
  featuredQuoteDuration?: number
  philosophy?: string
  voiceDuration?: number
  elevenlabsVoiceId?: string
  geminiVoice?: string
}

export type EpisodeData = {
  host: CelebHost
  narrator: NarratorLines
  books: BookEntry[]
  shorts?: ShortsConfig
  [key: string]: unknown
}

// --- UI helpers ---
const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors'
const LABEL_CLS = 'text-[11px] text-text-secondary font-medium mb-0.5'
const INPUT_CLS = 'w-full bg-bg-main border border-border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent'
const BADGE_CLS = 'text-[10px] px-1.5 py-0.5 rounded bg-bg-main text-text-dim font-mono shrink-0'
const BTN_SM = 'px-2 py-0.5 rounded text-xs font-semibold'
const BTN_DANGER = `${BTN_SM} bg-danger text-danger-text hover:opacity-80`
const BTN_ADD = `${BTN_SM} bg-bg-card border border-border text-accent hover:bg-bg-hover`

// --- Accordion ---
function Section({ id, title, badge, open, onToggle, children }: {
  id: string; title: string; badge?: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode
}) {
  return (
    <section className={SECTION_CLS}>
      <div className={HEADER_CLS} onClick={() => onToggle(id)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent tracking-widest">{title}</span>
          {badge && <span className="text-[10px] text-text-dim">{badge}</span>}
        </div>
        <span className="text-text-dim text-xs">{open ? '▼' : '▶'}</span>
      </div>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  )
}

// --- Field components (horizontal: label — input) ---
const FIELD_CLS = 'flex items-center gap-3'
const FIELD_LABEL_CLS = 'text-[11px] text-text-secondary font-medium shrink-0 w-24 text-center'

function TextField({ label, value, onChange, rows, readOnly, placeholder }: {
  label: string; value: string; onChange?: (v: string) => void; rows?: number; readOnly?: boolean; placeholder?: string
}) {
  const isTA = rows && rows > 1
  return (
    <div className={`${FIELD_CLS} ${isTA ? 'items-start' : ''}`}>
      <label className={`${FIELD_LABEL_CLS} ${isTA ? 'pt-2' : ''}`}>{label}</label>
      <div className="flex-1">
        {isTA ? (
          <textarea value={value ?? ''} onChange={e => onChange?.(e.target.value)} rows={rows}
            readOnly={readOnly} placeholder={placeholder}
            className={`${INPUT_CLS} resize-y ${readOnly ? 'text-text-dim cursor-default' : ''}`} />
        ) : (
          <input value={value ?? ''} onChange={e => onChange?.(e.target.value)} type="text"
            readOnly={readOnly} placeholder={placeholder}
            className={`${INPUT_CLS} ${readOnly ? 'text-text-dim cursor-default' : ''}`} />
        )}
      </div>
    </div>
  )
}

function FieldWithDuration({ label, value, onChange, duration, rows }: {
  label: string; value: string; onChange: (v: string) => void; duration?: number; rows?: number
}) {
  const isTA = rows && rows > 1
  return (
    <div className={`${FIELD_CLS} ${isTA ? 'items-start' : ''}`}>
      <label className={`${FIELD_LABEL_CLS} ${isTA ? 'pt-2' : ''}`}>
        {label}
        {duration != null && <span className={`block ${BADGE_CLS} mt-1 text-center`}>{duration}s</span>}
      </label>
      <div className="flex-1">
        {(rows && rows > 1) ? (
          <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={rows} className={`${INPUT_CLS} resize-y`} />
        ) : (
          <input value={value ?? ''} onChange={e => onChange(e.target.value)} className={INPUT_CLS} />
        )}
      </div>
    </div>
  )
}

// --- Main Editor ---
export function EpisodeEditor({ episode, onChange }: { episode: EpisodeData; onChange: (ep: EpisodeData) => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ host: true })
  const [openBooks, setOpenBooks] = useState<Record<number, boolean>>({ 0: true })

  const toggle = useCallback((id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const toggleBook = useCallback((idx: number) => {
    setOpenBooks(prev => ({ ...prev, [idx]: !prev[idx] }))
  }, [])

  // Update helpers
  const setHost = (field: string, value: string) => {
    onChange({ ...episode, host: { ...episode.host, [field]: value } })
  }
  const setNarrator = (field: string, value: string) => {
    onChange({ ...episode, narrator: { ...episode.narrator, [field]: value } })
  }
  const setBook = (idx: number, field: string, value: string) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], [field]: value }
    onChange({ ...episode, books })
  }
  const setBookStats = (idx: number, field: string, value: string) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], stats: { ...books[idx].stats, [field]: value } }
    onChange({ ...episode, books })
  }
  const addBook = () => {
    const blank: BookEntry = {
      title: '', creator: '', thumbnail_url: '', summary: '', summaryDuration: 0,
      context: '', contextDuration: 0, oneLiner: '', stats: {}, titleDuration: 0,
    }
    onChange({ ...episode, books: [...episode.books, blank] })
    setOpenBooks(prev => ({ ...prev, [episode.books.length]: true }))
  }
  const removeBook = (idx: number) => {
    if (!confirm(`"${episode.books[idx].title || `#${idx + 1}`}" 삭제?`)) return
    onChange({ ...episode, books: episode.books.filter((_, i) => i !== idx) })
  }
  const moveBook = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= episode.books.length) return
    const books = [...episode.books]
    ;[books[idx], books[target]] = [books[target], books[idx]]
    onChange({ ...episode, books })
  }

  // Shorts helpers
  const shorts = episode.shorts
  const setShorts = (s: ShortsConfig) => onChange({ ...episode, shorts: s })
  const setSegment = (idx: number, field: string, value: string) => {
    if (!shorts) return
    const segs = [...shorts.segments]
    segs[idx] = { ...segs[idx], [field]: value }
    setShorts({ ...shorts, segments: segs })
  }
  const addSegment = () => {
    if (!shorts) {
      setShorts({ segments: [{ id: 'new', role: 'narrator', text: '', visual: 'hook' }] })
      return
    }
    setShorts({ ...shorts, segments: [...shorts.segments, { id: `seg-${shorts.segments.length}`, role: 'narrator', text: '', visual: 'hook' }] })
  }
  const removeSegment = (idx: number) => {
    if (!shorts) return
    setShorts({ ...shorts, segments: shorts.segments.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-3">
      {/* HOST */}
      <Section id="host" title="HOST" badge={episode.host.nickname} open={!!openSections.host} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="닉네임" value={episode.host.nickname} onChange={v => setHost('nickname', v)} />
          <TextField label="닉네임 (EN)" value={episode.host.nickname_en} onChange={v => setHost('nickname_en', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="직함" value={episode.host.title} onChange={v => setHost('title', v)} />
          <div>
            <label className={LABEL_CLS}>말투 (speech_tone)</label>
            <select value={episode.host.speech_tone} onChange={e => setHost('speech_tone', e.target.value)}
              className={INPUT_CLS}>
              {['bold', 'calm', 'warm', 'composed', 'firm', 'measured', 'eloquent', 'direct', 'reflective', 'authoritative'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <TextField label="소개 (bio)" value={episode.host.bio} onChange={v => setHost('bio', v)} rows={2} />
        <FieldWithDuration label="대표 명언" value={episode.host.featuredQuote ?? ''} onChange={v => setHost('featuredQuote', v)}
          duration={episode.host.featuredQuoteDuration} rows={2} />
        <FieldWithDuration label="감상철학" value={episode.host.philosophy ?? ''} onChange={v => setHost('philosophy', v)}
          duration={episode.host.voiceDuration} rows={4} />
        <TextField label="아바타 URL" value={episode.host.avatar_url} readOnly />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="ElevenLabs Voice ID" value={episode.host.elevenlabsVoiceId ?? ''} onChange={v => setHost('elevenlabsVoiceId', v)} />
          <TextField label="Gemini Voice" value={episode.host.geminiVoice ?? ''} onChange={v => setHost('geminiVoice', v)} />
        </div>
      </Section>

      {/* NARRATOR */}
      <Section id="narrator" title="NARRATOR" open={!!openSections.narrator} onToggle={toggle}>
        <FieldWithDuration label="서비스 인사" value={episode.narrator.serviceGreeting ?? ''} onChange={v => setNarrator('serviceGreeting', v)}
          duration={episode.narrator.serviceGreetingDuration} rows={2} />
        <FieldWithDuration label="서비스 소개" value={episode.narrator.serviceIntro ?? ''} onChange={v => setNarrator('serviceIntro', v)}
          duration={episode.narrator.serviceIntroDuration} rows={2} />
        <FieldWithDuration label="인물 소개" value={episode.narrator.celebIntro ?? ''} onChange={v => setNarrator('celebIntro', v)}
          duration={episode.narrator.celebIntroDuration} rows={3} />
        <FieldWithDuration label="브릿지" value={episode.narrator.bridge} onChange={v => setNarrator('bridge', v)}
          duration={episode.narrator.bridgeDuration} />
        <FieldWithDuration label="아웃트로" value={episode.narrator.outro} onChange={v => setNarrator('outro', v)}
          duration={episode.narrator.outroDuration} rows={3} />
        {episode.narrator.returnIntro != null && (
          <FieldWithDuration label="복귀 인사 (continuation)" value={episode.narrator.returnIntro ?? ''} onChange={v => setNarrator('returnIntro', v)}
            duration={episode.narrator.returnIntroDuration} rows={2} />
        )}
        {episode.narrator.prevRecap != null && (
          <FieldWithDuration label="이전 파트 요약 (continuation)" value={episode.narrator.prevRecap ?? ''} onChange={v => setNarrator('prevRecap', v)}
            duration={episode.narrator.prevRecapDuration} rows={2} />
        )}
        <div className="flex gap-3 flex-wrap">
          {episode.narrator.labelSummaryDuration != null && <span className={BADGE_CLS}>요약 라벨: {episode.narrator.labelSummaryDuration}s</span>}
          {episode.narrator.labelContextDuration != null && <span className={BADGE_CLS}>맥락 라벨: {episode.narrator.labelContextDuration}s</span>}
          {episode.narrator.interludeDuration != null && <span className={BADGE_CLS}>중간안내: {episode.narrator.interludeDuration}s</span>}
        </div>
      </Section>

      {/* BOOKS */}
      <Section id="books" title="BOOKS" badge={`${episode.books.length}권`} open={!!openSections.books} onToggle={toggle}>
        <button onClick={addBook} className={BTN_ADD}>+ 책 추가</button>
        <div className="space-y-2">
          {episode.books.map((book, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              {/* Book header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-card cursor-pointer hover:bg-bg-hover transition-colors"
                onClick={() => toggleBook(idx)}>
                <span className="text-text-dim text-xs">{openBooks[idx] ? '▼' : '▶'}</span>
                <span className="text-xs font-mono text-text-dim w-5">#{idx + 1}</span>
                <span className="text-sm font-semibold flex-1 truncate">{book.title || '(제목 없음)'}</span>
                <span className="text-xs text-text-secondary truncate max-w-32">{book.creator}</span>
                <button onClick={e => { e.stopPropagation(); moveBook(idx, -1) }}
                  className="text-text-dim hover:text-text-primary text-xs px-1" title="위로">▲</button>
                <button onClick={e => { e.stopPropagation(); moveBook(idx, 1) }}
                  className="text-text-dim hover:text-text-primary text-xs px-1" title="아래로">▼</button>
                <button onClick={e => { e.stopPropagation(); removeBook(idx) }}
                  className={BTN_DANGER}>삭제</button>
              </div>
              {/* Book body */}
              {openBooks[idx] && (
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldWithDuration label="제목" value={book.title} onChange={v => setBook(idx, 'title', v)} duration={book.titleDuration} />
                    <TextField label="저자" value={book.creator} onChange={v => setBook(idx, 'creator', v)} />
                  </div>
                  <TextField label="썸네일 URL" value={book.thumbnail_url} onChange={v => setBook(idx, 'thumbnail_url', v)} />
                  <FieldWithDuration label="요약" value={book.summary} onChange={v => setBook(idx, 'summary', v)}
                    duration={book.summaryDuration} rows={4} />
                  <FieldWithDuration label="맥락" value={book.context} onChange={v => setBook(idx, 'context', v)}
                    duration={book.contextDuration} rows={3} />
                  <div className="grid grid-cols-2 gap-3">
                    <FieldWithDuration label="직접 인용" value={book.directQuote ?? ''} onChange={v => setBook(idx, 'directQuote', v)}
                      duration={book.quoteDuration} />
                    <TextField label="인용 출처" value={book.directQuoteSource ?? ''} onChange={v => setBook(idx, 'directQuoteSource', v)} />
                  </div>
                  <FieldWithDuration label="후속 맥락" value={book.contextAfter ?? ''} onChange={v => setBook(idx, 'contextAfter', v)}
                    duration={book.contextAfterDuration} rows={2} />
                  <TextField label="한줄 요약" value={book.oneLiner} onChange={v => setBook(idx, 'oneLiner', v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="출판년도" value={book.stats.publishYear ?? ''} onChange={v => setBookStats(idx, 'publishYear', v)} />
                    <TextField label="출처 URL" value={book.source ?? ''} onChange={v => setBook(idx, 'source', v)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* SHORTS */}
      <Section id="shorts" title="SHORTS" badge={shorts ? `${shorts.segments.length}개` : '없음'} open={!!openSections.shorts} onToggle={toggle}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={addSegment} className={BTN_ADD}>+ 세그먼트 추가</button>
          {shorts && (
            <div className="flex items-center gap-1">
              <label className={`${LABEL_CLS} mb-0`}>featuredBookIndex</label>
              <input type="number" min={0} value={shorts.featuredBookIndex ?? 0}
                onChange={e => setShorts({ ...shorts, featuredBookIndex: parseInt(e.target.value) || 0 })}
                className="w-16 bg-bg-main border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent" />
            </div>
          )}
        </div>
        {shorts?.segments.map((seg, idx) => (
          <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-dim w-5">#{idx + 1}</span>
              <input value={seg.id} onChange={e => setSegment(idx, 'id', e.target.value)}
                className="bg-bg-main border border-border rounded px-2 py-1 text-xs w-28 focus:outline-none focus:border-accent"
                placeholder="id" />
              <select value={seg.role} onChange={e => setSegment(idx, 'role', e.target.value)}
                className="bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent">
                <option value="narrator">narrator</option>
                <option value="celeb">celeb</option>
              </select>
              <select value={seg.visual} onChange={e => setSegment(idx, 'visual', e.target.value)}
                className="bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent">
                <option value="hook">hook</option>
                <option value="intro">intro</option>
                <option value="book">book</option>
                <option value="cta">cta</option>
              </select>
              {seg.duration != null && <span className={BADGE_CLS}>{seg.duration}s</span>}
              <div className="flex-1" />
              <button onClick={() => removeSegment(idx)} className={BTN_DANGER}>삭제</button>
            </div>
            <textarea value={seg.text} onChange={e => setSegment(idx, 'text', e.target.value)}
              rows={2} className={`${INPUT_CLS} resize-y`} placeholder="텍스트" />
          </div>
        ))}
        {!shorts && <div className="text-xs text-text-dim">쇼츠 설정 없음 — 추가하려면 세그먼트 추가 클릭</div>}
      </Section>
    </div>
  )
}
