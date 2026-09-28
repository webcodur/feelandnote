/** 기존 원본을 보존하며 중간 이미지만 추가한다. 기본은 조회, --execute일 때만 R2에 쓴다. */
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { CELEB_AVATAR_ORIGINAL, CELEB_AVATAR_MEDIUM } from '@feelandnote/shared/constants/celeb-avatar-small'
import { buildMediumAvatar, mediumAvatarKey } from '../../src/lib/avatar-small'
import { boPath } from '../lib/paths'
import { mkdir, writeFile, appendFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

process.loadEnvFile(boPath('.env'))
const argv = process.argv.slice(2)
const value = (flag: string) => {
  const index = argv.indexOf(flag)
  return index < 0 ? undefined : argv[index + 1]
}
const execute = argv.includes('--execute')
const limit = Number(value('--limit') ?? Infinity)
if (!(limit > 0) || (Number.isFinite(limit) && !Number.isInteger(limit))) throw new Error('Invalid --limit')
const slugs = value('--slugs')?.split(',')
const fromId = value('--from-id')
if (fromId && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(fromId)) throw new Error('Invalid --from-id')
const preview = value('--preview')
const log = value('--log')
if (execute && !log) throw new Error('--execute requires --log (JSONL)')
const env = process.env
for (const key of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
  if (!env[key]) throw new Error(`Missing ${key}`)
}
const db = createClient(env.NEXT_PUBLIC_DB_API_URL!, env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const r2 = new S3Client({
  region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, maxAttempts: 2,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
})
const Bucket = env.R2_BUCKET_NAME!
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const missing = (error: unknown) => (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
const options = () => ({ abortSignal: AbortSignal.timeout(20000) })
type Target = { id: string; slug: string | null; avatar_url: string }

async function processOne(target: Target) {
  const sourceKey = `celebs/${target.id}/${CELEB_AVATAR_ORIGINAL.file}`
  const url = new URL(target.avatar_url)
  if (url.origin !== new URL(env.R2_PUBLIC_URL!).origin || decodeURIComponent(url.pathname) !== `/${sourceKey}`) {
    return { status: 'external', id: target.id, slug: target.slug }
  }
  const Key = mediumAvatarKey(target.id)
  const source = await r2.send(new GetObjectCommand({ Bucket, Key: sourceKey }), options())
  if (!source.Body) throw new Error('Empty source')
  const original = Buffer.from(await source.Body.transformToByteArray())
  const metadata = await sharp(original).metadata()
  if (metadata.width !== metadata.height) throw new Error(`Non-square original: ${metadata.width}x${metadata.height}`)
  const medium = await buildMediumAvatar(original)
  const output = await sharp(medium).metadata()
  const expected = Math.min(metadata.width!, CELEB_AVATAR_MEDIUM.sizePx)
  if (output.width !== expected || output.height !== expected || !!output.hasAlpha !== !!metadata.hasAlpha) {
    throw new Error('Dimensions/alpha validation failed')
  }
  if (preview) {
    const directory = resolve(preview, target.slug ?? target.id)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'original.webp'), original, { flag: 'wx' })
    await writeFile(join(directory, 'medium.webp'), medium, { flag: 'wx' })
    const before = await sharp(original).resize(384, 384).png().toBuffer()
    const after = await sharp(medium).resize(384, 384).png().toBuffer()
    await sharp({ create: { width: 768, height: 384, channels: 4, background: '#202020' } })
      .composite([{ input: before, left: 0, top: 0 }, { input: after, left: 384, top: 0 }])
      .png().toFile(join(directory, 'compare.png'))
  }
  const details = { id: target.id, slug: target.slug, sourceBytes: original.length, bytes: medium.length, sourceEtag: source.ETag }
  // 모든 오류를 '없음'으로 간주하지 않는다. 권한·네트워크 오류면 쓰지 않는다.
  try {
    const existing = await r2.send(new HeadObjectCommand({ Bucket, Key }), options())
    if ((existing.Metadata?.['source-etag'] && existing.Metadata['source-etag'] !== source.ETag)
      || (existing.Metadata?.['sha256'] && existing.Metadata.sha256 !== digest(medium))) {
      throw new Error('Existing medium differs; refusing to overwrite')
    }
    const stored = await r2.send(new GetObjectCommand({ Bucket, Key }), options())
    if (!stored.Body || digest(Buffer.from(await stored.Body.transformToByteArray())) !== digest(medium)) throw new Error('Stored medium checksum mismatch')
    return { status: 'verified-existing', ...details }
  } catch (error) { if (!missing(error)) throw error }
  if (!execute) return { status: 'planned', ...details }
  // 변환 중 원본이 교체됐으면 쓰지 않는다. 대상 파일도 다른 작업이 만들었으면 조건부 PUT이 막는다.
  const current = await r2.send(new HeadObjectCommand({ Bucket, Key: sourceKey }), options())
  if (current.ETag !== source.ETag) throw new Error('Source changed during conversion')
  await r2.send(new PutObjectCommand({
    Bucket, Key, Body: medium, IfNoneMatch: '*', ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: { 'source-etag': source.ETag!, sha256: digest(medium) },
  }), options())
  const check = await r2.send(new GetObjectCommand({ Bucket, Key }), options())
  if (!check.Body || digest(Buffer.from(await check.Body.transformToByteArray())) !== digest(medium)) throw new Error('Uploaded checksum mismatch')
  const after = await r2.send(new HeadObjectCommand({ Bucket, Key: sourceKey }), options())
  if (after.ETag !== source.ETag) throw new Error('Source changed during upload; inspect this target')
  return { status: 'created', ...details }
}

async function main() {
  const targets = await selectAllPages<Target>((from, to) => {
    let query = db.from('celebs').select('id, slug, avatar_url').not('avatar_url', 'is', null).neq('avatar_url', '').order('id').range(from, to)
    if (slugs) query = query.in('slug', slugs)
    if (fromId) query = query.gte('id', fromId)
    return query
  }, limit)
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry', count: targets.length }))
  if (slugs && !targets.length) throw new Error('No avatars matched --slugs')
  if (!execute && !preview) return
  if (log) await mkdir(resolve(log, '..'), { recursive: true })
  let cursor = 0, done = 0, consecutiveErrors = 0
  const tally: { [key: string]: number } = {}
  async function worker() {
    while (cursor < targets.length && consecutiveErrors < 5) {
      const target = targets[cursor++]
      let result
      try { result = await processOne(target); consecutiveErrors = 0 }
      catch (error) {
        consecutiveErrors++
        result = { status: 'failed', id: target.id, slug: target.slug, error: error instanceof Error ? error.message : String(error) }
      }
      tally[result.status] = (tally[result.status] ?? 0) + 1
      done++
      if (log) await appendFile(log, JSON.stringify({ at: new Date().toISOString(), ...result }) + '\n')
      if (targets.length <= 10 || result.status === 'failed') console.log(JSON.stringify(result))
      if (done % 50 === 0 || done === targets.length) console.log(JSON.stringify({ done, total: targets.length, tally }))
    }
  }
  await Promise.all(Array.from({ length: preview ? 1 : 8 }, worker))
  console.log(JSON.stringify({ complete: done === targets.length, done, total: targets.length, tally }))
  if (tally.failed || done !== targets.length) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => r2.destroy())
