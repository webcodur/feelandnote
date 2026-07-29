/**
 * X-Empire 대사의 표면 결함을 의미 변경 없이 교정한다.
 *
 * - 한국어 띄어쓰기 2건
 * - 영문 임시 구분자(`  -  `) 8건
 * - 빈 quote_chunks 4개 제거
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/polish-x-empire-dialogue-format.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/polish-x-empire-dialogue-format.ts --apply
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
  expectedKo: string[]
  expectedEn: string[]
  nextKo: string[]
  nextEn: string[]
}

type PersonRow = {
  id: string
  cluster_id: string
  name: string
  quote: string | null
  quote_en: string | null
  quote_chunks: unknown
  quote_en_chunks: unknown
}

const TARGETS: Target[] = [
  {
    name: '그윈 숏웰',
    group: 'SpaceX',
    cluster: '본진',
    expectedKo: ['우리는 날짜를 몇 번 놓치더라도', '최고 난이도의 목표를 잡습니다.', '로켓은 그렇게 해야만 날아갑니다.'],
    expectedEn: ['Set the target high.', 'We reached the results we wanted  -  we just never hit the date.', 'Missing the calendar beats abandoning the rocket.'],
    nextKo: ['우리는 날짜를 몇 번 놓치더라도', '최고 난이도의 목표를 잡습니다.', '로켓은 그렇게 해야만 날아갑니다.'],
    nextEn: ['Set the target high.', 'We reached the results we wanted; we just never hit the date.', 'Missing the calendar beats abandoning the rocket.'],
  },
  {
    name: '빌 거스텐마이어',
    group: 'SpaceX',
    cluster: '본진',
    expectedKo: ['로켓은 빨리 한번 날려버리는 게 낫습니다.', '발사 한 번이면 알아낼 정보를 2년씩 분석해선 안됩니다.'],
    expectedEn: ['We fly as fast as we can. There is no room to wait.', 'If one flight tomorrow gives the answer, we throw away two years of analysis.'],
    nextKo: ['로켓은 빨리 한번 날려버리는 게 낫습니다.', '발사 한 번이면 알아낼 정보를 2년씩 분석해선 안 됩니다.'],
    nextEn: ['We fly as fast as we can. There is no room to wait.', 'If one flight tomorrow gives the answer, we throw away two years of analysis.'],
  },
  {
    name: '팀 휴즈',
    group: 'SpaceX',
    cluster: '본진',
    expectedKo: ['누군가 국가의 우주 산업을 잘못된 방식으로 독점하면 ', '세금을 내는 시민들이 고스란히 부담을 뒤집어 쓰게 됩니다.', '기업과 정부의 올바른 협력만이 일을 싸고 빠르게 성사시킵니다.'],
    expectedEn: ['When one firm monopolizes national launches and brags about a sole long deal, the taxpayers are at risk.', 'Only when private and government truly join hands does space get cheap and fast.'],
    nextKo: ['누군가 국가의 우주 산업을 잘못된 방식으로 독점하면', '세금을 내는 시민들이 고스란히 부담을 뒤집어쓰게 됩니다.', '기업과 정부의 올바른 협력만이 일을 싸고 빠르게 성사시킵니다.'],
    nextEn: ['When one firm monopolizes national launches and brags about a sole long deal, the taxpayers are at risk.', 'Only when private and government truly join hands does space get cheap and fast.'],
  },
  {
    name: '앤드루 밀리치',
    group: 'SpaceX',
    cluster: 'xAI · Grok',
    expectedKo: ['X는 공상과학을 현실의 달력 위에 세우고 있습니다.', '재사용 로켓, 휴머노이드, 우주 데이터센터.', '우리는 상상 속에만 존재했던 것들을 현실로 불러냅니다.'],
    expectedEn: ['X puts science fiction on the calendar.', 'Reusable rockets, human-shaped robots, data centers in space  -  we build what used to stay only imagination.'],
    nextKo: ['X는 공상과학을 현실의 달력 위에 세우고 있습니다.', '재사용 로켓, 휴머노이드, 우주 데이터센터.', '우리는 상상 속에만 존재했던 것들을 현실로 불러냅니다.'],
    nextEn: ['X puts science fiction on the calendar.', 'Reusable rockets, human-shaped robots, data centers in space. We build what used to live only in imagination.'],
  },
  {
    name: '킴벌 머스크',
    group: 'Tesla',
    cluster: '이사회',
    expectedKo: ['파산 직전, 우리는 전쟁터에 선 기분이었습니다.', '그때 돈을 넣지 않았다면 평생 저를 용서 못 했을 겁니다.', '절박해야만 사는 회사. 그게 테슬라였습니다.'],
    expectedEn: ['On the edge of bankruptcy we felt at war.', 'If I had not put money in then, I could never have forgiven myself.', 'Only the desperate company survives  -  that was Tesla.'],
    nextKo: ['파산 직전, 우리는 전쟁터에 선 기분이었습니다.', '그때 돈을 넣지 않았다면 평생 저를 용서 못 했을 겁니다.', '절박해야만 사는 회사. 그게 테슬라였습니다.'],
    nextEn: ['On the edge of bankruptcy we felt at war.', 'If I had not put money in then, I could never have forgiven myself.', 'Only the desperate company survives. That was Tesla.'],
  },
  {
    name: 'DJ 서',
    group: 'Neuralink',
    cluster: '본진',
    expectedKo: ['뇌는 연약하지만 ', '끊임없이 배우고 변화하면서 ', '놀라운 가능성을 증명합니다', '', '우리가 의식을 이해하는 순간,', '인류는 처음 불을 다루기 시작했을 때와 같은 ', '새로운 시대를 열게 될 것입니다.'],
    expectedEn: ['The brain is fragile, yet it relearns and holds.', 'Understanding and growing consciousness is humanity\'s greatest expedition.', 'Opening a wide path into the brain matches the day we first lit fire.'],
    nextKo: ['뇌는 연약하지만', '끊임없이 배우고 변화하면서', '놀라운 가능성을 증명합니다', '우리가 의식을 이해하는 순간,', '인류는 처음 불을 다루기 시작했을 때와 같은', '새로운 시대를 열게 될 것입니다.'],
    nextEn: ['The brain is fragile, yet it relearns and holds.', 'Understanding and growing consciousness is humanity\'s greatest expedition.', 'Opening a wide path into the brain matches the day we first lit fire.'],
  },
  {
    name: '시본 질리스',
    group: 'Neuralink',
    cluster: '본진',
    expectedKo: ['기업은 자본이 흐를 때 성장합니다.', '하지만 인류의 생존에 닿지 않는다면,', '아무리 큰 성공도 제게는 의미가 없습니다.', '', '그 기준 위에서, 저는 뉴럴링크를 만들어가고 있습니다.'],
    expectedEn: ['A company grows only when money turns.', 'But if it did not touch humanity\'s survival, he would not care no matter how much money it made.', 'Beside that rule, I run Neuralink.'],
    nextKo: ['기업은 자본이 흐를 때 성장합니다.', '하지만 인류의 생존에 닿지 않는다면,', '아무리 큰 성공도 제게는 의미가 없습니다.', '그 기준 위에서, 저는 뉴럴링크를 만들어가고 있습니다.'],
    nextEn: ['A company grows only when money turns.', 'But if it did not touch humanity\'s survival, he would not care no matter how much money it made.', 'Beside that rule, I run Neuralink.'],
  },
  {
    name: '스티브 데이비스',
    group: 'The Boring Company',
    cluster: '굴착',
    expectedKo: ['이 터널은 단 하나의 실험이 아닙니다.', '앞으로 이어질 수백 개의 길, 그 시작입니다.', '', '우리는 안전하고, 저렴하며 빠른 이동의 시대를 열 것입니다.', '', '우리는 멈춰 있을 시간이 없습니다.', '그래야만 합니다.'],
    expectedEn: ['This tunnel is not disposable. It is the first of hundreds we will dig.', 'We will grow the safest public transit  -  cheap and fast.', 'We are impatient. We must be.'],
    nextKo: ['이 터널은 단 하나의 실험이 아닙니다.', '앞으로 이어질 수백 개의 길, 그 시작입니다.', '우리는 안전하고, 저렴하며 빠른 이동의 시대를 열 것입니다.', '우리는 멈춰 있을 시간이 없습니다.', '그래야만 합니다.'],
    nextEn: ['This tunnel is not disposable. It is the first of hundreds we will dig.', 'We will grow the safest public transit: cheap and fast.', 'We are impatient. We must be.'],
  },
  {
    name: '존 허링',
    group: '왕가의 궁정',
    cluster: '측근',
    expectedKo: ['뚫리지 않는 시스템은 없습니다.', '어떻게 뚫리는지를 아는지가 갈립니다.', '그 사실을 인정하는 쪽에 저는 돈을 넣고, 지킵니다.'],
    expectedEn: ['No system is unbreakable.', 'What divides us is whether we know how it breaks.', 'I put money on the side that admits that  -  and I guard it.'],
    nextKo: ['뚫리지 않는 시스템은 없습니다.', '어떻게 뚫리는지를 아는지가 갈립니다.', '그 사실을 인정하는 쪽에 저는 돈을 넣고, 지킵니다.'],
    nextEn: ['No system is unbreakable.', 'What divides us is whether we know how it breaks.', 'I put money on the side that admits that, and I guard it.'],
  },
  {
    name: '루크 노섹',
    group: '왕가의 궁정',
    cluster: '투자자',
    expectedKo: ['스페이스엑스를 볼 때, 신형 로켓에 성공한 다른 투자자를 찾고 싶었습니다.', '없었습니다. 다들 망해 있었습니다.', '궤도에 오르거나 추락하거나. 우리는 오르는 쪽에 걸었습니다.'],
    expectedEn: ['When we diligenced SpaceX we wanted other investors who had won on new rockets.', 'There were none. They were all dead.', 'Orbit or crash  -  we bet on orbit.'],
    nextKo: ['스페이스엑스를 볼 때, 신형 로켓에 성공한 다른 투자자를 찾고 싶었습니다.', '없었습니다. 다들 망해 있었습니다.', '궤도에 오르거나 추락하거나. 우리는 오르는 쪽에 걸었습니다.'],
    nextEn: ['When we diligenced SpaceX we wanted other investors who had won on new rockets.', 'There were none. They were all dead.', 'Orbit or crash. We bet on orbit.'],
  },
  {
    name: '마크 앤드리슨',
    group: '왕가의 궁정',
    cluster: '투자자',
    expectedKo: ['소프트웨어가 세상을 삼키고 있습니다.', '기술이 일자리를 뺏는다는 말은 거짓말입니다.', '진짜 적은 멈춤입니다. 실력을 미워하고, 야망을 미워하고, 위대해지기를 미워하는 태도입니다.'],
    expectedEn: ['Software is eating the world.', 'It is a lie that technology steals jobs.', 'The real enemy is stalling  -  the mood that hates skill, hates ambition, hates greatness.'],
    nextKo: ['소프트웨어가 세상을 삼키고 있습니다.', '기술이 일자리를 뺏는다는 말은 거짓말입니다.', '진짜 적은 멈춤입니다. 실력을 미워하고, 야망을 미워하고, 위대해지기를 미워하는 태도입니다.'],
    nextEn: ['Software is eating the world.', 'It is a lie that technology steals jobs.', 'The real enemy is stalling: the mood that hates skill, hates ambition, hates greatness.'],
  },
  {
    name: '조 론스데일',
    group: '왕가의 궁정',
    cluster: '투자자',
    expectedKo: ['세상을 바꾸려면 자신을 조금 과신해야 합니다.', '큰 자아가 늘 나쁜 건 아닙니다.', '남이 모르는 걸 우리가 안다고 믿고, 세게 밀어야 합니다.'],
    expectedEn: ['To change the world you need a bit of overconfidence.', 'A large ego is not always bad.', 'Believe you know what others do not  -  and push hard.'],
    nextKo: ['세상을 바꾸려면 자신을 조금 과신해야 합니다.', '큰 자아가 늘 나쁜 건 아닙니다.', '남이 모르는 걸 우리가 안다고 믿고, 세게 밀어야 합니다.'],
    nextEn: ['To change the world you need a bit of overconfidence.', 'A large ego is not always bad.', 'Believe you know what others do not; push hard.'],
  },
]

function arrayOfStrings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${label}: 문자열 배열이 아님`)
  }
  return value as string[]
}

function same(a: string[], b: string[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function joined(chunks: string[]): string {
  return chunks.filter(Boolean).join(' ')
}

function compact(value: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

async function main() {
  const apply = process.argv.includes('--apply')

  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  if (Object.keys(lineup['X-Empire']?.uploads ?? {}).length) {
    throw new Error('X-Empire에 업로드 기록이 생겼다. 공개 대사 보호 규칙에 따라 자동 교정을 중단한다.')
  }

  const { data: episode, error: episodeError } = await db
    .from('faction_episodes').select('id').eq('folder', 'X-Empire').single()
  if (episodeError) throw new Error(`X-Empire 조회 실패: ${episodeError.message}`)

  const { data: groups, error: groupError } = await db
    .from('faction_groups').select('id, name').eq('episode_id', episode.id)
  if (groupError) throw new Error(`세력 조회 실패: ${groupError.message}`)
  const groupById = new Map((groups ?? []).map(row => [row.id as string, (row.name as string).split('\n')[0]]))

  const { data: clusters, error: clusterError } = await db
    .from('faction_clusters').select('id, group_id, label').in('group_id', [...groupById.keys()])
  if (clusterError) throw new Error(`클러스터 조회 실패: ${clusterError.message}`)
  const clusterMeta = new Map((clusters ?? []).map(row => [
    row.id as string,
    { group: groupById.get(row.group_id as string), cluster: (row.label as string).split('\n')[0] },
  ]))

  const { data: people, error: peopleError } = await db
    .from('faction_people')
    .select('id, cluster_id, name, quote, quote_en, quote_chunks, quote_en_chunks')
    .in('cluster_id', [...clusterMeta.keys()])
  if (peopleError) throw new Error(`인물 조회 실패: ${peopleError.message}`)
  const rows = (people ?? []) as unknown as PersonRow[]

  const plans: { target: Target; row: PersonRow }[] = []
  for (const target of TARGETS) {
    const matches = rows.filter(row => {
      const meta = clusterMeta.get(row.cluster_id)
      return row.name === target.name && meta?.group === target.group && meta.cluster === target.cluster
    })
    if (matches.length !== 1) throw new Error(`${target.group}/${target.cluster}/${target.name}: 대상 ${matches.length}건`)
    const row = matches[0]
    const currentKo = arrayOfStrings(row.quote_chunks, `${target.name} quote_chunks`)
    const currentEn = arrayOfStrings(row.quote_en_chunks, `${target.name} quote_en_chunks`)

    if (same(currentKo, target.nextKo) && same(currentEn, target.nextEn)) {
      console.log(`SKIP  ${row.id} ${target.name} — 이미 교정됨`)
      continue
    }
    if (!same(currentKo, target.expectedKo) || !same(currentEn, target.expectedEn)) {
      throw new Error(`${target.name}: 예상 청크와 다름 — 자동 덮어쓰기 금지`)
    }
    if (compact(row.quote) !== compact(joined(currentKo))
      || compact(row.quote_en) !== compact(joined(currentEn))) {
      throw new Error(`${target.name}: 현재 본문과 청크가 다름`)
    }
    plans.push({ target, row })
    console.log(`PLAN  ${row.id} ${target.name}`)
  }

  if (!apply) {
    console.log(`DRY-RUN 변경 예정 ${plans.length}건 · DB 쓰기 0건`)
    return
  }

  let updated = 0
  for (const { target, row } of plans) {
    const nextQuote = joined(target.nextKo)
    const nextQuoteEn = joined(target.nextEn)
    const { data: changed, error: updateError } = await db
      .from('faction_people')
      .update({
        quote: nextQuote,
        quote_en: nextQuoteEn,
        quote_chunks: target.nextKo,
        quote_en_chunks: target.nextEn,
      })
      .eq('id', row.id)
      .eq('quote', row.quote)
      .eq('quote_en', row.quote_en)
      .select('id')
      .maybeSingle()
    if (updateError) throw new Error(`${target.name} 갱신 실패: ${updateError.message}`)
    if (!changed) throw new Error(`${target.name} 갱신 충돌: 읽은 뒤 값이 바뀜`)
    updated++
    console.log(`UPDATE ${row.id} ${target.name}`)
  }
  console.log(`APPLIED ${updated}건`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
