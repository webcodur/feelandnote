/**
 * DB에 없는 픽션 원전의 네이버 도서 후보를 찾는 읽기 전용 보조 도구.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/search-naver-fiction-sources.ts \
 *     --queries "아르고나우티카,봉신연의,고사기"
 */

import { searchBooks } from '@feelandnote/content-search/naver-books'

const index = process.argv.indexOf('--queries')
const queries = index >= 0
  ? (process.argv[index + 1] ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  : []
if (!queries.length) throw new Error('--queries "검색어,검색어"가 필요합니다.')

async function main() {
  const report: Record<string, unknown> = {}
  for (const query of queries) {
    const result = await searchBooks(query)
    report[query] = {
      total: result.total,
      items: result.items.map((item) => ({
        externalId: item.externalId,
        title: item.title,
        creator: item.creator,
        coverImageUrl: item.coverImageUrl,
        metadata: item.metadata,
      })),
    }
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
