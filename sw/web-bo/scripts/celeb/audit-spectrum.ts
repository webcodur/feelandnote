/**
 * 스펙트럼 근거문 중복 감사(읽기 전용).
 *
 *   pnpm celeb:audit:spectrum                       # DB를 읽어 감사, .tmp-spectrum-audit/ 에 보고
 *   pnpm celeb:audit:spectrum --out-dir <dir>
 *   pnpm celeb:audit:spectrum --slugs asa,ahyeon    # 지정 인물이 얽힌 결함만
 *
 * 판정 규칙은 `scripts/lib/spectrum-reason-check.ts`가 쥔다. 반영 게이트(`celeb:fill`)와 같은 규칙이다.
 *
 * 산출물
 *   candidates.json  결함(ERROR)이 하나라도 있는 인물 목록. 재조사 릴레이의 대상 목록이다.
 *   report.md        축별 최다 반복 문구·같은 근거 다른 점수·인물 쌍 겹침 요약
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { findContentIssues, findReasonIssues, loadAllReasonRows, type ReasonIssue } from '../lib/spectrum-reason-check'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const CONTENT_CODES = new Set(['private-info', 'proxy-credit', 'length', 'floor', 'no-year'])

type Candidate = {
  slug: string
  nickname: string
  profession: string | null
  gender: boolean | null
  tier: string
  updated_at: string
  errorAxes: string[]
  codes: Record<string, number>
  pairs: string[]
  genericAxes: string[]
  /** 사적 신상·명의 오귀속·길이·중립대 이탈. 복제와 별개의 결함이라 큐를 따로 센다. */
  contentAxes: string[]
}

async function main() {
  const outDir = argOf('out-dir') ?? '.tmp-spectrum-audit'
  const onlySlugs = (argOf('slugs') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const focus = onlySlugs.length ? new Set(onlySlugs) : undefined

  const { rows, celebs } = await loadAllReasonRows(db)
  const issues = [
    ...findReasonIssues(rows, focus),
    ...findContentIssues(focus ? rows.filter(r => focus.has(r.slug)) : rows),
  ]

  const byCeleb = new Map<string, Candidate>()
  const cand = (slug: string): Candidate => {
    let c = byCeleb.get(slug)
    if (!c) {
      const meta = celebs.get(slug)
      c = {
        slug, nickname: meta?.nickname ?? slug, profession: meta?.profession ?? null, gender: meta?.gender ?? null,
        tier: meta?.celeb_tier ?? '', updated_at: meta?.updated_at ?? '',
        errorAxes: [], codes: {}, pairs: [], genericAxes: [], contentAxes: [],
      }
      byCeleb.set(slug, c)
    }
    return c
  }
  for (const it of issues) {
    for (const slug of it.slugs) {
      if (focus && !focus.has(slug)) continue
      const c = cand(slug)
      c.codes[it.code] = (c.codes[it.code] ?? 0) + 1
      if (CONTENT_CODES.has(it.code)) {
        if (it.level === 'ERROR' && it.axis && !c.contentAxes.includes(it.axis)) c.contentAxes.push(it.axis)
        continue
      }
      if (it.level === 'ERROR') {
        if (it.axis && !c.errorAxes.includes(it.axis)) c.errorAxes.push(it.axis)
        if (it.code === 'pair-overlap') c.pairs.push(it.slugs.find(s => s !== slug) ?? '')
      } else if (it.axis && !c.genericAxes.includes(it.axis)) {
        c.genericAxes.push(it.axis)
      }
    }
  }
  const all = [...byCeleb.values()]
  const candidates = all
    .filter(c => c.errorAxes.length || c.pairs.length)
    .sort((a, b) => (b.errorAxes.length + b.pairs.length * 4) - (a.errorAxes.length + a.pairs.length * 4) || a.slug.localeCompare(b.slug))
  const genericOnly = all.filter(c => !c.errorAxes.length && !c.pairs.length && c.genericAxes.length)
  const contentDefects = all.filter(c => c.contentAxes.length)
    .sort((a, b) => b.contentAxes.length - a.contentAxes.length || a.slug.localeCompare(b.slug))

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'candidates.json'), JSON.stringify({ generatedAt: new Date().toISOString(), candidates, contentDefects, genericOnly }, null, 2), 'utf8')
  await writeFile(path.join(outDir, 'report.md'), renderReport(issues, celebs.size, candidates, contentDefects, genericOnly), 'utf8')

  const codeCount = issues.reduce((m, it) => { m[it.code] = (m[it.code] ?? 0) + 1; return m }, {} as Record<string, number>)
  console.log(`persona ${celebs.size}행 · 결함 ${issues.length}건 ${JSON.stringify(codeCount)}`)
  console.log(`복제 후보 ${candidates.length}명 · 내용 결함 ${contentDefects.length}명 · 기본값 문구만 ${genericOnly.length}명 → ${outDir}/candidates.json, report.md`)
}

function renderReport(issues: ReasonIssue[], total: number, candidates: Candidate[], contentDefects: Candidate[], genericOnly: Candidate[]): string {
  const lines: string[] = []
  lines.push(`# 스펙트럼 근거문 감사`, '', `- 인물 ${total}명 · 복제 후보 ${candidates.length}명 · 내용 결함 ${contentDefects.length}명 · 기본값 문구만 ${genericOnly.length}명`, '')
  const shared = issues.filter(i => i.code === 'over-shared').sort((a, b) => b.slugs.length - a.slugs.length)
  lines.push('## 셋 이상이 공유한 근거문 (상위 40)', '')
  for (const it of shared.slice(0, 40)) lines.push(`- ${it.slugs.length}명 · ${it.axis} · ${it.reason_ko}`)
  const spread = issues.filter(i => i.code === 'score-spread')
  lines.push('', `## 같은 근거문에 다른 점수 (${spread.length}건, 상위 40)`, '')
  for (const it of spread.slice(0, 40)) lines.push(`- ${it.detail} · ${it.reason_ko}`)
  const pairs = issues.filter(i => i.code === 'pair-overlap').sort((a, b) => b.detail.length - a.detail.length)
  lines.push('', `## 인물 쌍 겹침 (${pairs.length}쌍)`, '')
  for (const it of pairs) lines.push(`- ${it.detail}`)
  const content = issues.filter(i => CONTENT_CODES.has(i.code))
  const byCode = content.reduce((m, i) => { m[i.code] = (m[i.code] ?? 0) + 1; return m }, {} as Record<string, number>)
  lines.push('', `## 근거문 내용 결함 (${contentDefects.length}명 · ${content.length}건 ${JSON.stringify(byCode)})`, '')
  for (const it of content.filter(i => i.level === 'ERROR').slice(0, 60)) lines.push(`- ${it.slugs[0]} · ${it.detail} — ${it.reason_ko ?? ''}`)
  lines.push('', '## 재조사 후보', '', '| slug | 이름 | 직군 | 결함 축 | 겹치는 인물 |', '|---|---|---|---|---|')
  for (const c of candidates) lines.push(`| ${c.slug} | ${c.nickname} | ${c.profession ?? ''} | ${c.errorAxes.join(', ')} | ${[...new Set(c.pairs)].join(', ')} |`)
  return lines.join('\n') + '\n'
}

main().catch((e) => { console.error(e); process.exit(1) })
