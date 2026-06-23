/**
 * CategoryBadge — 카테고리별 악센트 컬러 + 아이콘 시스템
 *
 * 텍스트 라벨 없이 색상·아이콘으로 카테고리를 구분한다.
 * BOOK: 골드 (기본), VIDEO: 은청, GAME: 틸, MUSIC: 로즈
 */
import React from 'react'
import type { ContentCategory } from '../../types'

// ── 카테고리별 악센트 컬러 ──

export interface CategoryAccent {
  /** 주 악센트 */
  color: string
  /** 포스터 글로우 rgba */
  glow: string
  /** 희미한 라인/구분선 rgba */
  line: string
  /** 뱃지 보더 rgba */
  border: string
}

const ACCENTS: Record<ContentCategory, CategoryAccent> = {
  BOOK:  { color: '#c8a46e', glow: 'rgba(200,164,110,0.10)', line: 'rgba(200,164,110,0.3)', border: 'rgba(200,164,110,0.25)' },
  VIDEO: { color: '#7eaac4', glow: 'rgba(126,170,196,0.12)', line: 'rgba(126,170,196,0.3)', border: 'rgba(126,170,196,0.30)' },
  GAME:  { color: '#6eb8a0', glow: 'rgba(110,184,160,0.12)', line: 'rgba(110,184,160,0.3)', border: 'rgba(110,184,160,0.30)' },
  MUSIC: { color: '#b888ab', glow: 'rgba(184,136,171,0.12)', line: 'rgba(184,136,171,0.3)', border: 'rgba(184,136,171,0.30)' },
}

export function getCategoryAccent(category: ContentCategory): CategoryAccent {
  return ACCENTS[category]
}

// ── SVG 아이콘 ──

const BookIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const FilmIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
    <line x1="17" y1="17" x2="22" y2="17" />
  </svg>
)

const GameIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="15" y1="13" x2="15.01" y2="13" />
    <line x1="18" y1="11" x2="18.01" y2="11" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
)

const MusicIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

const ICON_MAP: Record<ContentCategory, React.FC<{ size: number }>> = {
  BOOK: BookIcon,
  VIDEO: FilmIcon,
  GAME: GameIcon,
  MUSIC: MusicIcon,
}

export function CategoryIcon({ category, size = 20 }: { category: ContentCategory; size?: number }) {
  const Icon = ICON_MAP[category]
  return <Icon size={size} />
}

// ── 포스터 우상단 뱃지 (히어로 전용, 아이콘만) ──

export const PosterCategoryBadge: React.FC<{ category: ContentCategory; size?: number }> = ({
  category,
  size = 44,
}) => {
  const accent = ACCENTS[category]
  const Icon = ICON_MAP[category]
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, zIndex: 2,
      width: size, height: size, borderRadius: size / 2,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      border: `1px solid ${accent.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: accent.color,
    }}>
      <Icon size={22} />
    </div>
  )
}

// ── 본문 메타 영역 카테고리 아이콘 (year/publisher 줄에 통합, 텍스트 없음) ──

export const MetaCategoryIcon: React.FC<{ category: ContentCategory }> = ({ category }) => {
  const accent = ACCENTS[category]
  const Icon = ICON_MAP[category]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      color: accent.color,
    }}>
      <Icon size={16} />
    </span>
  )
}
