/**
 * 로컬 이미지 → 셀럽 아바타 등록
 *
 * 위키미디어를 거치지 않고 손에 있는 파일을 그대로 올린다. 기존 등록기(upload.ts·batch.ts)는
 * Commons·Wikidata 전용이라 생성 이미지를 넣을 경로가 없었다.
 *
 * **자르는 일은 하지 않는다.** 규격 크롭은 scripts/avatar/crop-local.ts 가 먼저 끝내고,
 * 여기는 그 결과를 공유 원본 규격 WebP로 줄여 R2에 올리고 DB를 갱신하는 것만 한다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/upload-local.ts \
 *     --celeb-id <uuid> --slug <slug> --file <크롭끝난이미지경로> \
 *     [--size <px>] [--quality <1~100>] [--dry-run]
 *
 *   --slug 는 확인용이다. DB 의 slug 와 다르면 올리지 않고 멈춘다.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import {
  CELEB_AVATAR_ORIGINAL,
} from '@feelandnote/shared/constants/celeb-avatar-small'
import { buildSmallAvatar, smallAvatarKey } from '../../src/lib/avatar-small'
import { BO_ROOT } from '../lib/paths'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : null
}
const celebId = flag('celeb-id')
const slug = flag('slug')
const file = flag('file')
const size = Number(flag('size') ?? CELEB_AVATAR_ORIGINAL.sizePx)
const quality = Number(flag('quality') ?? CELEB_AVATAR_ORIGINAL.webpQuality)
const dryRun = args.includes('--dry-run')

if (!celebId || !slug || !file) {
  console.error('사용법: npx tsx scripts/avatar/upload-local.ts --celeb-id <uuid> --slug <slug> --file <경로>')
  process.exit(1)
}
if (!existsSync(file)) {
  console.error(`파일이 없다: ${file}`)
  process.exit(1)
}
// 위 guard 의 좁힘은 함수 경계를 넘지 못한다. main() 안에서 쓸 확정값을 여기서 받는다.
const targetCelebId = celebId
const expectedSlug = slug
const filePath = file

const env = Object.fromEntries(
  readFileSync(resolve(BO_ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
) as Record<string, string>

for (const key of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
  if (!env[key]) throw new Error(`.env 에 ${key} 가 없다`)
}

const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY)

async function main() {
  console.log(`[1/4] 대상 확인`)
  const { data: celeb, error: readError } = await db
    .from('celebs')
    .select('id, slug, nickname, avatar_url, publication_status')
    .eq('id', targetCelebId)
    .single()
  if (readError || !celeb) throw new Error(`셀럽 조회 실패: ${readError?.message ?? '없음'}`)
  if (celeb.slug !== expectedSlug) throw new Error(`slug 불일치 — DB "${celeb.slug}" vs 인자 "${expectedSlug}"`)
  console.log(`     ${celeb.nickname} (${celeb.slug}) · ${celeb.publication_status}`)
  if (celeb.avatar_url) console.log(`     ⚠ 기존 아바타를 덮어쓴다: ${celeb.avatar_url}`)

  console.log(`[2/4] ${size}x${size} webp 변환`)
  const meta = await sharp(filePath).metadata()
  if (meta.width !== meta.height) {
    console.warn(`     ⚠ 정사각이 아니다 (${meta.width}x${meta.height}) — crop-local 을 먼저 돌렸는지 확인하라`)
  }
  const buf = await sharp(filePath).resize(size, size, { fit: 'cover' }).webp({ quality }).toBuffer()
  const smallBuf = await buildSmallAvatar(buf)
  console.log(`     avatar ${buf.length} bytes · small ${smallBuf.length} bytes`)

  if (dryRun) {
    console.log('[3/4] --dry-run 이라 업로드하지 않는다')
    console.log('[4/4] --dry-run 이라 DB 를 건드리지 않는다')
    return
  }

  console.log(`[3/4] R2 업로드`)
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  })
  const put = (key: string, body: Buffer) => r2.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  const key = `celebs/${targetCelebId}/${CELEB_AVATAR_ORIGINAL.file}`
  await put(key, buf)
  await put(smallAvatarKey(targetCelebId), smallBuf)
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`
  console.log(`     PUT ok: ${publicUrl}`)

  console.log(`[4/4] celebs.avatar_url 갱신`)
  const { error } = await db.from('celebs').update({ avatar_url: publicUrl }).eq('id', targetCelebId)
  if (error) throw new Error(`DB 갱신 실패: ${error.message}`)
  console.log(`     완료 — ${celeb.nickname}`)
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
