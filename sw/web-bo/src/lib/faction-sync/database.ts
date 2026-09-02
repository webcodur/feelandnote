/**
 * 출간이 만지는 서비스 테이블의 행 형태 — 서버 전용.
 *
 * 클라이언트 생성은 `lib/faction-db.ts` 의 `factionAdminClient()`(service_role)를 그대로 쓴다.
 * 이 파일은 ① 환경변수 누락을 조용히 넘기지 않도록 미리 점검하는 함수와
 * ② 출간이 읽고 쓰는 테이블의 행 형태만 못박는다(제네릭 Database 타입 미도입 저장소).
 *
 * celeb_tag_assignments 는 다루지 않는다 — 인물 텍스트·개인샷은 faction_people(web_* 칸)이
 * 단일 원천이고(26.08.03), 배정 테이블에는 웹 전용(제작에 없는) 명단만 남는다.
 */

import { toTeamImageUrls } from '@feelandnote/shared/lib/faction-team-image'
import { factionAdminClient } from '@/lib/faction-db'

/** celeb_tags — 도감의 세력 1행 */
export interface CelebTagRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  color: string | null
  team_images: unknown
  /**
   * 이 테마와 이어진 유튜브 영상(롱폼·쇼츠). 원천은 제작·업로드 기록이라
   * 출간이 항상 되쓴다 — 기록이 없으면 null 로 비운다.
   */
  youtube_videos: unknown
  /**
   * 이 테마 구간에서 흐르는 배경음악. 렌더 엔진의 선곡이 원천이라
   * 출간이 항상 되쓴다 — 흐르는 곡이 없으면 null 로 비운다.
   */
  theme_music: unknown
  is_featured: boolean | null
  /** 신화·전설·허구 인물 테마. 컬렉션 화면에서 실존 인물 테마와 분리한다. */
  is_fiction: boolean | null
  sort_order: number | null
}

/** celebs — 셀럽 프로필(읽기 전용. 출간은 이 테이블에 쓰지 않는다) */
export interface CelebProfileRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  celeb_tier: string | null
  /** 국문 대사에 쓰는 ElevenLabs 목소리 — 진단이 인물 국문 대사 목소리와 견준다 */
  voice_id_ko: string | null
  /** 영문 대사에 쓰는 ElevenLabs 목소리 — 진단이 인물 영문 대사 목소리와 견준다 */
  voice_id_en: string | null
}

export const TAG_COLUMNS = 'id, slug, name, name_en, color, team_images, youtube_videos, theme_music, is_featured, is_fiction, sort_order'
export const PROFILE_COLUMNS = 'id, slug, nickname, avatar_url, celeb_tier, voice_id_ko, voice_id_en'

/** 출간에 필요한 DB 관리자 접속 환경변수 중 빈 것들 */
export function missingDatabaseEnv(): string[] {
  return (['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY'] as const).filter(k => !process.env[k])
}

/**
 * 쓰기용 클라이언트. `factionAdminClient()` 가 환경변수 누락 시 즉시 던진다 —
 * 키 없이 만든 클라이언트는 호출 시점에야 알 수 없는 오류로 터진다.
 *
 * ⚠ service_role 은 RLS 를 우회한다. 부르기 전에 반드시 `requireFactionAdmin()` 으로 사람을 확인하라.
 */
export function adminClient() {
  return factionAdminClient()
}

/**
 * team_images(jsonb) → 사진 주소 배열.
 *
 * 저장 형태는 「주소 + 담긴 인물」을 함께 쥔 항목이지만, 장수만 세거나 주소만 견주는 자리가
 * 많아 지름길을 남긴다. 예전에 저장된 문자열 배열도 같이 읽힌다.
 */
export function toImageArray(v: unknown): string[] {
  return toTeamImageUrls(v)
}
