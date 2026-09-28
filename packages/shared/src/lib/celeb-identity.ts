/**
 * 인물 신원 값(이름·다른 이름·수식어)의 기계 검사와 중복 프로필 후보 판정.
 *
 * 등록 스크립트(`seed-real-inactive`·`faction/seed-inactive`)와 점검 명령(`celeb:dup-check`)이 함께 쓴다.
 * 규칙의 뜻과 예외 판단은 docs/project/celeb/celeb-01-01-profile-facts.md 「이름」「다른 이름」과
 * celeb-01-03-title.md 「대표작 표기」가 쥔다. 여기서는 사람이 판정하기 전에 걸러낼 수 있는 것만 본다.
 */

/** `title`은 대개 이 길이 안에서 끝낸다. 넘으면 경고만 한다(뜻을 훼손하면서 줄이지 않는다). */
export const CELEB_TITLE_LENGTH = { min: 2, max: 12 } as const

export type CelebIdentityIssue = {
  level: 'error' | 'warn'
  field: 'nickname' | 'nickname_en' | 'title' | 'title_en'
  message: string
}

export type CelebIdentityRow = {
  id?: string | null
  slug?: string | null
  nickname?: string | null
  nickname_en?: string | null
  aliases?: readonly string[] | null
  wikidata_qid?: string | null
  birth_date?: string | null
  death_date?: string | null
  publication_status?: string | null
}

/** qid·생몰일은 단독으로 같은 사람을 가리킨다. 생년월일만 같으면 이름도 겹쳐야 같은 사람으로 본다. */
export type CelebDuplicateReason = 'qid' | 'dates' | 'birth' | 'name'

export type CelebDuplicateMatch<Row extends CelebIdentityRow = CelebIdentityRow> = {
  row: Row
  reasons: CelebDuplicateReason[]
  /** 사람이 확인하기 전에는 등록을 막아야 하는 일치 */
  strong: boolean
}

const NAME_BRACKETS = /[()（）「」『』[\]]/u
const NAME_QUOTES = /['"‘’“”]/u
const EN_NAME_QUOTES = /["“”]/u
const TITLE_BRACKETS = /[()（）「」『』]/u
const HANGUL = /[가-힣]/u
const FULL_DATE = /^-?\d{1,4}-\d{2}-\d{2}$/u

/** 비교용 이름 키. 공백·가운뎃점·마침표·하이픈·따옴표를 떼고 소문자로 맞춘다. */
export function normalizeCelebName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\s·・.\-_'"‘’“”,]/gu, '')
}

/** 이름 칸 검사. 괄호·따옴표는 오류, 한국어 칸에 한글이 없으면 경고(RM·xQc 같은 활동명은 예외로 남긴다). */
export function celebNameIssues(row: Pick<CelebIdentityRow, 'nickname' | 'nickname_en'>): CelebIdentityIssue[] {
  const issues: CelebIdentityIssue[] = []
  const nickname = row.nickname?.trim() ?? ''
  const nicknameEn = row.nickname_en?.trim() ?? ''
  if (!nickname) issues.push({ level: 'error', field: 'nickname', message: '한국어 이름이 비어 있다' })
  if (NAME_BRACKETS.test(nickname)) issues.push({ level: 'error', field: 'nickname', message: `이름에 괄호가 있다 「${nickname}」 — 다른 이름·수식어로 옮긴다` })
  if (NAME_QUOTES.test(nickname)) issues.push({ level: 'error', field: 'nickname', message: `이름에 따옴표가 있다 「${nickname}」 — 별명은 다른 이름으로 옮긴다` })
  if (nickname && !HANGUL.test(nickname)) issues.push({ level: 'warn', field: 'nickname', message: `한국어 이름에 한글이 없다 「${nickname}」 — 국내 표기를 확인한다` })
  if (NAME_BRACKETS.test(nicknameEn) || EN_NAME_QUOTES.test(nicknameEn)) {
    issues.push({ level: 'error', field: 'nickname_en', message: `영문 이름에 괄호·따옴표가 있다 「${nicknameEn}」` })
  }
  return issues
}

/** 수식어 검사. 「」·괄호는 오류, 길이는 경고. */
export function celebTitleIssues(row: { title?: string | null; title_en?: string | null }): CelebIdentityIssue[] {
  const issues: CelebIdentityIssue[] = []
  const title = row.title?.trim() ?? ''
  const titleEn = row.title_en?.trim() ?? ''
  if (TITLE_BRACKETS.test(title)) issues.push({ level: 'error', field: 'title', message: `수식어에 「」·괄호가 있다 「${title}」` })
  if (TITLE_BRACKETS.test(titleEn)) issues.push({ level: 'error', field: 'title_en', message: `영문 수식어에 「」·괄호가 있다 「${titleEn}」` })
  const length = [...title].length
  if (title && (length < CELEB_TITLE_LENGTH.min || length > CELEB_TITLE_LENGTH.max)) {
    issues.push({ level: 'warn', field: 'title', message: `수식어가 ${length}자다 「${title}」 — 대개 ${CELEB_TITLE_LENGTH.min}~${CELEB_TITLE_LENGTH.max}자` })
  }
  return issues
}

/** 저장할 다른 이름을 정리한다. 앞뒤 공백·중복·자기 이름과 같은 값을 뺀다. */
export function cleanCelebAliases(
  aliases: readonly string[] | null | undefined,
  own: Pick<CelebIdentityRow, 'nickname' | 'nickname_en'>,
): string[] {
  const ownKeys = new Set([normalizeCelebName(own.nickname), normalizeCelebName(own.nickname_en)])
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of aliases ?? []) {
    const alias = raw.trim().replace(/\s+/gu, ' ')
    const key = normalizeCelebName(alias)
    if (!key || ownKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    result.push(alias)
  }
  return result
}

function nameKeys(row: CelebIdentityRow): Set<string> {
  const keys = new Set<string>()
  for (const value of [row.nickname, row.nickname_en, ...(row.aliases ?? [])]) {
    const key = normalizeCelebName(value)
    if ([...key].length >= 2) keys.add(key)
  }
  return keys
}

function identityKeys(row: CelebIdentityRow): { qid: string | null; dates: string | null; birth: string | null; names: Set<string> } {
  const birth = row.birth_date?.trim() ?? ''
  const death = row.death_date?.trim() ?? ''
  const fullBirth = FULL_DATE.test(birth)
  return {
    qid: row.wikidata_qid?.trim().toUpperCase() || null,
    dates: fullBirth && FULL_DATE.test(death) ? `${birth}|${death}` : null,
    birth: fullBirth && !death ? birth : null,
    names: nameKeys(row),
  }
}

function judge(reasons: Set<CelebDuplicateReason>): { reasons: CelebDuplicateReason[]; strong: boolean } {
  const list = (['qid', 'dates', 'birth', 'name'] as const).filter((reason) => reasons.has(reason))
  const strong = reasons.has('qid') || reasons.has('dates') || (reasons.has('birth') && reasons.has('name'))
  return { reasons: list, strong }
}

const isLive = (row: CelebIdentityRow) => row.publication_status !== 'deleted'

/** 등록하려는 인물과 같은 사람일 수 있는 기존 프로필. 강한 일치가 앞에 선다. */
export function findCelebDuplicates<Row extends CelebIdentityRow>(
  candidate: CelebIdentityRow,
  rows: readonly Row[],
): CelebDuplicateMatch<Row>[] {
  const mine = identityKeys(candidate)
  const matches: CelebDuplicateMatch<Row>[] = []
  for (const row of rows) {
    if (!isLive(row) || (candidate.id && row.id === candidate.id)) continue
    const other = identityKeys(row)
    const reasons = new Set<CelebDuplicateReason>()
    if (mine.qid && mine.qid === other.qid) reasons.add('qid')
    if (mine.dates && mine.dates === other.dates) reasons.add('dates')
    if (mine.birth && mine.birth === other.birth) reasons.add('birth')
    for (const key of mine.names) if (other.names.has(key)) { reasons.add('name'); break }
    if (!reasons.size || (reasons.size === 1 && reasons.has('birth'))) continue
    matches.push({ row, ...judge(reasons) })
  }
  return matches.sort((a, b) => Number(b.strong) - Number(a.strong))
}

/** 전체 점검용. 같은 사람일 수 있는 프로필 쌍을 키 묶음으로 찾는다(생년월일만 같은 쌍은 내지 않는다). */
export function findCelebDuplicatePairs<Row extends CelebIdentityRow>(
  rows: readonly Row[],
): { a: Row; b: Row; reasons: CelebDuplicateReason[]; strong: boolean }[] {
  const live = rows.filter(isLive)
  const buckets = new Map<string, number[]>()
  const add = (key: string, index: number) => buckets.set(key, [...(buckets.get(key) ?? []), index])
  live.forEach((row, index) => {
    const keys = identityKeys(row)
    if (keys.qid) add(`qid:${keys.qid}`, index)
    if (keys.dates) add(`dates:${keys.dates}`, index)
    if (keys.birth) add(`birth:${keys.birth}`, index)
    for (const name of keys.names) add(`name:${name}`, index)
  })
  const pairs = new Map<string, Set<CelebDuplicateReason>>()
  for (const [key, indexes] of buckets) {
    if (indexes.length < 2) continue
    const reason = key.slice(0, key.indexOf(':')) as CelebDuplicateReason
    const unique = [...new Set(indexes)]
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const pairKey = `${unique[i]}:${unique[j]}`
        pairs.set(pairKey, (pairs.get(pairKey) ?? new Set()).add(reason))
      }
    }
  }
  const result: { a: Row; b: Row; reasons: CelebDuplicateReason[]; strong: boolean }[] = []
  for (const [pairKey, reasons] of pairs) {
    if (reasons.size === 1 && reasons.has('birth')) continue
    const [i, j] = pairKey.split(':').map(Number)
    result.push({ a: live[i], b: live[j], ...judge(reasons) })
  }
  return result.sort((x, y) => Number(y.strong) - Number(x.strong) || String(x.a.slug).localeCompare(String(y.a.slug)))
}
