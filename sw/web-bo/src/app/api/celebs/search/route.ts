import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 셀럽 검색 — 관리 화면 두 곳이 함께 쓴다.
 *   · 콘텐츠·기록 화면의 셀럽 고르기 (이름만으로 몇 명 추리는 용도)
 *   · 세력도감 편집기의 인물 찾기 (연결 키·직함·국적까지 보고 고른다)
 *
 * 응답 모양은 `{ celebs: [...] }` 하나로 유지한다. 예전 영상 관리 대시보드는 배열을 그대로
 * 돌려줬는데, 두 모양이 섞이면 어느 쪽이 맞는지 화면마다 갈리므로 이쪽으로 통일했다.
 *
 * 검색어 없이 부르면 이름순 앞쪽을 `limit` 만큼 돌려준다(세력도감 인물 찾기가 처음 열릴 때 그렇게 쓴다).
 * 검색어를 준 경우에만 좁힌다.
 */

/** 세력도감 편집기가 부제·배지에 쓰는 값까지 포함한다 */
const SELECT = `
  id, slug, nickname, nickname_en, title, profession, nationality,
  bio, avatar_url, portrait_url, speech_tone, has_voice, voice_id_ko, voice_id_en,
  birth_date, death_date, celeb_tier, status:publication_status
`

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const q = sp.get('q')?.trim() ?? ''
  const profession = sp.get('profession')
  const hasVoice = sp.get('hasVoice')
  /** 세력도감 편집기에서 부르는 경우 — 이미 나온 편 배지를 함께 돌려준다 */
  const includeFiction = sp.get('includeFiction') === '1'
  /** 이미 세력도감에 나온 인물인지 함께 표시. 조회가 늘어나므로 요청할 때만 한다 */
  const withEpisode = includeFiction || sp.get('withEpisode') === '1'
  const limit = Math.min(Math.max(Number(sp.get('limit') ?? 10), 1), 100)

  const supabase = await createClient()

  let query = supabase
    .from('celebs')
    .select(SELECT)
    .order('nickname')
    .limit(limit)

  /*
    서비스에 떠 있는 인물(active)만 고르게 하지 않는다. 세력도감 제작 명단은 서비스 진열보다
    범위가 넓어, 아직 서비스에 안 뜨는 인물도 영상에는 나온다. 그래서 검색은 지워진 계정만 빼고
    다 보여주고, 서비스에 안 뜨는 인물을 새로 붙이면 저장할 때 도감에서 감춘 채로 들어간다
    (`lib/faction-save.ts`). 삭제(deleted)만 여기서 걸러낸다.
  */
  query = query.in('publication_status', ['active', 'inactive', 'suspended'])

  if (q) {
    // 연결 키(slug)로도 찾게 한다 — 세력도감는 이름보다 키를 먼저 아는 경우가 많다
    query = query.or(`nickname.ilike.%${q}%,nickname_en.ilike.%${q}%,slug.ilike.%${q}%`)
  }
  if (profession) query = query.eq('profession', profession)
  if (hasVoice === 'true') query = query.eq('has_voice', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const episodeByCelebId = withEpisode ? await factionEpisodeByCelebId(rows) : new Map<string, string>()

  return NextResponse.json({
    celebs: rows.map(c => ({
      ...c,
      // 이 인물이 이미 등장하는 세력도감 편(없으면 null)
      existingEpisode: episodeByCelebId.get(c.id as string) ?? null,
    })),
  })
}

/**
 * 인물 연결 키 → 그 인물이 등장하는 세력도감 편 폴더명.
 *
 * 예전에는 에피소드 폴더를 통째로 훑어 만들었다. 이제 등장 인물이 DB 에 있으므로 조회로 끝난다.
 * 여러 편에 나오는 인물은 그중 한 편을 대표로 보여준다 — 화면은 "이미 쓰인 인물"임만 알리면 된다.
 */
async function factionEpisodeByCelebId(
  rows: Record<string, unknown>[],
): Promise<Map<string, string>> {
  const celebIds = [...new Set(
    rows.map(r => r.id).filter((id): id is string => typeof id === 'string' && !!id),
  )]
  const out = new Map<string, string>()
  if (!celebIds.length) return out

  // 팩션 5테이블은 admin 전용이라 service role 로 읽는다. 이 창구는 관리 화면 전용이다.
  const db = createAdminClient()
  const { data: people, error: peopleError } = await db
    .from('faction_people').select('celeb_id,cluster_id').in('celeb_id', celebIds)
  if (peopleError) throw new Error(`Failed to load faction people: ${peopleError.message}`)
  if (!people?.length) return out

  const clusterIds = [...new Set(people.map(p => p.cluster_id as string))]
  const { data: clusters, error: clustersError } = await db
    .from('faction_clusters').select('id,group_id').in('id', clusterIds)
  if (clustersError) throw new Error(`Failed to load faction clusters: ${clustersError.message}`)
  const groupIds = [...new Set((clusters ?? []).map(c => c.group_id as string))]
  const { data: groups, error: groupsError } = await db
    .from('faction_groups').select('id,episode_id').in('id', groupIds)
  if (groupsError) throw new Error(`Failed to load faction groups: ${groupsError.message}`)
  const episodeIds = [...new Set((groups ?? []).map(g => g.episode_id as string))]
  const { data: episodes, error: episodesError } = await db
    .from('faction_episodes').select('id,folder').in('id', episodeIds)
  if (episodesError) throw new Error(`Failed to load faction episodes: ${episodesError.message}`)

  const folderById = new Map((episodes ?? []).map(e => [e.id as string, e.folder as string]))
  const episodeByGroup = new Map((groups ?? []).map(g => [g.id as string, folderById.get(g.episode_id as string)]))
  const episodeByCluster = new Map((clusters ?? []).map(c => [c.id as string, episodeByGroup.get(c.group_id as string)]))
  for (const p of people) {
    const folder = episodeByCluster.get(p.cluster_id as string)
    const celebId = p.celeb_id as string
    if (folder && celebId && !out.has(celebId)) out.set(celebId, folder)
  }
  return out
}
