/**
 * isbn_en 매칭 스크립트 (6-key rotation)
 * Google Books API로 영어권 ISBN을 검색하여 contents 테이블에 업데이트
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'sw', 'web', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const API_KEYS = [
  'AIzaSyAoiyt1a9IUgC72aF2GceL9bBQPng7RZhk',
  'AIzaSyDBY0O9_FyyU6NSEb3hZXjY2X4jAJFy-ug',
  'AIzaSyCw1umdhl82s6KgKCpjHZe28ezntQV2TcE',
  'AIzaSyAPQzKqbfwa47Mp55fF4b0uQA0w6hPfpCw',
  'AIzaSyAmDjhWvAvapwxvpAdJsrTMzvTzV7QdiBI',
  'AIzaSyCmkA28LT_0fc_gK3mTOOf1N-avKfwVnzg',
];
let currentKeyIndex = 0;

const BATCH_SIZE = 200;  // Supabase fetch batch
const UPDATE_BATCH = 50; // DB update batch
const DELAY_MS = 220;    // Rate limit delay

const VALID_ISBN_PREFIXES = ['978-0', '978-1', '979-8', '9780', '9781', '9798'];

const stats = { total: 0, apiCalls: 0, matched: 0, skipped: 0, errors: 0, updated: 0 };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getApiKey() { return API_KEYS[currentKeyIndex]; }

function rotateKey() {
  currentKeyIndex++;
  if (currentKeyIndex >= API_KEYS.length) {
    console.error('\n[FATAL] 모든 API 키 소진.');
    return false;
  }
  console.log(`\n[KEY] 키 로테이션 → ${currentKeyIndex + 1}/${API_KEYS.length}`);
  return true;
}

async function supabaseFetch(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table, body, matchFilter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchFilter}`;
  const res = await fetch(url, {
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

async function fetchTargets() {
  const all = [];
  let offset = 0;
  while (true) {
    const rows = await supabaseFetch(
      `contents?select=id,title_en,creator,creator_en&type=eq.BOOK&title_en=not.is.null&title_en=neq.&or=(isbn_en.is.null,isbn_en.eq.)&order=id&limit=${BATCH_SIZE}&offset=${offset}`
    );
    if (!rows.length) break;
    all.push(...rows);
    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) break;
  }
  return all;
}

function getAuthor(row) {
  if (row.creator_en && row.creator_en.trim()) return row.creator_en.trim();
  if (row.creator && row.creator.trim()) {
    // Skip Korean-only names for API search
    if (/^[가-힣\s]+$/.test(row.creator.trim())) return '';
    return row.creator.trim();
  }
  return '';
}

function normalizeTitle(t) {
  return t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleMatch(dbTitle, apiTitle) {
  const a = normalizeTitle(dbTitle);
  const b = normalizeTitle(apiTitle);
  if (a === b) return true;

  const wordsA = a.split(' ').filter(w => w.length > 2);
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  if (!wordsA.length) return false;

  const matchCount = wordsA.filter(w => wordsB.has(w)).length;
  return matchCount / wordsA.length >= 0.7;
}

function authorMatch(dbAuthor, apiAuthors) {
  if (!dbAuthor || !apiAuthors) return true; // lenient if no author
  const dbLast = dbAuthor.split(/[\s,]+/).pop().toLowerCase();
  const apiStr = apiAuthors.join(' ').toLowerCase();
  return apiStr.includes(dbLast);
}

function isEnglishIsbn(isbn) {
  const clean = isbn.replace(/-/g, '');
  return VALID_ISBN_PREFIXES.some(p => clean.startsWith(p.replace(/-/g, '')));
}

function extractIsbn13(volumeInfo) {
  const ids = volumeInfo.industryIdentifiers || [];
  const isbn13 = ids.find(i => i.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier.replace(/-/g, '');
  return null;
}

async function searchGoogleBooks(title, author) {
  let query = `intitle:${encodeURIComponent(title)}`;
  if (author) query += `+inauthor:${encodeURIComponent(author)}`;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${getApiKey()}&maxResults=3&langRestrict=en`;

  const res = await fetch(url);

  if (res.status === 403 || res.status === 429) {
    const canContinue = rotateKey();
    if (!canContinue) return null; // 모든 키 소진
    // 재시도
    const retryUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${getApiKey()}&maxResults=3&langRestrict=en`;
    const retry = await fetch(retryUrl);
    if (retry.status === 403 || retry.status === 429) {
      const canContinue2 = rotateKey();
      if (!canContinue2) return null;
      return [];
    }
    if (!retry.ok) { stats.errors++; return []; }
    stats.apiCalls++;
    const data = await retry.json();
    return data.items || [];
  }

  if (!res.ok) {
    stats.errors++;
    return [];
  }

  stats.apiCalls++;
  const data = await res.json();
  return data.items || [];
}

async function processItem(row) {
  const author = getAuthor(row);
  const results = await searchGoogleBooks(row.title_en, author);

  if (results === null) return null; // all keys exhausted

  for (const item of results) {
    const vi = item.volumeInfo || {};
    const isbn13 = extractIsbn13(vi);
    if (!isbn13) continue;
    if (!isEnglishIsbn(isbn13)) continue;
    if (isbn13 === row.id) continue; // self-reference
    if (!titleMatch(row.title_en, vi.title || '')) continue;
    if (!authorMatch(author, vi.authors || [])) continue;

    return isbn13;
  }

  stats.skipped++;
  return undefined; // no match
}

async function batchUpdate(matches) {
  if (!matches.length) return;

  // Use individual PATCH calls
  for (const m of matches) {
    try {
      await supabasePatch('contents', { isbn_en: m.isbn_en }, `id=eq.${encodeURIComponent(m.id)}`);
    } catch (e) {
      console.error(`  [ERROR] ${m.id} 업데이트 실패: ${e.message}`);
    }
  }

  stats.updated += matches.length;
  console.log(`  [UPDATE] ${matches.length}건 DB 반영 완료 (누적: ${stats.updated})`);
}

async function main() {
  console.log('=== isbn_en 매칭 시작 (6-key rotation) ===');
  console.log(`API Keys: ${API_KEYS.length}개`);

  console.log('\n[1/3] 대상 조회 중...');
  const targets = await fetchTargets();
  stats.total = targets.length;
  console.log(`  대상: ${stats.total}건`);

  if (stats.total === 0) {
    console.log('\n매칭 대상 없음. 종료.');
    return;
  }

  console.log('\n[2/3] Google Books API 매칭 시작...');
  let pendingMatches = [];

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];

    if (i > 0 && i % 50 === 0) {
      console.log(`  [${i}/${stats.total}] API: ${stats.apiCalls}, 매칭: ${stats.matched}, 스킵: ${stats.skipped}, 에러: ${stats.errors}, 키: ${currentKeyIndex + 1}/${API_KEYS.length}`);
    }

    const isbn = await processItem(row);

    if (isbn === null) {
      console.log(`\n  모든 API 키 소진! ${i}번째에서 중단.`);
      break;
    }

    if (isbn !== undefined) {
      stats.matched++;
      pendingMatches.push({ id: row.id, isbn_en: isbn });

      if (pendingMatches.length >= UPDATE_BATCH) {
        await batchUpdate(pendingMatches);
        pendingMatches = [];
      }
    }

    await sleep(DELAY_MS);
  }

  // Flush remaining
  if (pendingMatches.length > 0) {
    await batchUpdate(pendingMatches);
  }

  console.log('\n=== 결과 ===');
  console.log(`총 대상:    ${stats.total}건`);
  console.log(`API 호출:   ${stats.apiCalls}건`);
  console.log(`매칭 성공:  ${stats.matched}건`);
  console.log(`매칭 실패:  ${stats.skipped}건`);
  console.log(`에러:       ${stats.errors}건`);
  console.log(`DB 반영:    ${stats.updated}건`);
  console.log(`사용 키:    ${currentKeyIndex + 1}/${API_KEYS.length}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
