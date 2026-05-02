#!/usr/bin/env node
/**
 * extract-story.mjs — 에피소드 ko/en JSON 에서 스토리 평문만 추출
 *
 * JSON 필드 구조 노이즈를 빼고 narrator·host·books·shorts 의 텍스트를
 * markdown 으로 출력한다. 비판적 검토·사료 검증·결말 매듭 평가 입력으로 사용.
 *
 * Usage:
 *   node sw/remotion/scripts/extract-story.mjs <person>
 *   node sw/remotion/scripts/extract-story.mjs vincent-van-gogh
 *   node sw/remotion/scripts/extract-story.mjs vincent-van-gogh-en
 *   node sw/remotion/scripts/extract-story.mjs vincent-van-gogh --no-shorts
 *
 * 출력: stdout markdown.
 */
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function findEpisodeDir(person) {
  for (const status of ['todo', 'live', 'done']) {
    const dir = join(ROOT, 'public', 'episodes', status, person)
    if (existsSync(dir)) return dir
  }
  throw new Error(`Episode not found: ${person}`)
}

const args = process.argv.slice(2)
if (!args[0]) {
  console.error('Usage: node sw/remotion/scripts/extract-story.mjs <person>[--no-shorts]')
  process.exit(1)
}

const raw = args[0]
const isEn = raw.endsWith('-en')
const isKo = raw.endsWith('-ko')
const person = isEn || isKo ? raw.slice(0, -3) : raw
const locale = isEn ? 'en' : 'ko'
const includeShorts = !args.includes('--no-shorts')

const dir = findEpisodeDir(person)
const c = JSON.parse(readFileSync(join(dir, `${locale}.json`), 'utf-8'))

const lines = []
const push = (s = '') => lines.push(s)

// ─── 헤더 ───
const title = c.host?.nickname || person
push(`# ${title}`)
if (c.host?.title) push(`*${c.host.title}*`)
push()

// ─── 도입 ───
push('## 도입')
push()
if (c.narrator?.serviceGreeting) push(`- 인사: ${c.narrator.serviceGreeting}`)
if (c.narrator?.serviceIntro) push(`- 안내: ${c.narrator.serviceIntro}`)
if (c.narrator?.celebIntro) {
  push()
  push('**셀럽 소개**')
  push()
  push(c.narrator.celebIntro)
}
if (c.host?.featuredQuote) {
  push()
  push('**대표 명언**')
  push()
  push(`> ${c.host.featuredQuote}`)
}
if (c.narrator?.bridge) {
  push()
  push(`- 브릿지: ${c.narrator.bridge}`)
}
push()

// ─── 감상철학 ───
if (c.host?.philosophy) {
  push('## 감상철학 (호스트 1인칭 독백)')
  push()
  push(c.host.philosophy)
  push()
}

// ─── 책별 ───
;(c.books || []).forEach((b, i) => {
  push('---')
  push()
  push(`## 책 ${i + 1}. ${b.title}`)
  if (b.creator) push(`**저자**: ${b.creator}`)
  if (b.stats?.publishYear) push(`**출간**: ${b.stats.publishYear}`)
  if (b.source) push(`**source**: ${b.source}`)
  push()

  if (b.summary) {
    push('### 책 소개 (summary)')
    push()
    push(b.summary)
    push()
  }
  if (b.contextMain) {
    push('### 감상 경위 (contextMain)')
    push()
    push(b.contextMain)
    push()
  }
  ;(b.quotePairs || []).forEach((p, j) => {
    push(`### 인용 ${j + 1}`)
    if (p.quoteSource) push(`*출처: ${p.quoteSource}*`)
    push()
    if (p.quote) {
      p.quote.split('\n').forEach(l => push('> ' + l))
      push()
    }
    if (p.after) {
      push('#### 후속 (after)')
      push()
      push(p.after)
      push()
    }
  })
})

// ─── 마무리 ───
if (c.narrator?.outro) {
  push('---')
  push()
  push('## 마무리 (outro)')
  push()
  push(c.narrator.outro)
  push()
}

// ─── 쇼츠 ───
if (includeShorts) {
  const shortsDir = join(dir, 'shorts')
  if (existsSync(shortsDir)) {
    const shFiles = readdirSync(shortsDir)
      .filter(f => new RegExp(`^${locale}-\\d+\\.json$`).test(f))
      .sort()
    shFiles.forEach((f, idx) => {
      const sh = JSON.parse(readFileSync(join(shortsDir, f), 'utf-8'))
      push('═══════════════════════════════════════════')
      push()
      push(`# 쇼츠 ${idx + 1} (${f})`)
      if (sh.featuredBookIndex != null) {
        const linked = c.books?.[sh.featuredBookIndex]
        push(`**연결 책**: book[${sh.featuredBookIndex}]${linked ? ' — ' + linked.title : ''}`)
      }
      push()
      ;(sh.segments || []).forEach((s, i) => {
        push(`## [${i}] ${s.id} (${s.role || 'unknown'})`)
        push()
        if (s.text) push(s.text)
        else push('*(텍스트 없음)*')
        push()
      })
    })
  }
}

process.stdout.write(lines.join('\n') + '\n')
