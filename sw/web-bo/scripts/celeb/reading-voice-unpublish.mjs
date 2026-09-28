/**
 * 인물 안내 본문을 새로 쓰기 전에 등록된 안내 음성을 내린다. Run from sw/web-bo with node --import tsx.
 * 규칙 SSoT: docs/project/celeb/celeb-05-01-reading.md 「본문 교체와 음성」
 *
 *   --slugs a,b [--locales ko,en] [--run DIR]           내릴 음원만 보여 준다(쓰기 없음)
 *   --slugs a,b [--locales ko,en] [--run DIR] --apply   R2 음원·문장 타이밍을 run 백업에 받은 뒤 지우고,
 *                                                        voice_v를 올려 옛 주소 캐시를 끊고 인물 캐시를 비운다
 *
 * 같은 run의 manifest에 그 인물·언어 항목이 있으면 로컬 음원 폴더와 함께 백업으로 옮기고 항목을 지운다.
 * 새 본문으로 다시 만들 때 「Source changed」로 run 전체가 멈추지 않게 하기 위해서다.
 */
import { access, cp, mkdir, open, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { environment, renameCheckpoint } from './reading-voice.mjs'

const DEFAULT_RUN = 'D:/audios/interview-cleaner/celeb-reading-voices-rewrite-20260928'
const exists = (path) => access(path).then(() => true, () => false)
const log = (event, values = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), event, ...values }))

export function unpublishArgs(argv = process.argv.slice(2)) {
  const options = { run: DEFAULT_RUN, locales: 'ko,en' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--apply' || arg === '--help') options[arg.slice(2)] = true
    else if (['--slugs', '--locales', '--run'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[arg.slice(2)] = argv[++i]
    else throw new Error(`Unknown or incomplete argument: ${arg}`)
  }
  if (options.help) return options
  options.slugs = [...new Set(String(options.slugs || '').split(',').map((slug) => slug.trim()).filter(Boolean))]
  if (!options.slugs.length) throw new Error('--slugs a,b is required')
  options.locales = [...new Set(options.locales.split(','))]
  if (options.locales.some((locale) => !['ko', 'en'].includes(locale))) throw new Error('Locales must be ko and/or en')
  options.run = resolve(options.run)
  return options
}

async function objectOrNull(r2, command) {
  try { return await r2.send(command, { abortSignal: AbortSignal.timeout(30_000) }) }
  catch (error) { if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return null; throw error }
}

async function main() {
  const options = unpublishArgs()
  if (options.help) { console.log('node --import tsx scripts/celeb/reading-voice-unpublish.mjs --slugs a,b [--locales ko,en] [--run DIR] [--apply]'); return }
  await environment()
  for (const name of ['NEXT_PUBLIC_DB_API_URL', 'DB_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
    if (!process.env[name]) throw new Error(`Missing ${name}`)
  }
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30_000) }) } })
  const bucket = process.env.R2_BUCKET_NAME
  const r2 = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, maxAttempts: 3 })

  const { data: people, error } = await db.from('celebs').select('id,slug,nickname,voice_v,publication_status').in('slug', options.slugs)
  if (error) throw new Error(`Target query failed: ${error.message}`)
  const missing = options.slugs.filter((slug) => !people.some((person) => person.slug === slug))
  if (missing.length) throw new Error(`Unknown slugs: ${missing.join(', ')}`)

  const plan = []
  for (const person of people) {
    for (const locale of options.locales) {
      const base = `celebs/${person.id}/voice/${locale}/reading`
      const [audio, timing] = await Promise.all([
        objectOrNull(r2, new HeadObjectCommand({ Bucket: bucket, Key: `${base}.mp3` })),
        objectOrNull(r2, new HeadObjectCommand({ Bucket: bucket, Key: `${base}.json` })),
      ])
      plan.push({ person, locale, keys: [audio && `${base}.mp3`, timing && `${base}.json`].filter(Boolean) })
    }
  }
  log('unpublish-plan', { dryRun: !options.apply, run: options.run, rows: plan.map(({ person, locale, keys }) => ({ slug: person.slug, locale, keys })) })
  if (!options.apply) { r2.destroy(); return }

  await mkdir(options.run, { recursive: true })
  const lockPath = join(options.run, 'reading-voice.lock')
  const lock = await open(lockPath, 'wx').catch(() => { throw new Error(`Run is locked: ${lockPath}`) })
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), purpose: 'unpublish' }))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = join(options.run, '_backup', `unpublished-before-rewrite-${stamp}`)
  const manifestPath = join(options.run, 'manifest.json')
  const manifest = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : null
  const audit = { version: 1, createdAt: new Date().toISOString(), reason: 'READING_REWRITE', entries: [] }
  try {
    await mkdir(backupRoot, { recursive: true })
    if (manifest) await cp(manifestPath, join(backupRoot, 'manifest-before.json'))
    const revalidation = await import('../../src/lib/revalidate-web.ts')
    const { revalidateWebCeleb } = revalidation.default || revalidation
    for (const person of people) {
      let removed = 0
      for (const { locale, keys } of plan.filter((row) => row.person.id === person.id)) {
        const backupDir = join(backupRoot, person.id, locale)
        await mkdir(backupDir, { recursive: true })
        for (const key of keys) {
          const object = await objectOrNull(r2, new GetObjectCommand({ Bucket: bucket, Key: key }))
          if (!object) continue
          const name = key.split('/').pop()
          await writeFile(join(backupDir, name), Buffer.from(await object.Body.transformToByteArray()), { flag: 'wx' })
          await writeFile(join(backupDir, `${name}.meta.json`), JSON.stringify({ key, contentType: object.ContentType, cacheControl: object.CacheControl, metadata: object.Metadata, etag: object.ETag }, null, 2) + '\n', { flag: 'wx' })
          await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(30_000) })
          if (await objectOrNull(r2, new HeadObjectCommand({ Bucket: bucket, Key: key }))) throw new Error(`R2 object still present after unpublish: ${key}`)
          removed += 1
        }
        const id = `${person.id}/${locale}`
        const entry = manifest?.entries?.[id]
        if (entry) {
          const localDir = join(options.run, person.id, locale)
          if (await exists(localDir)) {
            await cp(localDir, join(backupDir, 'local'), { recursive: true, errorOnExist: true })
            await rm(localDir, { recursive: true, force: true })
          }
          delete manifest.entries[id]
          await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n')
          await renameCheckpoint(`${manifestPath}.tmp`, manifestPath)
        }
        audit.entries.push({ id: person.id, slug: person.slug, locale, removedKeys: keys, manifestEntryRemoved: Boolean(entry) })
        await writeFile(join(backupRoot, 'unpublish-audit.json'), JSON.stringify(audit, null, 2) + '\n')
      }
      if (removed) {
        // 음원은 immutable로 1년 캐시된다. 주소의 ?v= 값을 올려야 지운 음원이 캐시에서 재생되지 않는다.
        let version
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data: current, error: readError } = await db.from('celebs').select('voice_v').eq('id', person.id).single()
          if (readError) throw new Error(`voice_v read failed: ${readError.message}`)
          version = (current.voice_v || 0) + 1
          let query = db.from('celebs').update({ voice_v: version }).eq('id', person.id)
          query = current.voice_v == null ? query.is('voice_v', null) : query.eq('voice_v', current.voice_v)
          const { data, error: updateError } = await query.select('voice_v')
          if (updateError) throw new Error(`voice_v update uncertain: ${updateError.message}`)
          if (data?.length) break
          if (attempt === 7) throw new Error('voice_v changed concurrently too often; rerun to retry')
        }
        await revalidateWebCeleb(person.id, person.slug)
        log('unpublished', { slug: person.slug, removed, voiceVersion: version })
      } else {
        log('nothing-published', { slug: person.slug })
      }
    }
    log('unpublish-finished', { people: people.length, backupRoot })
  } finally {
    r2.destroy(); await lock.close(); await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
