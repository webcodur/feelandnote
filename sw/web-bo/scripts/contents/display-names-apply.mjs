/**
 * 표시용 제목 행의 저자명·제목 반영 — 기본 dry-run, `--apply`로 반영.
 * Devin 배치(devin-bookname) 산출물을 읽는다. 규칙은 celeb-02-02 「한국어판 확인」·「영문판과 표지」.
 * - A-*.json { id, creator_ko }        : ko 표시행의 creator 를 한국어 이름으로 바꾼다
 * - C-*.json { id, creator_en }        : en 표시행의 creator 를 로마자 이름으로 바꾼다
 * - B-*.json { id, title_ko, kind, creator_ko } : ko 행이 없는 작품에 표시용 ko 행을 만든다.
 *     id 가 `item:<curated_list_items.id>` 면 그 항목의 content_id 를 찾아 쓴다(아직 연결이 없으면 건너뛴다).
 * 표시행 판정은 sources.primary='none' + sources.title ∈ translated·romanized·original 이다. 실제 판본 행은 건드리지 않는다.
 * 백업: data/celeb/figure-books/display-names-backup.jsonl · 반영 목록: <dir>/applied.json
 *
 * node --env-file=.env scripts/contents/display-names-apply.mjs --dir <devin-bookname 폴더> [--task A,B,C] [--apply]
 */
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { argumentValue, dbClient } from '../figure-books/lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const DIR = resolve(process.cwd(), argumentValue('dir', ''))
const TASKS = new Set(argumentValue('task', 'A,B,C').split(','))
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/display-names-backup.jsonl')
const MARKS = new Set(['translated', 'romanized', 'original'])
const isDisplay = (row) => row?.sources && typeof row.sources === 'object' && row.sources.primary === 'none' && MARKS.has(row.sources.title)
const hasHangul = (s) => /[가-힣]/.test(String(s ?? ''))

function loadOutputs(prefix) {
  const out = []
  for (const name of readdirSync(join(DIR, 'output')).filter((n) => n.startsWith(prefix) && n.endsWith('.json')).sort()) {
    try { execFileSync('node', [join(DIR, 'validate.mjs'), name], { stdio: 'ignore' }) } catch { console.log(`  건너뜀(검사 실패) ${name}`); continue }
    out.push(...JSON.parse(readFileSync(join(DIR, 'output', name), 'utf8')))
  }
  return out
}

async function main() {
  const db = dbClient()
  const touched = new Set(); const lists = new Set()
  let nA = 0, nB = 0, nC = 0, skip = 0
  const log = (row) => APPLY && appendFileSync(BACKUP, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`, 'utf8')

  for (const [task, locale, field] of [['A', 'ko', 'creator_ko'], ['C', 'en', 'creator_en']]) {
    if (!TASKS.has(task)) continue
    const rows = loadOutputs(task)
    console.log(`${task}: ${rows.length}건`)
    for (const r of rows) {
      const value = r[field]
      if (!value) { skip++; continue }
      const { data: cur } = await db.from('content_locales').select('content_id,locale,creator,sources').eq('content_id', r.id).eq('locale', locale).maybeSingle()
      if (!cur || !isDisplay(cur)) { skip++; continue }
      if (cur.creator === value) continue
      if (locale === 'ko' ? !hasHangul(value) : hasHangul(value)) { skip++; continue }
      if (APPLY) {
        const u = await db.from('content_locales').update({ creator: value }).eq('content_id', r.id).eq('locale', locale)
        if (u.error) throw new Error(`${task} ${r.id}: ${u.error.message}`)
        log({ task, content_id: r.id, locale, before: cur.creator, after: value })
      }
      if (task === 'A') nA++; else nC++
      touched.add(r.id)
    }
  }

  if (TASKS.has('B')) {
    const rows = loadOutputs('B')
    console.log(`B: ${rows.length}건`)
    let notLinked = 0
    for (const r of rows) {
      if (!r.title_ko || !['translated', 'original'].includes(r.kind)) { skip++; continue }
      let contentId = r.id
      if (r.id.startsWith('item:')) {
        const { data: it } = await db.from('curated_list_items').select('content_id,list_id').eq('id', r.id.slice(5)).maybeSingle()
        if (!it?.content_id) { notLinked++; continue }
        contentId = it.content_id; lists.add(it.list_id)
      }
      const { data: locs } = await db.from('content_locales').select('locale,title,sources').eq('content_id', contentId)
      if (!locs) { skip++; continue }
      if (locs.some((l) => l.locale === 'ko')) { skip++; continue }
      if (!locs.some((l) => l.locale === 'en' && String(l.title ?? '').trim())) { skip++; continue }
      if (APPLY) {
        const ins = await db.from('content_locales').insert({ content_id: contentId, locale: 'ko', title: r.title_ko, creator: r.creator_ko ?? null, verified: false, sources: { primary: 'none', title: r.kind } })
        if (ins.error) throw new Error(`B ${contentId}: ${ins.error.message}`)
        log({ task: 'B', content_id: contentId, locale: 'ko', created: { title: r.title_ko, kind: r.kind, creator: r.creator_ko ?? null } })
      }
      nB++; touched.add(contentId)
    }
    if (notLinked) console.log(`  B 항목 중 아직 목록 연결이 없어 미룬 것 ${notLinked}건`)
  }
  console.log(`\nko 저자명 ${nA} / en 저자명 ${nC} / ko 표시행 신설 ${nB} / 건너뜀 ${skip}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  if (APPLY) writeFileSync(join(DIR, 'applied.json'), JSON.stringify({ contents: [...touched], lists: [...lists] }), 'utf8')
}
main().catch((e) => { console.error(e); process.exit(1) })
