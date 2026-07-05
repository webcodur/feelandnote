'use client'

import type { FactionScript, FactionPerson } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { factionStepsOf, applyFactionSteps, type FactionSteps } from '../shared/timing'

const STEP_OPTS: { k: keyof FactionSteps; l: string }[] = [
  { k: 'credit', l: '직함' },
  { k: 'epithet', l: '수식어' },
  { k: 'voice', l: '음성' },
]

/**
 * 대사 처리 스텝 일괄 편집 모달.
 * 전 인물을 세력별로 나열하고 각자 직함·수식어·음성 3개 스텝을 체크박스로 지정한다.
 * - 직함: 직함 2·3번 줄을 순차로 보여준 뒤 다음으로 교차
 * - 수식어: 수식어를 보여준 뒤 다음으로 교차(세로 쇼츠). 표시 방식은 낭독(나레이터 음성) / 타이핑(소리+글자) 중 선택
 * - 음성: 대사를 표시하고 음원이 있으면 재생(꺼지면 대사 자체가 안 뜸)
 * 켜진 스텝이 직함 → 수식어 → 대사 순서로 나온다.
 */
export function FactionQuoteModeModal({ script, series, episodeName, onChange, onClose }: {
  script: FactionScript
  series: string
  episodeName: string
  onChange: (next: FactionScript) => void
  onClose: () => void
}) {
  const toggleStep = (gi: number, ci: number, pi: number, key: keyof FactionSteps, isLeader: boolean) => {
    const next = JSON.parse(JSON.stringify(script)) as FactionScript
    const ppl = next.groups[gi]?.clusters?.[ci]?.people
    if (!ppl?.[pi]) return
    const cur = factionStepsOf(ppl[pi], false, isLeader)
    ppl[pi] = applyFactionSteps(ppl[pi], { ...cur, [key]: !cur[key] }, false)
    onChange(next)
  }

  // 수식어 표시 방식 — 낭독(나레이터 음성) / 타이핑(소리+글자) 중 선택
  const setEpithetNarrate = (gi: number, ci: number, pi: number, val: boolean) => {
    const next = JSON.parse(JSON.stringify(script)) as FactionScript
    const ppl = next.groups[gi]?.clusters?.[ci]?.people
    if (!ppl?.[pi]) return
    ppl[pi] = { ...ppl[pi], epithetNarrate: val }
    onChange(next)
  }
  // 현재 표시 방식 — 명시값 우선, 미지정이면 음원 있으면 낭독·없으면 타이핑(렌더 epithetIsNarrated와 동일)
  const isNarrated = (p: FactionPerson) =>
    p.epithetNarrate !== undefined ? p.epithetNarrate : !!(p.epithetDuration && p.epithetDuration > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-bg-card p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">대사 처리 스텝 일괄 편집</h2>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary hover:bg-bg-hover">닫기</button>
        </div>
        <p className="mb-4 text-xs text-text-secondary">직함=직함 2·3번 줄 · 수식어=소개 한 문장(낭독/타이핑 선택) · 음성=대사+음원(끄면 대사 안 뜸). 켜진 스텝이 직함→수식어→대사 순서로 나온다.</p>

        <div className="space-y-4">
          {(script.groups ?? []).map((g, gi) => {
            if (g.disabled) return null
            const clusters = (g.clusters ?? []).map((c, ci) => ({ people: c.people ?? [], ci }))
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
                      const steps = factionStepsOf(p, false, isLeader)
                      const quoteText = p.quoteChunks?.filter(c => c.trim()).join(' ') || p.quote || ''
                      const voiceFile = factionVoiceFile(gi, pi, ci)
                      const audioUrl = `/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}`
                      return (
                        <div key={`${ci}-${pi}`} className="space-y-1 rounded-md bg-bg-main/40 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-36 shrink-0 truncate text-sm text-text-primary">{p.name || '?'}</span>
                            <div className="flex gap-1">
                              {STEP_OPTS.map(o => (
                                <button
                                  key={o.k}
                                  type="button"
                                  onClick={() => toggleStep(gi, ci, pi, o.k, isLeader)}
                                  className={`rounded border px-2 py-0.5 text-xs ${steps[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                >
                                  {steps[o.k] ? '☑ ' : '☐ '}{o.l}
                                </button>
                              ))}
                            </div>
                            {/* 수식어 스텝이 켜진 인물만 — 낭독(나레이터 음성) / 타이핑(소리+글자) 선택 */}
                            {steps.epithet && p.epithet ? (
                              <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
                                {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, val]) => {
                                  const active = isNarrated(p) === val
                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => setEpithetNarrate(gi, ci, pi, val)}
                                      className={`rounded border px-2 py-0.5 text-xs ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                            {/* 직함 스텝이 켜진 인물만 — 순차등장(페이드인) / 타이핑 선택 */}
                            {steps.credit && (p.lines?.length ?? 0) > 0 ? (
                              <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
                                {([['순차등장', false], ['⌨ 타이핑', true]] as const).map(([label, val]) => {
                                  const active = !!p.linesTyping === val
                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => {
                                        const next = JSON.parse(JSON.stringify(script)) as FactionScript
                                        const ppl = next.groups[gi]?.clusters?.[ci]?.people
                                        if (ppl?.[pi]) ppl[pi] = { ...ppl[pi], linesTyping: val }
                                        onChange(next)
                                      }}
                                      className={`rounded border px-2 py-0.5 text-xs ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
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
