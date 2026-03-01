/**
 * isbn_en 역검증 스크립트
 * API 매칭된 isbn_en을 Google Books ISBN 조회로 검증, 오염 제거
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

const stats = { total: 0, valid: 0, invalid: 0, apiCalls: 0, errors: 0, nullified: 0 };
const invalidRecords = [];

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
      `contents?select=id,title,title_en,creator,creator_en,isbn_en&type=eq.BOOK&isbn_en=not.is.null&isbn_en=neq.&order=id&limit=${BATCH_SIZE}&offset=${offset}`
    );
    if (!rows.length) break;
    // API 매칭분만: isbn_en != id (자기 복사분 제외)
    const apiMatched = rows.filter(r => r.isbn_en !== r.id);
    all.push(...apiMatched);
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

function titleMatch(dbTitle, apiTitle) {
  const a = normalizeTitle(dbTitle);
  const b = normalizeTitle(apiTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // 주요 단어 80%+ 겹침
  const wordsA = a.split(' ').filter(w => w.length >= 3);
  const wordsB = new Set(b.split(' ').filter(w => w.length >= 3));
  if (!wordsA.length) return false;
  const matchCount = wordsA.filter(w => wordsB.has(w)).length;
  return matchCount / wordsA.length >= 0.8;
}

function authorMatch(dbCreator, dbCreatorEn, apiAuthors) {
  if (!apiAuthors || !apiAuthors.length) return true; // API에 저자 없으면 패스
  const apiStr = apiAuthors.join(' ').toLowerCase();

  // creator_en 우선
  const author = (dbCreatorEn && dbCreatorEn.trim()) || (dbCreator && dbCreator.trim()) || '';
  if (!author) return true; // DB에 저자 없으면 패스
  if (/^[가-힣\s]+$/.test(author)) return true; // 한국어만이면 스킵

  // 성(surname) 추출: 쉼표 있으면 앞부분, 없으면 마지막 단어
  const parts = author.split(/[\s,]+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : parts[0].toLowerCase();
  return apiStr.includes(surname);
}

async function lookupIsbn(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${getApiKey()}`;
  const res = await fetch(url);

  if (res.status === 403 || res.status === 429) {
    const canContinue = rotateKey();
    if (!canContinue) return null; // 모든 키 소진
    // 재시도
    const retry = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${getApiKey()}`);
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

function validateItem(row, googleData) {
  const items = googleData.items || [];
  if (!items.length) return { valid: false, reason: 'ISBN not found in Google Books' };

  const vi = items[0].volumeInfo || {};

  // 1. 언어 검증
  if (vi.language && vi.language !== 'en') {
    return { valid: false, reason: `language=${vi.language}` };
  }

  // 2. 제목 검증
  const dbTitle = row.title_en || row.title || '';
  const apiTitle = vi.title || '';
  if (!titleMatch(dbTitle, apiTitle)) {
    return { valid: false, reason: `title mismatch: "${dbTitle}" vs "${apiTitle}"` };
  }

  // 3. 저자 검증
  if (!authorMatch(row.creator, row.creator_en, vi.authors)) {
    return { valid: false, reason: `author mismatch: "${row.creator_en || row.creator}" vs "${(vi.authors || []).join(', ')}"` };
  }

  return { valid: true };
}

async function nullifyInvalid(records) {
  if (!records.length) return;

  // 개별 PATCH로 isbn_en = null
  for (const r of records) {
    try {
      await supabasePatch('contents', { isbn_en: null }, `id=eq.${encodeURIComponent(r.id)}`);
      stats.nullified++;
    } catch (e) {
      console.error(`  [ERROR] ${r.id} NULL 처리 실패: ${e.message}`);
    }
  }
  console.log(`  [NULLIFY] ${records.length}건 isbn_en → NULL (누적: ${stats.nullified})`);
}

async function main() {
  console.log('=== isbn_en 역검증 시작 ===');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`API Keys: ${API_KEYS.length}개\n`);

  console.log('[1/3] API 매칭 대상 조회...');
  const targets = await fetchTargets();
  stats.total = targets.length;
  console.log(`  대상: ${stats.total}건 (isbn_en != id인 레코드)\n`);

  console.log('[2/3] Google Books ISBN 역조회 시작...');
  let pendingNullify = [];

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];

    if (i > 0 && i % 50 === 0) {
      console.log(`  [${i}/${stats.total}] valid: ${stats.valid}, invalid: ${stats.invalid}, api: ${stats.apiCalls}, err: ${stats.errors}`);
    }

    const data = await lookupIsbn(row.isbn_en);
    if (data === null) {
      console.log(`\n  모든 API 키 소진! ${i}번째에서 중단.`);
      break;
    }

    const result = validateItem(row, data);
    if (result.valid) {
      stats.valid++;
    } else {
      stats.invalid++;
      invalidRecords.push({ id: row.id, isbn_en: row.isbn_en, title_en: row.title_en, reason: result.reason });
      pendingNullify.push(row);

      if (pendingNullify.length >= 20) {
        await nullifyInvalid(pendingNullify);
        pendingNullify = [];
      }
    }

    await sleep(DELAY_MS);
  }

  // Flush remaining
  if (pendingNullify.length > 0) {
    await nullifyInvalid(pendingNullify);
  }

  // 결과 파일 저장
  const reportPath = path.join(__dirname, 'isbn-en-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(invalidRecords, null, 2));

  console.log('\n=== 역검증 결과 ===');
  console.log(`총 대상:     ${stats.total}건`);
  console.log(`유효(valid):  ${stats.valid}건`);
  console.log(`오염(invalid): ${stats.invalid}건`);
  console.log(`NULL 처리:    ${stats.nullified}건`);
  console.log(`API 호출:     ${stats.apiCalls}건`);
  console.log(`에러:         ${stats.errors}건`);
  console.log(`\n오염 상세: ${reportPath}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
