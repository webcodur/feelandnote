/**
 * celebs.title / title_en 규격 위반 대상을 data/celeb/title-repair/targets.json으로 뽑는다.
 * 읽기 전용. 작성 규칙은 docs/project/celeb/celeb-01-03-title.md가 쥔다.
 *
 * 그룹:
 *   ko_over   — 한글 수식어가 상한 12자 초과 (재작성 필수)
 *   en_over   — 한글은 적법한데 영문이 상한 40자 초과 (영문만 재작성)
 *   ko_review — 9~12자인데 국가·맥락 수식이 붙은 lazy 수식 의심 (서브에이전트가 유지/재작성 판정)
 *
 * 실행: pnpm exec tsx scripts/celeb/title-repair/targets.ts
 */
import path from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  CELEB_TITLE_EN_MAX,
  CELEB_TITLE_KO_MAX,
  celebTitleLength,
} from '@feelandnote/shared/constants/celeb-title'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT = path.resolve(process.cwd(), '../../data/celeb/title-repair/targets.json')

// 이름 앞에 덧붙여 상세에서 중복되는 맥락 수식. 세계 각지·역사 국가까지 넓게 잡는다.
const PLACES = [
  '미국', '영국', '일본', '중국', '독일', '프랑스', '이탈리아', '스페인', '러시아', '소련',
  '한국', '조선', '인도', '인도네시아', '브라질', '멕시코', '아르헨티나', '캐나다', '호주',
  '뉴질랜드', '네덜란드', '벨기에', '스위스', '스웨덴', '노르웨이', '덴마크', '핀란드',
  '폴란드', '체코', '헝가리', '슬로바키아', '오스트리아', '그리스', '터키', '이집트',
  '이란', '이라크', '시리아', '이스라엘', '사우디', '요르단', '레바논', '베트남', '태국',
  '필리핀', '미얀마', '캄보디아', '라오스', '말레이시아', '싱가포르', '인도', '파키스탄',
  '방글라데시', '스리랑카', '네팔', '아프가니스탄', '카자흐스탄', '우즈베키스탄', '몽골',
  '티베트', '대만', '홍콩', '우크라이나', '벨라루스', '루마니아', '불가리아', '세르비아',
  '크로아티아', '슬로베니아', '보스니아', '알바니아', '마케도니아', '몬테네그로', '포르투갈',
  '아일랜드', '스코틀랜드', '잉글랜드', '웨일스', '프로이센', '오스만', '로마', '비잔틴',
  '바이킹', '페르시아', '아시리아', '바빌론', '페니키아', '스페인', '포르투갈',
  '쿠바', '콜롬비아', '칠레', '페루', '베네수엘라', '에콰도르', '볼리비아', '파라과이',
  '우루과이', '과테말라', '파나마', '자메이카', '아이티', '나이지리아', '케냐', '가나',
  '에티오피아', '남아프리카', '모로코', '알제리', '튀니지', '세네갈', '코트디부아르',
  '카메룬', '짐바브웨', '콩고', '아이슬란드', '몰타', '룩셈부르크', '바티칸',
]
const PLACE_PREFIX = new RegExp(`^(${[...new Set(PLACES)].join('|')})\\s`)

type Row = {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  title: string | null
  title_en: string | null
  headline: string | null
  profession: string | null
  nationality: string | null
  celeb_reality: string | null
  publication_status: string | null
}

type Target = Row & {
  group: 'ko_over' | 'en_over' | 'ko_review'
  ko_len: number
  en_len: number
  hint: string | null
}

function lazyHint(title: string): string | null {
  const place = title.match(PLACE_PREFIX)
  if (!place) return null
  return `앞 맥락 수식 '${place[1]}'`
}

async function main() {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,nickname,nickname_en,title,title_en,headline,profession,nationality,celeb_reality,publication_status')
      .not('title', 'is', null)
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }

  const targets: Target[] = []
  for (const row of rows) {
    if (!row.title) continue
    const ko = celebTitleLength(row.title)
    const en = row.title_en ? row.title_en.length : 0
    if (ko > CELEB_TITLE_KO_MAX) {
      targets.push({ ...row, group: 'ko_over', ko_len: ko, en_len: en, hint: lazyHint(row.title) })
    } else if (en > CELEB_TITLE_EN_MAX) {
      targets.push({ ...row, group: 'en_over', ko_len: ko, en_len: en, hint: null })
    } else if (ko >= 9) {
      const hint = lazyHint(row.title)
      if (hint) targets.push({ ...row, group: 'ko_review', ko_len: ko, en_len: en, hint })
    }
  }

  const counts = { ko_over: 0, en_over: 0, ko_review: 0 }
  for (const t of targets) counts[t.group]++
  mkdirSync(path.dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), counts, targets }, null, 1) + '\n')
  console.log(`전체 title 보유: ${rows.length}`)
  console.log(`ko_over(>12자): ${counts.ko_over}`)
  console.log(`en_over(>${CELEB_TITLE_EN_MAX}자, ko 적법): ${counts.en_over}`)
  console.log(`ko_review(9~12 lazy 의심): ${counts.ko_review}`)
  console.log(`→ ${OUT}`)
}

main()
