/**
 * 인물 중복·신원 값 점검. 읽기만 한다.
 *
 * 등록 전 한 명 확인(web-bo /celebs/new 앞에 돌린다):
 *   pnpm celeb:dup-check --nickname "쇼와 천황" --en "Emperor Showa" [--alias 히로히토 ...] [--qid Q34479] [--birth 1901-04-29] [--death 1989-01-07]
 * 전체 점검(정기·이름 일괄 수정 뒤):
 *   pnpm celeb:dup-check --all [--names]
 *
 * 강한 일치(qid·생몰일, 또는 생년월일+이름)와 이름·수식어 규칙 오류가 있으면 종료 코드 1이다.
 * --names는 이름만 겹치는 쌍(대개 동명이인)도 보여 준다. 판정 기준은 @feelandnote/shared/lib/celeb-identity.
 */
import { createClient } from '@supabase/supabase-js'
import {
  celebNameIssues,
  celebTitleIssues,
  findCelebDuplicatePairs,
  findCelebDuplicates,
  type CelebIdentityRow,
} from '@feelandnote/shared/lib/celeb-identity'

type Row = CelebIdentityRow & { id: string; slug: string | null; nickname: string; title: string | null; title_en: string | null }

const args = process.argv.slice(2)
const value = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? null : null }
const values = (name: string) => args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []))
const label = (row: Row) => `${row.slug ?? row.id} ${row.nickname}${row.birth_date ? ` (${row.birth_date}~${row.death_date ?? ''})` : ''}`

async function loadRows(): Promise<Row[]> {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL·DB_SECRET_KEY가 필요하다(sw/web-bo/.env)')
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,nickname,nickname_en,aliases,wikidata_qid,birth_date,death_date,publication_status,title,title_en')
      .neq('publication_status', 'deleted')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) return rows
  }
}

async function main() {
  const rows = await loadRows()
  let failed = false

  if (args.includes('--all')) {
    const pairs = findCelebDuplicatePairs(rows)
    const strong = pairs.filter((pair) => pair.strong)
    console.log(`== 같은 사람 의심 ${strong.length}쌍 (전체 ${rows.length}명)`)
    for (const pair of strong) console.log(`  ${pair.reasons.join('+')}  ${label(pair.a)}  ⇄  ${label(pair.b)}`)
    if (args.includes('--names')) {
      const weak = pairs.filter((pair) => !pair.strong)
      console.log(`== 이름만 겹치는 쌍 ${weak.length} — 대개 동명이인이다. 수식어로 구분되는지만 본다`)
      for (const pair of weak) console.log(`  ${label(pair.a)} [${pair.a.title ?? '-'}]  ⇄  ${label(pair.b)} [${pair.b.title ?? '-'}]`)
    }
    const issues = rows.flatMap((row) => [...celebNameIssues(row), ...celebTitleIssues(row)].map((issue) => ({ row, issue })))
    const errors = issues.filter(({ issue }) => issue.level === 'error')
    console.log(`== 이름·수식어 규칙 오류 ${errors.length}건 · 경고 ${issues.length - errors.length}건`)
    for (const { row, issue } of errors) console.log(`  ${row.slug} ${issue.field}: ${issue.message}`)
    failed = strong.length > 0 || errors.length > 0
  } else {
    const nickname = value('--nickname')
    if (!nickname) throw new Error('--nickname(한국어 이름) 또는 --all이 필요하다')
    const candidate: CelebIdentityRow & { title?: string | null; title_en?: string | null } = {
      nickname,
      nickname_en: value('--en'),
      aliases: values('--alias'),
      wikidata_qid: value('--qid'),
      birth_date: value('--birth'),
      death_date: value('--death'),
      title: value('--title'),
      title_en: value('--title-en'),
    }
    const matches = findCelebDuplicates(candidate, rows)
    console.log(`== 기존 프로필 후보 ${matches.length}명`)
    for (const match of matches) console.log(`  ${match.strong ? '같은 사람 의심' : '이름 겹침'} [${match.reasons.join('+')}] ${label(match.row)} [${match.row.title ?? '-'}]`)
    const issues = [...celebNameIssues(candidate), ...celebTitleIssues(candidate)]
    for (const issue of issues) console.log(`  ${issue.level === 'error' ? '오류' : '경고'} ${issue.field}: ${issue.message}`)
    failed = matches.some((match) => match.strong) || issues.some((issue) => issue.level === 'error')
  }
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
