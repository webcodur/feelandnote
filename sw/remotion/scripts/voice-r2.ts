/**
 * 음성 파일 R2 관리 스크립트
 *
 * 사용법:
 *   pnpm voice:upload -- --episode alexander-the-great   → R2 업로드 (변경분만)
 *   pnpm voice:upload -- --episode alexander-the-great --force  → 전체 재업로드
 *   pnpm voice:pull -- --episode alexander-the-great     → R2에서 다운로드 (누락분만)
 *   pnpm voice:pull -- --all                             → 전 에피소드 다운로드
 *   pnpm voice:r2 -- --status                            → 전체 에피소드 R2 동기화 현황
 */

import 'dotenv/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const VOICE_DIR = path.join(ROOT, 'public', 'voice')
const EPISODES_DIR = path.join(ROOT, 'episodes')

// --- R2 설정 ---
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'feelandnote'
const R2_PREFIX = 'remotion/voice'

function getR2Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('R2 환경변수 누락. .env에 R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY 추가 필요.')
    process.exit(1)
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

// --- R2 매니페스트 (로컬 파일 해시 ↔ R2 동기화 상태) ---
type R2Manifest = Record<string, { hash: string; size: number; uploadedAt: string }>

async function loadR2Manifest(episodeName: string): Promise<R2Manifest> {
  try {
    const raw = await readFile(path.join(VOICE_DIR, episodeName, 'r2-manifest.json'), 'utf-8')
    return JSON.parse(raw)
  } catch { return {} }
}

async function saveR2Manifest(episodeName: string, manifest: R2Manifest): Promise<void> {
  await writeFile(
    path.join(VOICE_DIR, episodeName, 'r2-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8',
  )
}

function fileHash(buf: Buffer): string {
  return createHash('md5').update(buf).digest('hex')
}

// --- 로컬 WAV 파일 스캔 (엔진별 하위 폴더 포함) ---
async function scanLocalWavs(episodeName: string): Promise<{ relPath: string; absPath: string }[]> {
  const baseDir = path.join(VOICE_DIR, episodeName)
  const results: { relPath: string; absPath: string }[] = []

  async function walk(dir: string, prefix: string) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'node_modules') {
        await walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name)
      } else if (e.isFile() && e.name.endsWith('.wav')) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name
        results.push({ relPath: rel, absPath: path.join(dir, e.name) })
      }
    }
  }

  await walk(baseDir, '')
  return results
}

// --- 에피소드 목록 ---
async function listEpisodes(): Promise<string[]> {
  const entries = await readdir(EPISODES_DIR)
  return entries.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
}

// --- 업로드 ---
async function upload(episodeName: string, force: boolean) {
  const r2 = getR2Client()
  const manifest = await loadR2Manifest(episodeName)
  const wavs = await scanLocalWavs(episodeName)

  if (wavs.length === 0) {
    console.log(`  ${episodeName}: 로컬 WAV 없음`)
    return
  }

  let uploaded = 0
  let skipped = 0

  for (const { relPath, absPath } of wavs) {
    const buf = await readFile(absPath)
    const hash = fileHash(buf)

    if (!force && manifest[relPath]?.hash === hash) {
      skipped++
      continue
    }

    const r2Key = `${R2_PREFIX}/${episodeName}/${relPath}`
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buf,
      ContentType: 'audio/wav',
    }))

    manifest[relPath] = { hash, size: buf.length, uploadedAt: new Date().toISOString() }
    uploaded++
    console.log(`  ↑ ${relPath} (${(buf.length / 1024).toFixed(0)}KB)`)
  }

  await saveR2Manifest(episodeName, manifest)
  console.log(`  ${episodeName}: ${uploaded}개 업로드, ${skipped}개 스킵`)
}

// --- 다운로드 ---
async function pull(episodeName: string) {
  const r2 = getR2Client()
  const prefix = `${R2_PREFIX}/${episodeName}/`

  // R2에서 파일 목록 조회
  const listRes = await r2.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
  }))

  const objects = listRes.Contents ?? []
  if (objects.length === 0) {
    console.log(`  ${episodeName}: R2에 파일 없음`)
    return
  }

  let downloaded = 0
  let skipped = 0

  for (const obj of objects) {
    if (!obj.Key || !obj.Key.endsWith('.wav')) continue

    const relPath = obj.Key.replace(prefix, '')
    const localPath = path.join(VOICE_DIR, episodeName, relPath)

    // 로컬에 이미 있으면 스킵
    try {
      await stat(localPath)
      skipped++
      continue
    } catch { /* 파일 없음 → 다운로드 */ }

    // 하위 디렉토리 생성
    await mkdir(path.dirname(localPath), { recursive: true })

    const getRes = await r2.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: obj.Key,
    }))

    if (getRes.Body) {
      const chunks: Uint8Array[] = []
      // @ts-expect-error readable stream
      for await (const chunk of getRes.Body) chunks.push(chunk)
      await writeFile(localPath, Buffer.concat(chunks))
      downloaded++
      console.log(`  ↓ ${relPath} (${((obj.Size ?? 0) / 1024).toFixed(0)}KB)`)
    }
  }

  console.log(`  ${episodeName}: ${downloaded}개 다운로드, ${skipped}개 스킵 (이미 존재)`)
}

// --- 상태 ---
async function status() {
  const episodes = await listEpisodes()

  for (const ep of episodes) {
    const wavs = await scanLocalWavs(ep)
    const manifest = await loadR2Manifest(ep)

    const localCount = wavs.length
    const r2Count = Object.keys(manifest).length
    const localSize = await Promise.all(wavs.map(async w => (await stat(w.absPath)).size))
      .then(sizes => sizes.reduce((a, b) => a + b, 0))

    // 동기화 안 된 파일 수
    let unsynced = 0
    for (const { relPath, absPath } of wavs) {
      const buf = await readFile(absPath)
      const hash = fileHash(buf)
      if (manifest[relPath]?.hash !== hash) unsynced++
    }

    const syncLabel = unsynced === 0 && localCount > 0 ? 'synced' : `${unsynced} unsynced`
    console.log(`  ${ep.padEnd(30)} local: ${localCount}  R2: ${r2Count}  ${(localSize / 1024 / 1024).toFixed(1)}MB  [${syncLabel}]`)
  }
}

// --- CLI ---
const args = process.argv.slice(2)
const command = args[0] // upload | pull | status

const epIdx = args.indexOf('--episode')
const episodeName = epIdx >= 0 ? args[epIdx + 1] : null
const forceAll = args.includes('--force')
const pullAll = args.includes('--all')

async function main() {
  if (command === 'status' || args.includes('--status')) {
    console.log('R2 동기화 현황:')
    await status()
    return
  }

  if (command === 'upload') {
    if (!episodeName) {
      console.error('--episode <name> 필요')
      process.exit(1)
    }
    console.log(`R2 업로드: ${episodeName}${forceAll ? ' (전체)' : ''}`)
    await upload(episodeName, forceAll)
    return
  }

  if (command === 'pull') {
    if (pullAll) {
      const episodes = await listEpisodes()
      console.log(`R2 다운로드: 전체 (${episodes.length}개 에피소드)`)
      for (const ep of episodes) {
        console.log(`\n[${ep}]`)
        await pull(ep)
      }
    } else if (episodeName) {
      console.log(`R2 다운로드: ${episodeName}`)
      await pull(episodeName)
    } else {
      console.error('--episode <name> 또는 --all 필요')
      process.exit(1)
    }
    return
  }

  console.log('사용법:')
  console.log('  pnpm voice:upload -- --episode <name>     R2 업로드')
  console.log('  pnpm voice:pull -- --episode <name>       R2 다운로드')
  console.log('  pnpm voice:pull -- --all                  전체 다운로드')
  console.log('  pnpm voice:r2 -- --status                 동기화 현황')
}

main().catch(console.error)
