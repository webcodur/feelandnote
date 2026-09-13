/**
 * 작품 기준 조사의 대상 목록과 대조표를 만든다. 읽기 전용이다.
 *
 * 브라우저 채팅 경로(docs/resource/browser-chat-automation.md)로 조사할 때 쓴다.
 * 모델에는 책 이름만 주고, 돌아온 인물명을 여기서 만든 등록 인물 색인과 대조한다.
 * 스킬이 못 박은 것 — 모델이 뱉은 인물명은 반드시 등록 명단과 대조한다. 안 그러면
 * 서비스에 없는 인물이 섞이고 동명이인이 붙는다.
 *
 * 실행 (sw/web-bo 에서):
 *   node --env-file=.env scripts/figure-books/by-work-targets.mjs --group 10
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d }
const GROUP = Number(arg('group', 10))
const OUT_DIR = resolve(process.cwd(), '../../data/celeb/figure-books')

// 한 권에 여러 인물이 실릴 만한 책만 연다. 개인 단독 전기는 인물 기준에서 이미 끝났다.
const MULTI = /(열전|전집|영웅전|평전\s*(모음|집)|인물|위인|사기|사서|실록|왕조|황제|장군|명장|재상|철학자|과학자|예술가|작가|시인|화가|음악가|수학자|발명가|탐험가|혁명가|리더|거장|천재|세계사|역사|신화|전설|서사시|이야기|100인|인물전|군상|가문|형제|가족|세대|학파|사단|조직|제국|왕국|왕가)/

async function all(table, cols, tune) {
  const out = []
  for (let f = 0; ; f += 1000) {
    let q = db.from(table).select(cols).range(f, f + 999)
    if (tune) q = tune(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

const norm = (v) => String(v ?? '').toLowerCase().replace(/[\s·,()[\]{}'"·’-]/g, '')

async function main() {
  const relations = await all('figure_book_characters', 'content_id,celeb_id', (q) => q.eq('relation_type', 'appearance'))
  const contentIds = [...new Set(relations.map((r) => r.content_id))]
  const locales = []
  for (let i = 0; i < contentIds.length; i += 200) {
    const { data, error } = await db.from('content_locales').select('content_id,title,creator')
      .eq('locale', 'ko').in('content_id', contentIds.slice(i, i + 200))
    if (error) throw new Error(error.message)
    locales.push(...(data ?? []))
  }
  const linked = new Map()
  for (const r of relations) linked.set(r.content_id, [...(linked.get(r.content_id) ?? []), r.celeb_id])

  const works = locales
    .filter((r) => MULTI.test(r.title ?? ''))
    .map((r) => ({ contentId: r.content_id, title: r.title, creator: r.creator, linkedCount: (linked.get(r.content_id) ?? []).length }))
    .sort((a, b) => b.linkedCount - a.linkedCount || a.title.localeCompare(b.title))

  // 등록 인물 색인 — 모델 응답을 대조할 이름표
  const celebs = await all('celebs', 'id,slug,nickname,nickname_en')
  const index = {}
  for (const c of celebs) {
    for (const name of [c.nickname, c.nickname_en]) {
      const k = norm(name)
      if (k.length >= 2) (index[k] ??= []).push({ slug: c.slug, nickname: c.nickname })
    }
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(resolve(OUT_DIR, 'by-work-index.json'), JSON.stringify({ index, works }, null, 1), 'utf8')

  const batches = []
  for (let i = 0; i < works.length; i += GROUP) {
    batches.push(works.slice(i, i + GROUP).map((w) => `${w.title}${w.creator ? `(${w.creator})` : ''}`).join(' / '))
  }
  writeFileSync(resolve(OUT_DIR, 'by-work-batches.txt'), batches.join('\n'), 'utf8')
  console.log(`대상 ${works.length}권 / ${batches.length}묶음 (묶음당 ${GROUP}권)`)
  console.log(`등록 인물 색인 ${Object.keys(index).length}개 이름`)
  console.log(`\n1묶음: ${batches[0]}`)
}

main()
