/*
  도감 손 명단 → 제작 데이터 이관 (단일 원천화)

  세력도감에 손으로 넣어 둔 인물(celeb_tag_assignments)을 그 테마가 걸린 **영상 편 안의
  비활성 세력**으로 옮긴다. 비활성 세력은 영상에서 빠지고 도감에는 그대로 나오므로
  (도감 뷰는 세력의 비활성 여부를 보지 않는다), 편집기 한 화면이 곧 도감이 된다.

  옮기는 값: 이름·연결 키·한 줄 소개(lines[0])·상세 소개(epithet)·대사(quote)·개인 사진·감춤 여부.
  옮긴 뒤 원래 손 명단은 백업하고 지운다.

  실행:
    npx tsx scripts/migrate-atlas-manual-to-production.ts --folder=humanoids [--dry]

  주의: 대본 전체를 다시 저장하는 경로라 편집기에서 저장 중이면 잠금 충돌로 거부된다.
*/
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { replaceFactionEpisode } from '../src/lib/faction-save'

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}
loadEnv()

/** 사람을 어느 회사(세력) 아래 세울지 — 편마다 사람이 정한다. 없으면 한 세력에 몰아넣는다 */
const GROUP_BY_PERSON: Record<string, Record<string, string>> = {
  humanoids: {
    '밀란 코박': 'Tesla',
    '마크 라이버트': 'Boston Dynamics',
    '로버트 플레이터': 'Boston Dynamics',
    '브렛 애드콕': 'Figure AI',
    '베른트 뵈르니히': '1X Technologies',
    '왕싱싱': '중국 굴기',
    '히로세 마사토': 'Honda',
    '조너선 허스트': 'Agility Robotics',
  },
  'special-forces': {
    '데이비드 스털링': '영국 SAS',
    '찰리 벡위드': '미국 델타포스',
    '리처드 마신코': '미국 Navy SEALs',
    '윌리엄 맥레이븐': '미국 Navy SEALs',
    '울리히 베게너': '독일 GSG 9',
    '크리스티앙 프루토': '프랑스 GIGN',
    '백문오': '한국 제1공수특전단',
    '장인표': '한국 UDT/SEAL',
    '조영주': '청해부대',
  },
  'aviation-industry': {
    '윌리엄 보잉': '미국 보잉',
    '조 서터': '미국 보잉',
    '로제 베테유': '유럽 에어버스',
    '기욤 포리': '유럽 에어버스',
    '켈리 오트버그': '미국 보잉',
    '래리 컬프': 'GE Aerospace',
    '우광후이': '중국 COMAC',
    '허둥펑': '중국 COMAC',
    '프란시스쿠 고미스 네투': 'Embraer',
  },
  'intelligence-agencies': {
    '윌리엄 도너번': '미국 CIA',
    '맨스필드 스미스커밍': '영국 MI6',
    '스튜어트 멘지스': '영국 MI6',
    '레우벤 실로아흐': '이스라엘 모사드',
    '이세르 하렐': '이스라엘 모사드',
    '엘리 코헨': '이스라엘 모사드',
    '메이르 다간': '이스라엘 모사드',
    '토니 멘데즈': '미국 CIA',
  },
  'ev-wars': {
    '왕촨푸': '글로벌 완성차',
    '쩡위췬': '배터리 셀 (Big 3)',
    '피터 롤린슨': '프리미엄 & 신흥',
    'RJ 스캐린지': '프리미엄 & 신흥',
    '슈테판 베크바흐': '프리미엄 & 신흥',
    '이상엽': '글로벌 완성차',
    '김동명': '배터리 셀 (Big 3)',
    '다다노부 가즈오': '배터리 셀 (Big 3)',
  },
  'autonomous-driving': {
    '세바스찬 스런': '알파벳의 아이들',
    '드미트리 돌고프': '알파벳의 아이들',
    '테케드라 마와카나': '알파벳의 아이들',
    '크리스 엄슨': 'Aurora Innovation',
    '암논 샤슈아': 'Mobileye',
    '카일 보그트': '전통 거인의 자존심',
    '알렉스 켄달': 'Wayve',
    '제임스 펑': 'Pony.ai',
  },
  'drone-industry': {
    '에이브러햄 카렘': '군사용 무인기',
    '왕타오': '민수용 제왕',
    '린든 블루': '군사용 무인기',
    '셀추크 바이락타르': '군사용 무인기',
    '애덤 브라이': 'AI 자율 비행',
    '캐시 워든': '군사용 무인기',
    '켈러 리나우도': 'Zipline',
  },
  'great-hackers-masked': {
    '피터 잣코': '해커티비스트',
    '베토 오로크': '해커티비스트',
    '엑토르 몬세구르': '해커티비스트',
    '제이크 데이비스': '해커티비스트',
    '무스타파 알바삼': '해커티비스트',
    '제러미 해먼드': '해커티비스트',
  },
  'defense-industry': {
    '짐 타이클렛': '미국 거대 군산',
    '피비 노바코비치': '미국 거대 군산',
    '브랜던 쳉': '실리콘밸리 방산',
    '아르민 파퍼거': '유럽 방산 자존심',
    '에릭 트라피에': '유럽 방산 자존심',
    '손재일': '한국 신흥 군산',
    '김동수': '한국 신흥 군산',
  },
  'renaissance-artists': {
    '로렌초 데 메디치': '피렌체 메디치 가문',
    '니콜로 마키아벨리': '피렌체 공화국',
    '갈릴레오 갈릴레이': '과학혁명',
  },
  'great-hackers-state': {
    '키스 알렉산더': '미국 국가안보국',
    '길 슈베드': '이스라엘 8200부대',
  },
  'chu-han-contention': {
    '한비자': '진(秦)의 법가',
  },
  'peter-thiel-universe': {
    '피터 틸': '자본과 권력',
  },
  'three-kingdoms': {
    '채염': '위 (Cao Wei)',
  },
}

/** 기존 세력에 합쳐지지 않고 남는 비활성 세력의 영문 이름 */
const GROUP_NAME_EN: Record<string, string> = {
  '미국 델타포스': 'U.S. Delta Force',
  '독일 GSG 9': "Germany's GSG 9",
  '프랑스 GIGN': "France's GIGN",
  '한국 제1공수특전단': "South Korea's 1st Airborne Special Forces Group",
  '한국 UDT/SEAL': "South Korea's UDT/SEAL",
  '청해부대': 'Cheonghae Unit',
  '피렌체 메디치 가문': 'The Medici of Florence',
  '피렌체 공화국': 'Florentine Republic',
  '과학혁명': 'Scientific Revolution',
  '미국 국가안보국': 'U.S. National Security Agency',
  '이스라엘 8200부대': "Israel's Unit 8200",
  '진(秦)의 법가': 'Legalism of Qin',
}

/** 매핑에 없는 사람을 담을 세력 이름 */
const FALLBACK_GROUP = '도감 명단'

type Row = Record<string, unknown>

interface ManualMember {
  id: string
  celebId: string
  nickname: string
  slug: string | null
  shortDesc: string | null
  longDesc: string | null
  shortDescEn: string | null
  longDescEn: string | null
  quote: string | null
  quoteEn: string | null
  imageUrl: string | null
  hidden: boolean
  groupName: string
}

async function loadManualMembers(
  db: SupabaseClient, folder: string, tagIds: string[],
): Promise<ManualMember[]> {
  const { data: rows, error } = await db
    .from('celeb_tag_assignments')
    .select('id, celeb_id, tag_id, short_desc, long_desc, short_desc_en, long_desc_en, quote, quote_en, faction_image_url, hidden, sort_order')
    .in('tag_id', tagIds)
    .order('sort_order')
  if (error) throw new Error(`손 명단 조회 실패: ${error.message}`)
  if (!rows?.length) return []

  const celebIds = [...new Set(rows.map(r => r.celeb_id as string))]
  const { data: profiles, error: pErr } = await db
    .from('profiles').select('id, nickname, slug').in('id', celebIds)
  if (pErr) throw new Error(`인물 조회 실패: ${pErr.message}`)
  const byId = new Map((profiles ?? []).map(p => [p.id as string, p]))

  const mapping = GROUP_BY_PERSON[folder] ?? {}
  return rows.map(r => {
    const p = byId.get(r.celeb_id as string)
    const nickname = (p?.nickname as string) ?? '(이름 없음)'
    return {
      id: r.id as string,
      celebId: r.celeb_id as string,
      nickname,
      slug: (p?.slug as string) ?? null,
      shortDesc: r.short_desc as string | null,
      longDesc: r.long_desc as string | null,
      shortDescEn: r.short_desc_en as string | null,
      longDescEn: r.long_desc_en as string | null,
      quote: r.quote as string | null,
      quoteEn: r.quote_en as string | null,
      imageUrl: r.faction_image_url as string | null,
      hidden: r.hidden === true,
      groupName: mapping[nickname] ?? FALLBACK_GROUP,
    }
  })
}

/** 손 명단 한 사람 → 대본 인물 항목 */
function toScriptPerson(m: ManualMember): Row {
  const lines = [m.shortDesc].filter((v): v is string => !!v && !!v.trim())
  const linesEn = [m.shortDescEn].filter((v): v is string => !!v && !!v.trim())
  return {
    name: m.nickname,
    ...(m.slug ? { slug: m.slug } : {}),
    ...(lines.length ? { lines } : {}),
    ...(linesEn.length ? { linesEn } : {}),
    ...(m.longDesc ? { epithet: m.longDesc } : {}),
    ...(m.longDescEn ? { epithetEn: m.longDescEn } : {}),
    ...(m.quote ? { quote: m.quote } : {}),
    ...(m.quoteEn ? { quoteEn: m.quoteEn } : {}),
  }
}

async function main() {
  const dry = process.argv.includes('--dry')
  const folder = process.argv.find(a => a.startsWith('--folder='))?.split('=')[1] ?? 'humanoids'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 누락')
  const db = createClient(url, key)

  const src = async (table: string, column: string, values: string[]) => {
    const { data, error } = await db.from(table).select('*').in(column, values)
    if (error) throw new Error(`${table}: ${error.message}`)
    return (data ?? []) as Row[]
  }

  const { script, row } = await assembleFactionEpisode(src, folder)
  const episodeId = row.id as string
  const expectedUpdatedAt = row.updated_at as string

  // 이 편의 세력이 가리키는 테마
  const { data: groupRows, error: gErr } = await db
    .from('faction_groups').select('tag_id').eq('episode_id', episodeId).not('tag_id', 'is', null)
  if (gErr) throw new Error(`세력 조회 실패: ${gErr.message}`)
  const tagIds = [...new Set((groupRows ?? []).map(g => g.tag_id as string))]
  if (!tagIds.length) throw new Error(`${folder}: 테마에 연결된 세력이 없다`)

  const { data: tagRows } = await db.from('celeb_tags').select('id, slug, name').in('id', tagIds)
  const tagById = new Map((tagRows ?? []).map(t => [t.id as string, t]))

  // 제작에 이미 있는 사람은 건너뛴다 — 옮길 대상은 손 명단뿐이다
  const { data: peopleRows } = await db
    .from('faction_people').select('celeb_id, cluster_id').not('celeb_id', 'is', null)
  const { data: clusterRows } = await db.from('faction_clusters').select('id, group_id')
  const { data: allGroups } = await db.from('faction_groups').select('id, episode_id, tag_id')
  const groupOfCluster = new Map((clusterRows ?? []).map(c => [c.id as string, c.group_id as string]))
  const tagOfGroup = new Map((allGroups ?? []).map(g => [g.id as string, g.tag_id as string | null]))
  const producedPairs = new Set(
    (peopleRows ?? []).flatMap(p => {
      const tag = tagOfGroup.get(groupOfCluster.get(p.cluster_id as string) ?? '')
      return tag ? [`${tag}:${p.celeb_id}`] : []
    }),
  )

  const members = (await loadManualMembers(db, folder, tagIds))
    .filter(m => !producedPairs.has(`${tagIds[0]}:${m.celebId}`))

  if (!members.length) {
    console.log(`${folder}: 옮길 손 명단이 없다`)
    return
  }

  // 테마가 하나뿐인 편만 다룬다 — 여러 테마가 섞이면 어느 세력에 붙일지 사람이 정해야 한다
  if (tagIds.length > 1) {
    throw new Error(`${folder}: 테마가 ${tagIds.length}개라 자동 이관 대상이 아니다`)
  }
  const tagSlug = tagById.get(tagIds[0])?.slug as string | undefined
  if (!tagSlug) throw new Error('테마 주소(slug)가 없다')

  // 회사별로 묶어 비활성 세력을 만든다 — 영상에서는 빠지고 도감에는 그대로 선다
  const byGroup = new Map<string, ManualMember[]>()
  for (const m of members) {
    const list = byGroup.get(m.groupName) ?? []
    list.push(m)
    byGroup.set(m.groupName, list)
  }

  const newGroups: Row[] = [...byGroup.entries()].map(([name, list]) => ({
    name,
    nameEn: GROUP_NAME_EN[name] ?? name,
    disabled: true,
    tagSlug,
    clusters: [{ people: list.map(toScriptPerson) }],
  }))

  const groups = [...((script.groups ?? []) as Row[]), ...newGroups]
  const nextScript = { ...script, groups }

  console.log(`${folder} — 손 명단 ${members.length}명을 비활성 세력 ${newGroups.length}개로 옮긴다`)
  for (const [name, list] of byGroup) {
    console.log(`  · ${name}: ${list.map(m => m.nickname).join(', ')}`)
  }
  if (dry) { console.log('(dry-run — 저장하지 않았다)'); return }

  // 원본 손 명단 백업 — 지우기 전에 파일로 남긴다
  const backupDir = path.join(__dirname, '..', '..', '..', '_backup')
  mkdirSync(backupDir, { recursive: true })
  const backupPath = path.join(backupDir, `celeb-tag-assignments-${folder}-migrated.json`)
  writeFileSync(backupPath, JSON.stringify(members, null, 2), 'utf8')
  console.log(`백업: ${backupPath}`)

  const result = await replaceFactionEpisode(db, folder, nextScript, expectedUpdatedAt)
  console.log(`저장 완료 — 세력 ${result.counts.groups} · 인물 ${result.counts.people}`)

  // 저장 뒤 도감 손질값 교정 — 개인 사진과 감춤 여부는 대본에 없는 값이라 여기서 넣는다.
  // (새로 실린 인물은 저장 규칙상 서비스 비공개면 감춤으로 들어가므로 원래 상태로 되돌린다)
  const { data: saved } = await db
    .from('faction_people').select('id, celeb_id, cluster_id').not('celeb_id', 'is', null)
  const { data: savedClusters } = await db.from('faction_clusters').select('id, group_id')
  const { data: savedGroups } = await db
    .from('faction_groups').select('id, disabled').eq('episode_id', episodeId)
  const disabledGroupIds = new Set((savedGroups ?? []).filter(g => g.disabled).map(g => g.id as string))
  const clusterToGroup = new Map((savedClusters ?? []).map(c => [c.id as string, c.group_id as string]))
  const personByCeleb = new Map<string, string>()
  for (const p of saved ?? []) {
    const gid = clusterToGroup.get(p.cluster_id as string)
    if (gid && disabledGroupIds.has(gid)) personByCeleb.set(p.celeb_id as string, p.id as string)
  }

  let fixed = 0
  for (const m of members) {
    const personId = personByCeleb.get(m.celebId)
    if (!personId) continue
    const { error } = await db.from('faction_people').update({
      web_hidden: m.hidden,
      web_image_url: m.imageUrl,
    }).eq('id', personId)
    if (error) { console.log(`⚠ ${m.nickname} 손질값 반영 실패: ${error.message}`); continue }
    fixed += 1
  }
  console.log(`도감 손질값 반영: ${fixed}명`)

  // 원래 손 명단 삭제 — 같은 사람이 두 갈래로 실리지 않게 한다
  const { error: delErr } = await db
    .from('celeb_tag_assignments').delete().in('id', members.map(m => m.id))
  if (delErr) throw new Error(`손 명단 삭제 실패: ${delErr.message}`)
  console.log(`손 명단 ${members.length}건 삭제`)
}

main().catch(e => { console.error(e); process.exit(1) })
