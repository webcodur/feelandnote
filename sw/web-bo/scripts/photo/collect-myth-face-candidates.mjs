/**
 * 서비스 신화 인물별 Pinterest 무명 모델 얼굴 후보를 조사하고 로컬에 내려받는다.
 *
 * 후보는 사용자 승인 전까지 정식 REF가 아니며 DB/R2/팩션 자산에 쓰지 않는다.
 * 재실행 시 sources.json이 있는 인물은 건너뛴다.
 *
 * 실행:
 *   node scripts/photo/collect-myth-face-candidates.mjs --limit 3
 *   node scripts/photo/collect-myth-face-candidates.mjs --offset 3 --limit 30 --concurrency 3
 *   node scripts/photo/collect-myth-face-candidates.mjs --only achilles,aphrodite
 */
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const MANIFEST_PATH = path.join(OUTPUT_ROOT, 'manifest.json')
const DEFAULT_LIMIT = Number.POSITIVE_INFINITY
const DEFAULT_CONCURRENCY = 3
const CANDIDATES_PER_PERSON = 4
const MIN_IMAGE_SIDE = 600
const RAW_CANDIDATES_PER_PERSON = 16
const PINTEREST_API_HOST = 'https://id.pinterest.com'
const require = createRequire(import.meta.url)
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function parsePositiveInt(value, fallback) {
  if (value == null) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`잘못된 숫자 인자: ${value}`)
  return parsed
}

function parseJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSON 객체를 찾지 못했습니다.')
  return JSON.parse(trimmed.slice(start, end + 1))
}

function promptFor(person) {
  return `You are collecting FACE MATERIAL CANDIDATES for a fictional mythology casting review.
Use live web search. Research only; do not generate an image, edit a file, or choose a final face.

Character context (used only to diversify casting age/cultural fit):
- slug: ${person.slug}
- name: ${person.nickname} / ${person.nickname_en ?? ''}
- gender: ${person.gender_label}
- cultural tradition or nationality hint: ${person.primary_tradition} / ${person.nationality ?? ''}
- role: ${person.title ?? ''} / ${person.short_desc ?? ''}

Find up to ${CANDIDATES_PER_PERSON} DIFFERENT Pinterest pins containing a close, clear, mostly front-facing color photograph of a non-famous working model or ordinary person suitable for a premium beauty/editorial casting board.

Hard rules:
1. Pinterest pins are preferred and every candidate must have a real, opened pin URL. Never invent a URL.
2. Exclude actors, singers, influencers, celebrities, public figures, and genuinely famous fashion models. A named but non-famous working model is allowed. Do not infer fame merely from professional photography.
3. Do not search the mythology character's name. That produces fan art and existing character designs. Search by gender, broad age, cultural fit, and editorial portrait quality instead.
4. Real photograph only: no AI art, illustration, painting, sculpture, cosplay, fantasy makeup, prosthetics, distorted skin, wounds, scars added for effect, masks, sunglasses, or hands covering the face. Watermarks and text are allowed when they do not cover or deform the face because the material will be regenerated or composited.
5. Favor exceptional natural beauty, distinctive but harmonious bone structure, intact natural skin, both eyes visible, direct or near-direct gaze, and enough resolution for a face reference. Prefer a face that already feels sovereign, luminous, serene, formidable, uncanny-beautiful, or otherwise divine without looking creepy. Improve beauty rather than reproducing grotesque source traits. Even if the character is a monster or nonhuman being, collect a beautiful normal human casting face; do not imitate deformity.
6. Diversity matters. Do not return three near-identical faces. Do not reuse a pin already listed in the results.
7. This is only a candidate pool. Do not assign or recommend a winner.
8. If fewer than three candidates truly pass, return fewer. An empty array is better than a famous person, uncertain identity, fan art, or fabricated URL.

Return ONLY one JSON object, no markdown:
{
  "slug": "${person.slug}",
  "search_notes": "short factual note",
  "candidates": [
    {
      "pin_url": "https://www.pinterest.com/pin/.../",
      "direct_image_url": "https://i.pinimg.com/... or null",
      "pin_title": "title seen on the pin",
      "identity_check": "why no public identity was found",
      "quality_note": "frontality, face visibility, color, editorial quality",
      "identity_risk": "low"
    }
  ]
}`
}

async function loadFaceModels() {
  const boRoot = path.resolve(import.meta.dirname, '../..')
  await setWasmPaths(path.join(boRoot, 'node_modules/@tensorflow/tfjs-backend-wasm/dist') + '/')
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  const modelDir = path.join(boRoot, 'node_modules/@vladmandic/face-api/model')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir)
}

function simpleHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function cultureHint(person) {
  const byNation = {
    GR: 'Mediterranean', IT: 'Mediterranean', GB: 'British Celtic', NO: 'Nordic Scandinavian',
    IN: 'South Asian Indian', CN: 'East Asian Chinese', JP: 'East Asian Japanese', KR: 'East Asian Korean',
    EG: 'North African Egyptian', IQ: 'Middle Eastern', IR: 'Middle Eastern Persian',
  }
  return byNation[person.nationality] ?? 'globally distinctive'
}

function ageHint(person) {
  const text = `${person.title ?? ''} ${person.short_desc ?? ''} ${person.bio ?? ''}`
  if (/소년|소녀|젊|왕자|공주|아들|딸|young|son|daughter|maiden|prince|princess/i.test(text)) return 'young adult'
  if (/노인|늙|아버지|어머니|할아버지|할머니|elder|old|father|mother|grand/i.test(text)) return 'mature adult'
  return ['young adult', 'adult', 'mature adult'][simpleHash(person.slug) % 3]
}

function pinterestQueries(person, queryPass = 1) {
  const gender = person.gender === false ? 'woman' : 'man'
  const culture = cultureHint(person)
  const age = ageHint(person)
  const hash = simpleHash(person.slug)
  const presences = ['regal', 'ethereal', 'sovereign', 'radiant', 'enigmatic', 'formidable', 'serene', 'magnetic', 'noble', 'visionary']
  const features = ['striking eyes', 'sculpted cheekbones', 'strong brow', 'refined bone structure', 'distinctive face', 'balanced features', 'intense gaze', 'luminous complexion', 'aristocratic bearing', 'cinematic face']
  const treatments = ['luxury beauty editorial', 'couture casting portrait', 'fine art studio portrait', 'high jewelry campaign face', 'cinematic close-up photography', 'museum quality portrait photography']
  const realPhotoSources = ['Unsplash portrait photography', 'Pexels portrait photography', 'Stocksy portrait photography', 'model agency casting headshot', 'editorial photographer portrait', 'beauty campaign photography']
  if (queryPass >= 2) {
    const secondPassSources = ['Getty Images portrait', 'Adobe Stock portrait', 'Alamy portrait', 'Shutterstock portrait', 'model agency digitals', 'fashion backstage beauty test']
    const secondPassStyles = ['authentic real person headshot', 'professional casting portrait', 'natural skin close-up photography', 'direct gaze editorial photograph', 'premium face test photograph', 'studio portrait both eyes visible']
    return secondPassSources.map((source, index) => {
      const presence = presences[(hash + index * 7 + queryPass) % presences.length]
      const feature = features[((hash >>> 5) + index * 3 + queryPass) % features.length]
      const style = secondPassStyles[(hash + index * 5) % secondPassStyles.length]
      return `${source} ${culture} ${age} ${gender} ${presence} ${feature} ${style} no cosplay real photography`
    })
  }
  const variants = [
    'front headshot direct gaze natural skin unknown model real photograph',
    'close face portrait both eyes clear natural skin unknown person photography',
    'three quarter beauty portrait near direct gaze natural skin real photo',
    'premium casting headshot harmonious face natural pores real photograph',
  ]
  return realPhotoSources.map((source, index) => {
    const presence = presences[(hash + index * 3) % presences.length]
    const feature = features[((hash >>> 7) + index * 7) % features.length]
    const treatment = treatments[((hash >>> 13) + index * 5) % treatments.length]
    const variant = variants[(hash + index) % variants.length]
    return `${source} ${culture} ${age} ${gender} ${presence} ${feature} ${treatment} ${variant}`
  })
}

async function createPinterestSession() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36'
  const response = await fetch(`${PINTEREST_API_HOST}/`, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Pinterest bootstrap HTTP ${response.status}`)
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)
  const cookie = cookies.map((value) => value.split(';')[0]).join('; ')
  const csrf = cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1]
  if (!csrf) throw new Error('Pinterest csrftoken을 받지 못했습니다.')
  return { userAgent, cookie, csrf }
}

async function searchPinterest(query, session, bookmark = null) {
  const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`
  const form = new URLSearchParams({
    source_url: sourceUrl,
    data: JSON.stringify({
      options: { query, scope: 'pins', bookmarks: bookmark ? [bookmark] : [] },
      context: {},
    }),
  })
  const response = await fetch(`${PINTEREST_API_HOST}/resource/BaseSearchResource/get/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/javascript, */*, q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': session.userAgent,
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': session.csrf,
      'X-Pinterest-Source-Url': sourceUrl,
      Cookie: session.cookie,
    },
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Pinterest search HTTP ${response.status}`)
  const json = await response.json()
  const resource = json?.resource_response
  return {
    rows: Array.isArray(resource?.data?.results) ? resource.data.results : [],
    bookmark: resource?.bookmark ?? null,
  }
}

function pinText(pin) {
  return [
    pin.title,
    pin.grid_title,
    pin.description,
    pin.auto_alt_text,
    pin.seo_alt_text,
    ...(pin.pin_join?.visual_annotation ?? []),
    pin.link,
    pin.domain,
  ].filter(Boolean).join(' ')
}

function metadataRejectReason(pin) {
  const text = pinText(pin)
  const unsafe = /\b(ai|a\.i\.|midjourney|stable diffusion|prompt|generated|digital art|render|illustration|drawing|painting|anime|manga|cosplay|prosthetic|gore|wound|scar makeup|vampire makeup|fantasy makeup|celebrity|actor|actress|singer|influencer)\b/i
  if (unsafe.test(text)) return 'metadata_ai_art_public_or_effect'
  if (/imdb\.com/i.test(pin.link ?? '')) {
    return 'linked_known_entertainment_identity'
  }
  const image = pin.images?.orig ?? pin.images?.['736x']
  if (!pin.id || !image?.url) return 'missing_pin_or_image'
  if (Math.min(image.width ?? 0, image.height ?? 0) < MIN_IMAGE_SIDE) return 'metadata_resolution_low'
  return null
}

async function analyseFace(buffer) {
  const { data, info } = await sharp(buffer).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32')
  try {
    const detections = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45, maxResults: 5 }))
      .withFaceLandmarks()
    if (!detections.length) return { accepted: false, reason: 'face_not_detected' }
    detections.sort((left, right) => right.detection.box.area - left.detection.box.area)
    const main = detections[0]
    if (detections[1]?.detection.box.area > main.detection.box.area * 0.3) {
      return { accepted: false, reason: 'multiple_prominent_faces' }
    }
    const box = main.detection.box
    if (box.width < 240 || box.area / (info.width * info.height) < 0.075) {
      return { accepted: false, reason: 'face_too_small' }
    }
    const leftEye = main.landmarks.getLeftEye()
    const rightEye = main.landmarks.getRightEye()
    const eyeCenter = (points) => ({
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    })
    const left = eyeCenter(leftEye)
    const right = eyeCenter(rightEye)
    const eyeDistance = Math.hypot(right.x - left.x, right.y - left.y)
    const eyeMidX = (left.x + right.x) / 2
    const nose = main.landmarks.getNose()[3]
    const yaw = Math.abs(nose.x - eyeMidX) / Math.max(1, eyeDistance)
    const roll = Math.abs(right.y - left.y) / Math.max(1, eyeDistance)
    if (yaw > 0.24) return { accepted: false, reason: `face_angle_yaw_${yaw.toFixed(2)}` }
    if (roll > 0.16) return { accepted: false, reason: `face_angle_roll_${roll.toFixed(2)}` }
    const stats = await sharp(buffer).stats()
    const means = stats.channels.slice(0, 3).map((channel) => channel.mean)
    const saturation = Math.max(...means) - Math.min(...means)
    const brightness = means.reduce((sum, value) => sum + value, 0) / means.length
    if (saturation < 3) return { accepted: false, reason: 'monochrome' }
    if (brightness < 28 || brightness > 235) return { accepted: false, reason: 'exposure_extreme' }
    return {
      accepted: true,
      face_score: Number(main.detection.score.toFixed(3)),
      face_width: Math.round(box.width),
      face_area_ratio: Number((box.area / (info.width * info.height)).toFixed(3)),
      yaw: Number(yaw.toFixed(3)),
      roll: Number(roll.toFixed(3)),
      saturation: Number(saturation.toFixed(1)),
      brightness: Number(brightness.toFixed(1)),
    }
  } finally {
    tensor.dispose()
  }
}

function normalizePinUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const parsed = new URL(value)
    if (!/(^|\.)pinterest\.[a-z.]+$/i.test(parsed.hostname)) return null
    if (!parsed.pathname.includes('/pin/')) return null
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

async function imageUrlFromPin(pinUrl) {
  const response = await fetch(pinUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`pin HTTP ${response.status}`)
  const html = await response.text()
  const meta = html.match(/<meta[^>]+(?:name|property)=["']og:image["'][^>]+>/i)?.[0]
  const content = meta?.match(/content=["']([^"']+)["']/i)?.[1]
  if (!content) throw new Error('pin og:image 없음')
  return decodeHtml(content)
}

async function downloadImage(sourceUrl) {
  const urls = []
  if (/^https:\/\/i\.pinimg\.com\//i.test(sourceUrl)) {
    urls.push(sourceUrl.replace(/\/\d+x\//i, '/originals/'))
  }
  urls.push(sourceUrl)
  let lastError
  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.pinterest.com/' },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`image HTTP ${response.status}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      const metadata = await sharp(buffer).metadata()
      const width = metadata.width ?? 0
      const height = metadata.height ?? 0
      if (Math.min(width, height) < MIN_IMAGE_SIDE) {
        throw new Error(`해상도 부족 ${width}x${height}`)
      }
      if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format ?? '')) {
        throw new Error(`지원하지 않는 이미지 포맷 ${metadata.format ?? 'unknown'}`)
      }
      return { buffer, metadata, resolvedUrl: url }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('이미지 다운로드 실패')
}

function extensionFor(format) {
  return format === 'jpeg' ? '.jpg' : `.${format}`
}

async function mapConcurrent(items, concurrency, task) {
  let cursor = 0
  const results = new Array(items.length)
  async function worker() {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

function visualReviewPrompt(person, raw) {
  const listing = raw.map((candidate, index) => ({
    attachment: index + 1,
    filename: candidate.filename,
    pin_url: candidate.pin_url,
    title: candidate.pin_title,
    description: candidate.description,
    alt: candidate.alt,
  }))
  return `Review every attached image one by one as an UNAPPROVED face-material candidate board.
This is a visual quality gate only. Do not select a winner, do not create an image, and do not modify files.

Character context: ${person.nickname} / ${person.nickname_en ?? ''}; ${person.gender_label}; ${person.primary_tradition}; ${person.title ?? ''}; ${person.short_desc ?? ''}.

For EACH attachment, reject it if any condition is present:
- illustration, AI-looking image, painting, sculpture, cosplay, fantasy prosthetics or makeup;
- recognizable actor, singer, influencer, celebrity, public figure, or genuinely famous fashion model. A named but non-famous working model is allowed. Do not mark identity uncertain merely because a person is professionally photographed or resembles a generic leading-man type;
- more than one person, side/profile angle, either eye obscured, sunglasses, mask, hand across face;
- deformed or damaged skin, wounds, deliberate scars, grotesque source-faithful traits;
- waxy/plastic skin, extreme beauty filter, unnatural contact lenses or catchlights, malformed eyes or mouth;
- likely synthetic portrait after close inspection of iris/catchlight consistency, hair-strand continuity, pores, teeth, ears, jewelry, clothing edges, and background geometry. Divine beauty is not a reason to forgive AI evidence;
- face too dark, blurry, tiny, cropped so severely that the facial bone structure is hard to read;
- ordinary snapshot quality that is materially below a premium beauty/editorial casting portrait.

Pass a real color photograph with intact natural skin, harmonious and distinctive beauty, both eyes and facial structure clear, direct or near-direct gaze, and enough quality to serve as face material. Separately score divine presence. Prefer faces that already suggest elevated mythic presence before regeneration: regal, luminous, serene, formidable, sovereign, uncanny-beautiful, or similarly transcendent without looking creepy. Weak divine presence alone is not a rejection reason when the photograph otherwise passes, because strong and moderate faces will be ranked first. A monster or nonhuman character still receives a beautiful normal human casting face; do not reward grotesque resemblance. A watermark, logo, masthead, signature, or other text is allowed when it does not cover or deform the face because the material will be regenerated or composited.

The attachments are in exactly this order:
${JSON.stringify(listing, null, 2)}

Return ONLY JSON, no markdown:
{"reviews":[{"filename":"raw-01.jpg","decision":"pass|reject","reason":"specific visible reason including divine-presence judgment","divine_presence":"strong|moderate|weak","public_identity_risk":"low|uncertain|recognized"}]}
Every filename must appear exactly once. If uncertain, reject.`
}

async function collectRawPinterestCandidates(person, session, existingHashes, queryPass = 1) {
  const stagingDir = path.join(person.candidate_dir, '_staging')
  mkdirSync(stagingDir, { recursive: true })
  const raw = []
  const rejected = []
  const seenPins = new Set()

  for (const query of pinterestQueries(person, queryPass)) {
    if (raw.length >= RAW_CANDIDATES_PER_PERSON) break
    const search = await searchPinterest(query, session)
    for (const pin of search.rows) {
      if (raw.length >= RAW_CANDIDATES_PER_PERSON) break
      if (seenPins.has(pin.id)) continue
      seenPins.add(pin.id)
      const pinUrl = `https://www.pinterest.com/pin/${pin.id}/`
      const metadataReason = metadataRejectReason(pin)
      if (metadataReason) {
        rejected.push({ pin_url: pinUrl, reason: metadataReason })
        continue
      }
      try {
        const image = await downloadImage((pin.images?.orig ?? pin.images?.['736x']).url)
        const hash = createHash('sha256').update(image.buffer).digest('hex')
        if (existingHashes.has(hash)) {
          rejected.push({ pin_url: pinUrl, reason: 'duplicate_image' })
          continue
        }
        const face = await analyseFace(image.buffer)
        if (!face.accepted) {
          rejected.push({ pin_url: pinUrl, reason: face.reason })
          continue
        }
        existingHashes.add(hash)
        const filename = `raw-${String(raw.length + 1).padStart(2, '0')}${extensionFor(image.metadata.format)}`
        const filePath = path.join(stagingDir, filename)
        writeFileSync(filePath, image.buffer)
        raw.push({
          filename,
          file_path: filePath,
          pin_url: pinUrl,
          pin_title: pin.title || pin.grid_title || null,
          description: pin.description || null,
          alt: pin.auto_alt_text || pin.seo_alt_text || null,
          image_url: image.resolvedUrl,
          width: image.metadata.width,
          height: image.metadata.height,
          sha256: hash,
          query,
          face,
        })
      } catch (error) {
        rejected.push({
          pin_url: pinUrl,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
  writeFileSync(path.join(stagingDir, 'raw-sources.json'), `${JSON.stringify({ raw, rejected }, null, 2)}\n`, 'utf8')
  return { raw, rejected }
}

function preserveEmptyRunForRetry(person, sourcesPath) {
  if (!existsSync(sourcesPath)) return false
  const previous = JSON.parse(readFileSync(sourcesPath, 'utf8'))
  if (previous.status !== 'no_qualified_candidates') return false
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const priorRunsDir = path.join(person.candidate_dir, '_prior-runs')
  mkdirSync(priorRunsDir, { recursive: true })
  renameSync(sourcesPath, path.join(priorRunsDir, `sources-${stamp}.json`))
  const stagingDir = path.join(person.candidate_dir, '_staging')
  if (existsSync(stagingDir)) {
    renameSync(stagingDir, path.join(priorRunsDir, `staging-${stamp}`))
  }
  return true
}

async function collectOnePinterest(person, session, existingHashes, stageOnly = false, queryPass = 1) {
  const sourcesPath = path.join(person.candidate_dir, 'sources.json')
  if (existsSync(sourcesPath) && !preserveEmptyRunForRetry(person, sourcesPath)) {
    return { slug: person.slug, status: 'skipped_existing' }
  }
  const startedAt = new Date().toISOString()
  try {
    const { raw, rejected } = await collectRawPinterestCandidates(person, session, existingHashes, queryPass)
    if (!raw.length) {
      const result = {
        slug: person.slug,
        nickname: person.nickname,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status: 'no_qualified_candidates',
        accepted: [],
        rejected,
      }
      writeFileSync(sourcesPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
      return { slug: person.slug, status: result.status, accepted: 0, rejected: rejected.length }
    }

    if (stageOnly) {
      const result = {
        slug: person.slug,
        nickname: person.nickname,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status: 'staged_unreviewed',
        accepted: [],
        rejected,
        staged: raw.map(({ file_path, ...candidate }) => candidate),
      }
      writeFileSync(sourcesPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
      return { slug: person.slug, status: result.status, accepted: 0, staged: raw.length, rejected: rejected.length }
    }

    const reviewText = await codexCall(visualReviewPrompt(person, raw), {
      model: 'gpt-5.6-luna',
      effort: 'low',
      images: raw.map((candidate) => candidate.file_path),
      sandbox: 'read-only',
      timeoutMs: 300_000,
    })
    const reviewJson = parseJson(reviewText)
    const reviews = Array.isArray(reviewJson.reviews) ? reviewJson.reviews : []
    const reviewByFile = new Map(reviews.map((review) => [review.filename, review]))
    const accepted = []
    const presenceRank = { strong: 3, moderate: 2, weak: 1 }
    const rankedRaw = raw
      .map((candidate, index) => ({ candidate, index, review: reviewByFile.get(candidate.filename) }))
      .sort((left, right) => {
        const leftPass = left.review?.decision === 'pass' && left.review?.public_identity_risk === 'low' ? 1 : 0
        const rightPass = right.review?.decision === 'pass' && right.review?.public_identity_risk === 'low' ? 1 : 0
        return rightPass - leftPass
          || (presenceRank[right.review?.divine_presence] ?? 0) - (presenceRank[left.review?.divine_presence] ?? 0)
          || left.index - right.index
      })
    for (const { candidate, review } of rankedRaw) {
      const passes = review?.decision === 'pass'
        && review?.public_identity_risk === 'low'
      if (!passes || accepted.length >= CANDIDATES_PER_PERSON) {
        rejected.push({
          pin_url: candidate.pin_url,
          filename: candidate.filename,
          reason: review?.reason ?? 'visual_review_missing_or_candidate_limit',
          public_identity_risk: review?.public_identity_risk ?? 'uncertain',
        })
        continue
      }
      const slot = accepted.length + 1
      const filename = `candidate-${String(slot).padStart(2, '0')}${path.extname(candidate.filename)}`
      writeFileSync(path.join(person.candidate_dir, filename), readFileSync(candidate.file_path))
      accepted.push({
        filename,
        pin_url: candidate.pin_url,
        pin_title: candidate.pin_title,
        identity_check: 'Pinterest 메타데이터에 주체 이름·공인 링크 없음; 시각 검수에서 공인 인지 위험 낮음',
        identity_risk: 'low',
        quality_note: review.reason,
        divine_presence: review.divine_presence,
        image_url: candidate.image_url,
        width: candidate.width,
        height: candidate.height,
        sha256: candidate.sha256,
        query: candidate.query,
        face_audit: candidate.face,
      })
    }
    const result = {
      slug: person.slug,
      nickname: person.nickname,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: accepted.length > 0 ? 'collected_unapproved' : 'no_qualified_candidates',
      accepted,
      rejected,
      visual_reviews: reviews,
    }
    writeFileSync(sourcesPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    return { slug: person.slug, status: result.status, accepted: accepted.length, rejected: rejected.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { slug: person.slug, status: looksRateLimited(message) ? 'rate_limited' : 'failed', error: message }
  }
}

async function collectOne(person, existingHashes, stageOnly = false) {
  const sourcesPath = path.join(person.candidate_dir, 'sources.json')
  if (existsSync(sourcesPath) && !preserveEmptyRunForRetry(person, sourcesPath)) {
    return { slug: person.slug, status: 'skipped_existing' }
  }

  const startedAt = new Date().toISOString()
  try {
    const responseText = await codexCall(promptFor(person), {
      model: 'gpt-5.6-sol',
      effort: 'medium',
      search: true,
      timeoutMs: 600_000,
    })
    const research = parseJson(responseText)
    const rawCandidates = Array.isArray(research.candidates) ? research.candidates : []
    const accepted = []
    const staged = []
    const rejected = []
    const seenPins = new Set()
    const stagingDir = path.join(person.candidate_dir, '_staging')
    if (stageOnly) mkdirSync(stagingDir, { recursive: true })

    for (const candidate of rawCandidates.slice(0, CANDIDATES_PER_PERSON + 2)) {
      const pinUrl = normalizePinUrl(candidate.pin_url)
      if (!pinUrl || seenPins.has(pinUrl)) {
        rejected.push({ ...candidate, reason: pinUrl ? 'duplicate_pin' : 'invalid_pin_url' })
        continue
      }
      seenPins.add(pinUrl)
      if (candidate.identity_risk !== 'low') {
        rejected.push({ ...candidate, reason: 'identity_risk_not_low' })
        continue
      }
      try {
        const pinImageUrl = await imageUrlFromPin(pinUrl)
        const requestedImageUrl = typeof candidate.direct_image_url === 'string'
          && /^https:\/\/i\.pinimg\.com\//i.test(candidate.direct_image_url)
          ? candidate.direct_image_url
          : pinImageUrl
        const image = await downloadImage(requestedImageUrl)
        const hash = createHash('sha256').update(image.buffer).digest('hex')
        if (existingHashes.has(hash)) {
          rejected.push({ ...candidate, pin_url: pinUrl, reason: 'duplicate_image' })
          continue
        }
        const face = await analyseFace(image.buffer)
        if (!face.accepted) {
          rejected.push({ ...candidate, pin_url: pinUrl, reason: face.reason })
          continue
        }
        existingHashes.add(hash)
        const target = stageOnly ? staged : accepted
        const slot = target.length + 1
        const filename = `${stageOnly ? 'raw' : 'candidate'}-${String(slot).padStart(2, '0')}${extensionFor(image.metadata.format)}`
        const filePath = path.join(stageOnly ? stagingDir : person.candidate_dir, filename)
        writeFileSync(filePath, image.buffer)
        target.push({
          filename,
          file_path: filePath,
          pin_url: pinUrl,
          pin_title: candidate.pin_title ?? null,
          identity_check: candidate.identity_check ?? null,
          identity_risk: candidate.identity_risk,
          quality_note: candidate.quality_note ?? null,
          image_url: image.resolvedUrl,
          width: image.metadata.width,
          height: image.metadata.height,
          sha256: hash,
          query: 'codex_live_web_search',
          face,
        })
        if (target.length >= CANDIDATES_PER_PERSON) break
      } catch (error) {
        rejected.push({
          ...candidate,
          pin_url: pinUrl,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (stageOnly && staged.length) {
      writeFileSync(path.join(stagingDir, 'raw-sources.json'), `${JSON.stringify({ raw: staged, rejected }, null, 2)}\n`, 'utf8')
      const result = {
        slug: person.slug,
        nickname: person.nickname,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status: 'staged_unreviewed',
        search_notes: research.search_notes ?? null,
        accepted: [],
        rejected,
        staged: staged.map(({ file_path, ...candidate }) => candidate),
      }
      writeFileSync(sourcesPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
      return { slug: person.slug, status: result.status, accepted: 0, staged: staged.length, rejected: rejected.length }
    }

    const result = {
      slug: person.slug,
      nickname: person.nickname,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: accepted.length > 0 ? 'collected_unapproved' : 'no_qualified_candidates',
      search_notes: research.search_notes ?? null,
      accepted,
      rejected,
    }
    writeFileSync(sourcesPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    return { slug: person.slug, status: result.status, accepted: accepted.length, rejected: rejected.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { slug: person.slug, status: looksRateLimited(message) ? 'rate_limited' : 'failed', error: message }
  }
}

async function main() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`먼저 myth-face-candidate-manifest.mjs를 실행하십시오: ${MANIFEST_PATH}`)
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const mode = argValue('mode') ?? 'pinterest'
  if (!['pinterest', 'codex-search'].includes(mode)) {
    throw new Error('--mode must be pinterest or codex-search')
  }
  const only = new Set((argValue('only') ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const offset = parsePositiveInt(argValue('offset'), 0)
  const limit = parsePositiveInt(argValue('limit'), DEFAULT_LIMIT)
  const concurrency = parsePositiveInt(argValue('concurrency'), DEFAULT_CONCURRENCY)
  const stageOnly = process.argv.includes('--stage-only')
  const queryPass = parsePositiveInt(argValue('query-pass'), 1)
  const maxConcurrency = stageOnly && mode === 'pinterest' ? 8 : 3
  if (concurrency < 1 || concurrency > maxConcurrency) {
    throw new Error(`--concurrency must be between 1 and ${maxConcurrency} for this mode`)
  }

  const selected = manifest
    .filter((person) => only.size === 0 || only.has(person.slug))
    .slice(offset, Number.isFinite(limit) ? offset + limit : undefined)
  const existingHashes = new Set()
  for (const person of manifest) {
    const sourcesPath = path.join(person.candidate_dir, 'sources.json')
    if (!existsSync(sourcesPath)) continue
    try {
      const source = JSON.parse(readFileSync(sourcesPath, 'utf8'))
      for (const candidate of source.accepted ?? []) {
        if (candidate.sha256) existingHashes.add(candidate.sha256)
      }
    } catch {
      // 깨진 sources.json은 해당 인물 처리에서 드러난다.
    }
  }

  if (mode === 'pinterest' || stageOnly) await loadFaceModels()
  const pinterestSession = mode === 'pinterest' ? await createPinterestSession() : null

  console.log(`START targets=${selected.length} concurrency=${concurrency} mode=${mode} stageOnly=${stageOnly} queryPass=${queryPass}`)
  let completed = 0
  const results = await mapConcurrent(selected, concurrency, async (person) => {
    const result = mode === 'pinterest'
      ? await collectOnePinterest(person, pinterestSession, existingHashes, stageOnly, queryPass)
      : await collectOne(person, existingHashes, stageOnly)
    completed += 1
    console.log(`[${completed}/${selected.length}] ${result.slug} ${result.status} accepted=${result.accepted ?? 0}`)
    return result
  })
  const summary = {
    finished_at: new Date().toISOString(),
    targets: selected.length,
    by_status: Object.fromEntries([...Map.groupBy(results, (row) => row.status).entries()].map(([key, rows]) => [key, rows.length])),
    accepted: results.reduce((sum, row) => sum + (row.accepted ?? 0), 0),
    failures: results.filter((row) => ['failed', 'rate_limited'].includes(row.status)),
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  writeFileSync(path.join(OUTPUT_ROOT, `run-${stamp}.json`), `${JSON.stringify({ summary, results }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
