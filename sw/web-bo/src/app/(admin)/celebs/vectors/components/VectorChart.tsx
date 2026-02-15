'use client'

import { useState } from 'react'
import type { PersonaData, StatKey, TendencyKey } from '@/actions/admin/persona'

const INNER_VIRTUE_KEYS: StatKey[] = ['temperance', 'diligence', 'reflection', 'courage']
const OUTER_VIRTUE_KEYS: StatKey[] = ['loyalty', 'benevolence', 'fairness', 'humility']
const ABILITY_KEYS: StatKey[] = ['command', 'martial', 'intellect', 'charisma']

const ALL_STAT_KEYS: StatKey[] = [...INNER_VIRTUE_KEYS, ...OUTER_VIRTUE_KEYS, ...ABILITY_KEYS]

const STAT_LABELS: Record<StatKey, string> = {
  temperance: '절제',
  diligence: '근면',
  reflection: '성찰',
  courage: '용기',
  loyalty: '충의',
  benevolence: '인애',
  fairness: '공정',
  humility: '겸양',
  command: '통솔',
  martial: '무력',
  intellect: '지력',
  charisma: '매력',
}

const TENDENCY_KEYS: TendencyKey[] = [
  'pessimism_optimism', 'conservative_progressive',
  'individual_social', 'cautious_bold',
]

const TENDENCY_LABELS: Record<TendencyKey, [string, string]> = {
  pessimism_optimism: ['비관', '낙관'],
  conservative_progressive: ['보수', '진취'],
  individual_social: ['개인', '사회'],
  cautious_bold: ['신중', '과감'],
}

const PROFESSION_LABELS: Record<string, string> = {
  politician: '정치인',
  humanities_scholar: '인문학자',
  entrepreneur: '기업가',
  scientist: '과학자',
  commander: '지휘관',
  author: '작가',
  director: '감독',
  musician: '음악인',
  visual_artist: '미술인',
  leader: '지도자',
  investor: '투자자',
  social_scientist: '사회과학자',
  actor: '배우',
  athlete: '스포츠인',
  influencer: '인플루엔서',
}

const COLORS = [
  '#d4af37', '#4fc3f7', '#ef5350', '#66bb6a', '#ab47bc',
  '#ff7043', '#26c6da', '#ec407a', '#8d6e63', '#78909c',
]

interface Props {
  vectors: PersonaData[]
}

function normalizeStat(value: number): number {
  return value / 100
}

function getPoint(index: number, total: number, ratio: number, cx: number, cy: number, r: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: cx + r * ratio * Math.cos(angle),
    y: cy + r * ratio * Math.sin(angle),
  }
}

/** 4축 레이더 (정사각형 기반) */
function MiniRadar({ keys, labels, selected, title }: {
  keys: StatKey[]
  labels: Record<StatKey, string>
  selected: PersonaData[]
  title: string
}) {
  const cx = 120
  const cy = 120
  const r = 90
  const levels = 5
  const total = keys.length

  const gridLines = Array.from({ length: levels }, (_, i) => {
    const ratio = (i + 1) / levels
    return Array.from({ length: total }, (_, j) => {
      const p = getPoint(j, total, ratio, cx, cy, r)
      return `${p.x},${p.y}`
    }).join(' ')
  })

  const axisLines = Array.from({ length: total }, (_, i) => {
    const p = getPoint(i, total, 1, cx, cy, r)
    return { x1: cx, y1: cy, x2: p.x, y2: p.y }
  })

  const axisLabels = keys.map((key, i) => {
    const p = getPoint(i, total, 1.3, cx, cy, r)
    return { x: p.x, y: p.y, label: labels[key] }
  })

  return (
    <div>
      <h3 className="text-sm font-medium text-text-secondary mb-2 text-center">{title}</h3>
      <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
        {gridLines.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={i === levels - 1 ? 1.5 : 0.5}
          />
        ))}
        {axisLines.map((line, i) => (
          <line key={i} {...line} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
        ))}
        {selected.map((vec, vi) => {
          const points = keys.map((key, i) => {
            const p = getPoint(i, total, normalizeStat(vec[key]), cx, cy, r)
            return `${p.x},${p.y}`
          }).join(' ')
          const color = COLORS[vi % COLORS.length]
          return (
            <g key={vec.celeb_id}>
              <polygon points={points} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />
              {keys.map((key, i) => {
                const p = getPoint(i, total, normalizeStat(vec[key]), cx, cy, r)
                return <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
              })}
            </g>
          )
        })}
        {axisLabels.map((l, i) => (
          <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize={10}>
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

/** 성향 바 차트 (-50 ~ +50) */
function TendencyBars({ selected }: { selected: PersonaData[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-text-secondary mb-3 text-center">성향</h3>
      <div className="space-y-3">
        {TENDENCY_KEYS.map((key) => {
          const [neg, pos] = TENDENCY_LABELS[key]
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>{neg}</span>
                <span>{pos}</span>
              </div>
              {selected.map((vec, vi) => {
                const val = vec[key]
                const pct = ((val + 50) / 100) * 100
                const color = COLORS[vi % COLORS.length]
                return (
                  <div key={vec.celeb_id} className="relative h-4 bg-white/5 rounded mb-1">
                    {/* 중앙선 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                    {/* 마커 */}
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full"
                      style={{ left: `calc(${pct}% - 6px)`, backgroundColor: color }}
                    />
                    <span className="absolute right-1 top-0 text-[10px] font-mono" style={{ color }}>
                      {val > 0 ? '+' : ''}{val}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function calcDistance(a: PersonaData, b: PersonaData): number {
  let sum = 0
  for (const key of ALL_STAT_KEYS) {
    sum += (a[key] - b[key]) ** 2
  }
  for (const key of TENDENCY_KEYS) {
    sum += (a[key] - b[key]) ** 2
  }
  return Math.sqrt(sum)
}

export default function VectorDashboard({ vectors }: Props) {
  const [selected, setSelected] = useState<string[]>(
    vectors.length > 0 ? [vectors[0].celeb_id] : []
  )

  const selectedVectors = vectors.filter((v) => selected.includes(v.celeb_id))

  const primaryTarget = vectors.find((v) => v.celeb_id === selected[0])
  const similarities = primaryTarget
    ? vectors
        .filter((v) => v.celeb_id !== primaryTarget.celeb_id)
        .map((v) => ({ ...v, distance: calcDistance(primaryTarget, v) }))
        .sort((a, b) => a.distance - b.distance)
    : []

  function toggleSelect(celebId: string) {
    setSelected((prev) =>
      prev.includes(celebId)
        ? prev.filter((id) => id !== celebId)
        : [...prev, celebId]
    )
  }

  const GROUPS: { title: string; keys: StatKey[] }[] = [
    { title: '내적 덕목', keys: INNER_VIRTUE_KEYS },
    { title: '외적 덕목', keys: OUTER_VIRTUE_KEYS },
    { title: '능력', keys: ABILITY_KEYS },
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* 좌측: 차트 */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">인물 분석</h2>
          {selected.length === 0 ? (
            <p className="text-text-secondary text-center py-20">셀럽을 선택하세요</p>
          ) : (
            <>
              {/* 범례 */}
              <div className="flex flex-wrap gap-3 mb-6 justify-center">
                {selectedVectors.map((v, i) => (
                  <div key={v.celeb_id} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-text-primary">{v.nickname}</span>
                  </div>
                ))}
              </div>

              {/* 3개 레이더 + 성향 바 = 2x2 그리드 */}
              <div className="grid grid-cols-2 gap-6">
                {GROUPS.map((g) => (
                  <MiniRadar key={g.title} keys={g.keys} labels={STAT_LABELS} selected={selectedVectors} title={g.title} />
                ))}
                <TendencyBars selected={selectedVectors} />
              </div>
            </>
          )}
        </div>

        {/* 상세 점수 테이블 (카테고리별 구분) */}
        {selectedVectors.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4">상세 점수</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">항목</th>
                  {selectedVectors.map((v) => (
                    <th key={v.celeb_id} className="text-center py-2 px-3 text-text-primary font-medium">
                      {v.nickname}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => (
                  <>
                    <tr key={`header-${g.title}`}>
                      <td colSpan={selectedVectors.length + 1} className="pt-4 pb-1 px-3 text-xs font-semibold text-accent uppercase tracking-wider">
                        {g.title}
                      </td>
                    </tr>
                    {g.keys.map((key) => (
                      <tr key={key} className="border-b border-border/50">
                        <td className="py-2 px-3 text-text-secondary">{STAT_LABELS[key]}</td>
                        {selectedVectors.map((v) => (
                          <td key={v.celeb_id} className="text-center py-2 px-3 font-mono text-text-primary">
                            {v[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
                {/* 성향 */}
                <tr>
                  <td colSpan={selectedVectors.length + 1} className="pt-4 pb-1 px-3 text-xs font-semibold text-accent uppercase tracking-wider">
                    성향
                  </td>
                </tr>
                {TENDENCY_KEYS.map((key) => {
                  const [neg, pos] = TENDENCY_LABELS[key]
                  return (
                    <tr key={key} className="border-b border-border/50">
                      <td className="py-2 px-3 text-text-secondary">{neg} ~ {pos}</td>
                      {selectedVectors.map((v) => {
                        const val = v[key]
                        const color = val < 0 ? 'text-blue-400' : val > 0 ? 'text-orange-400' : 'text-text-secondary'
                        return (
                          <td key={v.celeb_id} className={`text-center py-2 px-3 font-mono ${color}`}>
                            {val > 0 ? '+' : ''}{val}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 우측: 셀럽 목록 + 유사 인물 */}
      <div className="space-y-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h2 className="text-base font-semibold text-text-primary mb-3">
            셀럽 선택 <span className="text-text-secondary font-normal text-sm">({vectors.length}명)</span>
          </h2>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {vectors.map((v) => {
              const isSelected = selected.includes(v.celeb_id)
              return (
                <button
                  key={v.celeb_id}
                  onClick={() => toggleSelect(v.celeb_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-accent/10 border border-accent/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {isSelected && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[selected.indexOf(v.celeb_id) % COLORS.length] }}
                    />
                  )}
                  <div className={isSelected ? '' : 'ml-[22px]'}>
                    <p className="text-sm font-medium text-text-primary">{v.nickname}</p>
                    <p className="text-xs text-text-secondary">
                      {PROFESSION_LABELS[v.profession ?? ''] ?? v.profession}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {primaryTarget && similarities.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-text-primary mb-1">
              유사 인물
            </h2>
            <p className="text-xs text-text-secondary mb-3">
              {primaryTarget.nickname} 기준 (유클리드 거리)
            </p>
            <div className="space-y-2">
              {similarities.slice(0, 10).map((s, i) => (
                <div
                  key={s.celeb_id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  onClick={() => {
                    if (!selected.includes(s.celeb_id)) {
                      setSelected((prev) => [...prev, s.celeb_id])
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-accent">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-text-primary">{s.nickname}</p>
                      <p className="text-xs text-text-secondary">
                        {PROFESSION_LABELS[s.profession ?? ''] ?? s.profession}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary font-mono">
                    d={s.distance.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
