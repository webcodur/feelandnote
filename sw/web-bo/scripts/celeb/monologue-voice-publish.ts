/**
 * Publish one celeb virtual-monologue voice run (vmonologue.mp3 + vmonologue.json) to R2,
 * then bump celebs.voice_v and revalidate the public celeb page.
 *
 * Default execution is a read-only preflight. Add --apply only after the generated audio was
 * reviewed and publication was explicitly requested.
 *
 * Run from sw/web-bo:
 *   node --env-file=.env --import tsx scripts/celeb/monologue-voice-publish.ts --run D:\...\20260922-120000
 *   node --env-file=.env --import tsx scripts/celeb/monologue-voice-publish.ts --run D:\...\20260922-120000 --apply
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createClient } from '@feelandnote/db'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCeleb } from '../../src/lib/revalidate-web'
import { buildReadingTiming, publishReadingTiming } from './reading-voice-timing.mjs'

const OBJECT_NAME = 'vmonologue'
const AUDIO_FILE = `${OBJECT_NAME}.mp3`
const TIMING_FILE = `${OBJECT_NAME}.json`
const QC_RESULT_FILE = 'qc.json'

type Locale = 'ko' | 'en'

interface MonologueManifest {
  schemaVersion: number
  mode: string
  status: string
  locale: Locale
  voiceId: string
  celeb: { id: string; slug: string; nickname?: string | null }
  source: { sha256: string; characters: number; paragraphs: number }
  samples?: { index: number; text: string; file: string; status?: string }[]
  output?: { file: string; durationSeconds?: number }
  qc?: { ok: boolean; status?: string; verdict?: string; resultFile?: string }
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

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')

const voiceKey = (celebId: string, locale: Locale, fileName: string) =>
  `celebs/${celebId}/voice/${locale}/${fileName}`

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body || typeof body !== 'object' || !('transformToByteArray' in body)) {
    throw new Error('R2 returned an unreadable object body')
  }
  const bytes = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray()
  return Buffer.from(bytes)
}

function isMissingObject(error: unknown): boolean {
  const record = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null
  return !!record && (record.name === 'NoSuchKey' || record.name === 'NotFound'
    || record.$metadata?.httpStatusCode === 404)
}

async function main(): Promise<void> {
  const { runDir, apply } = parseArgs()
  const manifest = JSON.parse(await readFile(join(runDir, 'manifest.json'), 'utf8')) as MonologueManifest
  if (manifest.schemaVersion !== 1 || manifest.mode !== 'monologue') throw new Error('Not a monologue manifest')
  if (!['ko', 'en'].includes(manifest.locale)) throw new Error('Invalid manifest locale')
  if (!manifest.celeb?.id || !manifest.celeb.slug || !manifest.voiceId) throw new Error('Manifest celeb identity or voiceId is missing')
  if (manifest.status !== 'passed') throw new Error(`Manifest is not QC-passed: status=${manifest.status}`)
  if (!manifest.qc?.ok && manifest.qc?.verdict !== 'passed-paragraph-gaps') {
    throw new Error(`QC verdict is not publishable: ${manifest.qc?.verdict ?? manifest.qc?.status}`)
  }
  if (!manifest.source?.sha256 || !manifest.source.paragraphs || manifest.source.paragraphs < 1) {
    throw new Error('Manifest source summary is missing')
  }
  if (manifest.output?.file !== AUDIO_FILE) throw new Error(`Manifest output must be ${AUDIO_FILE}`)

  const audioPath = join(runDir, AUDIO_FILE)
  const audio = await readFile(audioPath)
  if (audio.length < 1024 || (audio.subarray(0, 3).toString('ascii') !== 'ID3' && audio[0] !== 0xff)) {
    throw new Error(`${AUDIO_FILE} does not look like an MP3`)
  }
  const audioHash = sha256(audio)
  const sourceText = (await readFile(join(runDir, 'source.txt'), 'utf8')).trim()
  if (sha256(sourceText) !== manifest.source.sha256) throw new Error('source.txt no longer matches the manifest hash')
  const paragraphCount = sourceText.split(/\n\s*\n/).filter((p) => p.trim()).length
  if (paragraphCount !== manifest.source.paragraphs) throw new Error('source.txt paragraph count changed')

  const qcResult = JSON.parse(await readFile(join(runDir, manifest.qc.resultFile ?? QC_RESULT_FILE), 'utf8'))
  const words = qcResult.words
  const duration = qcResult.metrics?.duration
  if (!Array.isArray(words) || !words.length || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('QC result has no usable words/duration for timing')
  }

  const db = createClient(requireEnv('NEXT_PUBLIC_DB_API_URL'), requireEnv('DB_SECRET_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: celeb, error: celebError } = await db
    .from('celebs')
    .select('id, slug, nickname, voice_id_ko, voice_id_en, voice_v, has_voice, virtual_monologue, virtual_monologue_en')
    .eq('id', manifest.celeb.id)
    .maybeSingle()
  if (celebError) throw new Error(`Failed to read celeb: ${celebError.message}`)
  if (!celeb || celeb.slug !== manifest.celeb.slug) throw new Error('Manifest celeb does not match the current DB row')
  const currentText = (manifest.locale === 'ko' ? celeb.virtual_monologue : celeb.virtual_monologue_en)?.trim() ?? ''
  if (sha256(currentText) !== manifest.source.sha256) {
    throw new Error(`DB monologue changed after generation (${manifest.locale})`)
  }
  const currentVoiceId = manifest.locale === 'ko' ? celeb.voice_id_ko : celeb.voice_id_en
  if (currentVoiceId !== manifest.voiceId) {
    throw new Error(`DB voice_id_${manifest.locale} changed after generation`)
  }

  const bucket = requireEnv('R2_BUCKET_NAME')
  const publicBase = requireEnv('R2_PUBLIC_URL').replace(/\/$/, '')
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
    maxAttempts: 3,
  })

  const prepared = buildReadingTiming({
    text: sourceText,
    locale: manifest.locale,
    sourceHash: manifest.source.sha256,
    audioHash,
    audioEtag: '',
    duration,
    words,
  })
  const preflight = {
    runDirectory: runDir,
    celebId: celeb.id,
    slug: celeb.slug,
    locale: manifest.locale,
    voiceId: manifest.voiceId,
    paragraphs: manifest.source.paragraphs,
    audioBytes: audio.length,
    audioSha256: audioHash,
    timingSegments: prepared.timing.segments.length,
    timingSentences: prepared.sentences,
    timingRejected: prepared.rejected.length,
    currentVoiceVersion: celeb.voice_v ?? 0,
    apply,
  }
  if (!apply) {
    console.log(JSON.stringify({ ...preflight, status: 'ready' }, null, 2))
    return
  }
  if (!prepared.timing.segments.length) throw new Error('No confidently aligned sentences for timing')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = join(runDir, '_backup', `production-before-${stamp}`)
  await mkdir(backupDir, { recursive: true })
  const previous: { key: string; fileName: string; body: Buffer | null; contentType?: string; cacheControl?: string }[] = []
  for (const fileName of [AUDIO_FILE, TIMING_FILE]) {
    const key = voiceKey(celeb.id, manifest.locale, fileName)
    try {
      const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const body = await streamToBuffer(response.Body)
      previous.push({ key, fileName, body, contentType: response.ContentType, cacheControl: response.CacheControl })
      await writeFile(join(backupDir, fileName), body)
    } catch (error) {
      if (!isMissingObject(error)) throw error
      previous.push({ key, fileName, body: null })
    }
  }
  await writeFile(join(backupDir, 'backup.json'), `${JSON.stringify({
    createdAt: new Date().toISOString(), celebId: celeb.id, slug: celeb.slug, locale: manifest.locale,
    objects: previous.map((item) => ({ key: item.key, fileName: item.fileName, existed: item.body !== null, bytes: item.body?.length ?? 0, sha256: item.body ? sha256(item.body) : null })),
  }, null, 2)}\n`, 'utf8')

  const restorePrevious = async (): Promise<void> => {
    for (const item of previous) {
      if (item.body) {
        await r2.send(new PutObjectCommand({
          Bucket: bucket, Key: item.key, Body: item.body,
          ContentType: item.contentType ?? (item.fileName.endsWith('.json') ? 'application/json; charset=utf-8' : 'audio/mpeg'),
          CacheControl: item.cacheControl ?? 'public, max-age=31536000, immutable',
        }))
      } else {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: item.key }))
      }
    }
  }

  const audioKey = voiceKey(celeb.id, manifest.locale, AUDIO_FILE)
  let versionUpdateStarted = false
  try {
    await r2.send(new PutObjectCommand({
      Bucket: bucket, Key: audioKey, Body: audio, ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { 'source-sha256': manifest.source.sha256, 'audio-sha256': audioHash },
    }))
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: audioKey }))
    if (head.ContentLength !== audio.length) throw new Error('R2 audio size verification failed')
    const audioEtag = head.ETag

    const entry = {
      id: celeb.id, locale: manifest.locale, mp3: audioPath, mp3Hash: audioHash,
      sourceHash: manifest.source.sha256, text: sourceText,
    }
    const timing = await publishReadingTiming(r2, entry, { run: runDir }, prepared, { audioEtag, objectName: OBJECT_NAME })
    if (timing.status !== 'published') throw new Error(`Timing publish failed: ${timing.status} ${timing.reason ?? ''}`)

    const nextVoiceVersion = (celeb.voice_v ?? 0) + 1
    let version = nextVoiceVersion
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: current, error: readError } = await db.from('celebs').select('voice_v').eq('id', celeb.id).single()
      if (readError) throw new Error(`voice_v recheck failed: ${readError.message}`)
      version = (current?.voice_v ?? 0) + 1
      let query = db.from('celebs').update({ voice_v: version, has_voice: true }).eq('id', celeb.id)
      query = current?.voice_v == null ? query.is('voice_v', null) : query.eq('voice_v', current.voice_v)
      versionUpdateStarted = true
      const { data, error } = await query.select('voice_v')
      if (error) throw new Error(`voice_v update uncertain: ${error.message}`)
      if (data?.length) break
      if (attempt === 7) throw new Error('voice_v changed concurrently too often; rerun publish')
    }

    await revalidateWebCeleb(celeb.id, celeb.slug, [CACHE_TAGS.CELEBS])

    const publicAudio = await fetch(`${publicBase}/${audioKey}?v=${version}`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' })
    if (!publicAudio.ok) throw new Error(`Public audio verification failed (${publicAudio.status})`)
    if (sha256(Buffer.from(await publicAudio.arrayBuffer())) !== audioHash) throw new Error('Public audio hash mismatch')
    const timingKey = voiceKey(celeb.id, manifest.locale, TIMING_FILE)
    const publicTiming = await fetch(`${publicBase}/${timingKey}?v=${version}`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' })
    if (!publicTiming.ok) throw new Error(`Public timing verification failed (${publicTiming.status})`)
    const timingHashCheck = sha256(Buffer.from(await publicTiming.arrayBuffer()))
    if (timingHashCheck !== timing.hash) throw new Error('Public timing hash mismatch')

    const report = {
      ...preflight,
      status: 'published',
      publishedAt: new Date().toISOString(),
      backupDirectory: backupDir,
      voiceVersion: version,
      audioKey,
      timingKey,
      timingHash: timing.hash,
      publicAudioUrl: `${publicBase}/${audioKey}?v=${version}`,
      publicTimingUrl: `${publicBase}/${timingKey}?v=${version}`,
    }
    await writeFile(join(runDir, 'publish.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    if (!versionUpdateStarted) await restorePrevious()
    await writeFile(join(runDir, 'publish-failed.json'), `${JSON.stringify({
      ...preflight, status: 'failed', failedAt: new Date().toISOString(),
      r2Restored: !versionUpdateStarted, backupDirectory: backupDir,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2)}\n`, 'utf8')
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
