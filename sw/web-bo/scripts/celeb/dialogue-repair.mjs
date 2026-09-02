/**
 * 활성 셀럽의 celeb_dialogues.lines / lines_en 최상위 key shape 교정.
 *
 * 안전 원칙:
 * - 기본 dry-run, --apply 때만 저장
 * - KO에 없는 EN 여분 key만 제거
 * - KO에만 있는 key를 번역·창작하지 않음
 * - 공통 key의 값은 일절 수정하지 않음
 * - 적용 전 원본을 .tmp-dialogue-shape-backup.json에 저장
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const filename of [".env.local", ".env"]) {
  const file = resolve(process.cwd(), filename);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const APPLY = process.argv.includes("--apply");
const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL,
  process.env.DB_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function expect(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

const celebs = [];
for (let from = 0; ; from += 500) {
  const page = await expect(
    db
      .from("celebs")
      .select("id,slug")
      .eq("publication_status", "active")
      .order("id")
      .range(from, from + 499),
    "active celebs",
  );
  celebs.push(...page);
  if (page.length < 500) break;
}

const celebById = new Map(celebs.map((celeb) => [celeb.id, celeb]));
const rows = [];
for (let index = 0; index < celebs.length; index += 100) {
  const ids = celebs.slice(index, index + 100).map((celeb) => celeb.id);
  rows.push(...await expect(
    db.from("celeb_dialogues").select("celeb_id,lines,lines_en").in("celeb_id", ids),
    "celeb_dialogues",
  ));
}

const repairs = [];
for (const row of rows) {
  if (!row.lines || !row.lines_en || typeof row.lines !== "object" || typeof row.lines_en !== "object") {
    continue;
  }
  const koKeys = new Set(Object.keys(row.lines));
  const extraEnKeys = Object.keys(row.lines_en).filter((key) => !koKeys.has(key));
  if (extraEnKeys.length === 0) continue;
  const next = structuredClone(row.lines_en);
  for (const key of extraEnKeys) delete next[key];
  repairs.push({
    celebId: row.celeb_id,
    slug: celebById.get(row.celeb_id)?.slug ?? "(unknown)",
    extraEnKeys,
    before: row.lines_en,
    after: next,
  });
}

console.log(`활성 대사 ${rows.length}행 | EN 여분 key ${repairs.length}행 | ${APPLY ? "적용" : "dry-run"}`);
for (const repair of repairs) {
  console.log(`  ${repair.slug}: remove [${repair.extraEnKeys.join(", ")}]`);
}

if (!APPLY) {
  console.log("\n※ 적용하려면 --apply");
  process.exit(0);
}

writeFileSync(
  resolve(process.cwd(), ".tmp-dialogue-shape-backup.json"),
  `${JSON.stringify(repairs, null, 2)}\n`,
);
for (const repair of repairs) {
  const { error } = await db
    .from("celeb_dialogues")
    .update({ lines_en: repair.after })
    .eq("celeb_id", repair.celebId);
  if (error) throw error;
}
console.log(`교정 완료 ${repairs.length}행`);
