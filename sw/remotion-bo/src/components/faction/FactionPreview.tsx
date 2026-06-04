'use client'

import type { FactionScript } from '@/lib/faction-types'
import { imageSrc, initial, totalSec, cueCount, formatMmss } from './timing'

type Props = {
  script: FactionScript
  series: string
  episodeName: string
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
              const people = g.people ?? []
              const color = g.color ?? '#92400e'
              return (
                <div key={gi} className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-bg-secondary px-3 py-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate text-sm font-semibold text-text-primary">{g.name || '세력명 없음'}</span>
                    {g.tagline && <span className="truncate text-xs text-text-dim">{g.tagline}</span>}
                  </div>

                  {/* 인물 가로 스트립 */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {people.map((p, pi) => {
                      const src = imageSrc(series, episodeName, p.image)
                      const missing = !p.image
                      return (
                        <div key={pi} className="flex w-14 shrink-0 flex-col items-center gap-1">
                          {src ? (
                            <img src={src} alt="" className={`h-14 w-14 rounded-full object-cover ${missing ? 'border-2 border-danger-text' : ''}`} />
                          ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-danger-text bg-bg-secondary text-sm font-bold text-text-secondary">
                              {initial(p.name)}
                            </span>
                          )}
                          <span className="w-full truncate text-center text-[11px] text-text-secondary">{p.name || '?'}</span>
                        </div>
                      )
                    })}
                    {people.length === 0 && <span className="text-xs text-text-dim">인물 없음</span>}
                  </div>
                </div>
              )
            })}

            {/* 엔딩 */}
            <div className="rounded-md bg-bg-secondary p-4 text-center text-sm font-semibold text-text-secondary">
              엔딩
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
