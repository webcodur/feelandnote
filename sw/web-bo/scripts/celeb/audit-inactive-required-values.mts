/**
 * 현행 active 요건의 DB 필수값이 채워진 inactive 인물을 찾는다. 읽기 전용.
 * 조사 여부·신원·본문 품질·한마디의 진위는 값의 존재로 확정하지 않는다.
 * 규격: docs/project/celeb/celeb-00-02-active-requirements.md
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createClient } from '@feelandnote/db'
import { isCelebReality } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_CONTENT_COUNT, resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'

const PAGE = 100
const CHUNK = 100
const PROFILE_TEXT_FIELDS = [
  'nickname', 'nickname_en', 'slug', 'profession', 'nationality', 'birth_date',
  'title', 'title_en', 'bio', 'bio_en', 'headline', 'headline_en',
  'avatar_url', 'virtual_monologue', 'virtual_monologue_en',
] as const
const PROFILE_SELECT = ['id', ...PROFILE_TEXT_FIELDS, 'gender', 'celeb_tier',
  'celeb_reality', 'publication_status', 'content_research_confirmed_empty_at'].join(',')

export const MANUAL_CHECKS = [
  '기본 사실·아바타 신원·본문 품질·한마디의 진위',
  '관계망 조사', '등장 도서 조사', '집필 도서 조사', '소속 세력 조사',
] as const

type Row = Record<string, unknown>
export type Profile = Row & {
  id: string
  slug: string
  nickname: string
  publication_status: string
  celeb_tier: string
  celeb_reality: string
  content_research_confirmed_empty_at: string | null
}
type Explanation = Row & { profile_id: string }
type Quote = Row & { celeb_id: string }
type Client = ReturnType<typeof createClient>

function missingText(value: unknown, rejectPlaceholder = false) {
  if (typeof value !== 'string' || !value.trim()) return true
  // '미상' 등의 단독 자리 표시만 거른다. 본문 안의 같은 단어는 정상 문장일 수 있다.
  return rejectPlaceholder && /^(미상|불명|미확인|알수없음|해당없음|unknown|n\/a|none|null|tbd|-)$/i
    .test(value.replace(/\s+/g, ''))
}

export function requiredValueGaps(profile: Profile, explanation: Explanation | undefined,
  quote: Quote | undefined, actualContentCount: number): string[] {
  const gaps = PROFILE_TEXT_FIELDS.filter(field => missingText(profile[field], true)).map(field => field as string)
  if (typeof profile.gender !== 'boolean') gaps.push('gender')
  if (!isCelebReality(profile.celeb_reality)) gaps.push('celeb_reality')
  if (missingText(explanation?.plain_text, true)) gaps.push('plain_text')
  if (missingText(explanation?.plain_text_en, true)) gaps.push('plain_text_en')
  // 검증된 말이 없는 인물의 표준 '없음' 값도 유효하므로 한마디에는 자리 표시 필터를 쓰지 않는다.
  if (missingText(quote?.quote)) gaps.push('quote')
  if (missingText(quote?.quote_en)) gaps.push('quote_en')
  if (profile.celeb_reality !== 'FICTION'
    && resolveCelebContentCount(actualContentCount, profile.content_research_confirmed_empty_at) === CELEB_CONTENT_COUNT.UNRESEARCHED) {
    gaps.push('content_research')
  }
  return gaps
}

async function childRows<T>(db: Client, table: string, select: string, ids: string[],
  idColumn: string, orderColumn: string): Promise<T[]> {
  const result: T[] = []
  for (let index = 0; index < ids.length; index += CHUNK) {
    const chunk = ids.slice(index, index + CHUNK)
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from(table).select(select).in(idColumn, chunk)
        .order(orderColumn).range(from, from + PAGE - 1)
      if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
      const rows = (data ?? []) as T[]
      result.push(...rows)
      if (rows.length < PAGE) break
    }
  }
  return result
}

export async function auditInactiveRequiredValues(db: Client, slugs: string[] = []) {
  const profiles: Profile[] = []
  for (let from = 0; ; from += PAGE) {
    let query = db.from('celebs').select(PROFILE_SELECT).eq('publication_status', 'inactive').order('id')
    if (slugs.length) query = query.in('slug', slugs)
    const { data, error } = await query.range(from, from + PAGE - 1)
    if (error) throw new Error(`celebs 조회 실패: ${error.message}`)
    const rows = (data ?? []) as Profile[]
    profiles.push(...rows)
    if (rows.length < PAGE) break
  }
  const missingSlugs = slugs.filter(slug => !profiles.some(profile => profile.slug === slug))
  if (missingSlugs.length) throw new Error(`inactive 대상에서 찾을 수 없는 slug: ${missingSlugs.join(', ')}`)

  const ids = profiles.map(profile => profile.id)
  const [explanations, quotes, contents] = await Promise.all([
    childRows<Explanation>(db, 'celeb_explanations', 'profile_id,plain_text,plain_text_en', ids, 'profile_id', 'profile_id'),
    childRows<Quote>(db, 'celeb_dialogues', 'celeb_id,quote:lines->>quote,quote_en:lines_en->>quote', ids, 'celeb_id', 'celeb_id'),
    childRows<{ celeb_id: string }>(db, 'celeb_contents', 'celeb_id', ids, 'celeb_id', 'id'),
  ])
  const guidesById = new Map(explanations.map(row => [row.profile_id, row]))
  const quotesById = new Map(quotes.map(row => [row.celeb_id, row]))
  const counts = new Map<string, number>()
  for (const row of contents) counts.set(row.celeb_id, (counts.get(row.celeb_id) ?? 0) + 1)

  const rows = profiles.map(profile => {
    const guide = guidesById.get(profile.id)
    const count = counts.get(profile.id) ?? 0
    return {
      id: profile.id, slug: profile.slug, nickname: profile.nickname,
      reality: profile.celeb_reality, tier: profile.celeb_tier,
      contentCount: profile.celeb_reality === 'FICTION' ? null
        : resolveCelebContentCount(count, profile.content_research_confirmed_empty_at),
      gaps: requiredValueGaps(profile, guide, quotesById.get(profile.id), count),
    }
  }).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko') || a.id.localeCompare(b.id))
  return {
    scannedInactive: profiles.length,
    valuesCompleteCount: rows.filter(row => !row.gaps.length).length,
    incompleteCount: rows.filter(row => row.gaps.length).length,
    manualChecks: MANUAL_CHECKS,
    candidates: rows.filter(row => !row.gaps.length),
    incomplete: rows.filter(row => row.gaps.length),
  }
}

export function parseOptions(args: string[]) {
  const options = { json: false, showGaps: false, help: false, slugs: [] as string[] }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--') continue
    if (arg === '--json') options.json = true
    else if (arg === '--show-gaps') options.showGaps = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--slugs' || arg.startsWith('--slugs=')) {
      const value = arg === '--slugs' ? args[++index] : arg.slice('--slugs='.length)
      if (!value || value.startsWith('--')) throw new Error('--slugs에 쉼표로 구분한 slug를 지정해 주세요.')
      options.slugs = [...new Set(value.split(',').map(slug => slug.trim()).filter(Boolean))]
      if (!options.slugs.length) throw new Error('--slugs 값이 비었습니다.')
    } else throw new Error(`지원하지 않는 인자: ${arg}. --help를 확인해 주세요.`)
  }
  return options
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  if (options.help) {
    console.log('pnpm --dir sw/web-bo celeb:audit:inactive-required [--json] [--show-gaps] [--slugs="a,b"]')
    console.log('inactive 인물의 한영 필수값과 감상 콘텐츠 조사 표시를 확인합니다. DB를 수정하지 않습니다.')
    console.log('관계·도서·세력 조사 완료와 문구의 진위·품질은 사람이 확인해야 합니다.')
    return
  }
  config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')
  const result = await auditInactiveRequiredValues(createClient(url, key), options.slugs)
  if (options.json) {
    const { incomplete, ...summary } = result
    console.log(JSON.stringify({ ...summary, ...(options.showGaps ? { incomplete } : {}) }, null, 2))
    return
  }
  console.log(`inactive ${result.scannedInactive}명 · DB 필수값 완비 ${result.valuesCompleteCount}명 · 미비 ${result.incompleteCount}명`)
  console.table(result.candidates.map(({ nickname, slug, reality, contentCount }) => ({
    이름: nickname, slug, 실존축: reality, 감상콘텐츠: contentCount ?? '조사 대상 아님',
  })))
  if (options.showGaps) console.table(result.incomplete.map(row => ({ 이름: row.nickname, slug: row.slug, 누락: row.gaps.join(', ') })))
  console.log(`별도 확인: ${MANUAL_CHECKS.join(' / ')}. 값의 존재만으로 공개 준비 완료를 확정하지 않습니다.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
