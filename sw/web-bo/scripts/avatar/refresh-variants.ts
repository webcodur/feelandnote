/** 기존 원본에서 중·소를 재생성한다. 기본은 dry-run, --execute는 기존 파생 파일도 교체한다. */
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@feelandnote/db'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { refreshVariants, AvatarChanged, type Target, type VariantIO } from './refresh-variants-core'
import { boPath } from '../lib/paths'
import { mkdir, writeFile, appendFile, readFile } from 'node:fs/promises'
import { resolve, join, basename } from 'node:path'

process.loadEnvFile(boPath('.env'))
const args = process.argv.slice(2)
const value = (flag: string) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1] }
const execute = args.includes('--execute'), verify = args.includes('--verify')
if (execute && verify) throw new Error('Choose --execute or --verify')
const mode = execute ? 'execute' : verify ? 'verify' : 'plan'
const limit = Number(value('--limit') ?? Infinity), concurrency = Number(value('--concurrency') ?? 8)
if (!(limit > 0) || (Number.isFinite(limit) && !Number.isInteger(limit))) throw new Error('Invalid --limit')
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 24) throw new Error('Invalid --concurrency')
const slugs = value('--slugs')?.split(','), fromId = value('--from-id')
if (fromId && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(fromId)) throw new Error('Invalid --from-id')
const preview = value('--preview'), log = value('--log')
const resumeLog = value('--resume-log')
if (execute && !log) throw new Error('--execute requires --log')
const env = process.env
for (const key of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
  if (!env[key]) throw new Error(`Missing ${key}`)
}
const db = createClient(env.NEXT_PUBLIC_DB_API_URL!, env.DB_SECRET_KEY!)
const r2 = new S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, maxAttempts: 2,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! } })
const Bucket = env.R2_BUCKET_NAME!, origin = new URL(env.R2_PUBLIC_URL!).origin
const options = () => ({ abortSignal: AbortSignal.timeout(25000) })
const io: VariantIO = {
  async head(Key) {
    try { const h = await r2.send(new HeadObjectCommand({ Bucket, Key }), options()); return { etag: h.ETag!, bytes: h.ContentLength! } }
    catch (error) { if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null; throw error }
  },
  async read(Key) {
    const r = await r2.send(new GetObjectCommand({ Bucket, Key }), options())
    if (!r.Body || !r.ETag) throw new Error(`Empty object: ${Key}`)
    const body = Buffer.from(await r.Body.transformToByteArray())
    return { body, etag: r.ETag, bytes: body.length }
  },
  async put(Key, Body, previous, Metadata) {
    try {
      await r2.send(new PutObjectCommand({ Bucket, Key, Body, Metadata, ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        ...(previous ? { IfMatch: previous.etag } : { IfNoneMatch: '*' }),
      }), options())
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 412) throw new AvatarChanged(`Variant changed concurrently: ${Key}`)
      throw error
    }
  },
  async currentUrl(id) {
    const { data, error } = await db.from('celebs').select('avatar_url').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data.avatar_url
  },
  async publish(id, expectedUrl, nextUrl) {
    const { data, error } = await db.from('celebs').update({ avatar_url: nextUrl }).eq('id', id).eq('avatar_url', expectedUrl).select('id')
    if (error) throw new Error(error.message)
    return data?.length === 1
  },
}

async function main() {
  let targets = await selectAllPages<Target>((from, to) => {
    let q = db.from('celebs').select('id, slug, avatar_url').eq('publication_status', 'active')
      .not('avatar_url', 'is', null).neq('avatar_url', '').order('id').range(from, to)
    if (slugs) q = q.in('slug', slugs)
    if (fromId) q = q.gte('id', fromId)
    return q
  }, limit)
  if (resumeLog) {
    const completed = new Map<string, string>()
    for (const line of (await readFile(resumeLog, 'utf8')).split('\n').filter(Boolean)) {
      const row = JSON.parse(line)
      if (row.status === 'updated' && typeof row.id === 'string' && typeof row.url === 'string') completed.set(row.id, row.url)
    }
    const count = targets.length
    targets = targets.filter(target => completed.get(target.id) !== target.avatar_url)
    console.log(JSON.stringify({ resumed: count - targets.length, remaining: targets.length }))
  }
  if (!targets.length) throw new Error('No avatars matched')
  console.log(JSON.stringify({ mode, targets: targets.length, concurrency }))
  if (log) await mkdir(resolve(log, '..'), { recursive: true })
  let next = 0, done = 0
  const tally: Record<string, number> = {}, failures: Array<{ id: string; slug: string | null; status: string; error: string }> = []
  async function worker() {
    while (next < targets.length) {
      const target = targets[next++]
      let result
      try {
        const url = new URL(target.avatar_url)
        if (url.origin !== origin || url.pathname !== `/celebs/${target.id}/${CELEB_AVATAR_ORIGINAL.file}`) {
          result = { status: 'external', slug: target.slug, id: target.id }
        } else {
          let save
          if (preview) {
            const directory = resolve(preview, target.slug ?? target.id)
            await mkdir(directory, { recursive: true })
            const original = await io.read(url.pathname.slice(1))
            await writeFile(join(directory, 'original.webp'), original.body, { flag: 'wx' })
            save = async (key: string, body: Buffer) => { await writeFile(join(directory, basename(key)), body, { flag: 'wx' }) }
          }
          result = await refreshVariants(target, io, mode, save)
        }
      } catch (error) {
        result = { slug: target.slug, id: target.id, status: error instanceof AvatarChanged ? 'conflict' : 'failed', error: (error as Error).message }
        failures.push(result)
      }
      tally[result.status] = (tally[result.status] ?? 0) + 1
      if (log) await appendFile(log, JSON.stringify({ at: new Date().toISOString(), ...result }) + '\n')
      done++
      if (targets.length <= 10 || result.status === 'failed' || result.status === 'conflict') console.log(JSON.stringify(result))
      if (done % 100 === 0 || done === targets.length) console.log(JSON.stringify({ done, total: targets.length, tally }))
    }
  }
  await Promise.all(Array.from({ length: preview ? 1 : concurrency }, worker))
  console.log(JSON.stringify({ complete: done === targets.length, done, total: targets.length, tally, failures }))
  if (failures.length || done !== targets.length) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => r2.destroy())
