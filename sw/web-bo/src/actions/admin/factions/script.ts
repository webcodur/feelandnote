'use server'

/**
 * 세력도감 대본 불러오기·저장 — 편집기의 데이터층 입구.
 *
 * DB 가 텍스트·구성의 단일 원천이고 `faction-data.json` 은 렌더용 빌드 산출물이다(문서 §6).
 * 편집기는 예전과 같이 **대본 전체를 한 번에** 저장하고, 그 전체를 원자 저장 함수 한 번으로
 * 갈아끼운다(문서 §8 「저장 방식 실행 전략」). 부분 저장은 후속 최적화로 미룬다 —
 * 저장 도중 끊겨도 DB 가 반쪽으로 남지 않는 것이 먼저다.
 *
 * 이 파일은 **사람 확인과 자동 내보내기·자동 도감 반영 연결만** 한다. 실제 저장 절차는
 * `lib/faction-save`, 조립·분해 규칙은 `@feelandnote/shared/lib/faction-assemble`,
 * 도감 반영 몸통은 `lib/faction-sync/publish` 소유다.
 */

import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { factionAdminClient, factionTreeSource, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import { replaceFactionEpisode } from '@/lib/faction-save'
import { runFactionExport, type FactionExportResult } from '@/lib/faction-export-run'
import { publishEpisode } from '@/lib/faction-sync/publish'

export interface LoadedFactionScript {
  folder: string
  episodeId: string
  /** faction-data.json 과 같은 구조 */
  script: Record<string, unknown>
  /** 낙관적 잠금 기준 — 저장할 때 그대로 되돌려 보낸다 */
  updatedAt: string
  status: string
  registered: boolean
  sortOrder: number
}

/** 편집기가 열 때 — DB 4계층을 한 왕복(중첩 임베드)으로 받아 대본으로 조립한다 */
export async function loadFactionScript(folder: string): Promise<LoadedFactionScript> {
  await requireFactionAdmin()
  const db = factionAdminClient()
  const { script, row } = await assembleFactionEpisode(await factionTreeSource(db, folder), folder)
  return {
    folder,
    episodeId: row.id as string,
    script,
    updatedAt: row.updated_at as string,
    status: (row.status as string) ?? 'blocked',
    registered: (row.registered as boolean) ?? false,
    sortOrder: (row.sort_order as number) ?? 0,
  }
}

/**
 * 저장에 이어 도는 자동 반영 공정(태그·개인샷·그룹샷·로고·영상·음악 → 도감/R2) 요약.
 *
 * 저장 성공 여부와 무관한 **부가 결과**다 — 이 공정이 실패해도 저장은 이미 성공했다.
 * 멱등(원본 해시·값 대조)이라 바뀐 게 없는 저장은 대조만 하고 지나간다(uploaded 0).
 */
export type SaveFactionScriptPublishResult =
  | {
      ran: true
      /** 새로 반영한 수(신규+갱신) */
      uploaded: number
      /** 이미 반영돼 있어 그대로 둔 수 */
      unchanged: number
      /** 막힌 수 — 셀럽 미해소·파일 없음·저장소 환경변수 누락 등 */
      blocked: number
      /** 조용히 넘기면 안 되는 알림(태그 미지정 세력·새 테마 생성 등) */
      warnings?: string[]
    }
  | {
      ran: false
      /** 건너뛴·실패한 사유. 실패여도 저장 자체는 성공이다 */
      reason: string
    }

export interface SaveFactionScriptResult {
  ok: true
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { groups: number; clusters: number; people: number; parts: number }
  /** 자동 내보내기 결과(껐거나 렌더 저장소가 연결되지 않았으면 없음) */
  exported?: FactionExportResult
  /** 자동 반영 공정 요약 — 저장 성공 뒤 이어 돈 결과(건너뛰었으면 그 사유) */
  published: SaveFactionScriptPublishResult
  /** 셀럽 프로필을 못 찾은 slug — celeb_id 는 null 로 두고 slug 문자열은 보존된다 */
  unresolvedSlugs: string[]
}

export interface SaveFactionScriptOptions {
  /**
   * 저장 직후 faction-data.json 을 다시 내보낼지. 기본 켬 —
   * 렌더·음성·자막·유튜브가 전부 그 파일을 읽으므로, 저장과 내보내기가 붙어 있어야 최신을 본다.
   */
  autoExport?: boolean
}

/**
 * 대본 전체 저장. 성공하면 새 잠금 기준을 돌려주고, 이어서 파일까지 다시 만든다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 거부된다(낙관적 잠금).
 */
export async function saveFactionScript(
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string,
  options: SaveFactionScriptOptions = {},
): Promise<SaveFactionScriptResult> {
  await requireFactionAdmin()
  if (!expectedUpdatedAt) throw new Error('저장 기준 시각이 없습니다 — 대본을 다시 불러오세요')

  const db = factionAdminClient()
  const saved = await replaceFactionEpisode(db, folder, script, expectedUpdatedAt)

  // 내보내기가 도감 반영보다 먼저다 — 반영의 선곡 판정이 렌더 저장소 CLI 를 거치는데,
  // 그 CLI 는 내보낸 faction-data.json 을 읽으므로 순서가 뒤집히면 옛 대본으로 판정한다.
  // (입구에서 이미 사람을 확인했으므로 내보내기 몸통을 직접 부른다 — 관리자 확인 중복 왕복 제거)
  const exported = options.autoExport !== false && FACTION_LOCAL
    ? await runFactionExport(db, folder)
    : undefined
  const published = await publishAfterSave(db, folder)
  return { ok: true, ...saved, ...(exported ? { exported } : {}), published }
}

/**
 * 저장 직후 자동 반영 — 태그·개인샷·그룹샷·로고·영상·음악 전 범위를 도감/R2에 맞춘다.
 * 저장 버튼 하나로 도감까지 끝나는 것이 목적이다 — 저장하는 순간 「미반영」 상태가 남지 않는다.
 *
 * 멱등이라 바뀐 게 없는 저장은 해시·값 대조만 하고 지나간다. 렌더 저장소가 이 컴퓨터에
 * 없으면(FACTION_LOCAL 미설정) 원본을 읽을 수 없어 건너뛰고 그 사실만 알린다.
 * **어떤 실패도 저장 성공을 뒤집지 않는다** — 던지지 않고 사유를 담아 돌려준다.
 */
async function publishAfterSave(
  db: ReturnType<typeof factionAdminClient>, folder: string,
): Promise<SaveFactionScriptPublishResult> {
  if (!FACTION_LOCAL) {
    return { ran: false, reason: '렌더 저장소 미연결(FACTION_LOCAL 미설정) — 도감 반영을 건너뛰었습니다' }
  }
  try {
    const pub = await publishEpisode(db, {
      folder,
      scope: { tag: true, personImages: true, teamImages: true, logos: true, videos: true, music: true },
    })
    // 캐시 비우기(revalidate) 항목은 반영 수에 섞지 않는다
    const items = pub.items.filter(i => i.kind !== 'revalidate')
    const warnings = [...(pub.warnings ?? [])]
    // 새로 만든 테마는 숨김으로 생긴다 — 노출은 사람 몫이라 알린다
    if (pub.constantHint?.length) {
      warnings.push(`새 테마 생성(비노출): ${pub.constantHint.join(', ')} — 노출은 도감에서 켭니다`)
    }
    return {
      ran: true,
      uploaded: items.filter(i => i.action === 'created' || i.action === 'updated').length,
      unchanged: items.filter(i => i.action === 'skipped').length,
      blocked: items.filter(i => i.action === 'blocked').length,
      ...(warnings.length ? { warnings } : {}),
    }
  } catch (e) {
    return {
      ran: false,
      reason: `도감 반영 실패(저장은 완료됨): ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
