/**
 * creator_en 역조회 스크립트
 * isbn_en이 있고 creator_en이 없는 BOOK에 대해
 * Google Books API로 영문 저자명을 조회하여 채운다.
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
const UPDATE_BATCH = 50;

const stats = { total: 0, apiCalls: 0, filled: 0, noAuthor: 0, errors: 0, updated: 0 };

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
      `contents?select=id,isbn_en,title_en,creator&type=eq.BOOK&isbn_en=not.is.null&isbn_en=neq.&or=(creator_en.is.null,creator_en.eq.)&order=id&limit=${BATCH_SIZE}&offset=${offset}`
    );
    if (!rows.length) break;
    all.push(...rows);
    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) break;
  }
  return all;
}

async function lookupByIsbn(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${getApiKey()}`;
  const res = await fetch(url);

  if (res.status === 403 || res.status === 429) {
    const canContinue = rotateKey();
    if (!canContinue) return null;
    // 재시도
    const retryUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${getApiKey()}`;
    const retry = await fetch(retryUrl);
    if (retry.status === 403 || retry.status === 429) {
      const canContinue2 = rotateKey();
      if (!canContinue2) return null;
      return { items: [] };
    }
    if (!retry.ok) { stats.errors++; return { items: [] }; }
    stats.apiCalls++;
    return retry.json();
  }

  if (!res.ok) { stats.errors++; return { items: [] }; }
  stats.apiCalls++;
  return res.json();
}

async function batchUpdate(matches) {
  if (!matches.length) return;

  for (const m of matches) {
    try {
      await supabasePatch('contents', { creator_en: m.creator_en }, `id=eq.${encodeURIComponent(m.id)}`);
    } catch (e) {
      console.error(`  [ERROR] ${m.id} 업데이트 실패: ${e.message}`);
    }
  }

  stats.updated += matches.length;
  console.log(`  [UPDATE] ${matches.length}건 DB 반영 완료 (누적: ${stats.updated})`);
}

async function main() {
  console.log('=== creator_en 역조회 시작 (6-key rotation) ===');
  console.log(`API Keys: ${API_KEYS.length}개`);

  console.log('\n[1/3] 대상 조회 중...');
  const targets = await fetchTargets();
  stats.total = targets.length;
  console.log(`  대상: ${stats.total}건 (isbn_en 있고 creator_en 없는 BOOK)`);

  if (stats.total === 0) {
    console.log('\n대상 없음. 종료.');
    return;
  }

  console.log('\n[2/3] Google Books API 역조회 시작...');
  let pendingUpdates = [];

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];

    if (i > 0 && i % 50 === 0) {
      console.log(`  [${i}/${stats.total}] API: ${stats.apiCalls}, 확보: ${stats.filled}, 미확보: ${stats.noAuthor}, 에러: ${stats.errors}, 키: ${currentKeyIndex + 1}/${API_KEYS.length}`);
    }

    const data = await lookupByIsbn(row.isbn_en);
    if (data === null) {
      console.log(`\n  모든 API 키 소진! ${i}번째에서 중단.`);
      break;
    }

    const items = data.items || [];
    if (items.length > 0) {
      const vi = items[0].volumeInfo || {};
      const authors = vi.authors || [];
      if (authors.length > 0) {
        stats.filled++;
        pendingUpdates.push({ id: row.id, creator_en: authors[0] });

        if (pendingUpdates.length >= UPDATE_BATCH) {
          await batchUpdate(pendingUpdates);
          pendingUpdates = [];
        }
      } else {
        stats.noAuthor++;
      }
    } else {
      stats.noAuthor++;
    }

    await sleep(DELAY_MS);
  }

  // Flush remaining
  if (pendingUpdates.length > 0) {
    await batchUpdate(pendingUpdates);
  }

  console.log('\n=== 결과 ===');
  console.log(`총 대상:      ${stats.total}건`);
  console.log(`API 호출:     ${stats.apiCalls}건`);
  console.log(`저자 확보:    ${stats.filled}건`);
  console.log(`저자 미확보:  ${stats.noAuthor}건`);
  console.log(`에러:         ${stats.errors}건`);
  console.log(`DB 반영:      ${stats.updated}건`);
  console.log(`사용 키:      ${currentKeyIndex + 1}/${API_KEYS.length}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
