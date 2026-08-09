/**
 * 한국 아이돌 그룹 팩션 4편을 DB SSoT에 편성한다.
 *
 * 기본은 dry-run이다. --apply에서만 태그와 팩션 4편을 갱신한다.
 * 현직/과거는 개인의 탈퇴 여부가 아니라 그룹 자체의 최근 활동성을 기준으로 한다.
 * 최근 앨범과 정기 팀 활동을 이어가는 그룹은 현직이다.
 * 재결합·기념 공연·간헐적 팬콘만 있는 그룹은 과거로 둔다.
 * 기존 서비스 인물을 빠뜨리지 않도록 최근 생성분이 아니라 음악가 프로필 전량을 조회한다.
 *
 *   pnpm exec tsx scripts/repair-idol-factions.ts
 *   pnpm exec tsx scripts/repair-idol-factions.ts --apply
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { assembleFactionEpisode, type FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'
import { exportFactionEpisodeToFile } from '@feelandnote/shared/bo/faction-export'
import { replaceFactionEpisode } from '../src/lib/faction-save'
import { revalidateWebCache } from '../src/lib/revalidate-web'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_BO_DIR = path.resolve(SCRIPT_DIR, '..')
const PROJECT_ROOT = path.resolve(WEB_BO_DIR, '..', '..')
const FACTIONS_DIR = path.join(PROJECT_ROOT, 'sw', 'remotion', 'public', 'factions')
config({ path: path.join(WEB_BO_DIR, '.env') })

const APPLY = process.argv.includes('--apply')
const EXPORT_ONLY = process.argv.includes('--export-only')
const CURRENT_FEMALE_TAG_ID = '269cd3a9-18b9-4fe3-87ea-854a87c09e91'
const UNUSED_CURRENT_TAG_ID = '94aff461-7ce9-4f1c-9e71-825fba1b39a4'

type Gender = 'male' | 'female'
type CategoryKey = 'current-male' | 'former-male' | 'current-female' | 'former-female'
type ProfileRow = {
  id: string
  nickname: string
  nickname_en: string | null
  slug: string
  gender: boolean | null
  status: string | null
  title: string | null
  created_at: string
}

type GroupDef = { ko: string; en: string; gender: Gender; past?: boolean }
const GROUPS: GroupDef[] = [
  { ko: '방탄소년단', en: 'BTS', gender: 'male' },
  { ko: '빅뱅', en: 'BIGBANG', gender: 'male', past: true },
  { ko: '엑소', en: 'EXO', gender: 'male' },
  { ko: '세븐틴', en: 'SEVENTEEN', gender: 'male' },
  { ko: '스트레이 키즈', en: 'Stray Kids', gender: 'male' },
  { ko: 'NCT 127', en: 'NCT 127', gender: 'male' },
  { ko: 'NCT 드림', en: 'NCT DREAM', gender: 'male' },
  { ko: '투바투', en: 'TOMORROW X TOGETHER', gender: 'male' },
  { ko: '엔하이픈', en: 'ENHYPEN', gender: 'male' },
  { ko: '에이티즈', en: 'ATEEZ', gender: 'male' },
  { ko: '갓세븐', en: 'GOT7', gender: 'male' },
  { ko: '샤이니', en: 'SHINee', gender: 'male' },
  { ko: '슈퍼주니어', en: 'Super Junior', gender: 'male' },
  { ko: '몬스타엑스', en: 'MONSTA X', gender: 'male' },
  { ko: '아이콘', en: 'iKON', gender: 'male' },
  { ko: '제로베이스원', en: 'ZEROBASEONE', gender: 'male' },
  { ko: '라이즈', en: 'RIIZE', gender: 'male' },
  { ko: '보이넥스트도어', en: 'BOYNEXTDOOR', gender: 'male' },
  { ko: '블랙핑크', en: 'BLACKPINK', gender: 'female' },
  { ko: '트와이스', en: 'TWICE', gender: 'female' },
  { ko: '뉴진스', en: 'NewJeans', gender: 'female', past: true },
  { ko: '에스파', en: 'aespa', gender: 'female' },
  { ko: '아이브', en: 'IVE', gender: 'female' },
  { ko: '르세라핌', en: 'LE SSERAFIM', gender: 'female' },
  { ko: '베이비몬스터', en: 'BABYMONSTER', gender: 'female' },
  { ko: '있지', en: 'ITZY', gender: 'female' },
  { ko: '엔믹스', en: 'NMIXX', gender: 'female' },
  { ko: '소녀시대', en: "Girls' Generation", gender: 'female', past: true },
  { ko: '원더걸스', en: 'Wonder Girls', gender: 'female', past: true },
  { ko: '2NE1', en: '2NE1', gender: 'female', past: true },
  { ko: 'H.O.T.', en: 'H.O.T.', gender: 'male', past: true },
  { ko: 'god', en: 'g.o.d.', gender: 'male' },
  { ko: '신화', en: 'Shinhwa', gender: 'male', past: true },
  { ko: 'S.E.S.', en: 'S.E.S.', gender: 'female', past: true },
  { ko: '에이핑크', en: 'Apink', gender: 'female' },
  { ko: 'AOA', en: 'AOA', gender: 'female', past: true },
  { ko: '달샤벳', en: 'Dal Shabet', gender: 'female', past: true },
  { ko: '스텔라', en: 'Stellar', gender: 'female', past: true },
  { ko: '포미닛', en: '4Minute', gender: 'female', past: true },
  { ko: '티아라', en: 'T-ara', gender: 'female', past: true },
  { ko: '브라운아이드걸스', en: 'Brown Eyed Girls', gender: 'female', past: true },
  { ko: '헬로비너스', en: 'Hello Venus', gender: 'female', past: true },
  { ko: '동방신기', en: 'TVXQ', gender: 'male' },
  { ko: '2PM', en: '2PM', gender: 'male', past: true },
  { ko: 'SS501', en: 'SS501', gender: 'male', past: true },
  { ko: 'CNBLUE', en: 'CNBLUE', gender: 'male' },
  { ko: 'FTISLAND', en: 'FTISLAND', gender: 'male' },
  { ko: '인피니트', en: 'INFINITE', gender: 'male' },
  { ko: 'BTOB', en: 'BTOB', gender: 'male' },
  { ko: 'B1A4', en: 'B1A4', gender: 'male' },
  { ko: '카라', en: 'KARA', gender: 'female', past: true },
  { ko: '미쓰에이', en: 'miss A', gender: 'female', past: true },
  { ko: '시크릿', en: 'Secret', gender: 'female', past: true },
  { ko: '레인보우', en: 'Rainbow', gender: 'female', past: true },
  { ko: '레드벨벳', en: 'Red Velvet', gender: 'female' },
  { ko: '마마무', en: 'MAMAMOO', gender: 'female' },
  { ko: '아이들', en: 'i-dle', gender: 'female' },
  { ko: 'EXID', en: 'EXID', gender: 'female', past: true },
  { ko: '씨스타', en: 'SISTAR', gender: 'female', past: true },
  { ko: '에프엑스', en: 'f(x)', gender: 'female', past: true },
  { ko: '걸스데이', en: "Girl's Day", gender: 'female', past: true },
  { ko: '애프터스쿨', en: 'After School', gender: 'female', past: true },
  { ko: '나인뮤지스', en: '9MUSES', gender: 'female', past: true },
  { ko: '러블리즈', en: 'Lovelyz', gender: 'female', past: true },
]

const GROUP_BY_KO = new Map(GROUPS.map(group => [group.ko, group]))
const GROUP_ORDER = new Map(GROUPS.map((group, index) => [group.ko, index]))

/** 이전 개인별 현/전 분류 작업의 백업 대상. 새 그룹 단위 분류에서는 더 이상 적용하지 않는다. */
const FORMER_PROFILE_PATCHES = [
  {
    slug: 't.o.p', title: '빅뱅 전 멤버', titleEn: 'Former BIGBANG Member',
    bio: '대한민국 래퍼 겸 배우. 빅뱅의 전 멤버로, 본명은 최승현이며 중저음 랩과 배우 활동으로 유명하다.',
    bioEn: 'South Korean rapper and actor. A former member of BIGBANG, Choi Seung-hyun is known for his deep-toned rap and acting career.',
  },
  {
    slug: 'taeil', title: 'NCT 전 멤버', titleEn: 'Former NCT Member',
    bio: '대한민국 가수. NCT와 NCT 127에서 메인보컬로 활동했던 전 멤버다.',
    bioEn: 'South Korean singer and former main vocalist of NCT and NCT 127.',
  },
  {
    slug: 'mark-lee', title: 'NCT 전 멤버', titleEn: 'Former NCT Member',
    bio: '캐나다 출신 래퍼. NCT·NCT 127·NCT DREAM에서 메인래퍼로 활동했으며 2026년 그룹 활동을 마쳤다.',
    bioEn: 'Canadian rapper who served as a main rapper in NCT, NCT 127, and NCT DREAM before concluding his group activities in 2026.',
  },
  {
    slug: 'winwin', title: 'NCT 전 멤버', titleEn: 'Former NCT Member',
    bio: '중국 출신 가수 겸 배우. NCT·NCT 127·WayV에서 활동했으며 2026년 NCT 활동을 마쳤다.',
    bioEn: 'Chinese singer and actor who performed with NCT, NCT 127, and WayV before concluding his NCT activities in 2026.',
  },
  {
    slug: 'zhang-hao', title: '제로베이스원 전 멤버', titleEn: 'Former ZEROBASEONE Member',
    bio: '중국 푸젠성 출신 가수. 보이즈플래닛 1위로 제로베이스원에 합류해 활동했으며 2026년 그룹 활동을 마쳤다.',
    bioEn: 'Chinese singer from Fujian who joined ZEROBASEONE after placing first on Boys Planet and concluded his group activities in 2026.',
  },
  {
    slug: 'ricky', title: '제로베이스원 전 멤버', titleEn: 'Former ZEROBASEONE Member',
    bio: '중국 상하이 출신 가수. 보이즈플래닛을 통해 제로베이스원으로 데뷔해 활동했으며 2026년 그룹 활동을 마쳤다.',
    bioEn: 'Chinese singer from Shanghai who debuted with ZEROBASEONE through Boys Planet and concluded his group activities in 2026.',
  },
  {
    slug: 'kim-gyu-vin', title: '제로베이스원 전 멤버', titleEn: 'Former ZEROBASEONE Member',
    bio: '대한민국 가수. 제로베이스원 데뷔 멤버로 활동했으며 2026년 그룹 활동을 마쳤다.',
    bioEn: 'South Korean singer who debuted with ZEROBASEONE and concluded his group activities in 2026.',
  },
  {
    slug: 'han-yu-jin', title: '제로베이스원 전 멤버', titleEn: 'Former ZEROBASEONE Member',
    bio: '대한민국 가수. 제로베이스원 데뷔 멤버로 활동했으며 2026년 그룹 활동을 마쳤다.',
    bioEn: 'South Korean singer who debuted with ZEROBASEONE and concluded his group activities in 2026.',
  },
  {
    slug: 'danielle', title: '뉴진스 전 멤버', titleEn: 'Former NewJeans Member',
    bio: '한국·호주 이중국적 가수. 2022년 뉴진스로 데뷔해 활동했으며 2025년 말 그룹 활동을 마쳤다.',
    bioEn: 'Korean-Australian singer who debuted with NewJeans in 2022 and concluded her group activities at the end of 2025.',
  },
  {
    slug: 'jinni', title: '엔믹스 전 멤버', titleEn: 'Former NMIXX Member',
    bio: '대한민국 가수. 엔믹스 데뷔 멤버로 활동하다 2022년 팀을 떠난 뒤 솔로로 활동한다.',
    bioEn: 'South Korean singer who debuted with NMIXX, left the group in 2022, and continued as a solo artist.',
  },
] as const

/** 프로필 title만으로 복원할 수 없거나 복수 유닛에 속한 멤버십. */
const EXTRA_MEMBERSHIPS: { slug: string; group: string }[] = [
  { slug: 'kim-namjoon', group: '방탄소년단' },
  { slug: 't.o.p', group: '빅뱅' },
  { slug: 'taeil', group: 'NCT 127' },
  { slug: 'mark-lee', group: 'NCT 127' },
  { slug: 'winwin', group: 'NCT 127' },
  { slug: 'heeseung', group: '엔하이픈' },
  { slug: 'mark-lee', group: 'NCT 드림' },
  { slug: 'haechan', group: 'NCT 127' },
  { slug: 'zhang-hao', group: '제로베이스원' },
  { slug: 'ricky', group: '제로베이스원' },
  { slug: 'kim-gyu-vin', group: '제로베이스원' },
  { slug: 'han-yu-jin', group: '제로베이스원' },
  { slug: 'danielle', group: '뉴진스' },
  { slug: 'jinni', group: '엔믹스' },
  ...JSON.parse(readFileSync(path.join(SCRIPT_DIR, 'data', 'legacy-idol-wave1.json'), 'utf8'))
    .flatMap((person: { slug: string; groups: string[] }) => person.groups.map(group => ({ slug: person.slug, group }))),
  ...JSON.parse(readFileSync(path.join(SCRIPT_DIR, 'data', 'legacy-idol-wave2.json'), 'utf8'))
    .flatMap((person: { slug: string; groups: string[] }) => person.groups.map(group => ({ slug: person.slug, group }))),
  ...JSON.parse(readFileSync(path.join(SCRIPT_DIR, 'data', 'legacy-idol-wave3.json'), 'utf8'))
    .flatMap((person: { slug: string; groups: string[] }) => person.groups.map(group => ({ slug: person.slug, group }))),
]

const CATEGORIES: Record<CategoryKey, {
  folder: string
  tagSlug: string
  tagName: string
  tagNameEn: string
  title: string
  titleEn: string
  logline: string
  loglineEn: string
  color: string
  gender: Gender
  past: boolean
}> = {
  'current-male': {
    folder: 'IDOL-MALE', tagSlug: 'idol-group-current-male',
    tagName: '현직 K-pop 보이그룹', tagNameEn: 'Active K-pop Boy Groups',
    title: '현직 보이그룹', titleEn: 'Active Boy Groups',
    logline: '최근에도 앨범과 공식 공연으로 활동을 이어가는 남성 아이돌 그룹들',
    loglineEn: 'Boy groups that continue releasing music and performing in recent years',
    color: '#2563EB', gender: 'male', past: false,
  },
  'former-male': {
    folder: 'IDOL-MALE-FORMER', tagSlug: 'idol-group-former-male',
    tagName: '과거 K-pop 보이그룹', tagNameEn: 'Past K-pop Boy Groups',
    title: '과거 보이그룹', titleEn: 'Past Boy Groups',
    logline: '한 시대를 무대에 새겼지만 최근 팀 활동이 멈춘 남성 아이돌 그룹들',
    loglineEn: 'Boy groups that shaped an era but have been quiet as teams in recent years',
    color: '#64748B', gender: 'male', past: true,
  },
  'current-female': {
    folder: 'IDOL-FEMALE', tagSlug: 'idol-group-current-female',
    tagName: '현직 K-pop 걸그룹', tagNameEn: 'Active K-pop Girl Groups',
    title: '현직 걸그룹', titleEn: 'Active Girl Groups',
    logline: '최근에도 앨범과 공식 공연으로 활동을 이어가는 여성 아이돌 그룹들',
    loglineEn: 'Girl groups that continue releasing music and performing in recent years',
    color: '#EC4899', gender: 'female', past: false,
  },
  'former-female': {
    folder: 'IDOL-FEMALE-FORMER', tagSlug: 'idol-group-former-female',
    tagName: '과거 K-pop 걸그룹', tagNameEn: 'Past K-pop Girl Groups',
    title: '과거 걸그룹', titleEn: 'Past Girl Groups',
    logline: '한 시대를 무대에 새겼지만 최근 팀 활동이 멈춘 여성 아이돌 그룹들',
    loglineEn: 'Girl groups that shaped an era but have been quiet as teams in recent years',
    color: '#A855F7', gender: 'female', past: true,
  },
}

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]
const PALETTE = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#059669', '#0891B2', '#4F46E5']

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수가 없습니다.`)
  return value
}

function categoryOf(group: GroupDef): CategoryKey {
  return `${group.past ? 'former' : 'current'}-${group.gender}` as CategoryKey
}

function asPosix(value: string): string {
  return value.replace(/\\/g, '/')
}

function findPersonImage(folder: string, group: string, nickname: string, slug: string): string | undefined {
  const episodeDir = path.join(FACTIONS_DIR, folder)
  const groupFolder = group === '방탄소년단' ? 'BTS' : group
  const groupDir = path.join(episodeDir, groupFolder)
  if (!existsSync(groupDir)) return undefined
  const wanted = new Set([nickname.toLocaleLowerCase('ko-KR'), slug.toLowerCase()])
  if (group === '방탄소년단' && slug === 'kim-namjoon') wanted.add('rm')
  const file = readdirSync(groupDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .find(name => wanted.has(path.parse(name).name.toLocaleLowerCase('ko-KR')))
  return file ? asPosix(path.join(groupFolder, file)) : undefined
}

function findClusterImage(folder: string, group: string): string | undefined {
  const episodeDir = path.join(FACTIONS_DIR, folder)
  const candidates = group === '베이비몬스터'
    ? [path.join(group, '베이비몬스터.webp'), path.join(group, 'group.png')]
    : group === '보이넥스트도어'
      ? ['보이넥스트도어.jpg']
      : [path.join(group, 'group.png'), path.join(group, 'group.webp'), path.join(group, 'group.jpg')]
  return candidates.find(candidate => existsSync(path.join(episodeDir, candidate)))?.replace(/\\/g, '/')
}

async function loadProfiles(db: SupabaseClient): Promise<ProfileRow[]> {
  const columns = 'id,nickname,nickname_en,slug,gender,status,title,created_at'
  const map = new Map<string, ProfileRow>()
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db.from('profiles').select(columns)
      .eq('profile_type', 'CELEB').eq('profession', 'musician')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`음악가 프로필 전수 조회 실패: ${error.message}`)
    for (const row of (data ?? []) as ProfileRow[]) {
      if (row.slug) map.set(row.slug, row)
    }
    if ((data ?? []).length < pageSize) break
  }
  return [...map.values()]
}

function buildRoster(profiles: ProfileRow[]) {
  const profileBySlug = new Map(profiles.map(profile => [profile.slug, profile]))
  const memberships = new Map<string, Map<string, ProfileRow>>()
  const add = (group: string, profile: ProfileRow) => {
    const rows = memberships.get(group) ?? new Map<string, ProfileRow>()
    rows.set(profile.slug, profile)
    memberships.set(group, rows)
  }

  for (const profile of profiles) {
    const group = profile.title?.trim() ?? ''
    if (GROUP_BY_KO.has(group)) add(group, profile)
  }
  for (const item of EXTRA_MEMBERSHIPS) {
    const profile = profileBySlug.get(item.slug)
    if (!profile) throw new Error(`필수 보강 프로필이 없습니다: ${item.slug}`)
    add(item.group, profile)
  }

  const roster = new Map<CategoryKey, Map<string, ProfileRow[]>>(CATEGORY_KEYS.map(key => [key, new Map()]))
  for (const [groupName, memberMap] of memberships) {
    const group = GROUP_BY_KO.get(groupName)
    if (!group) continue
    for (const profile of memberMap.values()) {
      const actualGender: Gender | null = profile.gender === true ? 'male' : profile.gender === false ? 'female' : null
      if (actualGender !== group.gender) {
        throw new Error(`성별 불일치: ${groupName} / ${profile.nickname}(${profile.slug})`)
      }
      if (!profile.nickname_en) throw new Error(`영문 닉네임 누락: ${profile.nickname}(${profile.slug})`)
      const category = categoryOf(group)
      const bucket = roster.get(category)!
      const rows = bucket.get(groupName) ?? []
      rows.push(profile)
      bucket.set(groupName, rows)
    }
  }

  for (const bucket of roster.values()) {
    for (const rows of bucket.values()) rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.slug.localeCompare(b.slug))
  }
  return roster
}

function buildEpisodeScript(key: CategoryKey, groups: Map<string, ProfileRow[]>): Record<string, unknown> {
  const category = CATEGORIES[key]
  const orderedGroups = [...groups.entries()].sort((a, b) =>
    (GROUP_ORDER.get(a[0]) ?? 999) - (GROUP_ORDER.get(b[0]) ?? 999),
  )
  return {
    title: category.title,
    titleEn: category.titleEn,
    logline: category.logline,
    loglineEn: category.loglineEn,
    outroTitle: category.tagName,
    outroTitleEn: category.tagNameEn,
    groups: orderedGroups.map(([groupName, members], groupIndex) => {
      const group = GROUP_BY_KO.get(groupName)!
      const clusterImage = findClusterImage(category.folder, groupName)
      return {
        name: groupName,
        nameEn: group.en,
        color: PALETTE[groupIndex % PALETTE.length],
        tagSlug: category.tagSlug,
        clusters: [{
          label: `${groupName} 그룹 인물`,
          labelEn: `${group.en} group members`,
          ...(clusterImage ? { image: clusterImage } : {}),
          people: members.map(profile => {
            const image = findPersonImage(category.folder, groupName, profile.nickname, profile.slug)
            const memberLabel = `${groupName} 멤버`
            const memberLabelEn = `${group.en} member`
            return {
              name: profile.nickname,
              nameEn: profile.nickname_en,
              slug: profile.slug,
              lines: [memberLabel],
              linesEn: [memberLabelEn],
              epithet: `${groupName}의 멤버로 활동했다.`,
              epithetEn: `Performed as a member of ${group.en}.`,
              ...(image ? { image } : {}),
            }
          }),
        }],
      }
    }),
  }
}

function printPlan(roster: Map<CategoryKey, Map<string, ProfileRow[]>>) {
  console.log(`\n[${APPLY ? 'APPLY' : 'DRY-RUN'}] 한국 아이돌 팩션 4편`)
  for (const key of CATEGORY_KEYS) {
    const category = CATEGORIES[key]
    const groups = roster.get(key)!
    const people = [...groups.values()].reduce((sum, rows) => sum + rows.length, 0)
    const unique = new Set([...groups.values()].flat().map(profile => profile.slug)).size
    const active = new Set([...groups.values()].flat()
      .filter(profile => profile.status === 'active').map(profile => profile.slug)).size
    console.log(`\n${category.folder} / ${category.tagName}: ${groups.size}그룹, ${people}배치, ${unique}명 (서비스 활성 ${active}명)`)
    for (const [group, rows] of [...groups.entries()].sort((a, b) =>
      (GROUP_ORDER.get(a[0]) ?? 999) - (GROUP_ORDER.get(b[0]) ?? 999),
    )) {
      console.log(`  - ${group} ${rows.length}명: ${rows.map(row => row.nickname).join(', ')}`)
    }
  }
  console.log('\n그룹 활동성 기준: 개인별 현/전 멤버 분리 없이 그룹 전체를 한 분류에 배치')
}

async function countReferences(db: SupabaseClient, tagId: string): Promise<number> {
  const [groups, assignments] = await Promise.all([
    db.from('faction_groups').select('id', { count: 'exact', head: true }).eq('tag_id', tagId),
    db.from('celeb_tag_assignments').select('id', { count: 'exact', head: true }).eq('tag_id', tagId),
  ])
  if (groups.error) throw new Error(`태그 세력 참조 조회 실패: ${groups.error.message}`)
  if (assignments.error) throw new Error(`태그 직접 배치 조회 실패: ${assignments.error.message}`)
  return (groups.count ?? 0) + (assignments.count ?? 0)
}

async function ensureTag(
  db: SupabaseClient,
  input: {
    forcedId?: string
    slug: string
    name: string
    nameEn: string
    description: string
    descriptionEn: string
    color: string
    parentId: string | null
    sortOrder: number
    isFeatured?: boolean
    clearTeamImagesOnRepurpose?: boolean
  },
): Promise<string> {
  const fields = {
    name: input.name,
    name_en: input.nameEn,
    slug: input.slug,
    description: input.description,
    description_en: input.descriptionEn,
    color: input.color,
    parent_id: input.parentId,
    sort_order: input.sortOrder,
    is_featured: input.isFeatured ?? false,
  }
  if (input.forcedId) {
    const { data: forcedTag, error: forcedTagError } = await db
      .from('celeb_tags').select('id,slug').eq('id', input.forcedId).maybeSingle()
    if (forcedTagError) throw new Error(`기존 태그 조회 실패(${input.forcedId}): ${forcedTagError.message}`)
    if (!forcedTag) throw new Error(`재사용할 태그가 없습니다: ${input.forcedId}`)
    const { data: occupied, error: occupiedError } = await db
      .from('celeb_tags').select('id').eq('slug', input.slug).neq('id', input.forcedId).maybeSingle()
    if (occupiedError) throw new Error(`태그 slug 점검 실패: ${occupiedError.message}`)
    if (occupied) throw new Error(`태그 slug가 다른 행에 이미 사용 중입니다: ${input.slug}`)
    const repurposing = forcedTag.slug !== input.slug
    const nextFields = input.clearTeamImagesOnRepurpose && repurposing
      ? { ...fields, team_images: [] }
      : fields
    const { data, error } = await db.from('celeb_tags').update(nextFields).eq('id', input.forcedId).select('id').single()
    if (error) throw new Error(`기존 태그 갱신 실패(${input.forcedId}): ${error.message}`)
    return data.id as string
  }
  const { data: existing, error: lookupError } = await db.from('celeb_tags').select('id').eq('slug', input.slug).maybeSingle()
  if (lookupError) throw new Error(`태그 조회 실패(${input.slug}): ${lookupError.message}`)
  if (existing) {
    const { error } = await db.from('celeb_tags').update(fields).eq('id', existing.id)
    if (error) throw new Error(`태그 갱신 실패(${input.slug}): ${error.message}`)
    return existing.id as string
  }
  const { data, error } = await db.from('celeb_tags').insert({ id: randomUUID(), ...fields }).select('id').single()
  if (error) throw new Error(`태그 생성 실패(${input.slug}): ${error.message}`)
  return data.id as string
}

async function snapshotBeforeApply(db: SupabaseClient): Promise<string> {
  const folders = CATEGORY_KEYS.map(key => CATEGORIES[key].folder)
  const { data: episodes, error: episodeError } = await db.from('faction_episodes').select('*').in('folder', folders)
  if (episodeError) throw new Error(`백업 에피소드 조회 실패: ${episodeError.message}`)
  const episodeIds = (episodes ?? []).map(row => row.id as string)
  const groups = episodeIds.length
    ? await db.from('faction_groups').select('*').in('episode_id', episodeIds)
    : { data: [], error: null }
  if (groups.error) throw new Error(`백업 세력 조회 실패: ${groups.error.message}`)
  const groupIds = (groups.data ?? []).map(row => row.id as string)
  const clusters = groupIds.length
    ? await db.from('faction_clusters').select('*').in('group_id', groupIds)
    : { data: [], error: null }
  if (clusters.error) throw new Error(`백업 클러스터 조회 실패: ${clusters.error.message}`)
  const clusterIds = (clusters.data ?? []).map(row => row.id as string)
  const people = clusterIds.length
    ? await db.from('faction_people').select('*').in('cluster_id', clusterIds)
    : { data: [], error: null }
  if (people.error) throw new Error(`백업 인물 조회 실패: ${people.error.message}`)
  const { data: tags, error: tagError } = await db.from('celeb_tags').select('*')
    .or(`id.eq.${CURRENT_FEMALE_TAG_ID},id.eq.${UNUSED_CURRENT_TAG_ID},slug.eq.music,slug.eq.korean-idol-groups,slug.like.idol-group-%`)
  if (tagError) throw new Error(`백업 태그 조회 실패: ${tagError.message}`)
  const { data: profiles, error: profileError } = await db.from('profiles').select('*')
    .in('slug', FORMER_PROFILE_PATCHES.map(patch => patch.slug))
  if (profileError) throw new Error(`백업 프로필 조회 실패: ${profileError.message}`)

  const backupDir = path.join(PROJECT_ROOT, '_backup')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `idol-factions-before-${stamp}.json`)
  writeFileSync(backupPath, `${JSON.stringify({ tags, profiles, episodes, groups: groups.data, clusters: clusters.data, people: people.data }, null, 2)}\n`, 'utf8')
  return backupPath
}

async function applyFormerProfilePatches(db: SupabaseClient): Promise<void> {
  for (const patch of FORMER_PROFILE_PATCHES) {
    const { data, error } = await db.from('profiles').update({
      title: patch.title,
      title_en: patch.titleEn,
      bio: patch.bio,
      bio_en: patch.bioEn,
    }).eq('slug', patch.slug).select('slug').single()
    if (error) throw new Error(`전 멤버 프로필 교정 실패(${patch.slug}): ${error.message}`)
    if (data.slug !== patch.slug) throw new Error(`전 멤버 프로필 교정 대상 불일치: ${patch.slug}`)
  }
  console.log(`프로필 교정 ${FORMER_PROFILE_PATCHES.length}명: 현역 시제 제거`)
}

async function verifyFormerProfilePatches(db: SupabaseClient): Promise<void> {
  const { data, error } = await db.from('profiles')
    .select('slug,title,title_en,bio,bio_en')
    .in('slug', FORMER_PROFILE_PATCHES.map(patch => patch.slug))
  if (error) throw new Error(`전 멤버 프로필 검증 실패: ${error.message}`)
  if ((data ?? []).length !== FORMER_PROFILE_PATCHES.length) {
    throw new Error(`전 멤버 프로필 검증 실패: ${(data ?? []).length}/${FORMER_PROFILE_PATCHES.length}명`)
  }
  const bySlug = new Map((data ?? []).map(row => [row.slug, row]))
  for (const patch of FORMER_PROFILE_PATCHES) {
    const row = bySlug.get(patch.slug)
    if (!row || row.title !== patch.title || row.title_en !== patch.titleEn || row.bio !== patch.bio || row.bio_en !== patch.bioEn) {
      throw new Error(`전 멤버 프로필 검증 불일치: ${patch.slug}`)
    }
  }
  console.log(`검증 프로필: 전 멤버 ${FORMER_PROFILE_PATCHES.length}명 현/전 시제 일치`)
}

async function applyTags(db: SupabaseClient): Promise<Map<CategoryKey, string>> {
  const { data: currentFemale } = await db.from('celeb_tags').select('id').eq('id', CURRENT_FEMALE_TAG_ID).maybeSingle()
  if (!currentFemale) throw new Error(`기존 IDOL-FEMALE 태그를 찾지 못했습니다: ${CURRENT_FEMALE_TAG_ID}`)
  const { data: unusedCurrent } = await db.from('celeb_tags').select('id,slug').eq('id', UNUSED_CURRENT_TAG_ID).maybeSingle()
  if (!unusedCurrent) throw new Error(`재사용할 미연결 태그를 찾지 못했습니다: ${UNUSED_CURRENT_TAG_ID}`)
  const unusedRefs = await countReferences(db, UNUSED_CURRENT_TAG_ID)
  if (unusedCurrent.slug !== CATEGORIES['current-male'].tagSlug && unusedRefs !== 0) {
    throw new Error(`재사용 예정 태그에 ${unusedRefs}개 참조가 생겨 중단합니다.`)
  }

  const parentId = await ensureTag(db, {
    slug: 'music', name: '음악', nameEn: 'Music',
    description: '소리와 리듬으로 한 세대의 심장을 움직인 사람들.',
    descriptionEn: 'People who moved generations through sound and rhythm.',
    color: '#DB2777', parentId: null, sortOrder: 76, isFeatured: true,
  })

  const ids = new Map<CategoryKey, string>()
  for (const [index, key] of CATEGORY_KEYS.entries()) {
    const category = CATEGORIES[key]
    const forcedId = key === 'current-female'
      ? CURRENT_FEMALE_TAG_ID
      : key === 'current-male' ? UNUSED_CURRENT_TAG_ID : undefined
    const id = await ensureTag(db, {
      forcedId,
      slug: category.tagSlug,
      name: category.tagName,
      nameEn: category.tagNameEn,
      description: category.logline,
      descriptionEn: category.loglineEn,
      color: category.color,
      parentId,
      sortOrder: 765 + index,
      clearTeamImagesOnRepurpose: key === 'current-male',
    })
    ids.set(key, id)
  }
  return ids
}

async function ensureEpisodeExists(db: SupabaseClient, folder: string): Promise<void> {
  const { data: existing, error: lookupError } = await db.from('faction_episodes').select('id').eq('folder', folder).maybeSingle()
  if (lookupError) throw new Error(`에피소드 조회 실패(${folder}): ${lookupError.message}`)
  if (existing) return
  const { error } = await db.rpc('faction_replace_episode', {
    p_folder: folder,
    p_episode: { title: folder, status: 'blocked', registered: false, sort_order: 0, longform_layout: null, data: {} },
    p_groups: [], p_clusters: [], p_people: [], p_parts: [], p_expected_updated_at: null,
  })
  if (error) throw new Error(`에피소드 생성 실패(${folder}): ${error.message}`)
}

async function applyEpisodes(
  db: SupabaseClient,
  roster: Map<CategoryKey, Map<string, ProfileRow[]>>,
): Promise<void> {
  for (const key of CATEGORY_KEYS) {
    const category = CATEGORIES[key]
    await ensureEpisodeExists(db, category.folder)
    const { data: episode, error: episodeError } = await db.from('faction_episodes')
      .select('updated_at').eq('folder', category.folder).single()
    if (episodeError) throw new Error(`에피소드 잠금값 조회 실패(${category.folder}): ${episodeError.message}`)
    const script = buildEpisodeScript(key, roster.get(key)!)
    const result = await replaceFactionEpisode(db, category.folder, script, episode.updated_at as string)
    const { error: noteError } = await db.from('faction_episodes').update({
      status: 'blocked',
      registered: false,
      block_note: '인물 배치 완료. 미확보 개인샷·대사·음성 보강 후 출간 가능.',
    }).eq('id', result.episodeId)
    if (noteError) throw new Error(`에피소드 상태 기록 실패(${category.folder}): ${noteError.message}`)
    mkdirSync(path.join(FACTIONS_DIR, category.folder), { recursive: true })
    console.log(`저장 ${category.folder}: ${result.counts.groups}그룹 / ${result.counts.people}배치`)
  }
}

async function verifyDatabase(
  db: SupabaseClient,
  roster: Map<CategoryKey, Map<string, ProfileRow[]>>,
  expectedTagIds?: Map<CategoryKey, string>,
): Promise<void> {
  const tagSlugs = ['music', ...CATEGORY_KEYS.map(key => CATEGORIES[key].tagSlug)]
  const { data: tags, error: tagError } = await db.from('celeb_tags')
    .select('id,slug,name,name_en,parent_id,team_images').in('slug', tagSlugs)
  if (tagError) throw new Error(`검증 태그 조회 실패: ${tagError.message}`)
  if ((tags ?? []).length !== 5) throw new Error(`검증 실패: 아이돌 태그 ${(tags ?? []).length}/5개`)
  const parent = (tags ?? []).find(tag => tag.slug === 'music')
  if (!parent) throw new Error('검증 실패: 음악 상위 태그 없음')
  const resolvedTagIds = new Map<CategoryKey, string>()
  for (const key of CATEGORY_KEYS) {
    const tag = (tags ?? []).find(row => row.slug === CATEGORIES[key].tagSlug)
    if (!tag || tag.parent_id !== parent.id) throw new Error(`검증 실패: ${CATEGORIES[key].tagSlug} 상위 태그 불일치`)
    if (tag.name !== CATEGORIES[key].tagName || tag.name_en !== CATEGORIES[key].tagNameEn) {
      throw new Error(`검증 실패: ${CATEGORIES[key].tagSlug} 태그 이름 불일치`)
    }
    if (expectedTagIds?.get(key) && expectedTagIds.get(key) !== tag.id) {
      throw new Error(`검증 실패: ${CATEGORIES[key].tagSlug} 태그 ID 불일치`)
    }
    resolvedTagIds.set(key, tag.id as string)
  }
  const femaleTag = (tags ?? []).find(tag => tag.slug === CATEGORIES['current-female'].tagSlug)
  console.log(`검증 태그: 음악 상위 테마 / 아이돌 하위 4개 / 기존 여성 팀 이미지 ${femaleTag?.team_images ? '보존' : '없음'}`)

  const folders = CATEGORY_KEYS.map(key => CATEGORIES[key].folder)
  const { data: episodes, error: episodeError } = await db.from('faction_episodes')
    .select('id,folder,status,registered').in('folder', folders)
  if (episodeError) throw new Error(`검증 에피소드 조회 실패: ${episodeError.message}`)
  if ((episodes ?? []).length !== 4) throw new Error(`검증 실패: 에피소드 ${(episodes ?? []).length}/4편`)

  for (const key of CATEGORY_KEYS) {
    const category = CATEGORIES[key]
    const episode = (episodes ?? []).find(row => row.folder === category.folder)
    if (!episode) throw new Error(`검증 실패: ${category.folder} 없음`)
    if (episode.status !== 'blocked' || episode.registered !== false) {
      throw new Error(`검증 실패: ${category.folder}는 blocked/unregistered여야 합니다.`)
    }
    const { data: groups, error: groupError } = await db.from('faction_groups')
      .select('id,name,tag_id').eq('episode_id', episode.id)
    if (groupError) throw new Error(`검증 세력 조회 실패(${category.folder}): ${groupError.message}`)
    const expectedGroups = roster.get(key)!.size
    if ((groups ?? []).length !== expectedGroups) {
      throw new Error(`검증 실패: ${category.folder} 그룹 ${(groups ?? []).length}/${expectedGroups}`)
    }
    const tagId = resolvedTagIds.get(key)!
    if ((groups ?? []).some(group => group.tag_id !== tagId)) {
      throw new Error(`검증 실패: ${category.folder} 태그 연결 불일치`)
    }
    const groupIds = (groups ?? []).map(group => group.id as string)
    const { data: clusters, error: clusterError } = await db.from('faction_clusters').select('id').in('group_id', groupIds)
    if (clusterError) throw new Error(`검증 클러스터 조회 실패(${category.folder}): ${clusterError.message}`)
    const clusterIds = (clusters ?? []).map(cluster => cluster.id as string)
    const { data: people, error: peopleError } = await db.from('faction_people')
      .select('slug,celeb_id,web_hidden').in('cluster_id', clusterIds)
    if (peopleError) throw new Error(`검증 인물 조회 실패(${category.folder}): ${peopleError.message}`)
    const expectedPeople = [...roster.get(key)!.values()].reduce((sum, rows) => sum + rows.length, 0)
    if ((people ?? []).length !== expectedPeople) {
      throw new Error(`검증 실패: ${category.folder} 인물 ${(people ?? []).length}/${expectedPeople}`)
    }
    if ((people ?? []).some(person => !person.celeb_id)) throw new Error(`검증 실패: ${category.folder} 미연결 인물 존재`)
    const unique = new Set((people ?? []).map(person => person.slug)).size
    const hidden = (people ?? []).filter(person => person.web_hidden).length
    const { data: atlasRows, error: atlasError } = await db.from('faction_atlas_members')
      .select('celeb_id,source,hidden').eq('tag_id', tagId)
    if (atlasError) throw new Error(`세력도감 뷰 조회 실패(${category.folder}): ${atlasError.message}`)
    if ((atlasRows ?? []).length !== unique) {
      throw new Error(`검증 실패: ${category.folder} 세력도감 뷰 ${(atlasRows ?? []).length}/${unique}명`)
    }
    if ((atlasRows ?? []).some(row => row.source !== 'production')) {
      throw new Error(`검증 실패: ${category.folder}에 직접 태그 배치가 섞였습니다.`)
    }
    const atlasHidden = (atlasRows ?? []).filter(row => row.hidden).length
    console.log(`검증 ${category.folder}: ${groups!.length}그룹 / ${people!.length}배치 / 세력도감 ${unique}명 / DB숨김 ${hidden} / 뷰숨김 ${atlasHidden}`)
  }
}

async function exportFiles(db: SupabaseClient): Promise<void> {
  const source: FactionRowSource = async (table, column, values) => {
    const { data, error } = await db.from(table).select('*').in(column, values)
    if (error) throw new Error(`${table} 조회 실패(${column}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
  for (const key of CATEGORY_KEYS) {
    const folder = CATEGORIES[key].folder
    const episodeDir = path.join(FACTIONS_DIR, folder)
    const dataPath = path.join(episodeDir, 'faction-data.json')
    const result = await exportFactionEpisodeToFile({
      folder,
      episodeDir,
      dataPath,
      assemble: async original => {
        const { script, row } = await assembleFactionEpisode(source, folder, original)
        return { script, episodeId: row.id as string }
      },
    })
    if (!result.written) {
      throw new Error(`${folder} export 중단: ${result.reason}\n${(result.diffs ?? []).join('\n')}`)
    }
    console.log(`export ${folder}: ${result.reason}`)
  }
}

async function main() {
  const db = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
  const profiles = await loadProfiles(db)
  const roster = buildRoster(profiles)
  for (const key of CATEGORY_KEYS) {
    if (roster.get(key)!.size === 0) throw new Error(`빈 분류는 저장하지 않습니다: ${key}`)
  }
  printPlan(roster)
  if (EXPORT_ONLY) {
    await verifyDatabase(db, roster)
    await exportFiles(db)
    console.log('\n렌더 데이터 export 완료.')
    return
  }
  if (!APPLY) {
    console.log('\n쓰기 없음. 적용하려면 --apply를 붙이세요.')
    return
  }

  const backupPath = await snapshotBeforeApply(db)
  console.log(`\n사전 백업: ${backupPath}`)
  const tagIds = await applyTags(db)
  await applyEpisodes(db, roster)
  await verifyDatabase(db, roster, tagIds)
  await exportFiles(db)
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  console.log('\nDB 적용·export·검증 완료. faction:verify를 이어서 실행하세요.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
