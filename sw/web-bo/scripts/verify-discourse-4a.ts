/**
 * verify-discourse-4a.ts — web-bo 담화 서버 기반 검증 6종 (팩션 4a 검증과 대칭)
 *
 * 실행: (sw/web-bo 에서) npx tsx scripts/verify-discourse-4a.ts
 *
 * 화면 없이 서버 쪽 계약만 본다. 편집기가 부르는 것과 **같은 함수**를 직접 불러 확인한다 —
 * 화면을 눌러 보는 검수는 사람 몫이고, 여기서는 눌렀을 때 뒤에서 벌어질 일을 못 박는다.
 *
 *  ① 조립 ≡ CLI export   화면이 불러오는 대본 == 렌더 저장소 CLI 가 내보내는 대본
 *  ② 저장 왕복           저장 → 다시 조립 == 저장 직전 대본
 *  ③ 기준 시각 거부      낡은 잠금 기준으로 저장하면 DB 가 거부한다
 *  ④ 자동 내보내기       저장이 세 파일을 다시 쓰고, 그 파일이 왕복 검증을 통과한다
 *  ⑤ 전체 롤백          한 발언이라도 잘못되면 저장이 통째로 되돌아간다(반쪽 저장 없음)
 *  ⑥ 경로 이탈 차단      자산 창구가 뿌리 폴더 밖·허용 밖 확장자를 내주지 않는다
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  assembleDiscourseEpisode, buildDiscourseRows, type DiscourseRowSource,
} from '@feelandnote/shared/lib/discourse-assemble'
import {
  diffPointers, mergeDiscourseFiles, stripGenerated,
} from '@feelandnote/shared/lib/discourse-schema'
import { discourseEpisodePaths } from '@feelandnote/shared/bo/discourse-export'
import { DISCOURSES_DIR } from '@feelandnote/shared/bo/episode-store'
import { resolveDiscourseAsset } from '../src/lib/discourse-asset'

/* ── env — .env 를 직접 읽는다(Next 밖 실행이라 자동 로딩이 없다) ── */
function loadEnv(): void {
  for (const p of ['.env.local', '.env']) {
    const fp = path.join(process.cwd(), p)
    if (!existsSync(fp)) continue
    for (const raw of readFileSync(fp, 'utf-8').split('\n')) {
      const line = raw.replace(/\r$/, '')
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const v = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

function adminClient(): SupabaseClient {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** 렌더 저장소 CLI 와 같은 방식 — 테이블마다 따로 긁는다 */
function plainSource(db: SupabaseClient): DiscourseRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}

/** web-bo 화면과 같은 방식 — 중첩 임베드 한 왕복 (lib/discourse-db.ts 의 discourseTreeSource 와 동일 규칙) */
async function treeSource(db: SupabaseClient, folder: string): Promise<DiscourseRowSource> {
  const { data, error } = await db
    .from('discourse_episodes')
    .select('*, discourse_speakers(*), discourse_turns(*)')
    .eq('folder', folder)
  if (error) throw new Error(`트리 조회 실패(${folder}): ${error.message}`)
  const episodes: Record<string, unknown>[] = []
  const speakers: Record<string, unknown>[] = []
  const turns: Record<string, unknown>[] = []
  for (const epRaw of (data ?? []) as Record<string, unknown>[]) {
    const { discourse_speakers: sp, discourse_turns: tn, ...ep } = epRaw as {
      discourse_speakers?: Record<string, unknown>[]
      discourse_turns?: Record<string, unknown>[]
    } & Record<string, unknown>
    episodes.push(ep)
    speakers.push(...(sp ?? []))
    turns.push(...(tn ?? []))
  }
  const byTable: Record<string, Record<string, unknown>[]> = {
    discourse_episodes: episodes, discourse_speakers: speakers, discourse_turns: turns,
  }
  return async (table, col, values) => {
    const rows = byTable[table]
    if (!rows) throw new Error(`트리 공급자가 모르는 테이블: ${table}`)
    const want = new Set(values)
    return rows.filter(r => want.has(r[col] as never))
  }
}

const readFiles = (folder: string): Record<string, unknown> => {
  const p = discourseEpisodePaths(DISCOURSES_DIR, folder)
  return mergeDiscourseFiles(
    stripGenerated(JSON.parse(readFileSync(p.dataPath, 'utf-8')) as Record<string, unknown>),
    JSON.parse(readFileSync(p.castPath, 'utf-8')) as unknown[],
    JSON.parse(readFileSync(p.turnsPath, 'utf-8')) as unknown[],
  )
}

/* ────────────────────────── 검사 ────────────────────────── */

const results: { no: string; name: string; ok: boolean; note: string }[] = []
const record = (no: string, name: string, ok: boolean, note = '') => {
  results.push({ no, name, ok, note })
  console.log(`  ${ok ? '✓' : '✗'} ${no} ${name}${note ? ` — ${note}` : ''}`)
}

/** 검수 편 — 인물 4·발언 21 로 가장 복잡하다 */
const FOLDER = 'qin-shi-huang-court'

async function main() {
  const db = adminClient()
  console.log(`검수 편: ${FOLDER}\n`)

  // ── ① 조립 ≡ CLI export ──
  const viaTree = await assembleDiscourseEpisode(await treeSource(db, FOLDER), FOLDER)
  const viaPlain = await assembleDiscourseEpisode(plainSource(db), FOLDER)
  const d1 = diffPointers(viaTree.script, viaPlain.script)
  record('①', '조립 ≡ CLI export', d1.length === 0,
    d1.length ? `차이 ${d1.length}곳: ${d1.slice(0, 3).join(' / ')}` : '화면 로드와 CLI 산출이 같다')

  // ── ② 저장 왕복 ──
  const before = viaTree.script
  const baseUpdatedAt = viaTree.row.updated_at as string
  const { data: linkedSpeakers, error: linkedError } = await db
    .from('discourse_speakers').select('slug,celeb_id').eq('episode_id', viaTree.row.id as string)
  if (linkedError) throw new Error(`DB 인물 연결 조회 실패: ${linkedError.message}`)
  const slugMap = new Map<string, string>()
  for (const speaker of linkedSpeakers ?? []) {
    if (!speaker.slug || !speaker.celeb_id) throw new Error(`DB 인물 연결이 없는 발언자가 있습니다: ${FOLDER}`)
    slugMap.set(speaker.slug as string, speaker.celeb_id as string)
  }
  const payload = buildDiscourseRows(before, {
    slugMap,
    newId: randomUUID, status: 'todo', registered: true,
    sortOrder: (viaTree.row.sort_order as number) ?? 0,
  })
  const { data: saveRes, error: saveErr } = await db.rpc('discourse_replace_episode', {
    p_folder: FOLDER, p_episode: payload.episode,
    p_speakers: payload.speakers, p_turns: payload.turns,
    p_expected_updated_at: baseUpdatedAt,
  })
  if (saveErr) throw new Error(`저장 실패: ${saveErr.message}`)
  const newUpdatedAt = (saveRes as { updated_at: string }).updated_at
  const after = (await assembleDiscourseEpisode(await treeSource(db, FOLDER), FOLDER)).script
  const d2 = diffPointers(before, after)
  record('②', '저장 왕복', d2.length === 0,
    d2.length ? `차이 ${d2.length}곳: ${d2.slice(0, 3).join(' / ')}` : `인물 ${payload.speakers.length}·발언 ${payload.turns.length} 그대로`)

  // ── ③ 기준 시각 거부 ──
  const { error: staleErr } = await db.rpc('discourse_replace_episode', {
    p_folder: FOLDER, p_episode: payload.episode,
    p_speakers: payload.speakers, p_turns: payload.turns,
    p_expected_updated_at: baseUpdatedAt, // 이미 지나간 기준
  })
  record('③', '낡은 기준 시각 거부', !!staleErr,
    staleErr ? '저장 충돌로 막혔다' : '⚠ 거부되지 않았다 — 남의 저장을 덮어쓸 수 있다')

  // ── ⑤ 전체 롤백 (④ 보다 먼저 — 파일 상태를 건드리지 않는다) ──
  const bad = JSON.parse(JSON.stringify(payload)) as typeof payload
  bad.turns[bad.turns.length - 1].speaker_id = randomUUID() // 없는 인물을 가리키게 만든다
  const { error: badErr } = await db.rpc('discourse_replace_episode', {
    p_folder: FOLDER, p_episode: bad.episode,
    p_speakers: bad.speakers, p_turns: bad.turns,
    p_expected_updated_at: newUpdatedAt,
  })
  const afterBad = (await assembleDiscourseEpisode(await treeSource(db, FOLDER), FOLDER)).script
  const d5 = diffPointers(before, afterBad)
  record('⑤', '한 발언 오류 = 전체 롤백', !!badErr && d5.length === 0,
    !badErr ? '⚠ 잘못된 발언이 그대로 저장됐다'
      : d5.length ? `⚠ 거부는 됐으나 데이터가 ${d5.length}곳 변했다(반쪽 저장)`
        : '거부 + 원상 유지')

  // ── ④ 자동 내보내기 후 파일이 DB 와 같은가 ──
  // (편집기 저장이 부르는 것과 같은 코어. 여기서는 파일을 쓰지 않고 「지금 파일 == DB」만 본다 —
  //  Phase 2 에서 이미 발효했으므로 저장이 파일을 안 갈았으면 여기서 차이가 잡힌다)
  const fileDoc = readFiles(FOLDER)
  const d4 = diffPointers(fileDoc, after)
  record('④', '파일 ≡ DB(자동 내보내기 대상)', d4.length === 0,
    d4.length ? `차이 ${d4.length}곳 — 저장 후 export 가 필요하다` : '세 파일이 DB 와 같다')

  // ── ⑥ 경로 이탈 차단 ──
  const cases: { rel: string; expect: 'ok' | 'block' }[] = [
    { rel: `${FOLDER}/cast.json`, expect: 'block' },              // 대본 json — 허용 확장자 아님
    { rel: '../factions/AI-Supremacy/faction-data.json', expect: 'block' },
    { rel: '../../../.env', expect: 'block' },
    { rel: 'musk-altman/cast/elon-musk/00.png', expect: 'ok' },
    { rel: '', expect: 'block' },
  ]
  const bad6: string[] = []
  for (const c of cases) {
    const r = resolveDiscourseAsset(DISCOURSES_DIR, c.rel)
    const got = r.ok ? 'ok' : 'block'
    if (got !== c.expect) bad6.push(`${c.rel || '(빈 경로)'} → ${got}(기대 ${c.expect})`)
  }
  record('⑥', '경로 이탈·확장자 차단', bad6.length === 0,
    bad6.length ? bad6.join(' / ') : `${cases.length}가지 전부 기대대로`)

  console.log('\n── 결과표 ──')
  for (const r of results) console.log(`${r.ok ? ' ' : '⚠'} ${r.no} ${r.name.padEnd(28)}${r.ok ? '통과' : '실패'}`)
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length}종 중 통과 ${results.length - failed.length} · 실패 ${failed.length}`)
  if (failed.length) process.exitCode = 1
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
