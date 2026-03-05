/**
 * 대사 JSON 파일 → DB 일괄 반영 스크립트
 *
 * docs/celeb-data/dialogue/**\/*.json 파일을 읽어
 * celeb_dialogues 테이블에 UPSERT한다.
 *
 * - JSON의 celeb_id가 비어있으면 nickname으로 profiles에서 UUID를 조회
 * - lines 필드만 DB에 반영 (lines_en은 i18n 별도 처리)
 *
 * 사용법: node scripts/dialogue-bulk-update.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIALOGUE_DIR = path.join(ROOT, 'docs', 'celeb-data', 'dialogue');

const SUPABASE_PROJECT_ID = 'wouqtpvfctednlffross';
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50;

// ── Supabase Management API SQL 실행 ──

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error: ${res.status} ${text}`);
  }
  return res.json();
}

// ── JSON 파일 수집 ──

function collectJsonFiles() {
  const files = [];
  const profDirs = fs.readdirSync(DIALOGUE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of profDirs) {
    const dirPath = path.join(DIALOGUE_DIR, dir.name);
    const jsonFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const f of jsonFiles) {
      files.push(path.join(dirPath, f));
    }
  }
  return files;
}

// ── nickname → UUID 매핑 조회 ──

async function fetchNicknameMap() {
  const result = await runSql(`SELECT id, nickname FROM profiles WHERE profile_type = 'CELEB'`);
  const map = new Map();
  for (const row of result) {
    // nickname에서 공백을 _로 치환한 버전도 매핑
    map.set(row.nickname, row.id);
    map.set(row.nickname.replace(/ /g, '_'), row.id);
  }
  return map;
}

// ── 배치 UPSERT SQL 생성 ──

function buildUpsertSql(batch) {
  const values = batch.map(item => {
    const linesStr = JSON.stringify(item.lines).replace(/'/g, "''");
    return `('${item.celeb_id}', '${linesStr}'::jsonb)`;
  }).join(',\n  ');

  return `INSERT INTO celeb_dialogues (celeb_id, lines)
VALUES
  ${values}
ON CONFLICT (celeb_id) DO UPDATE SET
  lines = EXCLUDED.lines,
  updated_at = now();`;
}

// ── 메인 ──

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('SUPABASE_ACCESS_TOKEN 환경변수 필요');
    process.exit(1);
  }

  console.log('nickname → UUID 매핑 조회 중...');
  const nicknameMap = await fetchNicknameMap();
  console.log(`매핑 완료: ${nicknameMap.size / 2}명`);

  console.log('JSON 파일 수집 중...');
  const files = collectJsonFiles();
  console.log(`총 ${files.length}개 파일 발견`);

  // 파싱
  const items = [];
  let skipEmpty = 0;
  let skipNoId = 0;
  let parseErrors = 0;

  for (const filePath of files) {
    const basename = path.basename(filePath, '.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      // 빈 대사 스킵
      if (!data.lines || !data.lines.greeting || data.lines.greeting.length === 0) {
        skipEmpty++;
        continue;
      }

      // celeb_id 확인/조회
      let celebId = data.celeb_id;
      if (!celebId) {
        // nickname 또는 파일명으로 매핑
        celebId = nicknameMap.get(data.nickname) || nicknameMap.get(basename);
      }
      if (!celebId) {
        skipNoId++;
        console.warn(`SKIP (ID 미확인): ${basename} (nickname: ${data.nickname})`);
        continue;
      }

      items.push({
        celeb_id: celebId,
        nickname: data.nickname || basename,
        lines: data.lines,
      });
    } catch (e) {
      parseErrors++;
      console.error(`PARSE ERROR: ${basename} - ${e.message}`);
    }
  }

  console.log(`\n파싱 완료:`);
  console.log(`  성공: ${items.length}개`);
  console.log(`  빈 대사 스킵: ${skipEmpty}개`);
  console.log(`  ID 미확인 스킵: ${skipNoId}개`);
  console.log(`  파싱 에러: ${parseErrors}개`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] SQL 생성만 하고 실행하지 않음');
    if (items.length > 0) {
      const sql = buildUpsertSql(items.slice(0, 2));
      console.log('샘플 SQL (2건):\n', sql.substring(0, 2000));
    }
    if (skipNoId > 0) {
      console.log('\n--- ID 미확인 목록 다시 출력 ---');
    }
    return;
  }

  // 배치 실행
  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  let success = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const sql = buildUpsertSql(batch);

    try {
      await runSql(sql);
      success += batch.length;
      console.log(`배치 ${batchNum}/${totalBatches}: ${batch.length}건 성공 (누적 ${success})`);
    } catch (e) {
      console.error(`배치 ${batchNum}/${totalBatches}: 실패 - ${e.message}`);
      // 개별 실행 폴백
      for (const item of batch) {
        try {
          await runSql(buildUpsertSql([item]));
          success++;
        } catch (e2) {
          fail++;
          console.error(`  개별 실패: ${item.nickname} - ${e2.message}`);
        }
      }
    }
  }

  console.log(`\n완료: ${success}건 성공, ${fail}건 실패 / 전체 ${items.length}건`);
}

main().catch(e => {
  console.error('치명적 오류:', e);
  process.exit(1);
});
