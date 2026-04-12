'use client'

import { useState, useCallback } from 'react'

export function ShortsCopyButton({ segments }: { segments: any[] }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    const introIds = segments.filter((s: any) => s.visual !== 'book' && s.visual !== 'cta').map((s: any) => s.id)
    const pairs = segments.filter((s: any) => s.visual === 'book' && s.role === 'celeb').length
    const header = `[구조] ${introIds.join('-')} / [인용-맥락] × ${pairs}`

    const lines = segments
      .filter((s: any) => s.text)
      .map((s: any) => `${s.id}: ${s.text}`)

    navigator.clipboard.writeText([header, '', ...lines].join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [segments])

  return (
    <button
      onClick={copy}
      className="px-2.5 py-1 text-[11px] text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors"
    >
      {copied ? '복사됨' : '내용 복사'}
    </button>
  )
}
