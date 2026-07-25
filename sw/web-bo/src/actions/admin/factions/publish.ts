'use server'

/**
 * 세력도 출간 — 제작 데이터를 서비스(세력도감)로 투영한다. **뼈대만 있고 아직 동작하지 않는다.**
 *
 * 방향은 제작 → 서비스 **단방향·채움 전용**이다(문서 §4). 되돌아오는 길은 없다.
 *   faction_groups.tag_id  → celeb_tags
 *   faction_people.celeb_id → celeb_tag_assignments (같은 셀럽이 여러 자리에 있으면
 *                             세력·묶음·인물 순번이 가장 앞인 자리를 채택 — 문서 §4 배치 충돌 규칙)
 *   개인샷·그룹샷 → R2 (불변 캐시 + ?v= 정책)
 *
 * ## 왜 지금 비어 있나
 *
 * 실제 투영·이미지 배관은 이미 만들어져 돌고 있고, 지금은 영상 관리 대시보드 쪽에 있다:
 *   sw/remotion-bo/src/lib/faction-sync/{publish,diff,image,r2,manifest,supabase}.ts
 *   sw/remotion-bo/src/app/api/faction/db-sync/{publish,status}
 * 그 코드를 옮겨오는 것이 다음 단계(문서 §10 Phase 5)의 일이다. 이 단계(4a)는 데이터·파일 계약만
 * 완성하므로, 여기서는 **부를 이름과 주고받을 모양만 못 박아** 편집기 화면이 미리 붙을 수 있게 한다.
 *
 * 옮길 때 바뀌는 점(문서 §9):
 *   - `collectEpisode` 의 입력이 파일이 아니라 DB 다 → `assembleFactionEpisode` 를 쓰면 된다.
 *   - 텍스트 진단은 사라진다(제작·서비스가 한 DB 안이라 대조할 이유가 없다).
 *     남는 진단은 이미지와 셀럽 연결뿐이다.
 *   - 캐시는 출간할 때만 건드린다 — `[TAGS, CELEBS]`.
 */

import { requireFactionAdmin } from '@/lib/faction-db'

/** 무엇까지 내보낼지 */
export interface FactionPublishScope {
  /** 태그(세력) 자체 */
  tags?: boolean
  /** 태그에 붙는 인물 배정 */
  assignments?: boolean
  /** 인물 개인샷 */
  soloShots?: boolean
  /** 세력 그룹샷 */
  teamShots?: boolean
}

export type FactionPublishAction = 'created' | 'updated' | 'skipped' | 'blocked'

export interface FactionPublishItem {
  kind: 'tag' | 'assignment' | 'soloShot' | 'teamShots' | 'revalidate'
  /** 사람이 알아볼 대상 이름(세력명·인물명) */
  target: string
  action: FactionPublishAction
  /** skipped·blocked 인 이유 */
  reason?: string
}

export interface FactionPublishResult {
  folder: string
  /** 실제로 반영했는가. 진단(dry-run)이면 false */
  applied: boolean
  items: FactionPublishItem[]
  /** 아직 옮겨오지 않은 기능을 불렀을 때의 안내 */
  notice?: string
}

const NOT_YET =
  '출간 기능은 아직 이 화면으로 옮겨오지 않았습니다. 현재는 영상 관리 대시보드(remotion-bo)의 '
  + '「출간」 패널에서 처리합니다. 이 화면으로의 이전은 다음 단계 작업입니다.'

/**
 * 진단만 — 무엇이 바뀔지 미리 본다. 아직 비어 있다.
 *
 * TODO(Phase 5): remotion-bo `faction-sync/diff.ts` 의 진단을 옮겨온다.
 *   입력을 파일에서 DB(`assembleFactionEpisode`)로 바꾸고, 텍스트 진단은 버린다.
 */
export async function diagnoseFactionPublish(
  folder: string, scope: FactionPublishScope = {},
): Promise<FactionPublishResult> {
  await requireFactionAdmin()
  void scope // Phase 5 에서 진단 범위로 쓴다
  return { folder, applied: false, items: [], notice: NOT_YET }
}

/**
 * 실제 출간 — 태그·배정·이미지를 서비스로 채운다. 아직 비어 있다.
 *
 * TODO(Phase 5): remotion-bo `faction-sync/publish.ts`(publishEpisode)를 옮겨온다.
 *   텍스트 투영은 DB→DB 라 SQL 한 번으로 줄고, r2·image·manifest 배관은 그대로 쓴다.
 *   끝에 캐시 무효화 `[TAGS, CELEBS]` 를 붙인다 — 제작 데이터는 서비스에 안 나오므로 그 외에는 불필요.
 */
export async function publishFactionEpisode(
  folder: string, scope: FactionPublishScope = {},
): Promise<FactionPublishResult> {
  await requireFactionAdmin()
  void scope // Phase 5 에서 출간 범위로 쓴다
  return { folder, applied: false, items: [], notice: NOT_YET }
}
