#!/usr/bin/env node
/**
 * 라이트 테마 고정 어두운 바탕 정적 검사
 *
 * 라이트 테마는 Tailwind 팔레트의 밝은 단계(100~400)와 --color-white를 먹색 쪽으로 뒤집는다.
 * 짙은 단계(bg-stone-900 등)는 그대로 어두워서, 그 위의 글자가 라이트에서
 * 「어두운 바탕 + 어두운 글자」가 된다. 이 스크립트는 그런 컴포넌트가 다시 들어오는 것을 막는다.
 *
 * 위반: 금지 패턴이 있고, 같은 파일 안에 theme-dark가 없고, 예외 목록에도 없다.
 * 고치는 법: 표면 토큰(bg-bg-main·secondary·card·raised)을 쓰거나,
 *           사진·영상·게임판처럼 어두운 바탕을 전제로 그린 구역은 최상위에 theme-dark를 단다.
 * 규칙 문서: docs/project/platform/platform-02-code-rules.md 「컬러」
 *
 * 실행: pnpm check:theme-colors
 * 종료 코드 0 = 통과, 1 = 위반 적발
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/* 금지 패턴 — 라이트에서 뒤집히지 않는 짙은 바탕. 값의 원천은 여기 하나다. */
const FORBIDDEN_PATTERNS = [
  /\bbg-(?:stone|zinc|neutral|slate|gray)-(?:700|800|900|950)\b/g,
  /\bbg-\[#[012][0-9a-fA-F]{5}\]/g,
  /\bfrom-(?:stone|zinc|neutral|slate|gray)-(?:800|900|950)\b/g,
]

/* 예외 — src 기준 경로. '/'로 끝나면 폴더 단위다.
   폴더 단위 예외는 「통째로 다크로 여는 화면」에만 준다.
   단, createPortal을 쓰는 파일은 감싼 틀 바깥(document.body)에 그려지므로 폴더 예외를 받지 못한다. */
const EXEMPT_PATHS = [
  'components/features/game/', // 게임 전체화면(components/shared/GameFullScreen.tsx)이 최상위를 theme-dark로 감싼다
  'components/lab/', // 실험 화면 — 틀(LabLayoutFrame)이 theme-dark로 연다
]

const PORTAL_RE = /\bcreatePortal\s*\(/
const THEME_DARK_RE = /\btheme-dark\b/

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC_ROOT = join(WEB_ROOT, 'src')
const SCAN_DIRS = ['components', 'app'].map((d) => join(SRC_ROOT, d))

/** 디렉토리 재귀 순회하며 .tsx 파일 수집 (테스트 파일 제외) */
function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(full, files)
    } else if (s.isFile() && name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(name)) {
      files.push(full)
    }
  }
  return files
}

const toPosix = (p) => p.split(sep).join('/')
const isExempt = (srcPath) => EXEMPT_PATHS.some((p) => (p.endsWith('/') ? srcPath.startsWith(p) : srcPath === p))

const files = SCAN_DIRS.flatMap((d) => walk(d))
const violations = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  if (THEME_DARK_RE.test(text)) continue

  const srcPath = toPosix(relative(SRC_ROOT, file))
  const portal = PORTAL_RE.test(text)
  if (isExempt(srcPath) && !portal) continue

  text.split(/\r?\n/).forEach((line, i) => {
    const hits = FORBIDDEN_PATTERNS.flatMap((re) => line.match(re) ?? [])
    if (hits.length === 0) return
    violations.push({ file: toPosix(relative(WEB_ROOT, file)), line: i + 1, hits: [...new Set(hits)], portal })
  })
}

// ── 보고 ──────────────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log(`OK — 고정 어두운 바탕 위반 없음 (.tsx ${files.length}개 검사)`)
  process.exit(0)
}

const fileCount = new Set(violations.map((v) => v.file)).size
console.error(`고정 어두운 바탕 위반 ${violations.length}건 (파일 ${fileCount}개)`)
console.error('표면 토큰(bg-bg-main·secondary·card·raised)으로 바꾸거나, 어두운 바탕을 전제로 그린 구역이면 최상위에 theme-dark를 단다.')
console.error('규칙: docs/project/platform/platform-02-code-rules.md 「컬러」')
console.error('')
for (const v of violations) {
  const note = v.portal ? '  (createPortal — 폴더 예외 무효)' : ''
  console.error(`  ${v.file}:${v.line}  ${v.hits.join(', ')}${note}`)
}
process.exit(1)
