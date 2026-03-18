import type { GameState, TerritoryId, DialogEntry, TaxRate } from '@/lib/game/suikoden/types'

/** characterId → celeb_dialogues.lines */
export type DialoguesMap = Record<string, Record<string, string[]>>

export interface StrategyScreenProps {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
  onDialog?: (entry: DialogEntry) => void
  dialogues?: DialoguesMap
}

export interface StrategyCommands {
  handleNextTurn: () => void
  handleSelectTerritory: (tId: TerritoryId) => void
  handleBuild: (buildingDefId: string) => void
  handleAssign: (charId: string, buildingInstanceId: string) => void
  handleReassign: (charId: string, buildingInstanceId: string) => void
  handleUnassign: (charId: string) => void
  handleToggleAutoAssign: () => void
  handleToggleDialogMode: () => void
  handleIdle: () => void
  handleTrain: () => void
  handleReward: () => void
  handlePunish: () => void
  handleDemolish: (buildingInstanceId: string) => void
  handleSetTaxRate: (rate: TaxRate) => void
  handleDiplomacy: (action: string, targetFactionId: string) => void
  handleAssignRecruiter: (visitorCharId: string, recruiterCharId: string) => void
  handleCancelRecruiter: (visitorCharId: string) => void
  handleDispatch: (charId: string, threatId: string) => void
  handleRecall: (charId: string) => void
  handleAttack: (targetTerritoryId: TerritoryId) => void
  handleClaim: (territoryId: TerritoryId) => void
  handleGoHome: () => void
  handleAbandon: () => void
  showToast: (msg: string) => void
}
