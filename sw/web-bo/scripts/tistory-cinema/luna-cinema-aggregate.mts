import fs from 'node:fs';
import path from 'node:path';

const argValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const channelDir = argValue('--dir') ?? 'D:/blog-assets/tistory-cinema';
const inventoryPath = argValue('--inventory') ?? path.join(channelDir, 'luna-cinema-full-inventory.json');
const initialInputPath = argValue('--initial-input') ?? path.join(channelDir, 'luna-cinema-initial-slop-input.json');
const initialReviewPath = argValue('--initial-review') ?? path.join(channelDir, 'luna-cinema-initial-slop.json');
const outputPath = argValue('--output') ?? path.join(channelDir, 'luna-cinema-full-slop.json');
const workerIndexes = [1, 2, 3, 4, 5];

type AnyRecord = Record<string, unknown>;

function readJson(filePath: string): AnyRecord {
  let text = fs.readFileSync(filePath, 'utf8');
  // Some worker writers left a literal backslash-n after the JSON document.
  text = text.replace(/\\n\s*$/, '');
  return JSON.parse(text) as AnyRecord;
}

function sameValue(a: unknown, b: unknown): boolean {
  return a === b;
}

function requireString(row: AnyRecord, field: string, label: string): string {
  const value = row[field];
  if (typeof value !== 'string' || !value) throw new Error(`${label}: missing string ${field}`);
  return value;
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function validateTextShape(row: AnyRecord, label: string, errors: string[]) {
  for (const field of ['before', 'after', 'review_en_before', 'review_en_after']) {
    if (!isTextOrNull(row[field])) errors.push(`${label}: ${field} must be a string or null`);
  }
  if (row.after === null || (typeof row.after === 'string' && !row.after.trim())) {
    errors.push(`${label}: Korean after is empty`);
  }
  if (row.before !== null && row.after === null) errors.push(`${label}: Korean review was nulled`);
  if (row.review_en_before !== null && row.review_en_after === null) errors.push(`${label}: English review was nulled`);
}

function validateDecision(row: AnyRecord, label: string, errors: string[]) {
  const decision = row.decision;
  if (decision !== 'keep' && decision !== 'revise') errors.push(`${label}: invalid decision ${String(decision)}`);
  if (typeof row.reason !== 'string' || !row.reason.trim()) errors.push(`${label}: missing reason`);
  validateTextShape(row, label, errors);
  if (decision === 'keep'
    && (!sameValue(row.after, row.before) || !sameValue(row.review_en_after, row.review_en_before))) {
    errors.push(`${label}: keep changed text`);
  }
}

function validateIdentity(result: AnyRecord, input: AnyRecord, label: string, errors: string[]) {
  for (const field of ['celeb_id', 'content_id', 'work', 'nickname', 'source_url']) {
    if (!sameValue(result[field], input[field])) errors.push(`${label}: ${field} changed`);
  }
}

const inventory = readJson(inventoryPath);
const initialInput = readJson(initialInputPath);
const initialReview = readJson(initialReviewPath);
const inventoryRows = inventory.rows as AnyRecord[];
const initialInputRows = initialInput.rows as AnyRecord[];
const initialReviewRows = initialReview.rows as AnyRecord[];
if (!Array.isArray(inventoryRows) || !Array.isArray(initialInputRows) || !Array.isArray(initialReviewRows)) {
  throw new Error('Inventory, initial input, and initial review rows must be arrays');
}

const errors: string[] = [];
const inventoryIds = new Set<string>();
for (const row of inventoryRows) {
  const rid = requireString(row, 'rid', 'inventory');
  if (inventoryIds.has(rid)) errors.push(`inventory: duplicate relation ID ${rid}`);
  inventoryIds.add(rid);
}
if (inventoryRows.length !== 1271) errors.push(`inventory: expected 1271 unique rows, got ${inventoryRows.length}`);

const initialInputById = new Map<string, AnyRecord>();
for (const row of initialInputRows) {
  const rid = requireString(row, 'rid', 'initial input');
  if (initialInputById.has(rid)) errors.push(`initial input: duplicate relation ID ${rid}`);
  initialInputById.set(rid, row);
  if (!inventoryIds.has(rid)) errors.push(`initial input: ID outside inventory ${rid}`);
}
if (initialInputRows.length !== 33) errors.push(`initial input: expected 33 rows, got ${initialInputRows.length}`);
if (initialReviewRows.length !== initialInputRows.length) {
  errors.push(`initial review: rows=${initialReviewRows.length} expected=${initialInputRows.length}`);
}

const initialResultById = new Map<string, AnyRecord>();
for (const row of initialReviewRows) {
  const rid = requireString(row, 'rid', 'initial review');
  if (initialResultById.has(rid)) errors.push(`initial review: duplicate relation ID ${rid}`);
  const inputRow = initialInputById.get(rid);
  if (!inputRow) {
    errors.push(`initial review: result ID not in initial input ${rid}`);
    continue;
  }
  validateIdentity(row, inputRow, `initial ${rid}`, errors);
  if (!sameValue(row.before, inputRow.current_review)) errors.push(`initial ${rid}: Korean before differs from current_review`);
  if (!sameValue(row.review_en_before, inputRow.review_en)) errors.push(`initial ${rid}: English before differs from review_en`);
  validateDecision(row, `initial ${rid}`, errors);
  initialResultById.set(rid, row);
}
if (initialResultById.size !== initialInputById.size) errors.push('initial input/review ID sets differ');
for (const rid of initialInputById.keys()) {
  if (!initialResultById.has(rid)) errors.push(`initial review: missing result ID ${rid}`);
}

const expectedWorkerRows = inventoryRows.filter((row) => !initialInputById.has(requireString(row, 'rid', 'inventory')));
const expectedWorkerIds = new Set(expectedWorkerRows.map((row) => requireString(row, 'rid', 'inventory')));
const allResults = new Map<string, AnyRecord>();
for (const [rid, row] of initialResultById) {
  if (allResults.has(rid)) errors.push(`duplicate result ID ${rid}`);
  else allResults.set(rid, row);
}

const workerReports: AnyRecord[] = [];
for (const workerIndex of workerIndexes) {
  const inputPath = path.join(channelDir, `luna-cinema-worker-${workerIndex}-input.json`);
  const resultPath = path.join(channelDir, `luna-cinema-worker-${workerIndex}-slop.json`);
  if (!fs.existsSync(inputPath)) {
    errors.push(`worker-${workerIndex}: input missing`);
    continue;
  }
  if (!fs.existsSync(resultPath)) {
    errors.push(`worker-${workerIndex}: slop result missing`);
    continue;
  }

  const input = readJson(inputPath);
  const result = readJson(resultPath);
  const inputRows = input.rows as AnyRecord[];
  const resultRows = result.rows as AnyRecord[];
  const summary = result.summary as AnyRecord | undefined;
  if (!Array.isArray(inputRows) || !Array.isArray(resultRows) || !summary) {
    errors.push(`worker-${workerIndex}: invalid rows/summary`);
    continue;
  }
  const expectedCount = inputRows.length;
  if (summary.processed !== expectedCount || summary.total !== expectedCount || resultRows.length !== expectedCount) {
    errors.push(`worker-${workerIndex}: incomplete processed=${summary.processed} rows=${resultRows.length} total=${summary.total} expected=${expectedCount}`);
    continue;
  }

  const inputById = new Map<string, AnyRecord>();
  for (const row of inputRows) {
    const rid = requireString(row, 'rid', `worker-${workerIndex} input`);
    if (inputById.has(rid)) errors.push(`worker-${workerIndex}: duplicate input ID ${rid}`);
    inputById.set(rid, row);
    if (!expectedWorkerIds.has(rid)) errors.push(`worker-${workerIndex}: ID outside expected worker set ${rid}`);
  }

  const resultIds = new Set<string>();
  for (const row of resultRows) {
    const rid = requireString(row, 'rid', `worker-${workerIndex} result`);
    if (resultIds.has(rid)) errors.push(`worker-${workerIndex}: duplicate result ID ${rid}`);
    resultIds.add(rid);
    const inputRow = inputById.get(rid);
    if (!inputRow) {
      errors.push(`worker-${workerIndex}: result ID not in input ${rid}`);
      continue;
    }
    validateIdentity(row, inputRow, `worker-${workerIndex} ${rid}`, errors);
    if (!sameValue(row.before, inputRow.current_review)) errors.push(`worker-${workerIndex} ${rid}: Korean before differs from current_review`);
    if (!sameValue(row.review_en_before, inputRow.review_en)) errors.push(`worker-${workerIndex} ${rid}: English before differs from review_en`);
    validateDecision(row, `worker-${workerIndex} ${rid}`, errors);
    if (allResults.has(rid)) errors.push(`worker-${workerIndex}: duplicate across result sets ${rid}`);
    else allResults.set(rid, row);
  }
  if (inputById.size !== resultIds.size || [...inputById.keys()].some((rid) => !resultIds.has(rid))) {
    errors.push(`worker-${workerIndex}: input/result ID sets differ`);
  }
  workerReports.push({ worker: workerIndex, inputPath, resultPath, summary, inputCount: expectedCount, complete: true });
}

const expectedIds = new Set(inventoryRows.map((row) => requireString(row, 'rid', 'inventory')));
const missing = [...expectedIds].filter((rid) => !allResults.has(rid));
const extra = [...allResults.keys()].filter((rid) => !expectedIds.has(rid));
if (missing.length) errors.push(`missing result IDs: ${missing.length}`);
if (extra.length) errors.push(`extra result IDs: ${extra.length}`);
if (allResults.size !== expectedIds.size) errors.push(`aggregate: result count=${allResults.size} expected=${expectedIds.size}`);

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors, inventoryCount: inventoryRows.length, initialCount: initialInputRows.length, expectedWorkerCount: expectedWorkerRows.length, workerReports }, null, 2));
  process.exit(1);
}

const rows = inventoryRows.map((inventoryRow) => allResults.get(requireString(inventoryRow, 'rid', 'inventory'))!);
const counts = { total: 0, processed: 0, keep: 0, revise: 0, changed: 0 };
for (const row of rows) {
  counts.total += 1;
  counts.processed += 1;
  if (row.decision === 'keep') counts.keep += 1;
  if (row.decision === 'revise') counts.revise += 1;
  if (row.before !== row.after || row.review_en_before !== row.review_en_after) counts.changed += 1;
}

const output = {
  generatedAt: new Date().toISOString(),
  status: 'ready_for_db_apply',
  dbWrites: 0,
  basis: '현재 DB 기준 1,271개 고유 영화 관계를 초기 33건과 5개 worker slop 결과로 합친 기계 검증 결과. 출처 확인 단계는 포함하지 않는다.',
  sourceInventory: inventoryPath,
  initialInput: initialInputPath,
  initialReview: initialReviewPath,
  workerReports,
  summary: counts,
  rows,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
fs.writeFileSync(temporaryPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
fs.renameSync(temporaryPath, outputPath);
console.log(JSON.stringify({ ok: true, outputPath, summary: counts }, null, 2));
