'use client'

import { useState, useCallback } from 'react'

/**
 * 쇼츠 내용 복사
 *
 * 출력 구성: 훅 → 인트로 → [대사 OR 해설] N개
 *  - 훅:   id === 'hook'   또는 visual === 'hook'
 *  - 인트로: id === 'intro' 또는 visual === 'intro' 이면서 hook 다음
 *  - 그 외 본문 구간:
 *      role === 'celeb'    → [대사]
 *      role === 'narrator' → [해설]
 */
export function ShortsCopyButton({ segments, shortsName }: { segments: any[]; shortsName?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    type Kind = '훅' | '인트로' | '대사' | '해설' | null
    const classify = (s: any): Kind => {
      if (s?.id === 'hook' || s?.visual === 'hook') return '훅'
      if (s?.id === 'intro' || s?.visual === 'intro') return '인트로'
      if (s?.role === 'celeb') return '대사'
      if (s?.role === 'narrator') return '해설'
      return null
    }

    const items = segments
      .map(s => ({ kind: classify(s), seg: s }))
      .filter((x): x is { kind: Exclude<Kind, null>; seg: any } => x.kind !== null)

    const structure = items.map(x => x.kind).join(' → ')
    const titleLine = shortsName ? `[쇼츠] ${shortsName}\n` : ''
    const header = `${titleLine}[구조] ${structure}`

    const body = items
      .filter(({ seg }) => typeof seg.text === 'string' && seg.text.trim().length > 0)
      .map(({ kind, seg }) => `# ${kind} (${seg.id})\n${seg.text}`)
      .join('\n\n')

    navigator.clipboard.writeText(`${header}\n\n${body}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [segments, shortsName])

  return (
    <button
      onClick={copy}
      className="px-2.5 py-1 text-[11px] text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors"
    >
      {copied ? '복사됨' : '내용 복사'}
    </button>
  )
}
