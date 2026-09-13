import * as cheerio from 'cheerio';
import { fetchWithRetry, mapTwo } from './http.mjs';
import { BOOK_CHARTS as categories } from '../../src/lib/library/bestsellerPolicy.mjs';

const normalized = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const cleanTitle = value => value.replace(/\(.*?\)|\[.*?\]/g, '').trim();
const metadataCache = new Map();

async function kakaoMetadata(title, key) {
  const query = cleanTitle(title);
  if (!metadataCache.has(query)) metadataCache.set(query, (async () => {
    const res = await fetchWithRetry(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    const data = await res.json();
    if (!Array.isArray(data.documents)) throw new Error('Invalid Kakao response');
    // 제목이 일치하는 판본만 사용한다. 첫 검색 결과를 번역판으로 간주하지 않는다.
    return data.documents.find(book => normalized(cleanTitle(book.title || '')) === normalized(query)) || null;
  })());
  return metadataCache.get(query);
}

function fullCover(value) {
  if (!value) return null;
  const match = value.match(/fname=(http[^&]+)/);
  return (match ? decodeURIComponent(match[1]) : value).replace(/^http:/, 'https:');
}

export async function collectBooks(locale, key, kakaoKey) {
  return locale === 'ko' ? collectKoreanBooks(key, kakaoKey) : collectEnglishBooks(key);
}

async function collectKoreanBooks(key, kakaoKey) {
  if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY is required for Korean book metadata');
  const cat = categories[key];
  const bestType = key === 'STEADY' ? 'SteadySeller' : 'Bestseller';
  const res = await fetchWithRetry(`https://www.aladin.co.kr/shop/common/wbest.aspx?BestType=${bestType}&BranchType=1&CID=${cat.cid}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const $ = cheerio.load(await res.text());
  const rawItems = [];
  $('div.ss_book_box').each((_, el) => {
    const title = $(el).find('a.bo3').first().text().trim();
    const cover = $(el).find('img.front_cover, img.cover, td img').first().attr('src');
    if (title && !rawItems.some(item => item.title === title)) rawItems.push({ title, cover });
  });
  return mapTwo(rawItems.slice(0, 18), async (raw, index) => {
    const meta = await kakaoMetadata(raw.title, kakaoKey);
    const title = meta?.title || raw.title;
    const creator = meta?.authors?.join(', ') || '';
    const directCover = raw.cover?.replace(/^\/\//, 'https://').replace(/\/cover(?:sum|200)\//, '/cover500/');
    const cover = fullCover(meta?.thumbnail || directCover);
    return {
      id: `bestseller-book-ko-${key.toLowerCase()}-${index + 1}`, rank: index + 1,
      title, creator, publisher: meta?.publisher || null, thumbnail_url: cover, thumbnail_en: null,
      title_ko: title, title_en: null, creator_en: null,
      published_date: meta?.datetime?.slice(0, 10) || null, isbn: meta?.isbn || null,
      description: meta?.contents || `알라딘 ${cat.name} 차트에 오른 도서.`, type: 'BOOK', category_key: key,
    };
  });
}

async function collectEnglishBooks(key) {
  const url = key === 'ALL' ? 'https://openlibrary.org/trending/weekly.json?limit=18'
    : `https://openlibrary.org/subjects/${categories[key].subject}.json?limit=18`;
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'FeelAndNote/1.0 (feelandnote.com)' } });
  const data = await res.json();
  if (!Array.isArray(data.works)) throw new Error('Invalid OpenLibrary response');
  return data.works.slice(0, 18).map((work, index) => {
    const creator = work.author_name?.[0] || work.authors?.[0]?.name || '';
    const coverId = work.cover_i || work.cover_id;
    const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    // 주제별 목록은 주간 판매 순위가 아니다. 미확인 한국어 판본은 연결하지 않는다.
    const description = key === 'ALL' ? 'Featured on OpenLibrary’s weekly trending list.'
      : `Listed in OpenLibrary’s ${categories[key].subject.replaceAll('_', ' ')} collection.`;
    return {
      id: `bestseller-book-en-${key.toLowerCase()}-${index + 1}`, rank: index + 1,
      title: work.title, creator, publisher: 'OpenLibrary', thumbnail_url: cover, thumbnail_en: cover,
      title_ko: null, title_en: work.title, creator_en: creator,
      published_date: work.first_publish_year ? String(work.first_publish_year) : null,
      isbn: work.availability?.isbn || null, description, type: 'BOOK', category_key: key,
    };
  });
}
