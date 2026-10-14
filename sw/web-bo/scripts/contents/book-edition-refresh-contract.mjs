import { toIsbn13 } from '../../../../packages/content-search/src/book-isbn.ts'

const identity = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
const authorNames = value => String(value ?? '').split(/[,;/]/).map(identity).filter(Boolean)

/** 후보 탐색과 저장 계획 재실행 모두 같은 ISBN·제목·원저자를 확인한다. */
export function buildKakaoEditionReplacement(stored, requestedIsbn, document) {
  const isbn = toIsbn13(String(requestedIsbn ?? ''))
  if (!isbn || !String(document?.isbn ?? '').split(/\s+/).some(value => toIsbn13(value) === isbn)) throw new Error('교체 ISBN과 카카오 응답이 다릅니다')
  if (!identity(stored?.title) || identity(stored.title) !== identity(document.title)) throw new Error('교체 판본 제목이 저장된 작품과 다릅니다')
  const expectedAuthors = authorNames(stored.creator)
  const actualAuthors = (document.authors ?? []).map(identity).filter(Boolean)
  if (!expectedAuthors.length || !actualAuthors.length || expectedAuthors.length !== actualAuthors.length || !expectedAuthors.every(name => actualAuthors.includes(name))) throw new Error('교체 판본 원저자가 저장된 작품과 다릅니다')
  if (!String(document.publisher ?? '').trim()) throw new Error('교체 판본 출판사를 확인할 수 없습니다')
  if (/절판|품절/.test(String(document.status ?? ''))) throw new Error('교체 판본이 절판 또는 품절입니다')
  let thumbnailUrl = null
  if (document.thumbnail) {
    try {
      const thumbnail = new URL(document.thumbnail)
      const source = new URL(thumbnail.searchParams.get('fname') ?? thumbnail.href)
      if (['http:', 'https:'].includes(source.protocol)) { source.protocol = 'https:'; thumbnailUrl = source.href }
    } catch { /* 확인할 수 없는 새 표지는 빈 값으로 둔다. 옛 판본 표지를 복사하지 않는다. */ }
  }
  return { isbn, title: document.title.trim(), creator: document.authors.join(', '), publisher: document.publisher.trim(), thumbnail_url: thumbnailUrl }
}
