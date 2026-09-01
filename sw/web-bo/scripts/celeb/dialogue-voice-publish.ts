/**
 * Publish one completed 22-file celeb dialogue voice run to R2, then update the celeb row.
 *
 * Default execution is a read-only preflight. Add --apply only after the generated files were
 * reviewed and publication was explicitly requested.
 *
 * Run from sw/web-bo:
 *   node --env-file=.env --import tsx scripts/celeb/dialogue-voice-publish.ts --run D:\...\20260901-120000
 *   node --env-file=.env --import tsx scripts/celeb/dialogue-voice-publish.ts --run D:\...\20260901-120000 --apply
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCeleb } from '../../src/lib/revalidate-web'

const EXPECTED_FILES = [
  'g1.mp3', 'g2.mp3', 'g3.mp3',
  'r1.mp3', 'r2.mp3', 'r3.mp3',
  'd1.mp3', 'd2.mp3', 'd3.mp3',
  'bw1.mp3', 'bw2.mp3', 'bw3.mp3',
  'bd1.mp3', 'bd2.mp3', 'bd3.mp3',
  'bl1.mp3', 'bl2.mp3', 'bl3.mp3',
  'c1.mp3', 'c2.mp3', 'c3.mp3',
  'quote.mp3',
] as const

type Locale = 'ko' | 'en'

interface VoiceSample {
  slot: string
  dialogueType: string
  variant?: number | null
  text: string
  file?: string
  cleanMp3?: string
  status?: string
}

interface VoiceManifest {
  schemaVersion: number
  mode: 'basic' | 'safe-tail'
  status: string
  locale: Locale
  voiceId: string
  celeb: {
    id: string
    slug: string
    nickname?: string | null
  }
  samples: VoiceSample[]
}

interface ExistingObject {
  key: string
  fileName: string
  body: Buffer | null
  contentType?: string
  cacheControl?: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing`)
  return value
}

function parseArgs(): { runDir: string; apply: boolean } {
  const args = process.argv.slice(2)
  const runIndex = args.indexOf('--run')
  if (runIndex < 0 || !args[runIndex + 1]) {
    throw new Error('--run <generation directory> is required')
  }
  const runDir = resolve(args[runIndex + 1])
  if (!isAbsolute(runDir)) throw new Error('--run must resolve to an absolute path')
  return { runDir, apply: args.includes('--apply') }
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function voiceKey(celebId: string, locale: Locale, fileName: string): string {
  return `celebs/${celebId}/voice/${locale}/${fileName}`
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body || typeof body !== 'object' || !('transformToByteArray' in body)) {
    throw new Error('R2 returned an unreadable object body')
  }
  const bytes = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray()
  return Buffer.from(bytes)
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  return record.name === 'NoSuchKey' || record.name === 'NotFound' || record.$metadata?.httpStatusCode === 404
}

async function loadAndValidateRun(runDir: string): Promise<{
  manifest: VoiceManifest
  files: Map<string, Buffer>
}> {
  const manifestPath = join(runDir, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as VoiceManifest
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported or missing manifest schemaVersion')
  if (!['basic', 'safe-tail'].includes(manifest.mode)) throw new Error('Invalid manifest mode')
  if (!['ko', 'en'].includes(manifest.locale)) throw new Error('Invalid manifest locale')
  if (!manifest.celeb?.id || !manifest.celeb.slug || !manifest.voiceId) {
    throw new Error('Manifest celeb identity or voiceId is missing')
  }
  if (manifest.status !== 'generated') {
    throw new Error(`Manifest is not complete: status=${manifest.status}`)
  }
  if (!Array.isArray(manifest.samples) || manifest.samples.length !== 22) {
    throw new Error(`Expected 22 manifest samples, got ${manifest.samples?.length ?? 0}`)
  }

  const byFile = new Map<string, VoiceSample>()
  for (const sample of manifest.samples) {
    const relativeFile = manifest.mode === 'safe-tail' ? sample.cleanMp3 : sample.file
    if (!relativeFile) throw new Error(`Sample ${sample.slot} has no publishable MP3 path`)
    const fileName = basename(relativeFile)
    if (relativeFile !== fileName) {
      throw new Error(`Publishable MP3 must be at the run root: ${relativeFile}`)
    }
    if (byFile.has(fileName)) throw new Error(`Duplicate manifest file: ${fileName}`)
    if (manifest.mode === 'safe-tail' && sample.status !== 'verified') {
      throw new Error(`Safe-tail sample ${sample.slot} is not verified: ${sample.status}`)
    }
    if (manifest.mode === 'basic' && sample.status !== 'generated') {
      throw new Error(`Basic sample ${sample.slot} is incomplete: ${sample.status}`)
    }
    byFile.set(fileName, sample)
  }

  const actualNames = [...byFile.keys()].sort()
  const expectedNames = [...EXPECTED_FILES].sort()
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(`File contract mismatch. Expected ${expectedNames.join(', ')}`)
  }

  const files = new Map<string, Buffer>()
  for (const fileName of EXPECTED_FILES) {
    const body = await readFile(join(runDir, fileName))
    if (body.length < 1024) throw new Error(`${fileName} is unexpectedly small (${body.length} bytes)`)
    if (body.subarray(0, 3).toString('ascii') !== 'ID3' && body[0] !== 0xff) {
      throw new Error(`${fileName} does not look like an MP3`)
    }
    files.set(fileName, body)
  }
  return { manifest, files }
}

async function main(): Promise<void> {
  const { runDir, apply } = parseArgs()
  const { manifest, files } = await loadAndValidateRun(runDir)

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const bucket = requireEnv('R2_BUCKET_NAME')
  const publicBase = requireEnv('R2_PUBLIC_URL').replace(/\/$/, '')
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: celeb, error: celebError } = await db
    .from('celebs')
    .select('id, slug, nickname, voice_id_ko, voice_id_en, voice_v, has_voice')
    .eq('id', manifest.celeb.id)
    .maybeSingle()
  if (celebError) throw new Error(`Failed to read celeb: ${celebError.message}`)
  if (!celeb || celeb.slug !== manifest.celeb.slug) {
    throw new Error('Manifest celeb does not match the current DB row')
  }

  const { data: dialogue, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('lines, lines_en')
    .eq('celeb_id', celeb.id)
    .maybeSingle()
  if (dialogueError) throw new Error(`Failed to read current dialogues: ${dialogueError.message}`)
  const currentLines = dialogue?.[manifest.locale === 'ko' ? 'lines' : 'lines_en']
  if (!currentLines || typeof currentLines !== 'object' || Array.isArray(currentLines)) {
    throw new Error(`Current ${manifest.locale} dialogue source is missing`)
  }
  for (const sample of manifest.samples) {
    const currentValue = (currentLines as Record<string, unknown>)[sample.dialogueType]
    const currentText = sample.variant == null
      ? currentValue
      : Array.isArray(currentValue) ? currentValue[sample.variant - 1] : null
    if (typeof currentText !== 'string' || currentText.trim() !== sample.text) {
      throw new Error(`DB dialogue changed after generation: ${sample.slot}`)
    }
  }

  const preflight = {
    mode: manifest.mode,
    runDirectory: runDir,
    celebId: celeb.id,
    slug: celeb.slug,
    locale: manifest.locale,
    voiceId: manifest.voiceId,
    fileCount: files.size,
    bytes: [...files.values()].reduce((sum, body) => sum + body.length, 0),
    currentVoiceVersion: celeb.voice_v ?? 0,
    apply,
  }
  if (!apply) {
    console.log(JSON.stringify({ ...preflight, status: 'ready' }, null, 2))
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = join(runDir, '_backup', `production-before-${stamp}`)
  await mkdir(backupDir, { recursive: true })
  const previous: ExistingObject[] = []

  for (const fileName of EXPECTED_FILES) {
    const key = voiceKey(celeb.id, manifest.locale, fileName)
    try {
      const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const body = await streamToBuffer(response.Body)
      previous.push({
        key,
        fileName,
        body,
        contentType: response.ContentType,
        cacheControl: response.CacheControl,
      })
      await writeFile(join(backupDir, fileName), body)
    } catch (error) {
      if (!isMissingObject(error)) throw error
      previous.push({ key, fileName, body: null })
    }
  }
  await writeFile(
    join(backupDir, 'backup.json'),
    `${JSON.stringify({
      createdAt: new Date().toISOString(),
      celebId: celeb.id,
      slug: celeb.slug,
      locale: manifest.locale,
      objects: previous.map((item) => ({
        key: item.key,
        fileName: item.fileName,
        existed: item.body !== null,
        bytes: item.body?.length ?? 0,
        sha256: item.body ? sha256(item.body) : null,
      })),
    }, null, 2)}\n`,
    'utf8',
  )

  const restorePrevious = async (): Promise<void> => {
    for (const item of previous) {
      if (item.body) {
        await r2.send(new PutObjectCommand({
          Bucket: bucket,
          Key: item.key,
          Body: item.body,
          ContentType: item.contentType ?? 'audio/mpeg',
          CacheControl: item.cacheControl ?? 'public, max-age=31536000, immutable',
        }))
      } else {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.key }))
      }
    }
  }

  try {
    for (const fileName of EXPECTED_FILES) {
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: voiceKey(celeb.id, manifest.locale, fileName),
        Body: files.get(fileName)!,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }))
    }
    for (const fileName of EXPECTED_FILES) {
      const head = await r2.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: voiceKey(celeb.id, manifest.locale, fileName),
      }))
      if (head.ContentLength !== files.get(fileName)!.length) {
        throw new Error(`R2 size verification failed: ${fileName}`)
      }
    }

    const voiceColumn = manifest.locale === 'ko' ? 'voice_id_ko' : 'voice_id_en'
    const nextVoiceVersion = (celeb.voice_v ?? 0) + 1
    const { error: updateError } = await db
      .from('celebs')
      .update({
        [voiceColumn]: manifest.voiceId,
        has_voice: true,
        voice_v: nextVoiceVersion,
      })
      .eq('id', celeb.id)
    if (updateError) throw new Error(`Failed to update celeb voice row: ${updateError.message}`)

    await revalidateWebCeleb(celeb.id, celeb.slug, [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])

    const publicHashes: Record<string, string> = {}
    for (const fileName of EXPECTED_FILES) {
      const url = `${publicBase}/${voiceKey(celeb.id, manifest.locale, fileName)}?v=${nextVoiceVersion}`
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`Public voice verification failed: ${fileName} (${response.status})`)
      const publicBody = Buffer.from(await response.arrayBuffer())
      const expectedHash = sha256(files.get(fileName)!)
      const actualHash = sha256(publicBody)
      if (actualHash !== expectedHash) throw new Error(`Public voice hash mismatch: ${fileName}`)
      publicHashes[fileName] = actualHash
    }

    const report = {
      ...preflight,
      status: 'published',
      publishedAt: new Date().toISOString(),
      backupDirectory: backupDir,
      voiceVersion: nextVoiceVersion,
      publicHashes,
    }
    await writeFile(join(runDir, 'publish.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    const { data: current } = await db
      .from('celebs')
      .select('voice_v')
      .eq('id', celeb.id)
      .maybeSingle()
    const dbWasUpdated = current?.voice_v === (celeb.voice_v ?? 0) + 1
    if (!dbWasUpdated) await restorePrevious()
    await writeFile(
      join(runDir, 'publish-failed.json'),
      `${JSON.stringify({
        ...preflight,
        status: 'failed',
        failedAt: new Date().toISOString(),
        dbWasUpdated,
        r2Restored: !dbWasUpdated,
        backupDirectory: backupDir,
        error: error instanceof Error ? error.message : String(error),
      }, null, 2)}\n`,
      'utf8',
    )
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
