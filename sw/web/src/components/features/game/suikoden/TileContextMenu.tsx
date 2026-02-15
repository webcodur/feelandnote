'use client'

import { useEffect, useRef } from 'react'
import type { GameState, Position, Territory, TerritoryTile } from '@/lib/game/suikoden/types'
import { BUILDINGS, TERRAIN_INFO } from '@/lib/game/suikoden/constants'

export interface ContextMenuAction {
  id: string
  label: string
  icon: string
  disabled?: boolean
  sub?: ContextMenuAction[]  // 서브메뉴 (건물 목록 등)
}

interface Props {
  x: number       // 화면 px
  y: number       // 화면 px
  tilePos: Position
  tile: TerritoryTile
  state: GameState
  territory: Territory
  selectedCharId: string | null
  onAction: (actionId: string, tilePos: Position) => void
  onClose: () => void
}

export default function TileContextMenu({ x, y, tilePos, tile, state, territory, selectedCharId, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭/ESC로 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const selectedPlacement = selectedCharId ? state.placements.find(p => p.characterId === selectedCharId) : null
  const isPlayerChar = selectedPlacement?.factionId === state.playerFactionId
  const charIsIdle = selectedPlacement?.task === 'idle'

  const terrainInfo = TERRAIN_INFO[tile.terrain]
  const isBuildable = !tile.building &&
    tile.terrain !== 'wall' && tile.terrain !== 'sea' &&
    tile.terrain !== 'mountain' && tile.terrain !== 'river'
  const hasBuilding = !!tile.building
  const isConstructionSite = state.constructions.some(c => c.territoryId === territory.id && c.x === tilePos.x && c.y === tilePos.y)

  // 이 타일에 캐릭터가 있는지
  const charOnTile = state.placements.find(p => p.territoryId === territory.id && p.x === tilePos.x && p.y === tilePos.y)

  // 메뉴 항목 결정
  const actions: ContextMenuAction[] = []

  // 타일 정보 헤더 (항상)
  // — 표시만, 액션 아님

  // 1) 이동 (캐릭터 선택됨 + idle/moving)
  if (selectedCharId && isPlayerChar && (charIsIdle || selectedPlacement?.task === 'moving' || selectedPlacement?.task === 'patrolling')) {
    if (tile.terrain !== 'wall' && tile.terrain !== 'sea') {
      actions.push({ id: 'move', label: '이동', icon: '🚶' })
    }
  }

  // 2) 건설 (캐릭터 선택됨 + idle + 타일이 비어있고 건설 가능)
  if (selectedCharId && isPlayerChar && charIsIdle && isBuildable && !isConstructionSite) {
    const existingBuildingIds = new Set(territory.buildings.map(b => b.def.id))
    const buildableBuildings = BUILDINGS.filter(b => {
      if (existingBuildingIds.has(b.id)) return false
      if (playerFaction.resources.gold < b.costGold) return false
      if (playerFaction.resources.material < b.costMaterial) return false
      return true
    })
    if (buildableBuildings.length > 0) {
      actions.push({
        id: 'build',
        label: '건설',
        icon: '🏗️',
        sub: buildableBuildings.map(b => ({
          id: `build:${b.id}`,
          label: `${b.name}`,
          icon: b.icon,
          disabled: false,
        })),
      })
    }
  }

  // 3) 근무 (캐릭터 선택됨 + idle + 타일에 가동 중인 건물)
  if (selectedCharId && isPlayerChar && charIsIdle && hasBuilding && !isConstructionSite) {
    const bDef = BUILDINGS.find(b => b.id === tile.building?.defId)
    if (bDef) {
      actions.push({ id: 'work', label: `${bDef.name} 근무`, icon: '⚙️' })
    }
  }

  // 4) 캐릭터가 이 타일에 있으면
  if (charOnTile && charOnTile.factionId === state.playerFactionId) {
    const char = playerFaction.members.find(m => m.id === charOnTile.characterId)
    if (char) {
      if (charOnTile.characterId === selectedCharId) {
        // 자기 자신 — 상태별 명령
        if (charOnTile.task === 'idle') {
          actions.push({ id: 'patrol', label: '순찰', icon: '👁️' })
        } else {
          actions.push({ id: `idle:${charOnTile.characterId}`, label: '대기', icon: '💤' })
        }
        actions.push({ id: `detail:${charOnTile.characterId}`, label: '상세보기', icon: '📋' })
      } else {
        // 다른 아군 캐릭터
        actions.push({ id: `select:${charOnTile.characterId}`, label: `${char.nickname} 선택`, icon: '👤' })
        actions.push({ id: `detail:${charOnTile.characterId}`, label: `${char.nickname} 상세`, icon: '📋' })
      }
    }
  }

  // 비어있으면 최소 타일 정보
  if (actions.length === 0) {
    // 정보만 표시
  }

  // 화면 밖으로 안 나가게 위치 조정
  const menuW = 180
  const menuH = Math.max(80, actions.length * 32 + 40)
  const adjustedX = Math.min(x, window.innerWidth - menuW - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuH - 8)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-stone-900 border border-stone-600 rounded-lg shadow-xl overflow-hidden"
      style={{ left: adjustedX, top: adjustedY, minWidth: menuW }}
    >
      {/* 헤더: 타일 정보 */}
      <div className="px-3 py-2 bg-stone-800 border-b border-stone-700 flex items-center gap-2">
        <span className="text-[10px]">{terrainInfo.icon || '·'}</span>
        <span className="text-[11px] text-stone-300 font-bold">{terrainInfo.name}</span>
        <span className="text-[9px] text-stone-500">({tilePos.x}, {tilePos.y})</span>
        {tile.building && (
          <span className="text-[10px] text-amber-400 ml-auto">
            {BUILDINGS.find(b => b.id === tile.building?.defId)?.icon} {BUILDINGS.find(b => b.id === tile.building?.defId)?.name}
          </span>
        )}
        {isConstructionSite && (
          <span className="text-[9px] text-amber-500 ml-auto">건설 중</span>
        )}
      </div>

      {/* 액션 목록 */}
      {actions.length > 0 ? (
        <div className="py-1">
          {actions.map(action => (
            <ContextMenuItem key={action.id} action={action} tilePos={tilePos} onAction={onAction} onClose={onClose} />
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-[10px] text-stone-500">
          {!selectedCharId ? '캐릭터를 먼저 선택하세요' : '가능한 명령이 없습니다'}
        </div>
      )}
    </div>
  )
}

function ContextMenuItem({ action, tilePos, onAction, onClose }: {
  action: ContextMenuAction
  tilePos: Position
  onAction: (id: string, pos: Position) => void
  onClose: () => void
}) {
  if (action.sub && action.sub.length > 0) {
    // 서브메뉴 (건설 목록) — 인라인 펼침
    return (
      <details className="group">
        <summary className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 cursor-pointer list-none">
          <span>{action.icon}</span>
          <span className="flex-1">{action.label}</span>
          <span className="text-stone-500 text-[10px]">▸</span>
        </summary>
        <div className="bg-stone-800/50">
          {action.sub.map(sub => (
            <button
              key={sub.id}
              disabled={sub.disabled}
              onClick={() => { onAction(sub.id, tilePos); onClose() }}
              className="w-full flex items-center gap-2 px-5 py-1.5 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200 disabled:opacity-30 transition-colors"
            >
              <span>{sub.icon}</span>
              <span>{sub.label}</span>
            </button>
          ))}
        </div>
      </details>
    )
  }

  return (
    <button
      disabled={action.disabled}
      onClick={() => { onAction(action.id, tilePos); onClose() }}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 hover:text-stone-100 disabled:opacity-30 transition-colors"
    >
      <span>{action.icon}</span>
      <span>{action.label}</span>
    </button>
  )
}
