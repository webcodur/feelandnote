'use client'

import type { FactionScript, FactionGroup, FactionCluster, FactionPerson } from '@/lib/faction-types'
import { imageSrc, initial, totalSec, cueCount, formatMmss, cropToStyle, factionStepsOf } from '../shared/timing'
import { FactionMediaThumb } from '../shared/FactionMediaThumb'
import { Eye, EyeOff } from '../shared/icons'

type Props = {
  script: FactionScript
  series: string
  episodeName: string
  /** 미리보기에서 세력 영상 제외/복원 토글 (groupIndex). 없으면 읽기 전용 */
  onToggleDisabled?: (groupIndex: number) => void
}

// 렌더러 clustersOf와 동일 정규화: clusters 없으면 세력 전체를 단일 묶음으로
function clustersOf(g: FactionGroup): FactionCluster[] {
  return g.clusters?.length ? g.clusters : [{ image: g.image, people: g.people ?? [] }]
}

// 통합 명칭(앞부분\n뒷부분)을 첫 줄(앞부분)·나머지(뒷부분)로 분리
function splitName(v?: string): { head: string; rest: string } {
  const lines = (v ?? '').split('\n')
  return { head: (lines[0] ?? '').trim(), rest: lines.slice(1).join(' ').trim() }
}

// 화보 카드 자리 표시 — 이미지 있으면 썸네일, 없으면 칩. label은 통합 명칭(첫 줄=앞부분, 나머지=뒷부분)
function CoverChip({ image, label, color, series, episodeName }: {
  image?: string
  label?: string
  color: string
  series: string
  episodeName: string
}) {
  const src = imageSrc(series, episodeName, image)
  const { head, rest } = splitName(label)
  return (
    <div className="flex items-center gap-2">
      {src ? (
        <FactionMediaThumb src={src} alt="" className="h-10 w-16 rounded object-cover" style={{ border: `1px solid ${color}` }} />
      ) : (
        <span className="rounded border border-dashed border-border px-2 py-1 text-[11px] text-text-dim">화보 없음</span>
      )}
      {head && <span className="truncate text-xs font-semibold text-text-primary">{head}</span>}
      {rest && <span className="truncate text-xs" style={{ color }}>{rest}</span>}
    </div>
  )
}

// 인물 한 명 셀
function PersonCell({ person, series, episodeName, isLeader }: {
  person: FactionPerson
  series: string
  episodeName: string
  /** 세력 첫 인물(수장) 여부 — quoteMode 자동(미지정) 판정용 */
  isLeader?: boolean
}) {
  const src = imageSrc(series, episodeName, person.image)
  const missing = !person.image
  // 대사 처리 스텝(직함·수식어·음성) — 켜진 것만 배지로. 음성 켜지면 강조색.
  const steps = factionStepsOf(person, isLeader)
  const stepLabels = [steps.credit && '직함', steps.epithet && '수식', steps.voice && '음성'].filter(Boolean)
  const badge = {
    t: stepLabels.length ? stepLabels.join('·') : '없음',
    c: steps.voice ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-dim',
  }
  return (
    <div
      className="flex w-16 shrink-0 flex-col items-center gap-1"
      style={person.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}
    >
      {src ? (
        <FactionMediaThumb src={src} alt="" className={`h-14 w-14 rounded-full object-cover ${missing ? 'border-2 border-danger-text' : ''}`} style={cropToStyle(person.imageCrop)} />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger-text bg-bg-secondary text-sm font-bold text-text-secondary">
          {initial(person.name)}
        </span>
      )}
      <span className={`rounded px-1 text-[9px] font-semibold ${badge.c}`} title={`대사 처리: ${badge.t}`}>{badge.t}</span>
      <span className="w-full truncate text-center text-[11px] text-text-secondary">{person.name || '?'}</span>
      {person.lines?.length ? (
        <span className="w-full truncate text-center text-[10px] text-text-dim">{person.lines.filter(Boolean).join(' · ')}</span>
      ) : null}
      {person.quote ? (
        <span title={person.quote} className="w-full truncate text-center text-[10px] italic text-text-dim">“{person.quote}”</span>
      ) : null}
    </div>
  )
}

export function FactionPreview({ script, series, episodeName, onToggleDisabled }: Props) {
  const groups = script.groups ?? []

  return (
    <div>
      {/* 요약 */}
      <div className="mb-3 flex items-center gap-3 text-xs text-text-secondary">
        <span>총 길이 {formatMmss(totalSec(script))}</span>
        <span>·</span>
        <span>컷 {cueCount(script)}개</span>
      </div>

      {/* 9:16 흐름 박스 */}
      <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="flex flex-col" style={{ aspectRatio: '9 / 16', minHeight: 480 }}>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {/* 타이틀 카드 — 영상 명칭 통합(첫 줄=앞부분, 나머지=뒷부분) */}
            <div className="rounded-md bg-bg-secondary p-4 text-center">
              {(() => {
                const { head, rest } = splitName(script.title)
                return (
                  <>
                    <p className="text-base font-bold text-text-primary">{head || '영상 명칭 없음'}</p>
                    {rest && <p className="text-xs text-text-secondary">{rest}</p>}
                  </>
                )
              })()}
              {(script.logline || script.loglineByPart?.[1]) && <p className="mt-1 text-xs text-accent">{script.logline || script.loglineByPart?.[1]}</p>}
            </div>

            {/* 세력별 흐름 */}
            {groups.map((g, gi) => {
              const color = g.color ?? '#92400e'
              const clusters = clustersOf(g)
              // 비활성화 세력은 영상에서 빠진다 — 흐리게 표시하고 배지를 단다
              return (
                <div key={gi} className="space-y-2" style={g.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}>
                  {/* solo가 아니면 세력 타이틀 표시 */}
                  {!g.solo && (
                    <div className="flex items-center gap-2 rounded-md bg-bg-secondary px-3 py-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {(() => {
                        const { head, rest } = splitName(g.name)
                        return (
                          <>
                            <span className="truncate text-sm font-semibold text-text-primary">{head || '세력명 없음'}</span>
                            {rest && <span className="truncate text-xs" style={{ color }}>{rest}</span>}
                          </>
                        )
                      })()}
                      {g.disabled && <span className="shrink-0 rounded bg-danger/20 px-1.5 text-[10px] font-semibold text-danger-text">영상 제외</span>}
                      {onToggleDisabled && (
                        <button
                          onClick={() => onToggleDisabled(gi)}
                          className="ml-auto shrink-0 rounded border border-border p-1 text-text-secondary hover:bg-bg-hover"
                          title={g.disabled ? '이 세력을 다시 영상에 포함' : '이 세력을 영상에서 제외'}
                        >
                          {g.disabled ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 묶음마다: (비-solo면) 화보 카드 → 인물 컷 */}
                  {clusters.map((c, ci) => {
                    const people = c.people ?? []
                    return (
                      <div key={ci} className="space-y-1.5 rounded-md bg-bg-main/40 p-2">
                        {!g.solo && (
                          <CoverChip image={c.image} label={c.label} color={color} series={series} episodeName={episodeName} />
                        )}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {people.map((p, pi) => (
                            <PersonCell key={pi} person={p} series={series} episodeName={episodeName} isLeader={ci === 0 && pi === 0} />
                          ))}
                          {people.length === 0 && <span className="text-xs text-text-dim">인물 없음</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* 마무리 — 별도 종료 화면 없이 마지막 인물 컷에서 서서히 어두워지며 끝난다 */}
            <div className="rounded-md border border-dashed border-border bg-bg-main/40 p-3 text-center">
              <p className="text-xs text-text-dim">마지막 인물에서 서서히 어두워지며 종료</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
