'use client'

import { useMemo } from 'react'
import type { PersonaData, StatKey, TendencyKey } from '@/actions/admin/persona'
import { PERSONA_MANUAL_REFERENCE_ANCHORS } from '@/constants/personaReferencePoints'

type ReferenceAxis = StatKey | TendencyKey

const AXES: { key: ReferenceAxis; label: string }[] = [
  { key: 'martial', label: '무력' },
  { key: 'intellect', label: '지력' },
  { key: 'command', label: '통솔' },
  { key: 'charm', label: '매력' },
]

// DB 값이 이미 0~100(능력/덕목) 또는 -50~+50(성향) 스케일이므로 그대로 사용
const toScore100 = (_axis: ReferenceAxis, value: number): number => value

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
    <section className="rounded-xl border border-accent/20 bg-bg-card/50 p-3 md:p-4 space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-text-primary">KOEI 삼국지 기준점</h2>
        <span className="text-[11px] text-text-secondary">DB 인물 매칭 시 편차 표시</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rowsByAxis.map(({ key, label, rows }) => (
          <div key={key} className="rounded-lg border border-white/10 bg-black/20">
            <div className="border-b border-white/10 px-2.5 py-1.5">
              <h3 className="text-xs font-semibold text-text-primary">{label}</h3>
            </div>
            <div className="px-1 py-1">
              {rows.map((row) => (
                <div
                  key={`${key}-${row.nickname}`}
                  className="grid grid-cols-[28px_1fr_28px_36px] items-center px-1.5 py-0.5 text-[11px]"
                >
                  <span className="font-mono text-text-secondary tabular-nums">{row.score100}</span>
                  <span className="text-text-primary truncate">{row.nickname}</span>
                  <span className="font-mono text-text-primary tabular-nums text-right">
                    {row.currentScore ?? <span className="text-text-tertiary">-</span>}
                  </span>
                  <span className={`font-mono tabular-nums text-right ${
                    row.delta == null
                      ? 'text-text-tertiary'
                      : row.delta > 0
                        ? 'text-green-400'
                        : row.delta < 0
                          ? 'text-red-400'
                          : 'text-text-secondary'
                  }`}>
                    {row.delta == null ? '-' : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
