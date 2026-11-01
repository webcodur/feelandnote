import { bookEditionTitleKey } from './book-series'

type OriginalAuthorContext = { workKey: string | null; editionKey: string | null; isbn: string | null }

// 실사한 이 종이판은 Melissa Hill의 단독 저작이다. OL의 세 항목은 중복 이름/도치 표기다.
// https://www.sourcebooks.com/9781728267517-something-from-tiffanys-movie-tie-in-edition-tp.html
// https://openlibrary.org/authors/OL1420114A.json
// https://openlibrary.org/authors/OL7100156A.json
// https://openlibrary.org/authors/OL11582732A.json
const TIFFANYS_AUTHOR_KEYS = ['/authors/OL1420114A', '/authors/OL7100156A', '/authors/OL11582732A'] as const

// My Story의 검수한 영어판은 Ingrid Bergman과 Alan Burgess의 공저다.
// https://openlibrary.org/books/OL33459068M.json
// https://openlibrary.org/works/OL25145419W.json
// 원전의 Burgess 항목은 생몰(1915–1998)과 Bergman 회고록 공저 이력을 명시한다.
// https://openlibrary.org/authors/OL12242479A.json
// https://openlibrary.org/authors/OL596986A.json
const MY_STORY_EDITION_AUTHORS = ['/authors/OL1235607A', '/authors/OL596986A'] as const
const MY_STORY_WORK_AUTHORS = ['/authors/OL1235607A', '/authors/OL12242479A'] as const

// 연결 원전의 저자 목록에 낭독자나 같은 사람의 중복 표기가 섞인 원전. 판본 저자가 원전 실저자 전원이고,
// 원전에만 있는 항목이 아래 검수한 키뿐일 때만 판본 저자를 원저자로 쓴다.
const REVIEWED_EXTRA_WORK_AUTHORS: Readonly<Record<string, { authors: readonly string[]; extras: readonly string[] }>> = {
  // A Kind of Freedom: Margaret Wilkerson Sexton 단독 저작. 나머지 세 사람은 오디오북 낭독자다.
  // https://www.counterpointpress.com/books/a-kind-of-freedom-2/
  // https://www.blackstonelibrary.com/catalog/product/view/id/30321/s/a-kind-of-freedom/category/8/
  '/works/OL19719476W': { authors: ['/authors/OL7525383A'], extras: ['/authors/OL8109473A', '/authors/OL7938864A', '/authors/OL7989906A'] },
  // The Miracle of Castel di Sangro: Joe McGinniss 단독 저작. OL2853063A는 같은 사람의 소문자 표기다.
  // https://openlibrary.org/works/OL3928916W.json · https://www.hachettebookgroup.com/titles/joe-mcginniss/the-miracle-of-castel-di-sangro/9780316557368/
  '/works/OL3928916W': { authors: ['/authors/OL715808A'], extras: ['/authors/OL2853063A'] },
  // Less Than Zero: Bret Easton Ellis 단독 저작. Christian Rummel은 오디오북 낭독자다.
  // https://openlibrary.org/works/OL1812917W.json · https://www.penguinrandomhouse.com/books/46021/less-than-zero-by-bret-easton-ellis/
  '/works/OL1812917W': { authors: ['/authors/OL217475A'], extras: ['/authors/OL7303599A'] },
  // Relic: Douglas Preston·Lincoln Child 공저. OL7874065A는 두 사람을 한 이름으로 합친 중복 항목이다.
  // https://openlibrary.org/works/OL8135504W.json · https://us.macmillan.com/books/9780812543261/relic/
  '/works/OL8135504W': { authors: ['/authors/OL39115A', '/authors/OL1392769A'], extras: ['/authors/OL7874065A'] },
  // Radical Chic & Mau-Mauing the Flak Catchers: Tom Wolfe 단독 저작. Harold N. Cropp은 다른 판의 낭독자, David Brooks는 2024년 Picador판 서문 필자다.
  // https://openlibrary.org/works/OL1925473W.json · https://us.macmillan.com/books/9781250321886/radicalchicandmaumauingtheflakcatchers/
  '/works/OL1925473W': { authors: ['/authors/OL230834A'], extras: ['/authors/OL9102398A', '/authors/OL2589896A'] },
}

/** 서로 다른 판의 인물이 연결 원전의 저자 목록에 섞이면 자동 선택하지 않는다. */
export function getBookOriginalAuthorKeys(
  editionAuthors: readonly string[], workAuthors: readonly string[], context?: OriginalAuthorContext,
): string[] | null {
  // 같은 신간의 Kiran Desai 중복 저자 ID. 출판사가 이 ISBN의 저자를 확인한다.
  // https://www.penguin.co.uk/books/471012/the-loneliness-of-sonia-and-sunny-by-desai-kiran/9780241770825
  if (context?.workKey === '/works/OL42397165W' && context.editionKey === '/books/OL57521454M'
    && context.isbn === '9780241770825' && editionAuthors.length === 1 && workAuthors.length === 1
    && editionAuthors[0] === '/authors/OL13646946A' && workAuthors[0] === '/authors/OL20133A') return [...workAuthors]
  if (context?.workKey === '/works/OL25145419W' && context.editionKey === '/books/OL33459068M'
    && context.isbn === '9780751597134' && editionAuthors.length === MY_STORY_EDITION_AUTHORS.length
    && MY_STORY_EDITION_AUTHORS.every(key => editionAuthors.includes(key))
    && workAuthors.length === MY_STORY_WORK_AUTHORS.length
    && MY_STORY_WORK_AUTHORS.every(key => workAuthors.includes(key))) return [...MY_STORY_EDITION_AUTHORS]
  if (context?.workKey === '/works/OL16565784W' && context.editionKey === '/books/OL38063276M'
    && context.isbn === '9781728267517' && editionAuthors.length === 1
    && editionAuthors[0] === TIFFANYS_AUTHOR_KEYS[0] && workAuthors.length === TIFFANYS_AUTHOR_KEYS.length
    && TIFFANYS_AUTHOR_KEYS.every(key => workAuthors.includes(key))) return [TIFFANYS_AUTHOR_KEYS[0]]
  const reviewed = context?.workKey ? REVIEWED_EXTRA_WORK_AUTHORS[context.workKey] : undefined
  // 출판사가 확인한 Hardcover 판본에는 OL 저자 목록이 비어 있다. 이 정확한 판본의 검수한 목록만 보완한다.
  if (context?.workKey === '/works/OL19719476W' && context.editionKey === '/books/OL27896740M'
    && context.isbn === '9781619029224' && !editionAuthors.length && workAuthors.length === 4
    && reviewed && [...reviewed.authors, ...reviewed.extras].every(key => workAuthors.includes(key))) return [...reviewed.authors]
  if (reviewed && reviewed.authors.every(key => workAuthors.includes(key)) && reviewed.extras.every(key => workAuthors.includes(key))
    && workAuthors.every(key => reviewed.authors.includes(key) || reviewed.extras.includes(key))
    && editionAuthors.every(key => reviewed.authors.includes(key) || reviewed.extras.includes(key))
    && reviewed.authors.every(key => editionAuthors.includes(key) || reviewed.extras.some(extra => editionAuthors.includes(extra)))) return [...reviewed.authors]
  if (workAuthors.length && editionAuthors.length && workAuthors.some(key => !editionAuthors.includes(key))) return null
  return [...new Set(workAuthors.length ? workAuthors : editionAuthors)]
}

/** 원작에 소개가 있어도 다른 본문의 판본에 복사하지 않는다. ISBN 연결만으로는 충분하지 않다. */
export function canUseBookWorkIntroduction(
  editionTitle: string | null | undefined, editionAuthors: readonly string[],
  workTitle: string | null | undefined, workAuthors: readonly string[],
  context?: OriginalAuthorContext,
): boolean {
  return Boolean(editionTitle && workTitle && editionAuthors.length && workAuthors.length
    && bookEditionTitleKey(editionTitle) === bookEditionTitleKey(workTitle)
    && getBookOriginalAuthorKeys(editionAuthors, workAuthors, context)?.length)
}
