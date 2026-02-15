'use client'

import type { GameState, Faction, TerritoryId } from '@/lib/game/suikoden/types'
import { TERRITORIES } from '@/lib/game/suikoden/constants'

interface Props {
  state: GameState
  viewingTerritoryId: TerritoryId
  onSelectTerritory: (id: TerritoryId) => void
}

// 축소 좌표 (미니맵용)
const MAP_POS: Record<TerritoryId, { x: number; y: number }> = {
  north_america: { x: 20, y: 34 }, south_america: { x: 26, y: 72 },
  britannia: { x: 68, y: 22 }, france: { x: 74, y: 39 }, iberia: { x: 62, y: 52 }, germania: { x: 88, y: 29 },
  scandinavia: { x: 86, y: 13 }, rus: { x: 110, y: 21 },
  rome: { x: 86, y: 49 }, greece: { x: 100, y: 56 },
  mesopotamia: { x: 115, y: 60 }, persia: { x: 128, y: 48 },
  india: { x: 140, y: 68 }, ceylon: { x: 144, y: 84 },
  huabei: { x: 160, y: 35 }, jiangnan: { x: 166, y: 54 }, liaodong: { x: 172, y: 23 },
}

export default function WorldMapMini({ state, viewingTerritoryId, onSelectTerritory }: Props) {
  const getOwner = (tId: TerritoryId): Faction | null =>
    state.factions.find(f => f.territories.some(t => t.id === tId)) ?? null

  return (
    <div className="bg-stone-900 border border-stone-700 rounded p-1">
      <svg viewBox="0 0 192 100" className="w-full" style={{ minHeight: 80 }}>
        <rect width="192" height="100" fill="#0c0a09" />

        {TERRITORIES.map(t => {
          const pos = MAP_POS[t.id]
          if (!pos) return null
          const owner = getOwner(t.id)
          const isViewing = t.id === viewingTerritoryId
          const color = owner?.color ?? '#57534e'

          return (
            <g key={t.id} onClick={() => onSelectTerritory(t.id)} className="cursor-pointer">
              {isViewing && (
                <rect x={pos.x - 7} y={pos.y - 5} width={14} height={10} rx={2}
                  fill="none" stroke="#fbbf24" strokeWidth="1" />
              )}
              <rect
                x={pos.x - 6} y={pos.y - 4} width={12} height={8} rx={1.5}
                fill={owner ? color + '40' : '#1c1917'}
                stroke={color} strokeWidth="0.8"
              />
              <text x={pos.x} y={pos.y + 2} textAnchor="middle" fill="#a8a29e" fontSize="4">
                {t.name.slice(0, 2)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
