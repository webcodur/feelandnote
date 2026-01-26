// 영향력 UI 상수 - lucide-react 의존

import { Crown, Lightbulb, Cpu, Users, Coins, Palette, Clock, type LucideIcon } from 'lucide-react'
import {
  INFLUENCE_CATEGORY_FIELDS,
  INFLUENCE_LABELS,
  INFLUENCE_RANK_LABELS,
  INFLUENCE_RANK_RANGES,
  type InfluenceCategoryField,
  type InfluenceField,
  type InfluenceRank,
} from './core'

// #region 영역별 아이콘
export const INFLUENCE_ICONS: Record<InfluenceField, LucideIcon> = {
  political: Crown,
  strategic: Lightbulb,
  tech: Cpu,
  social: Users,
  economic: Coins,
  cultural: Palette,
  transhistoricity: Clock,
}
// #endregion

// #region 영역별 UI 설정 (레이더 차트용)
export interface InfluenceCategoryConfig {
  key: InfluenceCategoryField
  label: string
  icon: LucideIcon
  angle: number
}

export const INFLUENCE_CATEGORIES: InfluenceCategoryConfig[] = INFLUENCE_CATEGORY_FIELDS.map((key, index) => ({
  key,
  label: INFLUENCE_LABELS[key],
  icon: INFLUENCE_ICONS[key],
  angle: index * 60,
}))
// #endregion

// #region 랭크별 스타일 설정
export interface RankStyleConfig {
  label: string
  threshold: string
  color: string
  borderColor: string
  textColor: string
  bgColor: string
  badgeBg: string
  glow: string
}

export const RANK_STYLES: Record<InfluenceRank, RankStyleConfig> = {
  S: {
    label: INFLUENCE_RANK_LABELS.S,
    threshold: INFLUENCE_RANK_RANGES.S,
    color: 'from-[#004e92] via-[#002f6c] to-[#020024]',
    borderColor: 'border-blue-400/50',
    textColor: 'text-blue-100',
    bgColor: 'bg-blue-500/20',
    badgeBg: 'bg-blue-600',
    glow: 'shadow-[0_0_20px_rgba(0,122,255,0.4)]',
  },
  A: {
    label: INFLUENCE_RANK_LABELS.A,
    threshold: INFLUENCE_RANK_RANGES.A,
    color: 'from-[#8A6D07] via-[#D4AF37] to-[#8A6D07]',
    borderColor: 'border-[#FFEBAD]/60',
    textColor: 'text-[#1a1400]',
    bgColor: 'bg-amber-500/20',
    badgeBg: 'bg-amber-500',
    glow: 'shadow-[0_0_15px_rgba(212,175,55,0.3)]',
  },
  B: {
    label: INFLUENCE_RANK_LABELS.B,
    threshold: INFLUENCE_RANK_RANGES.B,
    color: 'from-[#707070] via-[#9a9a9a] to-[#707070]',
    borderColor: 'border-white/40',
    textColor: 'text-[#1a1a1a]',
    bgColor: 'bg-slate-400/20',
    badgeBg: 'bg-slate-400',
    glow: 'shadow-[0_0_10px_rgba(192,192,192,0.2)]',
  },
  C: {
    label: INFLUENCE_RANK_LABELS.C,
    threshold: INFLUENCE_RANK_RANGES.C,
    color: 'from-[#663300] via-[#CD7F32] to-[#663300]',
    borderColor: 'border-amber-600/50',
    textColor: 'text-[#fff8f0]',
    bgColor: 'bg-orange-500/20',
    badgeBg: 'bg-orange-600',
    glow: '',
  },
  D: {
    label: INFLUENCE_RANK_LABELS.D,
    threshold: INFLUENCE_RANK_RANGES.D,
    color: 'from-[#475569] via-[#1E293B] to-[#0F172A]',
    borderColor: 'border-slate-500/30',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-600/20',
    badgeBg: 'bg-slate-600',
    glow: '',
  },
}

// 모달용 대체 스타일 (골드 기반)
export const RANK_STYLES_MODAL: Record<InfluenceRank, { bg: string; text: string; border: string; glow: string }> = {
  S: { bg: 'bg-gradient-to-br from-[#ffd700] via-[#d4af37] to-[#8a732a]', text: 'text-[#1a1200]', border: 'border-[#ffd700]', glow: 'shadow-[0_0_20px_rgba(212,175,55,0.5)]' },
  A: { bg: 'bg-gradient-to-br from-[#e8e8e8] via-[#c0c0c0] to-[#808080]', text: 'text-[#1a1a1a]', border: 'border-[#e0e0e0]', glow: 'shadow-[0_0_15px_rgba(192,192,192,0.4)]' },
  B: { bg: 'bg-gradient-to-br from-[#e6a55a] via-[#cd7f32] to-[#8b5a2b]', text: 'text-[#1a1000]', border: 'border-[#cd7f32]', glow: 'shadow-[0_0_15px_rgba(205,127,50,0.4)]' },
  C: { bg: 'bg-gradient-to-br from-[#4a4a52] via-[#3a3a42] to-[#2a2a2f]', text: 'text-text-primary', border: 'border-[#4a4a52]', glow: '' },
  D: { bg: 'bg-gradient-to-br from-[#2a2a2f] via-[#1f1f24] to-[#151518]', text: 'text-text-secondary', border: 'border-[#333]', glow: '' },
}
// #endregion
