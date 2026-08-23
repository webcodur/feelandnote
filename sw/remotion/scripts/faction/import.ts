/**
 * import.ts — faction-data.json → DB 이관
 *
 * 사용:
 *   pnpm faction:import -- --episode AI-Supremacy [--dry-run]
 *   pnpm faction:import -- --all [--dry-run]
 *
 * 규칙
 * - faction-data.json 은 **읽기 전용**이다. 이 스크립트는 절대 쓰지 않는다.
 * - 에피소드 단위 delete-then-insert. faction_groups 삭제가 묶음·인물까지 CASCADE 로 지운다.
 *   덕분에 재실행이 멱등이다(같은 행수, 에러 0).
 * - position = 배열 인덱스 + 1. 배열 순서가 곧 화면 순서라 순서를 잃으면 영상이 바뀐다.
 * - 대사·이미지 경로 문자열은 가공 없이 원문 그대로 넣는다.
 */

import {
  splitEpisode, splitGroup, splitCluster, splitPerson,
} from '@feelandnote/shared/lib/faction-schema'
import { assertIndividualFactionSubject } from '@feelandnote/shared/lib/faction-person-subject'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient, readEpisodeParts, readFactionData, parseArgs, selectEpisodes, pad,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm faction:import -- (--episode <폴더명> | --all) [--dry-run]'

/**
 * `.in()` 한 번에 실을 값 개수. 이 저장소는 462개 id 를 단일 in() 에 실어
 * URL 한도를 넘겨 실패한 실측 이력이 있다(docs/project/remotion/faction/unification.md §5). 200 으로 끊는다.
 */
const IN_CHUNK = 200
/** insert 한 번에 보낼 행 수 */
const INSERT_CHUNK = 500

type Row = Record<string, unknown>

interface EpisodeStats {
  folder: string
  groups: number
  clusters: number
  entries: number
  people: number
  narratives: number
  parts: number
  /** 해소된 slug 수 / 전체 slug 보유 인물 수 */
  slugResolved: number
  slugTotal: number
  tagResolved: number
  tagTotal: number
  skipped?: string
}

/* ────────────────────────── 키 해소 ────────────────────────── */

/** 레거시 slug와 현재 UUID가 실제 CELEB 프로필을 가리키는지 함께 해소한다. */
async function resolvePeople(
  db: SupabaseClient, slugs: string[], ids: string[],
): Promise<{ slugMap: Map<string, string>; idSet: Set<string> }> {
  const slugMap = new Map<string, string>()
  const idSet = new Set<string>()
  const uniq = [...new Set(slugs)]
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const chunk = uniq.slice(i, i + IN_CHUNK)
    const { data, error } = await db.from('celebs').select('id,slug,nickname,nickname_en')
      .in('publication_status', ['active', 'inactive']).in('slug', chunk)
    if (error) throw new Error(`celebs slug 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      assertIndividualFactionSubject(r.nickname, r.nickname_en, `DB CELEB ${String(r.id)}`)
      if (r.slug) slugMap.set(r.slug as string, r.id as string)
      idSet.add(r.id as string)
    }
  }
  const uniqIds = [...new Set(ids)]
  for (let i = 0; i < uniqIds.length; i += IN_CHUNK) {
    const { data, error } = await db.from('celebs').select('id,nickname,nickname_en')
      .in('publication_status', ['active', 'inactive'])
      .in('id', uniqIds.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`celebs UUID 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      assertIndividualFactionSubject(r.nickname, r.nickname_en, `DB CELEB ${String(r.id)}`)
      idSet.add(r.id as string)
    }
  }
  return { slugMap, idSet }
}

/** tagSlug → celeb_tags.id (태그는 40종뿐이라 전량 조회) */
async function resolveTags(db: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db.from('celeb_tags').select('id,slug')
  if (error) throw new Error(`celeb_tags 조회 실패: ${error.message}`)
  const map = new Map<string, string>()
  for (const r of data ?? []) {
    if (r.slug) map.set(r.slug as string, r.id as string)
  }
  return map
}

/* ────────────────────────── 이관 ────────────────────────── */

async function insertChunked(db: SupabaseClient, table: string, rows: Row[], select?: string) {
  const out: Row[] = []
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK)
    const q = db.from(table).insert(chunk)
    if (select) {
      const { data, error } = await q.select(select)
      if (error) throw new Error(`${table} insert 실패: ${error.message}`)
      out.push(...((data ?? []) as unknown as Row[]))
    } else {
      const { error } = await q
      if (error) throw new Error(`${table} insert 실패: ${error.message}`)
    }
  }
  return out
}

async function importEpisode(
  db: SupabaseClient,
  ep: EpisodeFolder,
  slugMap: Map<string, string>,
  validCelebIds: Set<string>,
  tagMap: Map<string, string>,
  dryRun: boolean,
  unresolvedTags: Set<string>,
): Promise<EpisodeStats> {
  const script = readFactionData(ep.dataPath)
  const groups = (script.groups ?? []) as Row[]
  const stats: EpisodeStats = {
    folder: ep.folder, groups: 0, clusters: 0, entries: 0, people: 0, narratives: 0, parts: 0,
    slugResolved: 0, slugTotal: 0, tagResolved: 0, tagTotal: 0,
  }

  // ── longformLayout 사전 검증 — 범위 밖 group 인덱스면 이 에피소드를 건너뛴다 ──
  const layout = script.longformLayout as Row[] | undefined
  if (layout) {
    for (const [i, item] of layout.entries()) {
      if (item && typeof item === 'object' && 'group' in item) {
        const gi = item.group as number
        if (!Number.isInteger(gi) || gi < 0 || gi >= groups.length) {
          stats.skipped = `longformLayout[${i}].group=${gi} 가 세력 범위(0~${groups.length - 1}) 밖 — 이관 중단`
          return stats
        }
      }
    }
  }

  const { cols: epCols, data: epData } = splitEpisode(script)

  if (dryRun) {
    for (const g of groups) {
      stats.groups++
      const tagSlug = g.tagSlug as string | undefined
      if (tagSlug) {
        stats.tagTotal++
        if (tagMap.has(tagSlug)) stats.tagResolved++
        else unresolvedTags.add(tagSlug)
      }
      for (const c of (g.clusters ?? []) as Row[]) {
        stats.clusters++
        for (const p of (c.people ?? []) as Row[]) {
          stats.entries++
          if (p.isPerson === false) {
            stats.narratives++
            continue
          }
          stats.people++
          const slug = p.slug as string | undefined
          const explicitId = typeof p.celebId === 'string' ? p.celebId : undefined
          stats.slugTotal++
          if ((explicitId && validCelebIds.has(explicitId)) || (slug && slugMap.has(slug))) stats.slugResolved++
        }
      }
    }
    stats.parts = readEpisodeParts(ep.dir).length
    return stats
  }

  // ── 1) 에피소드 upsert (folder 고유키) ──
  // 제작 상태와 출간 여부는 DB가 원천이다. 파일을 다시 가져와도 운영 값은 덮지 않는다.
  const { data: currentEpisode, error: currentEpisodeErr } = await db
    .from('faction_episodes')
    .select('status,registered,sort_order')
    .eq('folder', ep.folder)
    .maybeSingle()
  if (currentEpisodeErr) {
    throw new Error(`faction_episodes 현재 상태 조회 실패(${ep.folder}): ${currentEpisodeErr.message}`)
  }
  const { data: epRow, error: epErr } = await db
    .from('faction_episodes')
    .upsert({
      folder: ep.folder,
      ...epCols,
      status: currentEpisode?.status ?? ep.status,
      registered: currentEpisode?.registered ?? ep.registered,
      sort_order: currentEpisode?.sort_order ?? ep.sortOrder,
      data: epData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'folder' })
    .select('id')
    .single()
  if (epErr) throw new Error(`faction_episodes upsert 실패(${ep.folder}): ${epErr.message}`)
  const episodeId = epRow.id as string

  // ── 2) 기존 자식 전량 삭제 (CASCADE 로 묶음·인물까지) ──
  const { error: delErr } = await db.from('faction_groups').delete().eq('episode_id', episodeId)
  if (delErr) throw new Error(`faction_groups 삭제 실패(${ep.folder}): ${delErr.message}`)
  const { error: delPartErr } = await db.from('faction_episode_parts').delete().eq('episode_id', episodeId)
  if (delPartErr) throw new Error(`faction_episode_parts 삭제 실패(${ep.folder}): ${delPartErr.message}`)

  // ── 3) 세력 ──
  const groupRows: Row[] = groups.map((g, gi) => {
    const { cols, data } = splitGroup(g)
    const tagSlug = g.tagSlug as string | undefined
    let tagId: string | null = null
    if (tagSlug) {
      stats.tagTotal++
      tagId = tagMap.get(tagSlug) ?? null
      if (tagId) stats.tagResolved++
      else unresolvedTags.add(tagSlug)
    }
    return { episode_id: episodeId, position: gi + 1, ...cols, tag_id: tagId, data }
  })
  const insertedGroups = groupRows.length
    ? await insertChunked(db, 'faction_groups', groupRows, 'id,position')
    : []
  // position → id (삽입 순서에 기대지 않고 고유키로 되짚는다)
  const groupIdByPos = new Map<number, string>()
  for (const r of insertedGroups) groupIdByPos.set(r.position as number, r.id as string)
  stats.groups = insertedGroups.length

  // ── 4) 묶음 ──
  const clusterRows: Row[] = []
  groups.forEach((g, gi) => {
    const groupId = groupIdByPos.get(gi + 1)
    if (!groupId) throw new Error(`세력 id 해소 실패(${ep.folder} position=${gi + 1})`)
    ;((g.clusters ?? []) as Row[]).forEach((c, ci) => {
      const { cols, data } = splitCluster(c)
      clusterRows.push({ group_id: groupId, position: ci + 1, ...cols, data })
    })
  })
  const insertedClusters = clusterRows.length
    ? await insertChunked(db, 'faction_clusters', clusterRows, 'id,group_id,position')
    : []
  const clusterIdByKey = new Map<string, string>()
  for (const r of insertedClusters) clusterIdByKey.set(`${r.group_id as string}:${r.position as number}`, r.id as string)
  stats.clusters = insertedClusters.length

  // ── 5) 인물 ──
  const personRows: Row[] = []
  groups.forEach((g, gi) => {
    const groupId = groupIdByPos.get(gi + 1)!
    ;((g.clusters ?? []) as Row[]).forEach((c, ci) => {
      const clusterId = clusterIdByKey.get(`${groupId}:${ci + 1}`)
      if (!clusterId) throw new Error(`묶음 id 해소 실패(${ep.folder} g${gi + 1}c${ci + 1})`)
      ;((c.people ?? []) as Row[]).forEach((p, pi) => {
        const { cols, data, mined } = splitPerson(p)
        const isPerson = p.isPerson !== false
        const slug = p.slug as string | undefined
        const explicitId = isPerson && typeof p.celebId === 'string' && validCelebIds.has(p.celebId)
          ? p.celebId
          : undefined
        const celebId = isPerson ? (explicitId ?? (slug ? slugMap.get(slug) : undefined)) : null
        if (isPerson && !celebId) throw new Error(`DB CELEB 미연결 인물: ${ep.folder}/${String(p.name ?? '')}`)
        if (isPerson) {
          stats.slugTotal++
          stats.slugResolved++
        }
        personRows.push({
          cluster_id: clusterId, position: pi + 1, ...cols,
          is_person: isPerson,
          celeb_id: celebId,
          slug: isPerson ? cols.slug : null,
          mined,
          data,
        })
      })
    })
  })
  if (personRows.length) await insertChunked(db, 'faction_people', personRows)
  stats.entries = personRows.length
  stats.people = personRows.filter(row => row.is_person !== false).length
  stats.narratives = personRows.filter(row => row.is_person === false).length

  // ── 6) longformLayout — {group:index} → {groupId:uuid} ──
  if (layout) {
    const converted = layout.map(item => {
      if (item && typeof item === 'object' && 'group' in item) {
        const gi = item.group as number
        return { groupId: groupIdByPos.get(gi + 1) }
      }
      return item
    })
    const { error } = await db
      .from('faction_episodes')
      .update({ longform_layout: converted })
      .eq('id', episodeId)
    if (error) throw new Error(`longform_layout 갱신 실패(${ep.folder}): ${error.message}`)
  } else {
    const { error } = await db
      .from('faction_episodes')
      .update({ longform_layout: null })
      .eq('id', episodeId)
    if (error) throw new Error(`longform_layout 초기화 실패(${ep.folder}): ${error.message}`)
  }

  // ── 7) 편별 고정 댓글 ──
  const parts = readEpisodeParts(ep.dir)
  if (parts.length) {
    const { error } = await db.from('faction_episode_parts').insert(
      parts.map(p => ({ episode_id: episodeId, part: p.part, comment: p.comment })),
    )
    if (error) throw new Error(`faction_episode_parts insert 실패(${ep.folder}): ${error.message}`)
  }
  stats.parts = parts.length

  return stats
}

/* ────────────────────────── main ────────────────────────── */

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps = selectEpisodes(args)
  const db = adminClient()

  console.log(`대상 에피소드 ${eps.length}편${args.dryRun ? ' (dry-run — 쓰기 없음)' : ''}`)

  // 전 에피소드의 slug 를 모아 한 번에 해소한다(인물마다 조회하지 않는다).
  const allSlugs: string[] = []
  const allCelebIds: string[] = []
  const personRefs: { folder: string; name: string; slug?: string; celebId?: string }[] = []
  for (const ep of eps) {
    const script = readFactionData(ep.dataPath)
    for (const g of (script.groups ?? []) as Row[]) {
      for (const c of (g.clusters ?? []) as Row[]) {
        for (const p of (c.people ?? []) as Row[]) {
          if (p.isPerson === false) continue
          if (p.slug) allSlugs.push(p.slug as string)
          if (p.celebId) allCelebIds.push(p.celebId as string)
          personRefs.push({
            folder: ep.folder,
            name: String(p.name ?? ''),
            ...(typeof p.slug === 'string' && p.slug ? { slug: p.slug } : {}),
            ...(typeof p.celebId === 'string' && p.celebId ? { celebId: p.celebId } : {}),
          })
          assertIndividualFactionSubject(p.name, p.nameEn, `${ep.folder} 팩션 인물`)
        }
      }
    }
  }
  const { slugMap, idSet } = await resolvePeople(db, allSlugs, allCelebIds)
  const tagMap = await resolveTags(db)
  const unresolvedPeople = personRefs.filter(ref => {
    const slugId = ref.slug ? slugMap.get(ref.slug) : undefined
    if (ref.celebId) {
      return !idSet.has(ref.celebId) || (!!slugId && slugId !== ref.celebId)
    }
    return !slugId
  })
  if (unresolvedPeople.length) {
    const sample = unresolvedPeople.slice(0, 20)
      .map(ref => `${ref.folder}/${ref.name}${ref.slug ? ` (${ref.slug})` : ''}`).join('\n  · ')
    throw new Error(`DB CELEB 미연결 인물 ${unresolvedPeople.length}명 — 가져오기를 시작하지 않았다\n  · ${sample}`)
  }
  console.log(`DB CELEB 해소 ${personRefs.length}/${personRefs.length} · 태그 ${tagMap.size}종 조회`)

  const unresolvedTags = new Set<string>()
  const all: EpisodeStats[] = []
  for (const ep of eps) {
    const s = await importEpisode(db, ep, slugMap, idSet, tagMap, args.dryRun, unresolvedTags)
    all.push(s)
    if (s.skipped) console.log(`  ✗ ${pad(ep.folder, 24)} ${s.skipped}`)
    else console.log(`  ✓ ${pad(ep.folder, 24)} 세력 ${pad(String(s.groups), 3)} 묶음 ${pad(String(s.clusters), 3)} 항목 ${pad(String(s.entries), 4)} (인물 ${s.people} · 서사 ${s.narratives}) 편댓글 ${s.parts}`)
  }

  const sum = (k: keyof EpisodeStats) => all.reduce((a, s) => a + (s[k] as number), 0)
  console.log('\n── 합계 ──')
  console.log(`에피소드 ${all.filter(s => !s.skipped).length}/${all.length} · 세력 ${sum('groups')} · 묶음 ${sum('clusters')} · 항목 ${sum('entries')} (인물 ${sum('people')} · 서사 ${sum('narratives')}) · 편댓글 ${sum('parts')}`)
  console.log(`셀럽 연결 ${sum('slugResolved')}/${sum('slugTotal')} · 태그 연결 ${sum('tagResolved')}/${sum('tagTotal')}`)

  if (unresolvedTags.size) {
    console.log(`\n── tagSlug 미해소 ${unresolvedTags.size}종 (celeb_tags 없음) ──`)
    for (const s of [...unresolvedTags].sort()) console.log(`  · ${s}`)
  }
  const skipped = all.filter(s => s.skipped)
  if (skipped.length) {
    console.log(`\n⚠ 중단된 에피소드 ${skipped.length}편 — 위 사유 참조`)
    process.exitCode = 1
  }
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
