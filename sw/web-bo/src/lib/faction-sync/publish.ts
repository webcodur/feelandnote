/**
 * 출간 — 제작 데이터(faction_*)의 사진·영상·음악·태그를 서비스 세력도감(celeb_tags)과
 * 이미지 저장소에 반영한다. 서버 전용.
 *
 * **인물 텍스트(대사·직함·소개)는 다루지 않는다(26.08.03 단일화).** 웹·BO 모두 DB 뷰
 * `faction_atlas_members` 로 faction_people 을 직접 읽으므로 복사할 것이 없다.
 * 도감 한줄 직함은 lines[0]을 그대로 쓰고, 상세 소개·개인샷·숨김만 같은 행의 web_* 칸에서 손질한다.
 *
 * 순서: 태그 → 개인샷 → 세력 로고 → 그룹샷 → 영상 → 음악 → 웹 캐시 비우기.
 * 지키는 규칙:
 *   ① 태그 이름·색은 채움 전용 — 도감이 비어 있을 때만 넣는다. force 를 켜면 덮어쓴다.
 *   ② 셀럽이 해소되지 않은 인물은 건드리지 않고 명단으로 보고한다.
 *   ③ 미리보기(dryRun)는 쓰기 직전까지 똑같이 계산하고 아무것도 쓰지 않는다(매니페스트도).
 *   ④ 같은 셀럽이 한 태그 안 여러 자리에 있으면 **자리가 가장 앞인** 배치에만 개인샷 주소를
 *      기록한다 — 뷰가 앞자리 행을 채택하기 때문이다(§4 배치 충돌 규칙).
 * 항목 하나가 실패해도 전체를 멈추지 않고 그 항목만 blocked 로 담는다.
 */

import { readFile } from 'fs/promises'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { FactionQuoteMedia } from '@feelandnote/shared/lib/faction-quote-media'
import {
  serializeTeamImages, toTeamImages, type FactionTeamImage,
} from '@feelandnote/shared/lib/faction-team-image'
import { revalidateWebCache } from '@/lib/revalidate-web'
import {
  collectEpisode, groupsOfSameTag, hashOfFile, logoKey, personPortraitKey, personVoiceKey,
  soloShotKey, tagKeyOf, teamShotKey, winningPlacements,
  type PublishEpisode, type PublishGroup, type PublishPerson,
} from './collect'
import { linkStateOf, loadServiceSnapshot, resolveTag, type ServiceSnapshot } from './diagnose'
import { fileHash, isUnchanged, readManifest, writeManifest, type FactionSyncManifest } from './manifest'
import { OUTPUT_CONTENT_TYPE, toLogo, toSoloShot, toTeamShot } from './image'
import { missingR2Env, publicUrl, uploadToR2 } from './r2'
import { buildTagVideos, loadEpisodeVideoSource, videosChanged, type EpisodeVideoSource } from './videos'
import {
  ensureMusicUploaded, loadEpisodeMusicSource, musicChanged, pickTagMusic,
  type EpisodeMusicSource, type TagMusic,
} from './music'
import { TAG_COLUMNS, type CelebTagRow } from './supabase'
import type {
  FactionPublishAction, FactionPublishItem, FactionPublishRequest,
  FactionPublishResult, FactionPublishScope,
} from './types'

/** 실제로 실행되는 범위 — deprecated no-op 키(assignments·descs)를 걸러낸 여섯 항목 */
type ActiveScope = Required<Pick<FactionPublishScope, 'tag' | 'personImages' | 'logos' | 'teamImages' | 'videos' | 'music'>>

const ALL_SCOPE: ActiveScope = {
  tag: true,
  personImages: true,
  logos: true,
  teamImages: true,
  videos: true,
  music: true,
}

/**
 * 범위 정규화 — 아무것도 켜지 않았으면 전 항목 실행.
 * no-op 키만 켠 요청(옛 스크립트의 텍스트 전용 범위)은 전 항목으로 승격하지 않고 아무것도 안 한다.
 */
function normalizeScope(scope?: FactionPublishScope): ActiveScope {
  if (!scope || !Object.values(scope).some(v => v === true)) return ALL_SCOPE
  return {
    tag: !!scope.tag,
    personImages: !!scope.personImages,
    logos: !!scope.logos,
    teamImages: !!scope.teamImages,
    videos: !!scope.videos,
    music: !!scope.music,
  }
}

/**
 * 채움 전용 판정(태그 이름·색) — 넣을 값이 있으면 반환, 손대지 않아야 하면 undefined.
 * 도감에 사람이 다듬어 넣은 값이 있으면 force 없이는 절대 덮지 않는다.
 */
function fillValue(dbValue: string | null | undefined, localValue: string | undefined, force: boolean): string | undefined {
  if (localValue === undefined) return undefined
  const current = dbValue ?? ''
  if (current.trim() && !force) return undefined
  if (current === localValue) return undefined
  return localValue
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 출간 실행 */
export async function publishEpisode(
  db: SupabaseClient, req: FactionPublishRequest,
): Promise<FactionPublishResult> {
  const { folder, groupIndex, dryRun = false, force = false } = req
  const scope = normalizeScope(req.scope)

  const episode = await collectEpisode(db, folder)
  const targets = typeof groupIndex === 'number'
    ? episode.groups.filter(g => g.index === groupIndex)
    : episode.groups
  if (typeof groupIndex === 'number' && !targets.length) {
    throw new Error(`세력 ${groupIndex} 를 찾을 수 없습니다`)
  }

  const snap = await loadServiceSnapshot(db, episode)
  const manifest = await readManifest(folder)
  const winners = winningPlacements(episode)

  const items: FactionPublishItem[] = []
  const warnings: string[] = []
  const newTagSlugs: string[] = []
  let manifestDirty = false

  const r2Missing = missingR2Env()
  if ((scope.personImages || scope.teamImages) && r2Missing.length) {
    warnings.push(`미디어 저장소 환경변수 누락으로 사진·음성을 올릴 수 없습니다: ${r2Missing.join(', ')}`)
  }
  const canUpload = r2Missing.length === 0

  const add = (item: FactionPublishItem) => { items.push(item) }

  // 한 태그를 여러 세력이 나눠 쓰는 편이 있다(페이팔 마피아 4세력·디지털 레지스탕스 6세력 → 태그 1개).
  // 태그 자체는 첫 세력에서 한 번만 손대고, 나머지는 같은 태그임을 알리고 넘어간다.
  const tagTouched = new Set<string>()
  /** 이번 호출에서 새로 만든 태그 — 뒤 세력도감 같은 행을 보게 담아 둔다 */
  const createdTags = new Map<string, CelebTagRow>()

  for (const g of targets) {
    /* ── 1. 태그 ── */
    const resolved = await resolveOrCreateTag({
      group: g, snap, createdTags, db, scope, dryRun, force, add, newTagSlugs, tagTouched,
    })
    if (!resolved) continue
    const tag = resolved
    const tagId = tag.id
    const tagKey = tagKeyOf(g)

    /* ── 2. 개인샷 — R2 업로드 후 주소를 faction_people.web_image_url 에 기록 ── */
    if (scope.personImages) {
      for (const p of g.people) {
        const label = { kind: 'soloShot' as const, group: g.name, person: p.name }
        if (!p.celebId) {
          const state = linkStateOf(p)
          add({ ...label, action: 'blocked', reason: state === 'unkeyed' ? 'unkeyed' : 'celeb-unresolved' })
          continue
        }
        const celebId = p.celebId

        // §4 배치 충돌 — 뷰가 태그 안 같은 셀럽의 앞자리 행을 채택하므로 주소도 그 행에만 기록한다.
        // 판정은 편 전체를 보고 하므로, 세력을 하나씩 출간해도 결과가 같다.
        const winnerId = winners.get(`${tagKey}:${celebId}`)
        if (winnerId && winnerId !== p.id) {
          add({ ...label, action: 'skipped', reason: 'duplicate-in-tag (앞 자리 배치 채택)' })
          continue
        }

        await publishPersonMedia({
          person: p,
          group: g,
          tagId,
          db,
          manifest,
          dryRun,
          canUpload,
          add,
          markDirty: () => { manifestDirty = true },
        })
      }
    }

    /* ── 3. 세력 로고 — R2 업로드 후 주소를 faction_groups.web_logo_url 에 기록 ── */
    if (scope.logos) {
      await publishGroupLogo({
        group: g, tagId, db, manifest, dryRun, canUpload, add,
        markDirty: () => { manifestDirty = true },
      })
    }
  }

  /* ── 4. 그룹샷 — 세력이 아니라 태그 단위 ── */
  if (scope.teamImages) {
    const seen = new Set<string>()
    for (const g of targets) {
      const key = tagKeyOf(g)
      if (seen.has(key)) continue
      seen.add(key)
      const tag = resolveTag(g, snap) ?? (g.tagSlug ? createdTags.get(g.tagSlug) : undefined)
      if (!tag) continue // 태그가 없으면 위에서 이미 blocked 로 보고했다
      await publishTagTeamShots({
        tag,
        groups: groupsOfSameTag(episode, g),
        db,
        manifest,
        dryRun,
        canUpload,
        add,
        markDirty: () => { manifestDirty = true },
      })
    }
  }

  /* ── 5. 테마 영상 — 그룹샷과 마찬가지로 태그 단위 ── */
  if (scope.videos) {
    await publishVideos({ episode, targets, snap, createdTags, db, dryRun, add, warnings })
  }

  /* ── 6. 테마 배경음악 — 영상과 마찬가지로 태그 단위 ── */
  if (scope.music) {
    await publishMusic({ episode, targets, snap, createdTags, db, dryRun, add, warnings })
  }

  /* ── 7. 웹 캐시 비우기 ── */
  const wrote = items.some(i => i.action === 'created' || i.action === 'updated')
  if (dryRun) {
    add({ kind: 'revalidate', group: '-', action: 'skipped', reason: 'dry-run' })
  } else if (!wrote) {
    add({ kind: 'revalidate', group: '-', action: 'skipped', reason: 'no-change' })
  } else {
    // 도감(TAGS)과 셀럽(CELEBS) 두 도메인만 — 제작 데이터는 서비스에 나오지 않으므로 그 밖은 불필요하다
    await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
    add({ kind: 'revalidate', group: '-', action: 'updated', reason: `${CACHE_TAGS.TAGS}, ${CACHE_TAGS.CELEBS}` })
  }

  if (manifestDirty && !dryRun) await writeManifest(folder, manifest)

  return {
    folder,
    dryRun,
    force,
    items,
    summary: {
      created: items.filter(i => i.action === 'created').length,
      updated: items.filter(i => i.action === 'updated').length,
      skipped: items.filter(i => i.action === 'skipped').length,
      blocked: items.filter(i => i.action === 'blocked').length,
    },
    ...(newTagSlugs.length ? { constantHint: newTagSlugs } : {}),
    ...(warnings.length ? { warnings } : {}),
  }
}

/* ────────────────────────── 개인 화보 + 팩션 대사 ────────────────────────── */

const VOICE_CONTENT_TYPE = 'audio/wav'

/** JSONB 비교용 — 출간 시각 같은 휘발값이 없으므로 구조 비교면 충분하다. */
function sameQuoteMedia(a: FactionQuoteMedia | null, b: FactionQuoteMedia): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * 개인샷 범위는 대표 한 장이 아니라 한 인물의 **재생 한 벌**이다.
 * 기본 화보·quoteImage·imageChanges 전량과 위치 기반 대사 wav를 올린 뒤, 모두 성공했을 때만
 * web_image_url(호환 표지)과 web_quote_media(웹 재생 계약)를 한 UPDATE로 기록한다.
 */
async function publishPersonMedia(ctx: {
  person: PublishPerson
  group: PublishGroup
  tagId: string
  db: SupabaseClient
  manifest: FactionSyncManifest
  dryRun: boolean
  canUpload: boolean
  add: (item: FactionPublishItem) => void
  markDirty: () => void
}): Promise<void> {
  const { person: p, group: g, tagId, db, manifest, dryRun, canUpload, add, markDirty } = ctx
  const label = { kind: 'soloShot' as const, group: g.name, person: p.name }
  if (!p.celebId) { add({ ...label, action: 'blocked', reason: 'celeb-unresolved' }); return }
  if (!p.portraits.length) { add({ ...label, action: 'skipped', reason: 'no-image' }); return }

  type PreparedImage = {
    ref: PublishPerson['portraits'][number]['image']
    at: number
    focus: PublishPerson['portraits'][number]['focus']
    key: string | null
    hash: string | null
    url: string
    unchanged: boolean
  }
  const images: PreparedImage[] = []
  for (const [index, portrait] of p.portraits.entries()) {
    const ref = portrait.image
    if (ref.external) {
      images.push({ ref, at: portrait.at, focus: portrait.focus, key: null, hash: null, url: ref.raw, unchanged: true })
      continue
    }
    const hash = await hashOfFile(ref.abs)
    if (!hash) { add({ ...label, action: 'blocked', reason: `file-missing: ${ref.rel}` }); return }
    const key = index === 0
      ? soloShotKey(tagId, p.celebId)
      : personPortraitKey(tagId, p.celebId, index + 1, hash)
    const unchanged = isUnchanged(manifest[ref.rel], hash, key, tagId)
    const url = index === 0 && p.webImageUrl?.includes(key)
      ? p.webImageUrl
      : publicUrl(key, false)
    images.push({ ref, at: portrait.at, focus: portrait.focus, key, hash, url, unchanged })
  }

  const voiceHash = await hashOfFile(p.voice.abs)
  const voiceKey = voiceHash ? personVoiceKey(tagId, p.celebId, voiceHash) : null
  const voiceUnchanged = !!voiceHash && !!voiceKey
    && isUnchanged(manifest[p.voice.rel], voiceHash, voiceKey, tagId)
  const audioUrl = voiceKey ? publicUrl(voiceKey, false) : null

  const buildMedia = (coverImages: PreparedImage[]): FactionQuoteMedia => ({
    version: 1,
    locale: 'ko',
    audioUrl,
    playbackRate: p.quotePlaybackRate,
    duration: audioUrl ? p.quoteDuration : null,
    images: coverImages.map(image => ({
      url: image.url,
      at: image.at,
      ...(image.focus ? { focus: image.focus } : {}),
    })),
    captions: p.captions,
  })
  const predicted = buildMedia(images)
  const coverUrl = images[0].url
  const mediaSame = p.webImageUrl === coverUrl && sameQuoteMedia(p.webQuoteMedia, predicted)
  const localImagesSame = images.every(image => image.unchanged)
  const voiceSame = !voiceKey || voiceUnchanged
  if (mediaSame && localImagesSame && voiceSame) {
    add({ ...label, action: 'skipped', reason: `unchanged (${images.length}장${audioUrl ? ' + 음성' : ''})` })
    return
  }

  const action: FactionPublishAction = p.webImageUrl || p.webQuoteMedia ? 'updated' : 'created'
  const reason = `${images.length}장${audioUrl ? ' + 팩션 음성' : ' · 음성 없음'}`
  if (dryRun) { add({ ...label, action, reason }); return }
  const needsUpload = images.some(image => image.key && !image.unchanged) || (!!voiceKey && !voiceUnchanged)
  if (needsUpload && !canUpload) { add({ ...label, action: 'blocked', reason: 'r2-env-missing' }); return }

  try {
    const now = new Date().toISOString()
    for (const [index, image] of images.entries()) {
      if (!image.key || !image.hash || image.unchanged) continue
      const webp = await toSoloShot(await readFile(image.ref.abs))
      await uploadToR2(image.key, webp, OUTPUT_CONTENT_TYPE)
      // 첫 장만 고정 키다. 교체 직후 브라우저 캐시를 끊고, 이후 DB 값은 그대로 재사용한다.
      image.url = publicUrl(image.key, index === 0)
      manifest[image.ref.rel] = { hash: image.hash, r2Key: image.key, uploadedAt: now, tagId }
      markDirty()
    }
    if (voiceKey && voiceHash && !voiceUnchanged) {
      await uploadToR2(voiceKey, await readFile(p.voice.abs), VOICE_CONTENT_TYPE)
      manifest[p.voice.rel] = { hash: voiceHash, r2Key: voiceKey, uploadedAt: now, tagId }
      markDirty()
    }

    const media = buildMedia(images)
    const finalCoverUrl = images[0].url
    const { error } = await db.from('faction_people').update({
      web_image_url: finalCoverUrl,
      web_quote_media: media,
    }).eq('id', p.id)
    if (error) { add({ ...label, action: 'blocked', reason: `web-media-update: ${error.message}` }); return }
    p.webImageUrl = finalCoverUrl
    p.webQuoteMedia = media
    add({ ...label, action, reason })
  } catch (e) {
    add({ ...label, action: 'blocked', reason: `upload: ${errText(e)}` })
  }
}

/* ────────────────────────── 세력 로고 ────────────────────────── */

/**
 * 세력 로고를 올린다 — 로고(data.logoImg)가 지정된 세력만 항목을 낸다(대부분의 세력엔 로고가 없다).
 *
 * 그룹샷과 같은 규칙이다: 원본 해시가 키에 들어가 로고가 바뀌면 키가 갈리고,
 * 매니페스트 해시가 같으면(이미 도감 주소도 그 키면) 건너뛴다. 다른 점은 변환뿐 —
 * 세로형 로고가 실재해 정사각 크롭 없이 비율을 유지한다(`toLogo`).
 * 성공하면 주소를 faction_groups.web_logo_url 에 기록한다(뷰 group_logo_url 의 원천).
 * 태그 미지정 세력은 이 함수까지 오지 못한다 — 태그 단계가 이미 blocked 로 보고하고 편을 건너뛴다.
 */
async function publishGroupLogo(ctx: {
  group: PublishGroup
  tagId: string
  db: SupabaseClient
  manifest: FactionSyncManifest
  dryRun: boolean
  canUpload: boolean
  add: (item: FactionPublishItem) => void
  markDirty: () => void
}): Promise<void> {
  const { group: g, tagId, db, manifest, dryRun, canUpload, add, markDirty } = ctx
  if (!g.logo) return
  const label = { kind: 'logo' as const, group: g.name }

  if (g.logo.external) { add({ ...label, action: 'skipped', reason: 'external-url' }); return }

  const hash = await hashOfFile(g.logo.abs)
  if (!hash) { add({ ...label, action: 'blocked', reason: `file-missing: ${g.logo.rel}` }); return }

  const key = logoKey(tagId, g.position, hash)
  if (isUnchanged(manifest[g.logo.rel], hash, key, tagId) && g.webLogoUrl?.includes(key)) {
    add({ ...label, action: 'skipped', reason: 'unchanged' })
    return
  }
  const action: FactionPublishAction = g.webLogoUrl ? 'updated' : 'created'
  if (dryRun) { add({ ...label, action, reason: key }); return }
  if (!canUpload) { add({ ...label, action: 'blocked', reason: 'r2-env-missing' }); return }

  try {
    const webp = await toLogo(await readFile(g.logo.abs))
    await uploadToR2(key, webp, OUTPUT_CONTENT_TYPE)
    // 키에 해시가 들어가 저절로 갈리므로 캐시 무력화(?v=)는 붙이지 않는다(그룹샷과 동일)
    const url = publicUrl(key, false)
    const { error } = await db.from('faction_groups').update({ web_logo_url: url }).eq('id', g.id)
    if (error) { add({ ...label, action: 'blocked', reason: `web-logo-update: ${error.message}` }); return }
    manifest[g.logo.rel] = { hash, r2Key: key, uploadedAt: new Date().toISOString(), tagId }
    markDirty()
    g.webLogoUrl = url
    add({ ...label, action, reason: key })
  } catch (e) {
    add({ ...label, action: 'blocked', reason: `upload: ${errText(e)}` })
  }
}

/* ────────────────────────── 테마 영상 ────────────────────────── */

/**
 * 테마에 걸린 유튜브 영상을 되쓴다 — 태그 단위(같은 태그를 나눠 쓰는 세력은 한 번만).
 *
 * 원천은 제작·업로드 기록이라 **채움 전용이 아니라 항상 되쓴다**(인물 대사와 같은 규칙).
 * 기록이 없거나 공개 상태가 아니면 null 로 비운다 — 지운 영상이 서비스에 남지 않게 하는 것이 목적이다.
 *
 * 다만 **공개 상태를 물어보지 못했을 때는 아무것도 바꾸지 않는다.** 토큰이 만료된 것뿐인데
 * 전 테마의 영상을 지워 버리는 사고를 막기 위함이다(youtube-liveness 가 같은 이유로 unknown 을 둔다).
 */
async function publishVideos(ctx: {
  episode: PublishEpisode
  targets: PublishGroup[]
  snap: ServiceSnapshot
  createdTags: Map<string, CelebTagRow>
  db: SupabaseClient
  dryRun: boolean
  add: (item: FactionPublishItem) => void
  warnings: string[]
}): Promise<void> {
  const { episode, targets, snap, createdTags, db, dryRun, add, warnings } = ctx
  if (!targets.length) return

  let src: EpisodeVideoSource
  try {
    src = await loadEpisodeVideoSource(episode.folder)
  } catch (e) {
    // 기록을 못 읽었다 — 「영상 없음」과 구별해야 하므로 지우지 않고 막힌 것으로 알린다
    add({ kind: 'videos', group: '-', action: 'blocked', reason: `업로드 기록 읽기 실패: ${errText(e)}` })
    return
  }

  if (src.unverified) {
    warnings.push(`유튜브 공개 상태를 확인하지 못해 테마 영상을 손대지 않았습니다: ${src.notes.join(' / ')}`)
  }

  const seen = new Set<string>()
  for (const g of targets) {
    const key = tagKeyOf(g)
    if (seen.has(key)) continue
    seen.add(key)

    const tag = resolveTag(g, snap) ?? (g.tagSlug ? createdTags.get(g.tagSlug) : undefined)
    if (!tag) continue // 태그가 없으면 위에서 이미 blocked 로 보고했다

    const tagGroups = groupsOfSameTag(episode, g)
    const label = { kind: 'videos' as const, group: tagGroups.map(x => x.name).join(' + ') || g.name }

    if (src.unverified) {
      add({ ...label, action: 'blocked', reason: `공개 상태 미확인 — 보류 (${src.notes.join(' / ')})` })
      continue
    }

    const { value, notes } = buildTagVideos(src, episode.groups, tagGroups, episode.longformLayout)
    const detail = notes.join(' · ')

    if (!videosChanged(tag.youtube_videos, value)) {
      add({ ...label, action: 'skipped', reason: `unchanged — ${detail}` })
      continue
    }
    const action: FactionPublishAction = tag.youtube_videos ? 'updated' : 'created'
    if (dryRun) { add({ ...label, action, reason: detail }); continue }
    if (tag.id === 'NEW') { add({ ...label, action: 'skipped', reason: 'dry-run 자리표 태그' }); continue }

    const { error } = await db.from('celeb_tags').update({ youtube_videos: value }).eq('id', tag.id)
    if (error) { add({ ...label, action: 'blocked', reason: `youtube-videos-update: ${error.message}` }); continue }
    tag.youtube_videos = value
    add({ ...label, action, reason: detail })
  }
}

/* ────────────────────────── 테마 배경음악 ────────────────────────── */

/**
 * 테마 배경음악을 되쓴다 — 태그 단위(같은 태그를 나눠 쓰는 세력은 한 번만).
 *
 * 어느 곡이 흐르는지는 렌더 엔진의 선곡이 정하고, 그 판정은 렌더 저장소의 CLI 가 대신 내놓는다
 * (`music.ts` 머리말 참조 — 관리 화면에 판정을 복제하지 않는다). 곡 파일은 내용 해시를 키에 담아
 * 올리므로 여러 테마가 같은 곡을 써도 한 번만 올라간다.
 *
 * 영상과 같은 되쓰기 규칙이다 — 흐르는 곡이 없으면 null 로 비운다. 다만 **선곡을 못 물어봤으면
 * (도구 실패) 아무것도 바꾸지 않는다** — 한 번의 실행 실패로 전 테마 음악이 지워지는 사고 방지.
 */
async function publishMusic(ctx: {
  episode: PublishEpisode
  targets: PublishGroup[]
  snap: ServiceSnapshot
  createdTags: Map<string, CelebTagRow>
  db: SupabaseClient
  dryRun: boolean
  add: (item: FactionPublishItem) => void
  warnings: string[]
}): Promise<void> {
  const { episode, targets, snap, createdTags, db, dryRun, add, warnings } = ctx
  if (!targets.length) return

  let src: EpisodeMusicSource
  try {
    src = await loadEpisodeMusicSource(episode.folder)
  } catch (e) {
    // 선곡을 못 물어봤다 — 「곡 없음」과 구별해야 하므로 지우지 않고 막힌 것으로 알린다
    add({ kind: 'music', group: '-', action: 'blocked', reason: `선곡 조회 실패: ${errText(e)}` })
    return
  }
  for (const n of src.notes) warnings.push(n)

  const seen = new Set<string>()
  for (const g of targets) {
    const key = tagKeyOf(g)
    if (seen.has(key)) continue
    seen.add(key)

    const tag = resolveTag(g, snap) ?? (g.tagSlug ? createdTags.get(g.tagSlug) : undefined)
    if (!tag) continue // 태그가 없으면 위에서 이미 blocked 로 보고했다

    const tagGroups = groupsOfSameTag(episode, g)
    const label = { kind: 'music' as const, group: tagGroups.map(x => x.name).join(' + ') || g.name }

    const { group: hit, notes } = pickTagMusic(src.result, tagGroups)
    const detail = notes.join(' · ') || '사유 없음'

    // 흐르는 곡이 없다 — 도감 쪽도 비운다
    if (!hit || !hit.file || !hit.abs) {
      if (!musicChanged(tag.theme_music, null)) {
        add({ ...label, action: 'skipped', reason: `unchanged (곡 없음) — ${detail}` })
        continue
      }
      if (dryRun) { add({ ...label, action: 'updated', reason: `비움 — ${detail}` }); continue }
      if (tag.id === 'NEW') { add({ ...label, action: 'skipped', reason: 'dry-run 자리표 태그' }); continue }
      const { error } = await db.from('celeb_tags').update({ theme_music: null }).eq('id', tag.id)
      if (error) { add({ ...label, action: 'blocked', reason: `theme-music-update: ${error.message}` }); continue }
      tag.theme_music = null
      add({ ...label, action: 'updated', reason: `비움 — ${detail}` })
      continue
    }

    // 이미 같은 곡이 걸려 있으면 파일을 다시 올리지 않는다(주소 비교로 판정)
    const current = tag.theme_music as Partial<TagMusic> | null
    const sameFile = current?.file === hit.file && current?.episode === episode.folder
      && current?.variant === hit.variant && !!current?.url

    if (sameFile) {
      add({ ...label, action: 'skipped', reason: `unchanged — ${detail}` })
      continue
    }
    if (dryRun) { add({ ...label, action: current ? 'updated' : 'created', reason: detail }); continue }
    if (tag.id === 'NEW') { add({ ...label, action: 'skipped', reason: 'dry-run 자리표 태그' }); continue }
    if (!src.canUpload) { add({ ...label, action: 'blocked', reason: 'r2-env-missing' }); continue }

    try {
      const { url, key, uploaded } = await ensureMusicUploaded(src, hit.abs, hit.file)
      const value: TagMusic = {
        file: hit.file,
        url,
        episode: episode.folder,
        variant: hit.variant ?? '',
        checkedAt: new Date().toISOString(),
      }
      const action: FactionPublishAction = current ? 'updated' : 'created'
      const { error } = await db.from('celeb_tags').update({ theme_music: value }).eq('id', tag.id)
      if (error) { add({ ...label, action: 'blocked', reason: `theme-music-update: ${error.message}` }); continue }
      tag.theme_music = value
      add({ ...label, action, reason: `${detail} (${uploaded ? '새로 올림' : '이미 올라와 있음'}: ${key})` })
    } catch (e) {
      add({ ...label, action: 'blocked', reason: `music-upload: ${errText(e)}` })
    }
  }
}

/* ────────────────────────── 태그 ────────────────────────── */

/**
 * 세력의 태그를 해소하거나 만든다.
 *
 * 셋 중 하나다.
 *   ① `tag_id` 로 이미 이어져 있다 → 이름·색을 채움 전용으로 손본다.
 *   ② `tag_id` 는 없지만 연결 키로 도감에 같은 태그가 있다 → 그 자리에서 `tag_id` 를 이어 준다.
 *      (태그가 없던 때 저장하면 이어지지 않고, 다시 저장하기 전까지 그대로 남는다)
 *   ③ 둘 다 없다 → 연결 키가 있으면 태그를 새로 만들고 `tag_id` 를 잇는다. 연결 키조차 없으면 막는다.
 *
 * 새 태그는 항상 숨김(is_featured=false)으로 만든다 — 도감 노출은 사람이 정한다.
 * 인물이 전부 mythical인 세력은 is_fiction=true로 기록해 실존 인물 테마와 섞이지 않게 한다.
 *
 * @returns 쓸 수 있는 태그 행, 또는 막혔으면 undefined(사유는 이미 items 에 담았다)
 */
async function resolveOrCreateTag(ctx: {
  group: PublishGroup
  snap: ServiceSnapshot
  createdTags: Map<string, CelebTagRow>
  db: SupabaseClient
  scope: ActiveScope
  dryRun: boolean
  force: boolean
  add: (item: FactionPublishItem) => void
  newTagSlugs: string[]
  tagTouched: Set<string>
}): Promise<CelebTagRow | undefined> {
  const { group: g, snap, createdTags, db, scope, dryRun, force, add, newTagSlugs, tagTouched } = ctx
  const label = { kind: 'tag' as const, group: g.name }

  let tag = resolveTag(g, snap) ?? (g.tagSlug ? createdTags.get(g.tagSlug) : undefined)
  const tagKey = tagKeyOf(g)
  const isFictionGroup = g.people.length > 0 && g.people.every(person => person.mythical)

  // 이미 이 호출에서 손댄 태그 — 나눠 쓰는 세력이므로 태그 자체는 한 번만 손본다.
  // 단 이 세력의 연결(tag_id)은 세력마다 따로 이어 줘야 한다.
  if (tag && tagTouched.has(tagKey)) {
    if (scope.tag) add({ ...label, action: 'skipped', reason: `shared-tag: ${tag.slug ?? tag.id}` })
    if (g.tagId !== tag.id) await linkGroupTag(db, g, tag.id, dryRun, add)
    return tag
  }

  if (!tag) {
    if (!g.tagSlug) {
      add({ ...label, action: 'blocked', reason: `tag-slug-missing (제안: ${g.suggestedSlug || '없음'})` })
      return undefined
    }
    if (!scope.tag) {
      add({ ...label, action: 'blocked', reason: `tag-missing (slug=${g.tagSlug}) — 태그 범위를 켜야 만든다` })
      return undefined
    }
    tagTouched.add(tagKey)
    const insert = {
      slug: g.tagSlug,
      name: g.name,
      name_en: g.nameEn ?? null,
      color: g.color ?? null,
      is_featured: false,
      is_fiction: isFictionGroup,
    }
    newTagSlugs.push(g.tagSlug)
    if (dryRun) {
      add({ ...label, action: 'created', reason: `slug=${g.tagSlug}` })
      // 미리보기는 아무것도 만들지 않으므로 id 가 없다 — 뒤 단계가 이어 돌도록 자리표를 둔다(키에 NEW 로 보인다)
      const placeholder: CelebTagRow = {
        id: 'NEW', slug: g.tagSlug, name: g.name, name_en: insert.name_en,
        color: insert.color, team_images: [], youtube_videos: null, theme_music: null,
        is_featured: false, is_fiction: insert.is_fiction, sort_order: null,
      }
      createdTags.set(g.tagSlug, placeholder)
      return placeholder
    }
    const { data, error } = await db.from('celeb_tags').insert(insert).select(TAG_COLUMNS).single()
    if (error || !data) {
      add({ ...label, action: 'blocked', reason: `tag-insert: ${error?.message ?? '결과 없음'}` })
      return undefined
    }
    tag = data as unknown as CelebTagRow
    createdTags.set(g.tagSlug, tag)
    snap.tagsById.set(tag.id, tag)
    if (tag.slug) snap.tagsBySlug.set(tag.slug, tag)
    add({ ...label, action: 'created', reason: `slug=${g.tagSlug}` })
    await linkGroupTag(db, g, tag.id, dryRun, add)
    return tag
  }

  tagTouched.add(tagKey)

  // 연결 키로 찾았을 뿐 tag_id 가 비어 있으면 그 자리에서 이어 준다
  if (g.tagId !== tag.id) await linkGroupTag(db, g, tag.id, dryRun, add)

  if (!scope.tag) return tag

  const patch: Record<string, string | boolean | null> = {}
  const name = fillValue(tag.name, g.name, force)
  const nameEn = fillValue(tag.name_en, g.nameEn, force)
  const color = fillValue(tag.color, g.color, force)
  if (name !== undefined) patch.name = name
  if (nameEn !== undefined) patch.name_en = nameEn
  if (color !== undefined) patch.color = color
  // false로 되돌리지는 않는다. 한 태그가 다른 편의 신화 세력과 공유될 수 있기 때문이다.
  if (isFictionGroup && tag.is_fiction !== true) patch.is_fiction = true

  if (!Object.keys(patch).length) {
    add({ ...label, action: 'skipped', reason: 'unchanged' })
  } else if (dryRun) {
    add({ ...label, action: 'updated', reason: Object.keys(patch).join(',') })
  } else {
    const { error } = await db.from('celeb_tags').update(patch).eq('id', tag.id)
    if (error) add({ ...label, action: 'blocked', reason: `tag-update: ${error.message}` })
    else add({ ...label, action: 'updated', reason: Object.keys(patch).join(',') })
  }
  return tag
}

/**
 * 제작 쪽 세력에 태그 연결(`faction_groups.tag_id`)을 되쓴다.
 *
 * 이 값은 연결 키에서 파생되므로 대본을 다시 저장하면 저절로 같은 값이 된다. 그런데 출간 시점에
 * 태그를 새로 만들었다면 다음 저장까지 미연결로 보이고 진단이 계속 「태그 미지정」이라 알린다.
 * 편집 잠금 기준(에피소드 갱신 시각)은 이 테이블 것이 아니므로, 열려 있는 편집 화면의 저장을
 * 방해하지 않는다(팩션 테이블에 트리거가 없음을 실측 확인).
 */
async function linkGroupTag(
  db: SupabaseClient,
  g: PublishGroup,
  tagId: string,
  dryRun: boolean,
  add: (item: FactionPublishItem) => void,
): Promise<void> {
  if (dryRun || tagId === 'NEW') return
  const { error } = await db.from('faction_groups').update({ tag_id: tagId }).eq('id', g.id)
  if (error) {
    add({ kind: 'tag', group: g.name, action: 'blocked', reason: `group-tag-link: ${error.message}` })
  }
}

/* ────────────────────────── 그룹샷 ────────────────────────── */

/**
 * 그룹샷 — 태그 단위. `team_images` 는 낱장 추가가 아니라 배열 전체를 다시 만드는 필드이므로
 * 그 태그를 나눠 쓰는 **편 전체 세력**의 그룹샷을 세력 순서 → 묶음 순서로 모아 만든다.
 * (세력 단위로 만들면 태그를 공유하는 앞 세력의 그룹샷이 소멸한다 — 페이팔 마피아 4장이 그 위험이었다.)
 *
 * 사진이 바뀌면 키(세력·묶음 번호 + 해시)가 갈리므로 예전 파일은 저장소에 남는다(청소는 후속 과제).
 */
async function publishTagTeamShots(ctx: {
  tag: CelebTagRow
  /** 이 태그를 쓰는 세력 전체 — 출간 대상으로 좁히지 않는다 */
  groups: PublishGroup[]
  db: SupabaseClient
  manifest: FactionSyncManifest
  dryRun: boolean
  canUpload: boolean
  add: (item: FactionPublishItem) => void
  markDirty: () => void
}): Promise<void> {
  const { tag, groups, db, manifest, dryRun, canUpload, add, markDirty } = ctx
  const tagId = tag.id
  const slug = tag.slug ?? tagId
  const names = groups.map(g => g.name)
  const label = { kind: 'teamShots' as const, group: names.length > 1 ? names.join(' + ') : names[0] ?? slug }

  const shots = groups.flatMap(g => g.teamShots.map(s => ({ ...s, groupNum: g.position })))
  if (!shots.length) {
    add({ ...label, action: 'skipped', reason: `no-image (tag=${slug})` })
    return
  }

  /*
    사진마다 「어느 묶음이고 누가 나오는지」를 함께 싣는다 — 도감이 그대로 보여준다.

    사진에 나오는 사람은 제작 데이터가 정하지만, 등장이 사람이 아니라 기계·제품인 편이 있다
    (인간형 로봇 — 옵티머스·아틀라스). 그런 편은 제작에서 뽑을 사람이 없으므로, 도감에서 사람이
    직접 매달아 둔 명단을 지우지 않고 그대로 둔다. 제작에 사람이 있으면 종전대로 그 값이 이긴다.
  */
  const keptPeople = new Map(
    toTeamImages(tag.team_images).map(img => [img.url, img.celebIds ?? []]),
  )
  const meta = (shot: (typeof shots)[number], url: string): FactionTeamImage => {
    const people = shot.celebIds.length ? shot.celebIds : keptPeople.get(url) ?? []
    return {
      url,
      ...(shot.label ? { label: shot.label } : {}),
      ...(shot.labelEn ? { labelEn: shot.labelEn } : {}),
      ...(people.length ? { celebIds: people } : {}),
    }
  }

  const images: FactionTeamImage[] = []
  let uploaded = 0
  let failed = 0

  for (const shot of shots) {
    if (shot.image.external) {
      images.push(meta(shot, shot.image.raw))
      add({ ...label, action: 'skipped', reason: `external-url: ${shot.image.raw}` })
      continue
    }
    let buf: Buffer
    try { buf = await readFile(shot.image.abs) }
    catch { failed += 1; add({ ...label, action: 'blocked', reason: `file-missing: ${shot.image.rel}` }); continue }

    const hash = fileHash(buf)
    const key = teamShotKey(tagId, shot.groupNum, shot.num, hash)
    images.push(meta(shot, publicUrl(key, false)))

    if (isUnchanged(manifest[shot.image.rel], hash, key, tagId)) continue
    if (dryRun) { uploaded += 1; continue }
    if (!canUpload) { failed += 1; add({ ...label, action: 'blocked', reason: 'r2-env-missing' }); continue }
    try {
      await uploadToR2(key, await toTeamShot(buf), OUTPUT_CONTENT_TYPE)
      manifest[shot.image.rel] = { hash, r2Key: key, uploadedAt: new Date().toISOString(), tagId }
      markDirty()
      uploaded += 1
    } catch (e) {
      failed += 1
      add({ ...label, action: 'blocked', reason: `upload: ${errText(e)}` })
    }
  }

  // 한 장이라도 못 올렸으면 배열을 갈아끼우지 않는다 — 빠진 사진으로 기존 배열을 덮는 사고 방지
  if (failed) {
    add({ ...label, action: 'blocked', reason: `${failed}장 실패로 team_images 교체 보류 (tag=${slug})` })
    return
  }

  // 주소만이 아니라 묶음 이름·인물까지 견준다 — 사진은 그대로인데 이름만 고친 경우도 반영해야 한다
  const next = serializeTeamImages(images)
  const current = toTeamImages(tag.team_images)
  if (JSON.stringify(current) === JSON.stringify(next)) {
    add({ ...label, action: 'skipped', reason: `unchanged (${next.length}장, tag=${slug})` })
    return
  }
  const action: FactionPublishAction = current.length ? 'updated' : 'created'
  const named = next.filter(i => i.label).length
  const detail = `${next.length}장 (업로드 ${uploaded}장, 이름 붙은 ${named}장, 세력 ${groups.length}개, tag=${slug})`
  if (dryRun) {
    add({ ...label, action, reason: detail })
    return
  }
  const { error } = await db.from('celeb_tags').update({ team_images: next }).eq('id', tagId)
  if (error) { add({ ...label, action: 'blocked', reason: `team-images-update: ${error.message}` }); return }
  tag.team_images = next
  add({ ...label, action, reason: detail })
}
