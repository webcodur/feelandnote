/**
 * 세력도감 태그 단체 이미지(team_images) 일괄 등록
 * faction AI-Supremacy 세력별 group.png → 1080 정사각 webp → R2 faction/{tagId}/team/{uuid}.webp → celeb_tags.team_images 재구성
 *
 * 사용법 (sw/web-bo 디렉토리에서): npx tsx scripts/upload-tag-team-images.ts
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
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

// faction 세력 폴더 → 세력도감 태그 slug + cluster group.png 번호
const MAP: { slug: string; dir: string; groups: number[] }[] = [
  { slug: 'ai-pioneers', dir: '01-pioneers', groups: [1, 2, 3, 4, 5] },
  { slug: 'google-deepmind', dir: '02-google-deepmind', groups: [1, 2, 3] },
  { slug: 'openai', dir: '03-openai', groups: [1, 2] },
  { slug: 'anthropic', dir: '04-anthropic', groups: [1, 2, 3, 4] },
  { slug: 'xai', dir: '05-xai', groups: [1] },
  { slug: 'meta', dir: '06-meta', groups: [1, 2] },
  { slug: 'mistral', dir: '07-mistral', groups: [1] },
  { slug: 'deepseek', dir: '08-deepseek', groups: [1] },
  { slug: 'ssi', dir: '09-ssi', groups: [1] },
  { slug: 'thinking-machines', dir: '10-tml', groups: [1, 2] },
  // 11-huggingface: group.png 없음 → 기존 team_images 유지(건드리지 않음)
]

const BASE = 'C:/project/feelandnote/sw/remotion/public/factions/AI-Supremacy'

async function main() {
  loadEnv(boPath('.env'))
  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
    R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  } = process.env as Record<string, string>

  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) throw new Error(`.env에 ${k} 누락`)
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  })
  const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  for (const m of MAP) {
    const { data, error } = await sb.from('celeb_tags').select('id').eq('slug', m.slug).single()
    if (error || !data) { console.error(`[${m.slug}] 태그 조회 실패`, error?.message); continue }
    const tagId = data.id as string
    const urls: string[] = []
    for (const g of m.groups) {
      const png = readFileSync(`${BASE}/${m.dir}/${g}/group.png`)
      const webp = await sharp(png).resize(1080, 1080, { fit: 'cover', position: 'attention' }).webp({ quality: 85 }).toBuffer()
      const key = `faction/${tagId}/team/${randomUUID()}.webp`
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME, Key: key, Body: webp,
        ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
      }))
      urls.push(`${R2_PUBLIC_URL}/${key}?v=${Date.now()}`)
      console.log(`  ${m.slug} <- ${m.dir}/${g}/group.png (${(webp.length / 1024).toFixed(0)}KB)`)
    }
    const { error: upErr } = await sb.from('celeb_tags').update({ team_images: urls }).eq('id', tagId)
    if (upErr) { console.error(`[${m.slug}] team_images 갱신 실패`, upErr.message); continue }
    console.log(`[${m.slug}] team_images ${urls.length}장 설정 완료`)
  }
  console.log('=== 전체 완료 ===')
}

main().catch((e) => { console.error(e); process.exit(1) })
