import {
  Crown,
  Scale,
  Shield,
  Briefcase,
  TrendingUp,
  GraduationCap,
  Palette,
  PenTool,
  Drama,
  Megaphone,
  Trophy,
  Users,
} from 'lucide-react'

export const CELEB_PROFESSIONS = [
  { value: 'leader', label: '지도자', icon: Crown },
  { value: 'politician', label: '정치인', icon: Scale },
  { value: 'commander', label: '지휘관', icon: Shield },
  { value: 'entrepreneur', label: '기업가', icon: Briefcase },
  { value: 'investor', label: '투자자', icon: TrendingUp },
  { value: 'scholar', label: '학자', icon: GraduationCap },
  { value: 'artist', label: '예술인', icon: Palette },
  { value: 'author', label: '작가', icon: PenTool },
  { value: 'actor', label: '배우', icon: Drama },
  { value: 'influencer', label: '인플루엔서', icon: Megaphone },
  { value: 'athlete', label: '스포츠인', icon: Trophy },
] as const

// 필터용 (전체 포함)
export const CELEB_PROFESSION_FILTERS = [
  { value: 'all', label: '전체', icon: Users },
  ...CELEB_PROFESSIONS,
] as const

export type CelebProfession = (typeof CELEB_PROFESSIONS)[number]['value']

export const getCelebProfessionLabel = (value: string | null): string => {
  if (!value) return ''
  const profession = CELEB_PROFESSIONS.find((p) => p.value === value)
  return profession?.label ?? value
}
