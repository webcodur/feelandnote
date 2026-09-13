/**
 * 역조회 불일치 중 저자 불일치 건의 관계 맥락 수집 — 읽기 전용.
 * node --env-file=.env scripts/figure-books/roundtrip-review-prep.mjs
 * 결과: data/celeb/figure-books/roundtrip-review.jsonl
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dbClient } from './lib/figure-work.mjs'
import { readFileSync } from 'node:fs'

async function main() {
  const db = dbClient()
  const out = []
  for (const line of readFileSync(resolve(process.cwd(), '../../data/celeb/figure-books/locale-roundtrip-verdicts.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line)
    if (r.verdict !== 'MISMATCH') continue
    const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '')
    const ca = norm(r.cardCreator)
    const ka = norm((r.kakaoAuthors ?? []).join(','))
    const hit = ca && ka && (ca.includes(ka) || ka.includes(ca))
    if (hit) continue // 같은 저작의 표기 차이 — 정상
    const id = r.content_id
    const [{ data: cc }, { data: fb }, { data: en }] = await Promise.all([
      db.from('celeb_contents').select('celeb_id,status,review,source_url').eq('content_id', id).limit(5),
      db.from('figure_book_characters').select('celeb_id,relation_type').eq('content_id', id).limit(10),
      db.from('content_locales').select('locale,title,creator,isbn').eq('content_id', id),
    ])
    let celebs = {}
    const cids = [...new Set([...(cc ?? []).map((x) => x.celeb_id), ...(fb ?? []).map((x) => x.celeb_id)])]
    if (cids.length > 0) {
      const { data: cs } = await db.from('celebs').select('id,nickname').in('id', cids)
      for (const c of cs ?? []) celebs[c.id] = c.nickname
    }
    out.push({
      content_id: id, isbn: r.isbn,
      card: { title: r.cardTitle, creator: r.cardCreator },
      kakao: { title: r.kakaoTitle, authors: r.kakaoAuthors, publisher: r.kakaoPublisher, status: r.kakaoStatus },
      enCard: (en ?? []).find((x) => x.locale === 'en') ?? null,
      celeb_contents: (cc ?? []).map((x) => ({ celeb: celebs[x.celeb_id], status: x.status, review: (x.review ?? '').slice(0, 200), source_url: x.source_url })),
      figure_books: (fb ?? []).map((x) => ({ celeb: celebs[x.celeb_id], relation: x.relation_type })),
    })
  }
  writeFileSync(resolve(process.cwd(), '../../data/celeb/figure-books/roundtrip-review.jsonl'),
    `${out.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8')
  console.log(`review 대상 ${out.length}`)
}

void main().catch((e) => { console.error(e); process.exitCode = 1 })
