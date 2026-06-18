'use client'

import type { FactionScript, FactionGroup, FactionCluster, FactionPerson } from '@/lib/faction-types'
import { imageSrc, initial, totalSec, cueCount, formatMmss } from './timing'

type Props = {
  script: FactionScript
  series: string
  episodeName: string
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
function PersonCell({ person, series, episodeName }: {
  person: FactionPerson
  series: string
  episodeName: string
}) {
  const src = imageSrc(series, episodeName, person.image)
  const missing = !person.image
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1">
      {src ? (
        <img src={src} alt="" className={`h-14 w-14 rounded-full object-cover ${missing ? 'border-2 border-danger-text' : ''}`} />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger-text bg-bg-secondary text-sm font-bold text-text-secondary">
          {initial(person.name)}
        </span>
      )}
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

export function FactionPreview({ script, series, episodeName }: Props) {
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
                      {g.disabled && <span className="ml-auto shrink-0 rounded bg-danger/20 px-1.5 text-[10px] font-semibold text-danger-text">영상 제외</span>}
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
                            <PersonCell key={pi} person={p} series={series} episodeName={episodeName} />
                          ))}
                          {people.length === 0 && <span className="text-xs text-text-dim">인물 없음</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* 마무리 — 한 편의 매듭 */}
            <div className="rounded-md bg-bg-secondary p-4 text-center">
              <p className="text-sm font-bold text-text-primary">{script.outroTitle || script.title || '마무리'}</p>
              {script.outroNote && <p className="mt-1 text-xs text-text-secondary">{script.outroNote}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
