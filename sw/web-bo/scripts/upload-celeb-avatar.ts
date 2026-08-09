/**
 * 셀럽 아바타 자동 등록 — 위키미디어 Commons 이미지 다운로드 → 얼굴 랜드마크 크롭 → R2 업로드 → Supabase celebs.avatar_url 갱신
 *
 * 자르는 규격의 단일원천(SSoT)은 docs/project/celeb-avatar-spec.md §1·§6이고,
 * 좌표 계산은 src/lib/avatar-geometry.ts 한 곳이 담당한다. 이 스크립트는 좌표를 직접 계산하지 않는다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/upload-celeb-avatar.ts \
 *     --celeb-id <uuid> \
 *     --commons-file "Fei-Fei Li at AI for Good 2017.jpg" \
 *     --slug fei-fei-li \
 *     --identity-evidence "https://공식·기관·본인 페이지"
 *     --source-note "신원 보존·재구성 방식 설명"
 *     [--face-detect true|false]              (기본 true)
 *     [--allow-no-face true]                  (기본 꺼짐. 얼굴 미검출은 실패가 기본이다)
 *     [--crop-gravity attention|entropy|...]  (--face-detect false 일 때만 쓰인다)
 *     [--size 800]                            (저장 정사각 한 변, 기본 800. 고해상도 원본이면 올린다)
 *     [--quality 95]                          (최종 WebP 품질, 기본 95)
 *     [--preview-path C:\...\avatar.webp]
 *   폐기된 인자: --face-frame-ratio (규격이 코드로 고정됐다. 넘기면 경고 후 무시)
 *
 * 절차:
 *  1) 위키미디어 imageinfo API로 원본 URL + 라이선스 메타 조회
 *  2) 원본 이미지 다운로드
 *  3) 얼굴 검출(SSD MobileNet) + 68점 랜드마크(vladmandic face-api + tfjs-wasm).
 *     가장 큰 얼굴의 눈·턱끝 좌표를 원본 좌표계로 환원한다
 *  4) avatar-geometry가 눈·턱 거리로 정사각 좌표를 산출(랜드마크를 못 얻으면 상자 기준 폴백 + 경고)
 *     → sharp.extract 좌표 크롭 → --size 정사각 resize → webp(기본 q=95), EXIF에 출처/라이선스 박음
 *  5) 얼굴 미검출이면 업로드 전에 실패한다. --allow-no-face true 를 명시한 경우에만 중앙 크롭으로
 *     진행하되 얼굴 위치를 보장하지 않는다는 경고를 콘솔과 로그에 남긴다
 *  6) R2 PUT: celebs/{celebId}/avatar.webp
 *  7) Supabase celebs.avatar_url 갱신 (캐시 버스터 ?v={timestamp})
 *  8) scripts/celeb-image-credits.log 에 1줄 누적 — 규격 이탈 경고도 함께 적는다
 *
 * 실패 시 즉시 종료. 규격을 벗어난 결과는 조용히 넘기지 않고 경고로 드러낸다.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, appendFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { CELEB_AVATAR_SMALL } from '@feelandnote/shared/constants/celeb-avatar-small'
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  judgeGeometry,
  type CropResult,
  type FaceAnchors,
} from '../src/lib/avatar-geometry'
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
   * 얼굴을 못 찾았을 때 중앙 크롭으로 올리는 것을 허용한다(기본 꺼짐).
   * 켜지 않으면 업로드 전에 실패한다 — 얼굴 위치가 무작위인 결과를 성공으로 오해하지 않게 한다.
   */
  allowNoFace: boolean
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
  const requireFaceRaw = get('--require-face')?.toLowerCase()
  const allowNoFaceRaw = get('--allow-no-face')?.toLowerCase()
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
  const isTruthy = (v: string | undefined): boolean =>
    v === 'true' || v === '1' || v === 'yes'
  const faceDetect = isTruthy(faceDetectRaw)
  const allowNoFace = isTruthy(allowNoFaceRaw)
  // --require-face 는 이제 기본 동작이다. 남은 호출 스크립트가 깨지지 않게 받아만 주고 안내한다.
  if (requireFaceRaw !== undefined) {
    if (isTruthy(requireFaceRaw)) {
      if (!faceDetect) {
        console.error('--require-face 는 --face-detect true 와 함께만 쓸 수 있다')
        process.exit(1)
      }
    } else {
      console.warn(
        '[경고] --require-face false 는 더 이상 대체 크롭을 허용하지 않는다. '
        + '얼굴을 못 찾으면 실패가 기본이며, 대체 크롭이 필요하면 --allow-no-face true 를 쓴다.'
      )
    }
  }
  if (allowNoFace && !faceDetect) {
    console.error('--allow-no-face 는 --face-detect true 와 함께만 쓸 수 있다')
    process.exit(1)
  }
  if (faceFrameRatioRaw !== undefined) {
    console.warn(
      '[경고] --face-frame-ratio 는 이제 쓰지 않는다. '
      + '규격은 docs/project/celeb-avatar-spec.md 가 정하며 src/lib/avatar-geometry.ts 가 그대로 따른다. 무시한다.'
    )
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
    allowNoFace,
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

// ─── face-api 모델 로드 (SSD MobileNet + 68점 랜드마크) ────────
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
  // 눈·턱 좌표를 직접 재려면 랜드마크 모델이 필요하다. 규격 기하의 기준점이다.
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
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

// ─── 얼굴 검출 + 랜드마크 (가장 큰 얼굴) ───────────────────────
interface DetectedFace {
  x: number
  y: number
  width: number
  height: number
  score: number
  /** 눈·턱끝 좌표(원본 픽셀 기준). 랜드마크를 못 얻으면 null이고 상자 폴백으로 넘어간다 */
  anchors: FaceAnchors | null
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
    const inv = 1 / scale

    // 눈·턱을 직접 재는 기본 경로. 랜드마크 단계가 터지면 상자만으로 후퇴한다.
    const withLandmarks = await faceapi
      .detectAllFaces(tensor, options)
      .withFaceLandmarks()
      .run()
      .catch((e: unknown) => {
        console.warn(
          `     [경고] 랜드마크 검출 실패 → 상자 기준으로 후퇴: ${e instanceof Error ? e.message : String(e)}`
        )
        return null
      })

    if (withLandmarks) {
      if (withLandmarks.length === 0) return null
      const sorted = [...withLandmarks].sort(
        (a, b) => b.detection.box.area - a.detection.box.area
      )
      const best = sorted[0]
      const box = best.detection.box
      const lm = best.landmarks
      const eyePoints = [...lm.getLeftEye(), ...lm.getRightEye()]
      const eyeX = eyePoints.reduce((s, p) => s + p.x, 0) / eyePoints.length
      const eyeY = eyePoints.reduce((s, p) => s + p.y, 0) / eyePoints.length
      // 턱끝 = 턱 윤곽선의 가운데 점(68점 규약의 8번)
      const jaw = lm.getJawOutline()
      const chin = jaw[Math.floor(jaw.length / 2)]
      return {
        x: box.x * inv,
        y: box.y * inv,
        width: box.width * inv,
        height: box.height * inv,
        score: best.detection.score,
        anchors: { eyeX: eyeX * inv, eyeY: eyeY * inv, chinY: chin.y * inv },
      }
    }

    const detections = await faceapi.detectAllFaces(tensor, options)
    if (detections.length === 0) return null
    detections.sort((a, b) => b.box.area - a.box.area)
    const best = detections[0]
    return {
      x: best.box.x * inv,
      y: best.box.y * inv,
      width: best.box.width * inv,
      height: best.box.height * inv,
      score: best.score,
      anchors: null,
    }
  } finally {
    ;(tensor as unknown as { dispose?: () => void }).dispose?.()
  }
}

// ─── 규격 좌표 산출 (계산은 avatar-geometry가 한다) ─────────────
function resolveCrop(face: DetectedFace, imgW: number, imgH: number): CropResult {
  const box = { x: face.x, y: face.y, width: face.width, height: face.height }
  if (!face.anchors) return computeCropFromBox(box, imgW, imgH)
  try {
    const crop = computeCropFromLandmarks(face.anchors, imgW, imgH)
    // 원본이 모자라 좌표가 밀렸으면 규격을 벗어난다. 판정 결과를 경고에 합친다.
    const verdict = judgeGeometry(face.anchors, crop)
    if (!verdict.pass) crop.warnings.push(`규격 이탈: ${verdict.faults.join(' / ')}`)
    return crop
  } catch (e) {
    console.warn(
      `     [경고] 랜드마크 좌표가 이상해 상자 기준으로 후퇴: ${e instanceof Error ? e.message : String(e)}`
    )
    return computeCropFromBox(box, imgW, imgH)
  }
}

/** 반올림 뒤에도 잘라낼 영역이 원본 안에 있도록 마지막으로 조인다. */
function toExtractArea(
  crop: CropResult,
  imgW: number,
  imgH: number
): { left: number; top: number; size: number } {
  const size = Math.min(crop.size, imgW, imgH)
  return {
    left: Math.max(0, Math.min(imgW - size, crop.left)),
    top: Math.max(0, Math.min(imgH - size, crop.top)),
    size,
  }
}

// ─── webp 변환 (규격 크롭 / 얼굴 미검출 시 실패) ───────────────
interface ConvertResult {
  buf: Buffer
  faceDetected: boolean
  faceScore: number | null
  faceBox: { x: number; y: number; width: number; height: number } | null
  cropBox: { left: number; top: number; size: number } | null
  /** 눈·턱으로 쟀는지, 상자로 후퇴했는지 */
  cropBasis: CropResult['basis'] | null
  /** 규격을 벗어난 지점. 비어 있지 않으면 콘솔·크레딧 로그에 그대로 남긴다 */
  warnings: string[]
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
      const crop = resolveCrop(face, W, H)
      const cropBox = toExtractArea(crop, W, H)
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
        cropBasis: crop.basis,
        warnings: crop.warnings,
        fallbackGravity: null,
      }
    }
    // 얼굴 미검출: 기본은 실패다. 얼굴 위치를 보장 못 하는 그림을 성공으로 올리지 않는다.
    if (!args.allowNoFace) {
      throw new Error(
        '얼굴을 찾지 못했다 (SSD MobileNet, minConfidence 0.4). '
        + '얼굴 위치를 보장할 수 없어 업로드하지 않고 중단한다. '
        + '전신·측면·군집 사진이면 얼굴이 큰 다른 사진을 쓰고, '
        + '그래도 이 그림을 올려야 한다면 --allow-no-face true 로 다시 실행하라(중앙 크롭, 규격 보장 없음).'
      )
    }
    // 명시적 허용: 중앙 크롭. entropy는 얼굴 위치가 사실상 무작위라 쓰지 않는다.
    const warning =
      '얼굴을 찾지 못해 중앙 크롭으로 올렸다 — 규격 기하를 보장하지 않는다. 사람이 직접 확인하라'
    console.warn('')
    console.warn('  ***********************************************************')
    console.warn(`  * [경고] ${warning}`)
    console.warn('  ***********************************************************')
    console.warn('')
    const buf = await sharp(rotated)
      .resize(args.outSize, args.outSize, { fit: 'cover', position: 'center' })
      .withMetadata(exifBlock)
      .webp({ quality: args.webpQuality })
      .toBuffer()
    return {
      buf,
      faceDetected: false,
      faceScore: null,
      faceBox: null,
      cropBox: null,
      cropBasis: null,
      warnings: [warning],
      fallbackGravity: 'center',
    }
  }

  // face detection 비활성: cropGravity 그대로. 규격 기하는 호출자가 책임진다.
  const manualWarning =
    `얼굴 검출을 끄고(--face-detect false) ${args.cropGravity} 기준으로 잘랐다 — 규격 기하를 보장하지 않는다`
  console.warn(`     [경고] ${manualWarning}`)
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
    cropBasis: null,
    warnings: [manualWarning],
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
    .from('celebs')
    .select('id, slug, nickname, celeb_tier')
    .eq('id', args.celebId)
    .maybeSingle()
  if (profileError) throw new Error(`업로드 대상 프로필 조회 실패: ${profileError.message}`)
  if (!profile) throw new Error(`업로드 대상 프로필 없음: ${args.celebId}`)
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
    `[3/6] webp 변환 (${args.outSize}x${args.outSize}, q=${args.webpQuality}, face-detect=${args.faceDetect}, allow-no-face=${args.allowNoFace}, 규격=celeb-avatar-spec.md §1)`
  )
  const conv = await toAvatarWebp(original, meta, sourceLabel, args)
  if (conv.faceDetected) {
    console.log(
      `     face OK score=${conv.faceScore?.toFixed(3)} 기준=${conv.cropBasis === 'landmarks' ? '눈·턱' : '상자(폴백)'} box=${JSON.stringify(conv.faceBox)} crop=${JSON.stringify(conv.cropBox)}`
    )
  } else {
    console.log(
      `     face NOT_DETECTED → fallback gravity=${conv.fallbackGravity ?? 'n/a'}`
    )
  }
  // 규격 이탈은 조용히 넘기지 않는다.
  for (const w of conv.warnings) {
    console.warn(`     [규격 경고] ${w}`)
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

  // 얼굴이 작게 나오는 화면(성향 분포 등)이 쓸 작은 판. 규격은 shared가 쥔다.
  const smallBuf = await sharp(conv.buf)
    .resize(CELEB_AVATAR_SMALL.sizePx, CELEB_AVATAR_SMALL.sizePx, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer()
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: `celebs/${args.celebId}/${CELEB_AVATAR_SMALL.smallFile}`,
      Body: smallBuf,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  console.log(`     PUT ok: ${CELEB_AVATAR_SMALL.smallFile} (${smallBuf.length} bytes)`)

  console.log(`[5/6] Supabase celebs.avatar_url 갱신`)
  const { error } = await supabase
    .from('celebs')
    .update({ avatar_url: publicUrl })
    .eq('id', args.celebId)
  if (error) throw new Error(`Supabase update 실패: ${error.message}`)
  console.log(`     updated profile ${args.celebId}`)

  console.log(`[6/6] 작업 로그 누적`)
  const logPath = resolve(__dirname, 'celeb-image-credits.log')
  const ts = new Date().toISOString()
  const faceTag = conv.faceDetected
    ? `face=score=${conv.faceScore?.toFixed(3)}_basis=${conv.cropBasis}_box=${conv.faceBox?.x},${conv.faceBox?.y},${conv.faceBox?.width}x${conv.faceBox?.height}`
    : `face=NOT_DETECTED_fallback=${conv.fallbackGravity ?? 'none'}`
  const warnTag = conv.warnings.length > 0 ? ` | warn=${conv.warnings.join(' ; ')}` : ''
  const identityEvidence = args.identityEvidence?.trim() || meta.descriptionUrl
  const line = `${ts} | ${args.slug} | ${meta.descriptionUrl} | ${meta.licenseShortName} | ${meta.artist} | identity=${identityEvidence} | ${faceTag}${warnTag}\n`
  appendFileSync(logPath, line, 'utf-8')
  console.log(`     ${logPath}`)
  console.log(`     ${line.trim()}`)

  console.log(`\n[완료] avatar_url = ${publicUrl}`)
  if (conv.warnings.length > 0) {
    console.warn(`[확인 필요] 규격 경고 ${conv.warnings.length}건이 함께 기록됐다. 결과를 눈으로 확인하라.`)
  }
}

main().catch((err) => {
  console.error('실패:', err instanceof Error ? (err.stack ?? err.message) : err)
  process.exit(1)
})
