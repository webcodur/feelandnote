/**
 * 한국 스포츠 명예의 전당 박태환의 검증된 직접 발언 44건을
 * faction_people.mined.minedQuotes에 적재하고, SBS 원문에서 잘린 말끝과
 * 어색한 영문 번역을 바로잡는다.
 *
 * 공식 장문 글과 X는 조사했지만 본인 자료가 없어 0건이다.
 * 음성 파일이 없는 미업로드 에피소드만 대상으로 한다.
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/backfill-park-tae-hwan-mined-quotes.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/backfill-park-tae-hwan-mined-quotes.ts --apply
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

type MinedQuote = { ref: string; en: string; ko: string }

const EPISODE = 'korea-sports-legends'
const PERSON = '박태환'
const CURRENT_QUOTE = '매번 느끼지만, 자신감이 제일 중요하다.'
const CURRENT_QUOTE_EN = 'As I feel every time, confidence matters most.'
const NEXT_QUOTE = '매번 느끼는 거지만, 자신감이 제일 중요한 것 같아요.'
const NEXT_QUOTE_EN = 'I feel this every time: confidence is what matters most.'
const NEXT_QUOTE_CHUNKS = ['매번 느끼는 거지만,', '자신감이 제일 중요한 것 같아요.']
const NEXT_QUOTE_EN_CHUNKS = ['I feel this every time:', 'confidence is what matters most.']
const NEXT_ORIGIN = 'SBS 「금메달보다 귀한 자신감 얻었죠」(2008-08). 원문 “매번 느끼는 거지만 자신감이 제일 중요한 것 같아요.” https://news.sbs.co.kr/news/endPage.do?news_id=N1000456917'

const MINED: MinedQuote[] = [
  {
    ref: 'SBS 「금메달보다 귀한 자신감 얻었죠」, 2008-08 — https://news.sbs.co.kr/news/endPage.do?news_id=N1000456917',
    en: 'I feel this every time, but I think confidence is the most important thing.',
    ko: '매번 느끼는 거지만 자신감이 제일 중요한 것 같아요.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: 'At the Dong-A Swimming Competition, I broke my record. Since then, my confidence has grown. The training was tough. But overall, it was from the Dong-A that I gained confidence. And I also felt that I could break my record.',
    ko: '동아수영대회에서 제 기록을 경신했습니다. 그때부터 자신감이 커졌습니다. 훈련은 힘들었지만, 결국 그 대회를 통해 자신감을 얻었고 기록을 다시 깰 수 있다는 생각도 들었습니다.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: "I don't think I'm at the top. I still have a long road ahead. I will do my best. I see I'm at the beginning.",
    ko: '제가 정상에 올랐다고 생각하지 않습니다. 아직 갈 길이 멉니다. 최선을 다하겠습니다. 이제 시작이라고 생각합니다.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: 'I will continue training. But I think Phelps will also do his training. So, I should try twice hard as him.',
    ko: '저도 계속 훈련하겠지만 펠프스도 훈련할 겁니다. 그러니 저는 그보다 두 배 더 노력해야 합니다.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: 'I tell myself I need to do this to enhance my capacity.',
    ko: '힘들 때면 내 능력을 키우려면 이 과정을 해내야 한다고 스스로에게 말합니다.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: "Thank you for saying that, but I don't think I deserve it. I need to work harder to fit the bill.",
    ko: '그렇게 말씀해 주셔서 감사하지만 아직 그런 평가를 받을 자격은 없다고 생각합니다. 그 이름에 걸맞으려면 더 열심히 해야 합니다.',
  },
  {
    ref: 'The Korea Times, 2008-08-13 — https://www.koreatimes.co.kr/sports/20080813/park-tae-hwan-sets-eye-on-next-olympics',
    en: 'Basically, all the training was tough. The test for breaking my previous record was particularly tough. But with my training partners, I was able to achieve this good record.',
    ko: '훈련은 전부 힘들었습니다. 특히 개인 기록 경신을 위한 테스트가 어려웠습니다. 그래도 훈련 파트너들과 함께했기에 좋은 기록을 낼 수 있었습니다.',
  },
  {
    ref: '동아일보, 2011-07-27 — https://www.donga.com/news/amp/all/20110727/39129177/9',
    en: 'This competition showed me what I was lacking. I need to build on that realization through training. My starts and turns were lacking, and my race management also needed work. I have to prepare so I do not make those mistakes in competition.',
    ko: '뭐가 부족한지 깨달음을 준 대회였다. 그 깨달음을 바탕으로 앞으로 훈련을 통해 준비해 나가야 할 것이다. 스타트와 턴도 부족했고, 레이스 운영에서도 미흡한 점이 있었다. 실전에서는 실수하지 않도록 준비해야 한다.',
  },
  {
    ref: '동아일보, 2011-07-27 — https://www.donga.com/news/amp/all/20110727/39129177/9',
    en: 'I am deeply disappointed about the 200-meter freestyle. But I have no regrets. I did my best.',
    ko: '자유형 200ｍ가 아쉬움이 많이 남는다. 하지만 후회는 없다. 최선을 다했다.',
  },
  {
    ref: '동아일보, 2011-07-27 — https://www.donga.com/news/amp/all/20110727/39129177/9',
    en: 'The result fell somewhat short, but it will become a good foundation for my future training.',
    ko: '기록은 다소 미흡한 부분이 있지만 앞으로의 훈련에 좋은 발판이 될 것이다.',
  },
  {
    ref: '동아일보, 2011-07-27 — https://www.donga.com/news/amp/all/20110727/39129177/9',
    en: 'If I train diligently day after day, I will be able to perform better in the 400-meter freestyle than I did here. What matters is training hard.',
    ko: '하루하루 성실히 훈련하다 보면 자유형 400ｍ에서도 이번 대회에서보다 더 나은 모습을 보여줄 수 있을 것이다. 열심히 훈련하는 것이 중요하다.',
  },
  {
    ref: 'Yonhap News Agency, 2013-04-04 — https://en.yna.co.kr/view/AEN20130403011100315',
    en: 'I became more determined to show people I can still swim. I think there is plenty of time for me to improve.',
    ko: '제가 아직 수영할 수 있다는 것을 보여주겠다는 의지가 더 강해졌습니다. 발전할 시간은 충분히 남아 있다고 생각합니다.',
  },
  {
    ref: 'Yonhap News Agency, 2013-04-04 — https://en.yna.co.kr/view/AEN20130403011100315',
    en: 'I think it really drove me hard and motivated me to work even more. It has been a good opportunity to push myself.',
    ko: '그 일이 저를 더 몰아붙였고 더 노력하게 만들었다고 생각합니다. 스스로를 한계까지 밀어볼 좋은 기회였습니다.',
  },
  {
    ref: 'Yonhap News Agency, 2016-04-28 — https://en.yna.co.kr/view/AEN20160428004451315',
    en: "If I'm given the chance to compete at the Olympics, I'm confident I can win in a fight against myself. I think any medal will follow if I can beat my own record.",
    ko: '올림픽에 출전할 기회가 주어진다면 자신과의 싸움에서 이길 자신이 있습니다. 제 기록을 넘어선다면 메달은 따라올 것이라고 생각합니다.',
  },
  {
    ref: 'OSEN, 2016-04-28 — https://www.osen.co.kr/article/G1110404199',
    en: 'The most important thing is to seize an opportunity when it comes. Only those who are prepared can take it. I am always ready.',
    ko: '기회가 주어지면 잡는 게 제일 중요하다. 기회가 왔을 때 준비가 되어 있는 사람만이 잡을 수 있다. 난 항상 준비가 되어 있다.',
  },
  {
    ref: 'OSEN, 2016-04-28 — https://www.osen.co.kr/article/G1110404199',
    en: 'I could endure the training, but mentally I kept feeling weighed down. Even so, when I thought about what I had to do, I felt it was my duty to show people a good race at this meet. That helped me endure and overcome it.',
    ko: '훈련은 참아낼 수 있지만 심리적으로 자꾸 억눌렸던 것 같다. 그럼에도 불구하고 꼭 해야만 하는 것이 무엇인지 생각했을 때 이번 대회를 통해 국민들께 좋은 경기를 보여드리는 게 도리인 것 같았다. 덕분에 잘 참아내고 이겨낼 수 있었다.',
  },
  {
    ref: 'The Korea Times, 2016-08-07 — https://www.koreatimes.co.kr/sports/20160807/rio-2016-park-tae-hwan-eliminated-in-400-meter-freestyle',
    en: 'I am embarrassed to be giving an interview. I am not even going to the final at the Olympics, and it has not hit me yet. I am sorry to fans back home.',
    ko: '인터뷰를 하는 것조차 부끄럽습니다. 올림픽 결승에도 진출하지 못했다는 사실이 아직 실감 나지 않습니다. 국내 팬들께 죄송합니다.',
  },
  {
    ref: '스포츠조선, 2016-08-10 — https://www.sportschosun.com/sports-news/2016-08-10/201608110100103200007625',
    en: 'This was the first time I became angry during a race. It made my hunger for swimming even stronger.',
    ko: '레이스 도중 화가 난 건 이번이 처음이다. 수영에 대한 갈증이 더 강해졌다.',
  },
  {
    ref: '경향신문, 2016-08-10 — https://www.khan.co.kr/article/201608102109005/amp',
    en: 'I do not want to end my swimming career with this much regret. I want to leave with a smile.',
    ko: '이렇게 많은 아쉬움을 남기고 수영 선수 생활을 끝내고 싶지는 않다. 웃으면서 떠나고 싶다.',
  },
  {
    ref: '경향신문, 2016-08-10 — https://www.khan.co.kr/article/201608102109005/amp',
    en: 'If I decide to compete at the Tokyo Olympics, I do not want to prepare the way I did this time. I want to prepare properly, return in good form, and make a real contribution to the Korean team.',
    ko: '내가 도쿄 올림픽에 나가겠다는 생각이 든다면 그때부터는 이번처럼 준비하고 싶지는 않다. 잘 준비해서 좋은 기량으로 대한민국 선수단에 반드시 도움이 되고 싶다.',
  },
  {
    ref: '동아일보, 2011-07-27 — https://www.donga.com/news/amp/all/20110727/39129177/9',
    en: 'I want to break the world record before my swimming career ends. I kept setting new split records in training and wanted to break it at this meet as well. This was a valuable experience on the road to London. I will work to break it there.',
    ko: '수영 인생을 끝내기 전에 꼭 깨고 싶은 마음이다. 훈련 때 구간 기록에서는 계속 신기록을 냈었다. 이번 대회에서도 깨고 싶었다. 런던으로 가는 과정에서 좋은 경험을 했다. 런던에서 깰 수 있도록 하겠다.',
  },
  {
    ref: 'Korea JoongAng Daily, 2017-01-24 — https://koreajoongangdaily.joins.com/2017/01/24/Baseball/Park-Taehwan-holds-years-first-open-training/3029065.html',
    en: 'I want to set a new personal best within two years. I also want to challenge myself to break the world record.',
    ko: '2년 안에 새로운 개인 최고기록을 세우고 싶습니다. 세계기록 경신에도 도전하고 싶습니다.',
  },
  {
    ref: 'Korea JoongAng Daily, 2017-01-24 — https://koreajoongangdaily.joins.com/2017/01/24/Baseball/Park-Taehwan-holds-years-first-open-training/3029065.html',
    en: "It's more of a mental issue than an age thing.",
    ko: '나이의 문제라기보다 마음의 문제에 가깝습니다.',
  },
  {
    ref: '스포츠조선, 2017-08-01 — https://www.sportschosun.com/sports-news/2017-08-01/201708020100010080000369',
    en: 'I raced against world-class swimmers and, unlike last year, competed alongside them in the final. I value that experience. I believe I am gradually moving upward.',
    ko: '세계적인 선수와 경기를 뛴 것이다. 지난해와 달리 결선 무대를 함께 뛰었다. 경험을 중요하게 생각한다. 점차 올라가고 있다고 생각한다.',
  },
  {
    ref: 'Instagram @park_taehwan89, 2017-07-26 — https://www.instagram.com/p/BXAs8aMFmoi/',
    en: "I'm heavy-hearted that I couldn't deliver the result you expected, but the competition isn't over yet. I'll do my best until the very end.",
    ko: '기대해주신 만큼 좋은 결과를 전해드리지 못해 마음이 무겁지만..아직 대회가 끝나지 않았으니 마지막까지 최선을 다하고 돌아가겠습니다.',
  },
  {
    ref: 'Instagram @park_taehwan89, 2017-07-27 — https://www.instagram.com/p/BXEADoxl8GH/',
    en: 'It is an honor to compete at such a great venue, and I will give my best until the final race.',
    ko: '좋은 곳에서 시합을 할 수 있어 영광이고 마지막까지 최선을 다해서 시합에 임하도록 하겠습니다',
  },
  {
    ref: 'Instagram @park_taehwan89, 2017-07-28 — https://www.instagram.com/p/BXGlL6hl2bN/',
    en: 'Today, Tomorrow or whenever I will always aim to move forward.',
    ko: '언제나 그랬듯이 오늘도 내일도 나아간다',
  },
  {
    ref: 'Instagram @park_taehwan89, 2018-06-03 — https://www.instagram.com/p/Bji5pC3hvAe/',
    en: 'Training right after a 14 hour flight.',
    ko: '14시간 비행. 도착하자마자 입수.',
  },
  {
    ref: 'Instagram @park_taehwan89, 2024-08-05 — https://www.instagram.com/p/C-SmnHOoDJf/',
    en: 'It was my first on-site commentary experience, and I became keenly aware of where I still fell short. Paris was a major learning experience, and I will keep working to show you a better side of myself.',
    ko: '여러가지로 부족한 부분도 많이 느껴졌던 저의 첫 현장해설이였고 큰경험이 된 파리올림픽이였습니다. 저도 앞으로 더 좋은모습 보여줄 수 있도록 노력할게요.',
  },
  {
    ref: 'Instagram @park_taehwan89, 2023-10-17 — https://www.instagram.com/p/CyfBqURS0Cw/',
    en: 'I will always support your future, work to help you shine, and stand by you.',
    ko: '너희들의 앞날을 항상 응원하고 빛이 날 수 있게 노력하고 지켜줄게💫',
  },
  {
    ref: 'Instagram @park_taehwan89, 2023-10-01 — https://www.instagram.com/p/Cx15BMLSkK9/',
    en: 'Thank you for loving and supporting Korean swimming.',
    ko: '대한민국 수영 사랑해주셔서 고맙습니다💙',
  },
  {
    ref: 'Instagram @park_taehwan89, 2023-09-28 — https://www.instagram.com/p/Cxt0wCwSCMZ/',
    en: "The outstanding performances of Korea's swimmers gave me a truly wonderful birthday present.",
    ko: '대한민국 수영선수들의 큰활약에 정말 멋진 생일선물을 받았네요🤩',
  },
  {
    ref: 'Instagram @park_taehwan89, 2026-03-07 — https://www.instagram.com/p/DVlK6pXkfhx/',
    en: 'Yongin FC represents the same desperation and elation as an Olympic gold medal.',
    ko: '용인FC는 [올림픽금메달과 같은 간절함, 환희]다.',
  },
  {
    ref: 'Instagram @park_taehwan89, 2022-05-01 — https://www.instagram.com/p/CdAZKEer86t/',
    en: 'One small action of mine can help protect the ocean and marine animals.',
    ko: '나의 작은 행동 하나가 바다와 해양동물들을 지킬 수 있습니다💙',
  },
  {
    ref: 'PLUS TV, 2026-06-11, 00:08 — https://www.youtube.com/watch?v=2q1CG0-XHZk&t=8s',
    en: 'I think I was always competing against myself.',
    ko: '경쟁은 항상 제 자신과 했었던 것 같아요.',
  },
  {
    ref: 'KBS Entertain, 2025-06-13, 01:39 — https://www.youtube.com/watch?v=O7Doi-l8b-Q&t=99s',
    en: 'I decided I absolutely had to do everything I could.',
    ko: '할 수 있는 만큼은 내가 무조건 해야 되겠다.',
  },
  {
    ref: '대한체육회TV, 2018-10-19, 00:46 — https://www.youtube.com/watch?v=tEQjEFpb3fQ&t=46s',
    en: 'Rather than focusing on the time, I think I went in intending to enjoy the race.',
    ko: '기록적인 것보다는 경기를 즐기자라는 생각에서 임했던 것 같아요.',
  },
  {
    ref: 'SBS 뉴스, 2017-02-16, 00:51 — https://www.youtube.com/watch?v=6vsL1WU6Tnw&t=51s',
    en: 'My biggest goal is to build up my pace while staying healthy and injury-free.',
    ko: '부상 없이 건강하게 페이스 올리는 게 가장 큰 목표고요.',
  },
  {
    ref: 'SBS 뉴스, 2016-12-19, 00:37 — https://www.youtube.com/watch?v=3Db6EJoKfYI&t=37s',
    en: 'There were good times and bad, but I feel I am learning a great deal.',
    ko: '좋은 일도 있었고 안 좋은 일도 있었지만… 참 많은 것을 배워 나가는 것 같아요.',
  },
  {
    ref: 'SBS VIDEOMUG, 2016-07-18, 02:12 — https://www.youtube.com/watch?v=MDy8_UehA7k&t=132s',
    en: 'More than a medal, I hope what I have trained for comes through.',
    ko: '메달보다는 지금 제가 훈련해왔던 게 잘 나오길 바라고 있어요.',
  },
  {
    ref: 'KBS News, 2016-08-01, 00:36 — https://www.youtube.com/watch?v=6eKp84uOe5g&t=36s',
    en: 'I finished my final training well and came back healthy, without any problems.',
    ko: '마무리 훈련 잘했고요. 뭐 아픈 데 없이 탈 없이 잘 하고 돌아왔어요.',
  },
  {
    ref: '동아닷컴, 2012-07-30, 01:31 — https://www.youtube.com/watch?v=nA495wq56dY&t=91s',
    en: 'Across all three events, my biggest goal is to beat my personal best, even by 0.1 seconds.',
    ko: '세 종목 다 좀 공통점은 제 최고 기록을 0.1초라도 깨는 게 제일 큰 목표고요.',
  },
  {
    ref: 'Y-STAR, 2012-06-11, 00:31 — https://www.youtube.com/watch?v=ww-1JH7vrDQ&t=31s',
    en: 'More than the gold medal, what I am aiming for now is a world record.',
    ko: '금메달보다도 제가 지금 목표하는 것이 세계 신기록이기 때문에…',
  },
  {
    ref: 'SBS Olympic, 2012-08-06, 00:39 — https://www.youtube.com/watch?v=JPqKc1o4Hxo&t=39s',
    en: 'It was my first time reaching a 1,500-meter final at an international meet.',
    ko: '1500m 결승 무대에 오른 게 제가 인터내셔널 대회에서는 처음이에요.',
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sameMined(value: unknown, expected: MinedQuote[]): boolean {
  if (!Array.isArray(value) || value.length !== expected.length) return false
  return value.every((item, index) => {
    if (!isRecord(item)) return false
    return item.ref === expected[index].ref
      && item.en === expected[index].en
      && item.ko === expected[index].ko
  })
}

async function assertNotUploaded() {
  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  if (Object.keys(lineup[EPISODE]?.uploads ?? {}).length) {
    throw new Error(`${EPISODE}: 유튜브 업로드 이력 있음 — 변경 금지`)
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (MINED.length !== 44) throw new Error(`직접 발언 수 불일치: ${MINED.length}/44`)
  await assertNotUploaded()

  const { data: episode, error: episodeError } = await db
    .from('faction_episodes')
    .select('id, folder')
    .eq('folder', EPISODE)
    .single()
  if (episodeError) throw new Error(`에피소드 조회 실패: ${episodeError.message}`)

  const { data: groups, error: groupError } = await db
    .from('faction_groups')
    .select('id')
    .eq('episode_id', episode.id)
  if (groupError) throw new Error(`세력 조회 실패: ${groupError.message}`)
  const groupIds = (groups ?? []).map(row => row.id as string)

  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters')
    .select('id')
    .in('group_id', groupIds)
  if (clusterError) throw new Error(`클러스터 조회 실패: ${clusterError.message}`)
  const clusterIds = (clusters ?? []).map(row => row.id as string)

  const { data: people, error: peopleError } = await db
    .from('faction_people')
    .select('id, name, quote, quote_en, quote_chunks, quote_en_chunks, quote_origin, mined')
    .in('cluster_id', clusterIds)
    .eq('name', PERSON)
  if (peopleError) throw new Error(`인물 조회 실패: ${peopleError.message}`)
  if ((people ?? []).length !== 1) throw new Error(`${PERSON}: 인물 ${(people ?? []).length}건`)

  const person = people![0]
  const current = isRecord(person.mined) ? person.mined : {}
  const quoteAlreadyDone = person.quote === NEXT_QUOTE
    && person.quote_en === NEXT_QUOTE_EN
    && JSON.stringify(person.quote_chunks) === JSON.stringify(NEXT_QUOTE_CHUNKS)
    && JSON.stringify(person.quote_en_chunks) === JSON.stringify(NEXT_QUOTE_EN_CHUNKS)
    && person.quote_origin === NEXT_ORIGIN
  if (sameMined(current.minedQuotes, MINED) && quoteAlreadyDone) {
    console.log(`SKIP ${EPISODE}/${PERSON}: 대사 교정·minedQuotes ${MINED.length}건 이미 일치`)
    return
  }
  if (!quoteAlreadyDone && (person.quote !== CURRENT_QUOTE || person.quote_en !== CURRENT_QUOTE_EN)) {
    throw new Error(`${PERSON}: 기존 대사가 예상과 달라 자동 교정 중단`)
  }

  console.log(`PLAN ${EPISODE}/${PERSON}: 대사=${quoteAlreadyDone ? '유지' : '원문 복원'} · minedQuotes ${Array.isArray(current.minedQuotes) ? current.minedQuotes.length : 0} → ${MINED.length}`)
  if (!apply) {
    console.log('DRY-RUN DB 쓰기 0건')
    return
  }

  const nextMined = { ...current, minedQuotes: MINED }
  const { data: changed, error: updateError } = await db
    .from('faction_people')
    .update({
      quote: NEXT_QUOTE,
      quote_en: NEXT_QUOTE_EN,
      quote_chunks: NEXT_QUOTE_CHUNKS,
      quote_en_chunks: NEXT_QUOTE_EN_CHUNKS,
      quote_origin: NEXT_ORIGIN,
      mined: nextMined,
    })
    .eq('id', person.id)
    .select('id, quote, quote_en, quote_chunks, quote_en_chunks, quote_origin, mined')
    .single()
  if (updateError) throw new Error(`mined 갱신 실패: ${updateError.message}`)
  const changedMined = isRecord(changed.mined) ? changed.mined.minedQuotes : null
  if (!sameMined(changedMined, MINED)) throw new Error('갱신 후 minedQuotes 검증 실패')
  if (changed.quote !== NEXT_QUOTE
    || changed.quote_en !== NEXT_QUOTE_EN
    || JSON.stringify(changed.quote_chunks) !== JSON.stringify(NEXT_QUOTE_CHUNKS)
    || JSON.stringify(changed.quote_en_chunks) !== JSON.stringify(NEXT_QUOTE_EN_CHUNKS)
    || changed.quote_origin !== NEXT_ORIGIN) {
    throw new Error('갱신 후 대사 검증 실패')
  }

  console.log(`APPLIED ${EPISODE}/${PERSON}: 대사 원문 복원 · minedQuotes ${MINED.length}건`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
