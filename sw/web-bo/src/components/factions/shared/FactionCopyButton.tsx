'use client'

import { useState, useCallback } from 'react'
import type { FactionScript, FactionGroup, FactionPerson } from '@/lib/faction-types'
import { Copy } from '@feelandnote/shared/bo/icons'

// region 텍스트 직렬화
// 인물 한 줄: "  인물명 · (lines를 ' / '로 연결)"
function personLine(person: FactionPerson): string {
  const desc = (person.lines ?? []).filter(Boolean).join(' / ')
  const name = person.name.trim()
  return desc ? `  ${name} · ${desc}` : `  ${name}`
}

// 통합 명칭(앞부분\n뒷부분)을 "앞부분 — 뒷부분" 한 줄로 합친다(설명 없으면 앞부분만)
function flatName(v?: string): string {
  const lines = (v ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  if (!lines.length) return ''
  return lines.length > 1 ? `${lines[0]} — ${lines.slice(1).join(' ')}` : lines[0]
}

// 세력 한 블록: 헤더 + (그룹 라벨 + 인물들)
function groupBlock(group: FactionGroup, index: number): string {
  const lines: string[] = []
  lines.push(`[${index}] ${flatName(group.name)}`)

  ;(group.clusters ?? []).forEach(cluster => {
    const label = flatName(cluster.label)
    if (label) lines.push(`(${label})`)
    ;(cluster.people ?? []).forEach(p => lines.push(personLine(p)))
  })
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
      type="button"
      onClick={copy}
      className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-bg-main px-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      title="활성 세력·인물의 이름과 설명을 텍스트로 복사"
    >
      <Copy size={15} /> <span aria-live="polite">{copied ? '복사됨' : '세력도감 복사'}</span>
    </button>
  )
}
