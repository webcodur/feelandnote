import { FACTION_SCENE_DEFAULT_SEC } from '@feelandnote/shared/lib/faction-scene-timing'
import type { FactionSceneBeat } from '@/lib/faction-types'

export const FACTION_CUT_DEFAULT_SEC = FACTION_SCENE_DEFAULT_SEC

/** 장면 경계는 유지한 채 화면·본문·화자를 담을 새 컷 하나를 만든다. */
export function createFactionCut(): FactionSceneBeat {
  return {
    text: '',
    // 빈 컷도 렌더 타이밍에서 사라지지 않고 실제 화면 구간을 갖게 한다.
    minimumSec: FACTION_CUT_DEFAULT_SEC,
  }
}

/** 현재 장면의 beats 안에 컷을 끼운다. 인물·음성 좌표는 건드리지 않는다. */
export function insertFactionCut(
  beats: readonly FactionSceneBeat[],
  at: number,
): FactionSceneBeat[] {
  const index = Math.min(Math.max(Math.trunc(at), 0), beats.length)
  const next = [...beats]
  next.splice(index, 0, createFactionCut())
  return next
}
