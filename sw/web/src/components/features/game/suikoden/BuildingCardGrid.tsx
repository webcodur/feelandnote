'use client'

import { useState, useCallback } from 'react'
import type { GameState, Territory, BuildingCard as BuildingCardType, GameCharacter, ThreatCard as ThreatCardType } from '@/lib/game/suikoden/types'
import { BUILDINGS, BUILDING_CATEGORY, BUILDING_CATEGORY_INFO, GRADE_COLORS } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

const STAT_LABEL: Record<string, string> = {
  power: '완력', skill: '기량', intellect: '지력', stamina: '체력',
  loyalty: '충의', virtue: '인애', courage: '용기',
}

interface Props {
  state: GameState
  territory: Territory
  selectedCharId: string | null
  onSelectChar: (id: string | null) => void
  onBuild: (buildingDefId: string) => void
  onReassign: (charId: string, buildingInstanceId: string) => void
  onUnassign: (charId: string) => void
  onDemolish: (buildingInstanceId: string) => void
  onAssignRecruiter: (visitorCharId: string, recruiterCharId: string) => void
  onCancelRecruiter: (visitorCharId: string) => void
  onDispatch: (charId: string, threatId: string) => void
  onRecall: (charId: string) => void
  onToast: (msg: string) => void
  /** 다른 세력의 영토를 읽기 전용으로 표시 */
  readOnly?: boolean
  /** readOnly 시 표시할 세력 ID (미지정 시 playerFaction) */
  factionOverrideId?: string
}

export default function BuildingCardGrid({
  state, territory, selectedCharId, onSelectChar,
  onBuild, onReassign, onUnassign, onDemolish, onAssignRecruiter, onCancelRecruiter, onDispatch, onRecall, onToast,
  readOnly, factionOverrideId,
}: Props) {
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [infoBuilding, setInfoBuilding] = useState<string | null>(null)

  const playerFaction = state.factions.find(f => f.id === (factionOverrideId ?? state.playerFactionId)) ?? null
  const slotUsed = territory.buildingCards.length
  const slotMax = territory.maxBuildings
  const hasRoom = slotUsed < slotMax

  // 인물 분류
  const idleChars: GameCharacter[] = []
  const trainingChars: GameCharacter[] = []
  const buildingChars: GameCharacter[] = []
  const huntingChars: GameCharacter[] = []

  for (const m of (playerFaction?.members ?? [])) {
    const p = state.placements.find(pl => pl.characterId === m.id)
    if (!p) { idleChars.push(m); continue }
    if (p.task === 'idle' && !p.assignedBuildingId) idleChars.push(m)
    else if (p.task === 'idle' && p.assignedBuildingId) { /* 건물에서 휴식 중 → 건물 슬롯에 표시 */ }
    else if (p.task === 'training') trainingChars.push(m)
    else if (p.task === 'building') buildingChars.push(m)
    else if (p.task === 'hunting') huntingChars.push(m)
    // working chars are shown inside their building
  }

  const selectedPlacement = selectedCharId
    ? state.placements.find(p => p.characterId === selectedCharId)
    : null
  const canBuild = !readOnly && (selectedPlacement?.task === 'idle' || selectedPlacement?.task === 'working') && hasRoom

  // ── DND ──
  const handleDragStart = useCallback((e: React.DragEvent, charId: string) => {
    e.dataTransfer.setData('text/character-id', charId)
    e.dataTransfer.effectAllowed = 'move'
    onSelectChar(charId)
  }, [onSelectChar])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDropOnBuilding = useCallback((e: React.DragEvent, card: BuildingCardType) => {
    e.preventDefault()
    setDragOverTarget(null)
    const charId = e.dataTransfer.getData('text/character-id')
    if (!charId) return
    // 자기 자신이 배치된 건물에 드롭 → 무시
    const occupant = card.isConstructing ? card.constructionWorkerId : card.assigneeId
    if (occupant === charId) return
    // 점유자 있으면 스왑, 빈자리면 배치 — 모두 onReassign이 처리
    onReassign(charId, card.instanceId)
  }, [onReassign])

  const handleDropOnIdle = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverTarget(null)
    const charId = e.dataTransfer.getData('text/character-id')
    if (!charId) return
    const p = state.placements.find(pl => pl.characterId === charId)
    if (!p || p.task === 'idle') return
    if (p.task === 'hunting') onRecall(charId)
    else onUnassign(charId)
  }, [state.placements, onUnassign, onRecall])

  const handleDropOnBuildSlot = useCallback((e: React.DragEvent, defId: string) => {
    e.preventDefault()
    setDragOverTarget(null)
    const charId = e.dataTransfer.getData('text/character-id')
    if (charId && canBuild) onBuild(defId)
  }, [canBuild, onBuild])

  const categories = ['agriculture', 'commerce', 'military', 'culture'] as const

  // 위협 (이 영토)
  const threats = state.threats.filter(t => t.territoryId === territory.id)

  // 방문자 (이 영토)
  const visitors = state.tavernVisitors.filter(v => v.territoryId === territory.id)
  const hasTavern = territory.buildingCards.some(c => c.defId === 'tavern' && !c.isConstructing)

  return (
    <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-3 space-y-3">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-200">{territory.name}</span>
          <span className="text-[10px] text-stone-500">건물 {slotUsed}/{slotMax}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-400">
          <span>인구 {territory.population.toLocaleString()}</span>
          <span className={territory.morale >= 50 ? 'text-green-400' : 'text-red-400'}>
            민심 {Math.round(territory.morale)}
          </span>
        </div>
      </div>

      {/* ── 2열 레이아웃: 좌=건물, 우=인물풀 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        {/* 좌열: 건물 */}
        <div className="space-y-2 min-w-0">
          {categories.map(cat => {
            const catInfo = BUILDING_CATEGORY_INFO[cat]
            const defsInCat = BUILDINGS.filter(b => BUILDING_CATEGORY[b.id] === cat)
            const cardsInCat = territory.buildingCards.filter(c => BUILDING_CATEGORY[c.defId] === cat)
            if (cardsInCat.length === 0 && !hasRoom) return null

            return (
              <div key={cat}>
                <div className="text-[10px] font-bold mb-1" style={{ color: catInfo.color }}>
                  {catInfo.name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {defsInCat.map(bDef => {
                    const cards = territory.buildingCards.filter(c => c.defId === bDef.id)
                    const canAfford = (playerFaction?.resources.gold ?? 0) >= bDef.costGold
                      && (playerFaction?.resources.material ?? 0) >= bDef.costMaterial

                    return (
                      <span key={bDef.id} className="contents">
                        {cards.map((card, idx) => {
                          const assignee = card.assigneeId
                            ? (playerFaction?.members ?? []).find(m => m.id === card.assigneeId)
                            : null
                          const builder = !assignee && card.isConstructing
                            ? buildingChars.find(bc => {
                                const pl = state.placements.find(p => p.characterId === bc.id)
                                return pl?.assignedBuildingId === card.instanceId
                              })
                            : null
                          const isDragOver = dragOverTarget === `b-${card.instanceId}`
                          const charInSlot = assignee || builder
                          const slotPlacement = charInSlot ? state.placements.find(p => p.characterId === charInSlot.id) : null
                          const isResting = !!charInSlot && slotPlacement?.task === 'idle'

                          return (
                            <BuildingSlot
                              key={card.instanceId}
                              buildingName={bDef.name}
                              buildingDefId={bDef.id}
                              index={cards.length > 1 ? idx + 1 : undefined}
                              isResting={isResting}
                              isConstructing={card.isConstructing}
                              turnsLeft={card.constructionTurnsLeft}
                              buildTurnsTotal={bDef.buildTurns}
                              character={assignee || builder || null}
                              catColor={catInfo.color}
                              isDragOver={isDragOver}
                              isSelected={!readOnly && selectedCharId != null && (assignee?.id === selectedCharId || builder?.id === selectedCharId)}
                              onDragOver={readOnly ? undefined : (e) => { handleDragOver(e); setDragOverTarget(`b-${card.instanceId}`) }}
                              onDragLeave={readOnly ? undefined : () => setDragOverTarget(null)}
                              onDrop={readOnly ? undefined : (e) => handleDropOnBuilding(e, card)}
                              onDragStartChar={readOnly ? undefined : (assignee || builder) ? (e) => handleDragStart(e, (assignee || builder)!.id) : undefined}
                              onClickChar={readOnly ? undefined : (assignee || builder) ? () => {
                                const charInSlot = (assignee || builder)!
                                if (charInSlot.id === selectedCharId) {
                                  onUnassign(charInSlot.id)
                                  onSelectChar(null)
                                } else {
                                  onSelectChar(charInSlot.id)
                                }
                              } : undefined}
                              onClickAssign={readOnly ? undefined :
                                selectedCharId
                                  && (card.isConstructing ? card.constructionWorkerId : card.assigneeId) !== selectedCharId
                                  ? () => onReassign(selectedCharId, card.instanceId)
                                  : undefined
                              }
                              onClickAssignHint={readOnly ? undefined :
                                !selectedCharId
                                  ? () => onToast('배치할 인물을 먼저 선택하라.')
                                  : undefined
                              }
                              onUnassign={readOnly ? undefined : (card.assigneeId || card.constructionWorkerId) ? () => onUnassign((card.assigneeId ?? card.constructionWorkerId)!) : undefined}
                              onDemolish={readOnly ? undefined : () => onDemolish(card.instanceId)}
                              onClickInfo={() => setInfoBuilding(bDef.id)}
                              readOnly={readOnly}
                            />
                          )
                        })}

                        {/* 신규 건설 — readOnly 시 숨김 */}
                        {hasRoom && !readOnly && (
                          <div
                            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded border border-dashed text-[10px] transition-colors self-start ${
                              !canAfford
                                ? 'border-stone-700/50 text-stone-700'
                                : dragOverTarget === `new-${bDef.id}`
                                  ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                                  : canBuild
                                    ? 'border-stone-500 text-stone-400'
                                    : 'border-stone-700 text-stone-600'
                            }`}
                            onDragOver={canAfford ? (e) => { handleDragOver(e); setDragOverTarget(`new-${bDef.id}`) } : undefined}
                            onDragLeave={canAfford ? () => setDragOverTarget(null) : undefined}
                            onDrop={canAfford ? (e) => handleDropOnBuildSlot(e, bDef.id) : undefined}
                            title={`${bDef.name} (금${bDef.costGold}${bDef.costMaterial > 0 ? ` 자재${bDef.costMaterial}` : ''}${bDef.requireStat ? ` ${STAT_LABEL[bDef.requireStat]}${bDef.requireStatMin}↑` : ''}) ${bDef.buildTurns}턴`}
                          >
                            <span
                              className="cursor-pointer hover:text-amber-300 transition-colors"
                              onClick={() => setInfoBuilding(bDef.id)}
                            >
                              {bDef.name}
                            </span>
                            <span className={`ml-0.5 ${canAfford ? 'text-stone-600' : 'text-stone-700/50'}`}>{bDef.buildTurns}턴</span>
                            {canAfford && (
                              <span
                                className="text-xs cursor-pointer hover:text-amber-300 transition-colors ml-0.5"
                                onClick={() => {
                                  if (!selectedCharId) {
                                    onToast('건설할 인물을 먼저 선택하라.')
                                  } else if (selectedPlacement?.task === 'training') {
                                    onToast('훈련 중인 인물은 건설할 수 없다.')
                                  } else if (selectedPlacement?.task === 'building') {
                                    onToast('이미 건설 중인 인물이다.')
                                  } else if (bDef.requireStat && bDef.requireStatMin) {
                                    const char = (playerFaction?.members ?? []).find(m => m.id === selectedCharId)
                                    if (char && char.stats[bDef.requireStat] < bDef.requireStatMin) {
                                      onToast(`${bDef.name}: ${STAT_LABEL[bDef.requireStat] ?? bDef.requireStat} ${bDef.requireStatMin} 이상 필요 (현재 ${char.stats[bDef.requireStat]})`)
                                      return
                                    }
                                    onBuild(bDef.id)
                                  } else {
                                    onBuild(bDef.id)
                                  }
                                }}
                              >+</span>
                            )}
                          </div>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* 우열: 대기 / 훈련 / 방문 */}
        <div className="sm:w-[200px] sm:border-l sm:border-stone-700 sm:pl-3 space-y-3">
          {/* ── 대기 ── */}
          <div
            className={`rounded p-2 transition-colors ${
              dragOverTarget === 'idle-pool'
                ? 'bg-amber-500/5 ring-1 ring-amber-400/30'
                : ''
            }`}
            onDragOver={readOnly ? undefined : (e) => { handleDragOver(e); setDragOverTarget('idle-pool') }}
            onDragLeave={readOnly ? undefined : () => setDragOverTarget(null)}
            onDrop={readOnly ? undefined : handleDropOnIdle}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-stone-400">대기</span>
              <span className="text-[10px] text-stone-600">{idleChars.length}명</span>
            </div>
            {idleChars.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {idleChars.map(char => (
                  <CharacterChip
                    key={char.id}
                    character={char}
                    isSelected={!readOnly && selectedCharId === char.id}
                    onClick={readOnly ? () => {} : () => onSelectChar(char.id === selectedCharId ? null : char.id)}
                    onDragStart={readOnly ? () => {} : (e) => handleDragStart(e, char.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-stone-600">대기 인물 없음</p>
            )}
          </div>

          {/* ── 훈련 ── */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 px-2">
              <span className="text-[10px] font-bold text-blue-400">훈련</span>
              <span className="text-[10px] text-stone-600">{trainingChars.length}명</span>
            </div>
            {trainingChars.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 px-2">
                {trainingChars.map(char => (
                  <CharacterChip
                    key={char.id}
                    character={char}
                    isSelected={!readOnly && selectedCharId === char.id}
                    status="훈련"
                    onClick={readOnly ? () => {} : () => onSelectChar(char.id === selectedCharId ? null : char.id)}
                    onDragStart={readOnly ? () => {} : (e) => handleDragStart(e, char.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-stone-600 px-2">훈련 인물 없음</p>
            )}
          </div>

          {/* ── 출몰 — readOnly 시 숨김 ── */}
          {!readOnly && threats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[10px] font-bold text-red-400">출몰</span>
                <span className="text-[10px] text-stone-600">{threats.length}건</span>
              </div>
              <div className="space-y-1.5 px-2">
                {threats.map(threat => {
                  const turnsLeft = threat.expiryTurn - state.turnCount
                  const assignedChar = threat.assignedCharId
                    ? (playerFaction?.members ?? []).find(m => m.id === threat.assignedCharId)
                    : null

                  return (
                    <div key={threat.id} className="p-1.5 rounded bg-red-950/30 border border-red-900/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{threat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-stone-200">{threat.name}</span>
                            <span className="text-[9px] text-red-400">위력 {threat.power}</span>
                          </div>
                          <span className="text-[9px] text-stone-500">{turnsLeft}턴 후 피해 발생</span>
                        </div>
                      </div>
                      {assignedChar ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <CharacterPortrait character={assignedChar} size={20} />
                          <span className="text-[10px] text-amber-300 flex-1">{assignedChar.nickname} 토벌 중</span>
                          <button
                            onClick={() => onRecall(assignedChar.id)}
                            className="px-1.5 py-0.5 rounded bg-stone-700/50 border border-stone-600/50 text-[9px] text-stone-400 hover:text-stone-200 transition-colors"
                          >
                            해제
                          </button>
                        </div>
                      ) : selectedCharId && selectedPlacement?.task !== 'hunting' ? (
                        <button
                          onClick={() => onDispatch(selectedCharId, threat.id)}
                          className="mt-1.5 w-full px-2 py-1 rounded bg-red-900/40 border border-red-700/50 text-[10px] text-red-300 hover:bg-red-800/50 transition-colors"
                        >
                          토벌 배정
                        </button>
                      ) : (
                        <p className="mt-1 text-[9px] text-stone-600">인물을 선택하여 배정</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 방문 — readOnly 시 숨김 ── */}
          {!readOnly && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[10px] font-bold text-emerald-400">방문</span>
                <span className="text-[10px] text-stone-600">{visitors.length}명</span>
              </div>
              {hasTavern ? (
                visitors.length > 0 ? (
                  <div className="space-y-1.5 px-2">
                    {visitors.map(v => {
                      const turnsLeft = v.departureTurn - state.turnCount
                      const assignedRecruiter = v.recruiterId
                        ? (playerFaction?.members ?? []).find(m => m.id === v.recruiterId)
                        : null
                      return (
                        <div key={v.character.id} className="p-1.5 rounded bg-stone-700/30 border border-stone-600/50">
                          <div className="flex items-center gap-2">
                            <CharacterPortrait character={v.character} size={24} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-stone-200 truncate">{v.character.nickname}</span>
                                <span className="text-[8px] font-bold" style={{ color: GRADE_COLORS[v.character.grade] }}>{v.character.grade}</span>
                              </div>
                              <span className="text-[9px] text-stone-500">{turnsLeft}턴 후 떠남</span>
                            </div>
                          </div>
                          {assignedRecruiter ? (
                            <div className="flex items-center gap-2 mt-1.5">
                              <CharacterPortrait character={assignedRecruiter} size={20} />
                              <span className="text-[10px] text-emerald-300 flex-1">{assignedRecruiter.nickname} 등용 중</span>
                              <button
                                onClick={() => onCancelRecruiter(v.character.id)}
                                className="px-1.5 py-0.5 rounded bg-stone-700/50 border border-stone-600/50 text-[9px] text-stone-400 hover:text-stone-200 transition-colors"
                              >
                                해제
                              </button>
                            </div>
                          ) : selectedCharId ? (
                            <button
                              onClick={() => onAssignRecruiter(v.character.id, selectedCharId)}
                              className="mt-1.5 w-full px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700/50 text-[10px] text-emerald-300 hover:bg-emerald-800/50 transition-colors"
                            >
                              할당
                            </button>
                          ) : (
                            <p className="mt-1 text-[9px] text-stone-600">인물을 선택하여 할당</p>
                          )}
                          {assignedRecruiter && (
                            <p className="text-[8px] text-stone-500 mt-1">다음 턴에 등용 시도</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-stone-600 px-2">방문자 없음</p>
                )
              ) : (
                <p className="text-[10px] text-stone-600 px-2">선술집 건설 시 인재가 방문한다</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 건물 정보 모달 */}
      {infoBuilding && <BuildingInfoModal defId={infoBuilding} onClose={() => setInfoBuilding(null)} />}
    </div>
  )
}

// ── 건물 정보 모달 ──

const BUILDING_DESC: Record<string, string> = {
  farm:     '식량을 생산한다. 세력 유지의 기본 건물.',
  market:   '금을 생산한다. 경제의 기초.',
  trade:    '대량의 금을 생산한다. 기량 6 이상 필요.',
  lumber:   '건설에 필요한 자재를 생산한다.',
  mine:     '대량의 자재를 생산한다. 기량 5 이상 필요.',
  barracks: '매 턴 병사를 모집한다.',
  training: '인물을 훈련시켜 완력/기량/체력 스탯을 올린다. 완력 6 이상 필요.',
  walls:    '방어 보너스를 제공한다. 기량 5 이상 필요.',
  armory:   '무기를 제작하여 전투력을 높인다.',
  library:  '지식을 생산한다.',
  academy:  '대량의 지식을 생산하고 기술을 연구한다. 지력 7 이상 필요.',
  temple:   '민심을 올리고 특수 능력을 부여한다. 인애 7 이상 필요.',
  theater:  '민심과 문화를 올린다.',
  tavern:   '선술집에 떠돌이 인재가 방문한다. 등용 기회 제공.',
  patrol:   '순찰병이 영토를 순찰하여 출몰을 자동 토벌하고 민심을 올린다.',
}

function BuildingInfoModal({ defId, onClose }: { defId: string; onClose: () => void }) {
  const bDef = BUILDINGS.find(b => b.id === defId)
  if (!bDef) return null

  const desc = BUILDING_DESC[defId] ?? ''
  const e = bDef.effect

  const effects: string[] = []
  if (e.goldPerTurn) effects.push(`금 +${e.goldPerTurn}/월`)
  if (e.foodPerTurn) effects.push(`식량 +${e.foodPerTurn}/월`)
  if (e.knowledgePerTurn) effects.push(`지식 +${e.knowledgePerTurn}/월`)
  if (e.materialPerTurn) effects.push(`자재 +${e.materialPerTurn}/월`)
  if (e.troopsPerTurn) effects.push(`병사 +${e.troopsPerTurn}/월`)
  if (e.moralePerTurn) effects.push(`민심 +${e.moralePerTurn}/월`)
  if (e.defenseBonus) effects.push(`방어 +${e.defenseBonus}`)
  if (e.culturePerTurn) effects.push(`문화 +${e.culturePerTurn}/월`)

  const costs: string[] = []
  if (bDef.costGold) costs.push(`금 ${bDef.costGold}`)
  if (bDef.costMaterial) costs.push(`자재 ${bDef.costMaterial}`)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-xs w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bDef.icon}</span>
            <span className="text-sm font-bold text-stone-100">{bDef.name}</span>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">{desc}</p>

        <div className="space-y-1.5">
          {effects.length > 0 && (
            <div>
              <div className="text-[10px] text-stone-500 mb-0.5">효과 (근무자 배치 시 1.5배)</div>
              <div className="flex flex-wrap gap-1.5">
                {effects.map(eff => (
                  <span key={eff} className="text-[10px] px-1.5 py-0.5 bg-stone-700 rounded text-emerald-300">{eff}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="text-stone-500 mb-0.5">건설 비용</div>
              <div className="text-stone-300">{costs.join(', ') || '없음'}</div>
            </div>
            <div>
              <div className="text-stone-500 mb-0.5">건설 기간</div>
              <div className="text-stone-300">{bDef.buildTurns}턴</div>
            </div>
          </div>

          {bDef.requireStat && bDef.requireStatMin && (
            <div className="text-[10px]">
              <span className="text-stone-500">건설 조건: </span>
              <span className="text-amber-300">{STAT_LABEL[bDef.requireStat] ?? bDef.requireStat} {bDef.requireStatMin} 이상</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 건물 슬롯: 건물 프레임 + 인물 카드 분리 ──

function BuildingSlot({
  buildingName, buildingDefId, index, isConstructing, isResting, turnsLeft, buildTurnsTotal,
  character, catColor, isDragOver, isSelected,
  onDragOver, onDragLeave, onDrop,
  onDragStartChar, onClickChar, onClickAssign, onClickAssignHint,
  onUnassign, onDemolish, onClickInfo, readOnly,
}: {
  buildingName: string
  buildingDefId: string
  index?: number
  isConstructing: boolean
  isResting?: boolean
  turnsLeft: number
  buildTurnsTotal: number
  character: GameCharacter | null
  catColor: string
  isDragOver: boolean
  isSelected: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  onDragStartChar?: (e: React.DragEvent) => void
  onClickChar?: () => void
  onClickAssign?: () => void
  onClickAssignHint?: () => void
  onUnassign?: () => void
  onDemolish?: () => void
  onClickInfo?: () => void
  readOnly?: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`relative rounded border min-w-[100px] transition-all ${
        isDragOver
          ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50'
          : isConstructing
            ? 'border-stone-600 bg-stone-700/30'
            : character
              ? 'border-stone-500 bg-stone-800/30'
              : 'border-stone-600 bg-stone-800/50 border-dashed'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 건물 헤더 */}
      <div
        className={`flex items-center justify-between px-1.5 py-1 rounded-t transition-colors ${readOnly ? '' : 'cursor-pointer hover:bg-stone-700/30'}`}
        onClick={readOnly ? undefined : (e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
      >
        <span
          className="text-[10px] font-bold text-stone-400 hover:text-amber-300 transition-colors"
          onClick={(e) => { e.stopPropagation(); onClickInfo?.() }}
        >
          {buildingName}{index != null ? index : ''}
        </span>
        {isConstructing ? (
          <span className="text-[9px] text-amber-500/80">건설 {buildTurnsTotal - turnsLeft}/{buildTurnsTotal}</span>
        ) : character && !isResting ? (
          <span className="text-[9px] text-emerald-400">전력 가동</span>
        ) : character && isResting ? (
          <span className="text-[9px] text-stone-500">휴식중</span>
        ) : (
          <span className="text-[9px] text-stone-500">가동중</span>
        )}
      </div>

      {/* 인물 카드 */}
      <div className="px-1.5 pb-1.5">
        {character ? (
          <div
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : onDragStartChar}
            onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onClickChar?.() }}
            className={`flex items-center gap-1.5 p-1 rounded select-none transition-colors ${
              readOnly
                ? ''
                : isSelected
                  ? 'bg-amber-500/15 ring-1 ring-amber-400/40 cursor-grab active:cursor-grabbing'
                  : 'hover:bg-stone-600/40 cursor-grab active:cursor-grabbing'
            }`}
          >
            <CharacterPortrait character={character} size={24} />
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-stone-200 truncate max-w-[56px]">{character.nickname}</div>
              <div className="text-[8px] font-bold" style={{ color: GRADE_COLORS[character.grade] }}>{character.grade}</div>
            </div>
          </div>
        ) : !isConstructing ? (
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (onClickAssign) onClickAssign()
              else onClickAssignHint?.()
            }}
            className={`text-[9px] text-center py-1.5 rounded transition-colors ${
              onClickAssign
                ? 'text-amber-400/60 cursor-pointer hover:bg-amber-500/5 hover:text-amber-300'
                : onClickAssignHint
                  ? 'text-stone-600 cursor-pointer hover:text-stone-400'
                  : 'text-stone-700'
            }`}
          >
            {onClickAssign ? '+ 배치' : '빈'}
          </div>
        ) : null}
      </div>

      {/* 건물 컨텍스트 메뉴 — readOnly 시 숨김 */}
      {showMenu && !readOnly && (
        <div className="absolute z-50 top-full right-0 mt-1 bg-stone-900 border border-stone-600 rounded shadow-xl text-[10px] min-w-[72px]">
          {character && onUnassign && (
            <button onClick={() => { onUnassign(); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-stone-700 text-stone-300">
              해제
            </button>
          )}
          {!isConstructing && onDemolish && (
            <button onClick={() => { onDemolish(); setShowMenu(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-stone-700 text-red-400">
              철거
            </button>
          )}
          <button onClick={() => setShowMenu(false)}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-700 text-stone-500">
            닫기
          </button>
        </div>
      )}
    </div>
  )
}

// ── 인물 칩 (대기/훈련 풀용) ──

function CharacterChip({
  character, isSelected, status, onClick, onDragStart, readOnly,
}: {
  character: GameCharacter
  isSelected: boolean
  status?: string
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  readOnly?: boolean
}) {
  return (
    <div
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : onDragStart}
      onClick={readOnly ? undefined : onClick}
      className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded border text-[11px] select-none transition-all ${
        readOnly
          ? 'border-stone-600 bg-stone-700/50 text-stone-300'
          : isSelected
            ? 'border-amber-400 bg-amber-500/15 text-amber-200 cursor-grab active:cursor-grabbing'
            : 'border-stone-600 bg-stone-700/50 text-stone-300 hover:border-stone-500 cursor-grab active:cursor-grabbing'
      }`}
    >
      <CharacterPortrait character={character} size={20} />
      <span className="font-medium truncate max-w-[56px]">{character.nickname}</span>
      {status && <span className="text-[9px] text-blue-400">{status}</span>}
    </div>
  )
}
