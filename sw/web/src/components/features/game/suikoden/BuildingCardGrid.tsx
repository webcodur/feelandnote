'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { GameState, Territory, BuildingCard as BuildingCardType, GameCharacter, ThreatCard as ThreatCardType } from '@/lib/game/suikoden/types'
import { BUILDINGS, BUILDING_CATEGORY, BUILDING_CATEGORY_INFO, GRADE_COLORS } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

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
  const tS = useTranslations('rest.arena.suikoden')
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [infoBuilding, setInfoBuilding] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState(false)

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
    else if (p.task === 'idle' && p.assignedBuildingId) { /* 건물에서 휴식 중 -> 건물 슬롯에 표시 */ }
    else if (p.task === 'training') trainingChars.push(m)
    else if (p.task === 'building') buildingChars.push(m)
    else if (p.task === 'hunting') huntingChars.push(m)
    // working chars are shown inside their building
  }

  const selectedPlacement = selectedCharId
    ? state.placements.find(p => p.characterId === selectedCharId)
    : null
  const canBuild = !readOnly && (selectedPlacement?.task === 'idle' || selectedPlacement?.task === 'working') && hasRoom

  // region DND
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
    const occupant = card.isConstructing ? card.constructionWorkerId : card.assigneeId
    if (occupant === charId) return
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
  // endregion

  const categories = ['agriculture', 'commerce', 'military', 'culture'] as const

  // 위협 (이 영토)
  const threats = state.threats.filter(t => t.territoryId === territory.id)

  // 방문자 (이 영토)
  const visitors = state.tavernVisitors.filter(v => v.territoryId === territory.id)
  const hasTavern = territory.buildingCards.some(c => c.defId === 'tavern' && !c.isConstructing)

  return (
    <div className="relative border border-stone-700 rounded-lg p-3 overflow-hidden">
      {/* 거점 배경 이미지 */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${viewMode ? 'opacity-100' : 'opacity-30'}`}
        style={{ backgroundImage: `url(/images/game/suikoden/territories/${territory.id}.png)` }}
      />
      <div className={`absolute inset-0 transition-colors duration-500 ${viewMode ? 'bg-stone-900/30' : 'bg-stone-900/80'}`} />

      {/* 감상모드 오버레이 */}
      {viewMode && (
        <div className="absolute inset-0 z-20 flex items-end justify-end p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 font-serif">{territory.name}</span>
            <button
              onClick={() => setViewMode(false)}
              className="w-7 h-7 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`relative z-10 space-y-3 ${viewMode ? 'invisible' : ''}`}>
      {/* region 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-200">{territory.name}</span>
          <span className="text-[10px] text-stone-500">{tS('mgmt.buildingCount', { current: slotUsed, max: slotMax })}</span>
          <button
            onClick={() => setViewMode(true)}
            className="text-[10px] text-stone-500 hover:text-amber-300 transition-colors"
            title={tS('mgmt.viewBackground')}
          >
            🖼️
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-400">
          <span>{tS('mgmt.population')} {territory.population.toLocaleString()}</span>
          <span className={territory.morale >= 50 ? 'text-green-400' : 'text-red-400'}>
            {tS('mgmt.publicOrder')} {Math.round(territory.morale)}
          </span>
        </div>
      </div>
      {/* endregion */}

      {/* region 2열 레이아웃: 좌=건물, 우=인물풀 */}
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
                  {tS(`bldgCat.${cat}`)}
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
                              tS={tS}
                              buildingName={tS(`bldg.${bDef.id}`)}
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
                                  ? () => onToast(tS('mgmt.toastSelectCharFirst'))
                                  : undefined
                              }
                              onUnassign={readOnly ? undefined : (card.assigneeId || card.constructionWorkerId) ? () => onUnassign((card.assigneeId ?? card.constructionWorkerId)!) : undefined}
                              onDemolish={readOnly ? undefined : () => onDemolish(card.instanceId)}
                              onClickInfo={() => setInfoBuilding(bDef.id)}
                              readOnly={readOnly}
                            />
                          )
                        })}

                        {/* 신규 건설 -- readOnly 시 숨김 */}
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
                            title={`${tS(`bldg.${bDef.id}`)} (${tS('mgmt.goldCost', { amount: bDef.costGold })}${bDef.costMaterial > 0 ? ` ${tS('mgmt.materialCost', { amount: bDef.costMaterial })}` : ''}${bDef.requireStat ? ` ${tS('mgmt.statMinArrow', { stat: tS(`stat.${bDef.requireStat}`), min: bDef.requireStatMin ?? 0 })}` : ''}) ${tS('mgmt.buildTurnUnit', { turns: bDef.buildTurns })}`}
                          >
                            <span
                              className="cursor-pointer hover:text-amber-300 transition-colors"
                              onClick={() => setInfoBuilding(bDef.id)}
                            >
                              {tS(`bldg.${bDef.id}`)}
                            </span>
                            <span className={`ml-0.5 ${canAfford ? 'text-stone-600' : 'text-stone-700/50'}`}>{tS('mgmt.buildTurnUnit', { turns: bDef.buildTurns })}</span>
                            {canAfford && (
                              <span
                                className="text-xs cursor-pointer hover:text-amber-300 transition-colors ml-0.5"
                                onClick={() => {
                                  if (!selectedCharId) {
                                    onToast(tS('mgmt.toastSelectBuilderFirst'))
                                  } else if (selectedPlacement?.task === 'training') {
                                    onToast(tS('mgmt.toastTrainingCannotBuild'))
                                  } else if (selectedPlacement?.task === 'building') {
                                    onToast(tS('mgmt.toastAlreadyBuilding'))
                                  } else if (bDef.requireStat && bDef.requireStatMin) {
                                    const char = (playerFaction?.members ?? []).find(m => m.id === selectedCharId)
                                    if (char && char.stats[bDef.requireStat] < bDef.requireStatMin) {
                                      onToast(tS('mgmt.statRequirementCurrent', {
                                        building: tS(`bldg.${bDef.id}`),
                                        stat: tS(`stat.${bDef.requireStat}`),
                                        min: bDef.requireStatMin,
                                        current: char.stats[bDef.requireStat],
                                      }))
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
          {/* region 대기 */}
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
              <span className="text-[10px] font-bold text-stone-400">{tS('mgmt.idle')}</span>
              <span className="text-[10px] text-stone-600">{tS('mgmt.countSuffix', { count: idleChars.length })}</span>
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
              <p className="text-[10px] text-stone-600">{tS('mgmt.noIdleChars')}</p>
            )}
          </div>
          {/* endregion */}

          {/* region 훈련 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 px-2">
              <span className="text-[10px] font-bold text-blue-400">{tS('mgmt.training')}</span>
              <span className="text-[10px] text-stone-600">{tS('mgmt.countSuffix', { count: trainingChars.length })}</span>
            </div>
            {trainingChars.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 px-2">
                {trainingChars.map(char => (
                  <CharacterChip
                    key={char.id}
                    character={char}
                    isSelected={!readOnly && selectedCharId === char.id}
                    status={tS('mgmt.training')}
                    onClick={readOnly ? () => {} : () => onSelectChar(char.id === selectedCharId ? null : char.id)}
                    onDragStart={readOnly ? () => {} : (e) => handleDragStart(e, char.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-stone-600 px-2">{tS('mgmt.noTrainingChars')}</p>
            )}
          </div>
          {/* endregion */}

          {/* region 출몰 -- readOnly 시 숨김 */}
          {!readOnly && threats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[10px] font-bold text-red-400">{tS('mgmt.threats')}</span>
                <span className="text-[10px] text-stone-600">{tS('mgmt.countCases', { count: threats.length })}</span>
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
                            <span className="text-[10px] font-medium text-stone-200">{tS(`threat.${threat.type}`)}</span>
                            <span className="text-[9px] text-red-400">{tS('mgmt.threatPower', { value: threat.power })}</span>
                          </div>
                          <span className="text-[9px] text-stone-500">{tS('mgmt.threatDamageIn', { turns: turnsLeft })}</span>
                        </div>
                      </div>
                      {assignedChar ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <CharacterPortrait character={assignedChar} size={20} />
                          <span className="text-[10px] text-amber-300 flex-1">{tS('mgmt.subjugating', { nickname: assignedChar.nickname })}</span>
                          <button
                            onClick={() => onRecall(assignedChar.id)}
                            className="px-1.5 py-0.5 rounded bg-stone-700/50 border border-stone-600/50 text-[9px] text-stone-400 hover:text-stone-200 transition-colors"
                          >
                            {tS('mgmt.unassign')}
                          </button>
                        </div>
                      ) : selectedCharId && selectedPlacement?.task !== 'hunting' ? (
                        <button
                          onClick={() => onDispatch(selectedCharId, threat.id)}
                          className="mt-1.5 w-full px-2 py-1 rounded bg-red-900/40 border border-red-700/50 text-[10px] text-red-300 hover:bg-red-800/50 transition-colors"
                        >
                          {tS('mgmt.dispatchSubjugate')}
                        </button>
                      ) : (
                        <p className="mt-1 text-[9px] text-stone-600">{tS('mgmt.selectToAssign')}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* endregion */}

          {/* region 방문 -- readOnly 시 숨김 */}
          {!readOnly && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[10px] font-bold text-emerald-400">{tS('mgmt.visitors')}</span>
                <span className="text-[10px] text-stone-600">{tS('mgmt.countSuffix', { count: visitors.length })}</span>
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
                              <span className="text-[9px] text-stone-500">{tS('mgmt.visitorLeaveIn', { turns: turnsLeft })}</span>
                            </div>
                          </div>
                          {assignedRecruiter ? (
                            <div className="flex items-center gap-2 mt-1.5">
                              <CharacterPortrait character={assignedRecruiter} size={20} />
                              <span className="text-[10px] text-emerald-300 flex-1">{tS('mgmt.recruiting', { nickname: assignedRecruiter.nickname })}</span>
                              <button
                                onClick={() => onCancelRecruiter(v.character.id)}
                                className="px-1.5 py-0.5 rounded bg-stone-700/50 border border-stone-600/50 text-[9px] text-stone-400 hover:text-stone-200 transition-colors"
                              >
                                {tS('mgmt.unassign')}
                              </button>
                            </div>
                          ) : selectedCharId ? (
                            <button
                              onClick={() => onAssignRecruiter(v.character.id, selectedCharId)}
                              className="mt-1.5 w-full px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700/50 text-[10px] text-emerald-300 hover:bg-emerald-800/50 transition-colors"
                            >
                              {tS('mgmt.assign')}
                            </button>
                          ) : (
                            <p className="mt-1 text-[9px] text-stone-600">{tS('mgmt.selectToRecruit')}</p>
                          )}
                          {assignedRecruiter && (
                            <p className="text-[8px] text-stone-500 mt-1">{tS('mgmt.recruitNextTurn')}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-stone-600 px-2">{tS('mgmt.noVisitors')}</p>
                )
              ) : (
                <p className="text-[10px] text-stone-600 px-2">{tS('mgmt.tavernHint')}</p>
              )}
            </div>
          )}
          {/* endregion */}
        </div>
      </div>
      {/* endregion */}

      {/* 건물 정보 모달 */}
      {infoBuilding && <BuildingInfoModal defId={infoBuilding} onClose={() => setInfoBuilding(null)} />}
      </div>
    </div>
  )
}

// region 건물 정보 모달

function BuildingInfoModal({ defId, onClose }: { defId: string; onClose: () => void }) {
  const tS = useTranslations('rest.arena.suikoden')
  const bDef = BUILDINGS.find(b => b.id === defId)
  if (!bDef) return null

  const desc = tS(`bldgDesc.${defId}`)
  const e = bDef.effect

  const effects: string[] = []
  if (e.goldPerTurn) effects.push(`${tS('mgmt.goldLabel')} +${e.goldPerTurn}${tS('mgmt.perMonth')}`)
  if (e.foodPerTurn) effects.push(`${tS('mgmt.foodLabel')} +${e.foodPerTurn}${tS('mgmt.perMonth')}`)
  if (e.knowledgePerTurn) effects.push(`${tS('mgmt.knowledgeLabel')} +${e.knowledgePerTurn}${tS('mgmt.perMonth')}`)
  if (e.materialPerTurn) effects.push(`${tS('mgmt.materialLabel')} +${e.materialPerTurn}${tS('mgmt.perMonth')}`)
  if (e.troopsPerTurn) effects.push(`${tS('mgmt.troopsLabel')} +${e.troopsPerTurn}${tS('mgmt.perMonth')}`)
  if (e.moralePerTurn) effects.push(`${tS('mgmt.moraleResLabel')} +${e.moralePerTurn}${tS('mgmt.perMonth')}`)
  if (e.defenseBonus) effects.push(tS('mgmt.defenseBonus', { value: e.defenseBonus }))
  if (e.culturePerTurn) effects.push(`${tS('mgmt.cultureLabel')} +${e.culturePerTurn}${tS('mgmt.perMonth')}`)

  const costs: string[] = []
  if (bDef.costGold) costs.push(`${tS('mgmt.goldLabel')} ${bDef.costGold}`)
  if (bDef.costMaterial) costs.push(`${tS('mgmt.materialLabel')} ${bDef.costMaterial}`)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-xs w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bDef.icon}</span>
            <span className="text-sm font-bold text-stone-100">{tS(`bldg.${bDef.id}`)}</span>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">{desc}</p>

        <div className="space-y-1.5">
          {effects.length > 0 && (
            <div>
              <div className="text-[10px] text-stone-500 mb-0.5">{tS('mgmt.effectWithBonus')}</div>
              <div className="flex flex-wrap gap-1.5">
                {effects.map(eff => (
                  <span key={eff} className="text-[10px] px-1.5 py-0.5 bg-stone-700 rounded text-emerald-300">{eff}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="text-stone-500 mb-0.5">{tS('mgmt.buildCost')}</div>
              <div className="text-stone-300">{costs.join(', ') || tS('mgmt.costNone')}</div>
            </div>
            <div>
              <div className="text-stone-500 mb-0.5">{tS('mgmt.buildDuration')}</div>
              <div className="text-stone-300">{tS('mgmt.buildTurnUnit', { turns: bDef.buildTurns })}</div>
            </div>
          </div>

          {bDef.requireStat && bDef.requireStatMin && (
            <div className="text-[10px]">
              <span className="text-stone-500">{tS('mgmt.buildRequirement')}: </span>
              <span className="text-amber-300">{tS('mgmt.statRequirement', { stat: tS(`stat.${bDef.requireStat}`), min: bDef.requireStatMin })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// endregion

// region 건물 슬롯

function BuildingSlot({
  tS, buildingName, buildingDefId, index, isConstructing, isResting, turnsLeft, buildTurnsTotal,
  character, catColor, isDragOver, isSelected,
  onDragOver, onDragLeave, onDrop,
  onDragStartChar, onClickChar, onClickAssign, onClickAssignHint,
  onUnassign, onDemolish, onClickInfo, readOnly,
}: {
  tS: ReturnType<typeof useTranslations>
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
          <span className="text-[9px] text-amber-500/80">{tS('mgmt.buildProgress', { current: buildTurnsTotal - turnsLeft, total: buildTurnsTotal })}</span>
        ) : character && !isResting ? (
          <span className="text-[9px] text-emerald-400">{tS('mgmt.fullCapacity')}</span>
        ) : character && isResting ? (
          <span className="text-[9px] text-stone-500">{tS('mgmt.resting')}</span>
        ) : (
          <span className="text-[9px] text-stone-500">{tS('mgmt.operating')}</span>
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
            {onClickAssign ? tS('mgmt.assignWorker') : tS('mgmt.emptySlot')}
          </div>
        ) : null}
      </div>

      {/* 건물 컨텍스트 메뉴 -- readOnly 시 숨김 */}
      {showMenu && !readOnly && (
        <div className="absolute z-50 top-full right-0 mt-1 bg-stone-900 border border-stone-600 rounded shadow-xl text-[10px] min-w-[72px]">
          {character && onUnassign && (
            <button onClick={() => { onUnassign(); setShowMenu(false) }}
              className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-stone-300">
              {tS('mgmt.unassign')}
            </button>
          )}
          {!isConstructing && onDemolish && (
            <button onClick={() => { onDemolish(); setShowMenu(false) }}
              className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-red-400">
              {tS('mgmt.demolish')}
            </button>
          )}
          <button onClick={() => setShowMenu(false)}
            className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-stone-500">
            {tS('mgmt.close')}
          </button>
        </div>
      )}
    </div>
  )
}

// endregion

// region 인물 칩 (대기/훈련 풀용)

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

// endregion
