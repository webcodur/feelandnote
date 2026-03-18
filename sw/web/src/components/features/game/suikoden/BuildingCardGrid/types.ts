import type { GameState, Territory } from '@/lib/game/suikoden/types'

export interface BuildingCardGridProps {
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
