/**
 * 재배치 폴더의 아바타를 slug로 인물을 찾아 일괄 등록한다 (R2 PUT + celebs.avatar_url 갱신).
 *
 * reframe.ts 출력 폴더의 `<정렬번호>-<slug>.webp` 또는 `<slug>.webp`를 읽어 DB에서 slug로 celeb id를 찾고,
 * 한 프로세스 안에서 원본·작은 판을 올리고 URL을 갱신한다(인물마다 프로세스를 띄우던 upload-local 경유를 걷어냈다 —
 * 수천 명 전수 작업에서 등록 시간이 10분의 1로 준다). 자르거나 판정하지 않는다. 시트 검수가 끝난 폴더만 넘긴다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/avatar/upload-reframed.ts <재배치폴더> [--only a,b,c] [--dry-run]
 *
 * 결과는 <재배치폴더>/_apply-log.json (dry-run은 _apply-dryrun.json) 에 남긴다.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { buildSmallAvatar, smallAvatarKey } from '../../src/lib/avatar-small'
import { BO_ROOT } from '../lib/paths'

const args = process.argv.slice(2)
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only')
const dryRun = args.includes('--dry-run')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',').map((s) => s.trim())) : null
if (!dir) {
  console.error('사용법: npx tsx scripts/avatar/upload-reframed.ts <재배치폴더> [--only a,b] [--dry-run]')
  process.exit(1)
}
const DIR = dir as string

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
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})
const put = (key: string, body: Buffer) =>
  r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

interface Row {
  slug: string
  status: 'ok' | 'dry-run' | 'no-celeb' | 'failed'
  url?: string
  error?: string
}

async function main() {
  const files = readdirSync(DIR).filter((f) => /\.webp$/i.test(f) && !f.startsWith('_')).sort()
  const targets = files
    .map((file) => ({ file, slug: file.replace(/\.webp$/i, '').replace(/^\d+-/, '') }))
    .filter((t) => !only || only.has(t.slug))
  if (!targets.length) {
    console.error('대상이 없다')
    process.exit(1)
  }
  // slug → id. 한 요청 1,000행 상한을 넘지 않게 나눠 묻는다
  const idOf = new Map<string, string>()
  for (let i = 0; i < targets.length; i += 500) {
    const { data, error } = await db
      .from('celebs')
      .select('id, slug')
      .in('slug', targets.slice(i, i + 500).map((t) => t.slug))
    if (error) throw error
    for (const c of data ?? []) idOf.set(c.slug, c.id)
  }

  console.log(`등록 대상 ${targets.length}명${dryRun ? ' (dry-run)' : ''}`)
  const log: Row[] = []
  let ok = 0
  let fail = 0
  const size = CELEB_AVATAR_ORIGINAL.sizePx
  for (const t of targets) {
    const id = idOf.get(t.slug)
    if (!id) {
      fail++
      log.push({ slug: t.slug, status: 'no-celeb' })
      console.log(`x ${t.slug}: DB에 없는 slug`)
      continue
    }
    try {
      const buf = await sharp(join(DIR, t.file)).resize(size, size, { fit: 'cover' }).webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality }).toBuffer()
      const small = await buildSmallAvatar(buf)
      if (dryRun) {
        ok++
        log.push({ slug: t.slug, status: 'dry-run' })
        continue
      }
      const key = `celebs/${id}/${CELEB_AVATAR_ORIGINAL.file}`
      await put(key, buf)
      await put(smallAvatarKey(id), small)
      const url = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`
      const { error } = await db.from('celebs').update({ avatar_url: url }).eq('id', id)
      if (error) throw new Error(`DB 갱신 실패: ${error.message}`)
      ok++
      log.push({ slug: t.slug, status: 'ok', url })
      if (ok % 25 === 0) console.log(`  … ${ok}/${targets.length}`)
    } catch (e) {
      fail++
      const msg = e instanceof Error ? e.message : String(e)
      log.push({ slug: t.slug, status: 'failed', error: msg })
      console.log(`x ${t.slug}: ${msg}`)
    }
  }
  // dry-run이 실제 등록 로그를 덮어쓰지 않게 파일을 나눈다
  const logFile = join(DIR, dryRun ? '_apply-dryrun.json' : '_apply-log.json')
  writeFileSync(logFile, JSON.stringify(log, null, 2))
  console.log(`\n성공 ${ok} / 실패 ${fail}  ·  로그 ${logFile}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
