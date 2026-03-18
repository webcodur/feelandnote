import * as d3 from 'd3'
import type { TerritoryId, RegionId } from '@/lib/game/suikoden/types'
import { TERRITORIES, REGIONS } from '@/lib/game/suikoden/constants'

// ── 국가 ID -> 게임 RegionId 매핑 ──

export const COUNTRY_TO_REGION: Record<string, RegionId> = {
  // 동아시아
  '156': 'east_asia', '392': 'east_asia', '410': 'east_asia',
  '408': 'east_asia', '496': 'east_asia', '158': 'east_asia',
  // 동남아시아
  '704': 'southeast_asia', '764': 'southeast_asia', '116': 'southeast_asia',
  '104': 'southeast_asia', '608': 'southeast_asia', '360': 'southeast_asia',
  '458': 'southeast_asia', '702': 'southeast_asia', '418': 'southeast_asia',
  '096': 'southeast_asia', '626': 'southeast_asia',
  // 남아시아
  '356': 'south_asia', '050': 'south_asia', '144': 'south_asia',
  '524': 'south_asia', '586': 'south_asia', '064': 'south_asia',
  // 중앙아시아
  '398': 'central_asia', '860': 'central_asia', '795': 'central_asia',
  '417': 'central_asia', '762': 'central_asia', '004': 'central_asia',
  '643': 'central_asia', '804': 'central_asia', '616': 'central_asia',
  '112': 'central_asia', '642': 'central_asia', '348': 'central_asia',
  '268': 'central_asia', '051': 'central_asia', '031': 'central_asia',
  // 중동
  '364': 'middle_east', '368': 'middle_east', '682': 'middle_east',
  '792': 'middle_east', '818': 'middle_east', '376': 'middle_east',
  '760': 'middle_east', '422': 'middle_east', '784': 'middle_east',
  '400': 'middle_east', '512': 'middle_east', '887': 'middle_east',
  '196': 'middle_east', '414': 'middle_east', '048': 'middle_east',
  '634': 'middle_east', '275': 'middle_east',
  // 동유럽
  '300': 'east_europe', '100': 'east_europe', '688': 'east_europe',
  '191': 'east_europe', '203': 'east_europe', '703': 'east_europe',
  '040': 'east_europe', '705': 'east_europe', '070': 'east_europe',
  '807': 'east_europe', '008': 'east_europe', '499': 'east_europe',
  // 서유럽
  '380': 'west_europe', '250': 'west_europe', '826': 'west_europe',
  '276': 'west_europe', '724': 'west_europe', '620': 'west_europe',
  '528': 'west_europe', '056': 'west_europe', '756': 'west_europe',
  '372': 'west_europe', '442': 'west_europe', '752': 'west_europe',
  '578': 'west_europe', '208': 'west_europe', '246': 'west_europe',
  '440': 'west_europe', '428': 'west_europe', '233': 'west_europe',
  '498': 'west_europe', '352': 'west_europe',
  '304': 'west_europe',
  // 아프리카
  '012': 'africa', '788': 'africa', '504': 'africa', '434': 'africa',
  '566': 'africa', '404': 'africa', '231': 'africa', '710': 'africa',
  '288': 'africa', '180': 'africa', '800': 'africa', '834': 'africa',
  '508': 'africa', '024': 'africa', '120': 'africa', '384': 'africa',
  '854': 'africa', '562': 'africa', '466': 'africa', '694': 'africa',
  '736': 'africa', '728': 'africa', '646': 'africa', '148': 'africa',
  '516': 'africa', '072': 'africa', '426': 'africa', '748': 'africa',
  '174': 'africa', '262': 'africa', '232': 'africa', '226': 'africa',
  '678': 'africa', '768': 'africa', '204': 'africa', '324': 'africa',
  '270': 'africa', '624': 'africa',
  '108': 'africa', '140': 'africa', '178': 'africa', '266': 'africa',
  '430': 'africa', '450': 'africa', '454': 'africa', '478': 'africa',
  '686': 'africa', '706': 'africa', '716': 'africa', '894': 'africa',
  '729': 'africa', '132': 'africa', '480': 'africa',
  '732': 'africa',
  // 아메리카
  '840': 'americas', '124': 'americas', '484': 'americas',
  '076': 'americas', '032': 'americas', '152': 'americas',
  '170': 'americas', '604': 'americas', '862': 'americas',
  '218': 'americas', '068': 'americas', '600': 'americas',
  '858': 'americas', '328': 'americas', '740': 'americas',
  '192': 'americas', '332': 'americas', '214': 'americas',
  '388': 'americas', '780': 'americas', '591': 'americas',
  '188': 'americas', '340': 'americas', '320': 'americas',
  '558': 'americas', '222': 'americas',
  '044': 'americas', '052': 'americas', '084': 'americas',
  '474': 'americas', '630': 'americas', '660': 'americas',
  '238': 'americas',
  // 오세아니아
  '036': 'oceania', '554': 'oceania', '598': 'oceania',
  '242': 'oceania', '090': 'oceania', '548': 'oceania',
  '776': 'oceania', '882': 'oceania', '584': 'oceania',
  '540': 'oceania',
  // 특수
  '260': 'africa', '010': 'oceania',
}

// Region 색상 (반투명 fill)
export const REGION_FILL: Record<RegionId, string> = {
  east_asia:      'rgba(239,68,68,0.15)',
  southeast_asia: 'rgba(249,115,22,0.15)',
  south_asia:     'rgba(234,179,8,0.15)',
  central_asia:   'rgba(132,204,22,0.15)',
  middle_east:    'rgba(34,197,94,0.15)',
  east_europe:    'rgba(6,182,212,0.15)',
  west_europe:    'rgba(59,130,246,0.15)',
  africa:         'rgba(139,92,246,0.15)',
  americas:       'rgba(236,72,153,0.15)',
  oceania:        'rgba(245,158,11,0.15)',
}

/** hex 색상을 밝게 보정 (hover용) */
export function lightenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + Math.round(255 * amount))
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + Math.round(255 * amount))
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + Math.round(255 * amount))
  return `rgb(${r},${g},${b})`
}

export const OCEAN_COLOR = '#0c0a09'
export const LAND_DEFAULT = 'rgba(41,37,36,0.6)'
export const BORDER_COLOR = 'rgba(120,113,108,0.3)'
export const DOT_NEUTRAL = '#57534e'
export const GLOW_COLOR = '#fbbf24'

// 거점/대륙 룩업 맵 (한 번만 계산)
export const TERRITORY_MAP = new Map(TERRITORIES.map(t => [t.id, t]))
export const REGION_MAP = new Map(REGIONS.map(r => [r.id, r]))

// 인접 엣지 집합 (한 번만 계산)
export const EDGES: [TerritoryId, TerritoryId][] = []
const _seen = new Set<string>()
for (const t of TERRITORIES) {
  for (const n of t.neighbors) {
    const key = t.id < n ? `${t.id}-${n}` : `${n}-${t.id}`
    if (!_seen.has(key)) { _seen.add(key); EDGES.push([t.id, n as TerritoryId]) }
  }
}

/** 좌표가 현재 가시 반구(앞면)에 있는지 판별 */
export function isPointVisible(latlng: [number, number], rotation: [number, number]): boolean {
  const [lat, lng] = latlng
  const centerLng = -rotation[0]
  const centerLat = -rotation[1]
  const dist = d3.geoDistance(
    [lng, lat],
    [centerLng, centerLat]
  )
  return dist < Math.PI / 2
}
