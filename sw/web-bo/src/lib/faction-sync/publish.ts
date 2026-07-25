/**
 * 출간 — 제작 데이터(faction_*)를 서비스 세력도감(celeb_tags·celeb_tag_assignments)과 이미지 저장소에 반영한다.
 * 서버 전용.
 *
 * 순서: 태그 → 배정(순번 재기록) → 개인샷 → 그룹샷 → 웹 캐시 비우기.
 * 지키는 규칙(문서 §4 「투영은 단방향·채움 전용」):
 *   ① 텍스트는 채움 전용 — 도감이 비어 있을 때만 넣는다. force 를 켜면 덮어쓴다.
 *      (사람이 도감에서 다듬은 소개문을 제작 데이터로 되돌리지 않기 위함이다)
 *   ② 셀럽이 해소되지 않은 인물은 건드리지 않고 명단으로 보고한다.
 *   ③ 미리보기(dryRun)는 쓰기 직전까지 똑같이 계산하고 아무것도 쓰지 않는다(매니페스트도).
 *   ④ 같은 셀럽이 한 태그 안 여러 자리에 있으면 **자리가 가장 앞인** 배치만 채택한다(§4 배치 충돌 규칙).
 * 항목 하나가 실패해도 전체를 멈추지 않고 그 항목만 blocked 로 담는다.
 *
 * 텍스트 투영이 DB→DB 인데도 SQL 한 번이 아닌 이유: 채움 전용·force·배치 충돌·순번 재기록이
 * 항목마다 결과(created/updated/skipped/blocked)를 사람에게 보여야 하는 규칙이기 때문이다.
 * 한 문장으로 밀어 넣으면 무엇이 왜 건너뛰어졌는지가 사라진다.
 */

import { readFile } from 'fs/promises'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCache } from '@/lib/revalidate-web'
import {
  collectEpisode, groupsOfSameTag, hashOfFile, soloShotKey, tagKeyOf, teamShotKey, winningPlacements,
  type PublishEpisode, type PublishGroup, type PublishPerson,
} from './collect'
import { linkStateOf, loadServiceSnapshot, resolveTag, type ServiceSnapshot } from './diagnose'
import { fileHash, isUnchanged, readManifest, writeManifest, type FactionSyncManifest } from './manifest'
import { OUTPUT_CONTENT_TYPE, toSoloShot, toTeamShot } from './image'
import { missingR2Env, publicUrl, uploadToR2 } from './r2'
import { ASSIGNMENT_COLUMNS, TAG_COLUMNS, toImageArray, type CelebAssignmentRow, type CelebTagRow } from './supabase'
import type {
  FactionPublishAction, FactionPublishItem, FactionPublishRequest,
  FactionPublishResult, FactionPublishScope,
} from './types'

const ALL_SCOPE: Required<FactionPublishScope> = {
  tag: true,
  assignments: true,
  descs: true,
  personImages: true,
  teamImages: true,
}

/** 범위 정규화 — 아무것도 켜지 않았으면 전 항목 실행 */
function normalizeScope(scope?: FactionPublishScope): Required<FactionPublishScope> {
  if (!scope || !Object.values(scope).some(v => v === true)) return ALL_SCOPE
  return {
    tag: !!scope.tag,
    assignments: !!scope.assignments,
    descs: !!scope.descs,
    personImages: !!scope.personImages,
    teamImages: !!scope.teamImages,
  }
}

/**
 * 채움 전용 판정 — 넣을 값이 있으면 반환, 손대지 않아야 하면 undefined.
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
    warnings.push(`이미지 저장소 환경변수 누락으로 사진을 올릴 수 없습니다: ${r2Missing.join(', ')}`)
  }
  const canUpload = r2Missing.length === 0

  const add = (item: FactionPublishItem) => { items.push(item) }

  // 한 태그를 여러 세력이 나눠 쓰는 편이 있다(페이팔 마피아 4세력·디지털 레지스탕스 6세력 → 태그 1개).
  // 태그 자체는 첫 세력에서 한 번만 손대고, 나머지는 같은 태그임을 알리고 넘어간다.
  const tagTouched = new Set<string>()
  /** 이번 호출에서 새로 만든 태그 — 뒤 세력도 같은 행을 보게 담아 둔다 */
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

    /* ── 2. 배정 + 소개문 ── */
    /** 이 세력에서 실제로 다룰 수 있는 인물 — 개인샷 단계가 그대로 이어 쓴다 */
    const usable: { person: PublishPerson; celebId: string; assignment?: CelebAssignmentRow; ready: boolean }[] = []
    // 배정·소개문을 둘 다 끈 범위(예: 그룹샷만)에서는 인물 해석만 하고 배정 결과는 보고하지 않는다
    const reportAssign = scope.assignments || scope.descs

    for (const p of g.people) {
      const label = { kind: 'assignment' as const, group: g.name, person: p.name }
      if (!p.celebId) {
        const state = linkStateOf(p)
        add({ ...label, action: 'blocked', reason: state === 'unkeyed' ? 'unkeyed' : 'celeb-unresolved' })
        continue
      }
      const celebId = p.celebId

      // §4 배치 충돌 — 배정 행은 (셀럽, 태그) 하나뿐이라 자리가 가장 앞인 배치만 채택한다.
      // 판정은 편 전체를 보고 하므로, 세력을 하나씩 출간해도 결과가 같다.
      const winnerId = winners.get(`${tagKey}:${celebId}`)
      if (winnerId && winnerId !== p.id) {
        add({ ...label, action: 'skipped', reason: 'duplicate-in-tag (앞 자리 배치 채택)' })
        continue
      }

      const assignment = snap.assignments.get(`${tagId}:${celebId}`)
      const entry = { person: p, celebId, assignment, ready: !!assignment }
      usable.push(entry)

      if (!assignment) {
        if (!scope.assignments) {
          if (reportAssign) add({ ...label, action: 'skipped', reason: 'not-assigned' })
          continue
        }
        const insert: Record<string, string | number | null> = { tag_id: tagId, celeb_id: celebId, sort_order: p.order }
        if (scope.descs) {
          insert.short_desc = p.shortDesc ?? null
          insert.long_desc = p.longDesc ?? null
          insert.short_desc_en = p.shortDescEn ?? null
          insert.long_desc_en = p.longDescEn ?? null
        }
        if (dryRun) {
          entry.ready = true
          add({ ...label, action: 'created' })
        } else {
          const { data, error } = await db
            .from('celeb_tag_assignments').insert(insert).select(ASSIGNMENT_COLUMNS).single()
          if (error || !data) {
            add({ ...label, action: 'blocked', reason: `assignment-insert: ${error?.message ?? '결과 없음'}` })
            continue
          }
          const row = data as unknown as CelebAssignmentRow
          snap.assignments.set(`${tagId}:${celebId}`, row)
          entry.assignment = row
          entry.ready = true
          add({ ...label, action: 'created' })
        }
        continue
      }

      // 기존 배정 — 순번은 항상 재기록, 소개문은 채움 전용
      const patch: Record<string, string | number | null> = {}
      if (scope.assignments && assignment.sort_order !== p.order) patch.sort_order = p.order
      if (scope.descs) {
        const short = fillValue(assignment.short_desc, p.shortDesc, force)
        const long = fillValue(assignment.long_desc, p.longDesc, force)
        const shortEn = fillValue(assignment.short_desc_en, p.shortDescEn, force)
        const longEn = fillValue(assignment.long_desc_en, p.longDescEn, force)
        if (short !== undefined) patch.short_desc = short
        if (long !== undefined) patch.long_desc = long
        if (shortEn !== undefined) patch.short_desc_en = shortEn
        if (longEn !== undefined) patch.long_desc_en = longEn
      }

      if (!Object.keys(patch).length) {
        if (reportAssign) add({ ...label, action: 'skipped', reason: 'unchanged' })
      } else if (dryRun) {
        add({ ...label, action: 'updated', reason: Object.keys(patch).join(',') })
      } else {
        const { error } = await db.from('celeb_tag_assignments').update(patch).eq('id', assignment.id)
        if (error) add({ ...label, action: 'blocked', reason: `assignment-update: ${error.message}` })
        else add({ ...label, action: 'updated', reason: Object.keys(patch).join(',') })
      }
    }

    /* ── 3. 개인샷 ── */
    if (scope.personImages) {
      for (const { person: p, celebId, assignment, ready } of usable) {
        const label = { kind: 'soloShot' as const, group: g.name, person: p.name }
        if (!ready) { add({ ...label, action: 'skipped', reason: 'not-assigned' }); continue }
        if (!p.image) { add({ ...label, action: 'skipped', reason: 'no-image' }); continue }
        if (p.image.external) { add({ ...label, action: 'skipped', reason: 'external-url' }); continue }

        const key = soloShotKey(tagId, celebId)
        const hash = await hashOfFile(p.image.abs)
        if (!hash) { add({ ...label, action: 'blocked', reason: `file-missing: ${p.image.rel}` }); continue }

        const dbUrl = assignment?.spotlight_image_url ?? null
        if (isUnchanged(manifest[p.image.rel], hash, key, tagId) && dbUrl?.includes(key)) {
          add({ ...label, action: 'skipped', reason: 'unchanged' })
          continue
        }
        const action: FactionPublishAction = dbUrl ? 'updated' : 'created'
        if (dryRun) { add({ ...label, action, reason: key }); continue }
        if (!canUpload) { add({ ...label, action: 'blocked', reason: 'r2-env-missing' }); continue }

        try {
          const webp = await toSoloShot(await readFile(p.image.abs))
          await uploadToR2(key, webp, OUTPUT_CONTENT_TYPE)
          const url = publicUrl(key)
          const { error } = await db
            .from('celeb_tag_assignments').update({ spotlight_image_url: url })
            .eq('tag_id', tagId).eq('celeb_id', celebId)
          if (error) { add({ ...label, action: 'blocked', reason: `spotlight-update: ${error.message}` }); continue }
          manifest[p.image.rel] = { hash, r2Key: key, uploadedAt: new Date().toISOString(), tagId }
          manifestDirty = true
          if (assignment) assignment.spotlight_image_url = url
          add({ ...label, action, reason: key })
        } catch (e) {
          add({ ...label, action: 'blocked', reason: `upload: ${errText(e)}` })
        }
      }
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

  /* ── 5. 웹 캐시 비우기 ── */
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
 *
 * @returns 쓸 수 있는 태그 행, 또는 막혔으면 undefined(사유는 이미 items 에 담았다)
 */
async function resolveOrCreateTag(ctx: {
  group: PublishGroup
  snap: ServiceSnapshot
  createdTags: Map<string, CelebTagRow>
  db: SupabaseClient
  scope: Required<FactionPublishScope>
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
    }
    newTagSlugs.push(g.tagSlug)
    if (dryRun) {
      add({ ...label, action: 'created', reason: `slug=${g.tagSlug}` })
      // 미리보기는 아무것도 만들지 않으므로 id 가 없다 — 뒤 단계가 이어 돌도록 자리표를 둔다(키에 NEW 로 보인다)
      const placeholder: CelebTagRow = {
        id: 'NEW', slug: g.tagSlug, name: g.name, name_en: insert.name_en,
        color: insert.color, team_images: [], is_featured: false, sort_order: null,
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

  const patch: Record<string, string | null> = {}
  const name = fillValue(tag.name, g.name, force)
  const nameEn = fillValue(tag.name_en, g.nameEn, force)
  const color = fillValue(tag.color, g.color, force)
  if (name !== undefined) patch.name = name
  if (nameEn !== undefined) patch.name_en = nameEn
  if (color !== undefined) patch.color = color

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

  const urls: string[] = []
  let uploaded = 0
  let failed = 0

  for (const shot of shots) {
    if (shot.image.external) {
      urls.push(shot.image.raw)
      add({ ...label, action: 'skipped', reason: `external-url: ${shot.image.raw}` })
      continue
    }
    let buf: Buffer
    try { buf = await readFile(shot.image.abs) }
    catch { failed += 1; add({ ...label, action: 'blocked', reason: `file-missing: ${shot.image.rel}` }); continue }

    const hash = fileHash(buf)
    const key = teamShotKey(tagId, shot.groupNum, shot.num, hash)
    urls.push(publicUrl(key, false))

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

  const current = toImageArray(tag.team_images)
  const same = current.length === urls.length && current.every((u, i) => u === urls[i])
  if (same) {
    add({ ...label, action: 'skipped', reason: `unchanged (${urls.length}장, tag=${slug})` })
    return
  }
  const action: FactionPublishAction = current.length ? 'updated' : 'created'
  const detail = `${urls.length}장 (업로드 ${uploaded}장, 세력 ${groups.length}개, tag=${slug})`
  if (dryRun) {
    add({ ...label, action, reason: detail })
    return
  }
  const { error } = await db.from('celeb_tags').update({ team_images: urls }).eq('id', tagId)
  if (error) { add({ ...label, action: 'blocked', reason: `team-images-update: ${error.message}` }); return }
  tag.team_images = urls
  add({ ...label, action, reason: detail })
}
