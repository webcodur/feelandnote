/**
 * 비업로드 팩션의 실존 인물 중 실제 발언 재료가 충분한 4명의
 * 웹·게임용 고유 대사 7상황 × 3변형을 백지 작성해 등록한다.
 *
 * 대상: 알렉스 스파이로, 앤서니 암스트롱, 존 허링, 박태환
 * 보호: 업로드된 팩션 출연 이력이 있거나 기존 21개 대사가 하나라도 있으면 중단
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/fill-x-empire-web-dialogues.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/fill-x-empire-web-dialogues.ts --apply
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

type Target = {
  nickname: string
  nicknameEn: string
  tone: 'bold' | 'composed' | 'humble'
  currentQuote?: string
  currentQuoteEn?: string
  quote: string
  quoteEn: string
  lines: DialogueLines
  linesEn: DialogueLines
}

type ProfileRow = {
  id: string
  nickname: string
  nickname_en: string
  speech_tone: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: unknown
  lines_en: unknown
  updated_at: string
}

const TARGETS: Target[] = [
  {
    nickname: '알렉스 스파이로',
    nicknameEn: 'Alex Spiro',
    tone: 'bold',
    quote: '나는 삶과 법정에서 위험을 감수해야 한다고 굳게 믿습니다.',
    quoteEn: 'I’m a big believer that you got to take risks in life and in court',
    lines: {
      greeting: [
        '[confident, direct] 진실을 말하세요. 이야기는 지어내지 마십시오.',
        '[calm, sharp] 여론은 바뀝니다. 증거는 법정에 남습니다.',
        '[bold, challenging] 어려운 사건일수록 재판에서 끝을 봐야 합니다.',
      ],
      roll_call: [
        '[ready, focused] 기록을 읽었습니다. 이제 허점을 짚겠습니다.',
        '[confident, restless] 저는 법정에서 가장 또렷해집니다.',
        '[bold, composed] 사건을 맡으면 끝까지 대변하겠습니다.',
      ],
      deploy: [
        '[commanding, sharp] 주장 말고 증거부터 내놓으십시오.',
        '[focused, decisive] 쟁점을 좁히고 모순을 드러내겠습니다.',
        '[bold, advancing] 공개 재판으로 가져가십시오. 모두가 보게 합시다.',
      ],
      battle_win: [
        '[satisfied, restrained] 판결이 나왔습니다. 더 보탤 말은 없습니다.',
        '[confident, firm] 이야기를 지어내지 않았기에 이겼습니다.',
        '[calm, proud] 우리는 한 사람의 사건으로 모두의 기준을 바꿨습니다.',
      ],
      battle_draw: [
        '[patient, analytical] 흑백으로 보지 마십시오. 회색에서 답을 찾겠습니다.',
        '[steady, watchful] 아직 기록이 남았습니다. 다음 심문에서 확인하죠.',
        '[calm, resolute] 아직 결론이 나지 않았습니다. 저는 변론을 멈추지 않겠습니다.',
      ],
      battle_lose: [
        '[bitter, controlled] 졌습니다. 그래도 잘못된 기소라면 다시 다투겠습니다.',
        '[heavy, honest] 제가 놓친 모순부터 다시 찾겠습니다.',
        '[somber, defiant] 판결은 존중합니다. 침묵까지 약속하진 않습니다.',
      ],
      clash_attack: [
        '[fierce, striking] 그 진술, 사실과 다릅니다!',
        '[sharp, commanding] 질문에만 답하십시오!',
        '[bold, decisive] 모순을 기록에 남기겠습니다!',
      ],
    },
    linesEn: {
      greeting: [
        '[confident, direct] Tell the truth. Do not make stories up.',
        '[calm, sharp] Public opinion changes. Evidence stays in court.',
        '[bold, challenging] The harder the case, the more reason to take it to trial.',
      ],
      roll_call: [
        '[ready, focused] I read the record. Now I will find the weak point.',
        '[confident, restless] I am at my sharpest in a courtroom.',
        '[bold, composed] If I take the case, I see it through.',
      ],
      deploy: [
        '[commanding, sharp] Bring evidence, not assertions.',
        '[focused, decisive] I will narrow the issue and expose the contradiction.',
        '[bold, advancing] Take it to open court. Let everyone see it.',
      ],
      battle_win: [
        '[satisfied, restrained] The verdict is in. I have nothing to add.',
        '[confident, firm] We won because we did not invent a story.',
        '[calm, proud] With one person’s case, we changed the standard for everyone.',
      ],
      battle_draw: [
        '[patient, analytical] Do not force it into black and white. I will find the answer in the gray.',
        '[steady, watchful] The record is still open. I will test it in the next cross-examination.',
        '[calm, resolute] There is no decision yet. I am not done arguing.',
      ],
      battle_lose: [
        '[bitter, controlled] We lost. If the prosecution was wrong, I will challenge it again.',
        '[heavy, honest] I will start with the contradiction I missed.',
        '[somber, defiant] I respect the verdict. I did not promise silence.',
      ],
      clash_attack: [
        '[fierce, striking] That statement does not match the facts!',
        '[sharp, commanding] Answer only the question!',
        '[bold, decisive] I will put that contradiction on the record!',
      ],
    },
  },
  {
    nickname: '앤서니 암스트롱',
    nicknameEn: 'Anthony Armstrong',
    tone: 'composed',
    quote: '파괴적 기술에 밀려나느니 그 기술을 인수하는 편이 낫습니다.',
    quoteEn: 'It’s better to acquire disruptive technology than to be disrupted by that technology.',
    lines: {
      greeting: [
        '[composed, precise] 기술에 밀려나기 전에 그 기술을 인수해야 합니다.',
        '[calm, analytical] 삽에서 토큰까지, 저는 숫자를 한 줄로 잇습니다.',
        '[measured, direct] 빠르게 짓되 책임 있게 짓겠습니다.',
      ],
      roll_call: [
        '[ready, precise] 자금 구조와 전력 계획을 확인했습니다.',
        '[calm, focused] 가치와 위험을 같은 표에 올리겠습니다.',
        '[steady, analytical] 숫자가 맞으면 실행하고, 아니면 멈추겠습니다.',
      ],
      deploy: [
        '[commanding, precise] 현금이 새는 곳부터 막고 투자를 시작하십시오.',
        '[focused, decisive] 전력이 있으면 사고, 없으면 직접 공급합니다.',
        '[calm, advancing] 삽에서 토큰까지 전부 연결하십시오.',
      ],
      battle_win: [
        '[satisfied, measured] 우리는 인수한 기술로 성장을 이끌었습니다.',
        '[calm, proud] 빠르게 지었고 책임도 놓치지 않았습니다.',
        '[confident, precise] 우리는 숫자대로 실행해 같은 결론에 닿았습니다.',
      ],
      battle_draw: [
        '[patient, analytical] 가격은 맞지만 조건이 부족합니다. 다시 계산하죠.',
        '[calm, cautious] 이사회가 신중해야 할 지점이 남았습니다.',
        '[steady, pragmatic] 더 사지도, 접지도 않겠습니다. 선택지를 열어두죠.',
      ],
      battle_lose: [
        '[heavy, honest] 숫자를 잘못 읽었습니다. 손실부터 인정하겠습니다.',
        '[somber, responsible] 속도를 앞세우다 책임을 놓쳤습니다.',
        '[controlled, resolute] 실패한 거래는 접고 자본을 지키겠습니다.',
      ],
      clash_attack: [
        '[sharp, decisive] 이 조건으로는 서명하지 않겠습니다!',
        '[commanding, focused] 비용이 새는 곳부터 막으십시오!',
        '[firm, striking] 파괴당하기 전에 인수하겠습니다!',
      ],
    },
    linesEn: {
      greeting: [
        '[composed, precise] Acquire the technology before it disrupts you.',
        '[calm, analytical] I connect the numbers from shovels to tokens.',
        '[measured, direct] We will build fast and build responsibly.',
      ],
      roll_call: [
        '[ready, precise] I checked the capital structure and the power plan.',
        '[calm, focused] I will put value and risk on the same sheet.',
        '[steady, analytical] If the numbers work, we move. If they do not, we stop.',
      ],
      deploy: [
        '[commanding, precise] Stop the cash leak, then start investing.',
        '[focused, decisive] Buy power when it is available. Provide it when it is not.',
        '[calm, advancing] Connect everything from shovels to tokens.',
      ],
      battle_win: [
        '[satisfied, measured] We used the technology we acquired to drive growth.',
        '[calm, proud] We built fast without abandoning responsibility.',
        '[confident, precise] We followed the numbers and reached the same answer.',
      ],
      battle_draw: [
        '[patient, analytical] The price works. The terms do not. Run it again.',
        '[calm, cautious] The board still has a reason to be careful.',
        '[steady, pragmatic] I will neither buy more nor walk away. Keep the options open.',
      ],
      battle_lose: [
        '[heavy, honest] I read the numbers wrong. I will own the loss first.',
        '[somber, responsible] We put speed first and lost sight of responsibility.',
        '[controlled, resolute] Close the failed deal and protect the capital.',
      ],
      clash_attack: [
        '[sharp, decisive] I will not sign on these terms!',
        '[commanding, focused] Stop the money from leaking out first!',
        '[firm, striking] Acquire it before it disrupts us!',
      ],
    },
  },
  {
    nickname: '존 허링',
    nicknameEn: 'John Hering',
    tone: 'bold',
    quote: '완벽한 보안이라는 건 없다. 그런 건 존재하지 않는다.',
    quoteEn: 'There is no such thing as total security. It doesn’t exist.',
    lines: {
      greeting: [
        '[confident, alert] 휴대전화도 컴퓨터입니다. 그 사실부터 받아들이시죠.',
        '[calm, direct] 완벽한 보안은 없습니다. 위험을 먼저 보겠습니다.',
        '[curious, bold] 불가능해 보이는 기술부터 만들어봅시다.',
      ],
      roll_call: [
        '[ready, analytical] 시스템이 어떻게 뚫리는지부터 확인했습니다.',
        '[focused, watchful] 신뢰가 무너지는 지점을 추적하겠습니다.',
        '[confident, precise] 강점에 집중하고 그 힘을 확장하겠습니다.',
      ],
      deploy: [
        '[commanding, alert] 공격자가 보기 전에 취약점을 찾으십시오.',
        '[bold, decisive] 휴대전화를 작은 전화가 아니라 컴퓨터로 다루십시오.',
        '[strategic, advancing] 잠재적 위협부터 생각하고 연결 기기를 설계하십시오.',
      ],
      battle_win: [
        '[proud, energized] 안드로이드와 iOS에 회사를 걸었고, 선택이 적중했습니다.',
        '[satisfied, sharp] 불가능해 보이던 일을 기술로 증명했습니다.',
        '[confident, forward] 시스템이 뚫리는 길을 알았기에 먼저 막았습니다.',
      ],
      battle_draw: [
        '[patient, analytical] 아직 침입 경로를 다 찾지 못했습니다.',
        '[steady, cautious] 신뢰만으로는 부족합니다. 동작을 더 살피겠습니다.',
        '[calm, probing] 공격을 모른다면 아직 문제가 끝난 게 아닙니다.',
      ],
      battle_lose: [
        '[heavy, honest] 완벽하다고 믿은 순간부터 졌습니다.',
        '[somber, responsible] 사용자의 실수까지 설계에 넣지 못했습니다.',
        '[controlled, resolute] 침입을 인정하고 취약점부터 다시 열겠습니다.',
      ],
      clash_attack: [
        '[fierce, striking] 그 신뢰가 바로 공격면입니다!',
        '[sharp, commanding] 숨어 있는 권한부터 끊으십시오!',
        '[bold, defiant] 어떤 시스템도 뚫리지 않는다고 말하지 마십시오!',
      ],
    },
    linesEn: {
      greeting: [
        '[confident, alert] Your phone is a computer. Start by treating it like one.',
        '[calm, direct] Total security does not exist. I will look at the risk first.',
        '[curious, bold] Let us build the technology people cannot yet imagine.',
      ],
      roll_call: [
        '[ready, analytical] I started by finding out how the system breaks.',
        '[focused, watchful] I will trace the point where trust is violated.',
        '[confident, precise] I will focus on what we do best and scale it.',
      ],
      deploy: [
        '[commanding, alert] Find the vulnerability before the attacker does.',
        '[bold, decisive] Treat the phone as a computer, not a smaller telephone.',
        '[strategic, advancing] Design every connected device with the threat in mind.',
      ],
      battle_win: [
        '[proud, energized] We bet the company on Android and iOS, and the bet worked.',
        '[satisfied, sharp] We proved what was possible with technology.',
        '[confident, forward] We knew how the system could break, so we stopped it first.',
      ],
      battle_draw: [
        '[patient, analytical] I have not found every intrusion path yet.',
        '[steady, cautious] Trust is not enough. I will inspect the behavior.',
        '[calm, probing] If we do not know about the attack, the problem is not over.',
      ],
      battle_lose: [
        '[heavy, honest] We lost the moment we believed the system was perfect.',
        '[somber, responsible] I failed to design for the user’s mistakes.',
        '[controlled, resolute] Admit the breach and reopen the vulnerabilities.',
      ],
      clash_attack: [
        '[fierce, striking] That trust is the attack surface!',
        '[sharp, commanding] Cut off the hidden permissions first!',
        '[bold, defiant] Never call a system unbreakable!',
      ],
    },
  },
  {
    nickname: '박태환',
    nicknameEn: 'Park Tae-hwan',
    tone: 'humble',
    currentQuote: '바닥부터 다시 시작하겠습니다',
    currentQuoteEn: 'I will start over from the very bottom.',
    quote: '매번 느끼는 거지만 자신감이 제일 중요한 것 같아요.',
    quoteEn: 'I feel this every time, but I think confidence is the most important thing.',
    lines: {
      greeting: [
        '[humble, composed] 저는 아직 정상에 올랐다고 생각하지 않습니다.',
        '[warm, resilient] 언제나 그랬듯 오늘도 내일도 나아가겠습니다.',
        '[calm, focused] 메달보다 제가 훈련해 온 것이 잘 나오길 바랍니다.',
      ],
      roll_call: [
        '[ready, focused] 경쟁은 항상 제 자신과 해왔다고 생각합니다.',
        '[humble, steady] 아직 갈 길이 멉니다. 시작이라고 생각하겠습니다.',
        '[calm, prepared] 다치지 않고 건강하게 페이스를 올리겠습니다.',
      ],
      deploy: [
        '[commanding, focused] 기회는 준비된 사람만 잡습니다. 저는 준비됐습니다.',
        '[steady, analytical] 스타트와 턴, 레이스 운영부터 다시 점검합시다.',
        '[determined, driving] 힘들수록 제 능력을 키우는 과정이라고 생각하십시오.',
      ],
      battle_win: [
        '[joyful, humble] 개인 최고 기록을 0.1초라도 깨는 게 제일 큰 목표였습니다.',
        '[proud, restrained] 훈련 파트너들과 함께했기에 이 기록을 만들었습니다.',
        '[grateful, humble] 수영 천재라니 감사합니다. 그 이름에 걸맞으려면 더 노력해야 합니다.',
      ],
      battle_draw: [
        '[patient, analytical] 시간이 짧아도 남은 만큼 최선을 다하겠습니다.',
        '[calm, reflective] 기록은 아쉽지만 다음 훈련의 좋은 발판이 될 겁니다.',
        '[steady, thoughtful] 좋은 일도 나쁜 일도 겪으며 많은 것을 배우고 있습니다.',
      ],
      battle_lose: [
        '[heavy, humble] 아쉬움은 많이 남지만 후회는 없습니다. 최선을 다했습니다.',
        '[somber, honest] 무엇이 부족한지 깨달았습니다. 훈련으로 준비하겠습니다.',
        '[controlled, resilient] 제가 아직 수영할 수 있다는 걸 보여드리겠습니다.',
      ],
      clash_attack: [
        '[fierce, surging] 자신과의 싸움에서 이기겠습니다!',
        '[bold, focused] 제 최고 기록을 0.1초라도 깨겠습니다!',
        '[determined, striking] 두 배로 훈련해 끝내 따라잡겠습니다!',
      ],
    },
    linesEn: {
      greeting: [
        '[humble, composed] I do not think I have reached the top yet.',
        '[warm, resilient] As always, I will keep moving forward today and tomorrow.',
        '[calm, focused] More than a medal, I hope what I trained for comes through.',
      ],
      roll_call: [
        '[ready, focused] I think I have always competed against myself.',
        '[humble, steady] I still have a long road ahead. I will treat this as the beginning.',
        '[calm, prepared] I will build up my pace while staying healthy and injury-free.',
      ],
      deploy: [
        '[commanding, focused] Only those who are prepared can seize an opportunity. I am ready.',
        '[steady, analytical] Let us review the start, the turns, and the race plan.',
        '[determined, driving] When it hurts, remember that this is how we build capacity.',
      ],
      battle_win: [
        '[joyful, humble] My biggest goal was to beat my personal best, even by 0.1 seconds.',
        '[proud, restrained] I made this record because I had my training partners with me.',
        '[grateful, humble] Thank you for calling me a swimming genius. I need to work harder to fit the name.',
      ],
      battle_draw: [
        '[patient, analytical] Time is short, but I will do my best with what remains.',
        '[calm, reflective] The result fell short, but it will be a good foundation for my training.',
        '[steady, thoughtful] I have been through good times and bad, and I am learning a great deal.',
      ],
      battle_lose: [
        '[heavy, humble] I am deeply disappointed, but I have no regrets. I did my best.',
        '[somber, honest] I learned what I was lacking. I will prepare through training.',
        '[controlled, resilient] I will show people that I can still swim.',
      ],
      clash_attack: [
        '[fierce, surging] I will win the fight against myself!',
        '[bold, focused] I will beat my personal best, even by 0.1 seconds!',
        '[determined, striking] I will train twice as hard and catch you!',
      ],
    },
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function dialogueCount(value: unknown): number {
  if (!isRecord(value)) return 0
  return SITUATIONS.reduce((sum, key) => {
    const lines = value[key]
    return sum + (Array.isArray(lines) ? lines.filter(line => typeof line === 'string' && line.trim()).length : 0)
  }, 0)
}

function validate(target: Target) {
  const bannedKoPattern = /승리가\s*우리를\s*부른|에\s*있어서|을\s*통하여|에\s*다름\s*아니|되어졌|—/
  for (const [language, lines] of [['KO', target.lines], ['EN', target.linesEn]] as const) {
    for (const key of SITUATIONS) {
      if (!Array.isArray(lines[key]) || lines[key].length !== 3) {
        throw new Error(`${target.nickname} ${language}.${key}: 3개가 아님`)
      }
      for (const line of lines[key]) {
        if (!/^\[[a-z]+,\s*[a-z]+\]\s+\S/.test(line)) {
          throw new Error(`${target.nickname} ${language}.${key}: 감정 태그 형식 오류 — ${line}`)
        }
        if (line.includes('—')) throw new Error(`${target.nickname} ${language}.${key}: em dash 금지`)
      }
    }
  }
  for (const key of SITUATIONS) {
    for (let index = 0; index < 3; index++) {
      if (bannedKoPattern.test(target.lines[key][index])) {
        throw new Error(`${target.nickname} KO.${key}: 번역투 금지 패턴`)
      }
      const koTag = target.lines[key][index].match(/^\[[^\]]+\]/)?.[0]
      const enTag = target.linesEn[key][index].match(/^\[[^\]]+\]/)?.[0]
      if (koTag !== enTag) throw new Error(`${target.nickname} ${key}[${index}]: KO/EN 감정 태그 불일치`)
    }
  }
  const koLines = SITUATIONS.flatMap(key => target.lines[key])
  const enLines = SITUATIONS.flatMap(key => target.linesEn[key])
  if (new Set(koLines).size !== 21 || new Set(enLines).size !== 21) {
    throw new Error(`${target.nickname}: 대사 중복`)
  }
}

function sameDialogue(value: unknown, expected: DialogueLines): boolean {
  if (!isRecord(value)) return false
  return SITUATIONS.every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]))
}

async function uploadedCastGuard(targetIds: string[]) {
  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  const folders = Object.entries(lineup)
    .filter(([, value]) => Object.keys(value.uploads ?? {}).length)
    .map(([folder]) => folder)
  if (!folders.length) return

  const { data: episodes, error: episodeError } = await db
    .from('faction_episodes').select('id, folder').in('folder', folders)
  if (episodeError) throw new Error(`업로드 에피소드 조회 실패: ${episodeError.message}`)
  const episodeIds = (episodes ?? []).map(row => row.id as string)

  const { data: groups, error: groupError } = await db
    .from('faction_groups').select('id').in('episode_id', episodeIds)
  if (groupError) throw new Error(`업로드 세력 조회 실패: ${groupError.message}`)
  const groupIds = (groups ?? []).map(row => row.id as string)

  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters').select('id').in('group_id', groupIds)
  if (clusterError) throw new Error(`업로드 클러스터 조회 실패: ${clusterError.message}`)
  const clusterIds = (clusters ?? []).map(row => row.id as string)

  const { data: protectedPeople, error: peopleError } = await db
    .from('faction_people').select('celeb_id').in('cluster_id', clusterIds).in('celeb_id', targetIds)
  if (peopleError) throw new Error(`업로드 출연자 조회 실패: ${peopleError.message}`)
  if ((protectedPeople ?? []).length) {
    const protectedIds = [...new Set((protectedPeople ?? []).map(row => row.celeb_id as string))]
    throw new Error(`업로드 출연자 보호: ${protectedIds.join(', ')}`)
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  TARGETS.forEach(validate)

  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('id, nickname, nickname_en, speech_tone')
    .in('nickname', TARGETS.map(target => target.nickname))
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  const rows = (profiles ?? []) as unknown as ProfileRow[]
  if (rows.length !== TARGETS.length) throw new Error(`프로필 ${rows.length}/${TARGETS.length}건`)

  await uploadedCastGuard(rows.map(row => row.id))

  const { data: dialogues, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en, updated_at')
    .in('celeb_id', rows.map(row => row.id))
  if (dialogueError) throw new Error(`대사 조회 실패: ${dialogueError.message}`)
  const dialogueById = new Map(((dialogues ?? []) as unknown as DialogueRow[]).map(row => [row.celeb_id, row]))

  const plans: { target: Target; profile: ProfileRow; dialogue: DialogueRow }[] = []
  for (const target of TARGETS) {
    const profile = rows.find(row => row.nickname === target.nickname)
    if (!profile) throw new Error(`${target.nickname}: 프로필 없음`)
    if (profile.nickname_en !== target.nicknameEn) {
      throw new Error(`${target.nickname}: 동명이인 차단 실패 — ${profile.nickname_en}`)
    }
    if (profile.speech_tone && profile.speech_tone !== target.tone) {
      throw new Error(`${target.nickname}: 기존 speech_tone=${profile.speech_tone}, 예정=${target.tone}`)
    }
    const dialogue = dialogueById.get(profile.id)
    if (!dialogue) throw new Error(`${target.nickname}: celeb_dialogues 행 없음`)

    const currentLines = isRecord(dialogue.lines) ? dialogue.lines : {}
    const currentLinesEn = isRecord(dialogue.lines_en) ? dialogue.lines_en : {}
    const alreadyDone = sameDialogue(currentLines, target.lines)
      && sameDialogue(currentLinesEn, target.linesEn)
      && currentLines.quote === target.quote
      && currentLinesEn.quote === target.quoteEn
      && profile.speech_tone === target.tone
    if (alreadyDone) {
      console.log(`SKIP  ${profile.id} ${target.nickname} — 이미 21개 완비`)
      continue
    }
    const koCount = dialogueCount(currentLines)
    const enCount = dialogueCount(currentLinesEn)
    if (koCount || enCount) {
      throw new Error(`${target.nickname}: 기존 대사 KO ${koCount}/21, EN ${enCount}/21 — 자동 덮어쓰기 금지`)
    }
    const expectedCurrentQuote = target.currentQuote ?? target.quote
    const expectedCurrentQuoteEn = target.currentQuoteEn ?? target.quoteEn
    if (currentLines.quote !== expectedCurrentQuote || currentLinesEn.quote !== expectedCurrentQuoteEn) {
      throw new Error(`${target.nickname}: 기존 quote가 예상과 다름`)
    }

    plans.push({ target, profile, dialogue })
    console.log(`PLAN  ${profile.id} ${target.nickname} tone=${profile.speech_tone ?? 'null'}→${target.tone} KO/EN 0→21`)
  }

  if (!apply) {
    console.log(`DRY-RUN 변경 예정 ${plans.length}명 · DB 쓰기 0건`)
    return
  }

  let updated = 0
  for (const { target, profile, dialogue } of plans) {
    const nextLines = { quote: target.quote, ...target.lines }
    const nextLinesEn = { quote: target.quoteEn, ...target.linesEn }
    const { data: changedDialogue, error: updateDialogueError } = await db
      .from('celeb_dialogues')
      .update({ lines: nextLines, lines_en: nextLinesEn })
      .eq('celeb_id', profile.id)
      .eq('updated_at', dialogue.updated_at)
      .select('celeb_id, lines, lines_en')
      .maybeSingle()
    if (updateDialogueError) throw new Error(`${target.nickname}: 대사 갱신 실패 — ${updateDialogueError.message}`)
    if (!changedDialogue) throw new Error(`${target.nickname}: 대사 갱신 충돌`)

    let changedTone = profile.speech_tone
    if (!changedTone) {
      const { data: changedProfile, error: updateProfileError } = await db
        .from('profiles')
        .update({ speech_tone: target.tone })
        .eq('id', profile.id)
        .is('speech_tone', null)
        .select('id, speech_tone')
        .maybeSingle()
      if (updateProfileError) throw new Error(`${target.nickname}: tone 갱신 실패 — ${updateProfileError.message}`)
      if (!changedProfile) throw new Error(`${target.nickname}: tone 갱신 충돌`)
      changedTone = changedProfile.speech_tone
    }

    if (!sameDialogue(changedDialogue.lines, target.lines)
      || !sameDialogue(changedDialogue.lines_en, target.linesEn)
      || changedTone !== target.tone) {
      throw new Error(`${target.nickname}: 갱신 후 검증 실패`)
    }
    updated++
    console.log(`UPDATE ${profile.id} ${target.nickname}`)
  }

  console.log(`APPLIED ${updated}명 · KO ${updated * 21}줄 · EN ${updated * 21}줄`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
