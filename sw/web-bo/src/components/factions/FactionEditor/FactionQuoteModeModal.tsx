'use client'

import type { FactionScript, FactionPerson } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { factionStepsOf, applyFactionSteps, type FactionSteps } from '../shared/timing'
import { folderToParam } from '@/lib/faction-edit-route'

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
  const toggleStep = (gi: number, ci: number, pi: number, key: keyof FactionSteps, isLeader: boolean, isShorts: boolean) => {
    const next = JSON.parse(JSON.stringify(script)) as FactionScript
    const ppl = next.groups[gi]?.clusters?.[ci]?.people
    if (!ppl?.[pi]) return
    const cur = factionStepsOf(ppl[pi], isShorts, isLeader)
    ppl[pi] = applyFactionSteps(ppl[pi], { ...cur, [key]: !cur[key] }, isShorts)
    onChange(next)
  }

  const applyToAll = (key: keyof FactionSteps, val: boolean, isShorts: boolean) => {
    if (!confirm(`모든 인물의 ${isShorts ? '쇼츠(S)' : '롱폼(L)'} "${STEP_OPTS.find(o => o.k === key)?.l}" 단계를 일괄 ${val ? '켭니다' : '끕니다'}. 계속하시겠습니까?`)) return
    const next = JSON.parse(JSON.stringify(script)) as FactionScript
    ;(next.groups ?? []).forEach((g, gi) => {
      if (g.disabled) return
      let leaderSeen = false
      ;(g.clusters ?? []).forEach((c, ci) => {
        ;(c.people ?? []).forEach((p, pi) => {
          if (p.isPerson === false || p.disabled) return
          const isLeader = !leaderSeen
          leaderSeen = true
          const cur = factionStepsOf(p, isShorts, isLeader)
          const ppl = next.groups[gi].clusters![ci].people!
          ppl[pi] = applyFactionSteps(ppl[pi], { ...cur, [key]: val }, isShorts)
        })
      })
    })
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

  // 전체 인물의 "인물명 - 대사"를 순서대로 모아 클립보드에 복사
  const copyAllQuotes = () => {
    const lines: string[] = []
    ;(script.groups ?? []).forEach(g => {
      if (g.disabled) return
      ;(g.clusters ?? []).forEach(c => {
        ;(c.people ?? []).forEach(p => {
          if (p.isPerson === false || p.disabled) return
          const quote = p.quoteChunks?.filter(x => x.trim()).join(' ') || p.quote || ''
          if (!quote.trim()) return
          lines.push(`${p.name || '?'} - ${quote}`)
        })
      })
    })
    navigator.clipboard.writeText(lines.join('\n')).then(
      () => alert(`대사 ${lines.length}건을 복사했습니다.`),
      () => alert('복사에 실패했습니다.'),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-bg-card p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">대사 처리 스텝 일괄 편집</h2>
          <div className="flex gap-2">
            <button onClick={copyAllQuotes} className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-sm text-accent hover:bg-accent/20">전체 대사 복사</button>
            <button onClick={onClose} className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary hover:bg-bg-hover">닫기</button>
          </div>
        </div>
        <p className="mb-4 text-xs text-text-secondary">직함=직함 2·3번 줄 · 수식어=소개 한 문장(낭독/타이핑 선택) · 음성=대사+음원(끄면 대사 안 뜸). 켜진 스텝이 직함→수식어→대사 순서로 나온다.</p>

        <div className="mb-4 rounded-lg border border-border bg-bg-main p-3">
          <h3 className="mb-2 text-sm font-bold text-text-secondary">전체 인물 일괄 적용</h3>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-text-dim mb-1">쇼츠(S) 일괄 처리</span>
              <div className="flex gap-1">
                {STEP_OPTS.map(o => (
                  <button key={o.k} type="button" onClick={() => applyToAll(o.k, true, true)} className="rounded border border-accent bg-accent/10 text-accent px-2 py-0.5 text-xs hover:bg-accent/20">
                    전체 {o.l} 켜기
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {STEP_OPTS.map(o => (
                  <button key={o.k} type="button" onClick={() => applyToAll(o.k, false, true)} className="rounded border border-border text-text-secondary px-2 py-0.5 text-xs hover:bg-bg-hover">
                    전체 {o.l} 끄기
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px bg-border"></div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-text-dim mb-1">롱폼(L) 일괄 처리</span>
              <div className="flex gap-1">
                {STEP_OPTS.map(o => (
                  <button key={o.k} type="button" onClick={() => applyToAll(o.k, true, false)} className="rounded border border-accent bg-accent/10 text-accent px-2 py-0.5 text-xs hover:bg-accent/20">
                    전체 {o.l} 켜기
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {STEP_OPTS.map(o => (
                  <button key={o.k} type="button" onClick={() => applyToAll(o.k, false, false)} className="rounded border border-border text-text-secondary px-2 py-0.5 text-xs hover:bg-bg-hover">
                    전체 {o.l} 끄기
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

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
                      if (p.isPerson === false || p.disabled) return null
                      const isLeader = !leaderSeen
                      leaderSeen = true
                      const stepsShorts = factionStepsOf(p, true, isLeader)
                      const stepsLongform = factionStepsOf(p, false, isLeader)
                      const quoteText = p.quoteChunks?.filter(c => c.trim()).join(' ') || p.quote || ''
                      const voiceFile = factionVoiceFile(gi, pi, ci)
                      const audioUrl = `/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(voiceFile)}`
                      return (
                        <div key={`${ci}-${pi}`} className="space-y-1 rounded-md bg-bg-main/40 px-2 py-1.5 flex flex-col">
                          <div className="flex items-start gap-3">
                            <span className="w-36 shrink-0 truncate text-sm text-text-primary pt-1">{p.name || '?'}</span>
                            
                            <div className="flex flex-col gap-1.5 flex-1 border-l border-border pl-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-dim font-bold w-12 shrink-0">쇼츠(S)</span>
                                <div className="flex gap-1">
                                  {STEP_OPTS.map(o => (
                                    <button
                                      key={o.k}
                                      type="button"
                                      onClick={() => toggleStep(gi, ci, pi, o.k, isLeader, true)}
                                      className={`rounded border px-2 py-0.5 text-xs ${stepsShorts[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                    >
                                      {stepsShorts[o.k] ? '☑ ' : '☐ '}{o.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-dim font-bold w-12 shrink-0">롱폼(L)</span>
                                <div className="flex gap-1">
                                  {STEP_OPTS.map(o => (
                                    <button
                                      key={o.k}
                                      type="button"
                                      onClick={() => toggleStep(gi, ci, pi, o.k, isLeader, false)}
                                      className={`rounded border px-2 py-0.5 text-xs ${stepsLongform[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                    >
                                      {stepsLongform[o.k] ? '☑ ' : '☐ '}{o.l}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 수식어 및 직함 표시 방식 옵션 */}
                            <div className="flex flex-col gap-1.5 ml-auto border-l border-border pl-3 w-64 shrink-0">
                              {/* 수식어 스텝이 켜진 인물만 — 낭독(나레이터 음성) / 타이핑(소리+글자) 선택 */}
                              {(stepsShorts.epithet || stepsLongform.epithet) && p.epithet ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-text-dim">수식어</span>
                                  <div className="flex gap-1">
                                    {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, val]) => {
                                      const active = isNarrated(p) === val
                                      return (
                                        <button
                                          key={label}
                                          type="button"
                                          onClick={() => setEpithetNarrate(gi, ci, pi, val)}
                                          className={`rounded border px-2 py-0.5 text-[10px] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                        >
                                          {label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {/* 직함 스텝이 켜진 인물만 — 순차등장(페이드인) / 타이핑 선택 */}
                              {(stepsShorts.credit || stepsLongform.credit) && (p.lines?.length ?? 0) > 0 ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-text-dim">직함</span>
                                  <div className="flex gap-1">
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
                                          className={`rounded border px-2 py-0.5 text-[10px] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                                        >
                                          {label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          
                          {(quoteText || p.quoteDuration) && (
                            <div className="mt-1 flex items-center gap-2 border-t border-border/50 pt-1.5 pl-1">
                              {quoteText && <p className="flex-1 truncate text-xs italic text-text-secondary" title={quoteText}>“{quoteText}”</p>}
                              {p.quoteDuration ? (
                                <audio controls preload="none" src={audioUrl} className="h-6 w-48 shrink-0" />
                              ) : null}
                            </div>
                          )}
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
