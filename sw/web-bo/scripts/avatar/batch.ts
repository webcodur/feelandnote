/**
 * 셀럽 아바타 일괄 등록 — Wikidata QID → P18 → Commons → 얼굴감지 크롭 → R2 → celebs.avatar_url
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   pnpm tsx scripts/avatar/batch.ts \
 *     [--targets-file path/to/targets.tsv] \
 *     [--only slug1,slug2,...] \
 *     [--dry-run]
 *
 * targets는 "slug<TAB>profile_id" 형식. --targets-file 미지정 시 스크립트 내 DEFAULT_TARGETS 사용.
 *
 * 구도와 크롭의 의미는 docs/project/celeb/celeb-08-01-avatar.md가 쥐고,
 * 좌표 계산은 src/lib/avatar-geometry.ts 한 곳이 담당한다. 단건 등록기와 같은 구현을 쓴다.
 *
 * 흐름:
 *   1) DB에서 영문명·기존 QID 조회
 *   2) QID 없으면 wbsearchentities로 검색 후 채택
 *   3) wbgetentities로 P18(image) 가져옴
 *   4) Commons imageinfo로 원본 URL + 라이선스 조회. 부적합 라이선스면 스킵
 *   5) 원본 다운로드 → face-api SSD MobileNet 검출 + 68점 랜드마크로 눈·턱 좌표 추출
 *   6) avatar-geometry가 눈·턱 거리로 정사각 좌표 산출 → 공유 원본 규격 WebP로 변환
 *   7) R2 PUT celebs/{celeb_id}/avatar.webp → celebs.avatar_url 갱신 + wikidata_qid 보강
 *   8) credits.log 누적 — 규격 이탈 경고도 함께 적는다
 *
 * 얼굴 미검출 → 그 인물만 실패로 집계하고 건너뛴다(대체 크롭으로 올리지 않는다). 전체는 계속 돈다.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { buildSmallAvatar, smallAvatarKey } from '../../src/lib/avatar-small'
import { readFileSync, appendFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import * as tf from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  judgeGeometry,
  type CropResult,
  type FaceAnchors,
} from '../../src/lib/avatar-geometry'
// vladmandic의 기본 entry는 tfjs-node를 require하므로 node-wasm 빌드로 직접 import.
import type { TNetInput } from '@vladmandic/face-api'
import { createRequire } from 'module'
import { boPath, scriptsPath } from '../lib/paths'
const _require = createRequire(import.meta.url)
const faceapi = _require(
  '@vladmandic/face-api/dist/face-api.node-wasm.js'
) as typeof import('@vladmandic/face-api')


// 서비스 롤 클라이언트 — 호출부 추론 타입을 매개변수 선언에 재사용
function createServiceClient(url: string, key: string) {
  return createClient(url, key)
}
type ServiceClient = ReturnType<typeof createServiceClient>

// ─── 입력 데이터 (slug → profile_id) ────────────────────────────
const DEFAULT_TARGETS: ReadonlyArray<readonly [string, string]> = [
  ['fei-fei-li', '1b89a335-28cf-49c9-ab1e-8f8aba9db466'],
  ['aidan-gomez', 'ca9f6d3e-95de-48fe-963f-9a51f2a281ce'],
  ['alec-radford', 'bc80a3ee-189d-4543-9002-6d6e62443df5'],
  ['alexandr-wang', 'ee248474-a1f8-4966-827b-c15353fe1f22'],
  ['ali-ghodsi', '1ce0b508-5bd5-4695-8a34-f17000329a74'],
  ['andrej-karpathy', '9f9d8cb2-7d32-4bd2-a967-2f29080109d5'],
  ['andrew-feldman', '7d064f46-b19c-45e8-ac07-4c6488b43aac'],
  ['andrew-ng', '90946bb6-2383-4c3b-8c09-8ec1d0df6ddb'],
  ['aravind-srinivas', 'b02f8926-8f85-4ef5-a8a1-d38ac82c00cf'],
  ['arthur-mensch', '492a347d-18fe-46b6-9f31-4bcf067a1f3f'],
  ['ashish-vaswani', '2a1fc7e7-6776-40d2-88a2-eefb477e39f6'],
  ['bill-dally', 'fb903a29-6da6-46b2-b8b5-528c748478e3'],
  ['bill-gurley', '0f43cd61-3fb7-4186-8c80-3d9fa6a2c6e0'],
  ['brad-lightcap', 'b592c599-3b1d-468d-bddf-b867de6cbd0f'],
  ['brett-adcock', '511f42fa-300b-427e-98a3-8396acd308dc'],
  ['chris-lattner', 'd41cdde9-4a8d-4ddc-ba30-055574f238e2'],
  ['chris-malachowsky', 'ce490d6d-2137-40e8-905d-922af04753c4'],
  ['chris-olah', '7ca63aa0-ee77-4ce3-82cb-d632654ddd07'],
  ['clement-delangue', '46125caf-b216-4663-ab5f-ad1891011608'],
  ['curtis-priem', '7a15201d-1bf9-4538-914c-bc25a2b05cf7'],
  ['daniel-de-freitas', 'edc2e751-e7e2-4512-a4eb-f7e9fa8e7609'],
  ['daniel-gross', '71249687-cd46-46ef-91f2-ac71ac878db8'],
  ['david-patterson', 'b3cfa20f-418c-4d65-b2f6-0cfd42c5910d'],
  ['david-sacks', 'de012c28-ba65-499d-abf6-5c7200ad6013'],
  ['guillaume-lample', 'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'],
  ['ilya-sutskever', '57eed215-9927-4266-ae0c-9e57c0204847'],
  ['ion-stoica', '9cf780f6-3026-425e-8cb2-9a7d8b097627'],
  ['jakub-pachocki', '7863330c-7bf5-4a77-a44c-e6d5ef20664c'],
  ['jared-kaplan', '57cc5f00-9e2b-4c0b-a0ab-4727d712b7c7'],
  ['jeff-dean', 'a8c0d1e2-3f45-6789-abcd-ef0123456789'],
  ['jim-keller', 'bda68fab-c01d-4a3c-9ef2-0b8f365e58b4'],
  ['john-schulman', 'aaa257bb-1cf4-4e6d-8fd8-ff97fda3a6e3'],
  ['judea-pearl', '1da306d4-2137-41d1-a55c-a4699c543ced'],
  ['kai-fu-lee', 'f80580cd-e94b-4636-826a-12a1306a0516'],
  ['kevin-scott', '6614c8fe-95db-41c2-9a94-b4f534432212'],
  ['kevin-weil', 'c0c48754-a97d-4711-8ce9-9750d7801d58'],
  ['marc-raibert', 'd22b46a0-e493-4e2c-8ed8-e37f4766ed3f'],
  ['mark-chen', 'fa928756-b2b1-4192-9a9a-99e3c957ee2f'],
  ['michael-i.-jordan', '9025139a-3ab2-4c79-afaf-369e4584abcf'],
  ['mike-krieger', '18110eb5-ad55-4593-bc70-ce1c6f726330'],
  ['mustafa-suleyman', 'ebdb572f-b0c3-46b4-bc87-e2170a6a1c0d'],
  ['nat-friedman', '031c2453-8075-461d-b9cc-9252661c9379'],
  ['noam-shazeer', '0dc067e4-04b3-4e9f-be63-645e18aae16f'],
  ['pat-gelsinger', '6cba4b87-ae6e-4f02-9d21-ba0b489fb34d'],
  ['richard-sutton', '553aa9f0-655e-426e-99d0-4340ec748b4a'],
  ['sam-mccandlish', '8ec52192-4f45-4748-82cf-1a5b07fe59e7'],
  ['sebastian-thrun', '0dd85ee6-d874-4ee0-98ad-2c7d71d4d30a'],
  ['shane-legg', 'e2f8b73a-4fed-4b47-91ef-f01de2855bce'],
  ['stuart-russell', 'a21fd5fe-42fd-4306-9a48-164db2c8556c'],
  ['thomas-wolf', '5c7001f0-9aba-4a01-92b0-21eaa80be4f6'],
  ['tom-brown', '19e33bcb-99c5-459a-a433-726a54d0d9e4'],
  ['wojciech-zaremba', 'b1fb9f7f-216a-48f6-8222-db78e4c27804'],
  ['yang-zhilin', '15a53c31-3f1b-48b3-bab1-55a3b22c0f05'],
  ['yoshua-bengio', '5eae027f-7b7b-4f06-aa02-69fd19231f69'],
  ['zhang-peng', 'dac017d4-9ae9-4579-a6e5-5c63fa7b9eec'],
]

const ACCEPTABLE_LICENSE_PATTERNS: RegExp[] = [
  /cc[\s-]?by[\s-]?sa/i,
  /cc[\s-]?by(?![\s-]?nc)(?![\s-]?nd)/i,
  /cc[\s-]?0/i,
  /creative\s*commons\s*zero/i,
  /\bpublic\s*domain\b/i,
  /\bpd[\s-]?(self|user|old|us[\s-]?gov|art|us|jp)?\b/i,
  /\bgfdl\b/i,
]

// ─── 직업 키워드 사전 ────────────────────────────────────────
// DB celebs.profession 컬럼 값 → wikidata description 매칭 키워드.
// 동명이인 차단용: 검색 hits 중 description이 이 키워드를 포함하는 후보를 우선 채택.
const PROFESSION_KEYWORDS: Record<string, string[]> = {
  author: ['author', 'writer', 'novelist', 'poet', 'playwright', 'essayist', 'journalist', 'critic', 'screenwriter', 'translator'],
  director: ['director', 'filmmaker', 'film maker', 'cinematographer', 'producer'],
  scientist: ['scientist', 'researcher', 'computer scientist', 'machine learning', 'artificial intelligence', 'physicist', 'chemist', 'biologist', 'mathematician', 'engineer', 'professor', 'phd'],
  athlete: ['athlete', 'footballer', 'football player', 'soccer', 'basketball', 'baseball', 'tennis', 'golfer', 'boxer', 'swimmer', 'runner', 'sprinter', 'racing driver', 'race car driver', 'racer', 'cyclist', 'fencer', 'wrestler', 'fighter', 'mma', 'martial', 'go player', 'chess player', 'gymnast', 'volleyball', 'rower', 'archer', 'pitcher', 'sportsperson', 'sportsman', 'sportswoman', 'manager', 'coach', 'skater', 'skier'],
  entrepreneur: ['entrepreneur', 'businessman', 'businesswoman', 'business person', 'businessperson', 'ceo', 'chief executive', 'founder', 'co-founder', 'cofounder', 'investor', 'venture capitalist', 'industrialist', 'magnate', 'tycoon', 'executive', 'chairman'],
  humanities_scholar: ['historian', 'philosopher', 'theologian', 'sinologist', 'linguist', 'literary scholar', 'critic', 'scholar', 'academic', 'humanist', 'classicist', 'archaeologist', 'professor', 'monk', 'priest', 'jurist', 'confucian'],
  social_scientist: ['sociologist', 'economist', 'psychologist', 'anthropologist', 'political scientist', 'social scientist', 'professor', 'scholar'],
  politician: ['politician', 'statesman', 'stateswoman', 'president', 'prime minister', 'minister', 'senator', 'governor', 'mayor', 'diplomat', 'ambassador', 'official', 'chancellor', 'emperor', 'king', 'queen', 'monarch', 'sultan', 'leader', 'revolutionary'],
  leader: ['activist', 'leader', 'revolutionary', 'independence', 'reformer', 'organizer', 'organiser', 'rights', 'movement', 'pioneer', 'campaigner'],
  commander: ['general', 'admiral', 'commander', 'military', 'army', 'navy', 'marshal', 'soldier', 'officer', 'warrior', 'samurai', 'shogun', 'lord', 'warlord'],
  musician: ['musician', 'singer', 'composer', 'songwriter', 'pianist', 'guitarist', 'violinist', 'cellist', 'drummer', 'conductor', 'rapper', 'producer', 'jazz', 'rock', 'pop', 'classical', 'opera', 'band'],
  visual_artist: ['painter', 'sculptor', 'artist', 'visual artist', 'photographer', 'designer', 'illustrator', 'cartoonist', 'manga', 'animator', 'architect', 'craftsperson', 'craftsman', 'calligrapher', 'printmaker'],
}

// 사망/사기/허위 등 분명히 부적합한 description 단어 — 동물·캐릭터·작품·기업·장소 차단.
// 주의: 단어 경계 기반 정규식으로 매칭 (예: "filmmaker"의 부분일치로 "film"이 잡히면 안 됨).
const NON_HUMAN_NEGATIVE_PATTERNS: RegExp[] = [
  /\b(?:fictional|character|fictional character)\b/i,
  /\b(?:film|movie|song|album|novel|book|play|opera|tv series|television series|video game|videogame|manga|anime|comic|comic strip|comic book|webtoon|short story|poem|painting|sculpture|essay)\b/i,
  /\b(?:genus|species|breed)\b/i,
  /\b(?:company|corporation|firm|brand|studio|label)\b/i,
  /\b(?:town|village|city|county|province|region|district|country|island|mountain|river|lake|asteroid|crater|street)\b/i,
  /\b(?:school|university|college|institute|library|museum|festival|award)\b/i,
  /\b(?:bibliography|filmography|discography|list of)\b/i,
]

function scoreHitByProfession(description: string | undefined, profession: string | null): number {
  if (!description) return 0
  const d = description.toLowerCase()
  // 부정 토큰 — 강한 페널티 (단어 경계 매칭)
  for (const re of NON_HUMAN_NEGATIVE_PATTERNS) {
    if (re.test(d)) return -100
  }
  if (!profession) return 1 // 직업 정보 없으면 중립
  const kws = PROFESSION_KEYWORDS[profession] ?? []
  let s = 0
  for (const k of kws) {
    // 키워드도 단어 경계 매칭 (예: "ceo"가 "ceos"에만 매칭되지 않도록)
    const re = new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(d)) s += 10
  }
  return s
}

const UA = 'feelandnote-celeb-batch/1.0 (admin contact:webcodur@gmail.com)'

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

// ─── 위키데이터 검색 ─────────────────────────────────────────
interface SearchHit {
  id: string
  label: string
  description?: string
}

async function searchWikidata(name: string): Promise<SearchHit[]> {
  const u = new URL('https://www.wikidata.org/w/api.php')
  u.searchParams.set('action', 'wbsearchentities')
  u.searchParams.set('search', name)
  u.searchParams.set('language', 'en')
  u.searchParams.set('uselang', 'en')
  u.searchParams.set('type', 'item')
  u.searchParams.set('limit', '7')
  u.searchParams.set('format', 'json')
  const res = await fetch(u.toString(), { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`wbsearchentities HTTP ${res.status}`)
  const j = (await res.json()) as {
    search?: Array<{ id: string; label?: string; description?: string }>
  }
  return (j.search ?? []).map((s) => ({
    id: s.id,
    label: s.label ?? '',
    description: s.description,
  }))
}

// ─── 엔티티 상세 (P18 / P31) ───────────────────────────────────
interface EntityClaims {
  isHuman: boolean
  p18File: string | null
  enwikiTitle: string | null
}

async function getEntityDetail(qid: string): Promise<EntityClaims> {
  const u = new URL('https://www.wikidata.org/w/api.php')
  u.searchParams.set('action', 'wbgetentities')
  u.searchParams.set('ids', qid)
  u.searchParams.set('props', 'claims|sitelinks')
  u.searchParams.set('sitefilter', 'enwiki')
  u.searchParams.set('format', 'json')
  const res = await fetch(u.toString(), { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`)
  const j = (await res.json()) as {
    entities?: Record<
      string,
      {
        claims?: {
          P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>
          P31?: Array<{ mainsnak?: { datavalue?: { value?: { id?: string } } } }>
        }
        sitelinks?: { enwiki?: { title?: string } }
      }
    >
  }
  const ent = j.entities?.[qid]
  if (!ent) return { isHuman: false, p18File: null, enwikiTitle: null }
  const p18 = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null
  const p31vals = ent.claims?.P31 ?? []
  const isHuman = p31vals.some(
    (c) => c.mainsnak?.datavalue?.value?.id === 'Q5'
  )
  return {
    isHuman,
    p18File: p18,
    enwikiTitle: ent.sitelinks?.enwiki?.title ?? null,
  }
}

// ─── Commons imageinfo ────────────────────────────────────────
interface CommonsMeta {
  url: string
  licenseShortName: string
  artist: string
  descriptionUrl: string
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ─── 영문 위키피디아 페이지 → Commons 파일명 ─────────────────
// P18이 없는 인물의 infobox 이미지 폴백.
async function fetchWikipediaPageImage(title: string): Promise<string | null> {
  const u = new URL('https://en.wikipedia.org/w/api.php')
  u.searchParams.set('action', 'query')
  u.searchParams.set('titles', title)
  u.searchParams.set('prop', 'pageimages')
  u.searchParams.set('piprop', 'name')
  u.searchParams.set('format', 'json')
  const res = await fetch(u.toString(), { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const j = (await res.json()) as {
    query?: { pages?: Record<string, { pageimage?: string }> }
  }
  const pages = j.query?.pages
  if (!pages) return null
  const page = Object.values(pages)[0]
  return page?.pageimage ?? null
}

async function fetchCommonsMeta(commonsFile: string): Promise<CommonsMeta> {
  const titleParam = encodeURIComponent(`File:${commonsFile}`)
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${titleParam}&prop=imageinfo&iiprop=url%7Cextmetadata&format=json`
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`)
  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            url: string
            descriptionurl: string
            extmetadata?: Record<string, { value?: string }>
          }>
        }
      >
    }
  }
  const pages = json.query?.pages
  if (!pages) throw new Error('Commons API: pages 없음')
  const page = Object.values(pages)[0]
  const info = page?.imageinfo?.[0]
  if (!info) throw new Error('Commons API: imageinfo 없음')
  const ext = info.extmetadata ?? {}
  return {
    url: info.url,
    descriptionUrl: info.descriptionurl,
    licenseShortName: stripHtml(ext.LicenseShortName?.value ?? 'unknown'),
    artist: stripHtml(ext.Artist?.value ?? 'unknown'),
  }
}

function licenseAcceptable(shortName: string): boolean {
  if (!shortName) return false
  if (/non[\s-]?commercial|noncommercial|nc/i.test(shortName)) {
    if (/cc[\s-]?by[\s-]?nc/i.test(shortName)) return false
  }
  if (/no[\s-]?derivat|nd/i.test(shortName) && /cc[\s-]?by/i.test(shortName)) {
    if (/cc[\s-]?by[\s-]?nd/i.test(shortName)) return false
  }
  if (/fair\s*use/i.test(shortName)) return false
  return ACCEPTABLE_LICENSE_PATTERNS.some((re) => re.test(shortName))
}

// ─── 다운로드 ─────────────────────────────────────────────────
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`이미지 다운로드 HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ─── face-api 모델 로드 (SSD MobileNet + 68점 랜드마크) ────────
let modelsLoaded = false
async function ensureFaceModels() {
  if (modelsLoaded) return
  const modelDir = boPath('node_modules',
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
  // sharp로 raw RGB 추출 → tf.tensor3d로 face-api 입력
  // 대용량 이미지는 디텍션 전 다운스케일(긴 변 1024px 상한)로 메모리·시간 절약. 좌표는 원본 비율로 환원.
  // limitInputPixels=false: 거대 이미지(예: 명대 황제 초상 8000x10000+) 처리 허용
  const meta = await sharp(imgBuf, { limitInputPixels: false }).rotate().metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
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
  // data: Uint8Array RGB. tensor shape [H, W, 3]
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32') as unknown as TNetInput
  try {
    const options = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.4,
      maxResults: 10,
    })
    // 디텍션은 다운스케일 좌표. 원본 비율로 환원.
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

/** 얼굴을 못 찾으면 던진다 — 호출부가 그 인물만 실패로 집계한다. */
class FaceNotDetectedError extends Error {
  constructor() {
    super(
      '얼굴을 찾지 못했다 (SSD MobileNet, minConfidence 0.4). '
      + '얼굴 위치를 보장할 수 없어 대체 크롭으로 올리지 않고 건너뛴다.'
    )
    this.name = 'FaceNotDetectedError'
  }
}

// ─── 800×800 webp 변환 (얼굴 못 찾으면 실패) ───────────────────
async function toAvatarWebp(
  input: Buffer,
  meta: CommonsMeta,
  commonsFile: string
): Promise<{
  buf: Buffer
  faceScore: number
  cropBasis: CropResult['basis']
  warnings: string[]
}> {
  const rotated = await sharp(input, { limitInputPixels: false }).rotate().toBuffer()
  const metaInfo = await sharp(rotated, { limitInputPixels: false }).metadata()
  const W = metaInfo.width ?? 0
  const H = metaInfo.height ?? 0
  if (W < 130 || H < 130) {
    throw new Error(`이미지 너무 작음: ${W}x${H}`)
  }

  const face = await detectLargestFace(rotated)
  if (!face) throw new FaceNotDetectedError()

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

  const crop = resolveCrop(face, W, H)
  const { left, top, size } = toExtractArea(crop, W, H)
  const buf = await sharp(rotated, { limitInputPixels: false })
    .extract({ left, top, width: size, height: size })
    .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, { fit: 'cover' })
    .withMetadata(exifBlock)
    .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
    .toBuffer()
  return { buf, faceScore: face.score, cropBasis: crop.basis, warnings: crop.warnings }
}

// ─── 인물 1명 처리 ─────────────────────────────────────────────
type Outcome =
  | {
      kind: 'uploaded'
      url: string
      license: string
      faceScore: number
      /** 눈·턱으로 쟀는지, 상자로 후퇴했는지 */
      cropBasis: CropResult['basis']
      /** 규격을 벗어난 지점. 비어 있지 않으면 결과 로그에 남긴다 */
      warnings: string[]
    }
  | { kind: 'skipped'; reason: string; detail?: string }

interface ProfileRow {
  id: string
  slug: string
  nickname: string | null
  nickname_en: string | null
  wikidata_qid: string | null
  profession: string | null
}

async function processOne(
  args: {
    slug: string
    profileId: string
    profile: ProfileRow
    env: Record<string, string>
    db: ServiceClient
    r2: S3Client
    dryRun: boolean
  }
): Promise<Outcome> {
  const { slug, profileId, profile, env, db, r2, dryRun } = args
  const searchName = profile.nickname_en || profile.nickname || slug.replace(/-/g, ' ')

  // 1. QID + 이미지 결정.
  // 우선순위: 기존 DB QID의 P18 → 검색 hits 중 P18 보유 인간 → 검색 hits 중 인간의 enwiki pageimage 폴백.
  type Detail = EntityClaims & { qid: string; commonsFile: string; source: 'P18' | 'enwiki_pageimage' }
  let detail: Detail | null = null
  const existing = profile.wikidata_qid?.trim()
  let qidReassigned = false

  async function evaluate(qid: string): Promise<Detail | null> {
    const d = await getEntityDetail(qid)
    if (!d.isHuman) return null
    if (d.p18File) {
      return { ...d, qid, commonsFile: d.p18File, source: 'P18' }
    }
    // P18 없으면 enwiki pageimage 폴백
    if (d.enwikiTitle) {
      const pageimg = await fetchWikipediaPageImage(d.enwikiTitle)
      if (pageimg) {
        return { ...d, qid, commonsFile: pageimg, source: 'enwiki_pageimage' }
      }
    }
    return null
  }

  if (existing) {
    detail = await evaluate(existing)
  }
  if (!detail && !dryRun) {
    return {
      kind: 'skipped',
      reason: existing ? 'verified_qid_no_image' : 'missing_verified_qid',
      detail: existing
        ? `DB의 확인된 QID ${existing}에 P18·enwiki 이미지가 없어 자동 재탐색·QID 교체를 차단함`
        : 'DB에 사전 검증된 wikidata_qid가 없어 자동 검색 결과의 실서비스 등록을 차단함. --dry-run으로 후보만 조사한 뒤 QID를 독립 검증하라.',
    }
  }
  let chosenHitDescription: string | undefined
  let chosenHitScore = 0
  if (!detail) {
    const hits = await searchWikidata(searchName)
    if (process.env.DEBUG_HITS) {
      console.log(`  [hits] for "${searchName}" profession=${profile.profession}`)
      for (const h of hits) console.log(`    ${h.id} | ${h.label} | ${h.description}`)
    }
    // 직업 매칭 점수로 정렬 — 동명이인 차단. 동점이면 원래 검색 순서 유지.
    const scored = hits.map((h, i) => ({
      hit: h,
      score: scoreHitByProfession(h.description, profile.profession),
      idx: i,
    }))
    if (process.env.DEBUG_HITS) {
      for (const s of scored) console.log(`    score=${s.score} ${s.hit.id} ${s.hit.description}`)
    }
    // 부정 토큰(-100) 제외 후 정렬
    const filtered = scored.filter((s) => s.score > -50)
    filtered.sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
    // 직업 키워드가 정의된 경우, 점수>0 후보가 있으면 그것만 시도. 없으면 일반 후보로 폴백.
    const hasProfKeywords = profile.profession && PROFESSION_KEYWORDS[profile.profession]
    const strict = hasProfKeywords ? filtered.filter((s) => s.score > 0) : filtered
    const candidates = strict.length > 0 ? strict : filtered
    for (const c of candidates) {
      const h = c.hit
      detail = await evaluate(h.id)
      if (detail) {
        qidReassigned = h.id !== existing
        chosenHitDescription = h.description
        chosenHitScore = c.score
        break
      }
    }
    if (!detail) {
      // 인간 후보가 하나라도 있으면 no_p18, 아니면 no_qid
      let anyHuman: string | null = null
      for (const h of hits) {
        const d = await getEntityDetail(h.id)
        if (d.isHuman) { anyHuman = h.id; break }
      }
      if (anyHuman) {
        return { kind: 'skipped', reason: 'no_p18', detail: `검색된 인간 QID ${anyHuman} 등 P18·enwiki 이미지 모두 부재` }
      }
      // 직업 키워드 strict 모드에서 hit이 다 걸러진 경우 ambiguous로 보고
      if (hasProfKeywords && filtered.length > 0 && strict.length === 0) {
        return { kind: 'skipped', reason: 'ambiguous_disambig', detail: `검색 결과 description이 ${profile.profession} 키워드와 매칭 안 됨. hits: ${hits.map((h) => `${h.id}(${h.description ?? ''})`).join(' | ')}` }
      }
      return { kind: 'skipped', reason: 'no_qid', detail: `wbsearchentities P31=Q5 hit 없음 for "${searchName}"` }
    }
  }
  const qid = detail.qid
  void chosenHitDescription; void chosenHitScore // 디버그용 변수 보존

  // 3. Commons meta + 라이선스
  const meta = await fetchCommonsMeta(detail.commonsFile)
  if (!licenseAcceptable(meta.licenseShortName)) {
    return {
      kind: 'skipped',
      reason: 'license_unsuitable',
      detail: `${meta.licenseShortName} | ${meta.descriptionUrl}`,
    }
  }

  // 4. 다운로드 + 규격 크롭. 얼굴을 못 찾으면 이 인물만 실패로 떨어뜨린다.
  const original = await downloadImage(meta.url)
  let cropped: Awaited<ReturnType<typeof toAvatarWebp>>
  try {
    cropped = await toAvatarWebp(original, meta, detail.commonsFile)
  } catch (e) {
    if (e instanceof FaceNotDetectedError) {
      return {
        kind: 'skipped',
        reason: 'face_not_detected',
        detail: `${e.message} | ${meta.descriptionUrl}`,
      }
    }
    throw e
  }
  const { buf, faceScore, cropBasis, warnings } = cropped
  for (const w of warnings) {
    console.warn(`     [규격 경고] ${w}`)
  }

  if (dryRun) {
    // 미리보기 저장 (스크립트 옆 /tmp/celeb-preview/<slug>.webp)
    const previewDir = boPath('.tmp', 'celeb-preview')
    try {
      const fs = await import('fs')
      fs.mkdirSync(previewDir, { recursive: true })
      const previewPath = resolve(previewDir, `${slug}.webp`)
      fs.writeFileSync(previewPath, buf)
    } catch {
      // 미리보기 실패는 무시
    }
    return {
      kind: 'uploaded',
      url: `[dry-run] ${meta.descriptionUrl}`,
      license: meta.licenseShortName,
      faceScore,
      cropBasis,
      warnings,
    }
  }

  // 5. R2
  const key = `celebs/${profileId}/${CELEB_AVATAR_ORIGINAL.file}`
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buf,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`

  // 5-1. 얼굴이 작게 나오는 화면(성향 분포 등)이 쓸 작은 판. 규격은 shared가 쥔다.
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: smallAvatarKey(profileId),
      Body: await buildSmallAvatar(buf),
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  // 6. DB
  const update: Record<string, string> = { avatar_url: publicUrl }
  if (qidReassigned || (!profile.wikidata_qid && qid)) update.wikidata_qid = qid
  const { error } = await db.from('celebs').update(update).eq('id', profileId)
  if (error) throw new Error(`celebs update 실패: ${error.message}`)

  // 7. 로그
  const ts = new Date().toISOString()
  const warnTag = warnings.length > 0 ? ` | warn=${warnings.join(' ; ')}` : ''
  const line = `${ts} | ${slug} | ${meta.descriptionUrl} | ${meta.licenseShortName} | ${meta.artist} | face=score=${faceScore.toFixed(3)}_basis=${cropBasis}${warnTag}\n`
  appendFileSync(scriptsPath('avatar', 'credits.log'), line, 'utf-8')

  return {
    kind: 'uploaded',
    url: publicUrl,
    license: meta.licenseShortName,
    faceScore,
    cropBasis,
    warnings,
  }
}

// ─── 메인 ──────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const scanDb = argv.includes('--scan-db')
  const onlyIdx = argv.indexOf('--only')
  const targetsFileIdx = argv.indexOf('--targets-file')
  const offsetIdx = argv.indexOf('--offset')
  const limitIdx = argv.indexOf('--limit')
  const excludeFileIdx = argv.indexOf('--exclude-file')
  const onlySlugs: Set<string> | null =
    onlyIdx >= 0 ? new Set(argv[onlyIdx + 1].split(',').map((s) => s.trim())) : null
  const argOffset = offsetIdx >= 0 ? parseInt(argv[offsetIdx + 1], 10) : 0
  const argLimit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : Number.POSITIVE_INFINITY
  const excludeSlugs: Set<string> = new Set()
  if (excludeFileIdx >= 0) {
    try {
      const txt = readFileSync(resolve(argv[excludeFileIdx + 1]), 'utf-8')
      for (const l of txt.split('\n')) {
        const s = l.trim()
        if (s && !s.startsWith('#')) excludeSlugs.add(s)
      }
      console.log(`[exclude] ${excludeSlugs.size}개 slug 제외`)
    } catch (e) {
      console.warn('exclude-file 읽기 실패:', e instanceof Error ? e.message : e)
    }
  }

  let targets: ReadonlyArray<readonly [string, string]> = DEFAULT_TARGETS
  if (targetsFileIdx >= 0) {
    const txt = readFileSync(resolve(argv[targetsFileIdx + 1]), 'utf-8')
    targets = txt
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const [s, id] = l.split(/\t+|,| {2,}/)
        return [s.trim(), id.trim()] as const
      })
  }
  if (onlySlugs) {
    targets = targets.filter((t) => onlySlugs.has(t[0]))
  }

  const env = loadEnv(boPath('.env'))
  for (const k of [
    'NEXT_PUBLIC_DB_API_URL',
    'DB_SECRET_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ]) {
    if (!env[k]) throw new Error(`.env에 ${k} 누락`)
  }

  // wasm 백엔드 초기화 (네이티브 빌드 불필요)
  const wasmDir =
    boPath('node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') +
    '/'
  setWasmPaths(wasmDir)
  // dynamic import로 wasm 등록 — top-level import는 setWasmPaths 이전에 평가되면 다운로드 시도
  await import('@tensorflow/tfjs-backend-wasm')
  await tf.setBackend('wasm')
  await tf.ready()
  console.log('[init] tensorflow backend:', tf.getBackend())
  await ensureFaceModels()
  console.log('[init] face-api SSD MobileNet loaded')

  const db = createServiceClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY)
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  // --scan-db 모드: DB에서 avatar_url 비어있는 셀럽 전체를 자동 조회
  if (scanDb) {
    const { data: rows, error: scanErr } = await db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, wikidata_qid, profession, avatar_url')
      .or('avatar_url.is.null,avatar_url.eq.')
      .order('slug', { ascending: true })
    if (scanErr) throw new Error(`scan-db select 실패: ${scanErr.message}`)
    const list = (rows as unknown as Array<{ id: string; slug: string }>) ?? []
    const before = list.length
    const filtered = excludeSlugs.size > 0 ? list.filter((r) => !excludeSlugs.has(r.slug)) : list
    targets = filtered.map((r) => [r.slug, r.id] as const)
    console.log(`[scan-db] 대상 ${targets.length}명 (avatar_url 비어있는 CELEB${excludeSlugs.size > 0 ? `, exclude로 ${before - targets.length}명 제외` : ''})`)
  }

  // offset/limit 적용
  if (argOffset > 0 || Number.isFinite(argLimit)) {
    const end = Number.isFinite(argLimit) ? argOffset + argLimit : targets.length
    targets = targets.slice(argOffset, end)
    console.log(`[batch] slice offset=${argOffset} limit=${argLimit} → ${targets.length}명 처리`)
  }

  // 프로필 일괄 조회
  const ids = targets.map((t) => t[1])
  const { data: profiles, error: profErr } = await db
    .from('celebs')
    .select('id, slug, nickname, nickname_en, wikidata_qid, profession')
    .in('id', ids)
  if (profErr) throw new Error(`celebs select 실패: ${profErr.message}`)
  const profById = new Map<string, ProfileRow>(
    (profiles as ProfileRow[]).map((p) => [p.id, p])
  )

  type Row = { slug: string; profileId: string; outcome: Outcome | { kind: 'error'; detail: string } }
  const rows: Row[] = []

  for (let i = 0; i < targets.length; i++) {
    const [slug, profileId] = targets[i]
    console.log(`\n[${i + 1}/${targets.length}] ${slug}`)
    const prof = profById.get(profileId)
    if (!prof) {
      rows.push({ slug, profileId, outcome: { kind: 'error', detail: 'profile not found' } })
      continue
    }
    if (prof.slug !== slug) {
      rows.push({
        slug,
        profileId,
        outcome: { kind: 'error', detail: `celeb-id/slug mismatch: DB=${prof.slug}` },
      })
      continue
    }
    try {
      const outcome = await processOne({
        slug,
        profileId,
        profile: prof,
        env,
        db,
        r2,
        dryRun,
      })
      rows.push({ slug, profileId, outcome })
      const tag =
        outcome.kind === 'uploaded'
          ? `OK face score=${outcome.faceScore.toFixed(3)} 기준=${outcome.cropBasis === 'landmarks' ? '눈·턱' : '상자(폴백)'}`
            + (outcome.warnings.length > 0 ? ` | 규격 경고 ${outcome.warnings.length}건` : '')
          : `SKIP ${outcome.reason}`
      console.log(`     ${tag}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`     ERR ${msg}`)
      rows.push({ slug, profileId, outcome: { kind: 'error', detail: msg } })
    }
    // rate limit 보호
    await new Promise((r) => setTimeout(r, 500))
  }

  // 보고
  console.log('\n\n===== 보고 =====')
  console.log('| slug | 상태 | URL 또는 사유 |')
  console.log('|------|------|---------------|')
  let okCount = 0
  let warnCount = 0
  const failures: string[] = []
  for (const r of rows) {
    let status: string
    let detail: string
    if (r.outcome.kind === 'uploaded') {
      if (r.outcome.warnings.length > 0) {
        status = 'WARN 규격 이탈'
        warnCount++
      } else {
        status = 'OK uploaded'
      }
      okCount++
      detail = r.outcome.warnings.length > 0
        ? `${r.outcome.url} | ${r.outcome.warnings.join(' ; ')}`
        : r.outcome.url
    } else if (r.outcome.kind === 'skipped') {
      status = `FAIL ${r.outcome.reason}`
      detail = r.outcome.detail ?? ''
      failures.push(`${r.slug}: ${r.outcome.reason} ${r.outcome.detail ?? ''}`)
    } else {
      status = 'FAIL error'
      detail = r.outcome.detail
      failures.push(`${r.slug}: error ${r.outcome.detail}`)
    }
    console.log(`| ${r.slug} | ${status} | ${detail} |`)
  }
  console.log(`\n성공: ${okCount} / 경고(규격 이탈): ${warnCount} / 실패: ${failures.length}`)
  if (failures.length) {
    console.log('\n실패 명단:')
    for (const f of failures) console.log('  -', f)
  }

  // ─── 분류별 명단 요약 ────────────────────────────────────────
  const successSlugs: string[] = []
  const warnedSlugs: string[] = []
  const byReason: Record<string, string[]> = {}
  for (const r of rows) {
    if (r.outcome.kind === 'uploaded') {
      successSlugs.push(r.slug)
      if (r.outcome.warnings.length > 0) warnedSlugs.push(r.slug)
    } else if (r.outcome.kind === 'skipped') {
      ;(byReason[r.outcome.reason] ||= []).push(r.slug)
    } else {
      ;(byReason['other_error'] ||= []).push(r.slug)
    }
  }
  console.log('\n===== 분류별 요약 =====')
  console.log(`성공 (${successSlugs.length}): ${successSlugs.join(', ')}`)
  console.log(`규격 경고 동반 (${warnedSlugs.length}): ${warnedSlugs.join(', ')}`)
  for (const k of Object.keys(byReason)) {
    console.log(`실패[${k}] (${byReason[k].length}): ${byReason[k].join(', ')}`)
  }

  // JSON 보고서 파일 저장
  try {
    const reportPath = scriptsPath(`.tmp-batch-report-${Date.now()}.json`)
    const fs = await import('fs')
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          total: rows.length,
          success: successSlugs.length,
          warned: warnedSlugs.length,
          failures: failures.length,
          successSlugs,
          warnedSlugs,
          byReason,
          details: rows.map((r) => ({ slug: r.slug, profileId: r.profileId, outcome: r.outcome })),
        },
        null,
        2
      )
    )
    console.log(`\n보고서: ${reportPath}`)
  } catch (e) {
    console.warn('보고서 저장 실패:', e instanceof Error ? e.message : e)
  }
}

main().catch((err) => {
  console.error('치명 오류:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
