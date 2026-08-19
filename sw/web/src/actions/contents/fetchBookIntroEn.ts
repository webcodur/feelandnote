/*
  파일명: /actions/contents/fetchBookIntroEn.ts
  기능: 영문 화면에 실을 도서 소개를 원서 ISBN으로 조달한다.
  책임: 카카오가 한국어 소개만 주는 자리를 메운다. 국문 화면은 이 경로를 쓰지 않는다.
*/ // ------------------------------
'use server'

import { unstable_cache } from 'next/cache'
import { getBookDescriptionByIsbn } from '@feelandnote/content-search/openlibrary'
import { STATIC_REVALIDATE } from '@/lib/cache'

const getCachedBookIntroEn = unstable_cache(
  (isbn: string) => getBookDescriptionByIsbn(isbn),
  ['book-intro-en-openlibrary-v1'],
  { revalidate: STATIC_REVALIDATE },
)

/**
 * 원서 ISBN으로 영문 도서 소개를 가져온다. 없으면 null.
 *
 * 실측(26.08.19) 기준 원서 ISBN 절반가량이 소개를 갖고 있다. 한국어판 ISBN으로는 거의 걸리지 않으므로
 * 부르는 쪽에서 en 로케일의 ISBN을 넘긴다.
 */
export async function fetchBookIntroEn(isbn: string | null | undefined): Promise<string | null> {
  if (!isbn) return null
  try {
    return await getCachedBookIntroEn(isbn)
  } catch (error) {
    console.error('[fetchBookIntroEn]', isbn, error)
    return null
  }
}
