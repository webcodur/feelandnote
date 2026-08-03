/**
 * K-POP 엔터테인먼트 편을 추상 주제 세력에서 회사 계보 단위로 재편한다.
 *
 * 기본은 dry-run이다. --apply에서만 DB를 원자 교체하고 렌더 JSON을 다시 내보낸다.
 * 인물의 org는 현재 소속을 유지하고, 세력은 그 인물이 K-pop 산업의 문법을 만든
 * 대표 회사 계보를 뜻한다. 따라서 퇴사·독립한 인물을 현직자로 오인하지 않는다.
 *
 *   pnpm exec tsx scripts/restructure-kpop-entertainment-companies.ts
 *   pnpm exec tsx scripts/restructure-kpop-entertainment-companies.ts --apply
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assembleFactionEpisode, type FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'
import { exportFactionEpisodeToFile } from '@feelandnote/shared/bo/faction-export'
import { replaceFactionEpisode } from '../src/lib/faction-save'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_BO_DIR = path.resolve(SCRIPT_DIR, '..')
const PROJECT_ROOT = path.resolve(WEB_BO_DIR, '..', '..')
const EPISODE_DIR = path.join(PROJECT_ROOT, 'sw', 'remotion', 'public', 'factions', 'kpop-entertainment')
const DATA_PATH = path.join(EPISODE_DIR, 'faction-data.json')
const FOLDER = 'kpop-entertainment'
const APPLY = process.argv.includes('--apply')

config({ path: path.join(WEB_BO_DIR, '.env') })

type Row = Record<string, unknown>

type CompanyDef = {
  key: 'sm' | 'jyp' | 'yg' | 'hybe'
  name: string
  nameEn: string
  color: string
  tagSlug: string
  tagName: string
  tagNameEn: string
  description: string
  descriptionEn: string
  clusters: {
    label: string
    labelEn: string
    people: string[]
    /** 현재 조합과 사람이 정확히 일치하는 기존 단체샷만 살린다. */
    image?: string
  }[]
}

const COMPANIES: CompanyDef[] = [
  {
    key: 'sm',
    name: 'SM 엔터테인먼트\nK팝 시스템과 콘셉트의 원형',
    nameEn: 'SM Entertainment\nThe Blueprint for K-pop Systems and Concepts',
    color: '#EA5B9F',
    tagSlug: 'sm-entertainment',
    tagName: 'SM 엔터테인먼트',
    tagNameEn: 'SM Entertainment',
    description: 'SM을 거쳐 K팝의 훈련 시스템과 비주얼 문법을 설계한 인물들.',
    descriptionEn: 'Figures who shaped K-pop training systems and visual language through SM.',
    clusters: [
      {
        label: '창업과 크리에이티브\n시스템과 비주얼을 함께 설계하다',
        labelEn: 'Founding and Creative Direction\nDesigning the System and Its Visual Language',
        people: ['lee-soo-man', 'min-hee-jin'],
      },
      {
        label: '세대를 이은 아티스트\n아시아 진출과 여성 보컬의 기준',
        labelEn: 'Artists Across Generations\nPioneering Asia and Defining Female Vocals',
        people: ['boa', 'taeyeon'],
      },
    ],
  },
  {
    key: 'jyp',
    name: 'JYP 엔터테인먼트\n프로듀서가 이끄는 스타 시스템',
    nameEn: 'JYP Entertainment\nA Star System Led by a Producer',
    color: '#009BE6',
    tagSlug: 'jyp-entertainment',
    tagName: 'JYP 엔터테인먼트',
    tagNameEn: 'JYP Entertainment',
    description: '가수·프로듀서의 감각을 회사 시스템으로 확장하고 세대별 스타로 증명한 JYP의 계보.',
    descriptionEn: 'JYP\'s lineage of turning a singer-producer sensibility into a company system and generations of stars.',
    clusters: [
      {
        label: '창업자와 프로듀서\n무대와 회사를 함께 이끌다',
        labelEn: 'Founder and Producer\nLeading the Stage and the Company',
        people: ['park-jin-young'],
      },
      {
        label: '세대를 이은 아티스트\n솔로 한류에서 자체 제작 아이돌까지',
        labelEn: 'Artists Across Generations\nFrom a Solo Wave to Self-producing Idols',
        people: ['rain', 'jihyo', 'bang-chan'],
      },
    ],
  },
  {
    key: 'yg',
    name: 'YG · THEBLACKLABEL\n힙합과 퍼포먼스의 레이블 계보',
    nameEn: 'YG · THEBLACKLABEL\nA Label Lineage of Hip-hop and Performance',
    color: '#EF3340',
    tagSlug: 'yg-theblacklabel',
    tagName: 'YG · THEBLACKLABEL',
    tagNameEn: 'YG · THEBLACKLABEL',
    description: 'YG와 THEBLACKLABEL로 이어지는 힙합·퍼포먼스 중심의 제작 계보.',
    descriptionEn: 'A production lineage centered on hip-hop and performance across YG and THEBLACKLABEL.',
    clusters: [
      {
        label: '창업자와 프로듀서\n레이블 고유의 색을 만들다',
        labelEn: 'Founder and Producer\nBuilding a Distinct Label Identity',
        people: ['yang-hyun-suk', 'teddy-park'],
        image: '03-hiphop-rebellion/_group.png',
      },
      {
        label: '대표 아티스트\nBIGBANG과 BLACKPINK의 세계 확장',
        labelEn: 'Representative Artists\nTaking BIGBANG and BLACKPINK Worldwide',
        people: ['g-dragon', 'rose'],
      },
    ],
  },
  {
    key: 'hybe',
    name: 'HYBE\n팬덤 플랫폼과 멀티 레이블 제국',
    nameEn: 'HYBE\nA Fandom Platform and Multi-label Empire',
    color: '#7C5CFC',
    tagSlug: 'hybe',
    tagName: 'HYBE',
    tagNameEn: 'HYBE',
    description: 'BTS의 창작과 성공을 팬덤 플랫폼과 멀티 레이블 체제로 확장한 HYBE의 계보.',
    descriptionEn: 'HYBE\'s lineage of expanding BTS\'s creative work and success into a fandom platform and multi-label system.',
    clusters: [
      {
        label: '창업자와 의장\n글로벌 팬덤의 기반을 확장하다',
        labelEn: 'Founder and Chairman\nScaling the Foundations of Global Fandom',
        people: ['bang-si-hyuk'],
      },
      {
        label: 'BTS의 창작 축\n리더·프로듀서·글로벌 보컬',
        labelEn: 'BTS Creative Core\nLeader, Producer and Global Vocalist',
        people: ['kim-namjoon', 'suga', 'jungkook'],
      },
    ],
  },
]

/** 기존 6명 외 증원 인물. 직접인용은 넣지 않고, 회사 공식 연혁·프로필로 확인한 이력만 쓴다. */
const NEW_PEOPLE: Record<string, Row> = {
  boa: {
    name: '보아', nameEn: 'BoA', slug: 'boa', org: 'SM Entertainment',
    lines: ['SM 솔로 아티스트', '2000년 데뷔, 한국과 일본을 오가며 K팝 해외 진출 선도', '일본 오리콘 주간 앨범 차트 정상에 오른 첫 한국 가수'],
    linesEn: ['SM solo artist', 'Debuted in 2000 and pioneered K-pop expansion between Korea and Japan', 'First Korean artist to top Oricon\'s weekly album chart'],
  },
  taeyeon: {
    name: '태연', nameEn: 'Taeyeon', slug: 'taeyeon', org: 'SM Entertainment',
    lines: ['소녀시대 리더·솔로 아티스트', '2007년 소녀시대 데뷔, 2015년 솔로 데뷔', '「I」·「Fine」·「Four Seasons」 등 히트곡 발표'],
    linesEn: ['Girls\' Generation leader and solo artist', 'Debuted with Girls\' Generation in 2007 and as a soloist in 2015', 'Released hits including I, Fine and Four Seasons'],
  },
  rain: {
    name: '비', nameEn: 'Rain', slug: 'rain', org: 'RAIN Company',
    lines: ['가수·배우·프로듀서', 'JYP에서 2002년 솔로 데뷔', '「It\'s Raining」과 월드 투어로 2000년대 한류 확장'],
    linesEn: ['Singer, actor and producer', 'Made his solo debut at JYP in 2002', 'Expanded the Korean Wave in the 2000s with It\'s Raining and world tours'],
  },
  jihyo: {
    name: '지효', nameEn: 'Jihyo', slug: 'jihyo', org: 'JYP Entertainment',
    lines: ['트와이스 리더', '2015년 JYP에서 트와이스 데뷔', '2023년 「ZONE」으로 솔로 데뷔'],
    linesEn: ['Leader of TWICE', 'Debuted with TWICE at JYP in 2015', 'Made her solo debut with ZONE in 2023'],
  },
  'bang-chan': {
    name: '방찬', nameEn: 'Bang Chan', slug: 'bang-chan', org: 'JYP Entertainment',
    lines: ['스트레이 키즈 리더', '3RACHA 멤버, 작사·작곡·프로듀싱 주도', '2018년 JYP에서 스트레이 키즈 데뷔'],
    linesEn: ['Leader of Stray Kids', '3RACHA member who leads songwriting and production', 'Debuted with Stray Kids at JYP in 2018'],
  },
  'g-dragon': {
    name: '지드래곤', nameEn: 'G-Dragon', slug: 'g-dragon', org: 'Galaxy Corporation',
    lines: ['BIGBANG 리더·프로듀서', 'YG에서 2006년 데뷔, 「거짓말」·「하루하루」 작사·작곡', '2009년 「Heartbreaker」로 솔로 데뷔'],
    linesEn: ['BIGBANG leader and producer', 'Debuted at YG in 2006 and wrote Lies and Haru Haru', 'Made his solo debut with Heartbreaker in 2009'],
  },
  rose: {
    name: '로제', nameEn: 'Rosé', slug: 'rose', org: 'THEBLACKLABEL · Atlantic Records',
    lines: ['BLACKPINK 보컬·솔로 아티스트', 'YG에서 2016년 BLACKPINK 데뷔', 'THEBLACKLABEL에서 「APT.」·정규 앨범 「rosie」 발표'],
    linesEn: ['BLACKPINK vocalist and solo artist', 'Debuted with BLACKPINK at YG in 2016', 'Released APT. and the album rosie with THEBLACKLABEL'],
  },
  'kim-namjoon': {
    name: 'RM', nameEn: 'RM', slug: 'kim-namjoon', org: 'BIGHIT MUSIC',
    lines: ['BTS 리더·래퍼', '2013년 BIGHIT MUSIC에서 BTS 데뷔', 'BTS 작사와 솔로 앨범 「Indigo」·「Right Place, Wrong Person」'],
    linesEn: ['BTS leader and rapper', 'Debuted with BTS under BIGHIT MUSIC in 2013', 'BTS songwriter and solo artist behind Indigo and Right Place, Wrong Person'],
  },
  suga: {
    name: '슈가', nameEn: 'SUGA', slug: 'suga', org: 'BIGHIT MUSIC',
    lines: ['BTS 래퍼·프로듀서', 'BTS와 Agust D 이름으로 작사·작곡·프로듀싱', '「D-DAY」 앨범과 동명 월드 투어 발표'],
    linesEn: ['BTS rapper and producer', 'Writes and produces for BTS and as Agust D', 'Released D-DAY and launched the tour of the same name'],
  },
  jungkook: {
    name: '정국', nameEn: 'Jung Kook', slug: 'jungkook', org: 'BIGHIT MUSIC',
    lines: ['BTS 보컬·솔로 아티스트', '2013년 BIGHIT MUSIC에서 BTS 데뷔', '2023년 「Seven」과 솔로 앨범 「GOLDEN」 발표'],
    linesEn: ['BTS vocalist and solo artist', 'Debuted with BTS under BIGHIT MUSIC in 2013', 'Released Seven and the solo album GOLDEN in 2023'],
  },
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수가 없습니다.`)
  return value
}

function rowSource(db: SupabaseClient): FactionRowSource {
  return async (table, column, values) => {
    const { data, error } = await db.from(table).select('*').in(column, values)
    if (error) throw new Error(`${table} 조회 실패(${column}): ${error.message}`)
    return (data ?? []) as Row[]
  }
}

function peopleOf(script: Row): Map<string, Row> {
  const people = new Map<string, Row>()
  for (const group of (script.groups ?? []) as Row[]) {
    for (const cluster of (group.clusters ?? []) as Row[]) {
      for (const person of (cluster.people ?? []) as Row[]) {
        const slug = typeof person.slug === 'string' ? person.slug : ''
        if (!slug) throw new Error(`slug 없는 인물이 있습니다: ${String(person.name ?? '이름 없음')}`)
        if (people.has(slug)) throw new Error(`중복 인물 slug가 있습니다: ${slug}`)
        people.set(slug, person)
      }
    }
  }
  return people
}

async function unresolvedProfileSlugs(db: SupabaseClient, slugs: string[]): Promise<string[]> {
  const { data, error } = await db.from('profiles').select('slug').in('slug', slugs)
  if (error) throw new Error(`셀럽 프로필 연결 확인 실패: ${error.message}`)
  const resolved = new Set((data ?? []).map(row => row.slug as string))
  return slugs.filter(slug => !resolved.has(slug)).sort()
}

function buildScript(script: Row): Row {
  const people = peopleOf(script)
  const expected = new Set(COMPANIES.flatMap(company => company.clusters.flatMap(cluster => cluster.people)))
  const unknown = [...people.keys()].filter(slug => !expected.has(slug))
  const missingWithoutTemplate = [...expected].filter(slug => !people.has(slug) && !NEW_PEOPLE[slug])
  if (unknown.length || missingWithoutTemplate.length) {
    throw new Error(`명단이 예상과 달라 자동 재편을 중단합니다. 추가=${unknown.join(', ') || '없음'} 누락=${missingWithoutTemplate.join(', ') || '없음'}`)
  }
  if (Array.isArray(script.longformLayout) && script.longformLayout.length) {
    throw new Error('기존 longformLayout이 있어 자동으로 순서를 바꾸지 않습니다. 편집기에서 먼저 확인하세요.')
  }

  const groups = COMPANIES.map(company => ({
    name: company.name,
    nameEn: company.nameEn,
    color: company.color,
    tagSlug: company.tagSlug,
    clusters: company.clusters.map(cluster => ({
      label: cluster.label,
      labelEn: cluster.labelEn,
      ...(cluster.image ? { image: cluster.image } : {}),
      people: cluster.people.map(slug => people.get(slug) ?? NEW_PEOPLE[slug]),
    })),
  }))

  return {
    ...script,
    logline: 'SM·JYP·YG·HYBE, 회사를 만든 제작자와 그 색을 세계에 각인한 아티스트들',
    loglineEn: 'SM, JYP, YG and HYBE: the producers who built the companies and the artists who took their sound worldwide',
    heroes: ['lee-soo-man', 'park-jin-young', 'yang-hyun-suk', 'bang-si-hyuk'],
    groups,
  }
}

async function loadMusicTagId(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.from('celeb_tags').select('id').eq('slug', 'music').maybeSingle()
  if (error) throw new Error(`음악 상위 태그 조회 실패: ${error.message}`)
  if (!data) throw new Error('음악 상위 태그(slug=music)가 없습니다.')
  return data.id as string
}

async function ensureCompanyTags(db: SupabaseClient): Promise<void> {
  const musicTagId = await loadMusicTagId(db)
  for (const [index, company] of COMPANIES.entries()) {
    const { data: current, error: lookupError } = await db.from('celeb_tags')
      .select('id,name,name_en,description,description_en,color,parent_id')
      .eq('slug', company.tagSlug).maybeSingle()
    if (lookupError) throw new Error(`태그 조회 실패(${company.tagSlug}): ${lookupError.message}`)

    if (!current) {
      const { error } = await db.from('celeb_tags').insert({
        slug: company.tagSlug,
        name: company.tagName,
        name_en: company.tagNameEn,
        description: company.description,
        description_en: company.descriptionEn,
        color: company.color,
        parent_id: musicTagId,
        sort_order: 780 + index,
        is_featured: false,
        is_fiction: false,
      })
      if (error) throw new Error(`태그 생성 실패(${company.tagSlug}): ${error.message}`)
      continue
    }

    const patch: Row = {}
    if (!current.name) patch.name = company.tagName
    if (!current.name_en) patch.name_en = company.tagNameEn
    if (!current.description) patch.description = company.description
    if (!current.description_en) patch.description_en = company.descriptionEn
    if (!current.color) patch.color = company.color
    if (!current.parent_id) patch.parent_id = musicTagId
    if (Object.keys(patch).length) {
      const { error } = await db.from('celeb_tags').update(patch).eq('id', current.id)
      if (error) throw new Error(`태그 보강 실패(${company.tagSlug}): ${error.message}`)
    }
  }
}

async function snapshotBeforeApply(db: SupabaseClient): Promise<string> {
  const { data: episode, error: episodeError } = await db.from('faction_episodes')
    .select('*').eq('folder', FOLDER).single()
  if (episodeError) throw new Error(`백업 에피소드 조회 실패: ${episodeError.message}`)
  const { data: groups, error: groupError } = await db.from('faction_groups')
    .select('*').eq('episode_id', episode.id)
  if (groupError) throw new Error(`백업 세력 조회 실패: ${groupError.message}`)
  const groupIds = (groups ?? []).map(group => group.id as string)
  const { data: clusters, error: clusterError } = await db.from('faction_clusters')
    .select('*').in('group_id', groupIds)
  if (clusterError) throw new Error(`백업 묶음 조회 실패: ${clusterError.message}`)
  const clusterIds = (clusters ?? []).map(cluster => cluster.id as string)
  const { data: people, error: peopleError } = await db.from('faction_people')
    .select('*').in('cluster_id', clusterIds)
  if (peopleError) throw new Error(`백업 인물 조회 실패: ${peopleError.message}`)
  const { data: tags, error: tagError } = await db.from('celeb_tags')
    .select('*').in('slug', ['music', ...COMPANIES.map(company => company.tagSlug)])
  if (tagError) throw new Error(`백업 태그 조회 실패: ${tagError.message}`)

  const backupDir = path.join(PROJECT_ROOT, 'backups', 'factions')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `${FOLDER}-before-company-restructure-${stamp}.json`)
  writeFileSync(backupPath, `${JSON.stringify({ episode, groups, clusters, people, tags }, null, 2)}\n`, 'utf8')
  return backupPath
}

async function exportFile(db: SupabaseClient): Promise<string> {
  mkdirSync(EPISODE_DIR, { recursive: true })
  const result = await exportFactionEpisodeToFile({
    folder: FOLDER,
    episodeDir: EPISODE_DIR,
    dataPath: DATA_PATH,
    // 이 스크립트 자체가 사람이 승인한 DB 재편 입구다. 기존 산출물이 옛 3세력인 것은
    // 예상된 차이이므로, DB 저장 성공 뒤 그 파일만 백업하고 새 정본을 발효한다.
    force: true,
    assemble: async original => {
      const { script, row } = await assembleFactionEpisode(rowSource(db), FOLDER, original)
      return { script, episodeId: row.id as string }
    },
  })
  if (!result.written) {
    throw new Error(`렌더 JSON 내보내기 중단: ${result.reason}\n${(result.diffs ?? []).join('\n')}`)
  }
  return result.reason
}

async function verify(db: SupabaseClient): Promise<void> {
  const { script } = await assembleFactionEpisode(rowSource(db), FOLDER)
  const groups = (script.groups ?? []) as Row[]
  if (groups.length !== COMPANIES.length) throw new Error(`검증 실패: 세력 ${groups.length}/${COMPANIES.length}`)

  for (const [index, company] of COMPANIES.entries()) {
    const group = groups[index]
    const actualName = typeof group.name === 'string' ? group.name : ''
    if (actualName !== company.name) throw new Error(`검증 실패: ${index + 1}번 세력 이름 불일치`)
    if (group.tagSlug !== company.tagSlug) throw new Error(`검증 실패: ${company.key} tagSlug 불일치`)
    const actualPeople = [...peopleOf({ groups: [group] }).keys()]
    const expectedPeople = company.clusters.flatMap(cluster => cluster.people)
    if (actualPeople.join('|') !== expectedPeople.join('|')) {
      throw new Error(`검증 실패: ${company.key} 인물 ${actualPeople.join(', ')}`)
    }
  }

  const { data: episode, error: episodeError } = await db.from('faction_episodes')
    .select('id').eq('folder', FOLDER).single()
  if (episodeError) throw new Error(`검증 에피소드 조회 실패: ${episodeError.message}`)
  const { data: dbGroups, error: groupError } = await db.from('faction_groups')
    .select('position,name,tag_id').eq('episode_id', episode.id).order('position')
  if (groupError) throw new Error(`검증 세력 조회 실패: ${groupError.message}`)
  if ((dbGroups ?? []).some(group => !group.tag_id)) throw new Error('검증 실패: 태그 미연결 세력이 있습니다.')

  const tagIds = (dbGroups ?? []).map(group => group.tag_id as string)
  const { data: tags, error: tagError } = await db.from('celeb_tags').select('id,slug').in('id', tagIds)
  if (tagError) throw new Error(`검증 태그 조회 실패: ${tagError.message}`)
  const slugById = new Map((tags ?? []).map(tag => [tag.id as string, tag.slug as string]))
  for (const [index, group] of (dbGroups ?? []).entries()) {
    if (slugById.get(group.tag_id as string) !== COMPANIES[index].tagSlug) {
      throw new Error(`검증 실패: ${COMPANIES[index].key} DB 태그 연결 불일치`)
    }
  }

  if (!existsSync(DATA_PATH)) throw new Error(`검증 실패: ${DATA_PATH} 없음`)
  const peopleCount = COMPANIES.reduce((sum, company) => sum + company.clusters.reduce((n, cluster) => n + cluster.people.length, 0), 0)
  console.log(`검증 완료: ${groups.length}개 회사 세력 · ${peopleCount}명 · 태그 연결 ${tagIds.length}/${groups.length}`)
}

async function main() {
  const db = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  const { script, row } = await assembleFactionEpisode(rowSource(db), FOLDER)
  const next = buildScript(script as Row)
  const expectedUnresolved = await unresolvedProfileSlugs(db, [...peopleOf(next).keys()])
  if (expectedUnresolved.length) {
    throw new Error(`DB CELEB 미연결 인물은 재편할 수 없습니다: ${expectedUnresolved.join(', ')}`)
  }

  console.log('현재 → 회사 단위 재편')
  for (const group of (script.groups ?? []) as Row[]) {
    console.log(`  - ${String(group.name ?? '').split('\n')[0]}: ${[...peopleOf({ groups: [group] }).keys()].join(', ')}`)
  }
  console.log('재편안')
  for (const company of COMPANIES) {
    console.log(`  + ${company.tagName}: ${company.clusters.flatMap(cluster => cluster.people).join(', ')}`)
  }
  console.log('불일치 단체샷·콘셉트 로고는 연결을 해제하고, 인물 사진 경로는 그대로 보존합니다.')

  if (!APPLY) {
    console.log('\n쓰기 없음. 적용하려면 --apply를 붙이세요.')
    return
  }

  const backupPath = await snapshotBeforeApply(db)
  console.log(`\n사전 백업: ${backupPath}`)
  await ensureCompanyTags(db)
  const result = await replaceFactionEpisode(db, FOLDER, next, row.updated_at as string)
  const exportReason = await exportFile(db)
  await verify(db)
  console.log(`DB 저장: 세력 ${result.counts.groups} · 묶음 ${result.counts.clusters} · 인물 ${result.counts.people}`)
  console.log(`렌더 JSON: ${exportReason}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
