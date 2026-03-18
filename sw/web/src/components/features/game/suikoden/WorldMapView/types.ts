import type * as d3 from 'd3'
import type { GameState, Faction, TerritoryId, RegionId } from '@/lib/game/suikoden/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TopoData = any

export interface Props {
  state: GameState
  viewingTerritoryId?: TerritoryId | null
  selectedTerritoryId?: TerritoryId | null
  onSelectTerritory: (id: TerritoryId) => void
  onSelectRegion?: (id: RegionId) => void
  phase: 'wandering' | 'strategy'
  /** 이 ID가 변경되면 해당 거점이 보이도록 지구본 회전 */
  focusTerritoryId?: TerritoryId | null
  /** focusTerritoryId가 같은 값이더라도 재트리거를 위한 키 */
  focusKey?: number
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  rotation: [number, number]
  projection: d3.GeoProjection
  path: d3.GeoPath
  state: GameState
  playerFaction: Faction | null
  playerFactionId: string
  playerTerritoryIds: Set<TerritoryId>
  viewingTerritoryId?: TerritoryId | null
  selectedTerritoryId?: TerritoryId | null
  hoverTerritory: TerritoryId | null
  hoverRegion: RegionId | null
  phase: 'wandering' | 'strategy'
  currentRegionId: RegionId | null
  pulse: number
  getOwner: (tId: TerritoryId) => Faction | null
  territoryLabel: (id: TerritoryId) => string
  regionLabel: (id: RegionId) => string
  ownerLabelText: (owner: Faction | null, isPlayer: boolean) => string
  text: ReturnType<typeof import('../i18n').getSuikodenText>
  countries: GeoJSON.FeatureCollection
}
