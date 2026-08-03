/**
 * 출간 대상 모으기 — **DB 에서** 한 편의 세력·인물·사진을 출간용 한 벌 모형으로 펴낸다. 서버 전용, 읽기만 한다.
 *
 * 예전에는 로컬 JSON(faction-data.json)을 읽었다. 이제 글과 구성의 원본은 DB 이므로(문서 §0)
 * 여기서도 DB 를 읽는다. 다만 **사진은 여전히 로컬 파일**이다 — 2,245장을 DB 로 옮기지 않기로 했고,
 * 인물·묶음의 `image` 값은 렌더 저장소 폴더 안의 경로다.
 *
 * 대본 조립기(`assembleFactionEpisode`)를 쓰지 않는 이유: 조립기는 `faction-data.json` 모양을 만드므로
 * `tag_id`·`celeb_id`(해소된 열쇠)를 결과에 담지 않는다. 출간은 바로 그 두 열쇠가 본체다.
 */

import { readFile, readdir } from 'fs/promises'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import {
  toFactionQuoteMedia,
  type FactionQuoteMedia,
  type FactionQuoteMediaCaption,
  type FactionQuoteMediaFocus,
} from '@feelandnote/shared/lib/faction-quote-media'
import type { FactionLongformLayoutItem } from '@feelandnote/shared/lib/youtube-faction-meta'
import { safeRelSegs } from '@feelandnote/shared/bo/episode-store'
import { factionEpisodeDir } from '@/lib/faction-paths'
import { vnPersonQuote } from '@/lib/faction-voice'
import { FACTION_VOICE_FIELDS, type FactionVoiceLocale } from './types'
import { fileHash } from './manifest'

type Row = Record<string, unknown>

/* ── 모형 ── */

/** 데이터에 적힌 이미지 한 장 — 로컬 파일이면 상대·절대경로를, 외부 주소면 external 을 세운다 */
export interface LocalImageRef {
  /** 데이터에 적힌 값 그대로 */
  raw: string
  /** http(s) 주소 — 올릴 로컬 파일이 아니다 */
  external: boolean
  /** 에피소드 폴더 기준 상대경로 (external 이면 빈 문자열) */
  rel: string
  /** 파일 절대경로 (external 이면 빈 문자열) */
  abs: string
}

/** 위치 기반 팩션 대사 음원. 현재 제작 규격은 에피소드 voice/ 아래 wav 한 벌이다. */
export interface LocalVoiceRef {
  rel: string
  abs: string
  file: string
  stem: string
}

/** 웹 재생 순서가 붙은 개인 화보 원본. at은 배속을 반영한 음성 시작 기준 초다. */
export interface PublishPortrait {
  image: LocalImageRef
  at: number
  focus?: FactionQuoteMediaFocus
}

/** 인물의 자리 — (세력, 묶음, 인물) 순번. 배치 충돌 규칙(§4)의 비교 키다 */
export type Placement = readonly [number, number, number]

export interface PublishPerson {
  /** faction_people.id */
  id: string
  name: string
  /** 연결 키 */
  slug?: string
  /** 해소된 셀럽 id — null 이면 미해소(출간 불가) */
  celebId: string | null
  mythical: boolean
  /**
   * 이 인물 대사에 지정된 ElevenLabs 목소리 — 언어별(국문 `quoteElevenlabsVoiceId` ·
   * 영문 `quoteElevenlabsVoiceIdEn`). 셀럽 프로필의 같은 언어 목소리와 견주는 진단 항목이다 —
   * 출간이 쓰는 값은 아니다.
   */
  quoteVoiceIds: Partial<Record<FactionVoiceLocale, string>>
  place: Placement
  /**
   * 도감에 실린 개인샷 주소(faction_people.web_image_url) — 개인샷 출간의 기록처이자
   * 이미 올라갔는지(unchanged) 판정의 근거다. 인물 텍스트(대사·직함·소개)는 뷰가
   * faction_people 을 직접 읽으므로 여기서 나르지 않는다.
   */
  webImageUrl: string | null
  /** 마지막으로 출간된 음성·화보 타임라인 */
  webQuoteMedia: FactionQuoteMedia | null
  image?: LocalImageRef
  /** 기본 화보 + quoteImage + imageChanges 전체 */
  portraits: PublishPortrait[]
  /** quoteChunks를 실제 발화 시각에 맞춘 웹 중앙 자막 */
  captions: FactionQuoteMediaCaption[]
  voice: LocalVoiceRef
  quoteDuration: number | null
  quotePlaybackRate: number
}

export interface PublishGroup {
  /** faction_groups.id — 태그 연결(tag_id)을 되쓸 때 필요하다 */
  id: string
  /** faction_groups.position (1-based) */
  position: number
  /** groups[] 인덱스(= position - 1). 화면·요청이 쓰는 번호 */
  index: number
  /** 세력 명칭 첫 줄 */
  name: string
  /** 세력 명칭 영문 첫 줄 */
  nameEn?: string
  color?: string
  /** 해소된 태그 id — null 이면 미지정 */
  tagId: string | null
  /** 데이터에 적힌 태그 연결 키(data.tagSlug) */
  tagSlug: string | null
  /** 세력 폴더(NN-<slug>)에서 뽑은 제안 연결 키 */
  suggestedSlug: string
  /**
   * 이 세력이 속한 쇼츠 편(1…N). 없거나 0 이면 모든 편 공통.
   * 테마에 맞는 유튜브 영상을 고를 때 쓴다(`videos.ts`) — 출간 텍스트·사진은 이 값을 보지 않는다.
   */
  part?: number
  /** 영상에서 뺀 세력(데이터는 남긴다) — 편 번호 산출에서 제외된다 */
  disabled: boolean
  /** 가로 롱폼 전용 — 지금 나가는 영상은 전부 세로라 어느 편에도 안 나온다 */
  longformOnly: boolean
  /** 세력 로고(data.logoImg) — 영상 타이틀 카드에 쓰는 이미지. 없는 세력이 많다 */
  logo?: LocalImageRef
  /**
   * 도감에 실린 로고 주소(faction_groups.web_logo_url) — 로고 출간의 기록처이자
   * 이미 올라갔는지(unchanged) 판정의 근거다.
   */
  webLogoUrl: string | null
  people: PublishPerson[]
  /**
   * 그룹샷 — num 은 묶음 번호(1부터). R2 키에 세력 번호와 함께 g01c01 로 들어간다.
   *
   * 한 장은 세력 전체가 아니라 그 안의 묶음 하나를 찍은 것이다. 그래서 묶음 이름과
   * 그 묶음에 든 인물을 함께 싣는다 — 도감에서 「이 사진이 누구인지」를 보이는 재료다.
   * 묶음이 없는 세력은 세력 화보 한 장이 곧 세력 전원이므로 이름 없이 전원을 담는다.
   */
  teamShots: {
    num: number
    image: LocalImageRef
    label?: string
    labelEn?: string
    celebIds: string[]
  }[]
}

export interface PublishEpisode {
  folder: string
  episodeId: string
  /** 편 제목 첫 줄 — 여러 세력이 한 태그를 나눠 쓸 때 테마 간판과 견주는 상대(진단 ⑦) */
  title?: string
  /** 편 제목 영문 첫 줄 — 간판 대조는 영문 기준이다(한글 표기 차이는 오탐) */
  titleEn?: string
  groups: PublishGroup[]
  /**
   * 롱폼 배치 — DB 는 세력을 uuid 로 가리키지만 여기서는 **세력 인덱스**로 되돌려 담는다
   * (`youtube-faction-meta` 의 `FactionLongformLayoutItem` 과 같은 모양). 편 경계(cut)로
   * 롱폼이 몇 편으로 갈리는지, 어느 세력이 몇 편에 속하는지 판정하는 재료다.
   */
  longformLayout?: FactionLongformLayoutItem[]
}

/* ── 값 다듬기 ── */

/** 통합 필드(첫 줄=명칭, 나머지=설명)에서 첫 줄만 */
function firstLine(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.split('\n')[0].trim()
  return s || undefined
}

/** 슬러그화 — 영문·숫자만 남긴다. 한글만으로 된 이름은 빈 문자열이 되어 제안값이 없음을 뜻한다 */
function slugify(v: string | undefined): string {
  return (v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 이미지 경로 해석 — 세 가지 표기를 모두 받는다.
 *   http(s) 주소   → 외부(업로드 대상 아님)
 *   슬래시 포함     → factions/<에피소드>/<경로>
 *   파일명만        → factions/<에피소드>/images/<파일명>
 */
export function resolveImageRef(folder: string, raw: unknown): LocalImageRef | undefined {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return { raw: value, external: true, rel: '', abs: '' }
  const segs = safeRelSegs(value)
  if (!segs.length) return undefined
  const relSegs = value.includes('/') ? segs : ['images', segs[segs.length - 1]]
  return {
    raw: value,
    external: false,
    rel: relSegs.join('/'),
    abs: path.join(factionEpisodeDir(folder), ...relSegs),
  }
}

/** 세력 폴더명(01a-declarers)에서 슬러그 추출 — 앞 번호와 구분자를 떼낸다 */
function slugFromFolder(folder: string): string {
  return slugify(folder.replace(/^\d+[a-z]*[-_]?/i, ''))
}

/**
 * 이 세력의 폴더 이름 — 인물·그룹샷 이미지 경로의 첫 토막에서 뽑는다.
 * 폴더 순서와 세력 순서가 어긋난 편(AI-Supremacy: 8번째 세력이 11-huggingface)이 실재하므로
 * 번호 대조는 쓰지 않는다. 가장 많이 등장한 첫 토막을 그 세력의 폴더로 본다.
 */
function folderOfGroup(refs: (LocalImageRef | undefined)[]): string | undefined {
  const count = new Map<string, number>()
  for (const r of refs) {
    if (!r || r.external) continue
    const head = r.rel.split('/')[0]
    if (!head || head === 'images') continue
    count.set(head, (count.get(head) ?? 0) + 1)
  }
  let best: string | undefined
  let bestN = 0
  for (const [f, n] of count) if (n > bestN) { best = f; bestN = n }
  return best
}

/**
 * 인물 롱테일(data jsonb)에서 언어별 대사 목소리를 꺼낸다 — 빈 문자열은 없는 것으로 본다.
 * 짝인 엔진 표기는 진단이 보지 않는다(대조는 목소리만 한다).
 */
export function quoteVoiceIdsOf(data: unknown): Partial<Record<FactionVoiceLocale, string>> {
  const out: Partial<Record<FactionVoiceLocale, string>> = {}
  if (!data || typeof data !== 'object') return out
  const row = data as Record<string, unknown>
  for (const loc of ['ko', 'en'] as const) {
    const v = row[FACTION_VOICE_FIELDS[loc].person]
    if (typeof v === 'string' && v.trim()) out[loc] = v.trim()
  }
  return out
}

type VoiceTimingSegment = {
  start?: number
  end?: number
  text?: string
  sub?: string[]
  subTimings?: number[]
}
type VoiceTimingMap = Record<string, VoiceTimingSegment[]>

const clampPlaybackRate = (value: unknown): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 1
  return Math.min(2, Math.max(0.5, n))
}

function focusOf(value: unknown): FactionQuoteMediaFocus | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const focus = value as Row
  if (typeof focus.x !== 'number' || !Number.isFinite(focus.x)) return undefined
  if (typeof focus.y !== 'number' || !Number.isFinite(focus.y)) return undefined
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 100) / 100))
  return { x: clamp(focus.x), y: clamp(focus.y) }
}

function sameFocus(a: FactionQuoteMediaFocus | undefined, b: FactionQuoteMediaFocus | undefined): boolean {
  return a?.x === b?.x && a?.y === b?.y
}

/** Remotion 공용 expandSubTimings와 같은 규칙. 웹 출간 시각도 렌더와 같은 발화 경계를 쓴다. */
function expandSubTimings(timings: VoiceTimingSegment[]): VoiceTimingSegment[] {
  const out: VoiceTimingSegment[] = []
  for (const timing of timings) {
    if (!timing.sub || timing.sub.length <= 1) { out.push(timing); continue }
    if (timing.subTimings?.length === timing.sub.length - 1) {
      let cursor = timing.start ?? 0
      timing.sub.forEach((text, i) => {
        const end = i < timing.subTimings!.length ? timing.subTimings![i] : (timing.end ?? cursor)
        out.push({ start: cursor, end, text })
        cursor = end
      })
      continue
    }
    const totalChars = timing.sub.reduce((sum, text) => sum + text.length, 0) || 1
    const duration = (timing.end ?? 0) - (timing.start ?? 0)
    let cursor = timing.start ?? 0
    for (const text of timing.sub) {
      const end = cursor + duration * text.length / totalChars
      out.push({ start: cursor, end, text })
      cursor = end
    }
  }
  return out
}

/** 편별·통합 KO 발화시각을 모두 합친다. 같은 stem은 뒤 파일(편별)이 최신 원천이다. */
async function loadKoVoiceTimings(folder: string): Promise<VoiceTimingMap> {
  const dir = factionEpisodeDir(folder)
  let files: string[]
  try {
    files = (await readdir(dir))
      .filter(file => /^data\.timing(?:\.p\d+)?\.ko\.json$/i.test(file))
      .sort()
  } catch {
    return {}
  }

  const out: VoiceTimingMap = {}
  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as Record<string, unknown>
      for (const [stem, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) out[stem] = value as VoiceTimingSegment[]
      }
    } catch {
      // 깨진 타이밍 한 파일 때문에 사진·음성 출간 전체를 막지 않는다. 아래 글자수 비례 폴백이 맡는다.
    }
  }
  return out
}

/** 렌더 PersonCard와 같은 규칙으로 기본 화보·대사용 화보·덩어리별 화보를 재생 초에 배치한다. */
function portraitsOf(
  folder: string,
  person: Row,
  timing: VoiceTimingSegment[] | undefined,
): {
  portraits: PublishPortrait[]
  captions: FactionQuoteMediaCaption[]
  rate: number
  duration: number | null
} {
  const data = person.data && typeof person.data === 'object' ? person.data as Row : {}
  const rate = clampPlaybackRate(data.quotePlaybackRate)
  const parsedDuration = typeof person.quote_duration === 'number' || typeof person.quote_duration === 'string'
    ? Number(person.quote_duration)
    : Number.NaN
  const rawDuration = Number.isFinite(parsedDuration) ? parsedDuration : null
  const duration = rawDuration && rawDuration > 0
    ? Math.round(rawDuration / rate * 1000) / 1000
    : null
  const quoteChunks = Array.isArray(person.quote_chunks)
    ? person.quote_chunks.filter((v): v is string => typeof v === 'string')
    : []
  const realChunks = quoteChunks.filter(chunk => chunk.trim())
  const expanded = timing ? expandSubTimings(timing) : undefined
  const useTiming = !!expanded
    && expanded.length === realChunks.length
    && expanded.every(item => typeof item.start === 'number' && Number.isFinite(item.start))
  const totalChars = realChunks.join(' ').length || 1
  const fallbackDuration = duration ?? Math.max(3, totalChars / 6.5)

  const captionAt = (realIndex: number): number => {
    if (useTiming) {
      const start = expanded![realIndex]?.start ?? 0
      return Math.max(0, start / rate)
    }
    const before = realChunks.slice(0, realIndex).join(' ').length
    return Math.max(0, fallbackDuration * before / totalChars)
  }

  const captions = realChunks.map((text, realIndex) => ({
    text: text.trim(),
    at: Math.round(captionAt(realIndex) * 1000) / 1000,
  }))

  const realIndexOf = (chunkIndex: number): number => {
    let real = 0
    for (let i = 0; i < chunkIndex && i < quoteChunks.length; i += 1) {
      if (quoteChunks[i]?.trim()) real += 1
    }
    return real
  }
  const atForChunk = (chunkIndex: number): number => {
    const realIndex = realIndexOf(chunkIndex)
    if (realIndex <= 0) return 0
    if (useTiming) {
      const start = expanded![Math.min(realIndex, expanded!.length - 1)].start ?? 0
      return Math.max(0, start / rate)
    }
    const before = realChunks.slice(0, realIndex).join(' ').length
    return Math.max(0, (duration ?? 0) * before / totalChars)
  }

  const personFocus = focusOf(data.zoomFocus)
  const raw: Array<{ value: unknown; at: number; focus?: FactionQuoteMediaFocus }> = [
    { value: person.image, at: 0, focus: personFocus },
  ]
  if (data.quoteImage) {
    raw.push({ value: data.quoteImage, at: 0, focus: focusOf(data.quoteZoomFocus) ?? personFocus })
  }
  const changes = Array.isArray(data.imageChanges)
    ? data.imageChanges.flatMap(item => {
        if (!item || typeof item !== 'object') return []
        const change = item as Row
        return typeof change.chunk === 'number'
          ? [{ value: change.image, chunk: change.chunk, focus: focusOf(change.zoomFocus) ?? personFocus }]
          : []
      }).sort((a, b) => a.chunk - b.chunk)
    : []
  changes.forEach(change => raw.push({ value: change.value, at: atForChunk(change.chunk), focus: change.focus }))

  const portraits: PublishPortrait[] = []
  for (const item of raw) {
    const image = resolveImageRef(folder, item.value)
    if (!image) continue
    const previous = portraits[portraits.length - 1]
    // 같은 사진을 연속해서 다시 지정한 것은 실제 화면 변화가 아니므로 출간 벌 수에서 뺀다.
    if (previous?.image.raw === image.raw && sameFocus(previous.focus, item.focus)) continue
    portraits.push({ image, at: Math.round(item.at * 1000) / 1000, ...(item.focus ? { focus: item.focus } : {}) })
  }
  return { portraits, captions, rate, duration }
}

/* ── DB 읽기 ── */

/** `.in()` 청크 조회 — 462개를 단일 in() 에 실어 실패한 실측 이력이 있어 200 으로 끊는다 */
async function inChunks(
  db: SupabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
  }
  return out
}

const GROUP_SELECT = 'id, position, name, name_en, color, tag_id, part, disabled, longform_only, web_logo_url, data'
const CLUSTER_SELECT = 'id, group_id, position, label, label_en, image'
// `data` 는 대사 목소리 대조(진단 ⑥) 때문에 함께 받는다. 큰 덩어리인 채굴 어록은 별도 컬럼(mined)이라
// 여기 딸려 오지 않는다 — 한 편 최대 87명이므로 무게는 문제되지 않는다.
// 인물 텍스트(epithet·lines·quote)는 받지 않는다 — 뷰(faction_atlas_members)가 직접 읽는 단일 원천이라
// 출간이 나를 것이 없다. web_image_url 은 개인샷 출간의 기록처라 함께 받는다.
const PERSON_SELECT = 'id, cluster_id, position, name, slug, celeb_id, mythical, web_image_url, web_quote_media, image, quote_chunks, quote_duration, data'

const byPosition = (a: Row, b: Row) => (a.position as number) - (b.position as number)

/**
 * 한 편의 출간 대상을 DB 에서 모은다.
 *
 * 인물 순서는 자리 순서(세력 → 묶음 → 인물)를 그대로 쓴다. 영상에서 빼둔 항목(disabled)도 포함한다 —
 * 그 표시는 영상 노출 여부일 뿐이고 도감은 제작 데이터를 정본으로 삼는다.
 */
export async function collectEpisode(db: SupabaseClient, folder: string): Promise<PublishEpisode> {
  const { data: epRow, error: epErr } = await db
    .from('faction_episodes').select('id, title, title_en, longform_layout').eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!epRow) throw new Error(`에피소드를 찾을 수 없습니다: ${folder}`)
  const episodeId = epRow.id as string
  const voiceTimings = await loadKoVoiceTimings(folder)

  const { data: gData, error: gErr } = await db
    .from('faction_groups').select(GROUP_SELECT).eq('episode_id', episodeId)
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupRows = ((gData ?? []) as unknown as Row[]).sort(byPosition)

  const clusterRows = groupRows.length
    ? await inChunks(db, 'faction_clusters', 'group_id', groupRows.map(g => g.id as string), CLUSTER_SELECT)
    : []
  const personRows = clusterRows.length
    ? await inChunks(db, 'faction_people', 'cluster_id', clusterRows.map(c => c.id as string), PERSON_SELECT)
    : []
  const brokenPerson = personRows.find(p => typeof p.celeb_id !== 'string' || !p.celeb_id)
  if (brokenPerson) {
    throw new Error(`팩션 DB 인물 연결 무결성 오류(${folder}): ${String(brokenPerson.name ?? brokenPerson.id)}`)
  }

  const clustersByGroup = new Map<string, Row[]>()
  for (const c of clusterRows) {
    const k = c.group_id as string
    if (!clustersByGroup.has(k)) clustersByGroup.set(k, [])
    clustersByGroup.get(k)!.push(c)
  }
  for (const arr of clustersByGroup.values()) arr.sort(byPosition)

  const peopleByCluster = new Map<string, Row[]>()
  for (const p of personRows) {
    const k = p.cluster_id as string
    if (!peopleByCluster.has(k)) peopleByCluster.set(k, [])
    peopleByCluster.get(k)!.push(p)
  }
  for (const arr of peopleByCluster.values()) arr.sort(byPosition)

  const groups: PublishGroup[] = groupRows.map((g, index) => {
    const data = (g.data ?? {}) as Row
    const clusters = clustersByGroup.get(g.id as string) ?? []

    const people: PublishPerson[] = []
    clusters.forEach((c, ci) => {
      for (const [pi, p] of (peopleByCluster.get(c.id as string) ?? []).entries()) {
        const voiceFile = vnPersonQuote(index, pi, ci)
        const stem = voiceFile.replace(/\.wav$/i, '')
        const media = portraitsOf(folder, p, voiceTimings[stem])
        people.push({
          id: p.id as string,
          name: (p.name as string) ?? '',
          slug: typeof p.slug === 'string' && p.slug.trim() ? p.slug.trim() : undefined,
          celebId: p.celeb_id as string,
          mythical: p.mythical === true,
          quoteVoiceIds: quoteVoiceIdsOf(p.data),
          place: [index, ci, pi] as const,
          webImageUrl: typeof p.web_image_url === 'string' && p.web_image_url.trim() ? p.web_image_url : null,
          webQuoteMedia: toFactionQuoteMedia(p.web_quote_media),
          image: resolveImageRef(folder, p.image),
          portraits: media.portraits,
          captions: media.captions,
          voice: {
            file: voiceFile,
            stem,
            rel: `voice/${voiceFile}`,
            abs: path.join(factionEpisodeDir(folder), 'voice', voiceFile),
          },
          quoteDuration: media.duration,
          quotePlaybackRate: media.rate,
        })
      }
    })

    // 묶음이 없는 세력은 세력 화보(data.image)가 유일한 그룹샷이다 — 1번 묶음으로 취급하고,
    // 그 한 장에는 세력 전원이 나온 것으로 본다.
    //
    // 묶음에 이름을 안 붙인 편이 있다(회사 하나가 곧 한 묶음인 산업편). 그때는 세력 이름을
    // 사진 이름표로 쓴다 — 이름이 없으면 도감이 사진마다 테마 이름을 적어 같은 줄이 반복된다.
    const groupLabel = firstLine(g.name)
    const groupLabelEn = firstLine(g.name_en)
    const teamSources = clusters.length
      ? clusters.map(c => ({
          raw: c.image,
          label: firstLine(c.label) ?? groupLabel,
          labelEn: firstLine(c.label_en) ?? groupLabelEn,
          celebIds: (peopleByCluster.get(c.id as string) ?? [])
            .map(p => p.celeb_id as string),
        }))
      : [{
          raw: data.image,
          label: groupLabel,
          labelEn: groupLabelEn,
          celebIds: people.map(p => p.celebId).filter((id): id is string => !!id),
        }]

    const teamShots = teamSources
      .map((src, i) => ({
        num: i + 1,
        image: resolveImageRef(folder, src.raw),
        ...(src.label ? { label: src.label } : {}),
        ...(src.labelEn ? { labelEn: src.labelEn } : {}),
        celebIds: src.celebIds,
      }))
      .filter((t): t is PublishGroup['teamShots'][number] => !!t.image)

    const logo = resolveImageRef(folder, data.logoImg)

    const imgFolder = folderOfGroup([...people.map(p => p.image), ...teamShots.map(t => t.image)])
    const nameEn = groupLabelEn
    const suggestedSlug = (imgFolder && slugFromFolder(imgFolder)) || slugify(nameEn) || slugify(groupLabel)
    const tagSlug = typeof data.tagSlug === 'string' && data.tagSlug.trim() ? data.tagSlug.trim() : null

    return {
      id: g.id as string,
      position: g.position as number,
      index,
      name: groupLabel ?? `세력 ${index + 1}`,
      nameEn,
      color: typeof g.color === 'string' && g.color.trim() ? g.color.trim() : undefined,
      tagId: (g.tag_id as string | null) ?? null,
      tagSlug,
      suggestedSlug,
      part: typeof g.part === 'number' && g.part > 0 ? g.part : undefined,
      disabled: g.disabled === true,
      longformOnly: g.longform_only === true,
      ...(logo ? { logo } : {}),
      webLogoUrl: typeof g.web_logo_url === 'string' && g.web_logo_url.trim() ? g.web_logo_url : null,
      people,
      teamShots,
    }
  })

  const longformLayout = toLayoutByIndex(epRow.longform_layout, groupRows)
  const title = firstLine(epRow.title)
  const titleEn = firstLine(epRow.title_en)
  return {
    folder,
    episodeId,
    ...(title ? { title } : {}),
    ...(titleEn ? { titleEn } : {}),
    groups,
    ...(longformLayout ? { longformLayout } : {}),
  }
}

/**
 * 롱폼 배치를 uuid 참조에서 **세력 인덱스** 참조로 되돌린다.
 *
 * DB 는 세력을 `{groupId: uuid}` 로 가리키지만 편 경계 판정 규칙(`youtube-faction-meta`·렌더 timing)은
 * 전부 인덱스 기준이다. 사라진 세력을 가리키는 항목은 버린다 — 남겨 두면 없는 자리를 세어
 * 편 구간이 어긋난다.
 */
function toLayoutByIndex(raw: unknown, groupRows: Row[]): FactionLongformLayoutItem[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined
  const indexById = new Map<string, number>()
  groupRows.forEach((g, i) => indexById.set(g.id as string, i))

  const out: FactionLongformLayoutItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.groupId === 'string') {
      const idx = indexById.get(row.groupId)
      if (idx !== undefined) out.push({ group: idx })
      continue
    }
    if ('group' in row && typeof row.group === 'number') { out.push({ group: row.group }); continue }
    if ('cut' in row) { out.push({ cut: true }); continue }
    if ('era' in row) { out.push({ era: row.era }); continue }
    if ('chapter' in row) { out.push({ chapter: row.chapter }); continue }
  }
  return out.length ? out : undefined
}

/**
 * 태그 묶음 열쇠 — 같은 태그를 나눠 쓰는 세력끼리 한 묶음으로 묶는 기준.
 *
 * **연결 키(tagSlug)를 먼저 본다.** `tag_id` 는 연결 키에서 파생된 값이라, 한쪽 세력만 이어져 있고
 * 다른 쪽은 아직 null 인 상태가 실제로 생긴다(태그가 없던 때 저장한 편). 그때 `tag_id` 로 묶으면
 * 두 세력이 남남이 되어 도감 단체사진 배열을 한쪽 몫만으로 갈아끼우는 사고가 난다.
 */
export function tagKeyOf(g: PublishGroup): string {
  if (g.tagSlug) return `slug:${g.tagSlug}`
  if (g.tagId) return `id:${g.tagId}`
  return `#${g.index}`
}

/** 이 태그를 함께 쓰는 세력들 — 태그 단위로 다뤄야 하는 항목(team_images·배치 충돌)의 대상 */
export function groupsOfSameTag(episode: PublishEpisode, target: PublishGroup): PublishGroup[] {
  const key = tagKeyOf(target)
  return episode.groups.filter(g => tagKeyOf(g) === key)
}

/**
 * 배치 충돌 규칙(§4) — 같은 셀럽이 한 태그 안 여러 자리에 있으면 **자리가 가장 앞인** 배치만 채택한다.
 * 뷰(faction_atlas_members)가 태그당 같은 셀럽의 앞자리 행을 채택하므로, 개인샷 주소도
 * 그 행(faction_people.web_image_url)에만 기록해야 화면과 어긋나지 않는다.
 *
 * 세력을 하나씩 출간해도 결과가 같아야 하므로 판정은 **편 전체**를 보고 한다.
 * @returns `${tagKey}:${celebId}` → 채택된 인물의 faction_people.id
 */
export function winningPlacements(episode: PublishEpisode): Map<string, string> {
  const best = new Map<string, { id: string; place: Placement }>()
  for (const g of episode.groups) {
    const key = tagKeyOf(g)
    for (const p of g.people) {
      if (!p.celebId) continue
      const k = `${key}:${p.celebId}`
      const cur = best.get(k)
      if (!cur || comparePlace(p.place, cur.place) < 0) best.set(k, { id: p.id, place: p.place })
    }
  }
  const out = new Map<string, string>()
  for (const [k, v] of best) out.set(k, v.id)
  return out
}

function comparePlace(a: Placement, b: Placement): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/** 개인샷 R2 키 — 고정 키(덮어쓰기) */
export function soloShotKey(tagId: string, celebId: string): string {
  return `faction/${tagId}/celeb-${celebId}.webp`
}

/** 두 번째 이후 개인 화보 — 내용 해시가 키에 들어가 바뀐 사진만 새 객체가 된다. */
export function personPortraitKey(
  tagId: string, celebId: string, shotNumber: number, hash: string,
): string {
  return `faction/${tagId}/celeb-${celebId}/shot-${String(shotNumber).padStart(2, '0')}-${hash}.webp`
}

/** 팩션 대사 wav — 내용 해시 키라 교체 시 CDN 불변 캐시와 충돌하지 않는다. */
export function personVoiceKey(tagId: string, celebId: string, hash: string): string {
  return `faction/${tagId}/celeb-${celebId}/quote-${hash}.wav`
}

/**
 * 그룹샷 R2 키 — 세력 번호 + 묶음 번호(각 2자리) + 원본 해시 8자. 사진이 바뀌면 키가 갈린다.
 * 세력 번호를 넣는 이유: 한 태그를 여러 세력이 나눠 쓰면 묶음 번호만으로는 서로 겹쳐
 * 다른 세력의 그룹샷을 덮어쓴다(페이팔 마피아 4세력 → 태그 1개).
 */
export function teamShotKey(tagId: string, groupNum: number, clusterNum: number, hash: string): string {
  const g = String(groupNum).padStart(2, '0')
  const c = String(clusterNum).padStart(2, '0')
  return `faction/${tagId}/team/g${g}c${c}-${hash}.webp`
}

/**
 * 세력 로고 R2 키 — 세력 번호(2자리) + 원본 해시 8자. 그룹샷과 같은 규칙으로,
 * 로고가 바뀌면 키가 갈리고 한 태그를 여러 세력이 나눠 써도 서로 덮지 않는다.
 * `sq`는 변환 세대 표식 — 1:1 중앙 크롭(26.08.03)으로 바뀌며 옛 비율 유지본과 키를 가른다.
 */
export function logoKey(tagId: string, groupNum: number, hash: string): string {
  return `faction/${tagId}/logo-sq-g${String(groupNum).padStart(2, '0')}-${hash}.webp`
}

/** 로컬 파일 해시 — 파일이 없으면 null */
export async function hashOfFile(abs: string): Promise<string | null> {
  try { return fileHash(await readFile(abs)) }
  catch { return null }
}
