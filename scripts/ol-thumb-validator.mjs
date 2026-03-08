/**
 * Open Library 썸네일 유효성 검증
 *
 * OL은 표지가 없으면 1x1px 투명 이미지(~43byte)를 반환한다.
 * HEAD 요청으로 Content-Length를 확인하여 플레이스홀더를 판별하고,
 * 문제 있는 URL을 NULL로 마킹한다.
 *
 * 실행: node scripts/ol-thumb-validator.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DRY_RUN = process.argv.includes('--dry-run')
const MIN_VALID_SIZE = 1000  // 1KB 미만이면 플레이스홀더로 간주
const CONCURRENCY = parseInt(process.env.OL_CONCURRENCY || '20', 10)
const TIMEOUT_MS = parseInt(process.env.OL_TIMEOUT || '10000', 10)
const BATCH_SIZE = 200

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) return { valid: false, reason: `HTTP ${res.status}` }

    const contentLength = parseInt(res.headers.get('content-length') || '0', 10)
    if (contentLength > 0 && contentLength < MIN_VALID_SIZE) {
      return { valid: false, reason: `tiny ${contentLength}B` }
    }

    // Content-Length가 없으면 GET으로 실제 크기 확인
    if (!contentLength) {
      const getRes = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const buf = await getRes.arrayBuffer()
      if (buf.byteLength < MIN_VALID_SIZE) {
        return { valid: false, reason: `tiny ${buf.byteLength}B (GET)` }
      }
    }

    return { valid: true }
  } catch (err) {
    return { valid: false, reason: err.message?.substring(0, 50) || 'unknown error' }
  }
}

async function processChunk(rows) {
  const results = await Promise.all(
    rows.map(async (row) => {
      const result = await checkUrl(row.thumbnail_url)
      return { ...row, ...result }
    })
  )
  return results
}

async function main() {
  console.log(`OL 썸네일 검증 시작 (DRY_RUN=${DRY_RUN})`)

  // 전체 OL URL 조회
  let allRows = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('content_locales')
      .select('content_id, locale, thumbnail_url')
      .like('thumbnail_url', '%covers.openlibrary.org%')
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('DB 조회 오류:', error.message)
      break
    }
    if (!data?.length) break
    allRows.push(...data)
    offset += BATCH_SIZE
    if (data.length < BATCH_SIZE) break
  }

  console.log(`총 ${allRows.length}건 OL URL 발견`)

  let invalidCount = 0
  let validCount = 0
  const invalidRows = []

  // CONCURRENCY 단위로 병렬 처리
  for (let i = 0; i < allRows.length; i += CONCURRENCY) {
    const chunk = allRows.slice(i, i + CONCURRENCY)
    const results = await processChunk(chunk)

    for (const r of results) {
      if (r.valid) {
        validCount++
      } else {
        invalidCount++
        invalidRows.push(r)
        console.log(`  ❌ ${r.content_id} (${r.locale}) - ${r.reason}: ${r.thumbnail_url}`)
      }
    }

    const progress = Math.min(i + CONCURRENCY, allRows.length)
    if (progress % 100 === 0 || progress === allRows.length) {
      console.log(`  진행: ${progress}/${allRows.length} (유효: ${validCount}, 무효: ${invalidCount})`)
    }

    // rate limit 방지
    if (i + CONCURRENCY < allRows.length) await sleep(200)
  }

  console.log(`\n검증 완료: 유효 ${validCount} / 무효 ${invalidCount} / 전체 ${allRows.length}`)

  if (invalidRows.length === 0) {
    console.log('모든 OL URL이 유효하다.')
    return
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] ${invalidRows.length}건 무효 URL 발견. --dry-run 없이 실행하면 NULL로 업데이트됨.`)
    return
  }

  // 무효 URL을 NULL로 업데이트
  console.log(`\n${invalidRows.length}건 무효 URL → NULL 업데이트 시작`)
  let updated = 0

  for (const row of invalidRows) {
    const { error } = await supabase
      .from('content_locales')
      .update({ thumbnail_url: null })
      .eq('content_id', row.content_id)
      .eq('locale', row.locale)

    if (error) {
      console.error(`  업데이트 실패: ${row.content_id}`, error.message)
    } else {
      updated++
    }
  }

  console.log(`업데이트 완료: ${updated}/${invalidRows.length}건`)
}

main().catch(console.error)
