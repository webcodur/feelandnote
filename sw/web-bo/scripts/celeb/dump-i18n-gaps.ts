// 영문 결손 인물의 한국어 원문을 덤프한다. 영향력 7축·대사 7상황·대표작.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync } from 'node:fs'
import 'dotenv/config'

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const slugs: string[] = JSON.parse(readFileSync(process.argv[2], 'utf8')).both
  const out: any[] = []
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await db.from('celebs')
      .select('id, slug, nickname, nickname_en, title, title_en, profession, nationality, birth_date, death_date, headline, headline_en')
      .in('slug', slugs.slice(i, i + 100))
    if (error) throw new Error(error.message)
    const ids = (data ?? []).map((c: any) => c.id)
    // 테이블명은 단수형 celeb_influence다. 복수형으로 조회하면 오류가 나고,
    // 오류를 삼키면 전원 influence: null로 덤프돼 데이터가 없는 것처럼 보인다.
    const { data: infs, error: infErr } = await db.from('celeb_influence').select('*').in('celeb_id', ids)
    if (infErr) throw new Error(infErr.message)
    const { data: dias, error: diaErr } = await db.from('celeb_dialogues').select('*').in('celeb_id', ids)
    if (diaErr) throw new Error(diaErr.message)
    const infBy = new Map((infs ?? []).map((r: any) => [r.celeb_id, r]))
    const diaBy = new Map((dias ?? []).map((r: any) => [r.celeb_id, r]))
    for (const c of data ?? []) {
      const inf: any = infBy.get(c.id) ?? null
      const dia: any = diaBy.get(c.id) ?? null
      out.push({
        slug: c.slug, name: c.nickname, name_en: c.nickname_en,
        title: c.title, title_en: c.title_en,
        profession: c.profession, nationality: c.nationality,
        birth: c.birth_date, death: c.death_date,
        influence: inf ?? null, dialogue: dia ?? null,
      })
    }
  }
  writeFileSync(process.argv[3], JSON.stringify(out, null, 1), 'utf8')
  console.log('덤프', out.length, '명')
  const s = out[0]
  if (s) {
    console.log('영향력 키:', Object.keys(s.influence ?? {}).filter(k => /exp|score/.test(k)).join(', '))
    console.log('대사 키:', Object.keys(s.dialogue ?? {}).slice(0, 24).join(', '))
  }
}
main().catch(e => { console.error(e.message); process.exit(1) })
