/**
 * 세력도감 태그 전용 인물 개인샷(celeb_tag_assignments.spotlight_image_url) 일괄 등록
 * faction 인물 원본 이미지(전신/연출 화보) → 원본 비율 유지 webp → R2 spotlight/{tagId}/celeb-{celebId}.webp → assignment 갱신
 * ※ 아바타(avatar_url, 얼굴 크롭)와 별개. 여기서는 얼굴 크롭하지 않고 원본을 그대로 쓴다.
 *
 * 입력: scratchpad/faction_img_batch.json  [{slug, celeb_id, tag, tag_id, image}]
 * 사용법 (sw/web-bo 디렉토리에서): npx tsx scripts/upload-faction-celeb-images.ts
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const BATCH = 'C:/Users/webco/AppData/Local/Temp/claude/C--project-feelandnote/296147b2-68ac-47ef-abdd-0a2460cb2dc1/scratchpad/faction_img_batch.json'

async function main() {
  loadEnv(resolve(__dirname, '..', '.env'))
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) throw new Error(`.env에 ${k} 누락`)
  }
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
    R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  } = process.env as Record<string, string>

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })
  const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const rows: { slug: string; celeb_id: string; tag: string; tag_id: string; image: string }[] =
    JSON.parse(readFileSync(BATCH, 'utf-8'))

  let ok = 0
  for (const r of rows) {
    const png = readFileSync(r.image)
    // 얼굴 크롭 없음. 원본 비율 유지, 최대 1080으로만 축소(확대 안 함).
    const webp = await sharp(png).resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer()
    const key = `spotlight/${r.tag_id}/celeb-${r.celeb_id}.webp`
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME, Key: key, Body: webp,
      ContentType: 'image/webp', CacheControl: 'no-cache, must-revalidate',
    }))
    const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
    const { error } = await sb.from('celeb_tag_assignments').update({ spotlight_image_url: url }).eq('tag_id', r.tag_id).eq('celeb_id', r.celeb_id)
    if (error) { console.error(`[${r.slug}] 갱신 실패`, error.message); continue }
    ok++
    console.log(`  ${r.slug} (${r.tag}) <- ${r.image.split('/').pop()} (${(webp.length / 1024).toFixed(0)}KB)`)
  }
  console.log(`=== 개인샷 ${ok}/${rows.length}명 완료 ===`)
}

main().catch((e) => { console.error(e); process.exit(1) })
