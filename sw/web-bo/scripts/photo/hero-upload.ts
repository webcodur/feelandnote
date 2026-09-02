/**
 * 인물 상세 상단 대표 화보(celebs.portrait_url) 일괄 등록
 * 로컬 화보(배경 포함 연출컷) → 공용 비율 중앙 크롭 webp → R2 celebs/{celebId}/photo.webp → celebs 갱신
 *
 * ※ 아바타(avatar_url, 얼굴 크롭 800×800)와 별개다. 여기서는 인물 상세용 세로 화보를 만든다.
 * ※ 세력도감 개인화보(celeb_tag_assignments.faction_image_url)와도 별개다.
 *    대문이 비어 있으면 화면이 세력도감 화보를 자동으로 끌어다 쓴다(getCelebBySlug).
 *
 * 입력: scratchpad/hero_photo_batch.json  [{slug, celeb_id, nickname, image}]
 * 사용법 (sw/web-bo 디렉토리에서): npx tsx scripts/upload-celeb-hero-photo.ts [배치경로]
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { boPath } from '../lib/paths'


function loadEnv(p: string) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

interface Row {
  slug: string
  celeb_id: string
  nickname: string
  image: string
}

const PORTRAIT_WIDTH = CELEB_HERO_PHOTO_SPEC.storageWidthPx
const PORTRAIT_HEIGHT = CELEB_HERO_PHOTO_SPEC.storageHeightPx

async function toPortraitWebp(src: Buffer) {
  // EXIF 방향을 먼저 굽고 실제 픽셀 크기로 공용 비율의 중앙 영역을 계산한다.
  const oriented = await sharp(src).rotate().toBuffer({ resolveWithObject: true })
  const sourceWidth = oriented.info.width
  const sourceHeight = oriented.info.height
  const targetRatio = PORTRAIT_WIDTH / PORTRAIT_HEIGHT
  const sourceRatio = sourceWidth / sourceHeight

  const cropWidth = sourceRatio > targetRatio
    ? Math.round(sourceHeight * targetRatio)
    : sourceWidth
  const cropHeight = sourceRatio > targetRatio
    ? sourceHeight
    : Math.round(sourceWidth / targetRatio)
  const left = Math.max(0, Math.floor((sourceWidth - cropWidth) / 2))
  const top = Math.max(0, Math.floor((sourceHeight - cropHeight) / 2))

  return sharp(oriented.data)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true })
}

async function main() {
  const batchPath = process.argv[2]
  if (!batchPath) throw new Error('배치 JSON 경로를 인자로 넘겨라')

  loadEnv(boPath('.env'))
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY']) {
    if (!process.env[k]) throw new Error(`.env에 ${k} 누락`)
  }
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
    R2_PUBLIC_URL, NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY,
  } = process.env as Record<string, string>

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })
  const db = createClient(NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY)

  const rows: Row[] = JSON.parse(readFileSync(batchPath, 'utf-8'))
  const done: { slug: string; url: string }[] = []

  for (const r of rows) {
    // 대상이 실제로 그 인물인지 확인한 뒤에만 쓴다(id-slug 불일치 방지)
    const { data: person, error: findErr } = await db
      .from('celebs').select('id, slug, nickname').eq('id', r.celeb_id).single()
    if (findErr || !person) { console.error(`[${r.slug}] 인물 조회 실패`); continue }
    if (person.slug !== r.slug) { console.error(`[${r.slug}] slug 불일치(DB: ${person.slug}) — 건너뜀`); continue }

    const src = readFileSync(r.image)
    // 기존 정사각 자산도 쓸 수 있도록 공용 비율로 중앙 크롭한다. 작은 원본은 확대하지 않는다.
    const portrait = await toPortraitWebp(src)
    const webp = portrait.data

    const key = `celebs/${r.celeb_id}/photo.webp`
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: key, Body: webp,
      ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
    }))
    const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`

    const { error } = await db.from('celebs').update({ portrait_url: url }).eq('id', r.celeb_id)
    if (error) { console.error(`[${r.slug}] 갱신 실패`, error.message); continue }

    done.push({ slug: r.slug, url })
    console.log(`  ${r.nickname} (${r.slug}) <- ${r.image.split('/').pop()} (${portrait.info.width}x${portrait.info.height}, ${(webp.length / 1024).toFixed(0)}KB)`)
  }

  console.log(`=== 대표 사진 ${done.length}/${rows.length}명 완료 ===`)
}

main().catch((e) => { console.error(e); process.exit(1) })
