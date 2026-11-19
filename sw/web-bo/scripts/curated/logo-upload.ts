/**
 * 손에 있는 정사각 기관 로고를 R2에 올리고 curators.logo_url·logo_palette를 갱신한다
 *
 * 파일은 1:1 PNG여야 한다. R2 키는 `curators/<slug>/logo-square-<내용 SHA-256 앞 12자>.png`이고,
 * 화면은 `logo_url`을 그대로 쓴다.
 * 팔레트는 logo-palette.ts와 같은 방식으로 뽑되, 배경이 꽉 찬 타일이면 `--treatment original`로 원본 표시를 고정한다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/logo-upload.ts --slug <기관 slug> --file <png> [--treatment original] [--apply]
 *   --apply 가 없으면 계산 결과만 출력한다. 반영 뒤 `curated` 캐시를 갱신한다.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@feelandnote/db'
import sharp from 'sharp'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { boPath } from '../lib/paths'
import { paletteFromImage } from './logo-palette'

for (const raw of readFileSync(boPath('.env'), 'utf8').split(/\r?\n/)) {
  const m = raw.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const slug = flag('slug'), file = flag('file'), treatment = flag('treatment')
const apply = args.includes('--apply')
if (!slug || !file) throw new Error('사용법: --slug <slug> --file <png> [--treatment original] [--apply]')

async function main() {
  const src = readFileSync(file!)
  const meta = await sharp(src).metadata()
  if (meta.width !== meta.height) throw new Error(`정사각이 아니다: ${meta.width}x${meta.height}`)
  const png = meta.format === 'png' ? src : await sharp(src).png().toBuffer()
  const key = `curators/${slug}/logo-square-${createHash('sha256').update(png).digest('hex').slice(0, 12)}.png`
  const url = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
  const palette = await paletteFromImage(png)
  if (treatment) Object.assign(palette, { treatment, monochrome: false })
  console.log(JSON.stringify({ slug, size: meta.width, url, palette }))
  if (!apply) return

  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
  const { data: row, error: findError } = await db.from('curators').select('id').eq('slug', slug!).maybeSingle()
  if (findError || !row) throw findError ?? new Error(`기관이 없다: ${slug}`)
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  })
  await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, Body: png, ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable' }))
  const head = await fetch(url, { method: 'HEAD' })
  if (!head.ok) throw new Error(`업로드 확인 실패 ${head.status}: ${url}`)
  const { error } = await db.from('curators').update({ logo_url: url, logo_palette: palette }).eq('id', row.id)
  if (error) throw error
  console.log('반영', slug)
}

main().catch((e) => { console.error(e); process.exit(1) })
