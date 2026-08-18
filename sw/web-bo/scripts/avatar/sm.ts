/**
 * 셀럽 아바타 작은 판(avatar-sm.webp) 생성 — R2의 원본 avatar.webp를 읽어 96px로 줄여 나란히 올린다.
 *
 * 왜 필요한가:
 *   원본은 800×800 한 장뿐이라(레티나 3x 대응, docs/project/data/db-celeb.md) 얼굴이 지름 36~40px로
 *   나오는 화면(성향 분포 등)에서도 800px을 그대로 받는다. 성향 분포는 한 화면에 200장이 넘게 깔려
 *   합계 1억 4천만 화소가 되고, 브라우저가 그림 준비를 감당하지 못해 자리가 빈 채로 남는다
 *   (마우스가 지나간 자리만 뒤늦게 그려진다). 작은 판을 따로 두어 그런 화면이 이것만 받게 한다.
 *
 * 안전:
 *   원본 avatar.webp는 읽기만 한다. 이 스크립트는 avatar-sm.webp만 새로 쓴다.
 *   이미 있으면 건너뛰므로 여러 번 돌려도 안전하고, 중단된 지점부터 이어서 돌릴 수 있다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/generate-celeb-avatar-sm.ts --dry            (대상만 세어 본다)
 *   npx tsx scripts/generate-celeb-avatar-sm.ts --limit 20       (앞 20명만 시험 생성)
 *   npx tsx scripts/generate-celeb-avatar-sm.ts                  (전량)
 *   npx tsx scripts/generate-celeb-avatar-sm.ts --force          (이미 있어도 다시 만든다)
 *   npx tsx scripts/generate-celeb-avatar-sm.ts --size 96 --quality 82
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { boPath } from '../lib/paths'


/** 화면에는 지름 36~40px로 나온다. 고해상도 화면 2~3배까지 감당하는 크기다. */
const DEFAULT_SIZE = 96
const DEFAULT_QUALITY = 82
/** R2를 동시에 두드리는 수. 올려도 이득이 적고 실패율만 오른다. */
const CONCURRENCY = 8

type Args = {
  dry: boolean
  force: boolean
  limit: number | null
  size: number
  quality: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const limitRaw = get('--limit')
  const sizeRaw = get('--size')
  const qualityRaw = get('--quality')

  const limit = limitRaw ? Number(limitRaw) : null
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
    console.error(`--limit 값 부적절: ${limitRaw}. 1 이상 정수 필요`)
    process.exit(1)
  }
  const size = sizeRaw ? Number(sizeRaw) : DEFAULT_SIZE
  if (!Number.isInteger(size) || size < 32 || size > 400) {
    console.error(`--size 값 부적절: ${sizeRaw}. 32~400 정수 필요`)
    process.exit(1)
  }
  const quality = qualityRaw ? Number(qualityRaw) : DEFAULT_QUALITY
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    console.error(`--quality 값 부적절: ${qualityRaw}. 1~100 정수 필요`)
    process.exit(1)
  }
  return {
    dry: argv.includes('--dry'),
    force: argv.includes('--force'),
    limit,
    size,
    quality,
  }
}

function loadEnv(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const stream = body as AsyncIterable<Uint8Array>
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

type Target = { id: string; slug: string | null; nickname: string | null }
type Outcome = 'created' | 'skipped' | 'missing' | 'failed'

async function main() {
  const args = parseArgs()
  const env = loadEnv(boPath('.env'))

  for (const k of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ]) {
    if (!env[k]) throw new Error(`.env에 ${k} 누락`)
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('[1/3] 대상 조회')
  // Supabase는 한 번에 1,000행까지만 준다. 전량을 확보하려면 끝까지 이어 받아야 한다.
  const targets: Target[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('celebs')
      .select('id, slug, nickname')
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`대상 조회 실패: ${error.message}`)
    if (!data || data.length === 0) break
    targets.push(...(data as Target[]))
    if (data.length < PAGE) break
  }

  const planned = args.limit ? targets.slice(0, args.limit) : targets
  console.log(`     아바타 보유 인물 ${targets.length}명 · 이번 실행 대상 ${planned.length}명`)
  console.log(`     규격 ${args.size}×${args.size} webp q=${args.quality} · 이미 있으면 ${args.force ? '다시 만든다' : '건너뛴다'}`)

  if (args.dry) {
    console.log('\n[중단] --dry 라서 아무것도 만들지 않았다.')
    return
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
  const bucket = env.R2_BUCKET_NAME

  console.log(`[2/3] 생성 (동시 ${CONCURRENCY})`)
  const tally: Record<Outcome, number> = { created: 0, skipped: 0, missing: 0, failed: 0 }
  const failures: string[] = []
  let bytesOut = 0
  let cursor = 0
  let done = 0

  async function processOne(t: Target): Promise<Outcome> {
    const srcKey = `celebs/${t.id}/avatar.webp`
    const dstKey = `celebs/${t.id}/avatar-sm.webp`

    if (!args.force) {
      try {
        await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: dstKey }))
        return 'skipped'
      } catch {
        // 없으면 만든다
      }
    }

    let original: Buffer
    try {
      const got = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: srcKey }))
      original = await streamToBuffer(got.Body)
    } catch {
      // 원본이 R2에 없는 인물 — DB만 URL을 들고 있는 경우다. 만들 수 없으니 명단에 남긴다.
      return 'missing'
    }

    const small = await sharp(original)
      .resize(args.size, args.size, { fit: 'cover' })
      .webp({ quality: args.quality })
      .toBuffer()

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: dstKey,
        Body: small,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )
    bytesOut += small.length
    return 'created'
  }

  async function worker() {
    while (cursor < planned.length) {
      const t = planned[cursor++]
      let outcome: Outcome
      try {
        outcome = await processOne(t)
      } catch (e) {
        outcome = 'failed'
        failures.push(`${t.slug ?? t.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
      tally[outcome] += 1
      done += 1
      if (done % 100 === 0 || done === planned.length) {
        console.log(
          `     ${done}/${planned.length} — 생성 ${tally.created} · 건너뜀 ${tally.skipped} · 원본없음 ${tally.missing} · 실패 ${tally.failed}`
        )
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log('[3/3] 결과')
  console.log(`     생성 ${tally.created} · 건너뜀 ${tally.skipped} · 원본없음 ${tally.missing} · 실패 ${tally.failed}`)
  if (tally.created > 0) {
    console.log(
      `     새로 올린 용량 ${(bytesOut / 1048576).toFixed(1)}MB · 장당 평균 ${Math.round(bytesOut / tally.created / 1024)}KB`
    )
  }
  if (failures.length > 0) {
    console.log('\n[실패 명단]')
    for (const f of failures.slice(0, 30)) console.log(`     ${f}`)
    if (failures.length > 30) console.log(`     ... 외 ${failures.length - 30}건`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('실패:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
