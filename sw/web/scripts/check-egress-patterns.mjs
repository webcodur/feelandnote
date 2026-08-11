#!/usr/bin/env node
/**
 * Supabase egress 누수 패턴 정적 검사
 *
 * 2026-03-18 / 2026-05-09 두 번 한도 초과 사고가 신규 server action 작성 시
 * 캐시 누락 / JSON 통째 select / RSC 직접 호출 패턴 때문에 재발했다.
 * 이 스크립트는 동일 패턴이 다시 코드베이스에 들어오는 것을 막는다.
 *
 * 검사 항목 (순서대로 위험도 높은 것부터):
 *   1) celeb_dialogues 의 lines/lines_en 통째 select   (DIALOGUE_BRIEF_SELECT 사용 권장)
 *   2) 'use server' 파일에서 supabase 읽기인데 캐시 부재
 *      (next/cache 직접 호출과 @/lib/cache 도우미 둘 다 캐시로 인정한다)
 *   3) RSC 페이지(app 하위 page.tsx, layout.tsx)에서 supabase.from(...) 직접 호출
 *   4) 페이지네이션 풀스캔 + row 송출 (while + range PAGE_SIZE)
 *
 * 실행: node scripts/check-egress-patterns.mjs
 * CI: pnpm lint:egress
 *
 * 종료 코드 0 = 통과, 1 = 패턴 적발
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/* 캐시를 걸었다고 인정하는 표시.
   next/cache 를 직접 부르는 것 말고도, 저장소 공용 도우미(@/lib/cache 의 cachedDetail·
   cachedList)를 거치는 길이 있다. 그 도우미는 안에서 unstable_cache 를 부르므로
   캐시는 실제로 걸린다. 직접 호출만 보면 도우미를 쓴 파일이 전부 미적용으로 잡힌다. */
const CACHE_HELPER_RE = /from\s+['"]@\/lib\/cache['"]|cached(?:Detail|List)\s*\(/

const SRC_ROOT = join(process.cwd(), 'src')
const REPO_ROOT = process.cwd()

/** 디렉토리 재귀 순회하며 .ts / .tsx 파일 수집 */
function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(full, files)
    } else if (s.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      files.push(full)
    }
  }
  return files
}

/** 파일 텍스트에서 첫 번째 매치 라인을 반환 */
function findLine(text, regex) {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return { line: i + 1, text: lines[i].trim() }
  }
  return null
}

const violations = []

function report(category, file, detail, hint) {
  violations.push({ category, file: relative(REPO_ROOT, file).split(sep).join('/'), detail, hint })
}

// ── 검사 1: lines/lines_en 통째 select ───────────────────────────────
// 캐시 적용 + 모든 상황 대사 필요 시는 의도된 패턴 → WARN으로 격하
// 캐시 미적용 + lines 통째 = CRITICAL (egress 폭주의 1차 원인)
// 의도된 위치는 같은 라인 또는 직전 라인에 `// egress-allow:` 주석으로 화이트리스트
const RAW_LINES_PATTERN = /['"`]\s*(?:celeb_id\s*,\s*)?lines\s*,\s*lines_en\s*['"`]/
const ALLOW_COMMENT_RE = /egress-allow/i

for (const file of walk(SRC_ROOT)) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  let matched = -1
  for (let i = 0; i < lines.length; i++) {
    if (RAW_LINES_PATTERN.test(lines[i])) {
      matched = i
      break
    }
  }
  if (matched < 0) continue

  // 같은 라인 또는 직전 두 라인에 egress-allow 주석 있으면 통과
  const window = lines.slice(Math.max(0, matched - 2), matched + 1).join('\n')
  if (ALLOW_COMMENT_RE.test(window)) continue

  const lineInfo = { line: matched + 1, text: lines[matched].trim() }
  const hasCache =
    /from\s+['"]next\/cache['"]/.test(text) ||
    /unstable_cache\s*\(/.test(text) ||
    CACHE_HELPER_RE.test(text)
  if (hasCache) {
    report(
      'lines-raw-select-cached',
      file,
      `line ${lineInfo.line}: ${lineInfo.text}`,
      '캐시 적용된 의도된 패턴. 가능하면 DIALOGUE_BRIEF_SELECT로 페이로드 추가 절감.',
    )
  } else {
    report(
      'lines-raw-select',
      file,
      `line ${lineInfo.line}: ${lineInfo.text}`,
      'DIALOGUE_BRIEF_SELECT 또는 DIALOGUE_PROFILE_SELECT 사용. 또는 unstable_cache 적용. 의도된 패턴이면 // egress-allow: <이유> 주석 추가.',
    )
  }
}

// ── 검사 2: 'use server' read action 캐시 누락 (휴리스틱) ─────────────
// 'use server' + supabase.from( + select( + (mutation 키워드 없음) + (auth.getUser 없음 또는 inner 분리됨)
// + unstable_cache import 없음 → 의심
const USE_SERVER_RE = /^['"]use server['"]/m
const SUPABASE_FROM_RE = /supabase\s*\.\s*from\s*\(/
const SUPABASE_RPC_RE = /supabase\s*\.\s*rpc\s*\(/
const MUTATION_RE = /\.\s*(insert|update|delete|upsert)\s*\(/
const UNSTABLE_CACHE_IMPORT_RE = /from\s+['"]next\/cache['"]/
const REACT_CACHE_IMPORT_RE = /from\s+['"]react['"]/
const AUTH_GET_USER_RE = /\.\s*auth\s*\.\s*getUser\s*\(/

const ACTION_DIR = join(SRC_ROOT, 'actions')

if (statSync(ACTION_DIR).isDirectory()) {
  for (const file of walk(ACTION_DIR)) {
    const text = readFileSync(file, 'utf8')
    if (!USE_SERVER_RE.test(text)) continue
    if (!(SUPABASE_FROM_RE.test(text) || SUPABASE_RPC_RE.test(text))) continue
    if (MUTATION_RE.test(text)) continue // mutation 액션은 캐시 안 함
    if (ALLOW_COMMENT_RE.test(text)) continue // RLS 본인 데이터 등 의도된 비캐시 — // egress-allow: <사유> 화이트리스트

    const hasCache =
      UNSTABLE_CACHE_IMPORT_RE.test(text) ||
      REACT_CACHE_IMPORT_RE.test(text) ||
      CACHE_HELPER_RE.test(text)
    if (hasCache) continue

    // 인증 의존이지만 inner 분리 안 된 액션도 캐시 가능 (외부 wrap 패턴 권장)
    // 단순화: 캐시 import 없으면 모두 경고 (false positive 감수)
    const hasAuth = AUTH_GET_USER_RE.test(text)
    report(
      'action-no-cache',
      file,
      hasAuth
        ? '인증 의존 server action — 외부 wrap + 인증 비의존 부분만 unstable_cache 적용'
        : 'server action에 unstable_cache 미적용',
      "createStaticClient + unstable_cache(fn, ['key'], { revalidate: 3600, tags: ['celebs'] }) 패턴",
    )
  }
}

// ── 검사 3: RSC 페이지에서 supabase.from / .rpc 직접 호출 ────────────
const APP_DIR = join(SRC_ROOT, 'app')

if (statSync(APP_DIR).isDirectory()) {
  for (const file of walk(APP_DIR)) {
    if (!(file.endsWith('page.tsx') || file.endsWith('layout.tsx'))) continue
    const text = readFileSync(file, 'utf8')
    // 'use client' 컴포넌트는 제외 (RSC 아님)
    if (/^['"]use client['"]/m.test(text)) continue

    if (SUPABASE_FROM_RE.test(text) || SUPABASE_RPC_RE.test(text)) {
      const m = findLine(text, /supabase\s*\.\s*(from|rpc)\s*\(/)
      report(
        'rsc-direct-supabase',
        file,
        m ? `line ${m.line}: ${m.text}` : 'supabase.from / supabase.rpc 직접 호출',
        'unstable_cache가 적용된 server action으로 분리. RSC 직접 호출은 캐시 우회됨.',
      )
    }
  }
}

// ── 검사 4: 페이지네이션 풀스캔 + row 송출 ────────────────────────────
// while (hasMore) 또는 chunkArray + range(from, from+PAGE_SIZE-1) 패턴
const FULLSCAN_RE = /\.range\s*\(\s*\w+\s*,\s*\w+\s*\+\s*PAGE_SIZE/

for (const file of walk(SRC_ROOT)) {
  const text = readFileSync(file, 'utf8')
  if (!FULLSCAN_RE.test(text)) continue
  const m = findLine(text, FULLSCAN_RE)
  // library/index.ts는 의도적 풀스캔 + 캐시 + SQL 마이그레이션 후속 RPC 대체 예정 — 제외
  if (file.endsWith('library/index.ts') || file.endsWith('library\\index.ts')) continue
  report(
    'fullscan-pagination',
    file,
    m ? `line ${m.line}: ${m.text}` : '페이지네이션 풀스캔 패턴',
    '카운트만 필요하면 head:true count:exact 또는 SQL RPC. row가 필요하면 캐시 + SQL 함수 흡수.',
  )
}

// ── 보고 ──────────────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log('OK — egress 위험 패턴 없음')
  process.exit(0)
}

const grouped = new Map()
for (const v of violations) {
  if (!grouped.has(v.category)) grouped.set(v.category, [])
  grouped.get(v.category).push(v)
}

const CATEGORY_LABEL = {
  'lines-raw-select': '[CRITICAL] celeb_dialogues.lines / lines_en 통째 select (캐시도 미적용)',
  'lines-raw-select-cached': '[INFO] lines 통째 select (캐시 적용된 의도된 패턴)',
  'action-no-cache': '[WARN] server action 캐시 미적용 (휴리스틱)',
  'rsc-direct-supabase': '[CRITICAL] RSC 페이지에서 supabase 직접 호출',
  'fullscan-pagination': '[WARN] 페이지네이션 풀스캔 패턴',
}

const CATEGORY_ORDER = ['lines-raw-select', 'rsc-direct-supabase', 'action-no-cache', 'fullscan-pagination', 'lines-raw-select-cached']

console.error(`Supabase egress 위험 패턴 ${violations.length}건 적발`)
console.error('상세 가이드: docs/project/platform/external-services.md, memory/feedback_supabase_action_caching.md')
console.error('')

let criticalCount = 0
for (const cat of CATEGORY_ORDER) {
  const list = grouped.get(cat)
  if (!list || list.length === 0) continue
  console.error(CATEGORY_LABEL[cat])
  for (const v of list) {
    console.error(`  ${v.file}`)
    console.error(`    └ ${v.detail}`)
    console.error(`    → ${v.hint}`)
    if (cat === 'lines-raw-select' || cat === 'rsc-direct-supabase') criticalCount++
  }
  console.error('')
}

// CRITICAL 적발 시 실패. WARN만이면 보고만 하고 통과 (false positive 많음)
process.exit(criticalCount > 0 ? 1 : 0)
