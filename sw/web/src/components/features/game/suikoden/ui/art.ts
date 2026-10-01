// 천도 v2 — 영토 그림. 그 도시 그림이 있으면 그것, 없으면 그 지역 그림을 쓴다.
// 원화는 public/images/game/suikoden/{territories,regions}/*.png(640²)이고, 게임은 거기서 줄여 만든 webp만 읽는다.
//   banners/ — 영토 창 머리(800×320)
//   scenes/  — 합전 배경(512², 흐리고 어둡게 깐다)
// 게임 속 도시가 아닌 원화(바그다드·콜카타·나이로비·평양)는 쓰지 않는다.

import { TERRITORY_BY_ID, type RegionId, type TerritoryId } from '@/lib/game/suikoden/map'

const BASE = '/images/game/suikoden'

const CITY_ART: Partial<Record<TerritoryId, string>> = {
  angkor: 'angkor', beijing: 'beijing', berlin: 'berlin', cairo: 'cairo', carthage: 'carthage', constantinople: 'constantinople',
  delhi: 'delhi', hanoi: 'hanoi', london: 'london', moscow: 'moscow', nanjing: 'nanjing', paris: 'paris', rome: 'rome',
  samarkand: 'samarkand', timbuktu: 'timbuktu', kyiv: 'region-east_europe',
}

const REGION_ART: Partial<Record<RegionId, string>> = {
  east_asia: 'region-east_asia', southeast_asia: 'region-southeast_asia', south_asia: 'region-south_asia', steppe: 'region-central_asia',
  west_asia: 'region-middle_east', europe: 'region-west_europe', africa: 'region-africa',
}

export function territoryArt(id: TerritoryId, kind: 'banner' | 'scene'): string | null {
  const name = CITY_ART[id] ?? REGION_ART[TERRITORY_BY_ID[id].region]
  return name ? `${BASE}/${kind === 'banner' ? 'banners' : 'scenes'}/${name}.webp` : null
}
