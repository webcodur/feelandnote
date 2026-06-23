'use client'

import type { FactionScript } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'

type Mode = 'voice' | 'text' | 'credit' | 'full' | undefined
const OPTS: { v: Mode; l: string }[] = [
  { v: undefined, l: '자동' },
  { v: 'voice', l: '음성' },
  { v: 'text', l: '대사' },
  { v: 'credit', l: '직함' },
  { v: 'full', l: '통합' },
]

/**
 * 대사 처리 단계 일괄 편집 모달.
 * 전 인물을 세력별로 나열하고 각자 음성/대사/직함/통합/자동을 한 화면에서 지정한다.
 * - 음성: 음성 재생 + 대사 + 이름 옆 파형
 * - 대사: 대사 텍스트만(무음)
 * - 직함: 직함만 보고 넘어감
 * - 통합: 직함 2·3번 줄 다 보여준 뒤 음성 + 대사로 교차
 * - 자동: 세력 수장만 음성, 나머지 대사
 */
export function FactionQuoteModeModal({ script, series, episodeName, onChange, onClose }: {
  script: FactionScript
  series: string
  episodeName: string
  onChange: (next: FactionScript) => void
  onClose: () => void
}) {
  const setMode = (gi: number, ci: number | null, pi: number, mode: Mode) => {
    const next = JSON.parse(JSON.stringify(script)) as FactionScript
    const g = next.groups[gi]
    const ppl = ci != null && g.clusters ? g.clusters[ci].people : g.people
    if (!ppl?.[pi]) return
    if (mode === undefined) delete ppl[pi].quoteMode
    else ppl[pi].quoteMode = mode
    onChange(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-bg-card p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">대사 처리 단계 일괄 편집</h2>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary hover:bg-bg-hover">닫기</button>
        </div>
        <p className="mb-4 text-xs text-text-secondary">음성=음성+파형 · 대사=대사 텍스트만(무음) · 직함=직함만 넘김 · 통합=직함 다 보여준 뒤 음성+대사 · 자동=세력 수장만 음성</p>

        <div className="space-y-4">
          {(script.groups ?? []).map((g, gi) => {
            if (g.disabled) return null
            const clusters = g.clusters?.length
              ? g.clusters.map((c, ci) => ({ people: c.people ?? [], ci: ci as number | null }))
              : [{ people: g.people ?? [], ci: null as number | null }]
            let leaderSeen = false
            return (
              <div key={gi}>
                <div className="mb-1 text-sm font-semibold" style={{ color: g.color }}>{g.name}</div>
                <div className="space-y-1">
                  {clusters.flatMap(({ people, ci }) =>
                    people.map((p, pi) => {
                      if (p.disabled) return null
                      const isLeader = !leaderSeen
                      leaderSeen = true
                      const hasQuote = !!(p.quoteChunks?.some(c => c.trim()) || p.quote?.trim())
                      const eff = p.quoteMode ?? (hasQuote ? (isLeader ? 'voice' : 'text') : 'credit')
                      const quoteText = p.quoteChunks?.filter(c => c.trim()).join(' ') || p.quote || ''
                      const voiceFile = factionVoiceFile(gi, pi, !!g.solo, ci ?? undefined)
                      const audioUrl = `/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}`
                      return (
                        <div key={`${ci}-${pi}`} className="space-y-1 rounded-md bg-bg-main/40 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-36 shrink-0 truncate text-sm text-text-primary">{p.name || '?'}</span>
                            <div className="flex gap-1">
                              {OPTS.map(o => (
                                <button
                                  key={o.l}
                                  type="button"
                                  onClick={() => setMode(gi, ci, pi, o.v)}
                                  className={`rounded border px-2 py-0.5 text-xs ${p.quoteMode === o.v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                >
                                  {o.l}
                                </button>
                              ))}
                            </div>
                            <span className="ml-auto shrink-0 text-[10px] text-text-dim">→ {eff}{p.quoteMode ? '' : ' (자동)'}</span>
                          </div>
                          {quoteText && <p className="truncate text-xs italic text-text-secondary" title={quoteText}>“{quoteText}”</p>}
                          {p.quoteDuration ? (
                            <audio controls preload="none" src={audioUrl} className="h-8 w-full" />
                          ) : null}
                        </div>
                      )
                    }),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
