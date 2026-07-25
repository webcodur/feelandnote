/**
 * 출간 — 로컬 팩션 데이터를 본서비스 DB(celeb_tags·celeb_tag_assignments)와 R2에 반영한다. 서버 전용.
 *
 * 순서: 태그 → 배정(순서 재기록) → 개인샷 → 그룹샷 → 웹 캐시 비우기.
 * 지키는 규칙(설계 문서 「보호 규칙」):
 *   ① 텍스트는 채움 전용 — DB가 비어 있을 때만 넣는다. force 를 켜면 덮어쓴다.
 *   ② 본서비스에 프로필이 없는 인물은 건드리지 않고 명단으로 보고한다.
 *   ③ 미리보기(dryRun)는 쓰기 직전까지 똑같이 계산하고 아무것도 쓰지 않는다(매니페스트도).
 * 항목 하나가 실패해도 전체를 멈추지 않고 그 항목만 blocked 로 담는다.
 */

import { readFile } from 'fs/promises'
import { adminClient, toImageArray, type CelebAssignmentRow, type CelebTagRow } from './supabase'
import { collectEpisode, groupsOfTag, hashOfFile, loadDbSnapshot, resolveProfile, soloShotKey, teamShotKey, type LocalGroup, type LocalPerson } from './diff'
import { fileHash, isUnchanged, readManifest, writeManifest, type FactionSyncManifest } from './manifest'
import { OUTPUT_CONTENT_TYPE, toSoloShot, toTeamShot } from './image'
import { missingR2Env, publicUrl, uploadToR2 } from './r2'
import type {
  FactionPublishAction,
  FactionPublishItem,
  FactionPublishRequest,
  FactionPublishResult,
  FactionPublishScope,
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
 * DB에 사람이 다듬어 넣은 값이 있으면 force 없이는 절대 덮지 않는다.
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

/** 웹 캐시 비우기 — 태그 하나씩 호출한다. env 미설정·실패는 조용히 넘기지 않고 사유를 돌려준다 */
async function revalidateWeb(tag: string): Promise<string | null> {
  const base = process.env.WEB_BASE_URL
  const secret = process.env.CRON_SECRET
  if (!base || !secret) return 'env-missing'
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, secret }),
    })
    if (!res.ok) return `http-${res.status}`
    return null
  } catch (e) {
    return errText(e)
  }
}

/** 출간 실행 */
export async function publishEpisode(req: FactionPublishRequest): Promise<FactionPublishResult> {
  const { episode, groupIndex, dryRun = false, force = false } = req
  const scope = normalizeScope(req.scope)

  const local = await collectEpisode(episode)
  const targets = typeof groupIndex === 'number'
    ? local.groups.filter(g => g.index === groupIndex)
    : local.groups
  if (typeof groupIndex === 'number' && !targets.length) {
    throw new Error(`세력 ${groupIndex} 를 찾을 수 없습니다`)
  }

  const db = await loadDbSnapshot(local)
  const sb = adminClient()
  const manifest = await readManifest(episode)

  const items: FactionPublishItem[] = []
  const warnings: string[] = []
  const newTagSlugs: string[] = []
  let manifestDirty = false

  const r2Missing = missingR2Env()
  const imagesEnabled = scope.personImages || scope.teamImages
  if (imagesEnabled && r2Missing.length) {
    warnings.push(`R2 환경변수 누락으로 이미지를 올릴 수 없습니다: ${r2Missing.join(', ')}`)
  }
  const canUpload = r2Missing.length === 0

  const add = (item: FactionPublishItem) => { items.push(item) }

  // 한 태그를 여러 세력이 나눠 쓰는 에피소드가 있다(페이팔 마피아 4세력·디지털 레지스탕스 6세력 → 태그 1개).
  // 태그 텍스트는 첫 세력에서 한 번만 손대고, 나머지는 같은 태그임을 알리고 넘어간다.
  const tagTouched = new Set<string>()
  // 태그 안에서 이미 다룬 인물 — 같은 인물이 두 세력에 겹쳐 있으면 뒤엣것이 앞엣것을 덮는다
  const peopleDone = new Map<string, Set<string>>()

  for (const g of targets) {
    /* ── 1. 태그 ── */
    if (!g.tagSlug) {
      add({ kind: 'tag', group: g.name, action: 'blocked', reason: `tag-slug-missing (제안: ${g.suggestedSlug || '없음'})` })
      continue
    }

    let tag: CelebTagRow | undefined = db.tagsBySlug.get(g.tagSlug)

    if (scope.tag && tagTouched.has(g.tagSlug)) {
      add({ kind: 'tag', group: g.name, action: 'skipped', reason: `shared-tag: ${g.tagSlug}` })
    } else if (scope.tag) {
      tagTouched.add(g.tagSlug)
      if (!tag) {
        // 노출 여부(is_featured)는 사람이 결정한다 — 새 태그는 항상 숨김으로 만든다
        const insert = {
          slug: g.tagSlug,
          name: g.name,
          name_en: g.nameEn ?? null,
          color: g.color ?? null,
          is_featured: false,
        }
        if (dryRun) {
          add({ kind: 'tag', group: g.name, action: 'created', reason: `slug=${g.tagSlug}` })
          newTagSlugs.push(g.tagSlug)
          // 미리보기는 태그를 만들지 않으므로 id 가 없다 — 뒤 단계가 이어 돌도록 자리표를 둔다(R2 키에 NEW 로 보인다).
          // 같은 태그를 쓰는 뒤 세력도 이 자리표를 보게 넣어둔다(미리보기는 아무것도 쓰지 않는다).
          tag = { id: 'NEW', slug: g.tagSlug, name: g.name, name_en: insert.name_en, color: insert.color, team_images: [], is_featured: false, sort_order: null }
          db.tagsBySlug.set(g.tagSlug, tag)
        } else {
          const { data, error } = await sb.from('celeb_tags').insert(insert).select('id, slug, name, name_en, color, team_images, is_featured, sort_order').single()
          if (error || !data) {
            add({ kind: 'tag', group: g.name, action: 'blocked', reason: `tag-insert: ${error?.message ?? '결과 없음'}` })
            continue
          }
          tag = data as CelebTagRow
          db.tagsBySlug.set(g.tagSlug, tag)
          newTagSlugs.push(g.tagSlug)
          add({ kind: 'tag', group: g.name, action: 'created', reason: `slug=${g.tagSlug}` })
        }
      } else {
        const patch: Record<string, string | null> = {}
        const name = fillValue(tag.name, g.name, force)
        const nameEn = fillValue(tag.name_en, g.nameEn, force)
        const color = fillValue(tag.color, g.color, force)
        if (name !== undefined) patch.name = name
        if (nameEn !== undefined) patch.name_en = nameEn
        if (color !== undefined) patch.color = color

        if (!Object.keys(patch).length) {
          add({ kind: 'tag', group: g.name, action: 'skipped', reason: 'unchanged' })
        } else if (dryRun) {
          add({ kind: 'tag', group: g.name, action: 'updated', reason: Object.keys(patch).join(',') })
        } else {
          const { error } = await sb.from('celeb_tags').update(patch).eq('id', tag.id)
          if (error) add({ kind: 'tag', group: g.name, action: 'blocked', reason: `tag-update: ${error.message}` })
          else add({ kind: 'tag', group: g.name, action: 'updated', reason: Object.keys(patch).join(',') })
        }
      }
    }

    if (!tag) {
      add({ kind: 'assignment', group: g.name, action: 'blocked', reason: `tag-missing (slug=${g.tagSlug})` })
      continue
    }
    const tagId = tag.id

    /* ── 2. 배정 + 소개문 ── */
    /** 이 세력에서 실제로 다룰 수 있는 인물 — 개인샷 단계가 그대로 이어 쓴다 */
    const usable: { person: LocalPerson; celebId: string; assignment?: CelebAssignmentRow; ready: boolean }[] = []
    // 배정·소개문을 둘 다 끈 범위(예: 그룹샷만)에서는 인물 해석만 하고 배정 결과는 보고하지 않는다
    const reportAssign = scope.assignments || scope.descs

    for (const p of g.people) {
      const resolved = resolveProfile(p, db)
      if (resolved.state !== 'linked') {
        add({
          kind: 'assignment',
          group: g.name,
          person: p.name,
          action: 'blocked',
          reason: resolved.state === 'unkeyed' ? 'unkeyed' : 'profile-missing',
        })
        continue
      }
      const celebId = resolved.celebId

      // 같은 태그를 나눠 쓰는 두 세력에 같은 인물이 겹쳐 있으면 배정은 한 행뿐이라 뒤엣것이 앞엣것을 덮는다.
      // 데이터 잘못이므로 뒤엣것을 건드리지 않고 알린다.
      const done = peopleDone.get(tagId) ?? new Set<string>()
      if (done.has(celebId)) {
        add({ kind: 'assignment', group: g.name, person: p.name, action: 'skipped', reason: 'duplicate-in-tag' })
        continue
      }
      done.add(celebId)
      peopleDone.set(tagId, done)

      const assignment = db.assignments.get(`${tagId}:${celebId}`)
      const entry = { person: p, celebId, assignment, ready: !!assignment }
      usable.push(entry)

      if (!assignment) {
        if (!scope.assignments) {
          if (reportAssign) add({ kind: 'assignment', group: g.name, person: p.name, action: 'skipped', reason: 'not-assigned' })
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
          add({ kind: 'assignment', group: g.name, person: p.name, action: 'created' })
        } else {
          const { data, error } = await sb.from('celeb_tag_assignments').insert(insert).select('id, tag_id, celeb_id, short_desc, long_desc, short_desc_en, long_desc_en, spotlight_image_url, sort_order').single()
          if (error || !data) {
            add({ kind: 'assignment', group: g.name, person: p.name, action: 'blocked', reason: `assignment-insert: ${error?.message ?? '결과 없음'}` })
            continue
          }
          const row = data as CelebAssignmentRow
          db.assignments.set(`${tagId}:${celebId}`, row)
          entry.assignment = row
          entry.ready = true
          add({ kind: 'assignment', group: g.name, person: p.name, action: 'created' })
        }
        continue
      }

      // 기존 배정 — 순서는 항상 재기록, 소개문은 채움 전용
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
        if (reportAssign) add({ kind: 'assignment', group: g.name, person: p.name, action: 'skipped', reason: 'unchanged' })
      } else if (dryRun) {
        add({ kind: 'assignment', group: g.name, person: p.name, action: 'updated', reason: Object.keys(patch).join(',') })
      } else {
        const { error } = await sb.from('celeb_tag_assignments').update(patch).eq('id', assignment.id)
        if (error) add({ kind: 'assignment', group: g.name, person: p.name, action: 'blocked', reason: `assignment-update: ${error.message}` })
        else add({ kind: 'assignment', group: g.name, person: p.name, action: 'updated', reason: Object.keys(patch).join(',') })
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
          const { error } = await sb.from('celeb_tag_assignments').update({ spotlight_image_url: url }).eq('tag_id', tagId).eq('celeb_id', celebId)
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
  // team_images 는 태그 하나의 배열이다. 세력마다 자기 클러스터만으로 배열을 갈아끼우면
  // 태그를 나눠 쓰는 앞 세력의 그룹샷이 사라진다. 그래서 한 세력만 출간하더라도
  // 그 태그를 쓰는 에피소드 전체 세력의 그룹샷을 모아 배열을 다시 만든다.
  if (scope.teamImages) {
    const touchedSlugs = [...new Set(targets.map(g => g.tagSlug).filter((s): s is string => !!s))]
    for (const slug of touchedSlugs) {
      const tag = db.tagsBySlug.get(slug)
      if (!tag) continue // 태그가 없으면 위에서 이미 blocked 로 보고했다
      await publishTagTeamShots({
        slug,
        tag,
        groups: groupsOfTag(local, slug),
        sb,
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
    for (const cacheTag of ['tags', 'celebs']) {
      const failure = await revalidateWeb(cacheTag)
      if (failure) {
        add({ kind: 'revalidate', group: '-', action: 'blocked', reason: `${cacheTag}: ${failure}` })
        warnings.push(
          failure === 'env-missing'
            ? `WEB_BASE_URL·CRON_SECRET 미설정 — 웹 캐시(${cacheTag})를 손으로 비워야 합니다`
            : `웹 캐시(${cacheTag}) 비우기 실패(${failure}) — 손으로 비워야 합니다`,
        )
      } else {
        add({ kind: 'revalidate', group: '-', action: 'updated', reason: cacheTag })
      }
    }
  }

  if (manifestDirty && !dryRun) await writeManifest(episode, manifest)

  return {
    episode,
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

/**
 * 그룹샷 — 태그 단위. team_images 는 낱장 추가가 아니라 배열 전체를 다시 만드는 필드이므로
 * 그 태그를 나눠 쓰는 **에피소드 전체 세력**의 그룹샷을 세력 순서 → 클러스터 순서로 모아 만든다.
 * (세력 단위로 만들면 태그를 공유하는 앞 세력의 그룹샷이 소멸한다 — 페이팔 마피아 4장이 그 위험이었다.)
 *
 * 한 세력만 출간해도 나머지 세력의 그룹샷이 배열에 그대로 남는다.
 * 사진이 바뀌면 키(세력·클러스터 번호 + 해시)가 갈리므로 예전 파일은 R2에 남는다(청소는 후속 과제).
 */
async function publishTagTeamShots(ctx: {
  slug: string
  tag: CelebTagRow
  /** 이 태그를 쓰는 세력 전체 — 출간 대상(groupIndex)으로 좁히지 않는다 */
  groups: LocalGroup[]
  sb: ReturnType<typeof adminClient>
  manifest: FactionSyncManifest
  dryRun: boolean
  canUpload: boolean
  add: (item: FactionPublishItem) => void
  markDirty: () => void
}): Promise<void> {
  const { slug, tag, groups, sb, manifest, dryRun, canUpload, add, markDirty } = ctx
  const tagId = tag.id
  const names = groups.map(g => g.name)
  const label = { kind: 'teamShots' as const, group: names.length > 1 ? names.join(' + ') : names[0] ?? slug }

  const shots = groups.flatMap(g => g.teamShots.map(s => ({ ...s, groupNum: g.index + 1, groupName: g.name })))
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
  const { error } = await sb.from('celeb_tags').update({ team_images: urls }).eq('id', tagId)
  if (error) { add({ ...label, action: 'blocked', reason: `team-images-update: ${error.message}` }); return }
  tag.team_images = urls
  add({ ...label, action, reason: detail })
}
