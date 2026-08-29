'use server'

/**
 * 세력도감 출간 — 제작 데이터의 사진·영상·음악·태그를 서비스(세력도감)에 반영한다.
 *
 * **인물 텍스트(대사·직함·소개)는 출간 대상이 아니다(26.08.03 단일화).** 웹·BO 모두 DB 뷰
 * `faction_atlas_members` 로 faction_people 을 직접 읽으므로 저장 즉시 도감에 반영된다.
 * 출간이 나르는 것은 파일과 기록뿐이다.
 *   faction_groups.tag_id → celeb_tags (행 생성·이름·색 채움)
 *   개인 화보+대사 음성 → 저장소 업로드 + faction_people.web_image_url/web_quote_media (같은 셀럽이 여러 자리에
 *            있으면 앞자리 행에만 기록 — 뷰가 앞자리를 채택한다. 문서 §4 배치 충돌 규칙)
 *   그룹샷 → 이미지 저장소 업로드 + celeb_tags.team_images
 *   유튜브 영상·테마 음악 → celeb_tags.youtube_videos·theme_music
 *
 * 이 파일은 **사람 확인과 환경 점검만** 한다. 진단은 `lib/faction-sync/diagnose`,
 * 실제 반영은 `lib/faction-sync/publish` 소유다 — 액션 안에 로직을 두면 Next 밖에서 부를 수 없어
 * 검증이 불가능하다(대본 저장이 `lib/faction-save` 로 빠져 있는 것과 같은 이유다).
 *
 * 사진·팩션 대사 음성은 렌더 저장소(sw/remotion/public/factions/)의 로컬 파일이라 `FACTION_LOCAL=1` 이 필요하다.
 * 태그만 다루는 범위는 그 없이도 돈다.
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
  if (missing.length) throw new Error(`DB 관리자 접속 환경변수 누락: ${missing.join(', ')}`)
}

/**
 * 진단 — 무엇이 어긋나 있는지 읽기만 한다. 아무것도 쓰지 않는다.
 *
 * 보고 항목(문서 §9 개조 방향): DB 인물 연결 무결성 · 태그 미지정 세력 · 사진 저장소 동기 상태 ·
 * 얼굴 사진 유무 · 신화 표시와 셀럽 등급 어긋남. **텍스트 대조는 없다** — 제작과 서비스가 한 집이다.
 */
export async function diagnoseFactionPublish(folder: string): Promise<FactionSyncStatus> {
  await guard()
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  return buildStatus(factionAdminClient(), folder)
}

/**
 * 출간 — 태그·사진·영상·음악을 서비스로 채운다. 인물 텍스트는 뷰가 직접 읽으므로 다루지 않는다.
 *
 * `dryRun` 이면 쓰기 직전까지 똑같이 계산하고 변경 예정 목록만 돌려준다.
 * 사진 범위를 켰는데 렌더 저장소가 연결돼 있지 않으면(FACTION_LOCAL 미설정) 그 사실을 알린다 —
 * 조용히 사진을 건너뛰면 "올렸는데 안 보인다"가 된다.
 */
export async function publishFactionEpisode(req: FactionPublishRequest): Promise<FactionPublishResult> {
  await guard()
  if (!req?.folder) throw new Error('에피소드 폴더명이 필요합니다')

  // 사진(로컬 파일)·테마 영상(업로드 기록)·테마 음악(선곡 도구와 mp3)은 모두 렌더 저장소를 읽는다
  const scope = req.scope
  const wantsLocalFiles = !scope
    || !Object.values(scope).some(v => v === true)   // 아무것도 안 켜면 전 범위 실행이다
    || scope.personImages === true
    || scope.logos === true
    || scope.teamImages === true
    || scope.videos === true
    || scope.music === true
  if (wantsLocalFiles && !FACTION_LOCAL) {
    throw new Error(
      '사진·영상·음악 출간은 렌더 저장소(sw/remotion)가 같은 컴퓨터에 있을 때만 됩니다. '
      + 'sw/web-bo/.env 에 FACTION_LOCAL=1 을 넣고 개발 서버를 다시 띄우세요.',
    )
  }

  return publishEpisode(factionAdminClient(), req)
}
