/**
 * Naver API ISBN 검색 결과와 DB 제목 대조 검증
 */
import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve('sw/web/.env') })

const CID = process.env.NAVER_CLIENT_ID
const CSC = process.env.NAVER_CLIENT_SECRET

const books = [
  ['고백','9788970139043'],
  ['금융의 연금술','9791130677071'],
  ['난정서','9788981458935'],
  ['르 시드','9788952243515'],
  ['리스크','9788947526883'],
  ['빅서','9788970758930'],
  ['순수와 경험의 노래','9788954620208'],
  ['에밀리아 갈로티','9791128836398'],
  ['울부짖음','9788937461781'],
  ['워런 버핏, 위대한 자본가의 탄생','9788986022773'],
  ['워런 버핏만 알고 있는 주식투자의 비밀','9788994491615'],
  ['이태백 명시문 선집','9788962923551'],
  ['일뤼미나시옹','9788937460760'],
  ['지옥에서 보낸 한 철','9788937460753'],
]

for (const [title, isbn] of books) {
  const res = await fetch(`https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${isbn}`, {
    headers: { 'X-Naver-Client-Id': CID, 'X-Naver-Client-Secret': CSC }
  })
  const d = await res.json()
  const item = d.items?.[0]
  if (!item) { console.log(`NOT_FOUND | ${title}`); continue }
  const apiTitle = item.title.replace(/<[^>]*>/g, '')
  console.log(`${title} => ${apiTitle} | ${item.image?.slice(-40) || 'NO_IMG'}`)
}
