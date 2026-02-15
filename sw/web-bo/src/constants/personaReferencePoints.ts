import type { StatKey, TendencyKey } from '@/actions/admin/persona'

export interface PersonaReferenceAnchor {
  score100: number
  nickname: string
}

export type PersonaReferenceAxis = StatKey | TendencyKey

// KOEI 삼국지 시리즈 기반 대표 수치. 축별 기준점으로 사용.

const MARTIAL_ANCHORS: PersonaReferenceAnchor[] = [
  { score100: 100, nickname: '여포' },
  { score100: 98, nickname: '관우' },
  { score100: 97, nickname: '장비' },
  { score100: 96, nickname: '조운' },
  { score100: 95, nickname: '마초' },
  { score100: 94, nickname: '허저' },
  { score100: 93, nickname: '전위' },
  { score100: 92, nickname: '황충' },
  { score100: 91, nickname: '손책' },
  { score100: 90, nickname: '태사자' },
  { score100: 88, nickname: '장료' },
  { score100: 87, nickname: '감녕' },
  { score100: 85, nickname: '장합' },
  { score100: 83, nickname: '위연' },
  { score100: 79, nickname: '조조' },
  { score100: 72, nickname: '주유' },
  { score100: 55, nickname: '제갈량' },
  { score100: 35, nickname: '순욱' },
]

const INTELLECT_ANCHORS: PersonaReferenceAnchor[] = [
  { score100: 100, nickname: '제갈량' },
  { score100: 98, nickname: '사마의' },
  { score100: 97, nickname: '가후' },
  { score100: 96, nickname: '방통' },
  { score100: 95, nickname: '주유' },
  { score100: 94, nickname: '순욱' },
  { score100: 93, nickname: '육손' },
  { score100: 92, nickname: '곽가' },
  { score100: 90, nickname: '서서' },
  { score100: 88, nickname: '노숙' },
  { score100: 86, nickname: '강유' },
  { score100: 80, nickname: '조조' },
  { score100: 75, nickname: '관우' },
  { score100: 62, nickname: '조운' },
  { score100: 45, nickname: '장비' },
  { score100: 25, nickname: '여포' },
]

const COMMAND_ANCHORS: PersonaReferenceAnchor[] = [
  { score100: 98, nickname: '조조' },
  { score100: 97, nickname: '사마의' },
  { score100: 96, nickname: '제갈량' },
  { score100: 95, nickname: '주유' },
  { score100: 94, nickname: '관우' },
  { score100: 93, nickname: '육손' },
  { score100: 92, nickname: '등애' },
  { score100: 91, nickname: '강유' },
  { score100: 90, nickname: '여몽' },
  { score100: 88, nickname: '조운' },
  { score100: 85, nickname: '장료' },
  { score100: 82, nickname: '장합' },
  { score100: 75, nickname: '장비' },
  { score100: 50, nickname: '여포' },
  { score100: 45, nickname: '순욱' },
]

const CHARISMA_ANCHORS: PersonaReferenceAnchor[] = [
  { score100: 98, nickname: '유비' },
  { score100: 96, nickname: '조조' },
  { score100: 93, nickname: '손권' },
  { score100: 92, nickname: '제갈량' },
  { score100: 90, nickname: '관우' },
  { score100: 88, nickname: '주유' },
  { score100: 85, nickname: '조운' },
  { score100: 82, nickname: '여몽' },
  { score100: 75, nickname: '장비' },
  { score100: 30, nickname: '여포' },
]

export const PERSONA_MANUAL_REFERENCE_ANCHORS: Partial<Record<PersonaReferenceAxis, PersonaReferenceAnchor[]>> = {
  martial: MARTIAL_ANCHORS,
  intellect: INTELLECT_ANCHORS,
  command: COMMAND_ANCHORS,
  charisma: CHARISMA_ANCHORS,
}
