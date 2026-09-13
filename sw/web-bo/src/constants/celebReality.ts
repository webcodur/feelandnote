import type { CelebReality } from '@feelandnote/shared/constants/celeb-tiers'

export const CELEB_REALITY_DISPLAY = {
  REAL: {
    label: '사실',
    description: '실존 인물',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  BOTH: {
    label: '혼합',
    description: '사실과 가상에 모두 해당하는 인물',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  FICTION: {
    label: '가상',
    description: '신화·전설·소설 등 이야기 속 인물로 분류',
    className: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  },
} satisfies Record<CelebReality, { label: string; description: string; className: string }>
