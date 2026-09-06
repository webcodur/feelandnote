/**
 * 정체성이 비어 있는 인물 도서 작품에 3순위 국내서 정체성(book/<ISBN>)을 준다.
 * 예전 방식으로 인물 도서에 지정된 일반 BOOK은 metadata.figureBook이 없어 같은 책이 다시 들어와도 알아보지 못한다.
 * ISBN은 ko 언어 카드 → en 언어 카드 → contents.external_id 순으로 고른다. 어디에도 없으면 보고만 한다.
 * 1·2순위(위키데이터 작품·원작)로 올리는 것은 wikidata-works-match.mjs와 translated-original-work.mjs가 한다.
 *
 * node --env-file=.env scripts/figure-books/assign-domestic-identity.mjs          (dry-run)
 * node --env-file=.env scripts/figure-books/assign-domestic-identity.mjs --apply
 */

import { allRows, bareIsbn, dbClient, hasFlag, inChunks } from './lib/figure-work.mjs'

const apply = hasFlag('apply')

async function main() {
  const db = dbClient()
  const [contents, figureBooks] = await Promise.all([
    allRows('contents', (f, t) => db.from('contents').select('id,external_id,metadata').eq('type', 'BOOK').order('id').range(f, t)),
    allRows('figure_book_contents', (f, t) => db.from('figure_book_contents').select('content_id').order('content_id').range(f, t)),
  ])
  const designated = new Set(figureBooks.map((row) => row.content_id))
  const missing = contents.filter((row) => designated.has(row.id) && !row.metadata?.figureBook?.workIdentity)
  const locales = await inChunks(missing.map((row) => row.id), 200, (ids) => db.from('content_locales').select('content_id,locale,title,creator,isbn').in('content_id', ids))
  const byContent = new Map()
  for (const row of locales) byContent.set(row.content_id, [...(byContent.get(row.content_id) ?? []), row])

  const plans = []
  const noIsbn = []
  for (const row of missing) {
    const cards = byContent.get(row.id) ?? []
    const ko = cards.find((card) => card.locale === 'ko')
    const en = cards.find((card) => card.locale === 'en')
    const isbn = [ko?.isbn, en?.isbn, row.external_id].map((value) => bareIsbn(String(value ?? '').split(' ').find((v) => v.length === 13) ?? value)).find((value) => value.length === 13 || value.length === 10)
    if (!isbn) { noIsbn.push({ id: row.id, title: ko?.title ?? en?.title ?? '' }); continue }
    const metadata = row.metadata ?? {}
    plans.push({
      id: row.id,
      metadata: {
        ...metadata,
        figureBook: {
          ...(metadata.figureBook ?? {}),
          workTitle: ko?.title ?? en?.title ?? null,
          workCreator: ko?.creator ?? en?.creator ?? null,
          workIdentity: `book/${isbn}`,
          koTranslationStatus: ko ? 'published' : 'unknown',
        },
      },
    })
  }
  console.log(`정체성 없는 인물 도서 작품 ${missing.length} / 국내서 정체성 부여 ${plans.length} / ISBN 없음 ${noIsbn.length}`)
  for (const row of noIsbn.slice(0, 10)) console.log(`  ISBN 없음: ${row.title} (${row.id.slice(0, 8)})`)
  if (!apply) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  let done = 0
  for (const plan of plans) {
    const { error } = await db.from('contents').update({ metadata: plan.metadata }).eq('id', plan.id)
    if (error) { console.log(`  실패 ${plan.id}: ${error.message}`); continue }
    done += 1
  }
  console.log(`정체성 부여 ${done} / ${plans.length}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
