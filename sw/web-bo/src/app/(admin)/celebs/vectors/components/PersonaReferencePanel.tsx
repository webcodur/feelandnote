'use client'

import { useMemo } from 'react'
import type { PersonaData, StatKey, TendencyKey } from '@/actions/admin/persona'
import {
  AXIS_LABELS,
  PERSONA_ANCHORS,
  THREE_KINGDOMS_ANCHORS,
} from '@feelandnote/shared/constants/celeb-persona-scale'

type ReferenceAxis = StatKey | TendencyKey

// 실존 인물 통합 척도를 정본으로 보여주고, 삼국지 대응표는 아래에 따로 붙인다.
const AXES: ReferenceAxis[] = ['command', 'martial', 'intellect', 'charm']

// DB 값이 이미 0~100(능력/덕목) 또는 -50~+50(성향) 스케일이므로 그대로 사용
const toScore100 = (_axis: ReferenceAxis, value: number): number => value

interface Props {
  vectors: PersonaData[]
}

function normalizeNickname(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export default function PersonaReferencePanel({ vectors }: Props) {
  const rowsByAxis = useMemo(() => {
    const byNickname = new Map(vectors.map((v) => [normalizeNickname(v.nickname), v]))

    return AXES.map((key) => {
      const toRows = (anchors: readonly { score: number; nickname: string }[]) =>
        anchors.map((anchor) => {
          const person = byNickname.get(normalizeNickname(anchor.nickname))
          const currentScore = person ? Math.round(toScore100(key, person[key])) : null
          const delta = currentScore != null ? currentScore - anchor.score : null
          return { ...anchor, currentScore, delta }
        })

      return {
        key,
        label: AXIS_LABELS[key],
        rows: toRows(PERSONA_ANCHORS[key] ?? []),
        tkRows: toRows(THREE_KINGDOMS_ANCHORS[key] ?? []),
      }
    })
  }, [vectors])

  return (
    <section className="rounded-xl border border-accent/20 bg-bg-card/50 p-3 md:p-4 space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-text-primary">채점 기준점</h2>
        <span className="text-[11px] text-text-secondary">
          실존 인물 통합 척도 · 등록된 인물은 현재 점수와 편차를 함께 표시
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rowsByAxis.map(({ key, label, rows, tkRows }) => (
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
                  <span className="font-mono text-text-secondary tabular-nums">{row.score}</span>
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

              {tkRows.length > 0 && (
                <>
                  <div className="mt-1.5 border-t border-white/10 px-1.5 pb-0.5 pt-1.5 text-[10px] text-text-secondary">
                    삼국지 인물 전용 — 실존 인물과 직접 견주지 않는다
                  </div>
                  {tkRows.map((row) => (
                    <div
                      key={`${key}-tk-${row.nickname}`}
                      className="grid grid-cols-[28px_1fr_28px_36px] items-center px-1.5 py-0.5 text-[11px] opacity-70"
                    >
                      <span className="font-mono text-text-secondary tabular-nums">{row.score}</span>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
