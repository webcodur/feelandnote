/**
 * 기존 또는 신규 연표 JSON의 국문 의미를 독립 편집한다. DB에는 쓰지 않는다.
 *
 * pnpm exec tsx scripts/celeb/timeline/review-korean.ts --file <json> --out <dir>
 * pnpm exec tsx scripts/celeb/timeline/review-korean.ts --dir <input-dir> --out <dir> [--limit N] [--lanes 3]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { looksRateLimited } from '../../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'
import {
  reviewKoreanTimeline,
  type TimelineEventForKoreanReview,
  type TimelineFactReviewContext,
} from './korean-prose-review'

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

type InputFile = {
  slug?: string
  celeb?: { slug?: string; nickname?: string }
  events?: TimelineEventForKoreanReview[]
  fact_review?: TimelineFactReviewContext
  [key: string]: unknown
}

async function main() {
  const fileArg = argOf('file')
  const dirArg = argOf('dir')
  const outDir = resolve(argOf('out') ?? '.tmp-celeb-timeline-grok/korean-reviewed')
  if (!fileArg && !dirArg) throw new Error('--file 또는 --dir 가 필요하다')
  mkdirSync(outDir, { recursive: true })

  const files = fileArg
    ? [resolve(fileArg)]
    : (await readdir(resolve(dirArg!)))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => resolve(dirArg!, name))
  const limit = Math.min(files.length, Number.parseInt(argOf('limit') ?? String(files.length), 10))
  const queue = files.slice(0, limit)
  const lanes = Math.min(3, Math.max(1, Number.parseInt(argOf('lanes') ?? '3', 10)), queue.length)
  const force = process.argv.includes('--force')
  let ok = 0, skipped = 0, held = 0, failed = 0, rateLimited = 0
  let stopForRateLimit = false

  const lane = async () => {
    for (;;) {
      if (stopForRateLimit) return
      const file = queue.shift()
      if (!file) return
      const name = basename(file)
      const output = resolve(outDir, name)
      if (!force && existsSync(output)) {
        try {
          const saved = JSON.parse(readFileSync(output, 'utf8')) as InputFile & {
            korean_prose_review?: { status?: string }
          }
          if (Array.isArray(saved.events) && saved.events.length > 0 &&
            ['pass', 'revised', 'fact_check', 'research_needed'].includes(saved.korean_prose_review?.status ?? '')) {
            console.log(`SKIPPED ${name} — 검증된 결과가 이미 있음`)
            skipped++
            continue
          }
        } catch {
          // 중간 종료로 깨진 파일은 아래에서 같은 대상 결과로 원자 교체한다.
        }
      }
      try {
        const input = JSON.parse(readFileSync(file, 'utf8')) as InputFile
        const slug = input.slug ?? input.celeb?.slug ?? name.replace(/\.json$/i, '')
        const nickname = input.celeb?.nickname ?? slug
        if (!Array.isArray(input.events) || input.events.length === 0) throw new Error('events 배열이 없다')
        const review = await reviewKoreanTimeline({ slug, nickname }, input.events, input.fact_review)
        const serialized = JSON.stringify({
          ...input,
          slug,
          events: review.events,
          korean_prose_review: {
            status: review.status,
            summary: review.summary,
            issues: review.issues,
            fact_check: review.fact_check,
            research_needed_reason: review.research_needed_reason,
            changed_indices: review.changed_indices,
          },
        }, null, 1)
        const temporary = `${output}.${process.pid}.tmp`
        const displaced = `${output}.${process.pid}.old`
        try {
          writeFileSync(temporary, serialized, 'utf8')
          if (existsSync(output)) renameSync(output, displaced)
          try {
            renameSync(temporary, output)
            if (existsSync(displaced)) rmSync(displaced, { force: true })
          } catch (replaceError) {
            if (existsSync(displaced) && !existsSync(output)) renameSync(displaced, output)
            throw replaceError
          }
        } finally {
          if (existsSync(temporary)) rmSync(temporary, { force: true })
          if (existsSync(displaced) && existsSync(output)) rmSync(displaced, { force: true })
        }
        if (review.status === 'fact_check' || review.status === 'research_needed') {
          const why = review.status === 'fact_check'
            ? `사실 확인 ${review.fact_check.length}건`
            : `생애 구성 재조사: ${review.research_needed_reason}`
          console.log(`HELD ${slug} — ${why}, 문장 수정 ${review.changed_indices.length}건`)
          held++
        } else {
          console.log(`OK   ${slug} — ${review.status}, 문장 수정 ${review.changed_indices.length}건`)
          ok++
        }
      } catch (error) {
        const message = (error as Error).message
        if (looksRateLimited(message) || /^codex exit 1:/i.test(message)) {
          rateLimited++
          stopForRateLimit = true
        }
        console.error(`FAILED ${name} — ${message}`)
        failed++
      }
    }
  }

  await Promise.all(Array.from({ length: lanes }, () => lane()))
  console.log(JSON.stringify({ total: limit, ok, held, skipped, failed, rateLimited, pending: queue.length, outDir }))
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exit(1) })
