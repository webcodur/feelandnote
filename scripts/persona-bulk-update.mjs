/**
 * 페르소나 JSON 파일 → DB 일괄 반영 스크립트
 *
 * docs/celeb-data/persona/**\/*.json 파일을 읽어
 * celeb_persona 테이블에 UPSERT한다.
 *
 * 사용법: node scripts/persona-bulk-update.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PERSONA_DIR = path.join(ROOT, 'docs', 'celeb-data', 'persona');

// Supabase 설정
const SUPABASE_URL = 'https://wouqtpvfctednlffross.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50;

// ── JSON 파일 수집 ──

function collectJsonFiles() {
  const files = [];
  const profDirs = fs.readdirSync(PERSONA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of profDirs) {
    const dirPath = path.join(PERSONA_DIR, dir.name);
    const jsonFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const f of jsonFiles) {
      files.push(path.join(dirPath, f));
    }
  }
  return files;
}

// ── JSON → DB persona jsonb 변환 ──

function buildPersonaJsonb(data) {
  // JSON 파일에서 celeb_id, nickname, profession 제외하고 persona jsonb 구성
  const { abilities, inner_virtues, outer_virtues, dispositions, rationale_ko, rationale_en } = data;
  return { abilities, inner_virtues, outer_virtues, dispositions, rationale_ko, rationale_en };
}

// ── 개별 컬럼 값 추출 ──

function extractScores(data) {
  const scores = {};
  for (const [key, val] of Object.entries(data.abilities)) {
    scores[key] = val.score;
  }
  for (const [key, val] of Object.entries(data.inner_virtues)) {
    scores[key] = val.score;
  }
  for (const [key, val] of Object.entries(data.outer_virtues)) {
    scores[key] = val.score;
  }
  for (const [key, val] of Object.entries(data.dispositions)) {
    scores[key] = val.score;
  }
  return scores;
}

// ── Supabase RPC 호출 ──

async function executeSql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error: ${res.status} ${text}`);
  }
  return res.json();
}

// ── 직접 SQL 실행 (PostgREST가 아닌 Management API) ──

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/wouqtpvfctednlffross/database/query`, {
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

// ── 배치 UPSERT SQL 생성 ──

function buildUpsertSql(batch) {
  const values = batch.map(item => {
    const personaStr = JSON.stringify(item.persona).replace(/'/g, "''");
    const s = item.scores;
    return `('${item.celeb_id}', '${personaStr}'::jsonb, ${s.command}, ${s.martial}, ${s.intellect}, ${s.charm}, ${s.temperance}, ${s.diligence}, ${s.reflection}, ${s.courage}, ${s.loyalty}, ${s.benevolence}, ${s.fairness}, ${s.humility}, ${s.pessimism_optimism}, ${s.conservative_progressive}, ${s.individual_social}, ${s.cautious_bold})`;
  }).join(',\n  ');

  return `INSERT INTO celeb_persona (celeb_id, persona, command, martial, intellect, charm, temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility, pessimism_optimism, conservative_progressive, individual_social, cautious_bold)
VALUES
  ${values}
ON CONFLICT (celeb_id) DO UPDATE SET
  persona = EXCLUDED.persona,
  command = EXCLUDED.command,
  martial = EXCLUDED.martial,
  intellect = EXCLUDED.intellect,
  charm = EXCLUDED.charm,
  temperance = EXCLUDED.temperance,
  diligence = EXCLUDED.diligence,
  reflection = EXCLUDED.reflection,
  courage = EXCLUDED.courage,
  loyalty = EXCLUDED.loyalty,
  benevolence = EXCLUDED.benevolence,
  fairness = EXCLUDED.fairness,
  humility = EXCLUDED.humility,
  pessimism_optimism = EXCLUDED.pessimism_optimism,
  conservative_progressive = EXCLUDED.conservative_progressive,
  individual_social = EXCLUDED.individual_social,
  cautious_bold = EXCLUDED.cautious_bold,
  updated_at = now();`;
}

// ── 메인 ──

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('SUPABASE_ACCESS_TOKEN 환경변수 필요');
    process.exit(1);
  }

  console.log('JSON 파일 수집 중...');
  const files = collectJsonFiles();
  console.log(`총 ${files.length}개 파일 발견`);

  // 파싱
  const items = [];
  let parseErrors = 0;
  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (!data.celeb_id || !data.abilities) {
        console.warn(`SKIP (구조 불일치): ${path.basename(filePath)}`);
        continue;
      }

      items.push({
        celeb_id: data.celeb_id,
        nickname: data.nickname,
        persona: buildPersonaJsonb(data),
        scores: extractScores(data),
      });
    } catch (e) {
      parseErrors++;
      console.error(`PARSE ERROR: ${path.basename(filePath)} - ${e.message}`);
    }
  }

  console.log(`파싱 완료: ${items.length}개 성공, ${parseErrors}개 실패`);

  if (DRY_RUN) {
    console.log('[DRY RUN] SQL 생성만 하고 실행하지 않음');
    const sql = buildUpsertSql(items.slice(0, 3));
    console.log('샘플 SQL (3건):\n', sql.substring(0, 2000));
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
      fail += batch.length;
      console.error(`배치 ${batchNum}/${totalBatches}: 실패 - ${e.message}`);
      // 개별 실행 폴백
      for (const item of batch) {
        try {
          await runSql(buildUpsertSql([item]));
          success++;
          fail--;
        } catch (e2) {
          console.error(`개별 실패: ${item.nickname} - ${e2.message}`);
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
