/**
 * X-Empire 고위험 대사 10개 배치를 실제 채굴 발언 중심으로 교정한다.
 *
 * 대상:
 * - 잘린 문장 / 한·영 의미 불일치: 조 게비아, 바이바브 타네자
 * - 평전·역할을 1인칭 고백으로 바꾼 합성 대사: 삼총사 3명
 * - 출처가 느슨한 합성·사건 재구성: 알렉스 스파이로, 안토니오 그라시아스 2배치
 * - 실제 발언 뒤에 투자자 설정을 창작해 붙인 합성 대사: 존 허링
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/refine-x-empire-dialogues.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/refine-x-empire-dialogues.ts --apply
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

type Target = {
  name: string
  group: string
  cluster: string
  expectedQuote: string
  expectedQuoteEn: string
  quoteChunks: string[]
  quoteEnChunks: string[]
  quoteOrigin: string
  mined?: { ref: string; en: string; ko: string }[]
}

type PersonRow = {
  id: string
  cluster_id: string
  name: string
  quote: string | null
  quote_en: string | null
  quote_origin: string | null
  quote_chunks: unknown
  quote_en_chunks: unknown
  mined: unknown
}

function joined(chunks: string[]): string {
  return chunks.join(' ')
}

function compact(value: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function sameMined(value: unknown, expected: { ref: string; en: string; ko: string }[]): boolean {
  if (!Array.isArray(value) || value.length !== expected.length) return false
  return value.every((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    const row = item as Record<string, unknown>
    return row.ref === expected[index].ref
      && row.en === expected[index].en
      && row.ko === expected[index].ko
  })
}

const TARGETS: Target[] = [
  {
    name: '바이바브 타네자',
    group: 'Tesla',
    cluster: '경영진',
    expectedQuote: '우리는 변화를 꿈꾸지 않습니다. 새로운 시대를 준비합니다.',
    expectedQuoteEn: 'We are not turning the next page of this company - we open a new book. Until shareholders earn real returns, even the chief executive takes no share. That is the promise.',
    quoteChunks: [
      '우리는 이 회사의 여정에서 다음 장이 아니라, 새 책 한 권을 시작합니다.',
      '때로는 벅차지만 테슬라 역사상 가장 흥미진진한 변화가 될 겁니다.',
    ],
    quoteEnChunks: [
      "We are starting not the next chapter, but a new book in this company's journey.",
      "At times it feels daunting, but it will be the most exciting change in Tesla's history.",
    ],
    quoteOrigin: 'https://www.insidermonkey.com/blog/tesla-inc-nasdaqtsla-q4-2025-earnings-call-transcript-1684191/ — Tesla 2025 Q4 earnings call, 2026-01-28. “Starting not the next chapter, but a new book...”와 “At times it feels daunting...”를 영상 호흡에 맞게 연결.',
  },
  {
    name: '조 게비아',
    group: 'Tesla',
    cluster: '이사회',
    expectedQuote: '신뢰는 만들어지는 것이 아닙니다. 고객이 안심할 근거를 설계하는 것입니다. 근거가 확인되면 경계심은 믿음으로',
    expectedQuoteEn: 'Trust can be designed. Design is nothing but standing in the customer\'s place. Even wariness of strangers can be crossed if you build it right.',
    quoteChunks: [
      '우리는 회사 전체를 걸었습니다.',
      '제대로 된 디자인만 있다면 사람들이 낯선 이를 향한 경계심을 넘어설 거라는 희망이었습니다.',
    ],
    quoteEnChunks: [
      'We bet our whole company on the hope that, with the right design,',
      'people would be willing to overcome the stranger-danger bias.',
    ],
    quoteOrigin: 'https://www.ted.com/talks/joe_gebbia_how_airbnb_designs_for_trust/transcript — TED, 2016. 원문 한 문장을 두 호흡으로 분할.',
  },
  {
    name: '제임스 머스크',
    group: 'X',
    cluster: '삼총사',
    expectedQuote: '우리는 코드 기록부터 열었습니다. 누가 무엇을 얼마나 남겼는지 거기 다 있었습니다. 한 사람씩 만나 묻지는 않았습니다. 그럴 시간이 없었습니다. 명단은 그렇게 만들어졌습니다.',
    expectedQuoteEn: 'We opened the code records first. Who had shipped what, and how much of it, was all in there. We did not sit down with anyone and ask. There was no time for that. That is how the list got made.',
    quoteChunks: [
      '플랫폼 전반의 도달 문제를 조사 중입니다.',
      'X에서 추천 시스템을 함께 만듭시다.',
    ],
    quoteEnChunks: [
      'We are debugging an issue with engagement across the platform.',
      'Come help build recommendation systems at X.',
    ],
    quoteOrigin: 'https://www.platformer.news/yes-elon-musk-created-a-special-system/ (2023-02-13 긴급 호출) + https://x.com/jmusk (2024-12-18 채용 게시물). 두 직접 발언을 연결.',
  },
  {
    name: '앤드루 머스크',
    group: 'X',
    cluster: '삼총사',
    expectedQuote: '형과 저는 같은 방에서 이름을 넘겼습니다. 수천 개였습니다. 그 하나하나가 누군가의 몇 년이라는 걸 몰랐던 것은 아닙니다. 다만 우리 앞에 놓인 것은 화면에 뜬 몇 줄이었습니다.',
    expectedQuoteEn: 'My brother and I sat in the same room turning over names. Thousands of them. It is not that we did not know each one was somebody\'s years. It is that what lay in front of us was a few lines on a screen.',
    quoteChunks: [
      'X는 모든 것을 담는 앱을 만들고 있고, 스포츠도 그 일부가 될 겁니다.',
      '새 제품 개발 기반인 제트퓨얼 덕분에 우리는 번개처럼 움직입니다.',
    ],
    quoteEnChunks: [
      'X is building the everything app, and sports is going to be a part of it.',
      'The sports experience is being built on our new product development infrastructure, Jetfuel, which lets us move lightning fast.',
    ],
    quoteOrigin: 'https://x.com/AndrewMusk — 2024-11-19 NFL 포털·Jetfuel 공개 게시물 두 문장을 영상 호흡에 맞게 연결.',
  },
  {
    name: '로스 노딘',
    group: 'X',
    cluster: '삼총사',
    expectedQuote: '그 방에서 머스크라는 성을 쓰지 않는 사람은 저 하나였습니다. 그래서 저는 더 정확해야 한다고 생각했습니다. 일정이 넉넉하면 틀린 겁니다. 빠듯해야 맞습니다.',
    expectedQuoteEn: 'I was the only one in that room who did not carry the Musk name. So I told myself I had to be the exact one. If your timeline is long it\'s wrong. If it\'s tight it\'s right.',
    quoteChunks: [
      '다급함은 과소평가된 자질입니다.',
      '일정이 넉넉하면 틀린 것이고, 빠듯해야 맞습니다.',
    ],
    quoteEnChunks: [
      'A sense of urgency is an underrated quality.',
      "If your timeline is long, it's wrong. If it's tight, it's right.",
    ],
    quoteOrigin: 'https://x.com/rpoo — 본인 X 게시물 2024-01-31 “a sense of urgency...” + 2024-12-02 “if your timeline is long...” 두 직접 발언을 연결.',
  },
  {
    name: '안토니오 그라시아스',
    group: 'X',
    cluster: '인수 실행팀',
    expectedQuote: '인수 마감 당일, 4억 달러가 비어 있었습니다. 저는 트위터 쪽에 전화를 걸어 물었습니다. 지금 일론 머스크에게 안 된다고 하시는 겁니까. 돈은 그날 안에 들어왔습니다.',
    expectedQuoteEn: 'On closing day we were four hundred million short. I called the other side and asked them: are you saying no to Elon Musk? The money arrived that same day.',
    quoteChunks: [
      '트위터보다 엉망으로 굴러가는 회사는 본 적이 없습니다.',
      '충격적으로 나빴습니다.',
      'X의 트위터 인수는 역사상 가장 큰 기업 회생입니다.',
    ],
    quoteEnChunks: [
      'I have never seen a worse run company than Twitter.',
      'It was shockingly bad.',
      "X's takeover of Twitter is the biggest business turnaround of all time.",
    ],
    quoteOrigin: 'https://x.com/AntonioGracias — 2025-02-09 본인 게시물 직접 발언.',
  },
  {
    name: '알렉스 스파이로',
    group: '왕가의 궁정',
    cluster: '법률·재무',
    expectedQuote: '진실은 결국 나옵니다. 법정에서 공정한 기회만 있으면 됩니다. 저는 그 기회를 지키는 변호사입니다.',
    expectedQuoteEn: 'The truth comes out in the end. A fair shot in court is enough. I am the lawyer who guards that shot.',
    quoteChunks: [
      '다들 자기 의견이 있게 마련입니다.',
      '그런 말에 너무 흔들리면 싸울 수도, 누군가를 대변할 수도 없습니다.',
    ],
    quoteEnChunks: [
      "Listen, everyone's going to have their opinion.",
      "You can't be a fighter and an advocate if any of it moves you too much.",
    ],
    quoteOrigin: 'Original Jurisdiction, 2022 — 여론에 흔들리지 않는 법에 관한 인터뷰 직접 발언. 채굴 뱅크 원문·번역 대조.',
  },
  {
    name: '안토니오 그라시아스',
    group: '왕가의 궁정',
    cluster: '투자자',
    expectedQuote: '더 나은 세상을 만들려면 도덕적 용기가 필요합니다. 많은 사람이 AI는 재앙이라고 말합니다. 저는 그 말이 현실이 되지 않게 일합니다.',
    expectedQuoteEn: 'To build a better world you need moral courage. Many say AI is a catastrophe. I work so that claim never becomes real.',
    quoteChunks: [
      '최고경영자는 여건이 좋지 않을 때도 아주 어려운 결정을 내려야 합니다.',
      '훌륭한 리더는 고통을 먼저 떠안습니다.',
    ],
    quoteEnChunks: [
      'CEOs need to make very hard decisions in suboptimal circumstances.',
      'Great leaders take the pain first.',
    ],
    quoteOrigin: 'https://x.com/AntonioGracias — 2020-03-28 경영관에 관한 본인 게시물 직접 발언.',
  },
  {
    name: '앤서니 암스트롱',
    group: '왕가의 궁정',
    cluster: '법률·재무',
    expectedQuote: '문밖으로 새어 나가는 돈이 너무 많습니다. 수십 년 동안 사실상 한쪽으로만 돌아가는 톱니바퀴였습니다. 하지만 이건 그곳 직원들을 탓하는 이야기가 아닙니다.',
    expectedQuoteEn: "There's a lot of money sloshing out the door. It's really a one-way ratchet over decades. This is not about the employees there.",
    quoteChunks: [
      '파괴적 기술에 의해 뒤흔들리느니 그 기술을 인수하는 편이 낫습니다.',
      '삽에서 토큰까지, 완전한 수직 통합입니다.',
    ],
    quoteEnChunks: [
      "It's better to acquire disruptive technology than to be disrupted by that technology.",
      'Shovels to tokens. Full vertical integration.',
    ],
    quoteOrigin: 'https://www.reachma.com/newsletter_pages/Non-tech_companies_fostering_Technology_acquisitions/download_report (GMAP, 2020-10) + https://x.com/a2xai/status/2022103119694639457 (2026-02-13). 기술 M&A 직업관과 xAI 수직 통합에 관한 본인 직접 발언.',
    mined: [
      {
        ref: 'https://www.youtube.com/watch?v=l7kQNwJ4H_w&t=964s — Fox News DOGE interview, 2025-03-27, 16:04',
        en: "There's a lot of money sloshing out the door.",
        ko: '문밖으로 새어 나가는 돈이 너무 많습니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=l7kQNwJ4H_w&t=973s — Fox News DOGE interview, 2025-03-27, 16:13',
        en: "It's really a one-way ratchet over decades.",
        ko: '수십 년 동안 사실상 한쪽으로만 돌아가는 톱니바퀴였습니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=l7kQNwJ4H_w&t=1006s — Fox News DOGE interview, 2025-03-27, 16:46',
        en: 'This is not about the employees there.',
        ko: '이건 그곳 직원들을 탓하는 이야기가 아닙니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2061884370013884685 — 2026-06-02 UTC',
        en: 'Nate and Justin were extremely high impact team mates. Excited to back them in the launch of @Special !!',
        ko: '네이트와 저스틴은 대단히 큰 성과를 낸 팀 동료들이었습니다. @Special의 출범을 후원하게 되어 기쁩니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2037796566606753953 — 2026-03-28 UTC',
        en: '@BrentM_SpaceX is the definition of hardcore. Hi IQ, hi EQ, relentless work ethic. If you have these traits, you should join our team.',
        ko: '@BrentM_SpaceX는 하드코어의 정의입니다. 높은 IQ, 높은 EQ, 끈질긴 업무 태도. 이런 자질을 갖췄다면 우리 팀에 합류해야 합니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2035476133244715440 — 2026-03-21 UTC',
        en: 'New survey finds Politico wrote the story before conducting the new survey.',
        ko: '새 설문은 Politico가 설문을 실시하기도 전에 기사를 써 놓았음을 보여줍니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2034734708752609545 — 2026-03-19 UTC',
        en: 'Blue states used to tax and sanctify the rich—rewarding them with moral vanity for funding big government. Now they tax and vilify them—treating wealth itself as a sin. No surprise the donors become defectors. They won’t be coming back.',
        ko: '민주당 주들은 예전에는 부자에게 세금을 매기면서도 큰 정부에 돈을 댄 대가로 도덕적 허영을 안겼습니다. 이제는 세금을 매기면서 부 자체를 죄악처럼 다룹니다. 기부자들이 이탈하는 건 놀랄 일도 아닙니다. 그들은 돌아오지 않을 겁니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2031226755986632958 — 2026-03-10 UTC',
        en: 'Three is not just good, it’s prime!',
        ko: '3은 그저 좋은 숫자가 아니라 소수입니다!',
      },
      {
        ref: 'https://x.com/a2xai/status/2031226599253872821 — 2026-03-10 UTC',
        en: 'An interview with Wesley Mouch…',
        ko: '웨슬리 마우치와의 인터뷰라…',
      },
      {
        ref: 'https://x.com/a2xai/status/2029344532698152996 — 2026-03-04 UTC',
        en: 'Building fast, building responsibly. Buying power when it’s available and providing power when it’s not.',
        ko: '빠르게 짓되 책임 있게 짓습니다. 전력이 있을 때는 사들이고, 없을 때는 우리가 공급합니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2027210996704854170 — 2026-02-27 UTC',
        en: 'Progressives against progress.',
        ko: '진보주의자들이 진보를 막습니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2025823228669865987 — 2026-02-23 UTC',
        en: 'Becoming an American citizen was one of the proudest days of my life. I cherish this country and all it stands for.',
        ko: '미국 시민이 된 날은 제 인생에서 가장 자랑스러운 날 가운데 하나였습니다. 저는 이 나라와 이 나라가 상징하는 모든 것을 소중히 여깁니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2025685732510335157 — 2026-02-22 UTC',
        en: 'Easy decision if you prefer AI to inform you, not indoctrinate you.',
        ko: 'AI가 당신을 세뇌하는 대신 정보를 주길 원한다면 선택은 간단합니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2025361003761045916 — 2026-02-22 UTC',
        en: 'America is lucky to have @skupor leading OPM. This is a little-understood but critical government agency. The policy decisions coming out of OPM have broad and long-lasting implications on how our federal government runs on how the civil service actually serves taxpayers.',
        ko: '미국은 @skupor가 OPM을 이끄는 것을 행운으로 여겨야 합니다. OPM은 잘 알려지지 않았지만 매우 중요한 정부 기관입니다. OPM의 정책 결정은 연방정부가 움직이는 방식과 공무원 조직이 납세자에게 봉사하는 방식에 광범위하고 장기적인 영향을 미칩니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2023777778337018047 — 2026-02-17 UTC',
        en: 'Hardcore winners.',
        ko: '끝까지 밀어붙이는 승자들.',
      },
      {
        ref: 'https://x.com/a2xai/status/2022103119694639457 — 2026-02-13 UTC',
        en: 'Shovels to Tokens — full vertical integration.',
        ko: '삽에서 토큰까지, 완전한 수직 통합.',
      },
      {
        ref: 'https://x.com/a2xai/status/2021722988312416746 — 2026-02-11 UTC',
        en: 'Team meeting yesterday. There is nowhere else on the planet (universe?) where you can work with people of this quality on a mission this bold.',
        ko: '어제 팀 회의를 했습니다. 이토록 뛰어난 사람들과 이토록 대담한 임무를 수행할 수 있는 곳은 이 행성 어디에도, 어쩌면 우주 어디에도 없습니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2021721727936737467 — 2026-02-11 UTC',
        en: 'Once you experience Starlink on a flight, you will start booking travel based on its availability.',
        ko: '비행기에서 스타링크를 한 번 경험하면, 그다음부터는 스타링크 제공 여부를 기준으로 여행편을 예약하게 됩니다.',
      },
      {
        ref: 'https://x.com/a2xai/status/2018482614617997758 — 2026-02-03 UTC',
        en: 'Now the real AI race begins.',
        ko: '이제 진짜 AI 경쟁이 시작됩니다.',
      },
      {
        ref: 'https://shareholderadvisory.com/wp-content/uploads/Dell.pdf — The Wall Street Journal, 2013-09-11',
        en: 'Invoking a voting standard that is higher than Delaware requires is something boards are going to be very careful about in the future.',
        ko: '델라웨어법이 요구하는 수준보다 더 높은 의결 기준을 적용하는 일은 앞으로 이사회가 매우 신중하게 접근할 사안입니다.',
      },
      {
        ref: 'https://www.reachma.com/newsletter_pages/Non-tech_companies_fostering_Technology_acquisitions/download_report — GMAP, 2020-10',
        en: 'It’s better to acquire disruptive technology than to be disrupted by that technology.',
        ko: '파괴적 기술에 의해 뒤흔들리느니 그 기술을 인수하는 편이 낫습니다.',
      },
      {
        ref: 'https://keyt.com/politics/cnn-us-politics/2025/03/03/its-the-shadow-opm-how-doge-is-using-a-once-obscure-federal-agency-as-ground-zero-for-its-plans-to-shrink-government/ — CNN republication, 2025-03-03',
        en: 'OPM is looked at as a model. The goal is to reduce the footprint of the federal workforce.',
        ko: 'OPM은 하나의 본보기로 여겨지고 있습니다. 목표는 연방 인력의 규모를 줄이는 것입니다.',
      },
      {
        ref: 'https://www.notus.org/whitehouse/elon-musk-doge-team-interview — NOTUS, 2025-03-27',
        en: 'There’s a very heavy focus on being generous, being caring, being compassionate and treating everyone with dignity and respect.',
        ko: '관대함과 배려, 연민을 중시하고 모두를 존엄과 존중으로 대하는 데 아주 큰 초점을 두고 있습니다.',
      },
      {
        ref: 'https://www.yahoo.com/news/doge-team-defends-federal-layoffs-133444986.html — The Hill/Yahoo, 2025-03-28',
        en: 'There’s voluntary early retirement. There’s voluntary separation payments. We put in place deferred resignation, the eight-month severance program.',
        ko: '자발적 조기퇴직과 자발적 퇴직 보상금이 있습니다. 우리는 8개월 보상 방식의 유예 사직 프로그램을 마련했습니다.',
      },
      {
        ref: 'https://mississippitoday.org/2026/01/08/mississippi-marketplace-xai-elon-musk-legislative-session-data-center/ — Mississippi Today, 2026-01-08',
        en: 'We’re going to do more. It’s in large part because of the responsiveness and cooperation, governor, from your administration.',
        ko: '우리는 더 할 겁니다. 그건 상당 부분 주지사님 행정부의 신속한 대응과 협력 덕분입니다.',
      },
      {
        ref: 'https://apnews.com/article/433691ace945708a04762b4791602f3d — Associated Press, 2026-01-08',
        en: 'the world’s largest supercomputer',
        ko: '세계에서 가장 큰 슈퍼컴퓨터',
      },
      {
        ref: 'https://www.usaskimo.org/usa-skimo-announces-anthony-armstrong-as-new-executive-director/ — USA Skimo, 2023-07-09',
        en: 'Ski Mountaineering is an incredible sport that combines both a long, rich history with unprecedented growth',
        ko: '스키 마운티니어링은 오래되고 풍부한 역사와 전례 없는 성장을 함께 품은 놀라운 스포츠입니다.',
      },
    ],
  },
  {
    name: '존 허링',
    group: '왕가의 궁정',
    cluster: '측근',
    expectedQuote: '뚫리지 않는 시스템은 없습니다. 어떻게 뚫리는지를 아는지가 갈립니다. 그 사실을 인정하는 쪽에 저는 돈을 넣고, 지킵니다.',
    expectedQuoteEn: 'No system is unbreakable. What divides us is whether we know how it breaks. I put money on the side that admits that, and I guard it.',
    quoteChunks: [
      '지금은 코드 레드 상황입니다.',
      '기술 업계와 사이버보안 공동체가 AI 기반 사이버 공격 역량의 밀려오는 파도에 신속히 맞서지 않으면, 우리는 전례 없는 위협 환경에서 살게 될 겁니다.',
    ],
    quoteEnChunks: [
      'We are currently at code red.',
      'If the technology industry and cybersecurity community collectively do not rapidly take action to meet the oncoming tidal wave of AI-driven cyber offensive capabilities, then we are going to be living in unprecedented threat environment.',
    ],
    quoteOrigin: 'https://x.com/johnhering/status/2041923425950953898 — 2026-04-08 본인 X 직접 발언. x.com 익명 본문 접근이 막혀 상태 ID 미러에서 생략 없는 원문을 대조했다.',
    mined: [
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "It's proving what's possible. Any system can be broken it's just knowing how to break it.",
        ko: '가능하다는 것을 증명하는 겁니다. 어떤 시스템도 뚫릴 수 있습니다. 어떻게 뚫는지를 아는 문제일 뿐입니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "In today's world there's really only-- two types of companies or two types of people which are those who have been hacked and realize it and those who have been hacked and haven't.",
        ko: '오늘날에는 사실 두 종류의 회사나 사람만 있습니다. 해킹당한 사실을 아는 쪽과 해킹당했지만 모르는 쪽입니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "I think that most people have not really thought about their phones as computers. And that that's really starting to shift.",
        ko: '대부분은 아직 휴대전화를 컴퓨터라고 생각해 본 적이 없습니다. 이제 그 인식이 본격적으로 바뀌기 시작했습니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "Oh absolutely. I mean, your mobile phone is effectively a supercomputer in your pocket. There's more technology in your mobile phone than was in, you know, the space craft that took man to the moon. I mean, it's-- it's really unbelievable.",
        ko: '물론입니다. 휴대전화는 사실상 주머니 속 슈퍼컴퓨터입니다. 인간을 달에 보낸 우주선보다 더 많은 기술이 그 안에 들어 있습니다. 정말 믿기 어려울 정도입니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "I don't believe it.",
        ko: '저는 그 말을 믿지 않습니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "And I have your email.",
        ko: '이제 당신의 이메일이 제게 있습니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "I installed some malware in your device that's broadcasting video of your phone.",
        ko: '당신 기기에 악성 코드를 설치했습니다. 지금 그 휴대전화의 영상이 송출되고 있습니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: "I'd say, the average person is not going to be exposed to the type of attacks we showed you today. But our goal was to show what's possible. So people can really understand if we don't address security issues, what the state of the world will be.",
        ko: '평범한 사람이 오늘 보여드린 공격에 그대로 노출될 가능성은 크지 않습니다. 하지만 우리의 목적은 무엇이 가능한지 보여주는 것이었습니다. 보안 문제를 해결하지 않으면 세상이 어떤 상태가 될지 사람들이 제대로 이해하도록 말입니다.',
      },
      {
        ref: 'https://www.cbsnews.com/news/60-minutes-hacking-your-phone/ — CBS 60 Minutes, 2016-04-17',
        en: 'We live in a world where we cannot trust the technology that we use.',
        ko: '우리는 사용하는 기술을 믿을 수 없는 세계에 살고 있습니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2041923425950953898 — 2026-04-08 UTC, status-ID mirror 대조',
        en: 'We are currently at code red. If the technology industry and cybersecurity community collectively do not rapidly take action to meet the oncoming tidal wave of AI-driven cyber offensive capabilities, then we are going to be living in unprecedented threat environment.',
        ko: '지금은 코드 레드 상황입니다. 기술 업계와 사이버보안 공동체가 AI 기반 사이버 공격 역량의 밀려오는 파도에 신속히 맞서지 않으면, 우리는 전례 없는 위협 환경에서 살게 될 겁니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/1947774048055738627 — 2025-07-22 UTC, status-ID mirror 대조',
        en: "Biggest startup lesson? Even once you've achieved significant success, leaders must stay maniacally urgent, dive into the details, and drive results obsessively.",
        ko: '가장 큰 스타트업 교훈이요? 큰 성공을 이룬 뒤에도 리더는 광적인 긴박감을 유지하고, 세부로 파고들며, 집요하게 결과를 만들어야 합니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2041281391724532138 — 2026-04-06 UTC, status-ID mirror 대조',
        en: 'conviction is action. action is truth.',
        ko: '확신은 행동입니다. 행동은 진실입니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2007845883245989916 — 2026-01-04 UTC, status-ID mirror 대조',
        en: 'This is why it is so critical to build truth seeking AI. @xai has dedicated itself to this mission.',
        ko: '그래서 진실을 추구하는 AI를 만드는 일이 그토록 중요합니다. xAI는 이 사명에 전념해 왔습니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2045346684780339637 — 2026-04-18 UTC, status-ID mirror 대조',
        en: "Max Levchin truly exemplifies the best of Silicon Valley. Immigrant. Loves America. Deeply technical. True builder. Obsessed with product. Insanely competitive. Always there to support other founders.",
        ko: '맥스 레브친은 실리콘밸리의 가장 좋은 면을 온전히 보여줍니다. 이민자. 미국을 사랑하는 사람. 기술에 깊이 뿌리내린 사람. 진짜 빌더. 제품에 집착하는 사람. 지독하게 경쟁적인 사람. 언제나 다른 창업자들을 돕는 사람.',
      },
      {
        ref: 'https://x.com/johnhering/status/1949571287468433655 — 2025-07-27 UTC, status-ID mirror 대조',
        en: "New limit is on the path to revolutionizing human longevity. One of the best teams I've ever seen. @newlimit @brian_armstrong @byersblake @jacobkimmel",
        ko: 'NewLimit은 인간 수명을 혁신하는 길 위에 있습니다. 제가 본 최고의 팀 중 하나입니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2074149049964646848 — 2026-07-06 UTC, status-ID mirror 대조',
        en: "One of the most significant philanthropic gifts in history. @Gwynne_Shotwell is accelerating the American dream by making two million American children a shareholder in @SpaceX through @InvestAmerica24",
        ko: '역사상 가장 중대한 자선 기부 가운데 하나입니다. 그윈 숏웰은 Invest America를 통해 미국 어린이 200만 명을 SpaceX 주주로 만들며 아메리칸드림을 앞당기고 있습니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2047846987484328335 — 2026-04-25 UTC, status-ID mirror 대조',
        en: 'The future is here. @SpaceX and Starship will lead us to the stars.',
        ko: '미래는 이미 와 있습니다. SpaceX와 스타십이 우리를 별들로 이끌 겁니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2019108320737657344 — 2026-02-04 UTC, status-ID mirror 대조',
        en: 'I think we are going to find that without fraud and general waste we would have $0 national debt.',
        ko: '사기와 전반적인 낭비가 없었다면 국가부채가 0달러였을 거라는 사실을 결국 확인하게 되리라 생각합니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2014482267213857153 — 2026-01-22 UTC, status-ID mirror 대조',
        en: "Huge congratulations to @mikebelshe and the @BitGo team. You are truly one the best founders I've worked with and one of the great OGs of the Bitcoin ecosystem.",
        ko: '마이크 벨시와 BitGo 팀에 큰 축하를 보냅니다. 당신은 제가 함께한 최고의 창업자 중 한 명이며 비트코인 생태계의 위대한 원로 중 한 명입니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/1954104623087673507 — 2025-08-09 UTC, status-ID mirror 대조',
        en: 'Maniacal urgency at @xai',
        ko: 'xAI의 광적인 긴박감.',
      },
      {
        ref: 'https://x.com/johnhering/status/1931099807625465964 — 2025-06-06 UTC, status-ID mirror 대조',
        en: 'Never give up.',
        ko: '절대 포기하지 마십시오.',
      },
      {
        ref: 'https://x.com/johnhering/status/2081007719083880697 — 2026-07-25 UTC, status-ID mirror 대조',
        en: 'A pinnacle of human perseverance and achievement. 🇺🇸 🚀',
        ko: '인간의 인내와 성취가 도달한 정점입니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/2071968516123853016 — 2026-06-30 UTC, status-ID mirror 대조',
        en: 'Opportunity is everywhere is America 🇺🇸',
        ko: '미국에는 어디에나 기회가 있습니다.',
      },
      {
        ref: 'https://x.com/johnhering/status/1956301028195742198 — 2025-08-15 UTC, status-ID mirror 대조',
        en: 'The great American Bitcoin mining revolution 🇺🇸 ⛏️',
        ko: '위대한 미국 비트코인 채굴 혁명.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'Now in 2015, I think that the way we think about security– and the technology behind it– will finally fundamentally change.',
        ko: '2015년에는 보안을 바라보는 방식과 그 바탕이 되는 기술이 마침내 근본적으로 바뀔 것이라고 생각합니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'As personal mobile devices are brought into the workplace and corporate mobile devices are used for personal use, enterprises will be increasingly faced with a set of complicated challenges as they strive to respect individual privacy while keeping corporate interests safe from attackers.',
        ko: '개인 모바일 기기가 업무 현장에 들어오고 회사 모바일 기기가 사적으로도 쓰이면서, 기업은 개인의 사생활을 존중하는 동시에 공격자로부터 회사의 이익을 지켜야 하는 복잡한 과제에 갈수록 더 자주 맞닥뜨리게 됩니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'That means that most employees want some level of control over the device.',
        ko: '이는 대부분의 직원이 그 기기에 대해 어느 정도의 통제권을 원한다는 뜻입니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'Multinational corporations will have a particularly tough time as each country in which they operate has unique regulations and user expectations with regard to privacy.',
        ko: '다국적 기업은 특히 어려움을 겪습니다. 사업을 운영하는 국가마다 개인정보 보호에 관한 규정과 사용자의 기대가 서로 다르기 때문입니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'We estimate that U.S. phones were an attractive target because U.S. IP addresses are like a high-profile zip code.',
        ko: '미국 휴대전화가 매력적인 표적이 된 이유는 미국 IP 주소가 유명 지역의 우편번호와 같기 때문이라고 봅니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'Today, cybercriminals remain focused on the most lucrative targets: PCs and increasingly, mobile devices.',
        ko: '사이버 범죄자들은 가장 수익성이 높은 표적, 즉 PC와 갈수록 비중이 커지는 모바일 기기에 집중하고 있습니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: "IoT and wearables are not mainstream enough yet, and won't be for another 3 to 5 years, to be significant targets for cybercriminals.",
        ko: 'IoT와 웨어러블은 아직 충분히 대중화되지 않았으며, 앞으로 3~5년 동안은 사이버 범죄자의 주요 표적이 되지 않을 것입니다.',
      },
      {
        ref: 'https://www.linkedin.com/pulse/predictions-cybersecurity-2015-john-hering — 2015-01-12, Kevin Mahaffey 공저',
        en: 'That said, connected devices need to be built with a potential threat top of mind, particularly given the amount of sensitive or personal information they have the ability to store and transmit.',
        ko: '그렇더라도 연결형 기기는 잠재적 위협을 최우선으로 염두에 두고 설계해야 합니다. 특히 이런 기기가 저장하고 전송할 수 있는 민감한 개인정보의 양을 생각하면 더욱 그렇습니다.',
      },
      {
        ref: 'https://web.archive.org/web/20150328225740/https://www.lookout.com/resources/reports/predictions — Lookout report, 2015-03-28 보존',
        en: 'Privacy concerns will head to the enterprise',
        ko: '개인정보 보호 문제는 기업 현장으로 옮겨갈 것입니다.',
      },
      {
        ref: 'https://web.archive.org/web/20150328225740/https://www.lookout.com/resources/reports/predictions — Lookout report, 2015-03-28 보존',
        en: 'Regardless of who owns the device, smartphones and tablets have become innately personal',
        ko: '기기의 소유자가 누구든 스마트폰과 태블릿은 본질적으로 개인적인 기기가 되었습니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=vPW-Z_0vNtQ&t=86s — World Economic Forum, 2012-08-28, 01:26',
        en: 'The most exciting prospect of mobility is not the technology of the devices themselves, but what it enables people to do.',
        ko: '모바일의 가장 흥미로운 가능성은 기기 기술 자체가 아니라, 그것이 사람에게 무엇을 가능하게 하느냐에 있습니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=eAXts78Csz0&t=315s — LeWeb Paris, 2012-12-05, 05:15',
        en: "My definition of a hacker is really someone who's curious about systems, how systems work.",
        ko: '제가 생각하는 해커란 시스템과 그 작동 방식을 궁금해하는 사람입니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=NN2eK3zsS-M&t=240s — Bloomberg Originals, 2012-03-23, 04:00',
        en: "When you look at security, there's not necessarily one silver bullet.",
        ko: '보안에는 모든 문제를 한 번에 해결하는 단 하나의 묘책이 있는 것이 아닙니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=FL4YrlyvONk&t=391s — TechCrunch, 2011-09-21, 06:31',
        en: 'Much of it is with respect to company building, hiring and engaging a great team.',
        ko: '그중 상당 부분은 회사를 세우고, 사람을 채용하고, 훌륭한 팀을 결집하는 일입니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=HOyBgsuhrbA&t=635s — DLD Conference, 2013-02-01, 10:35',
        en: "It's really important to be clear about why you're partnering.",
        ko: '왜 파트너십을 맺는지 분명히 하는 것이 정말 중요합니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=8dSWM8XjK9o&t=413s — New York Times Events, 2014-12-12, 06:53',
        en: 'When I look at everyone in the room, I see information.',
        ko: '이 방의 사람들을 바라보면, 제 눈에는 정보가 보입니다.',
      },
      {
        ref: 'https://www.vanityfair.com/video/watch/the-new-establishment-summit-cyber-security-experts-on-snowden-disclosures-and-privacy — Vanity Fair, 2014-10-28, 26:16',
        en: 'Anything can be broken, anything can be hacked with enough resources behind it.',
        ko: '충분한 자원을 투입하면 무엇이든 깨뜨릴 수 있고, 무엇이든 해킹할 수 있습니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=g0F8oJC-x0M&t=160s — Wall Street Journal, 2017-03-01, 02:40',
        en: 'The difference in this modern threat landscape of being secure or insecure is how quickly can you respond and patch.',
        ko: '현대의 위협 환경에서 안전과 불안을 가르는 것은 얼마나 빨리 대응하고 패치하느냐입니다.',
      },
      {
        ref: 'https://www.youtube.com/watch?v=DPjFCrnCznQ&t=274s — D: Dive Into Mobile, 2013-04-17, 04:34',
        en: 'You target a user, you spoof an email address, you put a file in place, and then you have a goal in mind.',
        ko: '사용자를 겨냥하고, 이메일 주소를 위조하고, 파일을 심은 다음, 정해 둔 목표를 수행합니다.',
      },
      {
        ref: 'https://www.mobileworldlive.com/?p=65969 — Mobile World Live, 2014-02-27',
        en: 'We bet the company on Android and iOS and that turned out to be the most important decision we made.',
        ko: '우리는 회사의 운명을 안드로이드와 iOS에 걸었습니다. 결과적으로 그것은 우리가 내린 가장 중요한 결정이 됐습니다.',
      },
      {
        ref: 'https://www.mobileworldlive.com/?p=65969 — Mobile World Live, 2014-02-27',
        en: "build technology that do things people couldn't have imagined",
        ko: '사람들이 상상하지도 못했던 일을 해내는 기술을 만드십시오.',
      },
      {
        ref: 'https://www.mobileworldlive.com/?p=65969 — Mobile World Live, 2014-02-27',
        en: "focus on what you're great at and on who you are, and scale that",
        ko: '자신이 잘하는 것과 자신이 누구인지에 집중하고, 그것을 확장하십시오.',
      },
      {
        ref: 'https://phys.org/news/2012-07-hackers-mobile-network-def-con.html — AFP/Phys.org, 2012-07-29',
        en: "We've made it hackable from the ground up.",
        ko: '우리는 처음부터 해킹할 수 있도록 만들었습니다.',
      },
      {
        ref: 'https://phys.org/news/2012-07-hackers-mobile-network-def-con.html — AFP/Phys.org, 2012-07-29',
        en: "It's a pretty ambitious project to build your own Telco, effectively, and your own device from scratch.",
        ko: '사실상 자기 통신사와 자기 기기를 밑바닥부터 직접 만든다는 건 꽤 야심 찬 프로젝트입니다.',
      },
      {
        ref: 'https://phys.org/news/2011-07-lookout-verizon-team-mobile.html — AFP/Phys.org, 2011-07-20',
        en: "There's an inherent trust that people put in their phones and the app store experience. We're seeing more and more that trust is beginning to be violated.",
        ko: '사람들은 휴대전화와 앱스토어 경험을 본능적으로 신뢰합니다. 하지만 그 신뢰가 침해되기 시작하는 사례가 갈수록 늘고 있습니다.',
      },
      {
        ref: 'https://phys.org/news/2011-07-lookout-verizon-team-mobile.html — AFP/Phys.org, 2011-07-20',
        en: "You may download an app that you know and trust but it's actually downloading your personal information.",
        ko: '알고 있고 믿는 앱을 내려받았는데, 실은 그 앱이 당신의 개인정보를 빼내고 있을 수도 있습니다.',
      },
      {
        ref: 'https://www.darkreading.com/vulnerabilities-threats/google-finds-flaws-in-android-security-report — Dark Reading, 2010-06-23',
        en: "Just because an app accesses an API does not mean that it's malicious.",
        ko: '앱이 어떤 API에 접근한다고 해서 곧바로 악성 앱이라는 뜻은 아닙니다.',
      },
      {
        ref: 'https://www.darkreading.com/vulnerabilities-threats/google-finds-flaws-in-android-security-report — Dark Reading, 2010-06-23',
        en: 'the sky is not falling. But we are seeing more and more threats. Security in the mobile space is absolutely a growing problem.',
        ko: '당장 하늘이 무너지는 것은 아닙니다. 하지만 위협은 분명히 늘고 있습니다. 모바일 보안은 틀림없이 커져 가는 문제입니다.',
      },
      {
        ref: 'https://allthingsd.com/20130416/lookout-shows-just-how-easy-it-is-to-hack-a-phone-and-how-you-can-prevent-it/ — AllThingsD, 2013-04-16',
        en: "We're starting to see a fundamental shift in the attacks on mobile devices in a post-PC era. One of the most common vectors we're seeing is targeted attacks, especially with how easy it is to spoof emails.",
        ko: '포스트 PC 시대의 모바일 공격에서 근본적인 변화가 나타나기 시작했습니다. 가장 흔한 경로 중 하나는 표적 공격입니다. 특히 이메일을 위조하기가 너무 쉽기 때문입니다.',
      },
      {
        ref: 'https://techcrunch.com/2013/10/10/mobile-security-app-lookout-takes-another-55m-led-by-deutsche-telekom-to-expand-in-europe-enterprise/ — TechCrunch, 2013-10-10',
        en: "It's become more than just a mobile application. It's a cloud platform.",
        ko: '이제 단순한 모바일 애플리케이션이 아닙니다. 클라우드 플랫폼입니다.',
      },
      {
        ref: 'https://techcrunch.com/2013/10/10/mobile-security-app-lookout-takes-another-55m-led-by-deutsche-telekom-to-expand-in-europe-enterprise/ — TechCrunch, 2013-10-10',
        en: "We'll absolutely consider acquisitions going forward. We have the capital to do so.",
        ko: '앞으로 인수를 분명히 검토할 것입니다. 그렇게 할 자본도 있습니다.',
      },
      {
        ref: 'https://techcrunch.com/2013/10/10/mobile-security-app-lookout-takes-another-55m-led-by-deutsche-telekom-to-expand-in-europe-enterprise/ — TechCrunch, 2013-10-10',
        en: "It's the opportunity to leverage that consumer footprint to accelerate into the enterprise.",
        ko: '기존 소비자 기반을 활용해 기업 시장 진입을 가속할 기회입니다.',
      },
      {
        ref: 'https://www.forbes.com/sites/alexkonrad/2014/08/13/lookout-raises-150-million-for-enterprise/ — Forbes, 2014-08-13',
        en: 'We are playing for the long term. The market is there, the opportunity is there, the time window is here in front of us and we needed to capitalize.',
        ko: '우리는 장기전을 하고 있습니다. 시장도 있고, 기회도 있으며, 지금 바로 앞에 열린 시간의 창도 있습니다. 우리는 그것을 붙잡아야 했습니다.',
      },
      {
        ref: 'https://www.forbes.com/sites/alexkonrad/2014/08/13/lookout-raises-150-million-for-enterprise/ — Forbes, 2014-08-13',
        en: 'An IPO will be a step in the path of building a long-term independent company.',
        ko: '상장은 장기적으로 독립된 회사를 세워 가는 길의 한 단계일 뿐입니다.',
      },
    ],
  },
]

async function main() {
  const apply = process.argv.includes('--apply')

  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  if (Object.keys(lineup['X-Empire']?.uploads ?? {}).length) {
    throw new Error('X-Empire에 업로드 기록이 생겼다. 공개 대사 보호 규칙에 따라 자동 교정을 중단한다.')
  }

  const { data: episode, error: episodeError } = await db
    .from('faction_episodes')
    .select('id')
    .eq('folder', 'X-Empire')
    .single()
  if (episodeError) throw new Error(`X-Empire 조회 실패: ${episodeError.message}`)

  const { data: groups, error: groupError } = await db
    .from('faction_groups')
    .select('id, name')
    .eq('episode_id', episode.id)
  if (groupError) throw new Error(`세력 조회 실패: ${groupError.message}`)

  const groupById = new Map((groups ?? []).map(row => [row.id as string, (row.name as string).split('\n')[0]]))
  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters')
    .select('id, group_id, label')
    .in('group_id', [...groupById.keys()])
  if (clusterError) throw new Error(`클러스터 조회 실패: ${clusterError.message}`)

  const clusterMeta = new Map((clusters ?? []).map(row => [
    row.id as string,
    {
      group: groupById.get(row.group_id as string),
      cluster: (row.label as string).split('\n')[0],
    },
  ]))
  const { data: people, error: peopleError } = await db
    .from('faction_people')
    .select('id, cluster_id, name, quote, quote_en, quote_origin, quote_chunks, quote_en_chunks, mined')
    .in('cluster_id', [...clusterMeta.keys()])
  if (peopleError) throw new Error(`인물 조회 실패: ${peopleError.message}`)

  const rows = (people ?? []) as unknown as PersonRow[]
  const plans: { target: Target; row: PersonRow }[] = []

  for (const target of TARGETS) {
    const matches = rows.filter(row => {
      const meta = clusterMeta.get(row.cluster_id)
      return row.name === target.name && meta?.group === target.group && meta.cluster === target.cluster
    })
    if (matches.length !== 1) {
      throw new Error(`${target.group}/${target.cluster}/${target.name}: 대상 ${matches.length}건`)
    }

    const row = matches[0]
    const nextQuote = joined(target.quoteChunks)
    const nextQuoteEn = joined(target.quoteEnChunks)
    const currentMined = row.mined && typeof row.mined === 'object' && !Array.isArray(row.mined)
      ? (row.mined as { minedQuotes?: unknown }).minedQuotes
      : null
    const minedMatches = !target.mined || sameMined(currentMined, target.mined)
    const contentMatches = compact(row.quote) === compact(nextQuote)
      && compact(row.quote_en) === compact(nextQuoteEn)
      && compact(row.quote_origin) === compact(target.quoteOrigin)
    if (contentMatches && minedMatches) {
      console.log(`SKIP  ${row.id} ${target.group}/${target.cluster}/${target.name} — 이미 교정됨`)
      continue
    }
    if (contentMatches && !minedMatches) {
      plans.push({ target, row })
      console.log(`PLAN  ${row.id} ${target.group}/${target.cluster}/${target.name} — mined 구조 교정`)
      continue
    }
    if (compact(row.quote) !== compact(target.expectedQuote)) {
      throw new Error(`${target.name}: 예상 한국어 원문과 다름 — 자동 덮어쓰기 금지`)
    }
    if (compact(row.quote_en) !== compact(target.expectedQuoteEn)) {
      throw new Error(`${target.name}: 예상 영문 원문과 다름 — 자동 덮어쓰기 금지`)
    }

    plans.push({ target, row })
    console.log(`PLAN  ${row.id} ${target.group}/${target.cluster}/${target.name}`)
    console.log(`  KO  ${row.quote}`)
    console.log(`   →  ${nextQuote}`)
    console.log(`  EN  ${row.quote_en}`)
    console.log(`   →  ${nextQuoteEn}`)
  }

  if (!apply) {
    console.log(`DRY-RUN 변경 예정 ${plans.length}건 · DB 쓰기 0건`)
    return
  }

  let updated = 0
  for (const { target, row } of plans) {
    const nextQuote = joined(target.quoteChunks)
    const nextQuoteEn = joined(target.quoteEnChunks)
    const { data: changed, error: updateError } = await db
      .from('faction_people')
      .update({
        quote: nextQuote,
        quote_en: nextQuoteEn,
        quote_origin: target.quoteOrigin,
        quote_chunks: target.quoteChunks,
        quote_en_chunks: target.quoteEnChunks,
        ...(target.mined ? { mined: { minedQuotes: target.mined } } : {}),
      })
      .eq('id', row.id)
      .eq('quote', row.quote)
      .eq('quote_en', row.quote_en)
      .select('id, quote, quote_en, quote_origin, quote_chunks, quote_en_chunks')
      .maybeSingle()
    if (updateError) throw new Error(`${target.name} 갱신 실패: ${updateError.message}`)
    if (!changed) throw new Error(`${target.name} 갱신 충돌: 읽은 뒤 값이 바뀜`)
    if (compact(changed.quote as string) !== compact(nextQuote)
      || compact(changed.quote_en as string) !== compact(nextQuoteEn)
      || compact(changed.quote_origin as string) !== compact(target.quoteOrigin)) {
      throw new Error(`${target.name} 갱신 후 교차 필드 불일치`)
    }
    updated++
    console.log(`UPDATE ${row.id} ${target.group}/${target.cluster}/${target.name}`)
  }

  console.log(`APPLIED ${updated}건`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
