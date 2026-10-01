/*
  천도 v2 — 인물 표시 조각: 초상, 등급·병과 표지, 능력 방사형, 능력 막대
*/
'use client'

import { UserRound } from 'lucide-react'

import { memo, useMemo, useState } from 'react'
import { celebAvatarMediumUrl, celebAvatarSmallUrl } from '@feelandnote/shared/constants/celeb-avatar-small'
import { cn } from '@/lib/utils'
import { CLASSES, GRADE_INFO } from '@/lib/game/suikoden/constants'
import type { AbilityKey, Grade, Hero, HeroClass } from '@/lib/game/suikoden/types'
import { useCheondo } from '../context'
import { INK } from './theme'

type Tier = 'small' | 'medium' | 'original'

function tierFor(px: number): Tier {
  const need = px * 2
  if (need <= 96) return 'small'
  if (need <= 384) return 'medium'
  return 'original'
}

function srcFor(url: string, tier: Tier): string {
  if (tier === 'small') return celebAvatarSmallUrl(url) ?? url
  if (tier === 'medium') return celebAvatarMediumUrl(url) ?? url
  return url
}

const NEXT_TIER: Record<Tier, Tier | null> = { small: 'medium', medium: 'original', original: null }

interface PortraitProps {
  hero: Pick<Hero, 'name' | 'avatar' | 'cls' | 'grade'> | null
  /** 표시 크기(px). fluid면 크기는 className이 정하고 이 값은 이미지 판 고르기에만 쓴다 */
  size: number
  fluid?: boolean
  className?: string
  /** 등급색 테두리 */
  ring?: boolean
  dim?: boolean
  rounded?: 'none' | 'sm' | 'full'
  priority?: boolean
}

/** 초상 — 표시 크기에 맞는 판을 고르고, 없으면 한 단계 큰 판, 그래도 없으면 병과 문장으로 */
export const Portrait = memo(function Portrait({ hero, size, fluid, className, ring, dim, rounded = 'sm', priority }: PortraitProps) {
  const [tier, setTier] = useState<Tier | 'emblem'>(() => (hero?.avatar ? tierFor(size) : 'emblem'))
  const [key, setKey] = useState(hero?.avatar ?? '')
  if ((hero?.avatar ?? '') !== key) {
    setKey(hero?.avatar ?? '')
    setTier(hero?.avatar ? tierFor(size) : 'emblem')
  }
  const radius = rounded === 'full' ? '9999px' : rounded === 'sm' ? '3px' : '0'
  const ringColor = hero && ring ? GRADE_INFO[hero.grade].color : 'transparent'
  const cls = hero ? CLASSES[hero.cls] : CLASSES.ranger
  return (
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden', className)}
      style={{
        width: fluid ? undefined : size, height: fluid ? undefined : size, borderRadius: radius,
        boxShadow: ring ? `0 0 0 2px ${ringColor}` : undefined,
        background: `linear-gradient(160deg, ${cls.color}33, #0c0d10 70%)`,
      }}
    >
      {tier !== 'emblem' && hero?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={srcFor(hero.avatar, tier)}
          alt={hero.name}
          width={size}
          height={size}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setTier(NEXT_TIER[tier] ?? 'emblem')}
          className="h-full w-full object-cover"
          style={{ filter: dim ? 'grayscale(1) brightness(0.55)' : undefined }}
        />
      ) : (
        <span className="grid h-full w-full place-items-center font-black" style={{ color: cls.color, fontSize: Math.max(10, size * 0.42) }}>
          <UserRound size={Math.max(16, size * 0.45)} aria-hidden />
        </span>
      )}
    </span>
  )
})

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  const color = GRADE_INFO[grade].color
  return (
    <span
      className={cn('inline-flex h-[18px] min-w-[24px] items-center justify-center rounded-[3px] px-1 text-[10px] font-black leading-none', className)}
      style={{ color: '#0b0b0b', background: color }}
    >
      {grade}
    </span>
  )
}

export function ClassBadge({ cls, label, className }: { cls: HeroClass; label?: string; className?: string }) {
  const { T } = useCheondo()
  const def = CLASSES[cls]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', className)} style={{ color: def.color }}>
      {label ?? T.classes[cls]}
    </span>
  )
}

const AXES: AbilityKey[] = ['command', 'martial', 'intellect', 'charm']

/** 능력 4축 방사형 */
export function AbilityRadar({ stats, labels, size = 160, color = INK.gold }: { stats: Record<AbilityKey, number>; labels: Record<AbilityKey, string>; size?: number; color?: string }) {
  // 세로는 위아래 이름표(두 줄)가, 가로는 좌우 이름표(영문은 길다)가 들어갈 만큼 비운다
  const padX = 34
  const width = size + padX * 2
  const c = size / 2
  const cx = c + padX
  const r = size * 0.3
  const points = useMemo(() => AXES.map((k, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / AXES.length
    const v = Math.max(0, Math.min(100, stats[k])) / 100
    return [cx + Math.cos(angle) * r * v, c + Math.sin(angle) * r * v] as const
  }), [stats, cx, c, r])
  return (
    <svg width={width} height={size} viewBox={`0 0 ${width} ${size}`} style={{ maxWidth: '100%', height: 'auto' }} role="img" aria-label={AXES.map((k) => `${labels[k]} ${stats[k]}`).join(', ')}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={AXES.map((_, i) => {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / AXES.length
            return `${cx + Math.cos(a) * r * f},${c + Math.sin(a) * r * f}`
          }).join(' ')}
          fill="none"
          stroke="rgba(236,230,214,0.1)"
        />
      ))}
      {AXES.map((k, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / AXES.length
        // 위·아래 축은 두 줄 이름표의 가운데를, 좌우 축은 한가운데를 축 끝에서 띄운다
        const vertical = i % 2 === 0
        const gap = vertical ? 20 : 30
        const lx = cx + Math.cos(a) * (r + gap)
        const ly = c + Math.sin(a) * (r + gap)
        return (
          <g key={k}>
            <line x1={cx} y1={c} x2={cx + Math.cos(a) * r} y2={c + Math.sin(a) * r} stroke="rgba(236,230,214,0.08)" />
            <text x={lx} y={ly - 7} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={INK.sub} fontWeight={700}>
              {labels[k]}
            </text>
            <text x={lx} y={ly + 7} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill={INK.text} fontWeight={800}>
              {stats[k]}
            </text>
          </g>
        )
      })}
      <polygon points={points.map((p) => p.join(',')).join(' ')} fill={`${color}33`} stroke={color} strokeWidth={1.5} />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={color} />)}
    </svg>
  )
}

/** 능력 막대 한 줄 */
export function StatRow({ label, value, max = 100, color = INK.gold, suffix, labelWidth = '2.5rem' }: { label: string; value: number; max?: number; color?: string; suffix?: string; labelWidth?: string }) {
  const rate = Math.max(0, Math.min(1, value / max))
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {/* 영문 덕목 이름(Benevolence 등)은 길어서 부르는 쪽이 폭을 넓힌다 — 줄마다 막대가 나란하도록 고정 폭 */}
      <span className="shrink-0 truncate whitespace-nowrap" style={{ color: INK.sub, width: labelWidth }}>{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden bg-white/[0.07]">
        <div className="absolute inset-y-0 left-0" style={{ width: `${rate * 100}%`, background: color }} />
      </div>
      <span className="w-9 shrink-0 text-right font-bold tabular-nums" style={{ color: INK.text }}>{value}{suffix}</span>
    </div>
  )
}

/** 성향 한 줄 — 가운데가 0 */
export function DispositionRow({ left, right, value, labelWidth = '3rem' }: { left: string; right: string; value: number; labelWidth?: string }) {
  const pos = ((Math.max(-50, Math.min(50, value)) + 50) / 100) * 100
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="shrink-0 whitespace-nowrap text-right" style={{ color: value < 0 ? INK.text : INK.mute, width: labelWidth }}>{left}</span>
      <div className="relative h-1.5 flex-1 bg-white/[0.07]">
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos}%`, background: INK.gold }} />
      </div>
      <span className="shrink-0 whitespace-nowrap" style={{ color: value > 0 ? INK.text : INK.mute, width: labelWidth }}>{right}</span>
    </div>
  )
}
