/**
 * 연관(related)으로 들어간 창작 관계를 창작(authored)으로 올린다. 마이그레이션 20260907010000 뒤 한 번 돈다.
 * 화면이 저자 이름 비교로 「창작」을 가르던 것을 DB 값으로 옮기는 전환이라, 판정 기준도 화면이 쓰던 것과 같다 —
 * 작품의 ko·en 언어 카드나 판본의 저자 표기에 인물 이름(한국어·영어)이 들어 있으면 창작이다.
 * 위키데이터 P50 근거로 올리는 것은 wikidata-works-match.mjs --apply가 따로 한다.
 *
 * node --env-file=.env scripts/figure-books/mark-authored-relations.mjs          (dry-run)
 * node --env-file=.env scripts/figure-books/mark-authored-relations.mjs --apply
 */

import { allRows, dbClient, hasFlag, inChunks } from './lib/figure-work.mjs'

const apply = hasFlag('apply')
const AUTHOR_SUFFIX = /(?:\s+(?:지음|저|저자|글|씀)|\s*\((?:지은이|저자|지음|글|author)\))\s*$/iu
const AUTHOR_SEPARATOR = /[,;/|、]|\s+(?:·|&|and)\s+/iu

const normalizeName = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s.·ㆍ・∙•]/gu, '')
function authorName(value) {
  let name = String(value ?? '').normalize('NFKC').trim()
  for (;;) {
    const stripped = name.replace(AUTHOR_SUFFIX, '').trim()
    if (stripped === name) break
    name = stripped
  }
  return normalizeName(name)
}
function matchesAuthor(creator, figureNames) {
  if (figureNames.has(authorName(creator))) return true
  return String(creator).normalize('NFKC').split(AUTHOR_SEPARATOR).some((name) => figureNames.has(authorName(name)))
}

async function main() {
  const db = dbClient()
  const [relations, celebs] = await Promise.all([
    allRows('figure_book_characters', (f, t) => db.from('figure_book_characters').select('content_id,celeb_id,relation_type').eq('relation_type', 'related').order('content_id').order('celeb_id').range(f, t)),
    allRows('celebs', (f, t) => db.from('celebs').select('id,slug,nickname,nickname_en').order('id').range(f, t)),
  ])
  const celebById = new Map(celebs.map((row) => [row.id, row]))
  const contentIds = [...new Set(relations.map((row) => row.content_id))]
  const [locales, editions] = await Promise.all([
    inChunks(contentIds, 200, (ids) => db.from('content_locales').select('content_id,creator').in('content_id', ids)),
    inChunks(contentIds, 200, (ids) => db.from('figure_book_editions').select('content_id,creator').in('content_id', ids)),
  ])
  const creatorsByContent = new Map()
  for (const row of [...locales, ...editions]) {
    if (!row.creator) continue
    creatorsByContent.set(row.content_id, [...(creatorsByContent.get(row.content_id) ?? []), row.creator])
  }

  const targets = []
  for (const relation of relations) {
    const celeb = celebById.get(relation.celeb_id)
    if (!celeb) continue
    const figureNames = new Set([celeb.nickname, celeb.nickname_en].filter(Boolean).map(normalizeName).filter(Boolean))
    const creators = creatorsByContent.get(relation.content_id) ?? []
    if (creators.some((creator) => matchesAuthor(creator, figureNames))) targets.push({ ...relation, slug: celeb.slug, creator: creators[0] })
  }
  console.log(`연관 관계 ${relations.length} / 저자 표기가 인물과 맞아 창작으로 올릴 것 ${targets.length}`)
  for (const row of targets.slice(0, 15)) console.log(`  ${row.slug} ← ${row.creator}`)
  if (!apply) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  let done = 0
  for (const row of targets) {
    const { error } = await db.from('figure_book_characters').update({ relation_type: 'authored' }).eq('content_id', row.content_id).eq('celeb_id', row.celeb_id).eq('relation_type', 'related')
    if (error) { console.log(`  실패 ${row.slug} ${row.content_id}: ${error.message}`); continue }
    done += 1
  }
  console.log(`창작으로 올림 ${done} / ${targets.length}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
