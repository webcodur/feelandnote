'use server'

/**
 * 자산 보관소 — D:\remotion-assets 와 public/ 사이를 오가는 백오피스 창구.
 *
 * 규칙·동작은 전부 `@feelandnote/shared/bo/asset-archive` 소유다. 렌더 저장소의 `pnpm assets` 가 같은 함수를
 * 쓴다. 여기서는 사람 확인, 시리즈 → 폴더 대응, 그리고 이 저장소만의 금지 하나(담화는 풀지 않는다)만 얹는다.
 */

import {
  ASSET_ARCHIVE_ROOT, ASSET_SERIES, archiveAssetUnit, isAssetArchiveAvailable, scanAssetUnits, stageAssetUnit,
  unstageAssetUnit, type AssetSeries, type AssetUnit,
} from '@feelandnote/shared/bo/asset-archive'
import { DISCOURSES_DIR, EPISODES_DIR, FACTIONS_DIR } from '@feelandnote/shared/bo/episode-store'
import { requireAdmin } from '@/lib/admin-auth'
import { REMOTION_LOCAL, assertRemotionLocal } from '@/lib/remotion-local'

export type { AssetSeries, AssetUnit }

const SERIES_DIR: Record<AssetSeries, string> = {
  factions: FACTIONS_DIR,
  episodes: EPISODES_DIR,
  discourses: DISCOURSES_DIR,
}

function seriesDirOf(series: string): string {
  if (!(ASSET_SERIES as readonly string[]).includes(series)) throw new Error(`시리즈는 ${ASSET_SERIES.join('·')} 중 하나다`)
  return SERIES_DIR[series as AssetSeries]
}

export interface AssetArchiveSnapshot {
  /** 이 컴퓨터에 보관소가 있고 렌더 저장소가 로컬인가. 아니면 화면은 안내만 한다. */
  available: boolean
  archiveRoot: string
  units: AssetUnit[]
}

/** 세 시리즈 상태표. 보관소가 없는 컴퓨터에서는 빈 표를 돌려준다. */
export async function loadAssetArchive(): Promise<AssetArchiveSnapshot> {
  await requireAdmin()
  const available = REMOTION_LOCAL && isAssetArchiveAvailable()
  return {
    available,
    archiveRoot: ASSET_ARCHIVE_ROOT,
    units: available ? ASSET_SERIES.flatMap(s => scanAssetUnits(SERIES_DIR[s])) : [],
  }
}

/** 보관소 편을 작업 폴더에 건다. */
export async function stageAsset(series: string, name: string): Promise<AssetUnit[]> {
  await requireAdmin()
  assertRemotionLocal()
  stageAssetUnit(seriesDirOf(series), name)
  return scanAssetUnits(seriesDirOf(series))
}

/** 정션만 푼다. 담화는 git 이 파일을 추적해 풀면 삭제로 잡히므로 막는다. */
export async function unstageAsset(series: string, name: string): Promise<AssetUnit[]> {
  await requireAdmin()
  assertRemotionLocal()
  if (series === 'discourses') throw new Error('담화는 git이 파일을 추적합니다. 풀면 삭제로 잡히니 걸어 둔 채로 씁니다.')
  unstageAssetUnit(seriesDirOf(series), name)
  return scanAssetUnits(seriesDirOf(series))
}

/** public 실체를 보관소로 옮기고 정션으로 되건다. 수백 MB 면 수십 초 걸린다. */
export async function archiveAsset(series: string, name: string): Promise<AssetUnit[]> {
  await requireAdmin()
  assertRemotionLocal()
  archiveAssetUnit(seriesDirOf(series), name)
  return scanAssetUnits(seriesDirOf(series))
}
