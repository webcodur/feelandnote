/**
 * 소설가 박상영의 웹·게임 대사를 검증된 본인 발언 어휘로 정비한다.
 *
 * 동명이인 차단:
 * - 대상: 1988-09-09 출생, 『대도시의 사랑법』 저자
 * - 제외: 펜싱 선수 박상영
 *
 * 발화 지시 태그는 사용자가 ELE 보이스를 들은 뒤 보완하는 값이다.
 * 이 스크립트는 기존 3줄에 태그가 없음을 확인하고, 새 21줄에도 태그를 붙이지 않는다.
 *
 * 주요 출처:
 * - https://www.ajunews.com/view/20220901131621703
 * - https://ch.yes24.com/article/details/39757
 * - https://www.ytn.co.kr/_ln/0106_202212030842270506
 * - https://wordswithoutborders.org/read/article/2019-04/an-interview-with-sang-young-park-anton-hur/
 * - https://www.youtube.com/watch?v=NOnPg9IMv5A&t=192s
 * - https://www.mk.co.kr/news/broadcasting-service/11154852
 * - https://x.com/novelistpark/status/1844918075952595141
 * - https://x.com/novelistpark/status/1844921135986823367
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/fill-park-sang-young-dialogues.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/fill-park-sang-young-dialogues.ts --apply
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CELEB_ID = 'db76e4a6-3add-4f5b-bc85-a1e4f4623c57'
const NICKNAME = '박상영'
const NICKNAME_EN = 'Park Sang-young'
const BIRTH_DATE = '1988-09-09'
const CURRENT_QUOTE = '문학이라는 게 본질적으로는 그림자에 가려져 있는 곳을 환히 비추는 장르라고 생각해요.'
const CURRENT_QUOTE_EN = 'I think literature is essentially the genre that throws light on the places hidden in shadow.'
const NEXT_QUOTE_EN = 'I believe literature is, at its core, a genre that shines light into places hidden in shadow.'

const SITUATIONS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

type Situation = typeof SITUATIONS[number]
type DialogueLines = Record<Situation, [string, string, string]>

type ProfileRow = {
  id: string
  nickname: string
  nickname_en: string
  birth_date: string | null
  profession: string | null
  speech_tone: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: unknown
  lines_en: unknown
  updated_at: string
}

const CURRENT_GREETING = [
  '사랑이 죄가 되는 건 아니지 않습니까.',
  '오늘 또 망쳤습니다. 그래도 내일 또 씁니다.',
  '어딘가 핀이 나간 사람들의 이야기를 좋아합니다.',
]

const CURRENT_GREETING_EN = [
  "Love isn''t a crime, is it.",
  "I failed again today. I''ll still write again tomorrow.",
  "I love stories about people whose wiring is a little off.",
]

const LINES: DialogueLines = {
  greeting: [
    '소설가가 되지 않았다면 저는 아무것도 아니었을 겁니다.',
    '쓰는 건 정말 재미있습니다. 써봐야만 알 수 있는 것 같아요.',
    '제 본진은 문학입니다.',
  ],
  roll_call: [
    '그냥 재미있는 소설을 쓰자는 생각 하나로 갑니다.',
    '할 수 있는 모든 것을 다 하고 싶어요.',
    '새벽에 일어나 빈속에 커피를 마시며 마감부터 지킵니다.',
  ],
  deploy: [
    '그림자에 가려진 곳부터 환히 비춥시다.',
    '아무것도 아닌 일상도 소설 같은 일이 될 수 있어요.',
    '독자를 고문하지 맙시다. 재미있게 써야죠.',
  ],
  battle_win: [
    '자기 의심을 거둘 수 있는 계기가 됐습니다.',
    '한 편을 완성하면 이틀 정도는 행복합니다.',
    '내 작품이 좀 찢었나. 이게 바로 파워 콘텐츠인가요?',
  ],
  battle_draw: [
    '문학에 투신하는 삶도 좋지만, 실은 삶이 더 중요하잖아요.',
    '진짜 관계는 실패를 함께한 사이 아닐까요.',
    '저와 제 작품을 뭐라고 부를지는 독자의 영역입니다.',
  ],
  battle_lose: [
    '이상하게 책이 나올 때만 되면 우울해져요.',
    '원하는 데까지 못 갔다는 부끄러움과 절망은 남습니다.',
    '혐오의 민낯은 겪어도 도무지 익숙해지지 않습니다.',
  ],
  clash_attack: [
    '거짓말하는 게 소설은 아니거든요!',
    '좋은 작품은 논란을 불러일으키기 마련입니다!',
    '결국 우리가 이길 겁니다!',
  ],
}

const LINES_EN: DialogueLines = {
  greeting: [
    'If I had not become a novelist, I would have been nothing.',
    'Writing really is fun. I think you can only know that by trying it.',
    'Literature is my home base.',
  ],
  roll_call: [
    'I have just one thought: write an entertaining novel.',
    'I want to do everything I can.',
    'I wake before dawn, drink coffee on an empty stomach, and meet the deadline first.',
  ],
  deploy: [
    'Let us shine light into the places hidden in shadow.',
    'Even an ordinary, seemingly insignificant day can become something novel-like.',
    'Let us not torture the readers. We have to make it interesting.',
  ],
  battle_win: [
    'It gave me a chance to stop doubting myself.',
    'I am happy for about two days after I finish a story.',
    'Did my work just crush it? Is this what they call power content?',
  ],
  battle_draw: [
    'A life devoted to literature may sound romantic, but life itself matters more.',
    'Maybe a true relationship is one shared through failure.',
    'What people call me and my work belongs to the reader.',
  ],
  battle_lose: [
    'Strangely, I get depressed whenever a book is about to come out.',
    'The shame and despair of not taking it as far as I wanted still remain.',
    'I can never get used to the ugly face of hate, no matter how often I face it.',
  ],
  clash_attack: [
    'Lying is not what fiction is!',
    'Good works inevitably stir controversy!',
    'In the end, we will win!',
  ],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sameDialogue(value: unknown, expected: DialogueLines): boolean {
  if (!isRecord(value)) return false
  return SITUATIONS.every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]))
}

function validate() {
  for (const [language, lines] of [['KO', LINES], ['EN', LINES_EN]] as const) {
    const all: string[] = []
    for (const key of SITUATIONS) {
      if (lines[key].length !== 3) throw new Error(`${language}.${key}: 3개가 아님`)
      for (const line of lines[key]) {
        if (!line.trim()) throw new Error(`${language}.${key}: 빈 대사`)
        if (/^\[[^\]]+\]/.test(line)) throw new Error(`${language}.${key}: AI 발화 지시 태그 금지`)
        if (line.includes('—')) throw new Error(`${language}.${key}: em dash 금지`)
        all.push(line)
      }
    }
    if (new Set(all).size !== 21) throw new Error(`${language}: 중복 대사`)
  }
}

async function assertNotUploaded() {
  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  const uploadedFolders = Object.entries(lineup)
    .filter(([, value]) => Object.keys(value.uploads ?? {}).length)
    .map(([folder]) => folder)

  const { data: episodes, error: episodeError } = await db
    .from('faction_episodes')
    .select('id')
    .in('folder', uploadedFolders)
  if (episodeError) throw new Error(`업로드 에피소드 조회 실패: ${episodeError.message}`)

  const { data: groups, error: groupError } = await db
    .from('faction_groups')
    .select('id')
    .in('episode_id', (episodes ?? []).map(row => row.id as string))
  if (groupError) throw new Error(`업로드 세력 조회 실패: ${groupError.message}`)

  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters')
    .select('id')
    .in('group_id', (groups ?? []).map(row => row.id as string))
  if (clusterError) throw new Error(`업로드 클러스터 조회 실패: ${clusterError.message}`)

  const { data: protectedPeople, error: peopleError } = await db
    .from('faction_people')
    .select('id')
    .in('cluster_id', (clusters ?? []).map(row => row.id as string))
    .eq('celeb_id', CELEB_ID)
  if (peopleError) throw new Error(`업로드 출연자 조회 실패: ${peopleError.message}`)
  if ((protectedPeople ?? []).length) throw new Error(`${NICKNAME}: 업로드 팩션 출연자 보호`)
}

function assertCurrentDraft(lines: Record<string, unknown>, linesEn: Record<string, unknown>) {
  if (lines.quote !== CURRENT_QUOTE || linesEn.quote !== CURRENT_QUOTE_EN) {
    throw new Error(`${NICKNAME}: 기존 대표 어록이 예상과 다름`)
  }
  if (JSON.stringify(lines.greeting) !== JSON.stringify(CURRENT_GREETING)
    || JSON.stringify(linesEn.greeting) !== JSON.stringify(CURRENT_GREETING_EN)) {
    throw new Error(`${NICKNAME}: 기존 greeting 3줄이 예상과 다름`)
  }
  for (const key of SITUATIONS.filter(key => key !== 'greeting')) {
    if (lines[key] !== null || linesEn[key] !== null) {
      throw new Error(`${NICKNAME}: 기존 ${key}가 비어 있지 않음`)
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  validate()
  await assertNotUploaded()

  const { data: profileData, error: profileError } = await db
    .from('profiles')
    .select('id, nickname, nickname_en, birth_date, profession, speech_tone')
    .eq('id', CELEB_ID)
    .single()
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  const profile = profileData as unknown as ProfileRow
  if (profile.nickname !== NICKNAME
    || profile.nickname_en !== NICKNAME_EN
    || profile.birth_date !== BIRTH_DATE
    || profile.profession !== 'author') {
    throw new Error(`동명이인 차단 실패: ${JSON.stringify(profile)}`)
  }

  const { data: dialogueData, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en, updated_at')
    .eq('celeb_id', CELEB_ID)
    .single()
  if (dialogueError) throw new Error(`대사 조회 실패: ${dialogueError.message}`)
  const dialogue = dialogueData as unknown as DialogueRow
  const currentLines = isRecord(dialogue.lines) ? dialogue.lines : {}
  const currentLinesEn = isRecord(dialogue.lines_en) ? dialogue.lines_en : {}

  const alreadyDone = currentLines.quote === CURRENT_QUOTE
    && currentLinesEn.quote === NEXT_QUOTE_EN
    && sameDialogue(currentLines, LINES)
    && sameDialogue(currentLinesEn, LINES_EN)
  if (alreadyDone) {
    console.log(`SKIP ${CELEB_ID} ${NICKNAME}: 태그 없는 KO/EN 21줄 이미 일치`)
    return
  }
  assertCurrentDraft(currentLines, currentLinesEn)

  console.log(`PLAN ${CELEB_ID} ${NICKNAME}: KO/EN 3→21 · 발화 태그 0개 · 대표 어록 영문 교정`)
  if (!apply) {
    console.log('DRY-RUN DB 쓰기 0건')
    return
  }

  const { data: changed, error: updateError } = await db
    .from('celeb_dialogues')
    .update({
      lines: { quote: CURRENT_QUOTE, ...LINES },
      lines_en: { quote: NEXT_QUOTE_EN, ...LINES_EN },
    })
    .eq('celeb_id', CELEB_ID)
    .eq('updated_at', dialogue.updated_at)
    .select('celeb_id, lines, lines_en')
    .maybeSingle()
  if (updateError) throw new Error(`대사 갱신 실패: ${updateError.message}`)
  if (!changed) throw new Error('대사 갱신 충돌')
  if (!sameDialogue(changed.lines, LINES)
    || !sameDialogue(changed.lines_en, LINES_EN)
    || !isRecord(changed.lines)
    || !isRecord(changed.lines_en)
    || changed.lines.quote !== CURRENT_QUOTE
    || changed.lines_en.quote !== NEXT_QUOTE_EN) {
    throw new Error('갱신 후 검증 실패')
  }

  console.log(`APPLIED ${CELEB_ID} ${NICKNAME}: 태그 없는 KO 21줄 · EN 21줄`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
