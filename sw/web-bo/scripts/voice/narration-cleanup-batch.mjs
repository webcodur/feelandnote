/** Repair existing reading/vmonologue/description audio without TTS or routine ASR.
 * node --import tsx scripts/voice/narration-cleanup-batch.mjs --run D:/audios/... [--publish] [--limit N]
 * Two single-threaded CPU workers; original R2 bytes and metadata are kept in _backup.
 */
import { createHash } from 'node:crypto'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, open, unlink, readdir } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline'
import { freemem, totalmem } from 'node:os'
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { NARRATION_PAUSES } from '@feelandnote/shared/bo/voice-cleanup'
import { environment, required, renameCheckpoint, QcWorker, qcFailure } from '../celeb/reading-voice.mjs'
import { readingSentences, buildReadingTiming } from '../celeb/reading-voice-timing.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const SCRIPT = join(ROOT, 'sw/audio-bo/scripts/service_narration_cleanup.py')
const sha = value => createHash('sha256').update(value).digest('hex')
const md5 = value => createHash('md5').update(value).digest('hex')
const sleep = ms => new Promise(done => setTimeout(done, ms))
const exec = promisify(execFile)
const log = (event, values = {}) => console.log(JSON.stringify({ at: new Date().toISOString(), event, ...values }))

export function trustedBoundaries(text, locale, timing) {
  if (sha(text) !== timing.sourceHash) throw Error('STALE_SOURCE')
  const expected = readingSentences(text, locale)
  const segments = timing.segments || []
  if (expected.length !== segments.length || expected.some((s, i) =>
      s.textStart !== segments[i].textStart || s.textEnd !== segments[i].textEnd)) throw Error('INCOMPLETE_SENTENCE_TIMING')
  return segments.slice(0, -1).map((left, i) => {
    const right = segments[i + 1]
    if (left.end > right.start) throw Error('OVERLAPPING_SENTENCE_TIMING')
    return { start: left.end, end: right.start,
      kind: /\n\s*\n/.test(text.slice(left.textEnd, right.textStart)) ? 'paragraph' : 'sentence' }
  })
}

export function mergeObservedSentences(text, locale, timing) {
  const expected = readingSentences(text, locale), old = timing.segments || []
  const segments = [], used = new Set()
  for (const sentence of expected) {
    const indices = old.flatMap((segment,i) => segment.textStart >= sentence.textStart
      && segment.textEnd <= sentence.textEnd ? [i] : [])
    const first = old[indices[0]], last = old[indices.at(-1)]
    if (!first || first.textStart !== sentence.textStart || last.textEnd !== sentence.textEnd) return timing
    for (let j=0;j<indices.length;j++) {
      const index = indices[j]
      if (used.has(index) || (j && (old[index].start < old[indices[j-1]].end
          || text.slice(old[indices[j-1]].textEnd,old[index].textStart).trim()))) return timing
      used.add(index)
    }
    segments.push({...sentence,start:first.start,end:last.end})
  }
  return used.size === old.length ? {...timing,segments} : timing
}

export async function verifiedNarrationFromRun(run, previous, row, inputHash, sourceHash, requireExactSource=false) {
  if (!previous?.backup || previous.originalHash !== inputHash) return null
  if (sha(await readFile(previous.backup)) !== inputHash
      || sha(await readFile(join(dirname(previous.backup), `${row.type}-source.txt`))) !== sourceHash) return null
  const directory = dirname(join(run, 'processed', ...row.key.split('/')))
  let files
  try { files = await readdir(directory) }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
  for (const file of files.filter(f=>f.endsWith('.qc.json')).sort().reverse()) {
    const report = JSON.parse(await readFile(join(directory,file),'utf8'))
    if (!report.ok || !['passed','repaired'].includes(report.status) || report.sourceHash !== sourceHash
        || !report.words?.length || !(report.metrics?.duration > 0) || !report.audio) continue
    if (requireExactSource && (report.metrics.match !== 1 || !previous.requiresExactSourceTranscription)) continue
    if (!resolve(report.audio).startsWith(resolve(join(run,'processed')) + sep)) continue
    if (sha(await readFile(report.audio)) !== report.audioHash) throw Error('VERIFIED_AUDIO_CACHE_HASH_MISMATCH')
    return report
  }
  return null
}

class Worker {
  constructor() {
    this.child = spawn('py', ['-3', SCRIPT], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', OMP_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1', MKL_NUM_THREADS: '1' } })
    let stderr = ''
    this.child.stderr.on('data', b => { stderr = (stderr + b).slice(-2000) })
    createInterface({ input: this.child.stdout }).on('line', line => {
      try { this.pending?.resolve(JSON.parse(line)); this.pending = null }
      catch (error) { this.pending?.reject(error); this.pending = null }
    })
    this.child.on('error', e => { this.failure = e; this.pending?.reject(e) })
    this.child.on('exit', code => { this.failure = Error(`Worker exited ${code}: ${stderr}`); this.pending?.reject(this.failure) })
  }
  async check(request) {
    if (this.failure) throw this.failure
    if (this.pending) throw Error('Worker already busy')
    return await new Promise((resolve, reject) => {
      this.pending = { resolve, reject }
      this.child.stdin.write(JSON.stringify(request) + '\n')
    })
  }
  close() { this.child.stdin.end() }
}

async function main() {
  const argv = process.argv.slice(2), options = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publish') options.publish = true
    else if (argv[i] === '--transcribe') options.transcribe = true
    else if (['--run', '--limit', '--retry-from', '--archives', '--wait-for', '--verified-from', '--originals-from'].includes(argv[i]) && argv[i+1]) options[argv[i].slice(2)] = argv[++i]
    else throw Error(`Unknown argument ${argv[i]}`)
  }
  if (!options.run) throw Error('--run is required')
  if (options['wait-for']) {
    log('waiting-for-first-pass', { lock:options['wait-for'] })
    while (await readFile(options['wait-for']).then(()=>true, e=>{if(e.code==='ENOENT')return false;throw e})) await sleep(10_000)
  }
  options.run = resolve(options.run)
  await environment()
  const policyHash = sha(Buffer.concat([Buffer.from(JSON.stringify(NARRATION_PAUSES)),
    await readFile(SCRIPT), await readFile(join(dirname(SCRIPT), 'voice_cleanup.py'))]))
  await mkdir(options.run, { recursive: true })
  const lockPath = join(options.run, 'cleanup.lock'), lock = await open(lockPath, 'wx')
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
  const bucket = required('R2_BUCKET_NAME')
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY') }, maxAttempts: 3 })
  const send = command => s3.send(command, { abortSignal: AbortSignal.timeout(60_000) })
  const get = async key => {
    const result = await send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    return { body: Buffer.from(await result.Body.transformToByteArray()), etag: result.ETag,
      metadata: result.Metadata, contentType: result.ContentType, cacheControl: result.CacheControl }
  }
  const headers = { apikey: required('DB_SECRET_KEY'), Authorization: `Bearer ${required('DB_SECRET_KEY')}` }
  const api = async (path, init = {}) => {
    const response = await fetch(`${required('NEXT_PUBLIC_DB_API_URL')}/rest/v1/${path}`, {
      ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw Error(`DB ${response.status}: ${path.split('?')[0]}`)
    return await response.json()
  }
  const table = async (name, select, id='id') => {
    const all = []
    for (let offset = 0; ; offset += 500) {
      const page = await api(`${name}?select=${select}&order=${id}.asc&limit=500&offset=${offset}`)
      all.push(...page)
      if (page.length < 500) return all
    }
  }
  const statePath = join(options.run, 'state.json')
  let state
  try { state = JSON.parse(await readFile(statePath, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = { policyHash, policy: NARRATION_PAUSES, entries: {} } }
  if (state.policyHash !== policyHash) throw Error('Cleanup implementation changed: use a new --run directory')
  let checkpointTail = Promise.resolve()
  const checkpoint = () => checkpointTail = checkpointTail.then(async () => {
    state.updatedAt = new Date().toISOString()
    await writeFile(statePath + '.tmp', JSON.stringify(state) + '\n')
    await renameCheckpoint(statePath + '.tmp', statePath)
  })
  const dirty = new Set(state.dirtyIds || [])
  let cacheTail = Promise.resolve()
  const revalidate = (force=false) => cacheTail = cacheTail.then(async () => {
    if (!dirty.size || (!force && dirty.size < 25)) return
    const ids = [...dirty].slice(0, 40)
    const tag = ids.flatMap(id => [`celebs:${id}`, `celebs:${people.get(id)?.slug}`]).filter(x => !x.endsWith(':undefined'))
    const response = await fetch(`${process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'}/api/revalidate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, secret: required('CRON_SECRET') }), signal: AbortSignal.timeout(60_000) })
    const result = await response.json()
    if (!response.ok || !result.complete || !result.revalidated || result.cloudflare?.ok !== true) throw Error('CACHE_INVALIDATION_INCOMPLETE')
    for (const id of ids) dirty.delete(id)
    state.dirtyIds = [...dirty]
    await checkpoint()
    log('cache-complete', { people: ids.length })
  })
  let people, explanations, factions
  let verifiedState
  const workers = []
  let asrWorker, asrDeferred, asrTail = Promise.resolve()
  async function transcribedRepair(row, backup, output, text, timing, worker, requireExactSource) {
    const asrOutput = output.replace(/\.mp3$/, '-asr.mp3')
    await mkdir(dirname(asrOutput),{recursive:true})
    let checked = options['verified-from'] ? await verifiedNarrationFromRun(options['verified-from'],
      verifiedState.entries[row.key],row,sha(await readFile(backup)),sha(text),requireExactSource) : null
    const reused = !!checked
    if (!checked) {
      if (!options.transcribe) throw Error('NO_VERIFIED_NARRATION_CACHE')
      asrWorker ||= new QcWorker({python:'D:/audios/interview-cleaner/.venv/Scripts/python.exe',device:'auto'})
      const task = asrTail.then(()=> {
        if (asrDeferred) throw Error(asrDeferred)
        return asrWorker.check({id:row.key,audio:backup,text,locale:row.locale,normalize_spacing:true,
          require_exact_source:requireExactSource,output:asrOutput})
      })
      asrTail = task.catch(()=>{})
      checked = await task
    }
    if (checked.status === 'deferred' && checked.flags?.includes('resource-busy')) asrDeferred = qcFailure(checked,'Targeted transcription')
    if (!checked.ok || !['passed','repaired'].includes(checked.status)) {
      await writeFile(asrOutput+'.qc.json',JSON.stringify(checked)+'\n')
      throw Error(qcFailure(checked,'Targeted transcription'))
    }
    let target = checked.audio
    if (checked.status === 'passed' && !reused) {
      await writeFile(asrOutput,await readFile(target),{flag:'wx'})
      checked.verifiedAudio = target; checked.audio = target = asrOutput
    }
    const hash = sha(await readFile(target)), sourceHash = sha(text)
    if (!reused) await writeFile(target+'.qc.json',JSON.stringify({...checked,audioHash:hash,sourceHash})+'\n')
    const prepared = buildReadingTiming({text,locale:row.locale,sourceHash,audioHash:hash,audioEtag:'',
      duration:checked.metrics.duration,words:checked.words})
    if (prepared.rejected.length || prepared.timing.segments.length !== prepared.sentences) throw Error('INCOMPLETE_TIMING_AFTER_TRANSCRIPTION')
    const verified = await worker.check({audio:target,timing:prepared.timing,
      boundaries:trustedBoundaries(text,row.locale,prepared.timing),verify_only:true})
    if (!verified.ok) throw Error(verified.error)
    return {ok:true,output:target,timing:prepared.timing,breaths:checked.spacing?.breathSpans?.length || 0,
      edits:checked.spacing?.edits || [],pauses:checked.spacing?.pauses || [],policy:NARRATION_PAUSES,
      before:timing.duration,after:prepared.timing.duration,
      verification:reused?'cached-asr-and-final-encoded-spacing':'asr-and-final-encoded-spacing'}
  }
  try {
    const [p, e, f] = await Promise.all([
      table('celebs', 'id,slug,nickname,voice_v,virtual_monologue,virtual_monologue_en'),
      table('celeb_explanations', 'profile_id,plain_text,plain_text_en', 'profile_id'),
      table('faction_lv2', 'id,slug,name,description,description_en')])
    people = new Map(p.map(x => [x.id, x])); explanations = new Map(e.map(x => [x.profile_id, x])); factions = new Map(f.map(x => [x.id, x]))
    const targets = []
    for (const prefix of ['celebs/', 'factions/']) {
      let token
      do {
        const page = await send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }))
        for (const item of page.Contents || []) {
          const match = /^(celebs|factions)\/([^/]+)\/voice\/(ko|en)\/(reading|vmonologue|description)\.mp3$/.exec(item.Key)
          if (match) targets.push({ key: item.Key, id: match[2], locale: match[3], type: match[4], bytes: item.Size })
        }
        token = page.NextContinuationToken
      } while (token)
    }
    state.inventory = { total: targets.length, bytes: targets.reduce((n, t) => n+t.bytes, 0),
      types: Object.fromEntries(['reading','vmonologue','description'].map(type => [type, targets.filter(t=>t.type===type).length])) }
    await writeFile(join(options.run, 'inventory.json'), JSON.stringify(targets))
    await checkpoint()
    log('inventory', { ...state.inventory, publish: !!options.publish, workers: 2,
      gpu: options.transcribe ? 'resource-admitted-asr-only' : false, run: options.run })
    // Probe all three kinds early, then proceed through the full service inventory.
    targets.sort((a,b) => (a.type === 'reading' ? 1 : 0) - (b.type === 'reading' ? 1 : 0) || a.key.localeCompare(b.key))
    const retryState = options['retry-from'] ? JSON.parse(await readFile(options['retry-from'], 'utf8')) : null
    const archives = options.archives ? JSON.parse(await readFile(options.archives, 'utf8')) : {sources:{},reports:{}}
    const originals = new Map(options['originals-from']
      ? JSON.parse(await readFile(options['originals-from'],'utf8')).map(row=>[row.key,row]) : [])
    if (options['verified-from']) {
      options['verified-from'] = resolve(options['verified-from'])
      verifiedState = JSON.parse(await readFile(join(options['verified-from'],'state.json'),'utf8'))
      if (verifiedState.policyHash !== policyHash) throw Error('Verified audio uses a different cleanup implementation')
    }
    const eligible = options['originals-from'] ? targets.filter(row=>originals.has(row.key))
      : retryState ? targets.filter(row=>retryState.entries[row.key]?.status === 'held') : targets
    const selected = options.limit ? eligible.slice(0, Number(options.limit)) : eligible
    log('selected', {files:selected.length, retry:!!retryState})
    let index = 0, done = 0
    workers.push(new Worker(), new Worker())
    const versions = new Map()
    async function bumpVersion(id) {
      const previous = versions.get(id) || Promise.resolve()
      const next = previous.then(async () => {
        for (let tries=0; tries<5; tries++) {
          const [current] = await api(`celebs?id=eq.${id}&select=voice_v`)
          const version = (current.voice_v || 0) + 1
          const updated = await api(`celebs?id=eq.${id}&voice_v=${current.voice_v == null ? 'is.null' : 'eq.'+current.voice_v}&select=voice_v`, {
            method: 'PATCH', headers: { 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify({ voice_v:version }) })
          if (updated.length === 1) { dirty.add(id); state.dirtyIds = [...dirty]; return version }
        }
        throw Error('VOICE_VERSION_CONFLICT')
      })
      versions.set(id, next.catch(()=>{})); return next
    }
    await Promise.all(workers.map(async worker => {
      while (index < selected.length) {
        const row = selected[index++], old = state.entries[row.key]
        if (old?.status === 'published' || (!options.publish && old?.status === 'ready')) { done++; continue }
        // Small DSP workers need no model headroom. Stop adding work if RAM is tight.
        while (freemem() < Math.max(1.5 * 2**30, totalmem() * .04)) {
          log('resource-wait', { freeGiB: (freemem()/2**30).toFixed(2) }); await sleep(10_000)
        }
        let entry = state.entries[row.key] = { ...old, ...row, status: 'processing' }
        try {
          const owner = row.type === 'description' ? factions.get(row.id) : people.get(row.id)
          const source = row.type === 'reading' ? explanations.get(row.id) : owner
          const column = row.type === 'reading' ? (row.locale==='ko'?'plain_text':'plain_text_en')
            : row.type === 'description' ? (row.locale==='ko'?'description':'description_en')
            : (row.locale==='ko'?'virtual_monologue':'virtual_monologue_en')
          let text = (source?.[column] || '').trim()
          const dbSourceHash = sha(text)
          if (!owner || !text) throw Error('MISSING_SOURCE')
          entry.slug = owner.slug
          const jsonKey = row.key.replace(/\.mp3$/, '.json')
          const [audio, json] = await Promise.all([get(row.key), get(jsonKey)])
          const original = originals.get(row.key)
          if (audio.metadata?.['narration-cleanup-sha256'] === policyHash && !original) {
            const timing = JSON.parse(json.body)
            if (timing.audioHash !== sha(audio.body) || timing.audioEtag !== audio.etag) throw Error('PROCESSED_TIMING_MISMATCH')
            if (options.publish && row.type !== 'description' && !entry.voiceVersion) entry.voiceVersion = await bumpVersion(row.id)
            entry.status = 'published'; entry.audioHash = timing.audioHash; done++; await checkpoint(); continue
          }
          let timing = JSON.parse(json.body)
          entry.originalHash = sha(audio.body)
          let inputHash = entry.originalHash, inputEtag = audio.etag, inputMetadata = audio.metadata
          if (original) {
            if (original.audioHash !== entry.originalHash) throw Error('PUBLISHED_AUDIO_CHANGED_SINCE_AUDIT')
            inputHash = sha(await readFile(original.backup))
            if (inputHash !== original.originalHash) throw Error('ORIGINAL_AUDIO_HASH_MISMATCH')
            timing = JSON.parse(await readFile(original.backup.replace(/\.mp3$/,'.json'),'utf8'))
            const metadata = JSON.parse(await readFile(original.backup+'.metadata.json','utf8'))
            inputEtag = metadata.audio.etag; inputMetadata = metadata.audio.metadata
            entry.processingInputHash = inputHash; entry.processingInput = original.backup
          }
          const timingMismatch = timing.audioHash !== inputHash || (timing.audioEtag && timing.audioEtag !== inputEtag)
          if (timingMismatch && !options.transcribe && !options['verified-from']) throw Error('TIMING_AUDIO_HASH_MISMATCH')
          const expectedSourceHash = timingMismatch
            ? (inputMetadata?.['source-sha256'] || archives.reports[inputHash]?.sourceHash)
            : timing.sourceHash
          if (sha(text) !== expectedSourceHash && archives.sources[expectedSourceHash]) {
            text = archives.sources[expectedSourceHash]
            entry.sourceFromArchive = true
          }
          const sourceIsUnbound = sha(text) !== expectedSourceHash
          if (sourceIsUnbound && !options.transcribe && !options['verified-from']) throw Error('STALE_SOURCE')
          if (sourceIsUnbound) entry.requiresExactSourceTranscription = true
          timing = mergeObservedSentences(text,row.locale,timing)
          let archivedQc = readingSentences(text, row.locale).length !== timing.segments.length ? archives.reports[inputHash] : null
          if (archivedQc?.sourceHash !== timing.sourceHash) archivedQc = null
          if (archivedQc?.reportPath) {
            const bytes = await readFile(archivedQc.reportPath)
            if (sha(bytes) !== archivedQc.reportHash) throw Error('ARCHIVED_QC_HASH_MISMATCH')
            archivedQc = JSON.parse(bytes)
          }
          if (archivedQc?.ok && archivedQc.status === 'passed' && /\.mp3$/i.test(archivedQc.audio || '')
              && Math.abs(archivedQc.metrics?.duration-timing.duration) < .03 && archivedQc.words?.length) {
            const prepared = buildReadingTiming({text,locale:row.locale,sourceHash:timing.sourceHash,
              audioHash:inputHash,audioEtag:inputEtag,duration:timing.duration,words:archivedQc.words})
            if (!prepared.rejected.length && prepared.timing.segments.length === prepared.sentences) {
              timing = prepared.timing
              entry.timingFromArchivedQc = true
            }
          }
          let boundaries
          try {
            if (sourceIsUnbound) throw Error('STALE_SOURCE')
            if (timingMismatch) throw Error('TIMING_AUDIO_HASH_MISMATCH')
            boundaries = trustedBoundaries(text, row.locale, timing)
          } catch (error) {
            if (!options.transcribe && !options['verified-from']) throw error
            entry.originalTimingIssue = error.message
          }
          const backup = join(options.run, '_backup', ...row.key.split('/'))
          await mkdir(dirname(backup), { recursive:true })
          try {
            await writeFile(backup, audio.body, { flag:'wx' })
            await writeFile(backup.replace(/\.mp3$/, '.json'), json.body, { flag:'wx' })
            await writeFile(backup + '.metadata.json', JSON.stringify({ audio: { ...audio, body:undefined }, timing: { ...json, body:undefined } }), { flag:'wx' })
          } catch (error) {
            if (error.code !== 'EEXIST') throw error
            if (sha(await readFile(backup)) !== entry.originalHash) throw Error('BACKUP_ALREADY_CONTAINS_DIFFERENT_AUDIO')
          }
          entry.backup = backup
          await writeFile(join(dirname(backup), `${row.type}-source.txt`), text, { flag:'w' })
          const processingInput = original?.backup || backup
          const output = join(options.run, 'processed', ...row.key.split('/'))
          // Each retry gets a fresh local destination; existing results are preserved.
          let uniqueOutput = output.replace(/\.mp3$/, `-${Date.now()}.mp3`)
          let result = boundaries ? await worker.check({ audio:processingInput, output:uniqueOutput, timing, boundaries }) : {ok:false}
          if (!result.ok && (options.transcribe || options['verified-from'])) result = await transcribedRepair(row,processingInput,uniqueOutput,text,timing,worker,sourceIsUnbound)
          if (!result.ok) throw Error(result.error)
          uniqueOutput = result.output
          const body = await readFile(uniqueOutput), hash = sha(body)
          entry.output = uniqueOutput; entry.audioHash = hash; entry.breaths = result.breaths; entry.pauses = result.edits.length
          entry.before = result.before; entry.after = result.after; entry.verification = result.verification
          await writeFile(uniqueOutput + '.processing.json', JSON.stringify(result) + '\n')
          if (options.publish) {
            const tableName = row.type === 'reading' ? 'celeb_explanations' : row.type === 'description' ? 'faction_lv2' : 'celebs'
            const idColumn = row.type === 'reading' ? 'profile_id' : 'id'
            const [currentSource] = await api(`${tableName}?${idColumn}=eq.${row.id}&select=${column}`)
            if (sha((currentSource?.[column]||'').trim()) !== dbSourceHash) throw Error('SOURCE_CHANGED_DURING_PROCESSING')
            const put = await send(new PutObjectCommand({ Bucket:bucket, Key:row.key, Body:body,
              ContentType:audio.contentType || 'audio/mpeg', CacheControl:audio.cacheControl,
              Metadata:{...audio.metadata, 'source-sha256':result.timing.sourceHash, 'audio-sha256':hash, 'narration-cleanup-sha256':policyHash}, IfMatch:audio.etag }))
            if (put.ETag?.replaceAll('"','') !== md5(body)) throw Error('UPLOADED_AUDIO_ETAG_MISMATCH')
            const nextTiming = { ...result.timing, audioHash:hash, audioEtag:put.ETag }
            const timingBody = Buffer.from(JSON.stringify(nextTiming) + '\n')
            let timingPut
            try {
              timingPut = await send(new PutObjectCommand({ Bucket:bucket, Key:jsonKey, Body:timingBody,
                ContentType:json.contentType || 'application/json', CacheControl:json.cacheControl,
                Metadata:{...json.metadata, 'source-sha256':result.timing.sourceHash, 'audio-sha256':hash, 'narration-cleanup-sha256':policyHash}, IfMatch:json.etag }))
              const [head, uploadedTiming] = await Promise.all([send(new HeadObjectCommand({Bucket:bucket,Key:row.key})), get(jsonKey)])
              if (head.ETag !== put.ETag || head.Metadata?.['audio-sha256'] !== hash || sha(uploadedTiming.body) !== sha(timingBody)) throw Error('REMOTE_VERIFICATION_FAILED')
            } catch (error) {
              // Roll back only our audio version; never overwrite another publisher's change.
              if (timingPut?.ETag) await send(new PutObjectCommand({Bucket:bucket,Key:jsonKey,Body:json.body,
                ContentType:json.contentType,CacheControl:json.cacheControl,Metadata:json.metadata,IfMatch:timingPut.ETag}))
              await send(new PutObjectCommand({Bucket:bucket,Key:row.key,Body:audio.body,ContentType:audio.contentType,
                CacheControl:audio.cacheControl,Metadata:audio.metadata,IfMatch:put.ETag}))
              throw error
            }
            await writeFile(uniqueOutput.replace(/\.mp3$/, '.json'), timingBody)
            entry.status = 'uploaded'
            await checkpoint()
            entry.voiceVersion = row.type === 'description' ? null : await bumpVersion(row.id)
            entry.status = 'published'; entry.publishedAt = new Date().toISOString()
            entry.publicUrl = `${required('R2_PUBLIC_URL').replace(/\/$/,'')}/${row.key}?v=${entry.voiceVersion || hash.slice(0,12)}`
            // Test the public asset path across the run without doubling all downloads.
            if (done < 3 || done % 100 === 0) {
              const { stdout } = await exec('curl.exe', ['-f','-sS','--max-time','60',entry.publicUrl], {encoding:'buffer',maxBuffer:20*1024*1024,windowsHide:true})
              if (sha(stdout) !== hash) throw Error('PUBLIC_AUDIO_HASH_MISMATCH')
              entry.publicVerifiedAt = new Date().toISOString()
            }
            await revalidate()
          } else entry.status = 'ready'
        } catch (error) {
          entry.status = 'held'; entry.error = error.message; entry.heldAt = new Date().toISOString()
          log('held', { key:row.key, error:error.message })
        }
        done++
        await checkpoint()
        if (done % 25 === 0) log('progress', { done, selected:selected.length,
          published:Object.values(state.entries).filter(x=>x.status==='published').length,
          held:Object.values(state.entries).filter(x=>x.status==='held').length, freeGiB: +(freemem()/2**30).toFixed(2) })
      }
    }))
    while (dirty.size) await revalidate(true)
    await checkpoint()
    log('finished', { inventory:state.inventory, statuses:Object.values(state.entries).reduce((a,e)=>(a[e.status]=(a[e.status]||0)+1,a),{}), state:statePath })
  } finally {
    for (const worker of workers) worker.close()
    asrWorker?.close()
    await checkpointTail.catch(()=>{})
    s3.destroy(); await lock.close(); await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error=>{console.error(error.message);process.exitCode=1})
}
