import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { getKakaoBookByIsbn } from '@feelandnote/content-search/kakao-books'
import { getOpenLibraryBookMetadata } from '@feelandnote/content-search/openlibrary'

export interface ExternalBookInput {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

export function normalizeBookIdentity(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

export function sameBookIdentity(left: { title: string; creator: string }, right: { title: string; creator: string }): boolean {
  const title = normalizeBookIdentity(left.title)
  const creator = normalizeBookIdentity(left.creator)
  return !!title && !!creator && title === normalizeBookIdentity(right.title) && creator === normalizeBookIdentity(right.creator)
}

/** 판본 언어를 명시한 표현만 본다. ISBN 국가 코드나 일반 제목의 English는 언어 근거가 아니다. */
function explicitEditionLanguage(title: string): 'en' | 'other' | null {
  const english = /(?:(?:영문|영어)\s*(?:판(?:본)?|원서|원문)|\bEnglish\s+(?:language\s+)?edition\b)(?=\s*(?:$|[)\]）】,;]))/i
  const other = /(?:(?:프랑스어|독일어|스페인어|이탈리아어|일본어|중국어|러시아어|포르투갈어|라틴어|아랍어|히브리어|그리스어)\s*(?:판(?:본)?|원서|원문)|\b(?:French|German|Spanish|Italian|Japanese|Chinese|Russian|Portuguese|Latin|Arabic|Hebrew|Greek)\s+(?:language\s+)?edition\b)(?=\s*(?:$|[)\]）】,;]))/i
  if (other.test(title)) return 'other'
  return english.test(title) ? 'en' : null
}

/** 전달된 검색 객체 대신 같은 ISBN의 공식 응답으로 제목·원저자·표지·출판사를 한 번에 확인한다. */
export async function resolveExternalBookInput(
  input: ExternalBookInput,
  options: { getEnglishBookMetadata?: typeof getOpenLibraryBookMetadata } = {},
): Promise<ExternalBookInput & { locale: 'ko' | 'en' }> {
  if (!['kakao_book', 'openlibrary'].includes(input.externalSource)) throw new Error('도서 메타는 카카오 또는 OpenLibrary에서 확인해야 합니다')
  const isbn = toIsbn13(typeof input.metadata.isbn === 'string' ? input.metadata.isbn : input.externalId)
  if (!isbn) throw new Error('유효한 판본 ISBN이 필요합니다. 공급처 상품 코드는 ISBN으로 등록할 수 없습니다')
  const externalIsbn = toIsbn13(input.externalId)
  if (externalIsbn && externalIsbn !== isbn) throw new Error('선택한 외부 ID와 메타데이터 ISBN이 서로 다릅니다')
  let resolved: ExternalBookInput & { locale: 'ko' | 'en' }
  const lookupEnglishBook = options.getEnglishBookMetadata ?? getOpenLibraryBookMetadata
  if (input.externalSource === 'kakao_book') {
    const book = await getKakaoBookByIsbn(isbn)
    if (!book) throw new Error('해당 ISBN의 카카오 판본을 찾을 수 없습니다')
    const language = explicitEditionLanguage(book.title)
    if (language === 'other') {
      throw new Error('공식 제목에 명시된 외국어판을 한국어 또는 영어 판본으로 등록할 수 없습니다',
        { cause: { provider: 'kakao_book', isbn, officialBook: book } })
    }
    if (language === 'en') {
      try { resolved = await resolveEnglishBook(isbn, lookupEnglishBook) }
      catch (error) {
        throw new Error(`공식 제목에 명시된 영문판을 OpenLibrary의 영어 판본으로 확인할 수 없습니다: ${error instanceof Error ? error.message : '확인 실패'}`,
          { cause: { provider: 'kakao_book', isbn, officialBook: book, verificationError: error } })
      }
    } else if (/[가-힣]/.test(book.title) || /^(97889|97911)/.test(isbn)) {
      resolved = { ...book, metadata: { ...book.metadata }, locale: 'ko' }
    } else {
      // 카카오의 수입 원서가 영어라는 보장은 없다. 아래에서 실제 OL 판본 언어를 확인한다.
      resolved = await resolveEnglishBook(isbn, lookupEnglishBook)
    }
  } else resolved = await resolveEnglishBook(isbn, lookupEnglishBook)
  if (!resolved.title.trim() || !resolved.creator.trim() || typeof resolved.metadata.publisher !== 'string' || !resolved.metadata.publisher.trim()) {
    throw new Error('공급처에서 판본의 제목·원저자·출판사를 확인할 수 없습니다')
  }
  if (input.externalSource === 'openlibrary' && typeof input.metadata.editionKey === 'string') {
    // Search index titles/authors are provisional (subtitles can be omitted). Verify the selected
    // edition and work against the ISBN response, then use only that response's canonical metadata.
    if (input.metadata.editionKey !== resolved.metadata.editionKey || input.metadata.workKey !== resolved.metadata.workKey) {
      throw new Error('선택한 OpenLibrary 판본과 ISBN의 작품이 다릅니다. 판본을 다시 확인하세요')
    }
  } else if (!sameBookIdentity(input, resolved)) throw new Error('ISBN의 제목·원저자가 선택한 작품과 다릅니다. 판본을 다시 확인하세요')
  return resolved
}

async function resolveEnglishBook(isbn: string, lookup: typeof getOpenLibraryBookMetadata): Promise<ExternalBookInput & { locale: 'en' }> {
  const book = await lookup(isbn)
  if (!book) throw new Error('해당 ISBN의 OpenLibrary 판본을 찾을 수 없습니다')
  return {
    externalId: book.isbn, externalSource: 'openlibrary', locale: 'en',
    title: book.title, creator: book.creator, coverImageUrl: book.coverImageUrl,
    metadata: { isbn: book.isbn, publisher: book.publisher, publishDate: book.publishDate, link: book.sourceUrl, editionKey: new URL(book.sourceUrl).pathname, workKey: book.workKey, workTitle: book.workTitle ?? null, languages: book.languages, physical_format: book.physicalFormat ?? null },
  }
}
