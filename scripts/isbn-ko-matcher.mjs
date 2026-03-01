/**
 * isbn_ko 매칭 스크립트
 * 영어 ISBN이 external_id인데 한국어 제목이 있는 BOOK 190건 대상
 * Naver 도서 API로 한국어 판본 ISBN을 검색하여 isbn_ko + content_editions(ko).isbn 업데이트
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// env 로드 (web-bo에 Naver 키, web에 Supabase 키)
function loadEnv(relPath) {
  const p = path.join(__dirname, '..', relPath);
  return fs.readFileSync(p, 'utf8');
}
const webEnv = loadEnv('sw/web/.env');
const boEnv = loadEnv('sw/web-bo/.env');

function getEnv(key) {
  for (const env of [webEnv, boEnv]) {
    const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (match) return match[1].trim();
  }
  return null;
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const NAVER_CLIENT_ID = getEnv('NAVER_CLIENT_ID');
const NAVER_CLIENT_SECRET = getEnv('NAVER_CLIENT_SECRET');

const DELAY_MS = 150;      // Naver API rate limit
const KO_ISBN_PREFIXES = ['9788', '97911'];

const stats = { total: 0, apiCalls: 0, matched: 0, skipped: 0, errors: 0, updated: 0 };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Supabase helpers ──

async function supabaseFetch(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Supabase GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table, body, matchFilter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchFilter}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
}

// ── Naver API ──

async function searchNaver(query) {
  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=5`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    }
  });
  if (!res.ok) {
    stats.errors++;
    return [];
  }
  stats.apiCalls++;
  const data = await res.json();
  return data.items || [];
}

// ── 매칭 로직 ──

/** HTML 태그 제거 */
function stripHtml(s) {
  return s ? s.replace(/<[^>]+>/g, '').trim() : '';
}

/** ISBN-13 추출 (Naver isbn 필드는 "10자리 13자리" 공백 구분) */
function extractIsbn13(naverIsbn) {
  if (!naverIsbn) return null;
  const parts = naverIsbn.trim().split(/\s+/);
  for (const p of parts) {
    const clean = p.replace(/-/g, '');
    if (clean.length === 13 && /^\d+$/.test(clean)) return clean;
  }
  return null;
}

/** 한국 ISBN인지 확인 */
function isKoreanIsbn(isbn) {
  return KO_ISBN_PREFIXES.some(p => isbn.startsWith(p));
}

/** 한국어 제목 유사도 비교 */
function titleSimilar(dbTitle, apiTitle) {
  const a = dbTitle.replace(/\s+/g, '').toLowerCase();
  const b = stripHtml(apiTitle).replace(/\s+/g, '').toLowerCase();
  if (a === b) return true;
  // 한쪽이 다른 쪽을 포함
  if (a.includes(b) || b.includes(a)) return true;
  // 첫 4자 일치 (짧은 제목 대응)
  if (a.length >= 4 && b.length >= 4 && a.substring(0, 4) === b.substring(0, 4)) return true;
  return false;
}

/** 저자명 유사도 비교 */
function authorSimilar(dbCreator, apiAuthor) {
  if (!dbCreator || !apiAuthor) return true;
  const db = dbCreator.replace(/\s+/g, '');
  const api = stripHtml(apiAuthor).replace(/\s+/g, '');

  // 같은 언어: 부분 문자열 매칭
  if (db.length >= 2 && api.includes(db.substring(0, 2))) return true;
  if (api.length >= 2 && db.includes(api.substring(0, 2))) return true;

  // 서로 다른 언어(영↔한): 번역명이므로 저자 검증 생략
  const dbIsKo = /[가-힣]/.test(db);
  const apiIsKo = /[가-힣]/.test(api);
  if (dbIsKo !== apiIsKo) return true;

  return false;
}

/** 불량 결과 필터 */
function isBadResult(apiTitle) {
  const t = stripHtml(apiTitle).toLowerCase();
  const badKeywords = ['따라쓰기', '필사', '모의고사', '논술', '그래제본소', '워크북', '문제집'];
  return badKeywords.some(k => t.includes(k));
}

/** 제목 정규화: 부제·시리즈 번호·괄호 제거 */
function simplifyTitle(title) {
  return title
    .replace(/\s*[:：]\s*.+$/, '')     // 콜론 이후 부제 제거
    .replace(/\s*\d+\s*$/, '')          // 끝 숫자 (시리즈 번호) 제거
    .replace(/\s*\([^)]+\)\s*/g, '')    // 괄호 내용 제거
    .replace(/\s*(상|하|1|2|3)\s*$/, '') // 상/하/1/2/3 권수 제거
    .trim();
}

/**
 * 검색 전략:
 * 1차: title_ko만
 * 2차: title_ko + creator (1차 실패 시)
 * 3차: 제목 정규화 후 재검색 (부제/시리즈 번호 제거)
 */
async function findKoreanIsbn(row) {
  // 1차: 제목만
  let items = await searchNaver(row.title_ko);
  await sleep(DELAY_MS);

  let match = findBestMatch(items, row);
  if (match) return match;

  // 2차: 제목 + 저자
  if (row.creator) {
    items = await searchNaver(`${row.title_ko} ${row.creator}`);
    await sleep(DELAY_MS);
    match = findBestMatch(items, row);
    if (match) return match;
  }

  // 3차: 정규화된 제목
  const simplified = simplifyTitle(row.title_ko);
  if (simplified !== row.title_ko && simplified.length >= 2) {
    items = await searchNaver(simplified);
    await sleep(DELAY_MS);
    match = findBestMatch(items, row);
    if (match) return match;
  }

  return null;
}

function findBestMatch(items, row) {
  for (const item of items) {
    if (isBadResult(item.title)) continue;

    const isbn13 = extractIsbn13(item.isbn);
    if (!isbn13) continue;
    if (!isKoreanIsbn(isbn13)) continue;
    if (!titleSimilar(row.title_ko, item.title)) continue;
    if (!authorSimilar(row.creator, item.author)) continue;

    return {
      isbn: isbn13,
      thumbnail: item.image || null,
      publisher: stripHtml(item.publisher || ''),
    };
  }
  return null;
}

// ── 대상 조회 ──

async function fetchTargets() {
  // 페이지네이션으로 전체 조회
  const all = [];
  let offset = 0;
  const BATCH = 500;
  while (true) {
    const rows = await supabaseFetch(
      `contents?select=id,external_id,title,title_ko,creator&type=eq.BOOK&isbn_ko=is.null&title_ko=not.is.null&order=title_ko&limit=${BATCH}&offset=${offset}`
    );
    if (!rows.length) break;
    all.push(...rows);
    offset += BATCH;
    if (rows.length < BATCH) break;
  }
  // 필터: external_id가 영어 ISBN + title_ko에 한글 포함
  return all.filter(r =>
    r.external_id &&
    (r.external_id.startsWith('9780') || r.external_id.startsWith('9781')) &&
    /[가-힣]/.test(r.title_ko)
  );
}

// ── 업데이트 ──

async function updateRecord(row, match) {
  // 1. contents.isbn_ko 업데이트
  await supabasePatch('contents', { isbn_ko: match.isbn }, `id=eq.${row.id}`);

  // 2. content_editions(ko) isbn + thumbnail + publisher 업데이트
  const patchData = { isbn: match.isbn };
  if (match.thumbnail) patchData.thumbnail_url = match.thumbnail;
  if (match.publisher) patchData.publisher = match.publisher;

  try {
    await supabasePatch('content_editions', patchData, `content_id=eq.${row.id}&locale=eq.ko`);
  } catch {
    // edition이 없으면 무시 (isbn_ko만 업데이트된 상태)
  }

  stats.updated++;
}

// ── main ──

async function main() {
  console.log('=== isbn_ko 매칭 시작 ===');
  console.log(`Naver Client ID: ${NAVER_CLIENT_ID.substring(0, 8)}...`);

  console.log('\n[1/3] 대상 조회 중...');
  const targets = await fetchTargets();
  stats.total = targets.length;
  console.log(`  대상: ${stats.total}건`);

  if (!targets.length) {
    console.log('  대상 없음. 종료.');
    return;
  }

  console.log('\n[2/3] Naver 도서 API 매칭 시작...');

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];

    if (i > 0 && i % 20 === 0) {
      console.log(`  [${i}/${stats.total}] API: ${stats.apiCalls}, 매칭: ${stats.matched}, 스킵: ${stats.skipped}`);
    }

    const match = await findKoreanIsbn(row);

    if (match) {
      stats.matched++;
      await updateRecord(row, match);
      process.stdout.write(`  ✓ ${row.title_ko} → ${match.isbn}\n`);
    } else {
      stats.skipped++;
    }
  }

  console.log('\n=== 결과 ===');
  console.log(`총 대상:    ${stats.total}건`);
  console.log(`API 호출:   ${stats.apiCalls}건`);
  console.log(`매칭 성공:  ${stats.matched}건 (${(stats.matched / stats.total * 100).toFixed(1)}%)`);
  console.log(`매칭 실패:  ${stats.skipped}건`);
  console.log(`에러:       ${stats.errors}건`);
  console.log(`DB 반영:    ${stats.updated}건`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
