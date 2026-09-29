/**
 * 문단 나눔이 들어간 인물 안내에 맞춰 이미 게시된 읽어보기 음성을 고친다. 규칙: docs/project/celeb/celeb-05-01-reading.md 「형식」.
 *
 * 한 문단 본문으로 만든 음성(reading.mp3)과 문장 강조 시각(reading.json)은 본문에 빈 줄(\n\n)이 들어가면
 * 해시가 어긋나 강조가 꺼진다. 이 도구는 본문이 문단 나눔 말고는 그대로인지 해시로 확인한 뒤,
 * 문단 경계 두 문장 사이 쉼 한가운데에 무음을 넣고 강조 시각과 글자 위치를 새 본문에 맞춰 옮긴다.
 * 새 합성은 하지 않는다. 음성·강조 파일이 없거나 해시가 다른 인물은 건드리지 않고 사유만 남긴다.
 *
 *   node.exe ../../node_modules/tsx/dist/cli.mjs scripts/celeb/reading/paragraph-pause.mts [--apply] [--slug a,b] [--limit N] [--concurrency 3] [--pause 0.4] [--run DIR]
 *
 * 기본은 미리보기다. --apply면 옛 파일을 run 폴더 _backup에 두고 mp3 업로드 → celebs.voice_v 증가 →
 * reading.json 업로드 → 웹 캐시 무효화 순으로 게시한다. manifest.json에 인물별 결과를 남겨 다시 돌리면
 * 끝난 인물은 건너뛴다.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { readingSentences } from '../reading-voice-timing.mjs'

const WEB_BO = process.cwd()
for (const line of readFileSync(resolve(WEB_BO, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const argv = process.argv.slice(2)
const value = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined }
const options = {
  apply: argv.includes('--apply'),
  slugs: value('--slug')?.split(',').filter(Boolean) ?? null,
  limit: Number(value('--limit') ?? Infinity),
  concurrency: Number(value('--concurrency') ?? 3),
  pause: Number(value('--pause') ?? 0.4),
  run: resolve(value('--run') ?? 'D:/audios/interview-cleaner/celeb-reading-paragraph-pause-20260929'),
}
if (!(options.pause > 0 && options.pause <= 1.5)) throw new Error('--pause는 0~1.5초 사이다')

const sha = (body: string | Buffer) => createHash('sha256').update(body).digest('hex')
const md5 = (body: Buffer) => createHash('md5').update(body).digest('hex')
const now = () => new Date().toISOString()
const log = (event: string, values: Record<string, unknown> = {}) => console.log(JSON.stringify({ at: now(), event, ...values }))

const ffmpegBin = (() => {
  const base = join(process.env.LOCALAPPDATA ?? '', 'Microsoft/WinGet/Packages')
  const pkg = existsSync(base) ? readdirSync(base).find((name) => name.startsWith('Gyan.FFmpeg')) : undefined
  const build = pkg ? readdirSync(join(base, pkg)).find((name) => name.startsWith('ffmpeg-')) : undefined
  return build ? join(base, pkg!, build, 'bin') : ''
})()
const tool = (name: string) => (ffmpegBin ? join(ffmpegBin, `${name}.exe`) : name)
function run(command: string, args: string[]): Promise<string> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { windowsHide: true })
    let out = ''; let err = ''
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err = (err + chunk).slice(-2000) })
    child.on('error', fail)
    child.on('close', (code) => (code === 0 ? done(out) : fail(new Error(`${command} ${code}: ${err}`))))
  })
}

const required = (name: string) => { const v = process.env[name]; if (!v) throw new Error(`Missing ${name}`); return v }
const db = createClient(required('NEXT_PUBLIC_DB_API_URL'), required('DB_SECRET_KEY'), { auth: { autoRefreshToken: false, persistSession: false } })
const r2 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })
const bucket = required('R2_BUCKET_NAME')
const publicBase = required('R2_PUBLIC_URL').replace(/\/$/, '')

type Segment = { start: number; end: number; textStart: number; textEnd: number }
type Timing = { version: 1; sourceHash: string; audioHash: string; audioEtag: string; duration: number; segments: Segment[] }
type Locale = 'ko' | 'en'
type Prepared = { locale: Locale; text: string; timing: Timing; mp3: Buffer; metadata: Record<string, string>; oldJson: Buffer; oldMp3: Buffer; cuts: number[] }

async function getObject(key: string): Promise<{ body: Buffer; metadata: Record<string, string>; etag: string } | null> {
  try {
    const object = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(60_000) })
    return { body: Buffer.from(await object.Body!.transformToByteArray()), metadata: object.Metadata ?? {}, etag: object.ETag ?? '' }
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null
    throw error
  }
}

const keyOf = (id: string, locale: Locale, ext: 'mp3' | 'json') => `celebs/${id}/voice/${locale}/reading.${ext}`

// 본문 문장과 옛 강조 구간을 맞춰 보고, 무음을 넣을 시각(초)을 문단 경계마다 하나씩 고른다.
// base는 옛 강조 파일의 글자 위치가 가리키는 본문이다. 한 문단 본문이거나, 바깥 작업이 위치만 옮겨 둔 새 본문이다.
export function planPause(text: string, locale: Locale, timing: Timing, base: string): { cuts: number[] } | { skip: string } {
  const before = readingSentences(base, locale) as Array<{ textStart: number; textEnd: number }>
  const after = readingSentences(text, locale) as Array<{ textStart: number; textEnd: number }>
  if (before.length !== after.length) return { skip: 'sentence-count-changed' }
  if (before.some((s, i) => base.slice(s.textStart, s.textEnd) !== text.slice(after[i].textStart, after[i].textEnd))) return { skip: 'sentence-text-changed' }
  const indexOf = (segment: Segment) => before.findIndex((s) => s.textStart === segment.textStart && s.textEnd === segment.textEnd)
  if (timing.segments.some((segment) => indexOf(segment) < 0)) return { skip: 'segment-unmapped' }
  const bySentence = new Map(timing.segments.map((segment) => [indexOf(segment), segment]))
  const cuts: number[] = []
  for (let at = text.indexOf('\n\n'); at >= 0; at = text.indexOf('\n\n', at + 2)) {
    const k = after.findLastIndex((s) => s.textEnd <= at)
    const left = bySentence.get(k); const right = bySentence.get(k + 1)
    if (!left || !right) return { skip: `boundary-unaligned-sentence k=${k} at=${at} keys=${[...bySentence.keys()]} ends=${after.map((s) => s.textEnd)}` }
    if (right.start < left.end) return { skip: 'boundary-overlap' }
    cuts.push((left.end + right.start) / 2)
  }
  if (!cuts.length) return { skip: 'no-break' }
  return { cuts }
}

export function shiftTiming(text: string, locale: Locale, timing: Timing, cuts: number[], pause: number, base: string): Segment[] {
  const before = readingSentences(base, locale) as Array<{ textStart: number; textEnd: number }>
  const after = readingSentences(text, locale) as Array<{ textStart: number; textEnd: number }>
  return timing.segments.map((segment) => {
    const i = before.findIndex((s) => s.textStart === segment.textStart && s.textEnd === segment.textEnd)
    const offset = pause * cuts.filter((cut) => cut <= segment.start).length
    return { start: +(segment.start + offset).toFixed(3), end: +(segment.end + offset).toFixed(3), textStart: after[i].textStart, textEnd: after[i].textEnd }
  })
}

async function renderMp3(source: string, output: string, cuts: number[], pause: number) {
  const n = cuts.length + 1
  const parts: string[] = [`[0:a]asplit=${n}${Array.from({ length: n }, (_, i) => `[p${i}]`).join('')}`]
  const order: string[] = []
  const bounds = [0, ...cuts]
  for (let i = 0; i < n; i++) {
    const trim = i === n - 1 ? `start=${bounds[i]}` : `start=${bounds[i]}:end=${cuts[i]}`
    parts.push(`[p${i}]atrim=${trim},asetpts=PTS-STARTPTS[a${i}]`)
    order.push(`[a${i}]`)
    if (i < n - 1) { parts.push(`anullsrc=r=24000:cl=mono,atrim=duration=${pause}[s${i}]`); order.push(`[s${i}]`) }
  }
  parts.push(`${order.join('')}concat=n=${order.length}:v=0:a=1[out]`)
  await run(tool('ffmpeg'), ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', '-i', source, '-filter_complex', parts.join(';'), '-map', '[out]', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '128k', output])
}
const durationOf = async (file: string) => Number((await run(tool('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])).trim())

const manifestPath = join(options.run, 'manifest.json')
type Entry = { slug: string; status: string; reason?: string; locales?: Record<string, unknown>; voiceVersion?: number; at: string }
const manifest: { entries: Record<string, Entry> } = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { entries: {} }
let saving = Promise.resolve()
const save = () => { saving = saving.then(() => writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)); return saving }

async function prepare(id: string, slug: string, locale: Locale, text: string): Promise<Prepared | { skip: string }> {
  const json = await getObject(keyOf(id, locale, 'json'))
  if (!json) return { skip: 'no-timing' }
  const timing = JSON.parse(json.body.toString('utf8')) as Timing
  const flat = text.replace(/\n\n/g, ' ')
  const mp3 = await getObject(keyOf(id, locale, 'mp3'))
  if (!mp3 || sha(mp3.body) !== timing.audioHash) return { skip: 'audio-mismatch' }
  // 음성이 어떤 본문으로 만들어졌는지는 mp3의 source-sha256이 말한다. 문단 본문으로 합성했거나
  // 이미 쉼을 넣은 음성은 두고, 한 문단 본문으로 만든 음성만 고친다.
  const audioSource = mp3.metadata['source-sha256']
  if (audioSource === sha(text)) return { skip: 'audio-has-paragraphs' }
  if (audioSource !== sha(flat)) return { skip: 'audio-source-mismatch' }
  const base = timing.sourceHash === sha(text) ? text : timing.sourceHash === sha(flat) ? flat : null
  if (!base) return { skip: 'timing-source-mismatch' }
  const plan = planPause(text, locale, timing, base)
  if ('skip' in plan) return plan
  const dir = join(options.run, id, locale)
  await mkdir(dir, { recursive: true })
  const source = join(dir, `source-${timing.audioHash.slice(0, 12)}.mp3`)
  const output = join(dir, `paused-${timing.audioHash.slice(0, 12)}.mp3`)
  await writeFile(source, mp3.body)
  await renderMp3(source, output, plan.cuts, options.pause)
  const newDuration = await durationOf(output)
  const expected = timing.duration + options.pause * plan.cuts.length
  if (!(Math.abs(newDuration - expected) < 0.1)) return { skip: `duration ${newDuration.toFixed(3)} vs ${expected.toFixed(3)}` }
  const segments = shiftTiming(text, locale, timing, plan.cuts, options.pause, base)
  if (segments.some((s) => s.end > newDuration + 0.05)) return { skip: 'segment-past-end' }
  const body = await readFile(output)
  log('prepared', { slug, locale, cuts: plan.cuts, duration: newDuration })
  return { locale, text, timing: { ...timing, sourceHash: sha(text), audioHash: sha(body), audioEtag: '', duration: newDuration, segments }, mp3: body, metadata: mp3.metadata, oldJson: json.body, oldMp3: mp3.body, cuts: plan.cuts }
}

async function publish(id: string, slug: string, items: Prepared[]) {
  const backup = join(options.run, '_backup', id)
  for (const item of items) {
    await mkdir(join(backup, item.locale), { recursive: true })
    await writeFile(join(backup, item.locale, `reading-${item.timing.audioHash.slice(0, 12)}-before.mp3`), item.oldMp3)
    await writeFile(join(backup, item.locale, 'reading-before.json'), item.oldJson)
  }
  for (const item of items) {
    const key = keyOf(id, item.locale, 'mp3')
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: item.mp3, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable', Metadata: { ...item.metadata, 'source-sha256': item.timing.sourceHash, 'audio-sha256': item.timing.audioHash, 'paragraph-pause': String(options.pause) } }))
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    if (String(head.ETag).replace(/"/g, '') !== md5(item.mp3) || head.Metadata?.['audio-sha256'] !== item.timing.audioHash) throw new Error(`${slug}/${item.locale}: mp3 업로드 확인 실패`)
    item.timing.audioEtag = head.ETag!
  }
  let version = 0
  for (let attempt = 0; attempt < 8 && !version; attempt++) {
    const { data: celeb, error } = await db.from('celebs').select('voice_v').eq('id', id).single()
    if (error) throw error
    let query = db.from('celebs').update({ voice_v: (celeb.voice_v ?? 0) + 1 }).eq('id', id)
    query = celeb.voice_v == null ? query.is('voice_v', null) : query.eq('voice_v', celeb.voice_v)
    const { data } = await query.select('voice_v')
    if (data?.length) version = data[0].voice_v
  }
  if (!version) throw new Error(`${slug}: voice_v 갱신 실패`)
  for (const item of items) {
    const key = keyOf(id, item.locale, 'json')
    const body = Buffer.from(`${JSON.stringify(item.timing)}\n`)
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/json; charset=utf-8', CacheControl: 'public, max-age=300, must-revalidate', Metadata: { 'source-sha256': item.timing.sourceHash, 'audio-sha256': item.timing.audioHash } }))
    const check = await getObject(key)
    if (!check || sha(check.body) !== sha(body)) throw new Error(`${slug}/${item.locale}: reading.json 업로드 확인 실패`)
    const pub = await fetch(`${publicBase}/${keyOf(id, item.locale, 'mp3')}?v=${version}`, { cache: 'no-store', signal: AbortSignal.timeout(60_000) })
    if (!pub.ok || sha(Buffer.from(await pub.arrayBuffer())) !== item.timing.audioHash) throw new Error(`${slug}/${item.locale}: 공개 mp3 확인 실패`)
  }
  const { revalidateWebCeleb } = await import('../../../src/lib/revalidate-web.ts')
  await revalidateWebCeleb(id, slug)
  return version
}

async function main() {
  await mkdir(options.run, { recursive: true })
  const rows: Array<{ profile_id: string; plain_text: string | null; plain_text_en: string | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').range(from, from + 999)
    if (error) throw error
    rows.push(...data!.filter((r) => /\n\n/.test(r.plain_text ?? '') || /\n\n/.test(r.plain_text_en ?? '')))
    if (data!.length < 1000) break
  }
  const celebs = new Map<string, { slug: string; voice_v: number | null }>()
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await db.from('celebs').select('id,slug,voice_v,publication_status').in('id', rows.slice(i, i + 200).map((r) => r.profile_id))
    if (error) throw error
    for (const c of data!) if (c.publication_status === 'active' && c.voice_v != null) celebs.set(c.id, { slug: c.slug, voice_v: c.voice_v })
  }
  let targets = rows.filter((r) => celebs.has(r.profile_id) && (!options.slugs || options.slugs.includes(celebs.get(r.profile_id)!.slug)))
  targets = targets.filter((r) => manifest.entries[r.profile_id]?.status !== 'published').slice(0, options.limit)
  log('preflight', { withBreak: rows.length, withVoice: celebs.size, targets: targets.length, apply: options.apply, pause: options.pause, ffmpeg: Boolean(ffmpegBin) })
  const tally: Record<string, number> = {}
  let next = 0
  const worker = async () => {
    while (next < targets.length) {
      const row = targets[next++]
      const { slug } = celebs.get(row.profile_id)!
      try {
        const prepared: Prepared[] = []
        const reasons: Record<string, string> = {}
        for (const [locale, text] of [['ko', row.plain_text], ['en', row.plain_text_en]] as const) {
          const clean = (text ?? '').trim()
          if (!/\n\n/.test(clean)) continue
          const result = await prepare(row.profile_id, slug, locale, clean)
          if ('skip' in result) { reasons[locale] = result.skip; tally[result.skip] = (tally[result.skip] ?? 0) + 1 }
          else { prepared.push(result); tally.prepared = (tally.prepared ?? 0) + 1 }
        }
        if (!prepared.length) { manifest.entries[row.profile_id] = { slug, status: 'skipped', reason: JSON.stringify(reasons), at: now() }; continue }
        if (!options.apply) continue
        const version = await publish(row.profile_id, slug, prepared)
        manifest.entries[row.profile_id] = { slug, status: 'published', voiceVersion: version, locales: { ...Object.fromEntries(prepared.map((p) => [p.locale, { cuts: p.cuts, audioHash: p.timing.audioHash }])), skipped: reasons }, at: now() }
        tally.published = (tally.published ?? 0) + 1
        log('published', { slug, version, locales: prepared.map((p) => p.locale), skipped: reasons })
      } catch (error: any) {
        manifest.entries[row.profile_id] = { slug, status: 'failed', reason: error.message, at: now() }
        tally.failed = (tally.failed ?? 0) + 1
        log('failed', { slug, error: error.message })
      }
      await save()
    }
  }
  await Promise.all(Array.from({ length: options.concurrency }, worker))
  await save()
  log('finished', { tally })
}

await main()
process.exit(0)
