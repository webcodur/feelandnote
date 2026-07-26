'use server'

/**
 * 세력도 출간 — 제작 데이터를 서비스(세력도감)로 투영한다.
 *
 * 방향은 제작 → 서비스 **단방향·채움 전용**이다(문서 §4). 되돌아오는 길은 없다.
 *   faction_groups.tag_id   → celeb_tags
 *   faction_people.celeb_id → celeb_tag_assignments (같은 셀럽이 여러 자리에 있으면
 *                             세력·묶음·인물 순번이 가장 앞인 자리를 채택 — 문서 §4 배치 충돌 규칙)
 *   개인샷·그룹샷 → 이미지 저장소(불변 캐시 + ?v= 정책)
 *
 * 이 파일은 **사람 확인과 환경 점검만** 한다. 진단은 `lib/faction-sync/diagnose`,
 * 실제 투영은 `lib/faction-sync/publish` 소유다 — 액션 안에 로직을 두면 Next 밖에서 부를 수 없어
 * 검증이 불가능하다(대본 저장이 `lib/faction-save` 로 빠져 있는 것과 같은 이유다).
 *
 * 사진은 렌더 저장소(sw/remotion/public/factions/)의 로컬 파일이라 `FACTION_LOCAL=1` 이 필요하다.
 * 텍스트만 투영하는 범위는 그 없이도 돈다.
 */

import { requireFactionAdmin, factionAdminClient } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import { buildStatus } from '@/lib/faction-sync/diagnose'
import { publishEpisode } from '@/lib/faction-sync/publish'
import { missingSupabaseEnv } from '@/lib/faction-sync/supabase'
import type {
  FactionPublishRequest, FactionPublishResult, FactionSyncStatus,
} from '@/lib/faction-sync/types'

/** 사람 확인 + 환경 점검. 조용한 폴백 금지 — 키가 없으면 사유를 들고 던진다 */
async function guard(): Promise<void> {
  await requireFactionAdmin()
  const missing = missingSupabaseEnv()
  if (missing.length) throw new Error(`Supabase 환경변수 누락: ${missing.join(', ')}`)
}

/**
 * 진단 — 무엇이 어긋나 있는지 읽기만 한다. 아무것도 쓰지 않는다.
 *
 * 보고 항목(문서 §9 개조 방향): 셀럽 미해소 인물 · 태그 미지정 세력 · 사진 저장소 동기 상태 ·
 * 얼굴 사진 유무 · 신화 표시와 셀럽 등급 어긋남. **텍스트 대조는 없다** — 제작과 서비스가 한 집이다.
 */
export async function diagnoseFactionPublish(folder: string): Promise<FactionSyncStatus> {
  await guard()
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  return buildStatus(factionAdminClient(), folder)
}

/**
 * 출간 — 태그·배정·소개문·사진을 서비스로 채운다.
 *
 * `dryRun` 이면 쓰기 직전까지 똑같이 계산하고 변경 예정 목록만 돌려준다.
 * 사진 범위를 켰는데 렌더 저장소가 연결돼 있지 않으면(FACTION_LOCAL 미설정) 그 사실을 알린다 —
 * 조용히 사진을 건너뛰면 "올렸는데 안 보인다"가 된다.
 */
export async function publishFactionEpisode(req: FactionPublishRequest): Promise<FactionPublishResult> {
  await guard()
  if (!req?.folder) throw new Error('에피소드 폴더명이 필요합니다')

  // 사진(로컬 파일)과 테마 영상(업로드 기록 파일)은 둘 다 렌더 저장소를 읽는다
  const scope = req.scope
  const wantsLocalFiles = !scope
    || !Object.values(scope).some(v => v === true)   // 아무것도 안 켜면 전 범위 실행이다
    || scope.personImages === true
    || scope.teamImages === true
    || scope.videos === true
  if (wantsLocalFiles && !FACTION_LOCAL) {
    throw new Error(
      '사진·영상 출간은 렌더 저장소(sw/remotion)가 같은 컴퓨터에 있을 때만 됩니다. '
      + 'sw/web-bo/.env 에 FACTION_LOCAL=1 을 넣고 개발 서버를 다시 띄우세요.',
    )
  }

  return publishEpisode(factionAdminClient(), req)
}
