'use client'

import { useState, useCallback } from 'react'

// --- Types mirroring remotion BookRecommendScript ---
type BookStats = {
  publisher?: string
  originalTitle?: string
  publishYear?: string
  celebCount?: number
}

type CinematicImage = {
  file: string
  text?: string
  field?: 'summary' | 'context'
  keyword?: string
  prompt?: string
  ko?: string
}

type QuotePair = {
  quote: string
  quoteSource?: string
  quoteDuration?: number
  after?: string
  afterDuration?: number
}

/** 한 구간에 얹는 효과음 한 개. 텍스트 앵커 기준 ± offset(초) 으로 발화 시점을 잡는다. */
export type SfxItem = {
  file: string
  text?: string
  offset?: number
  volume?: number
  duration?: number
  fadeIn?: number
  fadeOut?: number
}

export type BgmTrack = {
  file: string
  volume?: number
  from?: number
  to?: number
  fadeIn?: number
  fadeOut?: number
  startFrom?: number
  loop?: boolean
  trackDuration?: number
}

export type BookEntry = {
  title: string
  creator: string
  thumbnail_url: string
  summary: string
  summaryDuration: number
  contextMain: string
  contextDuration: number
  quotePairs?: QuotePair[]
  source?: string
  stats: BookStats
  titleDuration: number
  images?: CinematicImage[]
  imagePrompts?: Record<string, unknown>
  bgm?: {
    summary?: BgmTrack
    context?: BgmTrack
  }
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

type ImageChange = {
  t: number
  image: string
  text?: string
}

const toImageChanges = (v: unknown): ImageChange[] =>
  Array.isArray(v) ? v : v ? [v as ImageChange] : []

type ShortSegment = {
  id: string
  role: 'narrator' | 'celeb' | 'summary'
  text: string
  visual: 'hook' | 'intro' | 'book'
  duration?: number
  image?: string
  imageChangeAt?: ImageChange[]
  sfx?: { file: string; text?: string; offset?: number; volume?: number; duration?: number; fadeIn?: number; fadeOut?: number }[]
  gapAfter?: number
}

type ShortsConfig = {
  featuredBookIndex?: number
  revealBg?: string
  segments: ShortSegment[]
}

type CelebHost = {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  title: string
  featuredQuote?: string
  featuredQuoteDuration?: number
  philosophy?: string
  voiceDuration?: number
  elevenlabsVoiceId?: string
  geminiVoice?: string
}

export type EpisodeData = {
  host?: CelebHost
  narrator?: NarratorLines
  books?: BookEntry[]
  /** 옵션 2: shorts는 항상 배열. 외부 파일 shorts/{locale}-{N}.json에서 로드된다.
   *  1권 모드(SOLO)는 별도 데이터 없이 book 본문에서 자동 변환되므로 EpisodeData에 필드 없음. */
  shorts?: ShortsConfig[]
  /** 롱폼 구간별 Gemini 발화 스타일 prefix. 키는 구간 식별자(예: "B2-philosophy"). 쇼츠는 segment.style 사용. */
  voiceStyles?: Record<string, string>
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
const EMPTY_HOST: CelebHost = { nickname: '', nickname_en: '', speech_tone: 'calm', avatar_url: '', title: '' }
const EMPTY_NARRATOR: NarratorLines = { bridge: '', bridgeDuration: 0, outro: '', outroDuration: 0 }

export function EpisodeEditor({ episode: rawEpisode, onChange }: { episode: EpisodeData; onChange: (ep: EpisodeData) => void }) {
  const episode = { ...rawEpisode, host: rawEpisode.host ?? EMPTY_HOST, narrator: rawEpisode.narrator ?? EMPTY_NARRATOR, books: rawEpisode.books ?? [] }
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
      contextMain: '', contextDuration: 0, stats: {}, titleDuration: 0,
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

  // Book images helpers
  const setBookImages = (idx: number, images: CinematicImage[] | undefined) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], images }
    onChange({ ...episode, books })
  }
  const addBookImage = (bookIdx: number) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    const n = bookIdx + 1
    const slot = images.length + 1
    images.push({ file: `${n}-${slot}.jpg` })
    setBookImages(bookIdx, images)
  }
  const updateBookImage = (bookIdx: number, imgIdx: number, field: keyof CinematicImage, value: string) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    images[imgIdx] = { ...images[imgIdx], [field]: value }
    if (!value && field !== 'file') delete (images[imgIdx] as Record<string, unknown>)[field]
    setBookImages(bookIdx, images)
  }
  const removeBookImage = (bookIdx: number, imgIdx: number) => {
    const book = episode.books[bookIdx]
    const images = (book.images ?? []).filter((_, i) => i !== imgIdx)
    setBookImages(bookIdx, images.length ? images : undefined)
  }
  const moveBookImage = (bookIdx: number, imgIdx: number, dir: -1 | 1) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    const target = imgIdx + dir
    if (target < 0 || target >= images.length) return
    ;[images[imgIdx], images[target]] = [images[target], images[imgIdx]]
    setBookImages(bookIdx, images)
  }

  // Shorts helpers — 옵션 2: 첫 번째 쇼츠(1번)만 편집한다.
  // 복수 쇼츠 편집은 ScenarioView의 탭에서 처리한다.
  const shortsArr: ShortsConfig[] = Array.isArray(episode.shorts) ? episode.shorts : []
  const shorts: ShortsConfig | undefined = shortsArr[0]
  const setShorts = (s: ShortsConfig) => {
    const next = [...shortsArr]
    next[0] = s
    onChange({ ...episode, shorts: next })
  }
  const setSegment = (idx: number, field: string, value: unknown) => {
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
  const setSegImage = (idx: number, value: string) => {
    setSegment(idx, 'image', value || undefined)
  }
  const addImageChange = (segIdx: number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes: ImageChange[] = [...toImageChanges(seg.imageChangeAt)]
    changes.push({ t: 0, image: '', text: '' })
    setSegment(segIdx, 'imageChangeAt', changes)
  }
  const updateImageChange = (segIdx: number, changeIdx: number, field: keyof ImageChange, value: string | number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes = [...toImageChanges(seg.imageChangeAt)]
    changes[changeIdx] = { ...changes[changeIdx], [field]: value }
    if (field === 'text' && !value) delete (changes[changeIdx] as Record<string, unknown>).text
    setSegment(segIdx, 'imageChangeAt', changes)
  }
  const removeImageChange = (segIdx: number, changeIdx: number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes = toImageChanges(seg.imageChangeAt).filter((_, i) => i !== changeIdx)
    setSegment(segIdx, 'imageChangeAt', changes.length ? changes : undefined)
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
                  <FieldWithDuration label="맥락" value={book.contextMain} onChange={v => setBook(idx, 'contextMain', v)}
                    duration={book.contextDuration} rows={3} />
                  {(book.quotePairs ?? []).map((pair, pi) => (
                    <div key={pi} className="space-y-2 pl-3 border-l-2 border-accent/20">
                      <div className="grid grid-cols-2 gap-3">
                        <FieldWithDuration label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} value={pair.quote} onChange={v => {
                          const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], quote: v }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                        }} duration={pair.quoteDuration} />
                        <TextField label="인용 출처" value={pair.quoteSource ?? ''} onChange={v => {
                          const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], quoteSource: v || undefined }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                        }} />
                      </div>
                      <FieldWithDuration label={`후속 맥락${pi > 0 ? ` ${pi + 1}` : ''}`} value={pair.after ?? ''} onChange={v => {
                        const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], after: v || undefined }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                      }} duration={pair.afterDuration} rows={2} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="출판년도" value={book.stats.publishYear ?? ''} onChange={v => setBookStats(idx, 'publishYear', v)} />
                    <TextField label="출처 URL" value={book.source ?? ''} onChange={v => setBook(idx, 'source', v)} />
                  </div>

                  {/* 시네마틱 이미지 */}
                  <div className="border-t border-border pt-3 mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-secondary font-medium">IMAGES</span>
                      <span className="text-[10px] text-text-dim">{book.images?.length ?? 0}장</span>
                      <div className="flex-1" />
                      <button onClick={() => addBookImage(idx)} className={BTN_ADD}>+ 이미지</button>
                    </div>
                    {(book.images ?? []).map((img, iIdx) => (
                      <div key={iIdx} className="border border-border rounded p-2 space-y-1.5 bg-bg-card">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-text-dim w-5">#{iIdx + 1}</span>
                          <label className="text-[10px] text-text-secondary shrink-0">file</label>
                          <input value={img.file} onChange={e => updateBookImage(idx, iIdx, 'file', e.target.value)}
                            className="w-28 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                            placeholder="1-1.jpg" />
                          <label className="text-[10px] text-text-secondary shrink-0">keyword</label>
                          <input value={img.keyword ?? ''} onChange={e => updateBookImage(idx, iIdx, 'keyword', e.target.value)}
                            className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                            placeholder="키워드" />
                          <button onClick={() => moveBookImage(idx, iIdx, -1)}
                            className="text-text-dim hover:text-text-primary text-[10px] px-0.5" title="위로">▲</button>
                          <button onClick={() => moveBookImage(idx, iIdx, 1)}
                            className="text-text-dim hover:text-text-primary text-[10px] px-0.5" title="아래로">▼</button>
                          <button onClick={() => removeBookImage(idx, iIdx)}
                            className="text-danger text-xs hover:opacity-70" title="삭제">✕</button>
                        </div>
                        <div className="flex items-center gap-2 pl-7">
                          <label className="text-[10px] text-text-secondary shrink-0 w-8">text</label>
                          <input value={img.text ?? ''} onChange={e => updateBookImage(idx, iIdx, 'text', e.target.value)}
                            className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                            placeholder={iIdx === 0 ? '(첫 이미지 — 섹션 시작부터 표시)' : '나레이션 텍스트 앵커'} />
                        </div>
                      </div>
                    ))}
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
          <button onClick={addSegment} className={BTN_ADD}>+ 구간 추가</button>
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
                <option value="summary">summary</option>
              </select>
              <select value={seg.visual} onChange={e => setSegment(idx, 'visual', e.target.value)}
                className="bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent">
                <option value="hook">hook</option>
                <option value="intro">intro</option>
                <option value="book">book</option>
              </select>
              {seg.duration != null && <span className={BADGE_CLS}>{seg.duration}s</span>}
              <div className="flex-1" />
              <button onClick={() => removeSegment(idx)} className={BTN_DANGER}>삭제</button>
            </div>
            <textarea value={seg.text} onChange={e => setSegment(idx, 'text', e.target.value)}
              rows={2} className={`${INPUT_CLS} resize-y`} placeholder="텍스트" />

            {/* 이미지 설정 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-text-secondary shrink-0 w-14">image</label>
                <input value={seg.image ?? ''} onChange={e => setSegImage(idx, e.target.value)}
                  className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  placeholder="예: episodes/done/person/images/shorts-2.png" />
              </div>

              {/* imageChangeAt 편집 */}
              {toImageChanges(seg.imageChangeAt).map((change, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2 pl-14">
                  <span className="text-[10px] text-text-dim shrink-0">전환 {cIdx + 1}</span>
                  <input type="number" step={0.01} value={change.t}
                    onChange={e => updateImageChange(idx, cIdx, 't', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-bg-main border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-accent"
                    title="전환 시점 (초)" />
                  <span className="text-[10px] text-text-dim">초</span>
                  <input value={change.image}
                    onChange={e => updateImageChange(idx, cIdx, 'image', e.target.value)}
                    className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    placeholder="이미지 경로" />
                  <input value={change.text ?? ''}
                    onChange={e => updateImageChange(idx, cIdx, 'text', e.target.value)}
                    className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    placeholder="텍스트 앵커 (선택)" title="이 텍스트 시작 시점에 전환" />
                  <button onClick={() => removeImageChange(idx, cIdx)}
                    className="text-danger text-xs hover:opacity-70 shrink-0" title="전환점 삭제">✕</button>
                </div>
              ))}
              <button onClick={() => addImageChange(idx)}
                className="ml-14 text-[10px] text-accent hover:underline">+ 이미지 전환점 추가</button>
            </div>
          </div>
        ))}
        {!shorts && <div className="text-xs text-text-dim">쇼츠 설정 없음 — 추가하려면 구간 추가 클릭</div>}
      </Section>

    </div>
  )
}
