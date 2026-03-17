'use client'

import { useState, useEffect, use } from 'react'

type BookEntry = {
  title: string; creator: string; summary: string; context: string
  directQuote?: string; directQuoteSource?: string
  contextAfter?: string; oneLiner?: string
  stats?: { celebCount?: number; publishYear?: string }
}

type ShortSegment = { id: string; role: string; text: string; visual: string; duration?: number }

type Episode = {
  narrator: {
    serviceGreeting?: string; serviceIntro?: string; celebIntro: string
    bridge?: string; outro: string
  }
  host: {
    nickname: string; philosophy: string; featuredQuote?: string
    bio?: string; title?: string
  }
  books: BookEntry[]
  shorts?: { segments: ShortSegment[] }
}

const ROLE_COLORS: Record<string, string> = {
  narrator: 'text-[#888]',
  summary: 'text-[#8bb8a8]',
  celeb: 'text-[#c8a46e]',
}
const ROLE_LABELS: Record<string, string> = {
  narrator: '나레이터',
  summary: '요약맨',
  celeb: '셀럽',
}

export default function ScenarioPage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = use(params)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [view, setView] = useState<'longform' | 'shorts'>('longform')

  useEffect(() => {
    fetch(`/api/${series}/episodes/${name}`).then(r => r.json()).then(setEpisode).catch(() => {})
  }, [series, name])

  if (!episode) return <div className="text-text-dim p-8">로딩...</div>

  const { narrator, host, books } = episode

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{host.nickname}</h1>
        <p className="text-sm text-text-secondary">{name} · {books.length}권 · 시나리오</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setView('longform')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            view === 'longform' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >롱폼</button>
        <button
          onClick={() => setView('shorts')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            view === 'shorts' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
          disabled={!episode.shorts}
        >쇼츠{!episode.shorts && ' (없음)'}</button>
      </div>

      {view === 'longform' ? (
        <LongformView narrator={narrator} host={host} books={books} />
      ) : (
        episode.shorts && <ShortsView segments={episode.shorts.segments} host={host} />
      )}
    </div>
  )
}

function LongformView({ narrator, host, books }: { narrator: Episode['narrator']; host: Episode['host']; books: BookEntry[] }) {
  return (
    <div className="space-y-6">
      <Section label="서비스 인사" role="narrator">{narrator.serviceGreeting}</Section>
      {narrator.serviceIntro && <Section label="오늘의 인물" role="narrator">{narrator.serviceIntro}</Section>}
      {host.featuredQuote && <Section label="대표 명언" role="celeb">"{host.featuredQuote}"</Section>}
      <Section label="인물 소개" role="narrator">{narrator.celebIntro}</Section>
      <Section label="감상철학" role="celeb">{host.philosophy}</Section>
      {narrator.bridge && <Section label="브릿지" role="narrator">{narrator.bridge}</Section>}

      {books.map((book, i) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-bg-card px-4 py-3 border-b border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-accent font-mono text-xs">{i + 1}/{books.length}</span>
              <span className="font-semibold">{book.title}</span>
              <span className="text-text-secondary text-sm">— {book.creator}</span>
              {book.stats?.publishYear && <span className="text-text-dim text-xs">{book.stats.publishYear}</span>}
            </div>
            {book.oneLiner && <p className="text-xs text-text-dim mt-1">{book.oneLiner}</p>}
          </div>
          <div className="p-4 space-y-3">
            <Line role="narrator" label="제목">{book.title}, {book.creator}</Line>
            <Line role="summary" label="핵심 요약">{book.summary}</Line>
            <Line role="narrator" label="추천 경위">{book.context}</Line>
            {book.directQuote && (
              <Line role="celeb" label="직접 인용">
                "{book.directQuote}"
                {book.directQuoteSource && <span className="text-text-dim text-xs ml-2">— {book.directQuoteSource}</span>}
              </Line>
            )}
            {book.contextAfter && <Line role="narrator" label="후속 맥락">{book.contextAfter}</Line>}
          </div>
        </div>
      ))}

      <Section label="아웃트로" role="narrator">{narrator.outro}</Section>
    </div>
  )
}

function ShortsView({ segments, host }: { segments: ShortSegment[]; host: Episode['host'] }) {
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => (
        <div key={seg.id} className="flex gap-3">
          <div className="w-16 shrink-0 text-right">
            <span className="text-[10px] font-mono text-text-dim">{seg.visual}</span>
            {seg.duration && <div className="text-[10px] text-text-dim">{seg.duration}s</div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${ROLE_COLORS[seg.role] ?? 'text-text-secondary'}`}>
                {seg.role === 'celeb' ? host.nickname : ROLE_LABELS[seg.role] ?? seg.role}
              </span>
              <span className="text-[10px] text-text-dim font-mono">#{i + 1} {seg.id}</span>
            </div>
            <p className="text-sm leading-relaxed">{seg.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Section({ label, role, children }: { label: string; role: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-text-dim">{label}</span>
        <span className={`text-[10px] ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
      </div>
      <p className="text-sm leading-relaxed pl-1">{children}</p>
    </div>
  )
}

function Line({ role, label, children }: { role: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={`text-[10px] font-semibold ${ROLE_COLORS[role]}`}>{label}</span>
      <p className="text-sm leading-relaxed mt-0.5">{children}</p>
    </div>
  )
}
