/**
 * verify-discourse-4b.ts — 편집기 저장 경로 실물 검증 (화면 없이 같은 함수를 직접 부른다)
 *
 * 실행: (sw/web-bo 에서) npx tsx scripts/verify-discourse-4b.ts
 *
 * 편집기가 「저장」을 누르면 벌어지는 일을 그대로 재현한다 —
 *   불러오기(assemble) → 발언 고치기 → `replaceDiscourseEpisode` → 자동 내보내기(export 코어).
 * 서버 액션 자체는 로그인 확인 한 줄을 앞에 두른 껍데기라 여기서는 그 안쪽 함수를 직접 부른다.
 *
 *  ⓐ 대본 수정 저장이 DB 에 반영되는가
 *  ⓑ 저장 직후 자동 내보내기가 세 파일을 새로 쓰는가
 *  ⓒ 음성 길이가 **사람을 따라가는가**(발언 순서를 바꿔도 그 사람의 n번째 발언에 붙어 있나) — 설계 §7-③
 *  ⓓ 원상 복구 후 파일·DB 가 처음과 같은가
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { assembleDiscourseEpisode } from '@feelandnote/shared/lib/discourse-assemble'
import { diffPointers, mergeDiscourseFiles, stripGenerated } from '@feelandnote/shared/lib/discourse-schema'
import {
  exportDiscourseEpisodeToFiles, discourseEpisodePaths,
} from '@feelandnote/shared/bo/discourse-export'
import { DISCOURSES_DIR } from '@feelandnote/shared/bo/episode-store'
import { replaceDiscourseEpisode } from '../src/lib/discourse-save'

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

type Row = Record<string, unknown>

function rowSource(db: SupabaseClient) {
  return async (table: string, col: string, values: string[]) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Row[]
  }
}

const readFiles = (folder: string): Row => {
  const p = discourseEpisodePaths(DISCOURSES_DIR, folder)
  return mergeDiscourseFiles(
    stripGenerated(JSON.parse(readFileSync(p.dataPath, 'utf-8')) as Row),
    JSON.parse(readFileSync(p.castPath, 'utf-8')) as unknown[],
    JSON.parse(readFileSync(p.turnsPath, 'utf-8')) as unknown[],
  )
}

/** 편집기 저장 = 이 두 줄. 액션은 여기에 로그인 확인만 두른다 */
async function editorSave(db: SupabaseClient, folder: string, script: Row, base: string, force = false) {
  const saved = await replaceDiscourseEpisode(db, folder, script, base)
  const r = await exportDiscourseEpisodeToFiles({
    folder,
    paths: discourseEpisodePaths(DISCOURSES_DIR, folder),
    force,
    assemble: async (original) => {
      const { script: s, row } = await assembleDiscourseEpisode(rowSource(db), folder, original)
      return { script: s, episodeId: row.id as string }
    },
  })
  return { saved, exported: r }
}

const results: { no: string; name: string; ok: boolean; note: string }[] = []
const record = (no: string, name: string, ok: boolean, note = '') => {
  results.push({ no, name, ok, note })
  console.log(`  ${ok ? '✓' : '✗'} ${no} ${name}${note ? ` — ${note}` : ''}`)
}

const FOLDER = 'qin-shi-huang-court'
const MARK = ' 〔편집기 저장 시험〕'

async function main() {
  const db = adminClient()
  console.log(`검수 편: ${FOLDER} (인물 4·발언 21)\n`)

  const start = await assembleDiscourseEpisode(rowSource(db), FOLDER)
  const original = JSON.parse(JSON.stringify(start.script)) as Row
  let base = start.row.updated_at as string

  // ── ⓐ 발언 수정 저장 ──
  const edited = JSON.parse(JSON.stringify(original)) as Row
  const turns = edited.turns as Row[]
  turns[0].text = `${String(turns[0].text)}${MARK}`
  const r1 = await editorSave(db, FOLDER, edited, base)
  base = r1.saved.updatedAt
  const afterSave = (await assembleDiscourseEpisode(rowSource(db), FOLDER)).script
  const gotText = ((afterSave.turns as Row[])[0].text as string)
  record('ⓐ', '발언 수정이 DB 에 반영', gotText.endsWith(MARK),
    gotText.endsWith(MARK) ? `발언 ${r1.saved.counts.turns}·인물 ${r1.saved.counts.speakers}` : '⚠ 반영 안 됨')

  // ── ⓑ 자동 내보내기 ──
  const fileAfter = readFiles(FOLDER)
  const dEx = diffPointers(fileAfter, afterSave)
  record('ⓑ', '저장 직후 세 파일 재작성', r1.exported.written && dEx.length === 0,
    !r1.exported.written ? `⚠ 기록 안 됨 — ${r1.exported.reason}`
      : dEx.length ? `⚠ 파일이 DB 와 ${dEx.length}곳 다르다` : r1.exported.reason)

  // ── ⓒ 음성 길이가 사람을 따라가는가 (설계 §7-③) ──
  // 담화는 아직 wav 가 0개라 길이도 전부 비어 있다. 규칙이 실제로 작동하는지 보려면
  // DB 에 길이를 한 칸 심고, **발언 순서를 바꿔** 그 값이 자리에 남는지 사람을 따라가는지 본다.
  const { data: spRows } = await db.from('discourse_speakers')
    .select('id,position,slug,name').eq('episode_id', start.row.id as string)
  const speakers = ((spRows ?? []) as Row[]).sort((a, b) => (a.position as number) - (b.position as number))
  const { data: tnRows } = await db.from('discourse_turns')
    .select('id,position,speaker_id').eq('episode_id', start.row.id as string)
  const dbTurns = ((tnRows ?? []) as Row[]).sort((a, b) => (a.position as number) - (b.position as number))

  // 두 번째 인물이 말하는 발언 가운데 두 번째 것을 고른다(같은 사람의 n번째 발언 규칙을 시험)
  const target = speakers[1]
  const ofTarget = dbTurns.filter(t => t.speaker_id === target.id)
  let cOk = false
  let cNote = '이 편에 같은 인물의 2번째 발언이 없어 시험을 건너뛴다'
  if (ofTarget.length >= 2) {
    const PROBE = 4.44
    const probeTurnId = ofTarget[1].id as string
    await db.from('discourse_turns').update({ duration: PROBE }).eq('id', probeTurnId)

    // 편집기가 발언을 하나 앞으로 끌어 올린 상황 — 자리는 밀리고 사람은 그대로다
    const moved = JSON.parse(JSON.stringify(afterSave)) as Row
    const mTurns = moved.turns as Row[]
    const last = mTurns.pop()!
    mTurns.unshift(last)

    const r2 = await editorSave(db, FOLDER, moved, base)
    base = r2.saved.updatedAt
    const afterMove = (await assembleDiscourseEpisode(rowSource(db), FOLDER)).script

    // 옮긴 뒤에도 「그 사람의 2번째 발언」이 길이를 쥐고 있어야 한다
    const castArr = afterMove.cast as Row[]
    const idxOfTarget = castArr.findIndex(c => (c.slug ?? c.name) === (target.slug ?? target.name))
    const spoken = (afterMove.turns as Row[]).filter(t => (t.cast as number) === idxOfTarget)
    const holder = spoken.findIndex(t => t.duration === PROBE)
    const withDuration = (afterMove.turns as Row[]).filter(t => t.duration != null).length
    cOk = holder === 1 && withDuration === 1
    cNote = holder === 1 && withDuration === 1
      ? `순서를 바꿔도 그 사람의 2번째 발언이 길이 ${PROBE}초를 그대로 쥔다`
      : `⚠ 길이가 ${holder < 0 ? '사라졌다' : `그 사람의 ${holder + 1}번째로 옮겨 붙었다`} (길이 보유 발언 ${withDuration}개)`
  }
  record('ⓒ', '음성 길이가 사람을 따라간다', cOk || ofTarget.length < 2, cNote)

  // ── ⓓ 원상 복구 ──
  //
  // ⚠ DB 를 비우는 것만으로는 시험용 길이가 안 지워진다. 내보내기에는 **음성 길이 병합**
  //   안전망이 있어서(설계 §5 · 팩션 §7①), DB 에 길이가 없으면 **지금 파일에 적힌 값을 살려 넣는다.**
  //   파이프라인이 파일에만 기록한 길이를 DB 왕복에서 잃지 않으려고 일부러 넣은 규칙이라,
  //   되돌리려면 파일 쪽 값도 함께 걷어내야 한다. 규칙이 제대로 작동한다는 증거이기도 하다.
  await db.from('discourse_turns').update({ duration: null }).eq('episode_id', start.row.id as string)
  const turnsPath = discourseEpisodePaths(DISCOURSES_DIR, FOLDER).turnsPath
  const fileTurns = JSON.parse(readFileSync(turnsPath, 'utf-8')) as Row[]
  for (const t of fileTurns) delete t.duration
  writeFileSync(turnsPath, JSON.stringify(fileTurns, null, 2) + '\n', 'utf-8')

  // 바로 위에서 파일을 손으로 고쳤으므로 손 편집 가드가 걸린다 — 되돌리기라는 뜻을 밝히고 덮어쓴다
  const r3 = await editorSave(db, FOLDER, original, base, true)
  const restored = (await assembleDiscourseEpisode(rowSource(db), FOLDER)).script
  const dDb = diffPointers(original, restored)
  const dFile = diffPointers(readFiles(FOLDER), original)
  record('ⓓ', '원상 복구', dDb.length === 0 && dFile.length === 0 && r3.exported.written,
    dDb.length ? `⚠ DB 차이 ${dDb.length}곳`
      : dFile.length ? `⚠ 파일 차이 ${dFile.length}곳` : 'DB·파일 모두 처음 상태')

  console.log('\n── 결과표 ──')
  for (const r of results) console.log(`${r.ok ? ' ' : '⚠'} ${r.no} ${r.name.padEnd(24)}${r.ok ? '통과' : '실패'}`)
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length}종 중 통과 ${results.length - failed.length} · 실패 ${failed.length}`)
  if (failed.length) process.exitCode = 1
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
