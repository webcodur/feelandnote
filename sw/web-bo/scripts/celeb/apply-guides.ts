// data/celeb/guides/<slug>.txt 를 celeb_explanations 의 인물 안내로 반영한다.
// 행이 없으면 만들고, 있으면 plain_text·plain_text_en 만 갱신한다.
// interpretive_* 는 건드리지 않는다. 기본 dry-run, --apply 로 실제 반영.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import 'dotenv/config'

const DIR = 'C:/project/feelandnote/data/celeb/guides'
const APPLY = process.argv.includes('--apply')

/** 모델이 본문 앞에 흘리는 진행 보고를 지나 마지막 KO/EN 줄을 취한다. */
function parse(text: string): { ko: string; en: string } | null {
  const ko = [...text.matchAll(/^KO:\s*(.+)$/gm)].map((m) => m[1].trim()).filter(Boolean)
  const en = [...text.matchAll(/^EN:\s*(.+)$/gm)].map((m) => m[1].trim()).filter(Boolean)
  if (!ko.length || !en.length) return null
  return { ko: ko[ko.length - 1], en: en[en.length - 1] }
}

/** 「대표작은 ○○이다」로 맺는 상투 종결을 걷어낸다. title 컬럼과 중복이고 문장이 깨진 것이 많다. */
function trimTail(ko: string): string {
  return ko
    .replace(/\s*(그의|그녀의)?\s*대표작(?:은|으로|는)[^.]{0,60}[.。]?\s*$/u, '')
    .replace(/\s*(?:이후|현재)?\s*대표\s*활동(?:은|으로)[^.]{0,60}[.。]?\s*$/u, '')
    .trim()
}

function broken(slug: string, ko: string, en: string): string | null {
  if (ko.length < 80) return '한국어가 짧다 ' + ko.length + '자'
  if (ko.length > 600) return '한국어가 길다 ' + ko.length + '자'
  if (en.length < 80) return '영문이 짧다 ' + en.length + '자'
  if (/[가-힣]/.test(en)) return '영문에 한글이 섞였다'
  if (/^#{1,6}\s|\*\*/.test(ko)) return '마크다운이 섞였다'
  // <모차르트!> 처럼 작품 제목에 홑화살괄호를 쓴다. 자리표는 <한국어 안내> 꼴만 잡는다
  if (/<[^>]{0,12}(안내|본문|제목|이름|slug)[^>]{0,12}>/.test(ko)) return '자리표가 남았다'
  return null
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const files = readdirSync(DIR).filter((f) => f.endsWith('.txt'))
  const items: { slug: string; ko: string; en: string }[] = []
  const rejected: string[] = []

  for (const f of files) {
    const slug = f.slice(0, -4)
    const p = parse(readFileSync(DIR + '/' + f, 'utf8'))
    if (!p) { rejected.push(slug + ': KO/EN 줄 없음'); continue }
    const ko = trimTail(p.ko)
    const why = broken(slug, ko, p.en)
    if (why) { rejected.push(slug + ': ' + why); continue }
    items.push({ slug, ko, en: p.en })
  }

  // slug → profile_id
  const ids = new Map<string, string>()
  for (let i = 0; i < items.length; i += 200) {
    const { data, error } = await db.from('celebs').select('id, slug').in('slug', items.slice(i, i + 200).map((x) => x.slug))
    if (error) throw new Error(error.message)
    for (const r of data ?? []) ids.set(r.slug, r.id)
  }

  // 이미 안내가 있는 인물은 덮지 않는다
  const has = new Set<string>()
  const allIds = [...ids.values()]
  for (let i = 0; i < allIds.length; i += 200) {
    const { data } = await db.from('celeb_explanations').select('profile_id, plain_text').in('profile_id', allIds.slice(i, i + 200))
    for (const r of data ?? []) if (String(r.plain_text ?? '').trim()) has.add(r.profile_id)
  }

  const todo = items.filter((x) => ids.has(x.slug) && !has.has(ids.get(x.slug)!))
  const skipped = items.length - todo.length

  console.log('파일 ' + files.length + ' / 파싱 통과 ' + items.length + ' / 반려 ' + rejected.length)
  console.log('반영 대상 ' + todo.length + ' / 이미 있어 건너뜀 ' + skipped)
  for (const r of rejected.slice(0, 20)) console.log('  반려 ' + r)

  if (!APPLY) { console.log('\n[dry-run] --apply 를 붙이면 실제로 쓴다'); return }

  let ok = 0
  const fail: string[] = []
  for (const it of todo) {
    const pid = ids.get(it.slug)!
    const { error } = await db.from('celeb_explanations')
      // interpretive_* 는 NOT NULL 이라 값이 필요하다. 탐구는 2026-08-22에 화면에서 닫혀 노출되지 않는다.
      // 기존 신규 행이 쓰던 '미작성'을 그대로 따른다.
      .upsert({
        profile_id: pid,
        plain_text: it.ko,
        plain_text_en: it.en,
        interpretive_title: '미작성',
        interpretive_text: '미작성',
        review_status: 'ai_reviewed',
      }, { onConflict: 'profile_id' })
    if (error) fail.push(it.slug + ': ' + error.message)
    else ok++
  }
  console.log('\n반영 ' + ok + ' / 실패 ' + fail.length)
  for (const f of fail.slice(0, 10)) console.log('  ' + f)
}

main().catch((e) => { console.error(e?.message ?? e); process.exit(1) })
