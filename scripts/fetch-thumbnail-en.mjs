/**
 * isbn_en → Google Books API → thumbnail_en 일괄 수집
 *
 * 사용법: node scripts/fetch-thumbnail-en.mjs
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

// ── Google Books 표지 조회 ──
async function fetchThumbnail(isbn) {
  const key = nextKey();
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        console.warn(`  [429] Rate limit - isbn ${isbn}, 키 교체 후 재시도`);
        // 다른 키로 1회 재시도
        const retryKey = nextKey();
        const retryRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${retryKey}`
        );
        if (!retryRes.ok) return null;
        const retryData = await retryRes.json();
        return extractThumbnail(retryData);
      }
      return null;
    }
    const data = await res.json();
    return extractThumbnail(data);
  } catch (err) {
    console.error(`  [ERR] isbn ${isbn}:`, err.message);
    return null;
  }
}

function extractThumbnail(data) {
  if (!data.items || data.items.length === 0) return null;
  const imageLinks = data.items[0].volumeInfo?.imageLinks;
  if (!imageLinks) return null;
  // zoom=1 (thumbnail)이 가장 적절한 크기
  const raw = imageLinks.thumbnail || imageLinks.smallThumbnail;
  if (!raw) return null;
  // http → https 변환
  return raw.replace(/^http:/, "https:");
}

// ── 메인 ──
async function main() {
  // thumbnail_en이 아직 없는 isbn_en 보유 BOOK 조회
  const { data: rows, error } = await supabase
    .from("contents")
    .select("id, isbn_en")
    .eq("type", "BOOK")
    .not("isbn_en", "is", null)
    .is("thumbnail_en", null)
    .order("id");

  if (error) {
    console.error("DB 조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`대상: ${rows.length}건 (isbn_en 보유, thumbnail_en 미설정)`);

  let success = 0;
  let skipped = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        const thumb = await fetchThumbnail(row.isbn_en);
        return { id: row.id, isbn_en: row.isbn_en, thumbnail_en: thumb };
      })
    );

    // DB 업데이트
    for (const r of results) {
      if (!r.thumbnail_en) {
        skipped++;
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
    console.log(`  ${progress}/${rows.length} 처리 (성공 ${success}, 스킵 ${skipped})`);

    // 배치 간 100ms 대기 (rate limit 방지)
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\n완료: 성공 ${success}건, 스킵 ${skipped}건`);
}

main();
