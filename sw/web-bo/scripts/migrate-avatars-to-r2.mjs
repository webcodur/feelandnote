/**
 * 셀럽 아바타 Supabase Storage → Cloudflare R2 마이그레이션 스크립트
 *
 * 실행 (web-bo 디렉토리에서):
 *   node scripts/migrate-avatars-to-r2.mjs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env 파일 수동 파싱
function loadEnv(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    env[key] = val
  }
  return env
}

const boEnv = loadEnv(resolve(__dirname, '..', '.env'))

const supabase = createClient(
  boEnv.NEXT_PUBLIC_SUPABASE_URL,
  boEnv.SUPABASE_SERVICE_ROLE_KEY
)

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${boEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: boEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: boEnv.R2_SECRET_ACCESS_KEY,
  },
})

const R2_BUCKET = boEnv.R2_BUCKET_NAME
const R2_PUBLIC_URL = boEnv.R2_PUBLIC_URL

async function main() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .like('avatar_url', '%supabase.co/storage%')

  if (error) {
    console.error('프로필 조회 실패:', error.message)
    process.exit(1)
  }

  console.log(`마이그레이션 대상: ${profiles.length}개`)

  let success = 0
  let skipped = 0
  let failed = 0

  for (const profile of profiles) {
    const { id, avatar_url } = profile

    try {
      const res = await fetch(avatar_url.split('?')[0])
      if (!res.ok) {
        console.error(`[SKIP] ${id}: HTTP ${res.status}`)
        skipped++
        continue
      }

      const buffer = Buffer.from(await res.arrayBuffer())

      const key = `celebs/${id}/avatar.webp`
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/webp',
        })
      )

      const newUrl = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', id)

      if (updateError) {
        console.error(`[FAIL] ${id}: DB 업데이트 실패 - ${updateError.message}`)
        failed++
        continue
      }

      success++
      if (success % 50 === 0) {
        console.log(`진행: ${success}/${profiles.length}`)
      }
    } catch (err) {
      console.error(`[FAIL] ${id}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n완료: 성공 ${success} / 스킵 ${skipped} / 실패 ${failed} / 전체 ${profiles.length}`)
}

main()
