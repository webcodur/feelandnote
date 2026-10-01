/*
  파일명: lib/game/wander/region.ts
  기능: 유랑 게임의 국적 → 지역 판정
  책임: 유랑이 인물을 지역별로 고르게 뽑을 때 쓰는 10지역 표를 유랑 쪽에서 직접 쥔다.
        (26.09.28 천도 전면 개편 때 천도 엔진에서 떼어 옮겼다. 값은 옮기기 전과 같다)
*/

type WanderRegion =
  | 'east_asia' | 'southeast_asia' | 'south_asia' | 'central_asia' | 'middle_east'
  | 'east_europe' | 'west_europe' | 'africa' | 'americas' | 'oceania'

const NATIONALITY_TO_REGION: Record<string, WanderRegion> = {
  CN: 'east_asia', KR: 'east_asia', JP: 'east_asia', MN: 'east_asia',
  VN: 'southeast_asia', TH: 'southeast_asia', KH: 'southeast_asia', MM: 'southeast_asia', PH: 'southeast_asia', ID: 'southeast_asia', MY: 'southeast_asia', SG: 'southeast_asia',
  IN: 'south_asia', BD: 'south_asia', LK: 'south_asia', NP: 'south_asia', PK: 'south_asia',
  KZ: 'central_asia', UZ: 'central_asia', TM: 'central_asia', KG: 'central_asia', TJ: 'central_asia', AF: 'central_asia',
  RU: 'central_asia', UA: 'central_asia', PL: 'central_asia', BY: 'central_asia', RO: 'central_asia', HU: 'central_asia',
  IR: 'middle_east', IQ: 'middle_east', SA: 'middle_east', TR: 'middle_east', EG: 'middle_east', IL: 'middle_east', SY: 'middle_east', LB: 'middle_east', AE: 'middle_east',
  GR: 'east_europe', BG: 'east_europe', RS: 'east_europe', HR: 'east_europe', CZ: 'east_europe', SK: 'east_europe', AT: 'east_europe', SI: 'east_europe',
  IT: 'west_europe', FR: 'west_europe', GB: 'west_europe', DE: 'west_europe', ES: 'west_europe', PT: 'west_europe', NL: 'west_europe', BE: 'west_europe', CH: 'west_europe', IE: 'west_europe', SE: 'west_europe', NO: 'west_europe', DK: 'west_europe', FI: 'west_europe',
  DZ: 'africa', TN: 'africa', MA: 'africa', NG: 'africa', KE: 'africa', ET: 'africa', ZA: 'africa', GH: 'africa',
  US: 'americas', CA: 'americas', MX: 'americas', BR: 'americas', AR: 'americas', CL: 'americas', CO: 'americas', PE: 'americas', VE: 'americas',
  AU: 'oceania', NZ: 'oceania', PG: 'oceania',
}

export function getRegionForNationality(nat: string): WanderRegion {
  return NATIONALITY_TO_REGION[nat] ?? 'west_europe'
}
