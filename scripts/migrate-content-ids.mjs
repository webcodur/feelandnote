/**
 * contents.id 정규화 마이그레이션 스크립트 (일회성)
 *
 * VIDEO: bare number / tmdb_{id} → TMDB API로 movie/tv 분류 → tmdb-movie-{id} / tmdb-tv-{id}
 * 썸네일 복구: poster_path 수집 → thumbnail_url 업데이트
 *
 * Usage: node scripts/migrate-content-ids.mjs
 */

const SUPABASE_URL = 'https://wouqtpvfctednlffross.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdXF0cHZmY3RlZG5sZmZyb3NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg4NDMyMywiZXhwIjoyMDc5NDYwMzIzfQ.GDOfWkP6A3QC_GiFiYPybqLx0NqFGk7zD1GR8Avc6ns';
const TMDB_API_KEY = 'f55f369e5b12ff7ea8bd9ddef8a9e77a';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// --- Supabase REST helper ---
async function supabaseSQL(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  return res.json();
}

// Use postgrest for select, raw SQL via pg endpoint for updates
async function supabaseRawSQL(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ sql: query }),
  });
  if (!res.ok) {
    const text = await res.text();
    // If exec_sql doesn't exist, we'll use a different approach
    if (res.status === 404) return null;
    throw new Error(`SQL error: ${res.status} ${text}`);
  }
  return res.json();
}

// Query via PostgREST
async function fetchNonNormalVideoIds() {
  // Fetch bare numbers
  const bareRes = await fetch(
    `${SUPABASE_URL}/rest/v1/contents?type=eq.VIDEO&id=not.like.tmdb-*&id=not.like.igdb-*&select=id,thumbnail_url&limit=1000`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!bareRes.ok) throw new Error(`Fetch error: ${bareRes.status}`);
  const all = await bareRes.json();

  // Filter to bare numbers and tmdb_ prefix
  return all.filter(r =>
    /^\d+$/.test(r.id) || /^tmdb_\d+$/.test(r.id)
  );
}

// --- TMDB API ---
async function tmdbCheck(numericId) {
  // Try movie first
  const movieRes = await fetch(
    `${TMDB_BASE}/movie/${numericId}?api_key=${TMDB_API_KEY}&language=ko-KR`
  );
  if (movieRes.ok) {
    const data = await movieRes.json();
    return {
      type: 'movie',
      poster_path: data.poster_path,
      title: data.title,
    };
  }

  // Try TV
  const tvRes = await fetch(
    `${TMDB_BASE}/tv/${numericId}?api_key=${TMDB_API_KEY}&language=ko-KR`
  );
  if (tvRes.ok) {
    const data = await tvRes.json();
    return {
      type: 'tv',
      poster_path: data.poster_path,
      title: data.name,
    };
  }

  return null;
}

// Rate limiter: max 35 req per 10 sec (safety margin from 40)
function createRateLimiter(maxReqs = 35, windowMs = 10000) {
  let tokens = maxReqs;
  let lastRefill = Date.now();

  return async function waitForSlot() {
    const now = Date.now();
    const elapsed = now - lastRefill;
    if (elapsed >= windowMs) {
      tokens = maxReqs;
      lastRefill = now;
    }
    if (tokens <= 0) {
      const waitTime = windowMs - elapsed + 100;
      console.log(`  Rate limit: waiting ${Math.round(waitTime / 1000)}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      tokens = maxReqs;
      lastRefill = Date.now();
    }
    tokens--;
  };
}

// --- Main ---
async function main() {
  console.log('=== contents.id 정규화 마이그레이션 ===\n');

  // 1. Fetch non-normal VIDEO IDs
  console.log('[1] 비정규 VIDEO ID 조회...');
  const rows = await fetchNonNormalVideoIds();
  console.log(`  ${rows.length}건 발견\n`);

  if (rows.length === 0) {
    console.log('변환 대상 없음. 종료.');
    return;
  }

  // 2. TMDB API로 movie/tv 분류
  console.log('[2] TMDB API 분류 시작...');
  const rateLimiter = createRateLimiter();
  const results = [];
  const failed = [];
  let processed = 0;

  for (const row of rows) {
    const numericId = row.id.replace(/^tmdb_/, '');
    await rateLimiter();

    try {
      const tmdbResult = await tmdbCheck(numericId);
      if (tmdbResult) {
        const newId = `tmdb-${tmdbResult.type}-${numericId}`;
        results.push({
          oldId: row.id,
          newId,
          posterPath: tmdbResult.poster_path,
          title: tmdbResult.title,
        });
      } else {
        failed.push({ id: row.id, reason: 'not_found' });
      }
    } catch (err) {
      failed.push({ id: row.id, reason: err.message });
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`  ${processed}/${rows.length} 처리 (성공: ${results.length}, 실패: ${failed.length})`);
    }
  }

  console.log(`\n[2] 완료: 성공 ${results.length}, 실패 ${failed.length}\n`);

  if (failed.length > 0) {
    console.log('실패 목록:');
    failed.forEach(f => console.log(`  ${f.id}: ${f.reason}`));
    console.log();
  }

  // 3. SQL 생성 및 파일 출력
  console.log('[3] SQL 생성...');

  // ID 변환 SQL (batch of 50)
  const batchSize = 50;
  const sqlStatements = [];

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const cases = batch.map(r =>
      `WHEN '${r.oldId}' THEN '${r.newId}'`
    ).join('\n      ');
    const ids = batch.map(r => `'${r.oldId}'`).join(', ');

    sqlStatements.push(
      `UPDATE contents SET id = CASE id\n      ${cases}\n    END\n    WHERE id IN (${ids});`
    );
  }

  // 썸네일 복구 SQL
  const thumbUpdates = results.filter(r => r.posterPath);
  for (let i = 0; i < thumbUpdates.length; i += batchSize) {
    const batch = thumbUpdates.slice(i, i + batchSize);
    const cases = batch.map(r =>
      `WHEN '${r.newId}' THEN 'https://image.tmdb.org/t/p/w500${r.posterPath}'`
    ).join('\n      ');
    const ids = batch.map(r => `'${r.newId}'`).join(', ');

    sqlStatements.push(
      `UPDATE contents SET thumbnail_url = CASE id\n      ${cases}\n    END\n    WHERE id IN (${ids});`
    );
  }

  // Write SQL to file
  const sqlContent = sqlStatements.join('\n\n');
  const fs = await import('fs');
  const outputPath = 'scripts/migrate-output.sql';
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`  ${outputPath} 생성 (${sqlStatements.length}개 쿼리)\n`);

  // Also write results JSON for reference
  const jsonOutput = { results, failed, timestamp: new Date().toISOString() };
  fs.writeFileSync('scripts/migrate-results.json', JSON.stringify(jsonOutput, null, 2), 'utf-8');
  console.log('  scripts/migrate-results.json 생성\n');

  console.log('=== 완료 ===');
  console.log(`다음 단계: scripts/migrate-output.sql을 Supabase에서 실행`);
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
