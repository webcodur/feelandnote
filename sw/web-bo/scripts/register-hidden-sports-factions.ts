/**
 * 2026 월드컵 드림 XI와 21세기 NBA 3대 구단 팩션의 숨김 초안을 만든다.
 *
 * - 기본은 dry-run. 실제 반영은 --apply가 있어야 한다.
 * - 없는 자연인만 suspended/light CELEB로 정식 등록한다.
 * - 아바타·소개·콘텐츠·영향력 데이터는 만들지 않는다.
 * - 팩션은 blocked + registered=false이고 모든 세력·묶음·인물을 disabled/web_hidden 처리한다.
 */

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { buildFactionRows, type Row } from '@feelandnote/shared/lib/faction-assemble'
import { assertRouteSafeCelebSlug, previewGeneratedCelebSlug } from '../src/lib/celeb-slug'

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const APPLY = process.argv.includes('--apply')

type ProfileSeed = { nickname: string; nicknameEn: string }

const NEW_PROFILE_SEEDS: ProfileSeed[] = [
  { nickname: '보지냐', nicknameEn: 'Vozinha' },
  { nickname: '페드로 포로', nicknameEn: 'Pedro Porro' },
  { nickname: '리산드로 마르티네스', nicknameEn: 'Lisandro Martinez' },
  { nickname: '다요 우파메카노', nicknameEn: 'Dayot Upamecano' },
  { nickname: '마르크 쿠쿠레야', nicknameEn: 'Marc Cucurella' },
  { nickname: '로드리', nicknameEn: 'Rodri' },
  { nickname: '마이클 올리세', nicknameEn: 'Michael Olise' },
  { nickname: '주드 벨링엄', nicknameEn: 'Jude Bellingham' },
  { nickname: '그레그 포포비치', nicknameEn: 'Gregg Popovich' },
  { nickname: '토니 파커', nicknameEn: 'Tony Parker' },
  { nickname: '마누 지노빌리', nicknameEn: 'Manu Ginobili' },
  { nickname: '스티브 커', nicknameEn: 'Steve Kerr' },
  { nickname: '클레이 톰프슨', nicknameEn: 'Klay Thompson' },
]

const WORLD_CUP_GROUPS = [
  { name: '골키퍼', nameEn: 'Goalkeeper', people: ['Vozinha'] },
  {
    name: '수비수', nameEn: 'Defenders',
    people: ['Pedro Porro', 'Lisandro Martinez', 'Dayot Upamecano', 'Marc Cucurella'],
  },
  {
    name: '미드필더', nameEn: 'Midfielders',
    people: ['Rodri', 'Michael Olise', 'Jude Bellingham'],
  },
  {
    name: '공격수', nameEn: 'Forwards',
    people: ['Lionel Messi', 'Erling Haaland', 'Kylian Mbappe'],
  },
] as const

const NBA_GROUPS = [
  {
    name: '로스앤젤레스 레이커스', nameEn: 'Los Angeles Lakers',
    people: ['Phil Jackson', 'Kobe Bryant', "Shaquille O'Neal", 'LeBron James'],
  },
  {
    name: '샌안토니오 스퍼스', nameEn: 'San Antonio Spurs',
    people: ['Gregg Popovich', 'Tim Duncan', 'Tony Parker', 'Manu Ginobili'],
  },
  {
    name: '골든스테이트 워리어스', nameEn: 'Golden State Warriors',
    people: ['Steve Kerr', 'Stephen Curry', 'Klay Thompson', 'Kevin Durant'],
  },
] as const

const ALL_CAST_NAMES = [...new Set([
  ...WORLD_CUP_GROUPS.flatMap(group => group.people),
  ...NBA_GROUPS.flatMap(group => group.people),
])]

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string
  publication_status: string
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function rowsByEnglishName(db: SupabaseClient, names: readonly string[]): Promise<ProfileRow[]> {
  const { data, error } = await db.from('celebs')
    .select('id,slug,nickname,nickname_en,publication_status')
    .in('nickname_en', [...names])
  if (error) throw error
  return (data ?? []) as ProfileRow[]
}

async function createMinimalCeleb(db: SupabaseClient, seed: ProfileSeed): Promise<ProfileRow> {
  const [{ data: sameKo, error: koError }, { data: sameEn, error: enError }] = await Promise.all([
    db.from('celebs').select('id,slug,nickname,nickname_en,publication_status')
      .eq('nickname', seed.nickname),
    db.from('celebs').select('id,slug,nickname,nickname_en,publication_status')
      .eq('nickname_en', seed.nicknameEn),
  ])
  if (koError) throw koError
  if (enError) throw enError

  const matches = [...(sameKo ?? []), ...(sameEn ?? [])]
    .filter((row, index, rows) => rows.findIndex(candidate => candidate.id === row.id) === index) as ProfileRow[]
  if (matches.length > 1) throw new Error(`${seed.nickname}의 한글명과 영문명이 서로 다른 기존 계정을 가리킵니다.`)
  if (matches.length === 1) {
    const row = matches[0]
    if (row.nickname !== seed.nickname || row.nickname_en !== seed.nicknameEn) {
      throw new Error(`${seed.nickname}과 충돌하는 기존 계정이 있습니다: ${row.nickname} / ${row.nickname_en}`)
    }
    return row
  }

  const baseSlug = previewGeneratedCelebSlug(seed.nicknameEn)
  if (!baseSlug) throw new Error(`${seed.nickname}의 slug를 만들 수 없습니다.`)
  const { data: slugRows, error: slugError } = await db.from('celebs').select('slug').like('slug', `${baseSlug}%`)
  if (slugError) throw slugError
  const occupied = new Set((slugRows ?? []).flatMap(row => row.slug ? [row.slug as string] : []))
  let slugSuffix: string | null = null
  if (occupied.has(baseSlug)) {
    for (let suffix = 2; ; suffix++) {
      if (!occupied.has(`${baseSlug}-${suffix}`)) {
        slugSuffix = String(suffix)
        break
      }
    }
  }

  // 인물은 로그인 계정을 갖지 않는다. 도메인 식별자만 직접 발급한다.
  const celebId = randomUUID()
  try {
    const { data: profile, error: profileError } = await db.from('celebs').insert({
      id: celebId,
      nickname: seed.nickname,
      nickname_en: seed.nicknameEn,
      slug_suffix: slugSuffix,
      profession: 'athlete',
      publication_status: 'suspended',
      celeb_tier: 'light',
      avatar_url: null,
      bio: null,
      consumption_philosophy: null,
      is_verified: false,
    }).select('id,slug,nickname,nickname_en,publication_status').single()
    if (profileError) throw profileError
    assertRouteSafeCelebSlug(profile.slug as string)

    const { error: metricsError } = await db.from('celeb_metrics').upsert({
      celeb_id: celebId, follower_count: 0, content_count: 0,
    })
    if (metricsError) throw metricsError
    return profile as ProfileRow
  } catch (error) {
    // 이 호출에서 만든 도메인 행만 보상 삭제한다.
    const cleanup = await db.from('celebs').delete().eq('id', celebId)
    if (cleanup.error) {
      throw new AggregateError([error, cleanup.error], `${seed.nicknameEn}: 생성 실패 뒤 celebs 정리도 실패`)
    }
    throw error
  }
}

function factionScript(
  title: string,
  titleEn: string,
  logline: string,
  groups: readonly { name: string; nameEn: string; people: readonly string[] }[],
  profiles: Map<string, ProfileRow>,
): Row {
  return {
    title,
    titleEn,
    logline,
    groups: groups.map(group => ({
      name: group.name,
      nameEn: group.nameEn,
      disabled: true,
      clusters: [{
        label: group.name,
        labelEn: group.nameEn,
        disabled: true,
        people: group.people.map(nicknameEn => {
          const profile = profiles.get(nicknameEn)
          if (!profile) throw new Error(`팩션 출연자 프로필이 없습니다: ${nicknameEn}`)
          return {
            name: profile.nickname,
            nameEn: profile.nickname_en,
            slug: profile.slug,
            celebId: profile.id,
            disabled: true,
          }
        }),
      }],
    })),
  }
}

async function createHiddenFaction(
  db: SupabaseClient,
  folder: string,
  script: Row,
): Promise<unknown> {
  const payload = buildFactionRows(script, {
    newId: randomUUID,
    status: 'blocked',
    registered: false,
    sortOrder: 0,
  })
  for (const person of payload.people) {
    person.web_hidden = true
    person.web_long_desc = null
    person.web_long_desc_en = null
    person.web_image_url = null
    person.web_quote_media = null
  }

  const { data, error } = await db.rpc('faction_replace_episode', {
    p_folder: folder,
    p_episode: payload.episode,
    p_groups: payload.groups,
    p_clusters: payload.clusters,
    p_people: payload.people,
    p_parts: payload.parts,
    p_expected_updated_at: null,
  })
  if (error) throw error
  return data
}

async function main() {
  const db = adminClient()
  const existingNewProfiles = await rowsByEnglishName(db, NEW_PROFILE_SEEDS.map(seed => seed.nicknameEn))
  const existingByName = new Map(existingNewProfiles.map(row => [row.nickname_en, row]))
  const missing = NEW_PROFILE_SEEDS.filter(seed => !existingByName.has(seed.nicknameEn))

  const { data: existingEpisodes, error: episodeError } = await db.from('faction_episodes')
    .select('folder,status,registered')
    .in('folder', ['world-best-2026', 'nba-21c-club-best'])
  if (episodeError) throw episodeError

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    profilesAlreadyPresent: existingNewProfiles.map(row => row.nickname_en),
    profilesToCreate: missing.map(seed => seed.nicknameEn),
    existingEpisodes: existingEpisodes ?? [],
  }, null, 2))
  if (!APPLY) return
  if ((existingEpisodes ?? []).length > 0) {
    throw new Error('대상 팩션 에피소드가 이미 있습니다. 기존 초안을 덮지 않도록 중단합니다.')
  }

  const created: ProfileRow[] = []
  for (const seed of missing) {
    const row = await createMinimalCeleb(db, seed)
    created.push(row)
    console.log(`CELEB 생성: ${row.nickname} (${row.slug})`)
  }

  const allProfiles = await rowsByEnglishName(db, ALL_CAST_NAMES)
  const profileMap = new Map(allProfiles.map(row => [row.nickname_en, row]))
  const unresolved = ALL_CAST_NAMES.filter(name => !profileMap.has(name))
  if (unresolved.length) throw new Error(`등록 후에도 찾지 못한 출연자: ${unresolved.join(', ')}`)

  const worldCup = factionScript(
    '2026 월드 베스트 11',
    '2026 World Cup Dream XI',
    '전 세계 팬들이 선택한 2026 월드컵의 열한 얼굴.',
    WORLD_CUP_GROUPS,
    profileMap,
  )
  const nba = factionScript(
    '21세기 NBA 3대 제국',
    'Three NBA Empires of the 21st Century',
    '2000년 이후 가장 많은 우승을 거머쥔 세 구단의 대표 왕조.',
    NBA_GROUPS,
    profileMap,
  )

  const worldCupResult = await createHiddenFaction(db, 'world-best-2026', worldCup)
  const nbaResult = await createHiddenFaction(db, 'nba-21c-club-best', nba)
  console.log(JSON.stringify({
    createdProfiles: created.map(row => ({ id: row.id, slug: row.slug, nickname: row.nickname })),
    factions: { worldCup: worldCupResult, nba: nbaResult },
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
