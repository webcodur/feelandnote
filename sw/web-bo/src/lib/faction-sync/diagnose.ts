/**
 * 출간 진단 — 제작 데이터를 서비스 도감·이미지 저장소 기록과 대조한다. 서버 전용, 읽기만 한다.
 *
 * **인물 텍스트 대조는 없다.** 제작과 서비스가 같은 DB 안에 있어 견줄 상대가 없기 때문이다(문서 §4).
 * 남는 항목은 일곱이다.
 *   ① 셀럽이 해소되지 않은 인물 — 출간이 막힌다
 *   ② 태그가 지정되지 않은 세력 — 출간이 막힌다
 *   ③ 개인샷·그룹샷의 저장소 동기 상태 — 매니페스트 해시 대조
 *   ④ 얼굴 사진(아바타) 유무 — 도감 목록이 얼굴을 쓴다
 *   ⑤ 신화 표시 ↔ 셀럽 등급(fiction) 어긋남
 *   ⑥ 대사 목소리 ↔ 셀럽 목소리 대조 — 국문·영문 각각. 어긋남을 알리기만 한다
 *   ⑦ 테마 간판 ↔ 제작 표기 대조 — 테마 이름은 세력·테마 양쪽에 각각 있어(매체별 표기)
 *      소속 재편으로 간판이 낡아도 시스템이 모른다. 영문(name_en) 기준으로 견줘 알리기만 한다
 */

import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import {
  collectEpisode, hashOfFile, logoKey, personPortraitKey, personVoiceKey, soloShotKey, tagKeyOf, teamShotKey,
  type PublishEpisode, type PublishGroup, type PublishPerson,
} from './collect'
import { readManifest, type FactionSyncManifest } from './manifest'
import {
  PROFILE_COLUMNS, TAG_COLUMNS, toImageArray,
  type CelebProfileRow, type CelebTagRow,
} from './database'
import type {
  FactionImageSyncSummary, FactionSyncGroup, FactionSyncLinkState, FactionSyncPerson,
  FactionSyncSignboardMismatch, FactionSyncSoloShotState, FactionSyncStatus,
  FactionSyncVoiceState, FactionSyncVoicePair, FactionVoiceLocale,
} from './types'

/**
 * 서비스 쪽 현재 상태 한 벌 — 태그·프로필. 인물마다 조회하지 않고 편 단위로 묶어 긁는다.
 * 배정 테이블은 보지 않는다 — 인물 텍스트·개인샷의 집이 faction_people(web_* 칸)로 옮겨져(26.08.03)
 * 출간·진단이 배정에서 읽을 것이 없다.
 */
export interface ServiceSnapshot {
  /** celeb_tags.id → 행 */
  tagsById: Map<string, CelebTagRow>
  /** celeb_tags.slug → 행 (태그 미연결 세력의 연결 키 해소용) */
  tagsBySlug: Map<string, CelebTagRow>
  /** celebs.id → 프로필 */
  celebsById: Map<string, CelebProfileRow>
}

async function inChunks(
  db: DatabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]))
  }
  return out
}

/**
 * 서비스 현황 조회 — 태그 2회(id·slug), 프로필 1회.
 * `celebs: false` 면 인물 조회를 뺀다 — 사진 동기 집계처럼 태그 해소만 필요한 자리용.
 */
export async function loadServiceSnapshot(
  db: DatabaseClient, episode: PublishEpisode, opts?: { celebs?: boolean },
): Promise<ServiceSnapshot> {
  const tagIds = [...new Set(episode.groups.map(g => g.tagId).filter((v): v is string => !!v))]
  const tagSlugs = [...new Set(episode.groups.map(g => g.tagSlug).filter((v): v is string => !!v))]
  const celebIds = [...new Set(episode.groups.flatMap(g => g.people.map(p => p.celebId).filter((v): v is string => !!v)))]

  const tagsById = new Map<string, CelebTagRow>()
  const tagsBySlug = new Map<string, CelebTagRow>()
  const remember = (rows: CelebTagRow[]) => {
    for (const row of rows) {
      tagsById.set(row.id, row)
      if (row.slug) tagsBySlug.set(row.slug, row)
    }
  }
  if (tagIds.length) remember(await inChunks(db, 'celeb_tags', 'id', tagIds, TAG_COLUMNS) as unknown as CelebTagRow[])
  if (tagSlugs.length) remember(await inChunks(db, 'celeb_tags', 'slug', tagSlugs, TAG_COLUMNS) as unknown as CelebTagRow[])

  const celebsById = new Map<string, CelebProfileRow>()
  if (opts?.celebs !== false && celebIds.length) {
    const rows = await inChunks(db, 'celebs', 'id', celebIds, PROFILE_COLUMNS)
    for (const row of rows as unknown as CelebProfileRow[]) celebsById.set(row.id, row)
  }

  return { tagsById, tagsBySlug, celebsById }
}

/**
 * 세력의 태그 해소 — `tag_id` 가 먼저고, 없으면 데이터에 적힌 연결 키로 찾는다.
 *
 * 연결 키로 찾아지는 경우가 실제로 있다: 태그가 없던 때 저장했으면 `tag_id` 가 null 로 남고,
 * 그 뒤 태그가 생겨도 다시 저장하기 전까지는 이어지지 않는다. 출간이 그 자리에서 이어 준다.
 */
export function resolveTag(
  group: { tagId: string | null; tagSlug: string | null }, snap: ServiceSnapshot,
): CelebTagRow | undefined {
  if (group.tagId) {
    const byId = snap.tagsById.get(group.tagId)
    if (byId) return byId
  }
  if (group.tagSlug) return snap.tagsBySlug.get(group.tagSlug)
  return undefined
}

/** 인물의 셀럽 연결 상태 */
export function linkStateOf(p: PublishPerson): FactionSyncLinkState {
  if (p.celebId) return 'linked'
  return p.slug ? 'unresolved' : 'unkeyed'
}

function soloShotStateOf(
  hash: string | null,
  dbUrl: string | null | undefined,
  expectedKey: string | null,
  tagId: string | null,
  manifest: FactionSyncManifest,
  rel: string,
): FactionSyncSoloShotState {
  const hasDb = !!dbUrl?.trim()
  if (!hash) return hasDb ? 'db-only' : 'none'
  if (!hasDb) return 'local-only'
  const entry = manifest[rel]
  const same = !!entry
    && entry.hash === hash
    && (!expectedKey || entry.r2Key === expectedKey)
    && (!tagId || entry.tagId === tagId)
  return same ? 'synced' : 'stale'
}

/** 대표 한 장뿐 아니라 imageChanges 전량·대사 wav·DB 타임라인까지 한 벌로 대조한다. */
async function personMediaStateOf(
  p: PublishPerson,
  tagId: string | null,
  manifest: FactionSyncManifest,
): Promise<{ state: FactionSyncSoloShotState; fileMissing: number }> {
  const hasDb = !!p.webImageUrl?.trim()
  if (!p.portraits.length) return { state: hasDb ? 'db-only' : 'none', fileMissing: 0 }
  if (!tagId || !p.celebId) return { state: hasDb ? 'stale' : 'local-only', fileMissing: 0 }

  let filesMissing = 0
  let filesSynced = true
  const expectedImages: Array<{ at: number; matchUrl: (url: string) => boolean }> = []

  for (const [index, portrait] of p.portraits.entries()) {
    if (portrait.image.external) {
      expectedImages.push({ at: portrait.at, matchUrl: url => url === portrait.image.raw })
      continue
    }
    const hash = await hashOfFile(portrait.image.abs)
    if (!hash) {
      filesMissing += 1
      filesSynced = false
      expectedImages.push({ at: portrait.at, matchUrl: () => false })
      continue
    }
    const key = index === 0
      ? soloShotKey(tagId, p.celebId)
      : personPortraitKey(tagId, p.celebId, index + 1, hash)
    const entry = manifest[portrait.image.rel]
    if (!entry || entry.hash !== hash || entry.r2Key !== key || entry.tagId !== tagId) filesSynced = false
    expectedImages.push({ at: portrait.at, matchUrl: url => url.includes(key) })
  }

  const voiceHash = await hashOfFile(p.voice.abs)
  if (!voiceHash && p.quoteDuration) filesMissing += 1
  let voiceMatches = true
  if (voiceHash) {
    const key = personVoiceKey(tagId, p.celebId, voiceHash)
    const entry = manifest[p.voice.rel]
    voiceMatches = !!entry && entry.hash === voiceHash && entry.r2Key === key && entry.tagId === tagId
      && !!p.webQuoteMedia?.audioUrl?.includes(key)
  } else if (p.webQuoteMedia?.audioUrl) {
    voiceMatches = false
  }

  const media = p.webQuoteMedia
  const imagesMatch = !!media
    && media.images.length === expectedImages.length
    && expectedImages.every((expected, i) => {
      const actual = media.images[i]
      return !!actual && Math.abs(actual.at - expected.at) < 0.001 && expected.matchUrl(actual.url)
    })
  const coverMatches = !!p.webImageUrl && expectedImages[0]?.matchUrl(p.webImageUrl)
  if (!hasDb) return { state: 'local-only', fileMissing: filesMissing }
  return {
    state: filesSynced && voiceMatches && imagesMatch && coverMatches ? 'synced' : 'stale',
    fileMissing: filesMissing,
  }
}

/**
 * 신화 표시 ↔ 셀럽 등급 어긋남.
 * 제작 데이터가 신화라 했는데 셀럽 등급이 fiction 이 아니거나, 반대로 fiction 인데 표시가 없는 경우다.
 * 어느 쪽이 맞는지는 사람이 판단하므로 출간을 막지 않고 알리기만 한다.
 */
function tierMismatchOf(mythical: boolean, tier: string | undefined): boolean {
  if (!tier) return false
  return mythical !== (tier === 'fiction')
}

/**
 * 대사 목소리 대조 — 제작 데이터의 대사 목소리와 셀럽 프로필의 **같은 언어** 목소리를 견준다.
 * 어느 쪽이 맞는지는 사람이 정하므로 출간을 막지 않고 알리기만 한다(등급 어긋남과 같은 성격이다).
 */
export function voiceStateOf(
  personVoiceId: string | undefined, profileVoiceId: string | null | undefined,
): FactionSyncVoiceState {
  const mine = personVoiceId?.trim() ?? ''
  const theirs = profileVoiceId?.trim() ?? ''
  if (!mine && !theirs) return 'both-empty'
  if (!mine) return 'profile-only'
  if (!theirs) return 'person-only'
  return mine === theirs ? 'same' : 'different'
}

/** 국문·영문을 각각 대조한다 — 셀럽 프로필이 언어별 목소리를 따로 들고 있기 때문이다 */
function voicePairOf(p: PublishPerson, profile: CelebProfileRow): FactionSyncVoicePair {
  return {
    ko: voiceStateOf(p.quoteVoiceIds.ko, profile.voice_id_ko),
    en: voiceStateOf(p.quoteVoiceIds.en, profile.voice_id_en),
  }
}

/** 언어별 인원 집계 — 셀럽이 안 이어진 인물은 값이 없어 자연히 빠진다 */
function countByLocale(
  people: FactionSyncPerson[], state: FactionSyncVoiceState,
): Record<FactionVoiceLocale, number> {
  return {
    ko: people.filter(p => p.voice?.ko === state).length,
    en: people.filter(p => p.voice?.en === state).length,
  }
}

/* ── 진단 ⑦ — 테마 간판 대조 ── */

/**
 * 간판 정규화 — 표기 잡음을 걷어낸 뒤 견준다: 공백, 대소문자, 구분 부호(하이픈·마침표·쉼표·
 * 가운뎃점·따옴표·괄호·앰퍼샌드·빗금), 전각·합자(NFKC). "Open AI"="OpenAI", "X.com"="X-Com" 처럼
 * 매체별 띄어쓰기·부호 차이는 어긋남이 아니다. 걷어내는 건 여기까지다 — 낱말 자체가 다르면 알린다.
 */
export function normalizeSignboard(v: string | null | undefined): string {
  return (v ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_.,·:;'’"“”()&/]+/g, '')
}

/**
 * 테마 간판 어긋남 수집 — 이 편의 각 연결 태그에 대해 제작 쪽 표기와 견준다.
 *
 * - 태그에 연결된 세력이 이 편에서 하나뿐이면: 그 세력 명칭(영문 1행)과 견준다.
 * - 여러 세력이 한 태그를 나눠 쓰면: 세력명 어느 하나와 같기를 기대할 수 없으므로 편 제목(영문)과 견준다.
 * - **영문(name_en)끼리만 견준다** — 한글은 도감용 의역 등 매체별 표기 차이가 정상이라 오탐이 된다.
 *   어느 한쪽이라도 영문 표기가 없으면 판정을 보류한다(억지 대조는 오탐만 낳는다).
 *
 * 오류가 아니라 확인 요망이다 — 소속 재편으로 간판이 낡은 경우(뉴럴링크 사건)를 잡는 것이 목적이고,
 * 단순 표기 다듬기면 사람이 무시하면 된다. 출간을 막지 않는다.
 */
export function collectSignboardMismatches(
  episode: PublishEpisode, snap: ServiceSnapshot,
): FactionSyncSignboardMismatch[] {
  // 같은 태그를 나눠 쓰는 세력을 한 자리에 모은다 — 해소된 태그 행(id)이 묶음 기준이다
  const byTag = new Map<string, { tag: CelebTagRow; groups: PublishGroup[] }>()
  for (const g of episode.groups) {
    const tag = resolveTag(g, snap)
    if (!tag) continue
    const entry = byTag.get(tag.id)
    if (entry) entry.groups.push(g)
    else byTag.set(tag.id, { tag, groups: [g] })
  }

  const out: FactionSyncSignboardMismatch[] = []
  for (const { tag, groups } of byTag.values()) {
    const tagNameEn = tag.name_en?.trim()
    if (!tagNameEn) continue
    const single = groups.length === 1
    const sourceName = single ? groups[0].name : (episode.title ?? episode.folder)
    const sourceNameEn = (single ? groups[0].nameEn : episode.titleEn)?.trim()
    if (!sourceNameEn) continue
    if (normalizeSignboard(tagNameEn) === normalizeSignboard(sourceNameEn)) continue
    out.push({
      tagId: tag.id,
      tagName: tag.name,
      tagNameEn,
      source: single ? 'group' : 'episode',
      sourceName,
      sourceNameEn,
      groupNames: groups.map(g => g.name),
    })
  }
  return out
}

/** 에피소드 진단 — 읽기 전용 보고 */
export async function buildStatus(db: DatabaseClient, folder: string): Promise<FactionSyncStatus> {
  const episode = await collectEpisode(db, folder)
  const [snap, manifest] = await Promise.all([loadServiceSnapshot(db, episode), readManifest(folder)])

  const groups: FactionSyncGroup[] = []
  for (const g of episode.groups) {
    const tag = resolveTag(g, snap)
    const tagId = tag?.id ?? null

    const people: FactionSyncPerson[] = []
    for (const p of g.people) {
      const profile = p.celebId ? snap.celebsById.get(p.celebId) : undefined
      const personMedia = await personMediaStateOf(p, tagId, manifest)
      const tier = profile?.celeb_tier ?? undefined
      people.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        celebId: p.celebId,
        mythical: p.mythical,
        link: linkStateOf(p),
        // 도감에 실린 개인샷 주소의 집은 faction_people.web_image_url 이다(단일 원천)
        soloShot: personMedia.state,
        avatar: !!profile?.avatar_url,
        tier,
        tierMismatch: tierMismatchOf(p.mythical, tier),
        // 정상 DB 행은 항상 프로필이 있다. 값이 없으면 무결성 오류라 대조 결과도 두지 않는다.
        ...(profile ? { voice: voicePairOf(p, profile) } : {}),
      })
    }

    let teamLocal = 0
    let teamSynced = 0
    for (const shot of g.teamShots) {
      if (shot.image.external) continue
      const hash = await hashOfFile(shot.image.abs)
      if (!hash) continue
      teamLocal += 1
      const entry = manifest[shot.image.rel]
      const expected = tagId ? teamShotKey(tagId, g.position, shot.num, hash) : null
      if (entry && entry.hash === hash && (!expected || entry.r2Key === expected)) teamSynced += 1
    }

    groups.push({
      index: g.index,
      position: g.position,
      name: g.name,
      tagId,
      tagSlug: g.tagSlug,
      suggestedSlug: g.suggestedSlug,
      tag: {
        exists: !!tag,
        id: tag?.id,
        name: tag?.name,
        isFeatured: tag?.is_featured ?? undefined,
        teamImagesCount: toImageArray(tag?.team_images).length,
      },
      // tagTotal 은 아래에서 태그 단위로 합산해 채운다
      teamShots: { local: teamLocal, synced: teamSynced, tagTotal: teamLocal },
      people,
    })
  }

  // team_images 는 태그 하나의 배열이다 — 태그를 나눠 쓰는 세력들의 로컬 장수 합을 함께 실어
  // 화면이 "이 세력 1장인데 도감은 4장"을 어긋남으로 오해하지 않게 한다.
  const localByTag = new Map<string, number>()
  episode.groups.forEach((g, i) => {
    const key = tagKeyOf(g)
    localByTag.set(key, (localByTag.get(key) ?? 0) + groups[i].teamShots.local)
  })
  episode.groups.forEach((g, i) => {
    groups[i].teamShots.tagTotal = localByTag.get(tagKeyOf(g)) ?? groups[i].teamShots.local
  })

  const allPeople = groups.flatMap(g => g.people)
  const signboardMismatches = collectSignboardMismatches(episode, snap)
  return {
    folder,
    groups,
    signboardMismatches,
    summary: {
      groups: groups.length,
      groupsUnlinked: groups.filter(g => !g.tagId && !g.tag.exists).length,
      people: allPeople.length,
      publishable: allPeople.filter(p => p.link === 'linked').length,
      blocked: allPeople.filter(p => p.link !== 'linked').length,
      soloShotPending: allPeople.filter(p => p.soloShot === 'stale' || p.soloShot === 'local-only').length,
      teamShotPending: groups.reduce((s, g) => s + Math.max(0, g.teamShots.local - g.teamShots.synced), 0),
      avatarMissing: allPeople.filter(p => p.link === 'linked' && !p.avatar).length,
      tierMismatch: allPeople.filter(p => p.tierMismatch).length,
      signboardMismatch: signboardMismatches.length,
      voiceDifferent: countByLocale(allPeople, 'different'),
      voiceFillable: countByLocale(allPeople, 'profile-only'),
    },
  }
}

/**
 * 사진 동기 집계 — 편 편집기 헤더 배지용. 진단 ③(저장소 동기)만 떼어 **같은 판정 규칙**으로 센다.
 *
 * 전체 진단(`buildStatus`)보다 싸게 간다: 프로필 조회를 빼고(태그 해소만 필요),
 * 목소리·등급·간판 대조를 하지 않는다. DB 조회는 편 수집 + 태그 두 번이 전부다.
 *
 *   개인샷 — `soloShotStateOf` 그대로: 매니페스트 해시·키·태그 + 도감 주소(web_image_url) 대조
 *   그룹샷 — `buildStatus` 의 세력별 대조와 동일: 매니페스트 해시 + (태그가 해소됐으면) R2 키
 *   로고   — 출간(publishGroupLogo)과 같은 재료: 매니페스트 + web_logo_url, 키는 `logoKey`
 *
 * 파일이 없는 항목(file-missing)은 미반영이 아니라 별도 수다 — 출간이 해소하지 못하므로
 * 미반영에 섞으면 배지가 영영 안 꺼진다.
 */
export async function buildImageSyncSummary(
  db: DatabaseClient, folder: string,
): Promise<FactionImageSyncSummary> {
  const episode = await collectEpisode(db, folder)
  const [snap, manifest] = await Promise.all([
    loadServiceSnapshot(db, episode, { celebs: false }),
    readManifest(folder),
  ])

  const out: FactionImageSyncSummary = { solo: 0, team: 0, logo: 0, fileMissing: 0 }
  const pending = (s: FactionSyncSoloShotState) => s === 'stale' || s === 'local-only'

  for (const g of episode.groups) {
    const tagId = resolveTag(g, snap)?.id ?? null

    for (const p of g.people) {
      const media = await personMediaStateOf(p, tagId, manifest)
      out.fileMissing += media.fileMissing
      if (pending(media.state)) out.solo += 1
    }

    for (const shot of g.teamShots) {
      if (shot.image.external) continue
      const hash = await hashOfFile(shot.image.abs)
      if (!hash) { out.fileMissing += 1; continue }
      const entry = manifest[shot.image.rel]
      const expected = tagId ? teamShotKey(tagId, g.position, shot.num, hash) : null
      const same = !!entry && entry.hash === hash && (!expected || entry.r2Key === expected)
      if (!same) out.team += 1
    }

    if (g.logo && !g.logo.external) {
      const hash = await hashOfFile(g.logo.abs)
      if (!hash) out.fileMissing += 1
      else {
        const key = tagId ? logoKey(tagId, g.position, hash) : null
        if (pending(soloShotStateOf(hash, g.webLogoUrl, key, tagId, manifest, g.logo.rel))) out.logo += 1
      }
    }
  }
  return out
}
