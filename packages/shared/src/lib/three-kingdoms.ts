/**
 * 삼국지 인물 그룹 — 단일원천(SSoT)
 *
 * 영상 시리즈 전반에서 "삼국지 인물 묶음" 여부를 판정하는 데이터. 시리즈와 직교한다.
 * 현재 실제 사용처는 book-recommend(서재 탐방) 뿐이다.
 * 추가·제거는 이 파일과 docs/project/remotion/three-kingdoms.md 동시에 갱신한다.
 *
 * 사용처:
 * - YouTube 메타 생성(buildTags / buildDescription): 멤버 슬러그면 #삼국지 / #ThreeKingdoms
 *   태그·해시태그 자동 부착.
 * - 클로드 스킬(/three-kingdoms): roster 조회·진행 상태 점검.
 *
 * 슬러그는 sw/remotion/public/episodes/<slug> 와 동일 표기 사용.
 */

export const THREE_KINGDOMS_MEMBERS = [
  'cai-wenji',
  'cao-cao',
  'cao-pi',
  'cao-zhi',
  'chen-shou',
  'deng-ai',
  'guan-yu',
  'ji-kang',
  'jiang-wei',
  'kong-rong',
  'liu-bei',
  'lu-meng',
  'lu-su',
  'lu-xun',
  'ruan-ji',
  'sima-yi',
  'sun-quan',
  'wang-bi',
  'xun-yu',
  'zhang-zhongjing',
  'zhou-yu',
  'zhuge-liang',
] as const

export type ThreeKingdomsMember = (typeof THREE_KINGDOMS_MEMBERS)[number]

/** 인물 슬러그가 삼국지 그룹에 속하는지 판정한다. */
export function isThreeKingdomsMember(slug: string | undefined | null): boolean {
  if (!slug) return false
  return (THREE_KINGDOMS_MEMBERS as readonly string[]).includes(slug)
}

/** 한국어·영문 그룹 라벨 — 태그·해시태그 일관성용. */
export const THREE_KINGDOMS_LABEL = {
  ko: '삼국지',
  en: 'ThreeKingdoms',
} as const
