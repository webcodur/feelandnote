/**
 * 셀럽 아바타 자동 등록 — 위키미디어 Commons 이미지 다운로드 → face detection 크롭 → R2 업로드 → Supabase profiles.avatar_url 갱신
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/upload-celeb-image-from-wikimedia.ts \
 *     --celeb-id <uuid> \
 *     --commons-file "Fei-Fei Li at AI for Good 2017.jpg" \
 *     --slug fei-fei-li \
 *     --identity-evidence "https://공식·기관·본인 페이지"
 *     --source-note "신원 보존·재구성 방식 설명"
 *     [--face-detect true|false]              (기본 true)
 *     [--require-face true|false]             (기본 false. 켜면 얼굴 미검출 시 업로드 전에 중단)
 *     [--face-frame-ratio 0.45]               (얼굴이 결과에서 차지할 비율, 기본 0.45 ≈ 박스의 2.2배 외곽)
 *     [--crop-gravity attention|entropy|...]  (face detection 비활성 또는 fallback 시 사용)
 *     [--size 800]                            (저장 정사각 한 변, 기본 800. 고해상도 원본이면 올린다)
 *     [--quality 95]                          (최종 WebP 품질, 기본 95)
 *     [--preview-path C:\...\avatar.webp]
 *
 * 절차:
 *  1) 위키미디어 imageinfo API로 원본 URL + 라이선스 메타 조회
 *  2) 원본 이미지 다운로드
 *  3) face detection(SSD MobileNet, vladmandic face-api + tfjs-wasm)
 *     얼굴 박스 중심 좌표를 결과의 정중앙에 두는 정사각형 영역 산출
 *  4) sharp.extract로 좌표 크롭 → --size 정사각 resize → webp(기본 q=95), EXIF에 출처/라이선스 박음
 *  5) 얼굴 미감지 시 cropGravity(기본 attention) entropy fallback + 로그 경고
 *     (--require-face 를 켜면 이 fallback 없이 업로드 전에 실패한다)
 *  6) R2 PUT: celebs/{celebId}/avatar.webp
 *  7) Supabase profiles.avatar_url 갱신 (캐시 버스터 ?v={timestamp})
 *  8) scripts/celeb-image-credits.log 에 1줄 누적
 *
 * 실패 시 즉시 종료. 폴백은 face detection 실패 시 entropy 크롭만 허용.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, appendFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
// vladmandic의 기본 entry는 tfjs-node를 require하므로 node-wasm 빌드로 직접 import.
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── 인자 파싱 ───────────────────────────────────────────────
type CropGravity =
  | 'attention'
  | 'entropy'
  | 'center'
  | 'centre'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'

type Args = {
  celebId: string
  commonsFile?: string
  imageUrl?: string
  imageFile?: string
  sourceNote?: string
  identityEvidence?: string
  slug: string
  faceDetect: boolean
  /**
   * 얼굴을 못 찾으면 크롭 폴백 없이 즉시 실패시킨다(기본 꺼짐).
   * 팩션 개인샷 승격처럼 "얼굴이 잡혔는지"가 결과의 합격 조건인 호출자가 켠다 —
   * 조용히 entropy 크롭으로 대체해 올려 버리면 사람은 성공으로 오해한다.
   */
  requireFace: boolean
  faceFrameRatio: number
  cropGravity: CropGravity
  previewPath?: string
  /** 저장할 정사각 한 변(px). 원본이 이보다 크면 줄이고, 작으면 늘린다 */
  outSize: number
  /** 최종 WebP 저장 품질(1~100). 얼굴·머리카락 디테일 보존을 위해 기본 95 */
  webpQuality: number
}

const ALLOWED_GRAVITIES: ReadonlyArray<CropGravity> = [
  'attention',
  'entropy',
  'center',
  'centre',
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
  'top',
  'bottom',
  'left',
  'right',
]

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const celebId = get('--celeb-id')
  const commonsFile = get('--commons-file')
  const imageUrl = get('--image-url')
  const imageFile = get('--image-file')
  const sourceNote = get('--source-note')
  const identityEvidence = get('--identity-evidence')
  const slug = get('--slug')
  const gravityRaw = (get('--crop-gravity') ?? 'attention').toLowerCase()
  const previewPath = get('--preview-path')
  const faceDetectRaw = (get('--face-detect') ?? 'true').toLowerCase()
  const requireFaceRaw = (get('--require-face') ?? 'false').toLowerCase()
  const faceFrameRatioRaw = get('--face-frame-ratio')
  const outSizeRaw = get('--size')
  const webpQualityRaw = get('--quality')
  if (!celebId || !slug) {
    console.error('필수 인자 누락: --celeb-id, --slug')
    process.exit(1)
  }
  const sourceCount = [commonsFile, imageUrl, imageFile].filter(Boolean).length
  if (sourceCount === 0) {
    console.error('--commons-file / --image-url / --image-file 중 하나는 반드시 지정')
    process.exit(1)
  }
  if (sourceCount > 1) {
    console.error('--commons-file / --image-url / --image-file 은 동시에 쓸 수 없다')
    process.exit(1)
  }
  if (!sourceNote || sourceNote.trim().length < 12) {
    console.error(
      '모든 업로드 모드는 12자 이상의 --source-note 가 필수다. '
      + '인물 신원과 편집·재구성 방식을 구체적으로 적어라.'
    )
    process.exit(1)
  }
  if (!identityEvidence?.trim()) {
    console.error(
      '모든 업로드 모드는 --identity-evidence 가 필수다. '
      + '실존 인물은 공식·기관·본인 페이지 URL을, fiction은 fiction:<SSoT 경로>를 적어라.'
    )
    process.exit(1)
  }
  if (!ALLOWED_GRAVITIES.includes(gravityRaw as CropGravity)) {
    console.error(
      `--crop-gravity 값 부적절: ${gravityRaw}. 허용: ${ALLOWED_GRAVITIES.join(', ')}`
    )
    process.exit(1)
  }
  const faceDetect = faceDetectRaw === 'true' || faceDetectRaw === '1' || faceDetectRaw === 'yes'
  const requireFace = requireFaceRaw === 'true' || requireFaceRaw === '1' || requireFaceRaw === 'yes'
  if (requireFace && !faceDetect) {
    console.error('--require-face 는 --face-detect true 와 함께만 쓸 수 있다')
    process.exit(1)
  }
  const faceFrameRatio = faceFrameRatioRaw ? Number(faceFrameRatioRaw) : 0.45
  if (Number.isNaN(faceFrameRatio) || faceFrameRatio <= 0 || faceFrameRatio >= 1) {
    console.error(`--face-frame-ratio 값 부적절: ${faceFrameRatioRaw}. (0, 1) 범위 필요`)
    process.exit(1)
  }
  const outSize = outSizeRaw ? Number(outSizeRaw) : 800
  if (!Number.isInteger(outSize) || outSize < 64 || outSize > 4096) {
    console.error(`--size 값 부적절: ${outSizeRaw}. 64~4096 정수 필요`)
    process.exit(1)
  }
  const webpQuality = webpQualityRaw ? Number(webpQualityRaw) : 95
  if (!Number.isInteger(webpQuality) || webpQuality < 1 || webpQuality > 100) {
    console.error(`--quality 값 부적절: ${webpQualityRaw}. 1~100 정수 필요`)
    process.exit(1)
  }
  return {
    celebId,
    commonsFile,
    imageUrl,
    imageFile,
    sourceNote,
    identityEvidence,
    slug,
    faceDetect,
    requireFace,
    faceFrameRatio,
    cropGravity: gravityRaw as CropGravity,
    previewPath,
    outSize,
    webpQuality,
  }
}

const FORBIDDEN_LOCAL_SOURCE_SEGMENTS = new Set([
  '_재료',
  '서비스_재료',
  '_refs',
])

// Profiles whose previous avatar was removed for an identity mismatch or for
// lacking person-specific likeness evidence. Keeping the block in the upload
// entry point prevents a renamed/copied material file from bypassing the path
// guard. Remove a slug only after its identity/source audit is resolved.
const PROVENANCE_QUARANTINED_SLUGS = new Set([
  'jebe',
  'pang-juan',
  'zhao-gao',
  'hu-hai',
  'ahmed-sherif',
  'ishak-pasha',
  'jamukha',
  'hai-rui',
  'kong-rong',
  'parmenion',
  'wang-chong',
])

function assertNotProvenanceQuarantined(slug: string): void {
  if (!PROVENANCE_QUARANTINED_SLUGS.has(slug)) return
  throw new Error(
    `Avatar upload blocked for provenance-quarantined profile "${slug}". `
    + 'Resolve the person-specific identity/source audit and explicitly remove '
    + 'the slug from PROVENANCE_QUARANTINED_SLUGS before uploading.'
  )
}

function assertLocalSourcePathAllowed(filePath: string): void {
  const segments = filePath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
  const forbidden = segments.find((segment) => FORBIDDEN_LOCAL_SOURCE_SEGMENTS.has(segment))
  if (forbidden) {
    throw new Error(
      `신원 근거가 아닌 재료 경로는 아바타 입력으로 쓸 수 없다: ${forbidden}. `
      + '이름이 일치하는 완성 개인샷과 독립적인 신원 근거부터 확보하라.'
    )
  }
}

function extractHttpUrls(value: string): string[] {
  return value.match(/https?:\/\/[^\s,;|)]+/gi) ?? []
}

function assertIdentityEvidence(
  evidence: string,
  celebTier: string | null,
  r2PublicUrl: string
): void {
  const trimmed = evidence.trim()
  if (trimmed.toLowerCase().startsWith('fiction:')) {
    if (celebTier !== 'fiction') {
      throw new Error(
        `fiction 신원 근거는 celeb_tier=fiction에만 허용된다. 현재 tier=${celebTier ?? 'null'}`
      )
    }
    if (trimmed.length < 'fiction:x'.length) {
      throw new Error('fiction 신원 근거에는 원전·팩션 SSoT 경로가 필요하다')
    }
    return
  }

  const urls = extractHttpUrls(trimmed)
  if (urls.length === 0) {
    throw new Error(
      '--identity-evidence 에 공식·기관·본인 페이지의 http(s) URL이 하나 이상 필요하다'
    )
  }

  const publicBase = r2PublicUrl.replace(/\/+$/, '').toLowerCase()
  for (const url of urls) {
    const normalized = url.toLowerCase()
    const isOwnServiceAvatar =
      normalized.startsWith(`${publicBase}/celebs/`)
      || /r2\.dev\/celebs\/[^/]+\/avatar\.webp(?:[?#]|$)/i.test(normalized)
    if (isOwnServiceAvatar) {
      throw new Error(
        '기존 Feel&Note 서비스 아바타는 독립적인 신원 근거가 아니다. '
        + '공식·기관·본인 페이지를 별도로 제시하라.'
      )
    }
  }
}

// ─── .env 로더 ──────────────────────────────────────────────
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

// ─── 위키미디어 메타 조회 ────────────────────────────────────
interface CommonsMeta {
  url: string
  licenseShortName: string
  artist: string
  descriptionUrl: string
}

async function fetchCommonsMeta(commonsFile: string): Promise<CommonsMeta> {
  const titleParam = encodeURIComponent(`File:${commonsFile}`)
  const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${titleParam}&prop=imageinfo&iiprop=url%7Cextmetadata&format=json`
  const res = await fetch(api, {
    headers: { 'User-Agent': 'feelandnote-celeb-pilot/1.0 (admin)' },
  })
  if (!res.ok) {
    throw new Error(`Commons API HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ url: string; descriptionurl: string; extmetadata: Record<string, { value: string }> }> }> }
  }
  const pages = json.query?.pages
  if (!pages) throw new Error('Commons API: pages 없음')
  const page = Object.values(pages)[0]
  const info = page?.imageinfo?.[0]
  if (!info) throw new Error('Commons API: imageinfo 없음')
  const ext = info.extmetadata
  const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, '').trim()
  return {
    url: info.url,
    descriptionUrl: info.descriptionurl,
    licenseShortName: ext.LicenseShortName?.value ?? 'unknown',
    artist: stripHtml(ext.Artist?.value ?? 'unknown'),
  }
}

// ─── 이미지 다운로드 ─────────────────────────────────────────
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'feelandnote-celeb-pilot/1.0 (admin)' },
  })
  if (!res.ok) throw new Error(`이미지 다운로드 실패 HTTP ${res.status}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

// ─── face-api 모델 로드 (SSD MobileNet) ────────────────────────
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

// ─── tfjs wasm 백엔드 초기화 ──────────────────────────────────
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

// ─── 얼굴 박스 검출 (가장 큰 얼굴) ─────────────────────────────
interface DetectedFace {
  x: number
  y: number
  width: number
  height: number
  score: number
}

async function detectLargestFace(
  imgBuf: Buffer
): Promise<DetectedFace | null> {
  // sharp로 raw RGB 추출 → tf.tensor3d로 face-api 입력.
  // 대용량 이미지는 디텍션 전 다운스케일(긴 변 1024px 상한)로 메모리·시간 절약. 좌표는 원본 비율로 환원.
  const meta = await sharp(imgBuf).rotate().metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  const longSide = Math.max(origW, origH)
  const scale = longSide > 1024 ? 1024 / longSide : 1
  const targetW = Math.round(origW * scale)
  const targetH = Math.round(origH * scale)
  const { data, info } = await sharp(imgBuf)
    .rotate()
    .resize(targetW, targetH, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3],
    'int32'
  ) as unknown as Parameters<typeof faceapi.detectAllFaces>[0]
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

// ─── 얼굴 박스 기준 정사각형 영역 계산 ──────────────────────────
function computeSquareCrop(
  face: DetectedFace,
  imgWidth: number,
  imgHeight: number,
  faceFrameRatio: number
): { left: number; top: number; size: number } {
  // 얼굴 중심 (코 부근). 박스가 통상 눈썹~턱이라 박스 정중앙은 코.
  const cx = face.x + face.width / 2
  const cy = face.y + face.height / 2
  // 정사각형 크기는 얼굴 박스 큰 변을 faceFrameRatio로 나눈 값 (얼굴이 결과에서 차지할 비율).
  const baseSize = Math.max(face.width, face.height)
  const target = baseSize / faceFrameRatio
  const maxSize = Math.min(imgWidth, imgHeight)
  const size = Math.min(target, maxSize)
  const half = size / 2
  // 얼굴 중심을 정사각형 정중앙에 놓되, 이미지 경계는 넘지 않도록 클램프.
  const left = Math.max(0, Math.min(imgWidth - size, cx - half))
  const top = Math.max(0, Math.min(imgHeight - size, cy - half))
  return { left: Math.round(left), top: Math.round(top), size: Math.round(size) }
}

// ─── webp 변환 (face detection + fallback) ───────────────────
interface ConvertResult {
  buf: Buffer
  faceDetected: boolean
  faceScore: number | null
  faceBox: { x: number; y: number; width: number; height: number } | null
  cropBox: { left: number; top: number; size: number } | null
  fallbackGravity: CropGravity | null
}

async function toAvatarWebp(
  input: Buffer,
  meta: CommonsMeta,
  commonsFile: string,
  args: Args
): Promise<ConvertResult> {
  const description = `Source: ${meta.descriptionUrl} | License: ${meta.licenseShortName} | Artist: ${meta.artist} | File: ${commonsFile}`
  const exifBlock = {
    exif: {
      IFD0: {
        ImageDescription: description,
        Copyright: `${meta.artist} / ${meta.licenseShortName}`,
        Artist: meta.artist,
      },
    },
  } as const

  // EXIF orientation 사전 적용한 회전본을 만들어 좌표 기준을 통일.
  const rotated = await sharp(input).rotate().toBuffer()
  const metaInfo = await sharp(rotated).metadata()
  const W = metaInfo.width ?? 0
  const H = metaInfo.height ?? 0
  if (W < 200 || H < 200) {
    throw new Error(`이미지 너무 작음: ${W}x${H}`)
  }

  if (args.faceDetect) {
    await ensureTf()
    await ensureFaceModels()
    const face = await detectLargestFace(rotated)
    if (face) {
      const cropBox = computeSquareCrop(face, W, H, args.faceFrameRatio)
      const buf = await sharp(rotated)
        .extract({
          left: cropBox.left,
          top: cropBox.top,
          width: cropBox.size,
          height: cropBox.size,
        })
        .resize(args.outSize, args.outSize, { fit: 'cover' })
        .withMetadata(exifBlock)
        .webp({ quality: args.webpQuality })
        .toBuffer()
      return {
        buf,
        faceDetected: true,
        faceScore: face.score,
        faceBox: {
          x: Math.round(face.x),
          y: Math.round(face.y),
          width: Math.round(face.width),
          height: Math.round(face.height),
        },
        cropBox,
        fallbackGravity: null,
      }
    }
    // 얼굴 미감지 + --require-face: 대체 크롭으로 올리지 않고 중단한다(호출자가 사유를 그대로 보여준다)
    if (args.requireFace) {
      throw new Error(
        '얼굴을 찾지 못했다 (SSD MobileNet, minConfidence 0.4). '
        + '--require-face 가 켜져 있어 대체 크롭으로 올리지 않고 중단한다. '
        + '전신·측면·군집 사진이면 얼굴이 큰 다른 사진을 쓰거나 --require-face false 로 다시 실행하라.'
      )
    }
    // 얼굴 미감지: fallback (entropy 가 attention 보다 인물 사진에서 안전)
    const fallback: CropGravity = args.cropGravity === 'attention' ? 'entropy' : args.cropGravity
    const buf = await sharp(rotated)
      .resize(args.outSize, args.outSize, { fit: 'cover', position: fallback })
      .withMetadata(exifBlock)
      .webp({ quality: args.webpQuality })
      .toBuffer()
    return {
      buf,
      faceDetected: false,
      faceScore: null,
      faceBox: null,
      cropBox: null,
      fallbackGravity: fallback,
    }
  }

  // face detection 비활성: cropGravity 그대로
  const buf = await sharp(rotated)
    .resize(args.outSize, args.outSize, { fit: 'cover', position: args.cropGravity })
    .withMetadata(exifBlock)
    .webp({ quality: args.webpQuality })
    .toBuffer()
  return {
    buf,
    faceDetected: false,
    faceScore: null,
    faceBox: null,
    cropBox: null,
    fallbackGravity: args.cropGravity,
  }
}

// ─── 메인 ───────────────────────────────────────────────────
async function main() {
  const args = parseArgs()
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

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, slug, nickname, profile_type, celeb_tier')
    .eq('id', args.celebId)
    .maybeSingle()
  if (profileError) throw new Error(`업로드 대상 프로필 조회 실패: ${profileError.message}`)
  if (!profile) throw new Error(`업로드 대상 프로필 없음: ${args.celebId}`)
  if (profile.profile_type !== 'CELEB') {
    throw new Error(`업로드 대상이 CELEB 프로필이 아니다: profile_type=${profile.profile_type}`)
  }
  if (profile.slug !== args.slug) {
    throw new Error(
      `celeb-id와 slug가 서로 다른 인물을 가리킨다: DB=${profile.slug}, 입력=${args.slug}`
    )
  }

  assertNotProvenanceQuarantined(profile.slug as string)
  if (args.imageFile) {
    assertLocalSourcePathAllowed(resolve(args.imageFile))
  }
  assertIdentityEvidence(
    args.identityEvidence as string,
    profile.celeb_tier as string | null,
    env.R2_PUBLIC_URL
  )

  let meta: CommonsMeta
  let sourceLabel: string
  let original: Buffer
  if (args.commonsFile) {
    console.log(`[1/6] 위키미디어 메타 조회: ${args.commonsFile}`)
    meta = await fetchCommonsMeta(args.commonsFile)
    sourceLabel = args.commonsFile
    console.log(`     원본 URL: ${meta.url}`)
    console.log(`     라이선스: ${meta.licenseShortName} | Artist: ${meta.artist}`)
    console.log(`[2/6] 원본 이미지 다운로드`)
    original = await downloadImage(meta.url)
    console.log(`     ${original.length} bytes`)
  } else if (args.imageFile) {
    const filePath = resolve(args.imageFile)
    const note = args.sourceNote ?? 'local file'
    console.log(`[1/6] 로컬 파일 모드: ${filePath}`)
    console.log(`     출처 노트: ${note}`)
    if (!existsSync(filePath)) throw new Error(`로컬 파일 없음: ${filePath}`)
    meta = {
      url: filePath,
      descriptionUrl: `local:${filePath}`,
      licenseShortName: 'local-asset',
      artist: note,
    }
    sourceLabel = filePath
    console.log(`[2/6] 로컬 이미지 읽기`)
    original = readFileSync(filePath)
    console.log(`     ${original.length} bytes`)
  } else {
    const url = args.imageUrl as string
    const note = args.sourceNote ?? 'web search'
    console.log(`[1/6] 임의 URL 모드: ${url}`)
    console.log(`     출처 노트: ${note}`)
    meta = {
      url,
      descriptionUrl: url,
      licenseShortName: 'unverified',
      artist: note,
    }
    sourceLabel = url
    console.log(`[2/6] 원본 이미지 다운로드`)
    original = await downloadImage(meta.url)
    console.log(`     ${original.length} bytes`)
  }

  console.log(
    `[3/6] webp 변환 (${args.outSize}x${args.outSize}, q=${args.webpQuality}, face-detect=${args.faceDetect}, require-face=${args.requireFace}, faceFrameRatio=${args.faceFrameRatio}, fallback gravity=${args.cropGravity})`
  )
  const conv = await toAvatarWebp(original, meta, sourceLabel, args)
  if (conv.faceDetected) {
    console.log(
      `     face OK score=${conv.faceScore?.toFixed(3)} box=${JSON.stringify(conv.faceBox)} crop=${JSON.stringify(conv.cropBox)}`
    )
  } else {
    console.log(
      `     face NOT_DETECTED → fallback gravity=${conv.fallbackGravity ?? 'n/a'}`
    )
  }
  console.log(`     ${conv.buf.length} bytes`)
  if (args.previewPath) {
    mkdirSync(dirname(args.previewPath), { recursive: true })
    writeFileSync(args.previewPath, conv.buf)
    console.log(`     preview saved: ${args.previewPath}`)
  }

  console.log(`[4/6] R2 업로드`)
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
  const key = `celebs/${args.celebId}/avatar.webp`
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: conv.buf,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`
  console.log(`     PUT ok: ${publicUrl}`)

  console.log(`[5/6] Supabase profiles.avatar_url 갱신`)
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', args.celebId)
  if (error) throw new Error(`Supabase update 실패: ${error.message}`)
  console.log(`     updated profile ${args.celebId}`)

  console.log(`[6/6] 작업 로그 누적`)
  const logPath = resolve(__dirname, 'celeb-image-credits.log')
  const ts = new Date().toISOString()
  const faceTag = conv.faceDetected
    ? `face=score=${conv.faceScore?.toFixed(3)}_box=${conv.faceBox?.x},${conv.faceBox?.y},${conv.faceBox?.width}x${conv.faceBox?.height}`
    : `face=NOT_DETECTED_fallback=${conv.fallbackGravity ?? 'none'}`
  const identityEvidence = args.identityEvidence?.trim() || meta.descriptionUrl
  const line = `${ts} | ${args.slug} | ${meta.descriptionUrl} | ${meta.licenseShortName} | ${meta.artist} | identity=${identityEvidence} | ${faceTag}\n`
  appendFileSync(logPath, line, 'utf-8')
  console.log(`     ${logPath}`)
  console.log(`     ${line.trim()}`)

  console.log(`\n[완료] avatar_url = ${publicUrl}`)
}

main().catch((err) => {
  console.error('실패:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
