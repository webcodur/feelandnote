import { isCelebFamilyRelation, type CelebRelationInputType } from '@feelandnote/shared/constants/celeb-relations'

/** 명시 속성만 수집한다. 모호한 친척(P1038)·같은 소속은 수집하지 않는다. */
export const WIKIDATA_RELATION_PROPS: Readonly<Record<string, CelebRelationInputType>> = {
  P22: 'father', P25: 'mother', P40: 'child', P26: 'spouse', P451: 'partner', P3373: 'sibling',
  P1066: 'influence', P802: 'influenced', P184: 'influence', P185: 'influenced',
  P737: 'influence', P941: 'influence', P7047: 'rival',
}

/** 명단 밖 자동 확장은 가족만 허용한다. 중복 신원 QID는 외부로 우회하지 않는다. */
export function canCollectExternalRelation(type: CelebRelationInputType, targetRegistered: boolean): boolean {
  return isCelebFamilyRelation(type) && !targetRegistered
}
