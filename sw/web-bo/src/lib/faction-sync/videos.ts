/**
 * 테마 ↔ 유튜브 영상 잇기 — 출간이 도감 태그(`celeb_tags.youtube_videos`)에 실어 나르는 값을 만든다.
 * 서버 전용.
 *
 * ## 원천은 업로드 기록이다
 *
 * 어떤 편이 유튜브에 올라갔는지는 **제작·업로드 기록**(`sw/remotion/scripts/youtube/faction-lineup.json`)이
 * 유일한 출처다. 도감에서 사람이 손볼 값이 아니므로 인물 대사와 같은 규칙을 쓴다 —
 * **채움 전용이 아니라 항상 되쓴다.** 기록이 사라지면 도감 쪽도 null 로 비운다.
 *
 * ## 어느 영상이 이 테마의 영상인가
 *
 * 한 편은 세로 롱폼 1편(또는 편 경계로 갈린 N편) + 세로 쇼츠 N편으로 나간다
 * (`factionVariants` 가 그 목록의 단일원천이다). 테마 하나에는 그 편의 세력 여럿이 묶일 수 있으므로
 * 다음 규칙으로 고른다.
 *
 *   롱폼 — 편 경계(cut)가 없으면 통짜 한 편(`ko-longform`). 있으면 그 테마의 세력이 속한 편.
 *          여러 편에 걸치면 가장 앞 편.
 *   쇼츠 — 그 테마 세력들의 쇼츠 편(part) 중 가장 앞 번호. 편이 아예 없는 에피소드는 단일 쇼츠(`ko-shorts-1`).
 *
 * 두 번째 이후 편은 버린다 — 도감은 「롱폼 보기 / 쇼츠 보기」 두 갈래만 보여준다.
 *
 * ## 공개 상태를 실제로 물어본다
 *
 * 기록에 남아 있어도 유튜브에서 지웠거나 비공개로 돌린 영상이 있다. 그대로 실어 나르면
 * 서비스에 죽은 재생기가 뜬다. 그래서 `checkUploadsLive` 로 실제 상태를 물어보고
 * **공개(public)인 것만** 투영한다. 조회 자체가 안 되면(토큰 만료 등) 삭제로 오인하지 않고
 * 그 사실을 사유로 남긴 채 아무것도 바꾸지 않는다.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import {
  factionVariants,
  type FactionLongformLayoutItem,
  type FactionVariantDef,
} from '@feelandnote/shared/lib/youtube-faction-meta'
import { checkUploadsLive, type LiveCheck, type UploadRecordLike } from '@/lib/youtube-liveness'
import type { PublishGroup } from './collect'

/** 업로드 기록 한 줄 — faction-lineup.json 의 `<편>.uploads.<variant>` */
export type FactionUploadRecord = { videoId: string; uploadedAt: string }

/** 한 편의 업로드 기록 전체 — variant 키 → 기록 */
export type FactionUploads = Record<string, FactionUploadRecord>

/** 도감 태그에 싣는 영상 한 편 */
export interface TagVideoRef {
  /** 유튜브 영상 id */
  id: string
  /** 영상 종류 키(`ko-longform`·`ko-longform-2`·`ko-shorts-1`…) — 어느 편에서 왔는지 되짚는 열쇠 */
  variant: string
  /** 쇼츠 편 번호. 편을 나누지 않은 에피소드는 없다 */
  part?: number
  uploadedAt: string
}

/** `celeb_tags.youtube_videos` 에 그대로 들어가는 값 */
export interface TagVideos {
  /** 어느 에피소드에서 왔는지 — 되짚기·디버깅용 */
  episode: string
  /** 공개 상태를 물어본 시각 */
  checkedAt: string
  longform: TagVideoRef | null
  shorts: TagVideoRef | null
}

/** 업로드 기록 파일 위치 */
export function factionLineupPath(): string {
  return path.join(REMOTION_ROOT, 'scripts', 'youtube', 'faction-lineup.json')
}

/**
 * 한 편의 업로드 기록을 읽는다.
 *
 * 파일이 없거나 깨졌으면 **던진다** — 조용히 빈 기록으로 넘기면 "영상이 없다"와
 * "기록을 못 읽었다"가 구별되지 않아 멀쩡한 연결을 지워 버린다.
 */
export async function readFactionUploads(folder: string): Promise<FactionUploads> {
  let raw: string
  try {
    raw = await readFile(factionLineupPath(), 'utf-8')
  } catch (e) {
    throw new Error(`업로드 기록을 읽지 못했습니다(${factionLineupPath()}): ${e instanceof Error ? e.message : String(e)}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`업로드 기록이 깨졌습니다(${factionLineupPath()}): ${e instanceof Error ? e.message : String(e)}`)
  }
  const episode = (parsed as Record<string, unknown> | null)?.[folder] as Record<string, unknown> | undefined
  const uploads = episode?.uploads as Record<string, unknown> | undefined
  if (!uploads || typeof uploads !== 'object') return {}

  const out: FactionUploads = {}
  for (const [key, v] of Object.entries(uploads)) {
    const rec = v as Record<string, unknown> | null
    const id = typeof rec?.videoId === 'string' ? rec.videoId.trim() : ''
    if (!id) continue
    out[key] = { videoId: id, uploadedAt: typeof rec?.uploadedAt === 'string' ? rec.uploadedAt : '' }
  }
  return out
}

/**
 * 롱폼 편(lvPart)별 세력 인덱스 집합 — 배치를 편 경계(cut)로 가른 구간.
 * 배치에 빠진 활성 세력은 마지막 구간에 붙는다(`youtube-faction-meta` · 렌더 timing 과 같은 규칙).
 */
function longformSegments(
  layout: ReadonlyArray<FactionLongformLayoutItem>,
  groups: ReadonlyArray<PublishGroup>,
): number[][] {
  const segments: number[][] = [[]]
  for (const it of layout) {
    if ('cut' in it) { segments.push([]); continue }
    if ('group' in it) segments[segments.length - 1].push(it.group)
  }
  const placed = new Set(layout.flatMap(it => ('group' in it ? [it.group] : [])))
  groups.forEach((g, gi) => { if (!g.disabled && !placed.has(gi)) segments[segments.length - 1].push(gi) })
  return segments
}

/**
 * 한 테마(태그)를 쓰는 세력들에 맞는 영상 종류를 고른다 — 롱폼 하나, 쇼츠 하나.
 *
 * @param all        그 편의 전체 세력(편 구간 판정에 필요하다 — 대상 세력만으로는 배치를 못 읽는다)
 * @param tagGroups  이 테마를 쓰는 세력들
 * @param layout     롱폼 배치(index 기준). 없으면 통짜 한 편
 */
export function pickTagVariants(
  all: ReadonlyArray<PublishGroup>,
  tagGroups: ReadonlyArray<PublishGroup>,
  layout?: ReadonlyArray<FactionLongformLayoutItem>,
): { longform?: FactionVariantDef; shorts?: FactionVariantDef } {
  // 영상에 안 나오는 세력만 가진 테마는 볼 영상이 없다 —
  // 뺀 세력(disabled)과 가로 롱폼 전용(longformOnly)은 지금 나가는 세로 영상 어디에도 없다.
  const onScreen = tagGroups.filter(g => !g.disabled && !g.longformOnly)
  if (!onScreen.length) return {}

  const variants = factionVariants(
    all.map(g => ({ part: g.part, disabled: g.disabled })),
    layout,
  )
  const longforms = variants.filter(v => !v.isShorts)
  const shortsList = variants.filter(v => v.isShorts)
  const idx = new Set(onScreen.map(g => g.index))

  // 롱폼 — 편 경계가 없으면 통짜 한 편, 있으면 이 테마 세력이 처음 나타나는 편
  let longform: FactionVariantDef | undefined
  if (longforms.length <= 1) {
    longform = longforms[0]
  } else {
    const segments = longformSegments(layout ?? [], all)
    const hit = segments.findIndex(seg => seg.some(gi => idx.has(gi)))
    longform = hit >= 0 ? longforms[hit] : undefined
  }

  // 쇼츠 — 이 테마 세력들의 편 번호 중 가장 앞. 편을 나누지 않은 에피소드는 단일 쇼츠
  let shorts: FactionVariantDef | undefined
  if (shortsList.length === 1 && shortsList[0].part == null) {
    shorts = shortsList[0]
  } else {
    const parts = onScreen
      .filter(g => g.part != null && g.part > 0)
      .map(g => g.part as number)
      .sort((a, b) => a - b)
    // 편 미지정(공통) 세력만 있는 테마는 모든 편에 나오므로 첫 편을 대표로 삼는다
    const want = parts[0] ?? shortsList[0]?.part
    shorts = shortsList.find(v => v.part === want)
  }

  return { longform, shorts }
}

/**
 * 업로드 기록 전체의 공개 상태를 유튜브에 물어본다 — 세력도감는 KO 채널 하나뿐이라 1 unit.
 * 기록이 없으면 null(조회 자체를 하지 않는다).
 */
export async function checkFactionUploadsLive(uploads: FactionUploads): Promise<LiveCheck | null> {
  const records: Record<string, UploadRecordLike> = {}
  for (const [k, v] of Object.entries(uploads)) records[k] = { videoId: v.videoId, uploadedAt: v.uploadedAt }
  return checkUploadsLive(records, () => 'ko')
}

/** 한 편의 영상 자료 — 태그마다 되풀이 읽지 않도록 출간 한 번에 한 벌만 만든다 */
export interface EpisodeVideoSource {
  folder: string
  uploads: FactionUploads
  /** 공개 상태 대조 결과. 기록이 없으면 null */
  live: LiveCheck | null
  /** 조회가 실패해 공개 여부를 판정할 수 없다 — 이때는 아무것도 바꾸지 않는다 */
  unverified: boolean
  /** 사람에게 보여줄 사유(조회 실패 등) */
  notes: string[]
}

/** 업로드 기록을 읽고 공개 상태까지 확인해 한 벌로 묶는다 */
export async function loadEpisodeVideoSource(folder: string): Promise<EpisodeVideoSource> {
  const uploads = await readFactionUploads(folder)
  const live = await checkFactionUploadsLive(uploads)
  const notes = live?.errors ?? []
  return { folder, uploads, live, unverified: notes.length > 0, notes }
}

/** 고른 영상 한 편의 판정 결과 — 실을 값과, 안 싣는다면 그 사유 */
export interface VideoPick {
  ref: TagVideoRef | null
  /** 사람에게 보여줄 한 줄. 실을 때도 무엇을 실었는지 적는다 */
  note: string
}

/** 영상 하나를 기록·공개 상태에 비추어 판정한다 */
function pickOne(src: EpisodeVideoSource, variant: FactionVariantDef | undefined, label: string): VideoPick {
  if (!variant) return { ref: null, note: `${label}: 이 테마가 나오는 편이 없음` }
  const rec = src.uploads[variant.key]
  if (!rec) return { ref: null, note: `${label}: 업로드 기록 없음(${variant.key})` }

  const state = src.live?.videos[variant.key]?.state
  if (state === 'public') {
    return {
      ref: { id: rec.videoId, variant: variant.key, ...(variant.part != null ? { part: variant.part } : {}), uploadedAt: rec.uploadedAt },
      note: `${label}: ${variant.key} → ${rec.videoId}`,
    }
  }
  const why = state === 'private' ? '비공개'
    : state === 'unlisted' ? '일부 공개'
    : state === 'missing' ? '유튜브에서 삭제됨'
    : '공개 상태 미확인'
  return { ref: null, note: `${label}: ${why}로 제외(${variant.key} · ${rec.videoId})` }
}

/**
 * 한 테마에 실을 영상 값을 만든다.
 *
 * @returns 실을 값(둘 다 없으면 null)과 사람에게 보여줄 사유 목록
 */
export function buildTagVideos(
  src: EpisodeVideoSource,
  all: ReadonlyArray<PublishGroup>,
  tagGroups: ReadonlyArray<PublishGroup>,
  layout?: ReadonlyArray<FactionLongformLayoutItem>,
): { value: TagVideos | null; notes: string[] } {
  const { longform, shorts } = pickTagVariants(all, tagGroups, layout)
  const lf = pickOne(src, longform, '롱폼')
  const sh = pickOne(src, shorts, '쇼츠')
  const notes = [lf.note, sh.note]

  if (!lf.ref && !sh.ref) return { value: null, notes }
  return {
    value: {
      episode: src.folder,
      checkedAt: src.live?.checkedAt ?? new Date().toISOString(),
      longform: lf.ref,
      shorts: sh.ref,
    },
    notes,
  }
}

/**
 * 되쓰기 판정 — 도감에 이미 같은 값이 있으면 undefined(손대지 않는다).
 * `checkedAt` 은 물어본 시각일 뿐이라 비교에서 뺀다(안 그러면 출간할 때마다 갱신으로 뜬다).
 */
export function videosChanged(dbValue: unknown, next: TagVideos | null): boolean {
  return stripCheckedAt(dbValue) !== stripCheckedAt(next)
}

function stripCheckedAt(v: unknown): string {
  if (!v || typeof v !== 'object') return 'null'
  const { checkedAt, ...rest } = v as Record<string, unknown>
  void checkedAt
  return canonical(rest)
}

/** 키 순서에 흔들리지 않는 비교용 문자열 */
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`).join(',')}}`
}
