// 천도 v2 — 천하 지도: 영토 46곳, 지역 10곳, 길(육로·해로), 국적 → 고향 영토
// 좌표는 실제 도시 위경도. 시대가 섞인 세계라 옛 이름과 지금 이름이 함께 선다.

export const TERRITORY_IDS = [
  'hanseong', 'seorabeol', 'beijing', 'changan', 'nanjing', 'guangzhou', 'kyoto', 'edo', 'karakorum',
  'hanoi', 'angkor', 'malacca',
  'delhi', 'pataliputra', 'mumbai',
  'samarkand', 'moscow', 'kyiv',
  'babylon', 'persepolis', 'jerusalem', 'mecca', 'constantinople',
  'athens', 'rome', 'paris', 'london', 'berlin', 'vienna', 'madrid', 'uppsala',
  'cairo', 'carthage', 'timbuktu', 'lagos', 'aksum', 'zanzibar', 'zimbabwe',
  'new_york', 'chicago', 'los_angeles', 'vancouver',
  'tenochtitlan', 'cusco', 'rio',
  'sydney',
] as const

export type TerritoryId = (typeof TERRITORY_IDS)[number]

export type RegionId =
  | 'east_asia' | 'southeast_asia' | 'south_asia' | 'steppe' | 'west_asia'
  | 'europe' | 'africa' | 'north_america' | 'latin_america' | 'oceania'

type TerritorySize = 'l' | 'm' | 's'
type TerritoryTag = 'trade' | 'fertile' | 'fortress'

export interface TerritoryDef {
  id: TerritoryId
  ko: string
  en: string
  region: RegionId
  lat: number
  lng: number
  size: TerritorySize
  tags: TerritoryTag[]
}

export const TERRITORIES: TerritoryDef[] = [
  // 동아시아
  { id: 'hanseong', ko: '한성', en: 'Hanseong', region: 'east_asia', lat: 37.57, lng: 126.98, size: 'm', tags: ['fortress'] },
  { id: 'seorabeol', ko: '서라벌', en: 'Seorabeol', region: 'east_asia', lat: 35.84, lng: 129.21, size: 'm', tags: ['fertile'] },
  { id: 'beijing', ko: '베이징', en: 'Beijing', region: 'east_asia', lat: 39.9, lng: 116.4, size: 'l', tags: ['fortress'] },
  { id: 'changan', ko: '장안', en: "Chang'an", region: 'east_asia', lat: 34.27, lng: 108.95, size: 'l', tags: ['fortress'] },
  { id: 'nanjing', ko: '난징', en: 'Nanjing', region: 'east_asia', lat: 32.06, lng: 118.8, size: 'l', tags: ['fertile'] },
  { id: 'guangzhou', ko: '광저우', en: 'Guangzhou', region: 'east_asia', lat: 23.13, lng: 113.26, size: 'm', tags: ['trade'] },
  { id: 'kyoto', ko: '교토', en: 'Kyoto', region: 'east_asia', lat: 35.01, lng: 135.77, size: 'm', tags: [] },
  { id: 'edo', ko: '에도', en: 'Edo', region: 'east_asia', lat: 35.68, lng: 139.69, size: 'l', tags: ['fortress'] },
  { id: 'karakorum', ko: '카라코룸', en: 'Karakorum', region: 'east_asia', lat: 47.2, lng: 102.8, size: 's', tags: [] },
  // 동남아시아
  { id: 'hanoi', ko: '하노이', en: 'Hanoi', region: 'southeast_asia', lat: 21.03, lng: 105.85, size: 'm', tags: ['fertile'] },
  { id: 'angkor', ko: '앙코르', en: 'Angkor', region: 'southeast_asia', lat: 13.41, lng: 103.87, size: 'm', tags: ['fertile'] },
  { id: 'malacca', ko: '믈라카', en: 'Malacca', region: 'southeast_asia', lat: 2.19, lng: 102.25, size: 's', tags: ['trade'] },
  // 남아시아
  { id: 'delhi', ko: '델리', en: 'Delhi', region: 'south_asia', lat: 28.61, lng: 77.21, size: 'l', tags: ['fortress'] },
  { id: 'pataliputra', ko: '파탈리푸트라', en: 'Pataliputra', region: 'south_asia', lat: 25.59, lng: 85.14, size: 'm', tags: ['fertile'] },
  { id: 'mumbai', ko: '뭄바이', en: 'Mumbai', region: 'south_asia', lat: 19.08, lng: 72.88, size: 'm', tags: ['trade'] },
  // 중앙아시아·러시아
  { id: 'samarkand', ko: '사마르칸트', en: 'Samarkand', region: 'steppe', lat: 39.65, lng: 66.96, size: 'm', tags: ['trade'] },
  { id: 'moscow', ko: '모스크바', en: 'Moscow', region: 'steppe', lat: 55.76, lng: 37.62, size: 'm', tags: ['fortress'] },
  { id: 'kyiv', ko: '키이우', en: 'Kyiv', region: 'steppe', lat: 50.45, lng: 30.52, size: 's', tags: ['fertile'] },
  // 서아시아
  { id: 'babylon', ko: '바빌론', en: 'Babylon', region: 'west_asia', lat: 32.54, lng: 44.42, size: 'l', tags: ['fertile'] },
  { id: 'persepolis', ko: '페르세폴리스', en: 'Persepolis', region: 'west_asia', lat: 29.93, lng: 52.89, size: 'm', tags: [] },
  { id: 'jerusalem', ko: '예루살렘', en: 'Jerusalem', region: 'west_asia', lat: 31.77, lng: 35.21, size: 'm', tags: ['fortress'] },
  { id: 'mecca', ko: '메카', en: 'Mecca', region: 'west_asia', lat: 21.39, lng: 39.86, size: 's', tags: ['trade'] },
  { id: 'constantinople', ko: '콘스탄티노플', en: 'Constantinople', region: 'west_asia', lat: 41.01, lng: 28.98, size: 'l', tags: ['trade', 'fortress'] },
  // 유럽
  { id: 'athens', ko: '아테네', en: 'Athens', region: 'europe', lat: 37.98, lng: 23.73, size: 'm', tags: [] },
  { id: 'rome', ko: '로마', en: 'Rome', region: 'europe', lat: 41.9, lng: 12.5, size: 'l', tags: ['fortress'] },
  { id: 'paris', ko: '파리', en: 'Paris', region: 'europe', lat: 48.86, lng: 2.35, size: 'l', tags: ['fertile'] },
  { id: 'london', ko: '런던', en: 'London', region: 'europe', lat: 51.51, lng: -0.13, size: 'l', tags: ['trade'] },
  { id: 'berlin', ko: '베를린', en: 'Berlin', region: 'europe', lat: 52.52, lng: 13.4, size: 'm', tags: [] },
  { id: 'vienna', ko: '빈', en: 'Vienna', region: 'europe', lat: 48.21, lng: 16.37, size: 'm', tags: ['fortress'] },
  { id: 'madrid', ko: '마드리드', en: 'Madrid', region: 'europe', lat: 40.42, lng: -3.7, size: 'm', tags: [] },
  { id: 'uppsala', ko: '웁살라', en: 'Uppsala', region: 'europe', lat: 59.86, lng: 17.64, size: 's', tags: [] },
  // 아프리카
  { id: 'cairo', ko: '카이로', en: 'Cairo', region: 'africa', lat: 30.04, lng: 31.24, size: 'l', tags: ['fertile'] },
  { id: 'carthage', ko: '카르타고', en: 'Carthage', region: 'africa', lat: 36.85, lng: 10.33, size: 'm', tags: ['trade'] },
  { id: 'timbuktu', ko: '팀북투', en: 'Timbuktu', region: 'africa', lat: 16.77, lng: -3.0, size: 's', tags: ['trade'] },
  { id: 'lagos', ko: '라고스', en: 'Lagos', region: 'africa', lat: 6.52, lng: 3.38, size: 's', tags: [] },
  { id: 'aksum', ko: '악숨', en: 'Aksum', region: 'africa', lat: 14.13, lng: 38.72, size: 's', tags: [] },
  { id: 'zanzibar', ko: '잔지바르', en: 'Zanzibar', region: 'africa', lat: -6.16, lng: 39.2, size: 's', tags: ['trade'] },
  { id: 'zimbabwe', ko: '그레이트짐바브웨', en: 'Great Zimbabwe', region: 'africa', lat: -20.27, lng: 30.93, size: 's', tags: ['fortress'] },
  // 북아메리카
  { id: 'new_york', ko: '뉴욕', en: 'New York', region: 'north_america', lat: 40.71, lng: -74.0, size: 'l', tags: ['trade'] },
  { id: 'chicago', ko: '시카고', en: 'Chicago', region: 'north_america', lat: 41.88, lng: -87.63, size: 'm', tags: ['fertile'] },
  { id: 'los_angeles', ko: '로스앤젤레스', en: 'Los Angeles', region: 'north_america', lat: 34.05, lng: -118.24, size: 'm', tags: [] },
  { id: 'vancouver', ko: '밴쿠버', en: 'Vancouver', region: 'north_america', lat: 49.28, lng: -123.12, size: 's', tags: [] },
  // 라틴아메리카
  { id: 'tenochtitlan', ko: '테노치티틀란', en: 'Tenochtitlan', region: 'latin_america', lat: 19.43, lng: -99.13, size: 'm', tags: ['fortress'] },
  { id: 'cusco', ko: '쿠스코', en: 'Cusco', region: 'latin_america', lat: -13.53, lng: -71.97, size: 's', tags: ['fortress'] },
  { id: 'rio', ko: '리우데자네이루', en: 'Rio de Janeiro', region: 'latin_america', lat: -22.91, lng: -43.17, size: 's', tags: ['trade'] },
  // 오세아니아
  { id: 'sydney', ko: '시드니', en: 'Sydney', region: 'oceania', lat: -33.87, lng: 151.21, size: 's', tags: [] },
]

export const REGIONS: Record<RegionId, { ko: string; en: string }> = {
  east_asia: { ko: '동아시아', en: 'East Asia' },
  southeast_asia: { ko: '동남아시아', en: 'Southeast Asia' },
  south_asia: { ko: '남아시아', en: 'South Asia' },
  steppe: { ko: '중앙아시아·러시아', en: 'Central Asia & Russia' },
  west_asia: { ko: '서아시아', en: 'West Asia' },
  europe: { ko: '유럽', en: 'Europe' },
  africa: { ko: '아프리카', en: 'Africa' },
  north_america: { ko: '북아메리카', en: 'North America' },
  latin_america: { ko: '라틴아메리카', en: 'Latin America' },
  oceania: { ko: '오세아니아', en: 'Oceania' },
}

/** 길 [a, b, 해로 여부]. 해로로 군을 움직이려면 출발지에 조선소가 있어야 한다 */
const ROUTE_LIST: [TerritoryId, TerritoryId, boolean][] = [
  // 동아시아
  ['hanseong', 'seorabeol', false], ['hanseong', 'beijing', false], ['hanseong', 'nanjing', true],
  ['seorabeol', 'kyoto', true], ['kyoto', 'edo', false], ['edo', 'vancouver', true],
  ['beijing', 'karakorum', false], ['beijing', 'changan', false], ['beijing', 'nanjing', false],
  ['changan', 'nanjing', false], ['changan', 'karakorum', false], ['changan', 'samarkand', false],
  ['nanjing', 'guangzhou', false], ['guangzhou', 'hanoi', false], ['guangzhou', 'malacca', true],
  ['karakorum', 'samarkand', false], ['karakorum', 'moscow', false],
  // 동남아시아
  ['hanoi', 'angkor', false], ['angkor', 'malacca', false], ['angkor', 'pataliputra', false],
  ['malacca', 'mumbai', true], ['malacca', 'sydney', true],
  // 남아시아
  ['delhi', 'pataliputra', false], ['delhi', 'mumbai', false], ['pataliputra', 'mumbai', false],
  ['delhi', 'samarkand', false], ['mumbai', 'persepolis', true], ['mumbai', 'mecca', true], ['mumbai', 'zanzibar', true],
  // 중앙아시아·러시아
  ['samarkand', 'persepolis', false], ['samarkand', 'moscow', false], ['moscow', 'kyiv', false],
  ['moscow', 'uppsala', false], ['kyiv', 'constantinople', false], ['kyiv', 'vienna', false], ['kyiv', 'berlin', false],
  // 서아시아
  ['persepolis', 'babylon', false], ['babylon', 'jerusalem', false], ['babylon', 'constantinople', false],
  ['babylon', 'mecca', false], ['jerusalem', 'cairo', false], ['jerusalem', 'constantinople', false],
  ['jerusalem', 'mecca', false], ['mecca', 'aksum', true], ['constantinople', 'athens', false], ['constantinople', 'vienna', false],
  // 유럽
  ['athens', 'rome', true], ['athens', 'cairo', true], ['rome', 'vienna', false], ['rome', 'paris', false],
  ['rome', 'carthage', true], ['paris', 'london', true], ['paris', 'berlin', false], ['paris', 'madrid', false],
  ['berlin', 'vienna', false], ['berlin', 'uppsala', true], ['london', 'uppsala', true], ['london', 'new_york', true],
  ['madrid', 'timbuktu', true],
  // 아프리카
  ['cairo', 'carthage', false], ['cairo', 'aksum', false], ['carthage', 'timbuktu', false], ['timbuktu', 'lagos', false],
  ['lagos', 'zimbabwe', false], ['aksum', 'zanzibar', false], ['zanzibar', 'zimbabwe', false], ['lagos', 'rio', true],
  // 아메리카
  ['new_york', 'chicago', false], ['chicago', 'los_angeles', false], ['chicago', 'vancouver', false],
  ['los_angeles', 'vancouver', false], ['los_angeles', 'tenochtitlan', false], ['chicago', 'tenochtitlan', false],
  ['tenochtitlan', 'cusco', false], ['cusco', 'rio', false], ['los_angeles', 'sydney', true],
]

export interface Route {
  a: TerritoryId
  b: TerritoryId
  sea: boolean
}

export const ROUTES: Route[] = ROUTE_LIST.map(([a, b, sea]) => ({ a, b, sea }))

export const TERRITORY_BY_ID: Record<TerritoryId, TerritoryDef> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
) as Record<TerritoryId, TerritoryDef>

const NEIGHBORS: Record<TerritoryId, { id: TerritoryId; sea: boolean }[]> = Object.fromEntries(
  TERRITORY_IDS.map((id) => [id, [] as { id: TerritoryId; sea: boolean }[]]),
) as Record<TerritoryId, { id: TerritoryId; sea: boolean }[]>
for (const r of ROUTES) {
  NEIGHBORS[r.a].push({ id: r.b, sea: r.sea })
  NEIGHBORS[r.b].push({ id: r.a, sea: r.sea })
}

export function neighborsOf(id: TerritoryId): { id: TerritoryId; sea: boolean }[] {
  return NEIGHBORS[id]
}

export function isAdjacent(a: TerritoryId, b: TerritoryId): boolean {
  return NEIGHBORS[a].some((n) => n.id === b)
}

export function isSeaRoute(a: TerritoryId, b: TerritoryId): boolean {
  return NEIGHBORS[a].some((n) => n.id === b && n.sea)
}

export function territoryName(id: TerritoryId, locale: 'ko' | 'en'): string {
  const t = TERRITORY_BY_ID[id]
  return locale === 'en' ? t.en : t.ko
}

export function isTerritoryId(value: string): value is TerritoryId {
  return (TERRITORY_IDS as readonly string[]).includes(value)
}

// ── 국적 → 고향 영토 ──

/** 영토가 하나뿐인 나라는 이 표로 바로 정한다. 여러 영토에 걸친 나라는 SPLIT이 가른다 */
const COUNTRY_HOME: Record<string, TerritoryId> = {
  KP: 'hanseong', HK: 'guangzhou', TW: 'guangzhou', MO: 'guangzhou', MN: 'karakorum',
  VN: 'hanoi', LA: 'hanoi', KH: 'angkor', TH: 'angkor', MM: 'angkor',
  MY: 'malacca', SG: 'malacca', ID: 'malacca', BN: 'malacca', PH: 'malacca', TL: 'malacca',
  PK: 'delhi', BD: 'pataliputra', NP: 'pataliputra', BT: 'pataliputra', LK: 'mumbai', MV: 'mumbai',
  UZ: 'samarkand', KZ: 'samarkand', KG: 'samarkand', TJ: 'samarkand', TM: 'samarkand', AF: 'samarkand', XX: 'samarkand',
  RU: 'moscow', SU: 'moscow', BY: 'kyiv', UA: 'kyiv', MD: 'kyiv',
  GE: 'constantinople', AM: 'constantinople', AZ: 'persepolis',
  IQ: 'babylon', KW: 'babylon', SY: 'jerusalem', LB: 'jerusalem', IL: 'jerusalem', PS: 'jerusalem', JO: 'jerusalem',
  IR: 'persepolis', SA: 'mecca', YE: 'mecca', OM: 'mecca', AE: 'mecca', QA: 'mecca', BH: 'mecca',
  TR: 'constantinople', CY: 'constantinople', BG: 'constantinople', RO: 'constantinople',
  GR: 'athens', AL: 'athens', MK: 'athens',
  RS: 'vienna', ME: 'vienna', BA: 'vienna', XK: 'vienna', HR: 'vienna', SI: 'vienna',
  IT: 'rome', MT: 'rome', SM: 'rome', VA: 'rome',
  FR: 'paris', BE: 'paris', LU: 'paris', MC: 'paris', CH: 'paris', NL: 'paris',
  GB: 'london', IE: 'london',
  IS: 'uppsala', GL: 'uppsala', FO: 'uppsala', SE: 'uppsala', NO: 'uppsala', DK: 'uppsala', FI: 'uppsala',
  EE: 'uppsala', LV: 'uppsala', LT: 'uppsala',
  DE: 'berlin', PL: 'berlin',
  CZ: 'vienna', SK: 'vienna', CS: 'vienna', AT: 'vienna', HU: 'vienna', LI: 'vienna',
  ES: 'madrid', PT: 'madrid', AD: 'madrid',
  EG: 'cairo', LY: 'carthage', TN: 'carthage', DZ: 'carthage', MA: 'carthage', EH: 'carthage',
  SD: 'aksum', SS: 'aksum', ET: 'aksum', ER: 'aksum', DJ: 'aksum', SO: 'aksum',
  ML: 'timbuktu', SN: 'timbuktu', GN: 'timbuktu', MR: 'timbuktu', NE: 'timbuktu', BF: 'timbuktu',
  GW: 'timbuktu', SL: 'timbuktu', LR: 'timbuktu', CI: 'timbuktu', GM: 'timbuktu', CV: 'timbuktu',
  NG: 'lagos', GH: 'lagos', BJ: 'lagos', TG: 'lagos', CM: 'lagos', GA: 'lagos', GQ: 'lagos',
  CF: 'lagos', TD: 'lagos', CG: 'lagos', CD: 'lagos',
  KE: 'zanzibar', UG: 'zanzibar', TZ: 'zanzibar', RW: 'zanzibar', BI: 'zanzibar', SC: 'zanzibar', KM: 'zanzibar',
  AO: 'zimbabwe', MG: 'zimbabwe', MU: 'zimbabwe', ZA: 'zimbabwe', ZW: 'zimbabwe', BW: 'zimbabwe', NA: 'zimbabwe',
  ZM: 'zimbabwe', MW: 'zimbabwe', MZ: 'zimbabwe', LS: 'zimbabwe', SZ: 'zimbabwe',
  CA: 'vancouver',
  MX: 'tenochtitlan', GT: 'tenochtitlan', BZ: 'tenochtitlan', HN: 'tenochtitlan', SV: 'tenochtitlan',
  NI: 'tenochtitlan', CR: 'tenochtitlan', PA: 'tenochtitlan', CU: 'tenochtitlan', JM: 'tenochtitlan',
  HT: 'tenochtitlan', DO: 'tenochtitlan', PR: 'tenochtitlan', BS: 'tenochtitlan', TT: 'tenochtitlan',
  BB: 'tenochtitlan', AG: 'tenochtitlan', KN: 'tenochtitlan', LC: 'tenochtitlan', VC: 'tenochtitlan',
  GD: 'tenochtitlan', DM: 'tenochtitlan', GP: 'tenochtitlan', MQ: 'tenochtitlan',
  CO: 'cusco', VE: 'cusco', EC: 'cusco', PE: 'cusco', BO: 'cusco', CL: 'cusco',
  GY: 'rio', SR: 'rio', GF: 'rio', BR: 'rio', AR: 'rio', UY: 'rio', PY: 'rio',
  AU: 'sydney', NZ: 'sydney', FJ: 'sydney', TO: 'sydney', WS: 'sydney', KI: 'sydney', MH: 'sydney',
  PG: 'sydney', SB: 'sydney', VU: 'sydney', FM: 'sydney', PW: 'sydney', NR: 'sydney', TV: 'sydney',
}

const ENTERTAINMENT = new Set(['actor', 'director', 'musician', 'influencer', 'athlete'])
const LETTERS = new Set(['author', 'humanities_scholar', 'visual_artist', 'scientist'])
const STATECRAFT = new Set(['politician', 'commander', 'leader', 'social_scientist', 'investor'])

/**
 * 영토가 여럿인 나라의 고향 가르기. 출생 연도(시대)와 직군으로 정한다 —
 * 같은 사람은 언제 계산해도 같은 영토로 간다.
 */
function splitHome(nat: string, prof: string, birth: number | null): TerritoryId | null {
  const year = birth ?? 1900
  switch (nat) {
    case 'KR':
      // 서라벌은 신라 이전 사람과 음악인의 땅, 한성은 그 밖의 모든 이
      if (year < 935 || prof === 'musician') return 'seorabeol'
      return 'hanseong'
    case 'CN':
      // 옛 장수·군주는 장안, 조정의 정치가는 베이징, 문사는 난징, 그 밖은 광저우
      if (prof === 'politician' || (year >= 907 && STATECRAFT.has(prof))) return 'beijing'
      if (year < 907 && (prof === 'commander' || prof === 'leader')) return 'changan'
      if (LETTERS.has(prof) || year < 907) return 'nanjing'
      return 'guangzhou'
    case 'JP':
      return year < 1868 ? 'kyoto' : 'edo'
    case 'IN':
      if (year < 1200) return 'pataliputra'
      if (ENTERTAINMENT.has(prof) || prof === 'entrepreneur' || prof === 'investor' || prof === 'visual_artist') return 'mumbai'
      return 'delhi'
    case 'US':
      if (ENTERTAINMENT.has(prof)) return 'los_angeles'
      if (prof === 'politician' || prof === 'commander' || prof === 'leader' || prof === 'scientist') return 'chicago'
      return 'new_york'
    default:
      return null
  }
}

export function homeTerritoryFor(nat: string, prof: string, birth: number | null): TerritoryId {
  return splitHome(nat, prof, birth) ?? COUNTRY_HOME[nat] ?? 'samarkand'
}

/** 국기 이모지. 지금 없는 나라(소련 등)와 알 수 없는 국적은 빈 문자열 */
export function flagEmoji(nat: string): string {
  if (!/^[A-Z]{2}$/.test(nat) || nat === 'XX' || nat === 'SU' || nat === 'CS') return ''
  const base = 0x1f1e6
  return String.fromCodePoint(base + nat.charCodeAt(0) - 65, base + nat.charCodeAt(1) - 65)
}
