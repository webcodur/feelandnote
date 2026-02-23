'use client'

import { useState } from 'react'
import type { PersonaData, StatKey, TendencyKey } from '@/actions/admin/persona'
import PersonaStatBars from '@/components/celeb/PersonaStatBars'

const ALL_STAT_KEYS: StatKey[] = [
  'temperance', 'diligence', 'reflection', 'courage',
  'loyalty', 'benevolence', 'fairness', 'humility',
  'command', 'martial', 'intellect', 'charisma',
]

const TENDENCY_KEYS: TendencyKey[] = [
  'pessimism_optimism', 'conservative_progressive',
  'individual_social', 'cautious_bold',
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

const COLORS = [
  '#d4af37', '#4fc3f7', '#ef5350', '#66bb6a', '#ab47bc',
  '#ff7043', '#26c6da', '#ec407a', '#8d6e63', '#78909c',
]

interface Props {
  vectors: PersonaData[]
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

  const personaEntries = selectedVectors.map((v) => ({
    ...v,
    id: v.celeb_id,
    nickname: v.nickname,
  }))

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* 좌측: 스텟 */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">인물 분석</h2>
          {selected.length === 0 ? (
            <p className="text-text-secondary text-center py-20">셀럽을 선택하세요</p>
          ) : (
            <PersonaStatBars personas={personaEntries} />
          )}
        </div>
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
