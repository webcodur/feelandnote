'use client'

import { useState } from 'react'
import type { StatKey, TendencyKey } from '@/actions/admin/persona'
import type { PersonaJsonb } from '@/actions/admin/members'

// #region Constants
const INNER_VIRTUE_KEYS: StatKey[] = ['temperance', 'diligence', 'reflection', 'courage']
const OUTER_VIRTUE_KEYS: StatKey[] = ['loyalty', 'benevolence', 'fairness', 'humility']
const ABILITY_KEYS: StatKey[] = ['command', 'martial', 'intellect', 'charm']

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
  charm: '매력',
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

const COLORS = [
  '#5caeff', '#d4af37', '#ef5350', '#66bb6a', '#ab47bc',
  '#ff7043', '#26c6da', '#ec407a', '#8d6e63', '#78909c',
]

type TabType = 'ability' | 'virtue' | 'tendency'
const TABS: { key: TabType; label: string }[] = [
  { key: 'ability', label: '능력' },
  { key: 'virtue', label: '품성' },
  { key: 'tendency', label: '성향' },
]
// #endregion

// #region Types
export interface PersonaStatEntry {
  id: string
  nickname: string
  persona?: PersonaJsonb | null
  [key: string]: string | number | PersonaJsonb | null | undefined
}

interface PersonaStatBarsProps {
  personas: PersonaStatEntry[]
  showLegend?: boolean
  compact?: boolean
}
// #endregion

// #region Helpers
const JSONB_GROUP_MAP: Record<string, string> = {
  command: 'abilities', martial: 'abilities', intellect: 'abilities', charm: 'abilities',
  temperance: 'inner_virtues', diligence: 'inner_virtues', reflection: 'inner_virtues', courage: 'inner_virtues',
  loyalty: 'outer_virtues', benevolence: 'outer_virtues', fairness: 'outer_virtues', humility: 'outer_virtues',
  pessimism_optimism: 'dispositions', conservative_progressive: 'dispositions',
  individual_social: 'dispositions', cautious_bold: 'dispositions',
}

function getReason(jsonb: PersonaJsonb | null | undefined, key: string): string | undefined {
  if (!jsonb) return undefined
  const group = JSONB_GROUP_MAP[key]
  if (!group) return undefined
  const field = (jsonb[group as keyof PersonaJsonb] as Record<string, { reason_ko?: string }> | undefined)?.[key]
  return field?.reason_ko
}
// #endregion

// #region StatRow - 10칸 세그먼트 바
function StatRow({ label, value, color, reason }: { label: string; value: number; color: string; reason?: string }) {
  const score = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="grid grid-cols-[60px_1fr_44px] items-center gap-2">
        <span className="text-base text-text-secondary">{label}</span>
        <div className="grid grid-cols-10 gap-0.5 rounded-sm bg-black/30 p-1 border border-white/10">
          {Array.from({ length: 10 }, (_, i) => {
            const segStart = i * 10
            const fill = Math.max(0, Math.min(10, score - segStart)) / 10
            return (
              <span key={i} className="h-2 rounded-[1px] bg-white/10 overflow-hidden">
                <span
                  className="block h-full rounded-[1px]"
                  style={{ width: `${fill * 100}%`, backgroundColor: color }}
                />
              </span>
            )
          })}
        </div>
        <span className="text-base font-mono text-right text-text-primary tabular-nums">{Math.round(score)}</span>
      </div>
      {reason && (
        <p className="ml-[60px] mr-11 mt-0.5 text-base text-text-secondary leading-relaxed">{reason}</p>
      )}
    </div>
  )
}
// #endregion

// #region TendencyRow
function TendencyRow({ labels, value, color, reason }: { labels: [string, string]; value: number; color: string; reason?: string }) {
  const clamped = Math.max(-50, Math.min(50, value))
  const point = ((clamped + 50) / 100) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-base text-text-secondary">
        <span>{labels[0]}</span>
        <span className="font-mono tabular-nums text-text-primary">{clamped > 0 ? '+' : ''}{clamped}</span>
        <span>{labels[1]}</span>
      </div>
      <div className="relative h-2 rounded-sm border border-white/10 bg-black/30">
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
        <span
          className="absolute top-1/2 h-3 w-3 rounded-full border border-white/40"
          style={{ left: `${point}%`, transform: 'translate(-50%, -50%)', backgroundColor: color }}
        />
      </div>
      {reason && (
        <p className="mt-0.5 text-base text-text-secondary leading-relaxed">{reason}</p>
      )}
    </div>
  )
}
// #endregion

// #region 비교 모드: 여러 인물 스텟 행
function CompareStatRow({ label, personas, statKey }: { label: string; personas: PersonaStatEntry[]; statKey: string }) {
  return (
    <div className="space-y-1">
      {personas.map((p, pi) => {
        const val = (p[statKey] as number) ?? 0
        const color = COLORS[pi % COLORS.length]
        return (
          <div key={p.id} className="grid grid-cols-[60px_1fr_44px] items-center gap-2">
            <span className="text-base text-text-secondary">{pi === 0 ? label : ''}</span>
            <div className="grid grid-cols-10 gap-0.5 rounded-sm bg-black/30 p-1 border border-white/10">
              {Array.from({ length: 10 }, (_, i) => {
                const score = Math.max(0, Math.min(100, val))
                const segStart = i * 10
                const fill = Math.max(0, Math.min(10, score - segStart)) / 10
                return (
                  <span key={i} className="h-2 rounded-[1px] bg-white/10 overflow-hidden">
                    <span
                      className="block h-full rounded-[1px]"
                      style={{ width: `${fill * 100}%`, backgroundColor: color }}
                    />
                  </span>
                )
              })}
            </div>
            <span className="text-base font-mono text-right text-text-primary tabular-nums">{Math.round(val)}</span>
          </div>
        )
      })}
    </div>
  )
}

function CompareTendencyRow({ labels, personas, statKey }: { labels: [string, string]; personas: PersonaStatEntry[]; statKey: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-base text-text-secondary">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
      {personas.map((p, pi) => {
        const val = (p[statKey] as number) ?? 0
        const clamped = Math.max(-50, Math.min(50, val))
        const point = ((clamped + 50) / 100) * 100
        const color = COLORS[pi % COLORS.length]
        return (
          <div key={p.id} className="relative h-2 rounded-sm border border-white/10 bg-black/30">
            <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
            <span
              className="absolute top-1/2 h-3 w-3 rounded-full border border-white/40"
              style={{ left: `${point}%`, transform: 'translate(-50%, -50%)', backgroundColor: color }}
            />
          </div>
        )
      })}
    </div>
  )
}
// #endregion

export default function PersonaStatBars({ personas, showLegend = true, compact = false }: PersonaStatBarsProps) {
  const [tab, setTab] = useState<TabType>('ability')

  if (personas.length === 0) return null

  const isSingle = personas.length === 1
  const p0 = personas[0]
  const color0 = COLORS[0]

  const jsonb = isSingle ? p0.persona : undefined

  const content = {
    ability: isSingle ? (
      <div className="space-y-2.5">
        {ABILITY_KEYS.map((key) => (
          <StatRow key={key} label={STAT_LABELS[key]} value={(p0[key] as number) ?? 0} color={color0} reason={getReason(jsonb, key)} />
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {ABILITY_KEYS.map((key) => (
          <CompareStatRow key={key} label={STAT_LABELS[key]} personas={personas} statKey={key} />
        ))}
      </div>
    ),
    virtue: isSingle ? (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2.5">
          {INNER_VIRTUE_KEYS.map((key) => (
            <StatRow key={key} label={STAT_LABELS[key]} value={(p0[key] as number) ?? 0} color={color0} reason={getReason(jsonb, key)} />
          ))}
        </div>
        <div className="space-y-2.5">
          {OUTER_VIRTUE_KEYS.map((key) => (
            <StatRow key={key} label={STAT_LABELS[key]} value={(p0[key] as number) ?? 0} color={color0} reason={getReason(jsonb, key)} />
          ))}
        </div>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-base text-text-tertiary uppercase tracking-wider">내적 덕목</p>
          {INNER_VIRTUE_KEYS.map((key) => (
            <CompareStatRow key={key} label={STAT_LABELS[key]} personas={personas} statKey={key} />
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-base text-text-tertiary uppercase tracking-wider">외적 덕목</p>
          {OUTER_VIRTUE_KEYS.map((key) => (
            <CompareStatRow key={key} label={STAT_LABELS[key]} personas={personas} statKey={key} />
          ))}
        </div>
      </div>
    ),
    tendency: isSingle ? (
      <div className="space-y-4">
        {TENDENCY_KEYS.map((key) => (
          <TendencyRow key={key} labels={TENDENCY_LABELS[key]} value={(p0[key] as number) ?? 0} color={color0} reason={getReason(jsonb, key)} />
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        {TENDENCY_KEYS.map((key) => (
          <CompareTendencyRow key={key} labels={TENDENCY_LABELS[key]} personas={personas} statKey={key} />
        ))}
      </div>
    ),
  }

  return (
    <div className="rounded border border-white/20 bg-black/25">
      {/* 범례 (비교 모드) */}
      {showLegend && !isSingle && (
        <div className="flex flex-wrap gap-3 px-3 pt-3 justify-center">
          {personas.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-base text-text-primary">{p.nickname}</span>
            </div>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="flex border-b border-white/10 bg-black/20 px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t px-3 py-1.5 text-base font-semibold transition-colors ${
              tab === t.key
                ? 'border border-b-0 border-white/20 bg-bg-card text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className={compact ? 'p-3' : 'p-3 sm:p-4'}>
        {content[tab]}
      </div>

      {/* Rationale */}
      {isSingle && jsonb?.rationale_ko && (
        <div className="px-3 pb-3 border-t border-white/10">
          <p className="pt-3 text-base text-text-secondary leading-relaxed">{jsonb.rationale_ko}</p>
        </div>
      )}
    </div>
  )
}
