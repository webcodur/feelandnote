/**
 * title_en + creator_en → Google Books API → thumbnail_en 수집
 * isbn_en 검색에서 표지를 못 가져온 잔여분 대상
 *
 * 사용법: node scripts/fetch-thumbnail-en-by-title.mjs
 * 환경변수: sw/web/.env 에서 SUPABASE / GOOGLE_BOOKS_API_KEY 읽음
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env 파싱 ──
const envPath = resolve(__dirname, "../sw/web/.env");
const envText = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=([^#\r\n]+)/);
  if (m) env[m[1]] = m[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Google Books API 키 로테이션 ──
const apiKeys = [env.GOOGLE_BOOKS_API_KEY];
for (let i = 0; i <= 13; i++) {
  const k = env[`GOOGLE_BOOKS_API_KEY_${i}`];
  if (k) apiKeys.push(k);
}
let keyIndex = 0;
function nextKey() {
  const k = apiKeys[keyIndex % apiKeys.length];
  keyIndex++;
  return k;
}

// ── 문자열 정규화 ──
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 문자열 유사도 (단어 포함 비율) ──
function wordOverlap(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalize(b).split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) matches++;
  }
  return matches / Math.max(wordsA.size, wordsB.size);
}

// ── 제목 검증 ──
function isTitleMatch(ourTitle, googleTitle) {
  const a = normalize(ourTitle);
  const b = normalize(googleTitle);
  // 정확 일치
  if (a === b) return true;
  // 한쪽이 다른 쪽을 포함
  if (a.includes(b) || b.includes(a)) return true;
  // 단어 겹침 60% 이상
  return wordOverlap(ourTitle, googleTitle) >= 0.6;
}

// ── 저자 검증 ──
function isAuthorMatch(ourCreator, googleAuthors) {
  if (!ourCreator || !googleAuthors || googleAuthors.length === 0) return true; // 저자 없으면 패스
  const ourNorm = normalize(ourCreator);
  for (const ga of googleAuthors) {
    const gaNorm = normalize(ga);
    if (ourNorm.includes(gaNorm) || gaNorm.includes(ourNorm)) return true;
    if (wordOverlap(ourCreator, ga) >= 0.5) return true;
  }
  return false;
}

// ── Google Books 검색 (제목+저자) ──
async function searchByTitle(titleEn, creatorEn) {
  const key = nextKey();
  let query = `intitle:${titleEn}`;
  if (creatorEn) {
    query += `+inauthor:${creatorEn}`;
  }
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${key}&maxResults=3`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        const retryKey = nextKey();
        const retryUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${retryKey}&maxResults=3`;
        const retryRes = await fetch(retryUrl);
        if (!retryRes.ok) return null;
        return await retryRes.json();
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`  [ERR] "${titleEn}":`, err.message);
    return null;
  }
}

// ── 결과에서 검증 후 썸네일 추출 ──
function extractVerifiedThumbnail(data, ourTitle, ourCreator) {
  if (!data?.items || data.items.length === 0) return null;

  for (const item of data.items) {
    const vi = item.volumeInfo;
    if (!vi) continue;

    const googleTitle = vi.title || "";
    const googleAuthors = vi.authors || [];

    // 제목 검증
    if (!isTitleMatch(ourTitle, googleTitle)) continue;

    // 저자 검증
    if (!isAuthorMatch(ourCreator, googleAuthors)) continue;

    // 썸네일 추출
    const imageLinks = vi.imageLinks;
    if (!imageLinks) continue;
    const raw = imageLinks.thumbnail || imageLinks.smallThumbnail;
    if (!raw) continue;

    return raw.replace(/^http:/, "https:");
  }

  return null;
}

// ── 메인 ──
async function main() {
  // thumbnail_en 없고, title_en 있는 BOOK 조회
  const { data: rows, error } = await supabase
    .from("contents")
    .select("id, title_en, creator_en")
    .eq("type", "BOOK")
    .not("title_en", "is", null)
    .is("thumbnail_en", null)
    .order("id")
    .limit(2000);

  if (error) {
    console.error("DB 조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`대상: ${rows.length}건 (title_en 보유, thumbnail_en 미설정)`);

  let success = 0;
  let skipped = 0;
  let noMatch = 0;
  const skippedList = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        const data = await searchByTitle(row.title_en, row.creator_en);
        const thumb = extractVerifiedThumbnail(data, row.title_en, row.creator_en);
        return { id: row.id, title_en: row.title_en, creator_en: row.creator_en, thumbnail_en: thumb };
      })
    );

    for (const r of results) {
      if (!r.thumbnail_en) {
        noMatch++;
        skippedList.push(`${r.title_en} | ${r.creator_en || "(no author)"}`);
        continue;
      }
      const { error: updateErr } = await supabase
        .from("contents")
        .update({ thumbnail_en: r.thumbnail_en })
        .eq("id", r.id);

      if (updateErr) {
        console.error(`  [UPDATE ERR] ${r.id}:`, updateErr.message);
        skipped++;
      } else {
        success++;
      }
    }

    const progress = Math.min(i + BATCH_SIZE, rows.length);
    console.log(`  ${progress}/${rows.length} 처리 (성공 ${success}, 매칭실패 ${noMatch}, DB에러 ${skipped})`);

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n완료: 성공 ${success}건, 매칭실패 ${noMatch}건, DB에러 ${skipped}건`);

  if (skippedList.length > 0) {
    console.log(`\n매칭 실패 목록 (${skippedList.length}건):`);
    for (const s of skippedList) {
      console.log(`  - ${s}`);
    }
  }
}

main();
