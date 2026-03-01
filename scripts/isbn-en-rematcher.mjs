/**
 * isbn_en 재매칭 스크립트
 * isbn_en이 NULL인 BOOK에 대해 title_en + creator로 Google Books 검색하여 엄격 매칭
 *
 * 사용법:
 *   node isbn-en-rematcher.mjs          → dry-run (matches.json 출력만)
 *   node isbn-en-rematcher.mjs --apply  → DB 반영
 *   node isbn-en-rematcher.mjs 500      → offset 500부터 시작 (dry-run)
 *   node isbn-en-rematcher.mjs 500 --apply → offset 500부터 + DB 반영
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

const BATCH_SIZE = 200;
const DELAY_MS = 200;
const VALID_ISBN_PREFIXES = ['9780', '9781', '9798'];

// Parse args
const args = process.argv.slice(2);
const APPLY_MODE = args.includes('--apply');
const SKIP_COUNT = parseInt(args.find(a => /^\d+$/.test(a)) || '0', 10);

const stats = { total: 0, apiCalls: 0, matched: 0, skipped: 0, errors: 0, updated: 0 };
const matches = [];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getApiKey() { return API_KEYS[currentKeyIndex]; }

async function supabaseFetch(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
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
      `contents?select=id,title,title_en,creator,creator_en,isbn_en&type=eq.BOOK&title_en=not.is.null&title_en=neq.&or=(isbn_en.is.null,isbn_en.eq.)&order=id&limit=${BATCH_SIZE}&offset=${offset}`
    );
    if (!rows.length) break;
    all.push(...rows);
    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) break;
  }
  return all;
}

function normalizeTitle(t) {
  if (!t) return '';
  return t.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleMatchStrict(dbTitle, apiTitle) {
  const a = normalizeTitle(dbTitle);
  const b = normalizeTitle(apiTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

function authorMatchStrict(dbCreator, dbCreatorEn, apiAuthors) {
  if (!apiAuthors || !apiAuthors.length) return false; // 저자 없으면 불합격

  const author = (dbCreatorEn && dbCreatorEn.trim()) || (dbCreator && dbCreator.trim()) || '';
  if (!author) return true; // DB에 저자 없으면 스킵
  if (/^[가-힣\s]+$/.test(author)) return true; // 한국어만이면 저자 검증 스킵

  const apiStr = apiAuthors.join(' ').toLowerCase();
  const parts = author.toLowerCase().split(/[\s,]+/).filter(Boolean);

  // 이름과 성 모두 포함 확인 (순서 무관)
  const significantParts = parts.filter(p => p.length >= 2);
  if (!significantParts.length) return true;

  const matchCount = significantParts.filter(p => apiStr.includes(p)).length;
  return matchCount >= Math.min(2, significantParts.length);
}

function isEnglishIsbn(isbn) {
  const clean = isbn.replace(/-/g, '');
  return VALID_ISBN_PREFIXES.some(p => clean.startsWith(p));
}

function extractIsbn13(volumeInfo) {
  const ids = volumeInfo.industryIdentifiers || [];
  const isbn13 = ids.find(i => i.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier.replace(/-/g, '');
  return null;
}

function getAuthor(row) {
  if (row.creator_en && row.creator_en.trim()) return row.creator_en.trim();
  if (row.creator && row.creator.trim()) {
    if (/^[가-힣\s]+$/.test(row.creator.trim())) return '';
    return row.creator.trim();
  }
  return '';
}

async function searchGoogleBooks(title, author) {
  while (currentKeyIndex < API_KEYS.length) {
    let query = `intitle:${encodeURIComponent(title)}`;
    if (author) query += `+inauthor:${encodeURIComponent(author)}`;

    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${getApiKey()}&maxResults=3&langRestrict=en`;
    const res = await fetch(url);

    if (res.status === 403 || res.status === 429) {
      console.log(`  [${res.status}] 키 ${currentKeyIndex + 1} 쿼터 소진`);
      currentKeyIndex++;
      if (currentKeyIndex >= API_KEYS.length) {
        console.error('\n[FATAL] 모든 API 키 소진.');
        return null;
      }
      console.log(`  [KEY] → ${currentKeyIndex + 1}/${API_KEYS.length}`);
      await sleep(500);
      continue;
    }

    if (!res.ok) { stats.errors++; return []; }
    stats.apiCalls++;
    const data = await res.json();
    return data.items || [];
  }
  return null;
}

async function processItem(row) {
  const author = getAuthor(row);
  const results = await searchGoogleBooks(row.title_en, author);

  if (results === null) return null; // quota exhausted

  for (const item of results) {
    const vi = item.volumeInfo || {};
    const isbn13 = extractIsbn13(vi);
    if (!isbn13) continue;

    // 5조건 엄격 매칭
    // 1. 제목 일치
    if (!titleMatchStrict(row.title_en, vi.title || '')) continue;
    // 2. 저자 일치
    if (!authorMatchStrict(row.creator, row.creator_en, vi.authors || [])) continue;
    // 3. ISBN 접두사 (영어권)
    if (!isEnglishIsbn(isbn13)) continue;
    // 4. 언어 = en
    if (vi.language && vi.language !== 'en') continue;
    // 5. 자기참조 방지
    if (isbn13 === row.id) continue;

    return isbn13;
  }

  stats.skipped++;
  return undefined; // no match
}

async function applyMatches(matchList) {
  console.log(`\n[DB 반영] ${matchList.length}건...`);
  for (let i = 0; i < matchList.length; i++) {
    const m = matchList[i];
    try {
      await supabasePatch('contents', { isbn_en: m.isbn_en }, `id=eq.${encodeURIComponent(m.id)}`);
      stats.updated++;
    } catch (e) {
      console.error(`  [ERROR] ${m.id}: ${e.message}`);
    }
    if (i > 0 && i % 50 === 0) {
      console.log(`  ${i}/${matchList.length} 반영 완료`);
    }
  }
  console.log(`  [완료] ${stats.updated}건 DB 반영`);
}

async function main() {
  console.log('=== isbn_en 재매칭 시작 ===');
  console.log(`모드: ${APPLY_MODE ? 'APPLY (DB 반영)' : 'DRY-RUN (matches.json 출력)'}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`API Keys: ${API_KEYS.length}개\n`);

  console.log('[1/3] 대상 조회...');
  const targets = await fetchTargets();
  stats.total = targets.length;
  console.log(`  대상: ${stats.total}건 (isbn_en IS NULL, title_en 있음)`);

  if (SKIP_COUNT > 0) {
    console.log(`  [SKIP] 처음 ${SKIP_COUNT}건 건너뛰기\n`);
  }

  console.log('\n[2/3] Google Books API 매칭...');

  for (let i = SKIP_COUNT; i < targets.length; i++) {
    const row = targets[i];

    if (i > 0 && i % 50 === 0) {
      console.log(`  [${i}/${stats.total}] api: ${stats.apiCalls}, matched: ${stats.matched}, skip: ${stats.skipped}, err: ${stats.errors}`);
    }

    const isbn = await processItem(row);

    if (isbn === null) {
      console.log(`\n  쿼터 소진! ${i}번째에서 중단.`);
      break;
    }

    if (isbn !== undefined) {
      stats.matched++;
      matches.push({
        id: row.id,
        isbn_en: isbn,
        title_en: row.title_en,
        creator: row.creator_en || row.creator
      });
    }

    await sleep(DELAY_MS);
  }

  // Save matches
  const matchesPath = path.join(__dirname, 'isbn-en-rematches.json');
  fs.writeFileSync(matchesPath, JSON.stringify(matches, null, 2));
  console.log(`\n  매칭 결과 저장: ${matchesPath}`);

  // Apply if requested
  if (APPLY_MODE && matches.length > 0) {
    await applyMatches(matches);
  }

  console.log('\n=== 결과 ===');
  console.log(`총 대상:    ${stats.total}건`);
  console.log(`API 호출:   ${stats.apiCalls}건`);
  console.log(`매칭 성공:  ${stats.matched}건`);
  console.log(`매칭 실패:  ${stats.skipped}건`);
  console.log(`에러:       ${stats.errors}건`);
  if (APPLY_MODE) console.log(`DB 반영:    ${stats.updated}건`);
  console.log(`\n결과 파일: ${matchesPath}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
