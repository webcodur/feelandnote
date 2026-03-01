'use client'

import { useState, useMemo } from 'react'
import type { InfluenceData, InfluenceAxis } from '@/actions/admin/influence'

const AXES: { key: InfluenceAxis; label: string }[] = [
  { key: 'political', label: '정치·외교' },
  { key: 'strategic', label: '전략·안보' },
  { key: 'tech', label: '기술·과학' },
  { key: 'social', label: '사회·윤리' },
  { key: 'economic', label: '산업·경제' },
  { key: 'cultural', label: '문화·예술' },
]

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

type SortKey = 'total_score' | 'transhistoricity' | InfluenceAxis

interface Props {
  data: InfluenceData[]
}

export default function InfluenceDashboard({ data }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('total_score')
  const [filterProf, setFilterProf] = useState<string>('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const professions = useMemo(() => {
    const set = new Set(data.map((d) => d.profession).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [data])

  const sorted = useMemo(() => {
    let filtered = data
    if (filterProf) filtered = filtered.filter((d) => d.profession === filterProf)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((d) => d.nickname.toLowerCase().includes(q))
    }
    return [...filtered].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  }, [data, sortBy, filterProf, search])

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-tertiary w-48"
        />
        <select
          value={filterProf}
          onChange={(e) => setFilterProf(e.target.value)}
          className="px-3 py-1.5 text-sm bg-bg-card border border-border rounded-lg text-text-primary"
        >
          <option value="">전체 직군</option>
          {professions.map((p) => (
            <option key={p} value={p}>{PROFESSION_LABELS[p] ?? p}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="px-3 py-1.5 text-sm bg-bg-card border border-border rounded-lg text-text-primary"
        >
          <option value="total_score">총점순</option>
          <option value="transhistoricity">통시성순</option>
          {AXES.map((a) => (
            <option key={a.key} value={a.key}>{a.label}순</option>
          ))}
        </select>
        <span className="flex items-center text-xs text-text-secondary ml-auto">
          {sorted.length}명
        </span>
      </div>

      {/* 테이블 */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-black/20">
                <th className="text-left py-2 px-3 text-text-secondary font-medium w-8">#</th>
                <th className="text-left py-2 px-3 text-text-secondary font-medium">인물</th>
                {AXES.map((a) => (
                  <th
                    key={a.key}
                    className={`text-center py-2 px-2 font-medium cursor-pointer hover:text-text-primary ${
                      sortBy === a.key ? 'text-accent' : 'text-text-secondary'
                    }`}
                    onClick={() => setSortBy(a.key)}
                  >
                    {a.label}
                  </th>
                ))}
                <th
                  className={`text-center py-2 px-2 font-medium cursor-pointer hover:text-text-primary ${
                    sortBy === 'transhistoricity' ? 'text-accent' : 'text-text-secondary'
                  }`}
                  onClick={() => setSortBy('transhistoricity')}
                >
                  통시성
                </th>
                <th
                  className={`text-center py-2 px-3 font-medium cursor-pointer hover:text-text-primary ${
                    sortBy === 'total_score' ? 'text-accent' : 'text-text-secondary'
                  }`}
                  onClick={() => setSortBy('total_score')}
                >
                  총점
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const isExpanded = expanded === row.celeb_id
                const colSpan = AXES.length + 4 // # + 인물 + 6축 + 통시성 + 총점
                return (
                  <RowGroup key={row.celeb_id}>
                    <tr
                      className={`border-b border-border/30 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-accent/5' : 'hover:bg-white/5'
                      }`}
                      onClick={() => setExpanded(isExpanded ? null : row.celeb_id)}
                    >
                      <td className="py-2 px-3 text-text-tertiary tabular-nums">{i + 1}</td>
                      <td className="py-2 px-3">
                        <p className="text-text-primary font-medium">{row.nickname}</p>
                        <p className="text-[10px] text-text-tertiary">
                          {PROFESSION_LABELS[row.profession ?? ''] ?? row.profession}
                        </p>
                      </td>
                      {AXES.map((a) => (
                        <td key={a.key} className="text-center py-2 px-2 tabular-nums">
                          <ScoreCell value={row[a.key]} max={10} />
                        </td>
                      ))}
                      <td className="text-center py-2 px-2 tabular-nums">
                        <ScoreCell value={row.transhistoricity} max={40} />
                      </td>
                      <td className="text-center py-2 px-3 font-semibold text-text-primary tabular-nums">
                        {row.total_score}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-accent/5 border-b border-border/30">
                        <td colSpan={colSpan} className="px-3 py-2">
                          <div className="grid gap-1 text-[11px]">
                            {[...AXES.map((a) => ({
                              label: a.label,
                              score: row[a.key],
                              max: 10,
                              exp: row[`${a.key}_exp` as keyof InfluenceData] as string | null,
                              expEn: row[`${a.key}_exp_en` as keyof InfluenceData] as string | null,
                            })), {
                              label: '통시성',
                              score: row.transhistoricity,
                              max: 40,
                              exp: row.transhistoricity_exp,
                              expEn: row.transhistoricity_exp_en,
                            }].map((item) => (
                              <div key={item.label} className="grid grid-cols-[72px_36px_1fr] items-baseline gap-1.5">
                                <span className="text-text-secondary">{item.label}</span>
                                <span className="font-mono tabular-nums text-text-primary">{item.score}/{item.max}</span>
                                <div>
                                  <span className="text-text-tertiary">{item.exp || '-'}</span>
                                  {item.expEn && (
                                    <span className="block text-[10px] text-text-tertiary/60 mt-0.5">{item.expEn}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function ScoreCell({ value, max }: { value: number; max: number }) {
  const ratio = value / max
  const color =
    ratio >= 0.8 ? 'text-amber-400' :
    ratio >= 0.5 ? 'text-text-primary' :
    'text-text-tertiary'
  return <span className={color}>{value}</span>
}
