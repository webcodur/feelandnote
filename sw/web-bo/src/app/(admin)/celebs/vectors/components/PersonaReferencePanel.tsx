'use client'

import { useMemo } from 'react'
import type { PersonaData, StatKey, TendencyKey } from '@/actions/admin/persona'
import { PERSONA_MANUAL_REFERENCE_ANCHORS } from '@/constants/personaReferencePoints'

type ReferenceAxis = StatKey | TendencyKey

const AXES: { key: ReferenceAxis; label: string }[] = [
  { key: 'martial', label: '무력' },
  { key: 'intellect', label: '지력' },
  { key: 'command', label: '통솔' },
  { key: 'charisma', label: '매력' },
]

const toScore100 = (axis: ReferenceAxis, value: number): number => {
  if (
    axis === 'pessimism_optimism' ||
    axis === 'conservative_progressive' ||
    axis === 'individual_social' ||
    axis === 'cautious_bold'
  ) {
    return (value + 5) * 10
  }
  return value * 10
}

interface Props {
  vectors: PersonaData[]
}

export default function PersonaReferencePanel({ vectors }: Props) {
  const rowsByAxis = useMemo(() => {
    const byNickname = new Map(vectors.map((v) => [v.nickname, v]))

    return AXES.map(({ key, label }) => {
      const anchors = PERSONA_MANUAL_REFERENCE_ANCHORS[key] ?? []
      const rows = anchors.map((anchor) => {
        const person = byNickname.get(anchor.nickname)
        const currentScore = person ? Math.round(toScore100(key, person[key])) : null
        const delta = currentScore != null ? currentScore - anchor.score100 : null
        return { ...anchor, currentScore, delta }
      })
      return { key, label, rows }
    })
  }, [vectors])

  return (
    <section className="rounded-xl border border-accent/20 bg-bg-card/50 p-4 md:p-5 space-y-4">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-text-primary">KOEI 삼국지 기준점</h2>
        <p className="text-xs md:text-sm text-text-secondary mt-1">
          삼국지 시리즈 대표 수치를 기준점으로 사용. 현재 DB 인물이 매칭되면 편차를 표시합니다.
        </p>
      </div>

      <div className="space-y-4">
        {rowsByAxis.map(({ key, label, rows }) => (
          <div key={key} className="rounded-lg border border-white/10 bg-black/20">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <h3 className="text-xs md:text-sm font-semibold text-text-primary">{label}</h3>
              <span className="text-[11px] md:text-xs text-text-secondary">
                기준점 {rows.length}명
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] md:text-xs">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2 px-2 text-text-secondary font-medium">기준점수</th>
                    <th className="text-left py-2 px-2 text-text-secondary font-medium">인물</th>
                    <th className="text-left py-2 px-2 text-text-secondary font-medium">현재점수</th>
                    <th className="text-left py-2 px-2 text-text-secondary font-medium">편차</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${key}-${row.nickname}`} className="border-b border-border/30">
                      <td className="py-2 px-2 font-mono text-text-primary">{row.score100}</td>
                      <td className="py-2 px-2 text-text-primary">{row.nickname}</td>
                      <td className="py-2 px-2 font-mono text-text-primary">{row.currentScore ?? '-'}</td>
                      <td className={`py-2 px-2 font-mono ${
                        row.delta == null
                          ? 'text-text-tertiary'
                          : row.delta > 0
                            ? 'text-green-400'
                            : row.delta < 0
                              ? 'text-red-400'
                              : 'text-text-secondary'
                      }`}>
                        {row.delta == null ? '-' : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
