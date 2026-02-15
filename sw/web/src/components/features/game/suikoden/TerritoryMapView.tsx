'use client'

import type { Territory, TerritoryTile } from '@/lib/game/suikoden/types'
import { TERRAIN_INFO, BUILDINGS } from '@/lib/game/suikoden/constants'

interface Props {
  territory: Territory
  compact?: boolean
}

const TILE = 28

export default function TerritoryMapView({ territory, compact }: Props) {
  const { map } = territory
  const tileSize = compact ? 20 : TILE

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-200">{territory.name} 내부 맵</span>
        <span className="text-[10px] text-stone-500">{map.width}×{map.height}</span>
      </div>

      <div
        className="inline-grid gap-0 border border-stone-600 rounded overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${map.width}, ${tileSize}px)`,
        }}
      >
        {map.grid.flatMap((row, y) =>
          row.map((tile, x) => {
            const info = TERRAIN_INFO[tile.terrain]
            return (
              <div
                key={`${x}-${y}`}
                className="relative flex items-center justify-center border border-stone-800/30"
                style={{
                  width: tileSize,
                  height: tileSize,
                  backgroundColor: info.color,
                }}
                title={`${info.name} (${x},${y})${tile.building ? ` [${BUILDINGS.find(b => b.id === tile.building?.defId)?.name ?? '건물'}]` : ''}`}
              >
                {info.icon && <span className="text-[8px] opacity-60">{info.icon}</span>}
                {tile.building && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px]">
                    {BUILDINGS.find(b => b.id === tile.building?.defId)?.icon ?? '🏗️'}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 건물 목록 */}
      {territory.buildings.length > 0 && (
        <div className="text-[10px] text-stone-400 space-y-0.5">
          {territory.buildings.map((b, i) => (
            <div key={i} className="flex items-center gap-1">
              <span>{b.def.icon}</span>
              <span>{b.def.name}</span>
              {b.turnsLeft > 0 && <span className="text-amber-400">({b.turnsLeft}턴 남음)</span>}
              {b.turnsLeft === 0 && <span className="text-green-400">가동중</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
