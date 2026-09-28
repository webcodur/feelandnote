/** 기존 대표·개인 화보의 표시용 파일만 추가한다. 기본은 조회이며 원본과 DB는 쓰지 않는다. */
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { artworkVariantKey, portraitVariantUrl } from '@feelandnote/shared/constants/responsive-artwork'
import { buildPortraitVariants } from '../../src/lib/portrait-variants'
import { boPath } from '../lib/paths'
import { createHash } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import sharp from 'sharp'

process.loadEnvFile(boPath('.env'))
const args = process.argv.slice(2)
const value = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
const execute = args.includes('--execute'), log = value('--log'), preview = value('--preview')
const limit = Number(value('--limit') ?? Infinity), fromKey = value('--from-key')
if (!(limit > 0) || (Number.isFinite(limit) && !Number.isInteger(limit))) throw new Error('Invalid --limit')
if (execute && !log) throw new Error('--execute requires --log')
const env = process.env
for (const key of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']) {
  if (!env[key]) throw new Error(`Missing ${key}`)
}
const db = createClient(env.NEXT_PUBLIC_DB_API_URL!, env.DB_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const r2 = new S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, maxAttempts: 2,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! } })
const Bucket = env.R2_BUCKET_NAME!
const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
const options = () => ({ abortSignal: AbortSignal.timeout(30000) })
const status = (e: unknown) => (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode

async function main() {
  const [people, members] = await Promise.all([
    selectAllPages<{ portrait_url: string }>((from, to) => db.from('celebs').select('portrait_url').not('portrait_url', 'is', null).order('id').range(from, to)),
    selectAllPages<{ image_url: string }>((from, to) => db.from('faction_members').select('image_url').not('image_url', 'is', null).order('id').range(from, to)),
  ])
  const urls = [...new Set([...people.map(x => x.portrait_url), ...members.map(x => x.image_url)].filter(Boolean))]
  const unsupported = urls.filter(url => portraitVariantUrl(url, 480) === url)
  const targets = [...new Set(urls.filter(url => !unsupported.includes(url)).map(url => decodeURIComponent(new URL(url).pathname.slice(1))))]
    .sort().filter(key => !fromKey || key >= fromKey).slice(0, limit)
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry', targets: targets.length, unsupported }))
  if (!execute && !preview) return
  if (log) await mkdir(resolve(log, '..'), { recursive: true })
  let cursor = 0, done = 0, errors = 0
  const tally: Record<string, number> = {}
  async function one(key: string) {
    const source = await r2.send(new GetObjectCommand({ Bucket, Key: key }), options())
    if (!source.Body) throw new Error('Empty original')
    const original = Buffer.from(await source.Body.transformToByteArray())
    const meta = await sharp(original).metadata()
    const variants = await buildPortraitVariants(original)
    const details = []
    for (const { width, body } of variants) {
      const output = await sharp(body).metadata()
      if (!output.width || !output.height || output.width > width || !!output.hasAlpha !== !!meta.hasAlpha) throw new Error('Size/alpha validation failed')
      if (Math.abs(output.width / output.height - meta.width! / meta.height!) > 0.005) throw new Error('Aspect ratio changed')
      let created = false
      const Key = artworkVariantKey(key, width)
      if (execute) {
        try {
          await r2.send(new PutObjectCommand({ Bucket, Key, Body: body, IfNoneMatch: '*', ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable', Metadata: { 'source-etag': source.ETag!, sha256: hash(body) } }), options())
          created = true
        } catch (e) { if (status(e) !== 412) throw e }
        const stored = await r2.send(new GetObjectCommand({ Bucket, Key }), options())
        if (!stored.Body || hash(Buffer.from(await stored.Body.transformToByteArray())) !== hash(body)) throw new Error(`Existing/uploaded variant differs: ${Key}`)
      }
      details.push({ width, actualWidth: output.width, height: output.height, bytes: body.length, created })
    }
    if (preview) {
      const directory = resolve(preview, key.replaceAll('/', '_'))
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'original.webp'), original, { flag: 'wx' })
      for (const variant of variants) await writeFile(join(directory, `${variant.width}.webp`), variant.body, { flag: 'wx' })
    }
    const current = await r2.send(new HeadObjectCommand({ Bucket, Key: key }), options())
    if (current.ETag !== source.ETag) throw new Error('Original changed during conversion; inspect target')
    return { status: execute ? 'verified' : 'preview', key, sourceEtag: source.ETag, sourceBytes: original.length, sourceWidth: meta.width, sourceHeight: meta.height, variants: details }
  }
  async function worker() {
    while (cursor < targets.length && errors < 5) {
      const key = targets[cursor++]
      let result
      try { result = await one(key); errors = 0 }
      catch (e) { errors++; result = { status: 'failed', key, error: e instanceof Error ? e.message : String(e) } }
      done++; tally[result.status] = (tally[result.status] ?? 0) + 1
      if (log) appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...result }) + '\n')
      if (result.status === 'failed' || targets.length <= 3) console.log(JSON.stringify(result))
      if (done % 50 === 0) console.log(JSON.stringify({ done, total: targets.length, tally }))
    }
  }
  await Promise.all(Array.from({ length: preview ? 1 : 8 }, worker))
  console.log(JSON.stringify({ complete: done === targets.length, done, total: targets.length, tally }))
  if (tally.failed || done !== targets.length || unsupported.length) process.exitCode = 1
}
main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => r2.destroy())
