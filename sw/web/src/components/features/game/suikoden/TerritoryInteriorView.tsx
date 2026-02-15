'use client'

import { useCallback, useState } from 'react'
import type { GameState, Territory, Position, TerritoryTile } from '@/lib/game/suikoden/types'
import { TERRAIN_INFO, BUILDINGS } from '@/lib/game/suikoden/constants'
import CharacterToken from './CharacterToken'
import TileContextMenu from './TileContextMenu'

interface Props {
  state: GameState
  territory: Territory
  selectedCharId: string | null
  onSelectChar: (id: string | null) => void
  onTileClick: (pos: Position) => void
  onContextAction: (actionId: string, tilePos: Position) => void
}

const TILE = 32

export default function TerritoryInteriorView({ state, territory, selectedCharId, onSelectChar, onTileClick, onContextAction }: Props) {
  const { map } = territory

  const [contextMenu, setContextMenu] = useState<{
    screenX: number; screenY: number; tilePos: Position; tile: TerritoryTile
  } | null>(null)

  // 이 영토에 배치된 캐릭터들
  const placements = state.placements.filter(p => p.territoryId === territory.id)

  const getCharacter = (charId: string) => {
    for (const f of state.factions) {
      const m = f.members.find(m => m.id === charId)
      if (m) return m
    }
    return null
  }

  const getFactionForChar = (charId: string) => {
    return state.factions.find(f => f.members.some(m => m.id === charId))
  }

  // 건설 중인 사이트
  const constructions = state.constructions.filter(c => c.territoryId === territory.id)

  const handleTileClick = useCallback((x: number, y: number) => {
    setContextMenu(null)
    onTileClick({ x, y })
  }, [onTileClick])

  const handleContextMenu = useCallback((e: React.MouseEvent, x: number, y: number, tile: TerritoryTile) => {
    e.preventDefault()
    setContextMenu({
      screenX: e.clientX,
      screenY: e.clientY,
      tilePos: { x, y },
      tile,
    })
  }, [])

  const handleContextAction = useCallback((actionId: string, tilePos: Position) => {
    // select:charId 는 여기서 처리
    if (actionId.startsWith('select:')) {
      onSelectChar(actionId.replace('select:', ''))
      return
    }
    onContextAction(actionId, tilePos)
  }, [onContextAction, onSelectChar])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-200">{territory.name} 내부 맵</span>
        <span className="text-[10px] text-stone-500">{map.width}×{map.height} · 우클릭: 명령</span>
      </div>

      <div
        className="relative inline-block border border-stone-600 rounded overflow-hidden"
        style={{ width: map.width * TILE, height: map.height * TILE }}
        onClick={() => setContextMenu(null)}
      >
        {/* 타일 그리드 */}
        <div
          className="inline-grid gap-0"
          style={{ gridTemplateColumns: `repeat(${map.width}, ${TILE}px)` }}
        >
          {map.grid.flatMap((row, y) =>
            row.map((tile, x) => {
              const info = TERRAIN_INFO[tile.terrain]
              const construction = constructions.find(c => c.x === x && c.y === y)

              return (
                <div
                  key={`${x}-${y}`}
                  className="relative flex items-center justify-center border border-stone-800/20 cursor-pointer hover:brightness-110"
                  style={{
                    width: TILE,
                    height: TILE,
                    backgroundColor: info.color,
                  }}
                  onClick={() => handleTileClick(x, y)}
                  onContextMenu={(e) => handleContextMenu(e, x, y, tile)}
                  title={`${info.name} (${x},${y})${tile.building ? ` [${BUILDINGS.find(b => b.id === tile.building?.defId)?.name ?? '건물'}]` : ''}`}
                >
                  {info.icon && <span className="text-[8px] opacity-50">{info.icon}</span>}
                  {tile.building && (
                    <span className="absolute inset-0 flex items-center justify-center text-[12px]">
                      {BUILDINGS.find(b => b.id === tile.building?.defId)?.icon ?? '🏗️'}
                    </span>
                  )}
                  {/* 건설 진행 바 */}
                  {construction && (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60">🏗️</span>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-800">
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: `${construction.progress * 100}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 캐릭터 토큰 */}
        {placements.map(p => {
          const char = getCharacter(p.characterId)
          if (!char) return null
          const faction = getFactionForChar(p.characterId)

          return (
            <CharacterToken
              key={p.characterId}
              placement={p}
              character={char}
              tileSize={TILE}
              isSelected={selectedCharId === p.characterId}
              isPlayer={faction?.id === state.playerFactionId}
              factionColor={faction?.color ?? '#666'}
              onClick={() => {
                setContextMenu(null)
                onSelectChar(p.characterId)
              }}
            />
          )
        })}
      </div>

      {/* 컨텍스트 메뉴 (포털 대신 fixed) */}
      {contextMenu && (
        <TileContextMenu
          x={contextMenu.screenX}
          y={contextMenu.screenY}
          tilePos={contextMenu.tilePos}
          tile={contextMenu.tile}
          state={state}
          territory={territory}
          selectedCharId={selectedCharId}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
