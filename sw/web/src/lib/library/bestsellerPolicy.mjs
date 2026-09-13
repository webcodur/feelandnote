// 수집기와 웹이 같은 목록·유효성 기준을 사용한다.
export const BESTSELLER_CATEGORY_KEYS = ['ALL', 'HUMANITIES', 'BUSINESS', 'FICTION', 'STEADY', 'VIDEO', 'GAME', 'MUSIC'];
export const MIN_CATEGORY_ITEMS = 6;
export const BOOK_CHARTS = {
  ALL: { name: '종합', cid: '0' }, HUMANITIES: { name: '인문', cid: '656', subject: 'philosophy' },
  BUSINESS: { name: '경제경영', cid: '170', subject: 'business' },
  FICTION: { name: '소설·시', cid: '1', subject: 'fiction' },
  STEADY: { name: '스테디셀러', cid: '0', subject: 'classic_literature' },
};

const nullableStrings = ['creator', 'publisher', 'published_date', 'isbn', 'description', 'title_ko', 'title_en', 'creator_en'];
const safeUrl = value => value == null || (typeof value === 'string' && /^https?:\/\//.test(value));
export function validBestsellerItems(items) {
  return Array.isArray(items) && items.length >= MIN_CATEGORY_ITEMS && items.length <= 100
    && items.every(item => item && typeof item === 'object'
      && typeof item.id === 'string' && item.id.length > 0 && typeof item.title === 'string' && item.title.trim()
      && Number.isInteger(item.rank) && item.rank > 0 && ['BOOK', 'VIDEO', 'GAME', 'MUSIC'].includes(item.type)
      && nullableStrings.every(key => item[key] == null || typeof item[key] === 'string')
      && safeUrl(item.thumbnail_url) && safeUrl(item.thumbnail_en))
    && new Set(items.map(item => item.id)).size === items.length;
}
