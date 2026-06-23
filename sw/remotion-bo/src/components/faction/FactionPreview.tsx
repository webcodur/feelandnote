'use client'

import type { FactionScript, FactionGroup, FactionCluster, FactionPerson } from '@/lib/faction-types'
import { imageSrc, initial, totalSec, cueCount, formatMmss } from './timing'
import { Eye, EyeOff } from './icons'

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

// 화보 카드 자리 표시 — 이미지 있으면 썸네일, 없으면 칩
function CoverChip({ image, label, note, color, series, episodeName }: {
  image?: string
  label?: string
  note?: string
  color: string
  series: string
  episodeName: string
}) {
  const src = imageSrc(series, episodeName, image)
  return (
    <div className="flex items-center gap-2">
      {src ? (
        <img src={src} alt="" className="h-10 w-16 rounded object-cover" style={{ border: `1px solid ${color}` }} />
      ) : (
        <span className="rounded border border-dashed border-border px-2 py-1 text-[11px] text-text-dim">화보 없음</span>
      )}
      {(note ?? label) && <span className="truncate text-xs font-semibold" style={{ color }}>{note ?? label}</span>}
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
  const hasQuote = !!(person.quoteChunks?.some(c => c.trim()) || person.quote?.trim())
  // 대사 처리 단계 — 미지정이면 수장=voice / 나머지=text / 대사 없으면 credit
  const mode = person.quoteMode ?? (hasQuote ? (isLeader ? 'voice' : 'text') : 'credit')
  const badge = mode === 'voice'
    ? { t: '음성', c: 'bg-accent/20 text-accent' }
    : mode === 'full'
      ? { t: '통합', c: 'bg-accent/15 text-accent' }
      : mode === 'text'
        ? { t: '대사', c: 'bg-sky-500/15 text-sky-400' }
        : { t: '직함', c: 'bg-bg-secondary text-text-dim' }
  return (
    <div
      className="flex w-16 shrink-0 flex-col items-center gap-1"
      style={person.disabled ? { opacity: 0.4, filter: 'saturate(0.4)' } : undefined}
    >
      {src ? (
        <img src={src} alt="" className={`h-14 w-14 rounded-full object-cover ${missing ? 'border-2 border-danger-text' : ''}`} />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger-text bg-bg-secondary text-sm font-bold text-text-secondary">
          {initial(person.name)}
        </span>
      )}
      <span className={`rounded px-1 text-[9px] font-semibold ${badge.c}`} title={`대사 처리: ${badge.t}${person.quoteMode ? '' : ' (자동)'}`}>{badge.t}</span>
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
            {/* 타이틀 카드 */}
            <div className="rounded-md bg-bg-secondary p-4 text-center">
              <p className="text-base font-bold text-text-primary">{script.title || '제목 없음'}</p>
              {script.subtitle && <p className="text-xs text-text-secondary">{script.subtitle}</p>}
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
                      <span className="truncate text-sm font-semibold text-text-primary">{g.name || '세력명 없음'}</span>
                      {g.tagline && <span className="truncate text-xs text-text-dim">{g.tagline}</span>}
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
                          <CoverChip image={c.image} label={c.label} note={c.note} color={color} series={series} episodeName={episodeName} />
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
