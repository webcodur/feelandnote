'use client'

import { useState, useCallback } from 'react'
import type { FactionScript } from '@/lib/faction-types'
import { Copy } from '@feelandnote/shared/bo/icons'

// 통합 명칭(앞부분\n뒷부분)을 "앞부분 — 뒷부분" 한 줄로 합친다(설명 없으면 앞부분만)
function flatName(v?: string): string {
  const lines = (v ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  if (!lines.length) return ''
  return lines.length > 1 ? `${lines[0]} — ${lines.slice(1).join(' ')}` : lines[0]
}

// 비활성화 세력 제외하고 세력 명칭만 전체 직렬화
function scriptToGroupNames(script: FactionScript): string {
  const names: string[] = []
  let n = 0
  ;(script.groups ?? []).forEach(group => {
    if (group.disabled) return
    n += 1
    names.push(`[${n}] ${flatName(group.name)}`)
  })
  return names.join('\n')
}

// 복사 성공 시 1.5초 피드백
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

export function FactionNameCopyButton({ script }: { script: FactionScript }) {
  const { copied, run } = useCopyToClipboard()

  const copy = useCallback(() => {
    run(scriptToGroupNames(script))
  }, [script, run])

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
      title="활성 세력의 명칭만 모아서 텍스트로 복사"
    >
      <Copy size={15} /> {copied ? '복사됨' : '세력명칭 복사'}
    </button>
  )
}
