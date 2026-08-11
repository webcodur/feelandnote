/**
 * import.ts — 담화 세 파일(discourse-data.json · cast.json · turns.json) → DB 이관
 *
 * 사용:
 *   pnpm discourse:import -- --episode musk-altman [--dry-run]
 *   pnpm discourse:import -- --all [--dry-run]
 *
 * 규칙
 * - 세 파일은 **읽기 전용**이다. 이 스크립트는 절대 쓰지 않는다.
 * - 저장은 원자 저장 RPC(`discourse_replace_episode`) 한 번. 에피소드 단위 delete-then-insert 라
 *   재실행이 멱등이다(같은 행수, 에러 0). 발언이 인물을 restrict 로 물고 있어 삭제 순서가
 *   중요한데 그 순서도 RPC 안에 있다.
 * - position = 배열 인덱스 + 1. 배열 순서가 곧 화면 순서이자 음원 파일명(T01-…)이라
 *   순서를 잃으면 영상과 음원이 어긋난다.
 * - `Turn.cast`(정수) → `speaker_id`(FK). 없는 인물을 가리키면 저장 전에 막고, 뚫려도 FK 가 롤백한다.
 * - `longformLayout` 의 `{turn:n}` 은 **정수 그대로** 저장한다(경계 위치라 UUID 로 표현 불가).
 * - 대사·이미지 경로 문자열은 가공 없이 원문 그대로 넣는다.
 */

import { randomUUID } from 'crypto'
import { buildDiscourseRows } from '@feelandnote/shared/lib/discourse-assemble'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient, readDiscourseData, parseArgs, selectEpisodes, pad,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm discourse:import -- (--episode <폴더명> | --all) [--dry-run]'

/**
 * `.in()` 한 번에 실을 값 개수. 이 저장소는 462개 id 를 단일 in() 에 실어
 * URL 한도를 넘겨 실패한 실측 이력이 있다(docs/project/remotion/faction-unification.md §5). 200 으로 끊는다.
 */
const IN_CHUNK = 200

type Row = Record<string, unknown>

interface EpisodeStats {
  folder: string
  speakers: number
  turns: number
  /** 해소된 slug 수 / 전체 slug 보유 인물 수 */
  slugResolved: number
  slugTotal: number
  skipped?: string
}

/* ────────────────────────── 키 해소 ────────────────────────── */

/** slug → celebs.id. 청크로 끊어 조회한 뒤 한 맵으로 합친다. */
async function resolveSlugs(db: SupabaseClient, slugs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const uniq = [...new Set(slugs)]
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const chunk = uniq.slice(i, i + IN_CHUNK)
    const { data, error } = await db.from('celebs').select('id,slug')
      .in('publication_status', ['active', 'inactive', 'suspended'])
      .in('slug', chunk)
    if (error) throw new Error(`celebs slug 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      if (r.slug) map.set(r.slug as string, r.id as string)
    }
  }
  return map
}

/* ────────────────────────── 이관 ────────────────────────── */

async function importEpisode(
  db: SupabaseClient,
  ep: EpisodeFolder,
  slugMap: Map<string, string>,
  dryRun: boolean,
): Promise<EpisodeStats> {
  const script = readDiscourseData(ep)
  const cast = (script.cast ?? []) as Row[]
  const turns = (script.turns ?? []) as Row[]
  const stats: EpisodeStats = {
    folder: ep.folder, speakers: 0, turns: 0, slugResolved: 0, slugTotal: 0,
  }

  for (const s of cast) {
    const slug = s.slug as string | undefined
    if (!slug) continue
    stats.slugTotal++
    if (slugMap.has(slug)) stats.slugResolved++
  }

  // 분해는 저장 전에 한다 — 여기서 던지면 DB 를 건드리기 전에 멈춘다
  let payload
  try {
    payload = buildDiscourseRows(script, {
      slugMap,
      newId: randomUUID,
      status: ep.status,
      registered: ep.registered,
      sortOrder: ep.sortOrder,
    })
  } catch (e) {
    stats.skipped = e instanceof Error ? e.message : String(e)
    return stats
  }

  stats.speakers = payload.speakers.length
  stats.turns = payload.turns.length
  if (dryRun) return stats

  const { error } = await db.rpc('discourse_replace_episode', {
    p_folder: ep.folder,
    p_episode: payload.episode,
    p_speakers: payload.speakers,
    p_turns: payload.turns,
    p_expected_updated_at: null,
  })
  if (error) throw new Error(`discourse_replace_episode 실패(${ep.folder}): ${error.message}`)

  return stats
}

/* ────────────────────────── main ────────────────────────── */

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps = selectEpisodes(args)
  const db = adminClient()

  console.log(`대상 에피소드 ${eps.length}편${args.dryRun ? ' (dry-run — 쓰기 없음)' : ''}`)

  // 전 에피소드의 slug 를 모아 한 번에 해소한다(인물마다 조회하지 않는다).
  const people: { episode: string; name: string; slug: string }[] = []
  for (const ep of eps) {
    for (const s of (readDiscourseData(ep).cast ?? []) as Row[]) {
      people.push({
        episode: ep.folder,
        name: String(s.name ?? '(이름 없음)'),
        slug: typeof s.slug === 'string' ? s.slug.trim() : '',
      })
    }
  }
  const allSlugs = people.map(p => p.slug).filter(Boolean)
  const slugMap = await resolveSlugs(db, allSlugs)
  console.log(`셀럽 slug 해소 ${slugMap.size}/${new Set(allSlugs).size}`)

  const unresolvedPeople = people.filter(p => !p.slug || !slugMap.has(p.slug))
  if (unresolvedPeople.length) {
    const sample = unresolvedPeople.slice(0, 20)
      .map(p => `${p.episode}/${p.name}${p.slug ? ` (${p.slug})` : ' (slug 없음)'}`)
      .join('\n  · ')
    const more = unresolvedPeople.length > 20 ? `\n  … 외 ${unresolvedPeople.length - 20}명` : ''
    throw new Error(`DB CELEB 미연결 담화 인물 ${unresolvedPeople.length}명 — 가져오기를 시작하지 않았다\n  · ${sample}${more}`)
  }

  const all: EpisodeStats[] = []
  for (const ep of eps) {
    const s = await importEpisode(db, ep, slugMap, args.dryRun)
    all.push(s)
    if (s.skipped) console.log(`  ✗ ${pad(ep.folder, 24)} ${s.skipped}`)
    else console.log(`  ✓ ${pad(ep.folder, 24)} 인물 ${pad(String(s.speakers), 3)} 발언 ${pad(String(s.turns), 3)} 상태 ${pad(ep.status, 6)}${ep.registered ? '[등록]' : ''}`)
  }

  const sum = (k: keyof EpisodeStats) => all.reduce((a, s) => a + (s[k] as number), 0)
  console.log('\n── 합계 ──')
  console.log(`에피소드 ${all.filter(s => !s.skipped).length}/${all.length} · 인물 ${sum('speakers')} · 발언 ${sum('turns')}`)
  console.log(`셀럽 연결 ${sum('slugResolved')}/${sum('slugTotal')}`)

  const skipped = all.filter(s => s.skipped)
  if (skipped.length) {
    console.log(`\n⚠ 중단된 에피소드 ${skipped.length}편 — 위 사유 참조`)
    process.exitCode = 1
  }
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
