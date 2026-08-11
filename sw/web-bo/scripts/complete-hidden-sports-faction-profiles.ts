/**
 * 숨김 스포츠 팩션용으로 만든 최소 CELEB 13명의 얕은 기본 정보만 보강한다.
 *
 * - 기본은 dry-run, --apply에서만 DB를 쓴다.
 * - 콘텐츠·영향력·스펙트럼·감상 데이터는 만들지 않는다.
 * - 공개 상태를 바꾸지 않는다. suspended/light/is_verified=false를 유지한다.
 * - 최초 등록 직후의 null 필드만 채운다. 값이 달라졌으면 중단한다.
 */

import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const APPLY = process.argv.includes('--apply')

type Seed = {
  slug: string
  nickname: string
  nicknameEn: string
  nationality: string
  birthDate: string
  wikidataQid: string
  bio: string
  bioEn: string
}

const SEEDS: Seed[] = [
  {
    slug: 'vozinha',
    nickname: '보지냐',
    nicknameEn: 'Vozinha',
    nationality: 'CV',
    birthDate: '1986-06-03',
    wikidataQid: 'Q3018091',
    bio: '카보베르데 축구 국가대표 골키퍼. 본명은 조시마르 디아스이며, 2012년부터 대표팀 골문을 지켰다. 40세에 출전한 2026 월드컵에서 카보베르데의 첫 본선 돌풍을 이끌었다.',
    bioEn: 'Cape Verde international goalkeeper Josimar Dias, known as Vozinha. A senior international since 2012, he helped lead Cape Verde through its first World Cup at age 40 in 2026.',
  },
  {
    slug: 'pedro-porro',
    nickname: '페드로 포로',
    nicknameEn: 'Pedro Porro',
    nationality: 'ES',
    birthDate: '1999-09-13',
    wikidataQid: 'Q44080929',
    bio: '스페인 축구 국가대표 수비수. 오른쪽 측면에서 수비와 공격 전개를 맡으며 스포르팅 CP를 거쳐 토트넘 홋스퍼에서 뛰었다.',
    bioEn: 'Spanish international defender who operates on the right flank. After playing for Sporting CP, he established himself at Tottenham Hotspur as both a defender and attacking outlet.',
  },
  {
    slug: 'lisandro-martinez',
    nickname: '리산드로 마르티네스',
    nicknameEn: 'Lisandro Martinez',
    nationality: 'AR',
    birthDate: '1998-01-18',
    wikidataQid: 'Q30881092',
    bio: '아르헨티나 축구 국가대표 수비수. 아약스를 거쳐 맨체스터 유나이티드에 입단했으며, 2022 월드컵과 코파 아메리카 우승을 경험했다.',
    bioEn: 'Argentine international defender. He moved from Ajax to Manchester United and was part of Argentina squads that won the 2022 World Cup and Copa America.',
  },
  {
    slug: 'dayot-upamecano',
    nickname: '다요 우파메카노',
    nicknameEn: 'Dayot Upamecano',
    nationality: 'FR',
    birthDate: '1998-10-27',
    wikidataQid: 'Q20723878',
    bio: '프랑스 축구 국가대표 중앙 수비수. 잘츠부르크와 라이프치히를 거쳐 바이에른 뮌헨에서 뛰었고, 2022 월드컵 준우승 대표팀의 주전 수비수로 활약했다.',
    bioEn: 'French international centre-back. After Salzburg and RB Leipzig, he joined Bayern Munich and started throughout France\'s run to the 2022 World Cup final.',
  },
  {
    slug: 'marc-cucurella',
    nickname: '마르크 쿠쿠레야',
    nicknameEn: 'Marc Cucurella',
    nationality: 'ES',
    birthDate: '1998-07-22',
    wikidataQid: 'Q22082505',
    bio: '스페인 축구 국가대표 왼쪽 수비수. 바르셀로나 유소년팀에서 성장해 에이바르·헤타페·브라이턴을 거쳐 첼시에서 뛰었다.',
    bioEn: 'Spanish international left-back. A Barcelona academy graduate, he played for Eibar, Getafe, and Brighton before joining Chelsea.',
  },
  {
    slug: 'rodri',
    nickname: '로드리',
    nicknameEn: 'Rodri',
    nationality: 'ES',
    birthDate: '1996-06-22',
    wikidataQid: 'Q20994118',
    bio: '스페인 축구 국가대표 수비형 미드필더. 맨체스터 시티의 트레블과 스페인의 유로 2024 우승을 이끌었고, 2024 발롱도르를 받았다.',
    bioEn: 'Spanish international defensive midfielder. He anchored Manchester City\'s treble, helped Spain win Euro 2024, and received the 2024 Ballon d\'Or.',
  },
  {
    slug: 'michael-olise',
    nickname: '마이클 올리세',
    nicknameEn: 'Michael Olise',
    nationality: 'FR',
    birthDate: '2001-12-12',
    wikidataQid: 'Q62050484',
    bio: '프랑스 축구 국가대표 측면 공격수. 레딩과 크리스털 팰리스를 거쳐 2024년 바이에른 뮌헨에 합류했으며, 프랑스 대표로 파리 올림픽 은메달을 획득했다.',
    bioEn: 'French international winger. After Reading and Crystal Palace, he joined Bayern Munich in 2024 and won Olympic silver with France in Paris.',
  },
  {
    slug: 'jude-bellingham',
    nickname: '주드 벨링엄',
    nicknameEn: 'Jude Bellingham',
    nationality: 'GB',
    birthDate: '2003-06-29',
    wikidataQid: 'Q66241169',
    bio: '잉글랜드 축구 국가대표 미드필더. 버밍엄 시티와 보루시아 도르트문트를 거쳐 2023년 레알 마드리드에 입단했고, 첫 시즌에 라리가와 챔피언스리그 우승을 차지했다.',
    bioEn: 'England international midfielder. After Birmingham City and Borussia Dortmund, he joined Real Madrid in 2023 and won La Liga and the Champions League in his first season.',
  },
  {
    slug: 'gregg-popovich',
    nickname: '그레그 포포비치',
    nicknameEn: 'Gregg Popovich',
    nationality: 'US',
    birthDate: '1949-01-28',
    wikidataQid: 'Q456730',
    bio: '미국 농구 감독. 샌안토니오 스퍼스를 29시즌 지휘해 NBA 우승 5회와 정규시즌 역대 최다승 기록을 남겼으며, 2025년 감독직에서 물러나 구단 운영을 맡았다.',
    bioEn: 'American basketball coach who led the San Antonio Spurs for 29 seasons, winning five NBA titles and setting the league record for regular-season coaching victories before moving into the front office in 2025.',
  },
  {
    slug: 'tony-parker',
    nickname: '토니 파커',
    nicknameEn: 'Tony Parker',
    nationality: 'FR',
    birthDate: '1982-05-17',
    wikidataQid: 'Q193108',
    bio: '프랑스 농구 선수. 샌안토니오 스퍼스의 주전 포인트가드로 NBA 우승 4회와 2007 파이널 MVP를 기록했고, 2023년 농구 명예의 전당에 헌액됐다.',
    bioEn: 'French basketball player who ran point for the San Antonio Spurs, winning four NBA titles and the 2007 Finals MVP before entering the Basketball Hall of Fame in 2023.',
  },
  {
    slug: 'manu-ginobili',
    nickname: '마누 지노빌리',
    nicknameEn: 'Manu Ginobili',
    nationality: 'AR',
    birthDate: '1977-07-28',
    wikidataQid: 'Q213132',
    bio: '아르헨티나 농구 선수. 샌안토니오 스퍼스에서 NBA 우승 4회를 차지했고, 아르헨티나 대표팀의 2004 아테네 올림픽 금메달을 이끌었다.',
    bioEn: 'Argentine basketball player who won four NBA titles with the San Antonio Spurs and led Argentina to the gold medal at the 2004 Athens Olympics.',
  },
  {
    slug: 'steve-kerr',
    nickname: '스티브 커',
    nicknameEn: 'Steve Kerr',
    nationality: 'US',
    birthDate: '1965-09-27',
    wikidataQid: 'Q523630',
    bio: '미국 농구 감독이자 전 NBA 선수. 선수로 우승 5회를 경험했고, 2014년부터 골든스테이트 워리어스를 이끌어 네 차례 우승했다.',
    bioEn: 'American basketball coach and former NBA guard. After winning five titles as a player, he took over the Golden State Warriors in 2014 and coached them to four championships.',
  },
  {
    slug: 'klay-thompson',
    nickname: '클레이 톰프슨',
    nicknameEn: 'Klay Thompson',
    nationality: 'US',
    birthDate: '1990-02-08',
    wikidataQid: 'Q29342',
    bio: '미국 NBA 슈팅가드. 스테판 커리와 골든스테이트의 장거리 슛 중심 공격을 이끌며 우승 4회를 차지했고, 한 쿼터 37득점 기록을 세웠다.',
    bioEn: 'American NBA shooting guard who paired with Stephen Curry in Golden State\'s three-point attack, won four championships, and set the NBA record with 37 points in a quarter.',
  },
]

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 관리자 환경변수가 없습니다.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function main() {
  const db = dbClient()
  const { data, error } = await db.from('celebs')
    .select('id,slug,nickname,nickname_en,publication_status,celeb_tier,is_verified,nationality,gender,birth_date,death_date,bio,bio_en,wikidata_qid')
    .in('slug', SEEDS.map(seed => seed.slug))
  if (error) throw error

  const bySlug = new Map((data ?? []).map(row => [row.slug, row]))
  const changed: string[] = []
  const skipped: string[] = []

  for (const seed of SEEDS) {
    const row = bySlug.get(seed.slug)
    if (!row) throw new Error(`프로필이 없습니다: ${seed.slug}`)
    if (row.nickname !== seed.nickname || row.nickname_en !== seed.nicknameEn) {
      throw new Error(`이름 불일치: ${seed.slug}`)
    }
    if (row.publication_status !== 'suspended' || row.celeb_tier !== 'light' || row.is_verified !== false) {
      throw new Error(`비공개 최소 프로필 상태가 바뀌었습니다: ${seed.slug}`)
    }

    const next = {
      nationality: seed.nationality,
      gender: true,
      birth_date: seed.birthDate,
      death_date: '',
      bio: seed.bio,
      bio_en: seed.bioEn,
      wikidata_qid: seed.wikidataQid,
    }
    const already = Object.entries(next).every(([key, value]) => row[key as keyof typeof row] === value)
    if (already) {
      skipped.push(seed.slug)
      continue
    }

    for (const key of ['nationality', 'gender', 'birth_date', 'bio', 'bio_en', 'wikidata_qid'] as const) {
      if (row[key] !== null) throw new Error(`${seed.slug}.${key}가 이미 채워져 있어 중단합니다.`)
    }
    changed.push(seed.slug)
    if (!APPLY) continue

    const { error: updateError } = await db.from('celebs').update(next).eq('id', row.id)
    if (updateError) throw updateError
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', changed, skipped }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
