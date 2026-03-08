import dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve('sw/web/.env') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const CID = process.env.NAVER_CLIENT_ID
const CSC = process.env.NAVER_CLIENT_SECRET

const books = [
  { id: '545b31a8-02f3-4cd8-930f-e912be203f2b', title: '고백', author: '장 자크 루소' },
  { id: '3e367046-69a3-4c95-98c1-e5606135ab18', title: '울부짖음', author: '앨런 긴즈버그' },
  { id: '6ddf69ab-39b1-4377-be1d-98bc03920203', title: '야생의 소년들', author: '윌리엄 S. 버로스' },
]

for (const book of books) {
  // 제목+저자 결합 검색
  const q = encodeURIComponent(book.title + ' ' + book.author)
  const res = await fetch(`https://openapi.naver.com/v1/search/book.json?query=${q}&display=5`, {
    headers: { 'X-Naver-Client-Id': CID, 'X-Naver-Client-Secret': CSC }
  })
  const d = await res.json()

  console.log(`\n[${book.title} - ${book.author}]`)
  if (!d.items || d.items.length === 0) {
    console.log('  => NOT FOUND')
    continue
  }

  // 저자명 매칭 우선
  let matched = null
  for (const item of d.items) {
    const apiTitle = item.title.replace(/<[^>]*>/g, '')
    const apiAuthor = item.author.replace(/<[^>]*>/g, '')
    const authorMatch = apiAuthor.includes(book.author.slice(0, 3))
    console.log(`  ${apiTitle} | ${apiAuthor} | img=${item.image ? 'Y' : 'N'} | authorMatch=${authorMatch}`)
    if (authorMatch && item.image && !matched) {
      matched = { title: apiTitle, image: item.image }
    }
  }

  if (matched) {
    // URL 생존 확인
    const check = await fetch(matched.image, { method: 'HEAD' })
    if (check.ok) {
      const { error } = await sb.from('content_locales')
        .update({ thumbnail_url: matched.image, updated_at: new Date().toISOString() })
        .eq('content_id', book.id).eq('locale', 'ko')
      console.log(error ? `  => DB ERR: ${error.message}` : `  => UPDATED: ${matched.title}`)
    } else {
      console.log(`  => URL DEAD: ${matched.image}`)
    }
  } else {
    console.log('  => NO AUTHOR MATCH')
  }
}
