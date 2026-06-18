'use client'

import { useState, useCallback } from 'react'
import type { FactionScript, FactionGroup, FactionPerson } from '@/lib/faction-types'
import { Copy } from './icons'

// region 텍스트 직렬화
// 인물 한 줄: "  인물명 · (lines를 ' / '로 연결)"
function personLine(person: FactionPerson): string {
  const desc = (person.lines ?? []).filter(Boolean).join(' / ')
  const name = person.name.trim()
  return desc ? `  ${name} · ${desc}` : `  ${name}`
}

// 세력 한 블록: 헤더 + (묶음 라벨 + 인물들)
function groupBlock(group: FactionGroup, index: number): string {
  const lines: string[] = []
  const header = group.tagline
    ? `[${index}] ${group.name} — ${group.tagline}`
    : `[${index}] ${group.name}`
  lines.push(header)

  if (group.clusters?.length) {
    group.clusters.forEach(cluster => {
      if (cluster.label) lines.push(`(${cluster.label})`)
      ;(cluster.people ?? []).forEach(p => lines.push(personLine(p)))
    })
  } else {
    ;(group.people ?? []).forEach(p => lines.push(personLine(p)))
  }
  return lines.join('\n')
}

// 비활성화 세력 제외하고 전체 직렬화. 세력 사이는 빈 줄.
function scriptToText(script: FactionScript): string {
  const blocks: string[] = []
  let n = 0
  ;(script.groups ?? []).forEach(group => {
    if (group.disabled) return
    n += 1
    blocks.push(groupBlock(group, n))
  })
  return blocks.join('\n\n')
}
// endregion

// 복사 성공 시 1.5초 피드백 (북리커맨드 useCopyToClipboard 패턴)
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

export function FactionCopyButton({ script }: { script: FactionScript }) {
  const { copied, run } = useCopyToClipboard()

  const copy = useCallback(() => {
    run(scriptToText(script))
  }, [script, run])

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
      title="활성 세력·인물의 이름과 설명을 텍스트로 복사"
    >
      <Copy size={15} /> {copied ? '복사됨' : '세력도 복사'}
    </button>
  )
}
