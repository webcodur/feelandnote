/**
 * @deprecated 신원 오등록 위험 때문에 실행을 차단했다.
 *
 * ⚠️ 이 파일의 크롭 코드는 폐기된 규격이다. 현재 규격은 docs/project/celeb-avatar-spec.md,
 *    구현은 src/lib/avatar-geometry.ts 하나다. 여기 남은 상수·정렬 방식을 참고해 되살리지 마라.
 *
 * 셀럽 아바타 자동 등록 (URL 기반) — 임의 웹 이미지 URL 또는 자동 후보 탐색 → face detection 크롭 → R2 → profiles.avatar_url
 *
 * 라이선스 검증을 스킵하고 사용자 명시 URL 또는 자동 탐색한 후보 이미지를 그대로 채용한다.
 * (사용자 사전 승인: 인물 얼굴 사진은 분쟁 위험이 낮다고 판단하여 일반 웹 이미지 허용)
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   1) 단일 URL 직접 지정:
 *      pnpm tsx scripts/upload-celeb-image-from-url.ts \
 *        --celeb-id <uuid> --slug <slug> --image-url <url> --source-note "<자유 텍스트>"
 *
 *   2) 일괄 자동 탐색 (스크립트 내 BATCH_TARGETS 또는 --targets-file):
 *      pnpm tsx scripts/upload-celeb-image-from-url.ts --batch [--only slug1,slug2]
 *
 * 자동 탐색 후보 우선순위:
 *   1) en.wikipedia.org/wiki/{title} 본문 infobox 이미지 (Wikipedia API pageimages → original URL)
 *   2) DuckDuckGo Images 비공식 endpoint (검색어: nickname_en + profession)
 *   3) Google 이미지 검색 결과 페이지 직접 스크레이핑 (의 src/ data-src 추출)
 *
 * 모든 후보는 face detection으로 검증 — score < 0.5 또는 box width < 80px 폐기.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { CELEB_AVATAR_SMALL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { readFileSync, appendFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import type { TNetInput } from '@vladmandic/face-api'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const __dirname = dirname(fileURLToPath(import.meta.url))

// 서비스 롤 클라이언트 — 호출부 추론 타입을 매개변수 선언에 재사용
function createServiceClient(url: string, key: string) {
  return createClient(url, key)
}
type ServiceClient = ReturnType<typeof createServiceClient>

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ─── 라이선스 부적합 인물: 위키미디어 원본을 라이선스 무시하고 그대로 사용 ─────
// (사용자 명시 승인. 크레딧 로그에는 원래 라이선스 기록)
const WIKIMEDIA_RELICENSED: Record<string, { commonsFile: string; license: string; note: string }> = {
  'bang-si-hyuk': {
    commonsFile: 'Bang_Si-hyuk.jpg',
    license: 'KOGL Type 1',
    note: 'license_relicensed_user_approved',
  },
  'glenn-gould': {
    commonsFile: 'Glenn_Gould_1.jpg',
    license: 'Attribution required',
    note: 'license_relicensed_user_approved',
  },
  'kim-young-ha': {
    commonsFile: 'Kim_Young-ha.jpg',
    license: 'Attribution',
    note: 'license_relicensed_user_approved',
  },
  'mark-rothko': {
    commonsFile: 'Mark_Rothko_photograph_by_Consuelo_Kanaga.jpg',
    license: 'Fair use',
    note: 'license_relicensed_user_approved',
  },
  'tadashi-yanai': {
    commonsFile: 'Tadashi_Yanai,_in_Japan_on_May_23,_2022_(1)_(cropped).jpg',
    license: 'GODL-India',
    note: 'license_relicensed_user_approved',
  },
}

// ─── 자동 탐색 검색어 보강 (직업·키워드) ─────────────────────────
const PROFESSION_SEARCH_HINTS: Record<string, string> = {
  author: 'author writer',
  director: 'film director',
  scientist: 'researcher scientist',
  athlete: 'athlete sportsperson',
  entrepreneur: 'CEO founder businessperson',
  humanities_scholar: 'scholar historian',
  social_scientist: 'scholar professor',
  politician: 'politician',
  leader: 'leader activist',
  commander: 'general commander',
  musician: 'musician',
  visual_artist: 'artist',
}

// ─── .env 로더 ─────────────────────────────────────────────────
function loadEnv(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

// ─── 다운로드 ─────────────────────────────────────────────────
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      Referer: 'https://www.google.com/',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.startsWith('image/') && !ct.includes('octet-stream')) {
    throw new Error(`비 이미지 응답: content-type=${ct}`)
  }
  const ab = await res.arrayBuffer()
  const buf = Buffer.from(ab)
  if (buf.length < 2000) throw new Error(`이미지 너무 작음: ${buf.length} bytes`)
  return buf
}

// ─── face-api 모델 로드 ────────────────────────────────────────
let modelsLoaded = false
async function ensureFaceModels() {
  if (modelsLoaded) return
  const modelDir = resolve(
    __dirname,
    '..',
    'node_modules',
    '@vladmandic',
    'face-api',
    'model'
  )
  if (!existsSync(modelDir)) {
    throw new Error(`face-api 모델 디렉토리 없음: ${modelDir}`)
  }
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  modelsLoaded = true
}

// ─── tfjs wasm 초기화 ───────────────────────────────────────
let tfReady = false
async function ensureTf() {
  if (tfReady) return
  const wasmDir =
    resolve(
      __dirname,
      '..',
      'node_modules',
      '@tensorflow',
      'tfjs-backend-wasm',
      'dist'
    ) + '/'
  setWasmPaths(wasmDir)
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  tfReady = true
}

interface DetectedFace {
  x: number
  y: number
  width: number
  height: number
  score: number
}

async function detectLargestFace(imgBuf: Buffer): Promise<DetectedFace | null> {
  const meta = await sharp(imgBuf, { limitInputPixels: false }).rotate().metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  if (origW < 130 || origH < 130) return null
  const longSide = Math.max(origW, origH)
  const scale = longSide > 1024 ? 1024 / longSide : 1
  const targetW = Math.round(origW * scale)
  const targetH = Math.round(origH * scale)
  const { data, info } = await sharp(imgBuf, { limitInputPixels: false })
    .rotate()
    .resize(targetW, targetH, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as TNetInput
  try {
    const options = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.4,
      maxResults: 10,
    })
    const detections = await faceapi.detectAllFaces(tensor, options)
    if (detections.length === 0) return null
    detections.sort((a, b) => b.box.area - a.box.area)
    const best = detections[0]
    const inv = 1 / scale
    return {
      x: best.box.x * inv,
      y: best.box.y * inv,
      width: best.box.width * inv,
      height: best.box.height * inv,
      score: best.score,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

function computeSquareCrop(
  face: DetectedFace,
  imgWidth: number,
  imgHeight: number
): { left: number; top: number; size: number } {
  const cx = face.x + face.width / 2
  const cy = face.y + face.height * 0.5
  const baseSize = Math.max(face.width, face.height)
  const target = baseSize / 0.45
  const maxSize = Math.min(imgWidth, imgHeight)
  const size = Math.min(target, maxSize)
  const half = size / 2
  const left = Math.max(0, Math.min(imgWidth - size, cx - half))
  const top = Math.max(0, Math.min(imgHeight - size, cy - half))
  return {
    left: Math.round(left),
    top: Math.round(top),
    size: Math.round(size),
  }
}

async function toAvatarWebp(
  input: Buffer,
  description: string
): Promise<{
  buf: Buffer
  faceDetected: boolean
  faceScore: number | null
  faceBox: DetectedFace | null
}> {
  const rotated = await sharp(input, { limitInputPixels: false }).rotate().toBuffer()
  const metaInfo = await sharp(rotated, { limitInputPixels: false }).metadata()
  const W = metaInfo.width ?? 0
  const H = metaInfo.height ?? 0
  if (W < 200 || H < 200) {
    throw new Error(`이미지 너무 작음: ${W}x${H}`)
  }
  const exifBlock = {
    exif: {
      IFD0: {
        ImageDescription: description,
        Copyright: description,
      },
    },
  } as const

  const face = await detectLargestFace(rotated)
  if (face) {
    const { left, top, size } = computeSquareCrop(face, W, H)
    const buf = await sharp(rotated, { limitInputPixels: false })
      .extract({ left, top, width: size, height: size })
      .resize(800, 800, { fit: 'cover' })
      .withMetadata(exifBlock)
      .webp({ quality: 85 })
      .toBuffer()
    return { buf, faceDetected: true, faceScore: face.score, faceBox: face }
  }
  return {
    buf: Buffer.alloc(0),
    faceDetected: false,
    faceScore: null,
    faceBox: null,
  }
}

// ─── Wikipedia 본문 이미지 ────────────────────────────────────
async function fetchWikipediaPageImage(searchName: string): Promise<string | null> {
  // 1단계: search → title
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=` +
      encodeURIComponent(searchName) +
      `&format=json&srlimit=3`
    const r = await fetch(searchUrl, { headers: { 'User-Agent': UA } })
    if (!r.ok) return null
    const j = (await r.json()) as { query?: { search?: Array<{ title: string }> } }
    const first = j.query?.search?.[0]?.title
    if (!first) return null
    // 2단계: pageimages → original URL
    const piUrl =
      `https://en.wikipedia.org/w/api.php?action=query&titles=` +
      encodeURIComponent(first) +
      `&prop=pageimages&piprop=original&format=json`
    const r2 = await fetch(piUrl, { headers: { 'User-Agent': UA } })
    if (!r2.ok) return null
    const j2 = (await r2.json()) as {
      query?: {
        pages?: Record<string, { original?: { source?: string } }>
      }
    }
    const pages = j2.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0]
    return page?.original?.source ?? null
  } catch {
    return null
  }
}

// ─── DuckDuckGo 이미지 검색 비공식 endpoint ────────────────────
async function fetchDuckDuckGoImages(query: string): Promise<string[]> {
  try {
    // vqd 토큰 획득
    const vqdRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { 'User-Agent': UA } }
    )
    const html = await vqdRes.text()
    const vqdMatch = html.match(/vqd=["']?([\d-]+)/) || html.match(/vqd=([\d-]+)&/)
    if (!vqdMatch) return []
    const vqd = vqdMatch[1]
    const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}&p=1`
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' },
    })
    if (!res.ok) return []
    const j = (await res.json()) as { results?: Array<{ image?: string; thumbnail?: string }> }
    const urls: string[] = []
    for (const r of j.results ?? []) {
      if (r.image) urls.push(r.image)
      if (urls.length >= 15) break
    }
    return urls
  } catch {
    return []
  }
}

// ─── Google 이미지 검색 (HTML 스크레이핑) ───────────────────────
async function fetchGoogleImages(query: string): Promise<string[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=active`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return []
    const html = await res.text()
    // og:image, data-src 등 가능한 후보 추출
    const urls: string[] = []
    const reA = /\["(https?:\/\/[^"]+\.(?:jpe?g|png|webp))",\d+,\d+\]/gi
    let m
    while ((m = reA.exec(html)) !== null) {
      urls.push(m[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&'))
      if (urls.length >= 20) break
    }
    return urls
  } catch {
    return []
  }
}

// ─── 위키미디어 Commons 메타 (라이선스 우회용) ─────────────────
async function fetchCommonsUrl(commonsFile: string): Promise<{ url: string; descriptionUrl: string } | null> {
  try {
    const titleParam = encodeURIComponent(`File:${commonsFile}`)
    const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${titleParam}&prop=imageinfo&iiprop=url&format=json`
    const res = await fetch(api, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const j = (await res.json()) as {
      query?: {
        pages?: Record<string, { imageinfo?: Array<{ url: string; descriptionurl: string }> }>
      }
    }
    const pages = j.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0]
    const info = page?.imageinfo?.[0]
    return info ? { url: info.url, descriptionUrl: info.descriptionurl } : null
  } catch {
    return null
  }
}

// ─── 후보 시도 → face detection 검증 → 첫 통과본 채택 ───────────
interface ProcessResult {
  buf: Buffer
  sourceUrl: string
  sourceType: string
  faceScore: number
  description: string
}

async function tryCandidates(
  candidates: Array<{ url: string; type: string }>
): Promise<ProcessResult | null> {
  for (const c of candidates) {
    try {
      const original = await downloadImage(c.url)
      const description = `Source: ${c.url} | Type: ${c.type}`
      const conv = await toAvatarWebp(original, description)
      if (!conv.faceDetected || !conv.faceBox || !conv.faceScore) continue
      // 검증: score >= 0.5, box width >= 80
      if (conv.faceScore < 0.5) continue
      if (conv.faceBox.width < 80) continue
      return {
        buf: conv.buf,
        sourceUrl: c.url,
        sourceType: c.type,
        faceScore: conv.faceScore,
        description,
      }
    } catch (e) {
      // 다음 후보 시도
      console.log(`     [skip] ${c.type} ${c.url.slice(0, 80)}: ${e instanceof Error ? e.message : e}`)
    }
  }
  return null
}

interface ProfileRow {
  id: string
  slug: string
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  nationality: string | null
}

async function discoverCandidates(profile: ProfileRow): Promise<Array<{ url: string; type: string }>> {
  const candidates: Array<{ url: string; type: string }> = []
  const searchName = profile.nickname_en || profile.nickname || profile.slug.replace(/-/g, ' ')
  const profHint = profile.profession ? PROFESSION_SEARCH_HINTS[profile.profession] : ''
  const enrichedQuery = `${searchName} ${profHint}`.trim()

  // 1순위: Wikipedia 본문 이미지 (search → pageimages original)
  const wikiUrl = await fetchWikipediaPageImage(searchName)
  if (wikiUrl) candidates.push({ url: wikiUrl, type: 'wikipedia_body' })

  // 2순위: DuckDuckGo
  const ddg = await fetchDuckDuckGoImages(enrichedQuery + ' portrait')
  for (const u of ddg.slice(0, 8)) candidates.push({ url: u, type: 'duckduckgo' })

  // 3순위: Google
  const g = await fetchGoogleImages(enrichedQuery + ' portrait')
  for (const u of g.slice(0, 10)) candidates.push({ url: u, type: 'google_image' })

  return candidates
}

// ─── 메인 ──────────────────────────────────────────────────────
type Outcome =
  | { kind: 'uploaded'; url: string; sourceType: string; sourceUrl: string; faceScore: number; license?: string }
  | { kind: 'skipped'; reason: string; detail: string }

async function processOne(args: {
  profile: ProfileRow
  env: Record<string, string>
  supabase: ServiceClient
  r2: S3Client
  manualUrl?: string
  manualFile?: string
  sourceNote?: string
}): Promise<Outcome> {
  const { profile, env, supabase, r2, manualUrl, manualFile, sourceNote } = args

  let result: ProcessResult | null = null
  let licenseLabel: string | undefined

  // license_unsuitable 폴백: 위키미디어 원본 라이선스 무시
  const relic = WIKIMEDIA_RELICENSED[profile.slug]

  if (manualFile) {
    // 로컬 파일 직접 채용 — 다운로드 대신 디스크에서 읽어 동일 face-crop 파이프라인을 탄다.
    const buf = readFileSync(manualFile)
    const description = sourceNote ? `Source: local ${manualFile} | ${sourceNote}` : `Source: local ${manualFile}`
    const conv = await toAvatarWebp(buf, description)
    if (!conv.faceDetected || !conv.faceScore) {
      return { kind: 'skipped', reason: 'local_no_face', detail: manualFile }
    }
    result = { buf: conv.buf, sourceUrl: manualFile, sourceType: sourceNote ?? 'local_file', faceScore: conv.faceScore, description }
  } else if (manualUrl) {
    result = await tryCandidates([{ url: manualUrl, type: sourceNote ?? 'manual' }])
    if (!result) return { kind: 'skipped', reason: 'manual_url_face_invalid', detail: manualUrl }
  } else if (relic) {
    const cmeta = await fetchCommonsUrl(relic.commonsFile)
    if (!cmeta) return { kind: 'skipped', reason: 'commons_meta_failed', detail: relic.commonsFile }
    result = await tryCandidates([{ url: cmeta.url, type: 'wikimedia_relicensed' }])
    if (!result) return { kind: 'skipped', reason: 'relicensed_face_invalid', detail: cmeta.descriptionUrl }
    licenseLabel = relic.license
    result.description = `Source: ${cmeta.descriptionUrl} | License: ${relic.license} | ${relic.note}`
  } else {
    const candidates = await discoverCandidates(profile)
    if (candidates.length === 0) {
      return { kind: 'skipped', reason: 'no_candidate_found', detail: '' }
    }
    console.log(`     후보 ${candidates.length}개 시도 중...`)
    result = await tryCandidates(candidates)
    if (!result) return { kind: 'skipped', reason: 'no_face_detected', detail: `${candidates.length}개 후보 모두 폐기` }
  }

  // R2 업로드
  const key = `celebs/${profile.id}/avatar.webp`
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: result.buf,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`

  // 얼굴이 작게 나오는 화면(성향 분포 등)이 쓸 작은 판. 규격은 shared가 쥔다.
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: `celebs/${profile.id}/${CELEB_AVATAR_SMALL.smallFile}`,
      Body: await sharp(result.buf)
        .resize(CELEB_AVATAR_SMALL.sizePx, CELEB_AVATAR_SMALL.sizePx, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer(),
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  // DB 갱신
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', profile.id)
  if (error) throw new Error(`profiles update 실패: ${error.message}`)

  // 크레딧 로그 누적
  const logPath = resolve(__dirname, 'celeb-image-credits.log')
  const ts = new Date().toISOString()
  const line = `${ts} | ${profile.slug} | ${result.sourceUrl} | ${result.sourceType} | face=${result.faceScore.toFixed(3)}${licenseLabel ? ` | ${licenseLabel}` : ''}\n`
  appendFileSync(logPath, line, 'utf-8')

  return {
    kind: 'uploaded',
    url: publicUrl,
    sourceType: result.sourceType,
    sourceUrl: result.sourceUrl,
    faceScore: result.faceScore,
    license: licenseLabel,
  }
}

function rejectDeprecatedScript(): void {
  throw new Error(
    '이 스크립트는 임의 검색 결과·로컬 파일을 신원 검증 없이 등록할 수 있어 폐기됐다. '
    + 'upload-celeb-avatar.ts에 --image-url/--image-file, '
    + '--identity-evidence, --source-note를 명시해 사용하라.'
  )
}

async function main() {
  rejectDeprecatedScript()
  const argv = process.argv.slice(2)
  const getFlag = (n: string) => {
    const i = argv.indexOf(n)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const batch = argv.includes('--batch')
  const manualCelebId = getFlag('--celeb-id')
  const manualSlug = getFlag('--slug')
  const manualUrl = getFlag('--image-url')
  const manualFile = getFlag('--image-file')
  const manualNote = getFlag('--source-note')
  const onlyArg = getFlag('--only')
  const onlySet = onlyArg ? new Set(onlyArg.split(',').map((s) => s.trim())) : null

  const env = loadEnv(resolve(__dirname, '..', '.env'))
  for (const k of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ]) {
    if (!env[k]) throw new Error(`.env에 ${k} 누락`)
  }

  await ensureTf()
  await ensureFaceModels()
  console.log('[init] tf backend:', tf.getBackend(), '/ face-api loaded')

  const supabase = createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  // ─── _refs 일괄 모드: LLM 세력도감 인물 아바타를 팩션 _refs 이미지로 갱신 ──
  //   대상은 LLM 11개 진영 태그에 배정된 인물만(역매칭). _refs의 잉여 파일은 자동 제외.
  if (argv.includes('--refs')) {
    const refsDir = getFlag('--refs-dir') || resolve(__dirname, '..', '..', 'remotion', 'public', 'factions', '01-AI패권전쟁', '_refs')
    const LLM_TAG_SLUGS = ['openai', 'anthropic', 'google-deepmind', 'xai', 'ai-pioneers', 'meta', 'mistral', 'hugging-face', 'deepseek', 'thinking-machines', 'ssi']
    // nickname → _refs 파일 basename (표기 변형·접두어 보정)
    const REF_ALIAS: Record<string, string> = {
      '피터 스타인버거': '피터 스타인버그',
      '량원펑': '딥시크 량원평',
      '뤄푸리': '딥시크 뤄푸리',
    }
    const EXTS = ['webp', 'png', 'jpg', 'jpeg']

    const { data: tags } = await supabase.from('celeb_tags').select('id, slug').in('slug', LLM_TAG_SLUGS)
    const tagIds = (tags ?? []).map((t: { id: string }) => t.id)
    const { data: assigns } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, profiles!celeb_tag_assignments_celeb_id_fkey(id, slug, nickname, nickname_en, profession, nationality)')
      .in('tag_id', tagIds)

    const seen = new Set<string>()
    const people: ProfileRow[] = []
    for (const a of (assigns ?? [])) {
      const p = (a as { profiles: unknown }).profiles as ProfileRow
      if (!p || seen.has(p.id)) continue
      seen.add(p.id)
      people.push(p)
    }
    console.log(`[refs] 대상 ${people.length}명 / refsDir=${refsDir}`)

    let ok = 0, miss = 0, fail = 0
    for (let i = 0; i < people.length; i++) {
      const p = people[i]
      const base = REF_ALIAS[p.nickname ?? ''] ?? p.nickname ?? ''
      let file: string | null = null
      for (const ext of EXTS) {
        const cand = resolve(refsDir, `${base}.${ext}`)
        if (existsSync(cand)) { file = cand; break }
      }
      if (!file) { console.log(`[${i + 1}/${people.length}] ${p.nickname} → REF 파일 없음`); miss++; continue }
      try {
        const out = await processOne({ profile: p, env, supabase, r2, manualFile: file, sourceNote: 'faction_ref' })
        if (out.kind === 'uploaded') { console.log(`[${i + 1}/${people.length}] ${p.nickname} → OK (face=${out.faceScore.toFixed(2)})`); ok++ }
        else { console.log(`[${i + 1}/${people.length}] ${p.nickname} → SKIP ${out.reason}`); fail++ }
      } catch (e) {
        console.log(`[${i + 1}/${people.length}] ${p.nickname} → ERR ${e instanceof Error ? e.message : e}`); fail++
      }
    }
    console.log(`\n[refs] 완료: OK=${ok}, REF없음=${miss}, 실패=${fail}`)
    return
  }

  // ─── 단일 모드 ──────────────────────────────
  if (!batch) {
    if (!manualCelebId || !manualSlug || (!manualUrl && !manualFile)) {
      console.error('단일 모드: --celeb-id, --slug, 그리고 --image-url 또는 --image-file 필수')
      process.exit(1)
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, slug, nickname, nickname_en, profession, nationality')
      .eq('id', manualCelebId)
      .single()
    if (error || !data) throw new Error(`profile 조회 실패: ${error?.message ?? 'not found'}`)
    const profile = data as unknown as ProfileRow
    const outcome = await processOne({
      profile,
      env,
      supabase,
      r2,
      manualUrl,
      manualFile,
      sourceNote: manualNote,
    })
    console.log('\n결과:', outcome)
    return
  }

  // ─── 일괄 모드: DB에서 avatar_url 비어있는 CELEB 전체 자동 탐색 ──
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, profession, nationality, avatar_url')
    .eq('profile_type', 'CELEB')
    .or('avatar_url.is.null,avatar_url.eq.')
    .order('slug', { ascending: true })
  if (error) throw new Error(`profiles select 실패: ${error.message}`)
  let targets = (rows as unknown as Array<ProfileRow & { avatar_url: string | null }>) ?? []
  if (onlySet) targets = targets.filter((t) => onlySet.has(t.slug))
  console.log(`[batch] 대상 ${targets.length}명`)

  type Row = { slug: string; profileId: string; outcome: Outcome | { kind: 'error'; detail: string } }
  const allRows: Row[] = []

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i]
    console.log(`\n[${i + 1}/${targets.length}] ${p.slug} (${p.nickname_en ?? p.nickname ?? ''})`)
    try {
      const out = await processOne({ profile: p, env, supabase, r2 })
      allRows.push({ slug: p.slug, profileId: p.id, outcome: out })
      if (out.kind === 'uploaded') {
        console.log(`     OK uploaded type=${out.sourceType} score=${out.faceScore.toFixed(3)}`)
      } else {
        console.log(`     SKIP ${out.reason}: ${out.detail}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`     ERR ${msg}`)
      allRows.push({ slug: p.slug, profileId: p.id, outcome: { kind: 'error', detail: msg } })
    }
    await new Promise((r) => setTimeout(r, 700))
  }

  // 보고
  console.log('\n\n===== 보고 =====')
  console.log('| slug | 상태 | 출처 | URL 또는 사유 |')
  console.log('|------|------|------|---------------|')
  const successSlugs: string[] = []
  const byReason: Record<string, string[]> = {}
  for (const r of allRows) {
    if (r.outcome.kind === 'uploaded') {
      successSlugs.push(r.slug)
      console.log(`| ${r.slug} | ✓ uploaded | ${r.outcome.sourceType} | ${r.outcome.url} |`)
    } else if (r.outcome.kind === 'skipped') {
      ;(byReason[r.outcome.reason] ||= []).push(r.slug)
      console.log(`| ${r.slug} | ✗ ${r.outcome.reason} | - | ${r.outcome.detail} |`)
    } else {
      ;(byReason['error'] ||= []).push(r.slug)
      console.log(`| ${r.slug} | ✗ error | - | ${r.outcome.detail} |`)
    }
  }
  console.log(`\n성공: ${successSlugs.length} / 실패: ${allRows.length - successSlugs.length}`)
  for (const k of Object.keys(byReason)) {
    console.log(`실패[${k}] (${byReason[k].length}): ${byReason[k].join(', ')}`)
  }

  // JSON 보고서
  const reportPath = resolve(__dirname, `.tmp-url-batch-report-${Date.now()}.json`)
  const fs = await import('fs')
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        total: allRows.length,
        success: successSlugs.length,
        failures: allRows.length - successSlugs.length,
        successSlugs,
        byReason,
        details: allRows.map((r) => ({ slug: r.slug, profileId: r.profileId, outcome: r.outcome })),
      },
      null,
      2
    )
  )
  console.log(`\n보고서: ${reportPath}`)
}

main().catch((err) => {
  console.error('치명 오류:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
