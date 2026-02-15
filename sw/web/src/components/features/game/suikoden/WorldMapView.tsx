'use client'

import type { GameState, Faction, TerritoryId } from '@/lib/game/suikoden/types'
import { TERRITORIES } from '@/lib/game/suikoden/constants'

interface Props {
  state: GameState
  selectedTerritoryId: TerritoryId | null
  onSelectTerritory: (id: TerritoryId) => void
}

// 세계맵 좌표 (viewBox 0 0 960 520 기준)
const MAP_POS: Record<TerritoryId, { x: number; y: number }> = {
  // 신대륙 (좌측)
  north_america: { x: 100, y: 170 },
  south_america: { x: 130, y: 360 },
  // 서유럽
  britannia:     { x: 340, y: 110 },
  france:        { x: 370, y: 195 },
  iberia:        { x: 310, y: 260 },
  germania:      { x: 440, y: 145 },
  // 북유럽
  scandinavia:   { x: 430, y: 65 },
  rus:           { x: 550, y: 105 },
  // 지중해
  rome:          { x: 430, y: 245 },
  greece:        { x: 500, y: 280 },
  // 중동
  mesopotamia:   { x: 575, y: 300 },
  persia:        { x: 640, y: 240 },
  // 남아시아
  india:         { x: 700, y: 340 },
  ceylon:        { x: 720, y: 420 },
  // 동아시아
  huabei:        { x: 800, y: 175 },
  jiangnan:      { x: 830, y: 270 },
  liaodong:      { x: 860, y: 115 },
}

// 커브 세기 (양수=위로 볼록, 음수=아래로 볼록)
// 장거리 연결에 곡선을 줘서 교차를 줄인다
const CURVE_OVERRIDES: Record<string, number> = {
  'britannia-north_america': -40,
  'iberia-north_america': -70,
  'persia-huabei': -50,
  'persia-rus': -30,
  'greece-rus': -25,
  'india-jiangnan': -60,
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function curvePath(x1: number, y1: number, x2: number, y2: number, bend: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  // 법선 방향으로 bend만큼 오프셋
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const cx = mx + nx * bend
  const cy = my + ny * bend
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
}

export default function WorldMapView({ state, selectedTerritoryId, onSelectTerritory }: Props) {
  const getOwner = (tId: TerritoryId): Faction | null => {
    return state.factions.find(f => f.territories.some(t => t.id === tId)) ?? null
  }

  // 중복 제거된 연결 목록
  const edges: { from: TerritoryId; to: TerritoryId }[] = []
  const seen = new Set<string>()
  for (const t of TERRITORIES) {
    for (const nId of t.neighbors) {
      const key = edgeKey(t.id, nId)
      if (!seen.has(key)) {
        seen.add(key)
        edges.push({ from: t.id, to: nId })
      }
    }
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded overflow-hidden">
      <svg viewBox="0 0 960 520" className="w-full h-auto" style={{ minHeight: 260 }}>
        {/* 배경 그라디언트 */}
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="100%" stopColor="#0c0a09" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="960" height="520" fill="url(#mapBg)" />

        {/* 연결선 */}
        {edges.map(({ from, to }) => {
          const p1 = MAP_POS[from]
          const p2 = MAP_POS[to]
          if (!p1 || !p2) return null
          const key = edgeKey(from, to)
          const bend = CURVE_OVERRIDES[key] ?? 0
          const d = bend !== 0
            ? curvePath(p1.x, p1.y, p2.x, p2.y, bend)
            : `M${p1.x},${p1.y} L${p2.x},${p2.y}`
          return (
            <path
              key={key}
              d={d}
              stroke="#44403c"
              strokeWidth="1.2"
              strokeDasharray="4,4"
              fill="none"
              opacity="0.5"
            />
          )
        })}

        {/* 영토 노드 */}
        {TERRITORIES.map(territory => {
          const pos = MAP_POS[territory.id]
          if (!pos) return null
          const owner = getOwner(territory.id)
          const isPlayer = owner?.id === state.playerFactionId
          const isSelected = selectedTerritoryId === territory.id
          const color = owner?.color ?? '#57534e'

          return (
            <g
              key={territory.id}
              onClick={() => onSelectTerritory(territory.id)}
              className="cursor-pointer"
              transform={`translate(${pos.x}, ${pos.y})`}
            >
              {/* 선택 시 글로우 */}
              {isSelected && (
                <rect
                  x={-38} y={-18} width={76} height={36} rx={6}
                  fill="none" stroke={color} strokeWidth="2"
                  filter="url(#glow)" opacity="0.8"
                />
              )}

              {/* 배경 박스 */}
              <rect
                x={-36} y={-16} width={72} height={32} rx={4}
                fill={owner ? color + '25' : '#1c1917'}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1.2}
              />

              {/* 영토명 */}
              <text
                x={0} y={-2}
                textAnchor="middle"
                fill="#e7e5e4"
                fontSize="11"
                fontWeight="bold"
              >
                {territory.name}
              </text>

              {/* 소유자 */}
              <text
                x={0} y={11}
                textAnchor="middle"
                fill="#78716c"
                fontSize="9"
              >
                {owner ? (isPlayer ? '★' : owner.name.replace('의 세력', '').slice(0, 4)) : '—'}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
