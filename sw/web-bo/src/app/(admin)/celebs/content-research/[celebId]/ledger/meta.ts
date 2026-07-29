import { BookOpen, Film, Gamepad2, Music } from 'lucide-react'
import type {
  ContentResearchFindingDecision,
  ContentResearchSourceKind,
} from '@/actions/admin/content-research-types'

export const TYPE_META = {
  BOOK: {
    label: '도서',
    icon: BookOpen,
    border: 'border-l-amber-400',
    text: 'text-amber-200',
  },
  VIDEO: {
    label: '영상',
    icon: Film,
    border: 'border-l-rose-400',
    text: 'text-rose-200',
  },
  GAME: {
    label: '게임',
    icon: Gamepad2,
    border: 'border-l-cyan-400',
    text: 'text-cyan-200',
  },
  MUSIC: {
    label: '음악',
    icon: Music,
    border: 'border-l-violet-400',
    text: 'text-violet-200',
  },
} as const

export const SOURCE_KIND_OPTIONS: Array<{
  value: ContentResearchSourceKind
  label: string
}> = [
  { value: 'direct_statement', label: '본인 직접 발언' },
  { value: 'interview', label: '인터뷰' },
  { value: 'official_profile', label: '공식 프로필' },
  { value: 'social_post', label: '본인 SNS·게시물' },
  { value: 'transcript', label: '발화록·자막' },
  { value: 'archive', label: '아카이브·사료' },
  { value: 'article', label: '기사' },
  { value: 'other', label: '기타' },
]

export const DECISION_META: Record<
  ContentResearchFindingDecision,
  { label: string; className: string }
> = {
  candidate: {
    label: '검토 중',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  accepted: {
    label: '채택',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  rejected: {
    label: '기각',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
}
