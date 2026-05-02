'use client'

import { useState, useCallback } from 'react'

type Narrator = {
  serviceGreeting?: string
  serviceIntro?: string
  celebIntro?: string
  bridge?: string
  outro?: string
}

type Host = {
  featuredQuote?: string
  philosophy?: string
}

type QuotePair = {
  quote?: string
  quoteSource?: string
  after?: string
}

type Book = {
  title?: string
  creator?: string
  summary?: string
  contextMain?: string
  quotePairs?: QuotePair[]
}

const bookToLines = (book: Book, indexLabel?: string): string[] => {
  const lines: string[] = []
  const header = `${indexLabel ? `${indexLabel} ` : ''}${book.title ?? ''}${book.creator ? ` — ${book.creator}` : ''}`.trim()
  if (header) lines.push(header)
  if (book.summary) lines.push(`핵심 요약: ${book.summary}`)
  if (book.contextMain) lines.push(`감상 배경: ${book.contextMain}`)
  ;(book.quotePairs ?? []).forEach((pair, pi) => {
    const suffix = pi > 0 ? ` ${pi + 1}` : ''
    if (pair.quote) lines.push(`직접 인용${suffix}: ${pair.quote}`)
    if (pair.quoteSource) lines.push(`  출처: ${pair.quoteSource}`)
    if (pair.after) lines.push(`후속 맥락${suffix}: ${pair.after}`)
  })
  return lines
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const run = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [])
  return { copied, run }
}

export function LongformCopyAllButton({ narrator, host, books }: { narrator: Narrator; host: Host; books: Book[] }) {
  const { copied, run } = useCopyToClipboard()

  const copy = useCallback(() => {
    const intro: string[] = []
    if (narrator.serviceGreeting) intro.push(`서비스 인사: ${narrator.serviceGreeting}`)
    if (narrator.serviceIntro) intro.push(`오늘의 인물: ${narrator.serviceIntro}`)
    if (host.featuredQuote) intro.push(`대표 명언: ${host.featuredQuote}`)
    if (narrator.celebIntro) intro.push(`인물 소개: ${narrator.celebIntro}`)
    if (host.philosophy) intro.push(`감상철학: ${host.philosophy}`)
    if (narrator.bridge) intro.push(`브릿지: ${narrator.bridge}`)

    const bookBlocks = books.map((book, i) => bookToLines(book, `[책 ${i + 1}/${books.length}]`).join('\n'))

    const outro: string[] = []
    if (narrator.outro) outro.push(`아웃트로: ${narrator.outro}`)

    const sections = [
      intro.join('\n'),
      bookBlocks.join('\n\n'),
      outro.join('\n'),
    ].filter(Boolean)

    run(sections.join('\n\n---\n\n'))
  }, [narrator, host, books, run])

  return (
    <button
      onClick={copy}
      className="px-2.5 py-1 text-[11px] text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors"
    >
      {copied ? '복사됨' : '전체 내용 복사'}
    </button>
  )
}

export function BookCopyButton({ book, index, total }: { book: Book; index: number; total: number }) {
  const { copied, run } = useCopyToClipboard()

  const copy = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = bookToLines(book, `[책 ${index + 1}/${total}]`).join('\n')
    run(text)
  }, [book, index, total, run])

  return (
    <button
      onClick={copy}
      className="px-2 py-0.5 text-[10px] text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors"
      title="이 책의 내용만 복사"
    >
      {copied ? '복사됨' : '내용 복사'}
    </button>
  )
}
