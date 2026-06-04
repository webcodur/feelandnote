'use client'

import { useState, useCallback } from 'react'

/**
 * 쇼츠 내용 복사
 *
 * 각 구간 라벨 = 위치 + 발화 유형. 둘 다 있으면 「위치 · 발화유형」, 하나만 있으면 그것만.
 *  - 위치:    id/visual === 'hook' → 훅, id/visual === 'intro' → 인트로
 *  - 발화유형: role === 'celeb' → 대사, role === 'narrator' → 해설
 *  예) 훅이면서 셀럽 대사 → "훅 · 대사", 본문 해설 → "해설"
 */
export function ShortsCopyButton({ segments, shortsName }: { segments: any[]; shortsName?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    const speech = (s: any): '대사' | '해설' | null =>
      s?.role === 'celeb' ? '대사' : s?.role === 'narrator' ? '해설' : null
    const slot = (s: any): '훅' | '인트로' | null =>
      (s?.id === 'hook' || s?.visual === 'hook') ? '훅'
      : (s?.id === 'intro' || s?.visual === 'intro') ? '인트로' : null
    const labelOf = (s: any): string | null => {
      const sp = speech(s)
      const sl = slot(s)
      if (sl && sp) return `${sl} · ${sp}`
      return sl ?? sp
    }

    const items = segments
      .filter(s => !s?.disabled)  // 영상 제외 구간은 복사에서도 뺀다.
      .map(s => ({ label: labelOf(s), seg: s }))
      .filter((x): x is { label: string; seg: any } => x.label !== null)

    const titleLine = shortsName ? `[쇼츠] ${shortsName}` : ''

    const body = items
      .filter(({ seg }) => typeof seg.text === 'string' && seg.text.trim().length > 0)
      .map(({ label, seg }) => {
        const src = typeof seg.quoteSource === 'string' && seg.quoteSource.trim().length > 0
          ? `\n출처: ${seg.quoteSource.trim()}`
          : ''
        return `# ${label} (${seg.id})\n${seg.text}${src}`
      })
      .join('\n\n')

    navigator.clipboard.writeText(titleLine ? `${titleLine}\n\n${body}` : body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [segments, shortsName])

  return (
    <button
      onClick={copy}
      className="px-2.5 py-1 text-sm font-bold text-text-secondary hover:text-accent border border-border/40 rounded hover:border-accent/40 transition-colors"
    >
      {copied ? '복사됨' : '내용 복사'}
    </button>
  )
}
