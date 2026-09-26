import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import { normalizePurchaseIsbn } from './yes24Purchase'

export interface BookPurchaseRecord {
  contentId: string
  type: string
  locale: string
  editionId?: number
  isbn?: string | null
  title?: string | null
  creator?: string | null
}

export const BOOK_PURCHASE_REDIRECT_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const

export function getBookPurchaseFallback(contentId: string): string {
  return `/content/${encodeURIComponent(contentId)}?category=book`
}

function yes24Search(record: BookPurchaseRecord): string {
  const isbn = normalizePurchaseIsbn(record.isbn)
  const query = isbn ?? [record.title, record.creator].filter(value => typeof value === 'string' && value.trim()).join(' ').trim()
  if (!query) return getBookPurchaseFallback(record.contentId)
  // Same official search path used by constants/platformLinks.ts; encode title/author safely.
  const url = new URL('https://www.yes24.com/Product/Search')
  url.search = new URLSearchParams({ domain: 'BOOK', query }).toString()
  return url.href
}

/** 링크프라이스 매체 추적 ID — 링크에 항상 드러나는 공개 값이라 상수로 둔다. 머천트 kbbook(인터넷교보문고) 자동승인 완료 */
export const LINKPRICE_TRACKING_ID = 'A100707726'

/** 링크프라이스 coupang 머천트는 수동승인 — 2026-09-26에도 승인대기 확인. 승인완료가 확인되면 true로 바꾼다.
    미승인 동안 쿠팡 단추는 수수료 없는 일반 검색 주소로 서고, 승인되면 같은 자리가 linkmoa 제휴 링크로 바뀐다 */
export const LINKPRICE_COUPANG_APPROVED = false

type LinkPriceMerchant = 'kbbook' | 'coupang'

/** 링크프라이스 딥링크 — tu가 최종 목적지. 딥링크는 AC가 만들어 준 형식 그대로다 */
export function linkPriceUrl(merchant: LinkPriceMerchant, destination: string): string {
  const url = new URL('https://linkmoa.kr/click.php')
  url.search = new URLSearchParams({ m: merchant, a: LINKPRICE_TRACKING_ID, l: '9999', l_cd1: '3', l_cd2: '0', tu: destination }).toString()
  return url.href
}

/** 예스24 애드온이 단 제휴 주소인가 — apis.yes24.com/a/<userKey>/goods/<상품번호> 형태만 수수료가 붙는다 */
export function isYes24AffiliateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'apis.yes24.com' && parsed.pathname.startsWith('/a/')
  } catch { return false }
}

/** 우리가 만든 링크프라이스 경유 주소인가 — 제휴 링크 표시(sponsored) 판별에 쓴다 */
export function isLinkPriceUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'linkmoa.kr' && parsed.pathname === '/click.php'
      && parsed.searchParams.get('a') === LINKPRICE_TRACKING_ID
  } catch { return false }
}

/** 교보문고 상품 주소는 자체 상품번호(S…)라 ISBN으로 못 만든다.
    barcode 인자를 단 detailViewKor 주소가 서점 서버에서 같은 ISBN의 상품 페이지로 넘겨준다.
    만들어진 주소는 링크프라이스 딥링크로 감싸 수수료가 잡히게 한다(최대 3.5%, 인정 1일, 앱 제외). */
export function kyoboBookLink(record: Pick<BookPurchaseRecord, 'isbn' | 'title' | 'creator'>): AffiliateLink | null {
  const isbn = normalizePurchaseIsbn(record.isbn)
  if (isbn) {
    const url = new URL('https://www.kyobobook.co.kr/product/detailViewKor.laf')
    url.search = new URLSearchParams({ ejkGb: 'KOR', mallGb: 'KOR', barcode: isbn }).toString()
    return { platform: 'kyobo', url: linkPriceUrl('kbbook', url.href) }
  }
  const query = [record.title, record.creator].filter(value => typeof value === 'string' && value.trim()).join(' ').trim()
  if (!query) return null
  // Same official search path used by constants/platformLinks.ts.
  const url = new URL('https://search.kyobobook.co.kr/search')
  url.search = new URLSearchParams({ keyword: query }).toString()
  return { platform: 'kyobo', url: linkPriceUrl('kbbook', url.href), linkKind: 'search' }
}

/** 쿠팡 상품 주소도 자체 상품번호라 ISBN으로 못 만든다 — ISBN·제목 검색 페이지로 잇는다.
    머천트 승인대기 동안은 수수료 없는 일반 검색 주소로 세우고, 승인이 확인되면 플래그 하나로
    linkmoa 딥링크로 갈아탄다 — AC가 인정한 딥링크 대상에 검색결과 페이지가 포함된다(실적인정 1일, 앱 포함 2.1%). */
export function coupangBookLink(record: Pick<BookPurchaseRecord, 'isbn' | 'title' | 'creator'>): AffiliateLink | null {
  const query = normalizePurchaseIsbn(record.isbn)
    ?? [record.title, record.creator].filter(value => typeof value === 'string' && value.trim()).join(' ').trim()
  if (!query) return null
  const url = new URL('https://www.coupang.com/np/search')
  url.search = new URLSearchParams({ q: query }).toString()
  return LINKPRICE_COUPANG_APPROVED
    ? { platform: 'coupang', url: linkPriceUrl('coupang', url.href), linkKind: 'search' }
    : { platform: 'coupang', url: url.href, linkKind: 'search' }
}

/** 알라딘은 수익 계약이 없다 — TTB·링크프라이스가 열리기 전까지 서점 선택지로만 세우는 일반 링크다.
    저장 ISBN은 서점이 상품 페이지로 넘겨주는 wproduct 주소로, 없으면 제목·저자 검색으로 잇는다 */
export function aladinBookLink(record: Pick<BookPurchaseRecord, 'isbn' | 'title' | 'creator'>): AffiliateLink | null {
  const isbn = normalizePurchaseIsbn(record.isbn)
  if (isbn) {
    const url = new URL('https://www.aladin.co.kr/shop/wproduct.aspx')
    url.search = new URLSearchParams({ ISBN: isbn }).toString()
    return { platform: 'aladin', url: url.href }
  }
  const query = [record.title, record.creator].filter(value => typeof value === 'string' && value.trim()).join(' ').trim()
  if (!query) return null
  const url = new URL('https://www.aladin.co.kr/search/wsearchresult.aspx')
  url.search = new URLSearchParams({ SearchTarget: 'Book', SearchWord: query }).toString()
  return { platform: 'aladin', url: url.href, linkKind: 'search' }
}

/** 소속이 어긋난 기록은 null — 다른 판본을 대신 파는 폴백은 두지 않는다 */
function usableKoBookRecord(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
): record is BookPurchaseRecord {
  return Boolean(record) && record!.contentId === contentId && record!.type === 'BOOK'
    && record!.locale === 'ko' && record!.editionId === editionId
}

/** Return null for mismatched ownership; never buy a different edition as a fallback. */
export async function resolveBookPurchaseRedirect(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
  getYes24: () => Promise<AffiliateLink | null>,
): Promise<string | null> {
  if (!usableKoBookRecord(contentId, editionId, record)) return null
  try {
    const yes24 = await getYes24()
    if (yes24?.platform === 'yes24') return yes24.url // The ISBN lookup validates the exact YES24 product URL.
  } catch { /* The same seller's search remains usable when its API is unavailable. */ }
  return yes24Search(record)
}

/** 교보문고는 별도 상품 조회 API가 없다 — 저장 ISBN은 바코드 상품 주소로, 없으면 제목·저자 검색으로 잇는다 */
export function resolveKyoboPurchaseRedirect(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
): string | null {
  if (!usableKoBookRecord(contentId, editionId, record)) return null
  return kyoboBookLink(record)?.url ?? getBookPurchaseFallback(contentId)
}

/** 쿠팡은 승인 여부와 무관하게 검색 페이지로 잇는다 — 미승인이면 일반 주소, 승인이면 링크프라이스 경유다 */
export function resolveCoupangPurchaseRedirect(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
): string | null {
  if (!usableKoBookRecord(contentId, editionId, record)) return null
  return coupangBookLink(record)?.url ?? getBookPurchaseFallback(contentId)
}

/** 알라딘은 제휴가 없어 경유도 일반 링크로 끝난다 — 나중에 제휴가 붙으면 같은 경유가 갈아탄다 */
export function resolveAladinPurchaseRedirect(
  contentId: string,
  editionId: number | undefined,
  record: BookPurchaseRecord | null,
): string | null {
  if (!usableKoBookRecord(contentId, editionId, record)) return null
  return aladinBookLink(record)?.url ?? getBookPurchaseFallback(contentId)
}

/** 이 링크에 수수료가 실제로 붙는가 — 고지·sponsored 표시는 플랫폼 이름이 아니라 이 판별로만 가른다.
    경유 주소(/api/books/purchase)는 서버가 풀 목적지라 플랫폼 규칙으로 판정한다:
    아마존은 렌더 시 태그를 얹고, 교보는 모든 주소가 linkmoa, 쿠팡은 머천트 승인이 확인된 뒤만 제휴다 */
export function isAffiliatePurchaseLink(link: AffiliateLink): boolean {
  if (link.platform === 'amazon' || link.platform === 'kyobo') return true
  if (link.platform === 'coupang') return LINKPRICE_COUPANG_APPROVED || isLinkPriceUrl(link.url)
  return isYes24AffiliateUrl(link.url) || isLinkPriceUrl(link.url)
}
