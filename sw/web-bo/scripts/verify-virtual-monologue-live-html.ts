/**
 * 게시된 가상 독백이 공개 페이지의 서버 렌더링 HTML에 정확히 들어갔는지 확인한다.
 *
 * 기본은 dry-run이다. --apply를 붙이면 liveHtmlVerification만 기록한다.
 * 이 검사는 콘텐츠·문단 렌더링 검증이며, CSS·스크롤·반응형 육안 검수를 뜻하는
 * liveVerifiedAt은 채우지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/verify-virtual-monologue-live-html.ts \
 *     --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json \
 *     --slugs elon-musk
 *   pnpm exec tsx scripts/verify-virtual-monologue-live-html.ts \
 *     --file <batch.json> --slugs elon-musk --apply
 */

import { resolve } from 'path'
import {
  readBatch,
  requiredArg,
  selectedSlugs,
  selectPeople,
  sha256,
  writeBatchAtomic,
} from './lib/virtual-monologue-workbench'

const FILE = resolve(process.cwd(), requiredArg('--file'))
const SLUGS = selectedSlugs()
if (!SLUGS) throw new Error('--slugs로 공개 검증 대상을 명시해야 한다.')
const APPLY = process.argv.includes('--apply')
const BASE_URL = (process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com').replace(/\/+$/, '')

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
}

function candidateParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

function renderedMonologueParagraphs(html: string): string[] {
  const panelStart = html.indexOf('id="archive-panel-virtual-monologue"')
  if (panelStart < 0) throw new Error('가상 독백 탭 패널을 찾지 못함')
  const sectionEnd = html.indexOf('</section>', panelStart)
  if (sectionEnd < 0) throw new Error('가상 독백 탭의 section 끝을 찾지 못함')
  const panel = html.slice(panelStart, sectionEnd)
  return [...panel.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)]
    .map(match => decodeHtmlText(match[1]).trim())
    .filter(Boolean)
}

function includesConsecutive(actual: string[], expected: string[]): boolean {
  if (!expected.length || actual.length < expected.length) return false
  for (let start = 0; start <= actual.length - expected.length; start++) {
    if (expected.every((paragraph, offset) => actual[start + offset] === paragraph)) {
      return true
    }
  }
  return false
}

async function main() {
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  let passed = 0
  let failed = 0

  for (const person of targets) {
    const candidate = person.candidateText?.trim() ?? ''
    const errors: string[] = []
    if (person.status !== 'published') errors.push(`status=${person.status}`)
    if (!candidate) errors.push('candidateText 없음')
    if (!person.candidateHash || sha256(candidate) !== person.candidateHash) {
      errors.push('후보 해시 불일치')
    }
    if (errors.length) {
      failed++
      console.log(`FAIL\t${person.slug}\t${errors.join(' | ')}`)
      continue
    }

    const url = `${BASE_URL}/ko/celeb/${person.slug}`
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Feelandnote-Virtual-Monologue-Live-Check/1.0',
          'Cache-Control': 'no-cache',
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      const expected = candidateParagraphs(candidate)
      const rendered = renderedMonologueParagraphs(html)
      if (!includesConsecutive(rendered, expected)) {
        throw new Error(`후보 ${expected.length}문단이 공개 탭에 연속 일치하지 않음(렌더 문단 ${rendered.length}개)`)
      }

      const verifiedAt = new Date().toISOString()
      passed++
      console.log(`${APPLY ? 'VERIFY' : 'PLAN'}\t${person.slug}\tHTTP ${response.status} · ${expected.length}문단 정확히 일치`)
      if (APPLY) {
        person.liveHtmlVerification = {
          verifiedAt,
          method: 'server-rendered-html',
          url,
          httpStatus: response.status,
          paragraphCount: expected.length,
          note: '공개 가상 독백 탭의 서버 렌더링 문단이 승인 후보와 연속·완전 일치함. CSS·스크롤 육안 검수는 liveVerifiedAt으로 별도 기록.',
        }
      }
    } catch (error) {
      failed++
      console.log(`FAIL\t${person.slug}\t${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (APPLY && passed > 0) writeBatchAtomic(FILE, batch)
  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    passed,
    failed,
    batch: batch.batchId,
    file: FILE,
  }, null, 2))
  if (failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
