/**
 * 활성 셀럽 상세 화면의 KO→EN 누락 필드 백필.
 *
 * 기본은 dry-run이며 --apply 때만 DB를 갱신한다.
 * 번역은 Claude CLI 구독 인증을 사용하고, 완료 항목은 .tmp-celeb-i18n-backfill/done.jsonl에 기록한다.
 *
 * 실행:
 *   node scripts/backfill-celeb-i18n.mjs
 *   node scripts/backfill-celeb-i18n.mjs --apply
 *   node scripts/backfill-celeb-i18n.mjs --apply --resume
 *   node scripts/backfill-celeb-i18n.mjs --apply --limit 20
 */

import { createClient } from "@supabase/supabase-js";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { resolve } from "node:path";

function loadEnv() {
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
}
loadEnv();

function numberArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? Number.parseInt(process.argv[index + 1], 10) : fallback;
}

const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const LIMIT = numberArg("--limit", Number.POSITIVE_INFINITY);
const CONCURRENCY = numberArg("--conc", 4);
const BATCH_SIZE = numberArg("--batch", 12);
const MODEL = "sonnet";
const STATE_DIR = resolve(process.cwd(), ".tmp-celeb-i18n-backfill");
const DONE_FILE = resolve(STATE_DIR, "done.jsonl");

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
if (!RESUME) writeFileSync(DONE_FILE, "");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const chunks = (values, size) => {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

async function expect(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function selectActiveProfiles() {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const page = await expect(
      db
        .from("profiles")
        .select(
          "id,slug,status,celeb_tier,nickname,nickname_en,bio,bio_en,title,title_en,"
          + "cultural_journey,cultural_journey_en,consumption_philosophy,consumption_philosophy_en",
        )
        .eq("profile_type", "CELEB")
        .eq("status", "active")
        .not("slug", "is", null)
        .order("id")
        .range(from, from + 499),
      `active profiles ${from}-${from + 499}`,
    );
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}

async function selectByIds(table, columns, ids, foreignKey = "celeb_id") {
  const rows = [];
  for (const group of chunks(ids, 100)) {
    rows.push(...await expect(
      db.from(table).select(columns).in(foreignKey, group),
      `${table}.${foreignKey}`,
    ));
  }
  return rows;
}

function completedIds() {
  if (!RESUME || !existsSync(DONE_FILE)) return new Set();
  return new Set(
    readFileSync(DONE_FILE, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line).id),
  );
}

let claudeExecutable = null;
function claudeBin() {
  if (claudeExecutable) return claudeExecutable;
  try {
    const found = execSync(process.platform === "win32" ? "where claude" : "which claude", {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const bin = found.find((value) => value.toLowerCase().endsWith(".cmd")) ?? found[0] ?? "claude";
    claudeExecutable = /\s/.test(bin) ? `"${bin}"` : bin;
  } catch {
    claudeExecutable = "claude";
  }
  return claudeExecutable;
}

function runClaude(prompt) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      claudeBin(),
      ["-p", "--model", MODEL, "--output-format", "text"],
      { shell: true, timeout: 300_000 },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(`claude exit ${code}: ${stderr.slice(0, 500)}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const DOMAIN_GUIDE = {
  profile_title:
    "These are compact epithets shown beneath a person's name. Translate as a concise, polished epithet.",
  profile_bio:
    "These are short factual biographies. Preserve every fact, name, date, and degree of certainty. Do not add context.",
  profile_journey:
    "These describe a person's cultural journey. Preserve the paragraph structure and the evidence strength. Do not invent works or episodes.",
  profile_philosophy:
    "These summarize a person's approach to cultural consumption. Keep the voice analytical but natural.",
  persona_rationale:
    "These explain quantitative figure metrics. Render internal snake_case axes as natural reader-facing English, never as raw identifiers.",
  faction_short:
    "These are compact faction-card summaries. Keep them concise and specific to the person and faction.",
  faction_long:
    "These are longer faction descriptions. Preserve claims and relationships exactly; do not add history.",
  content_review:
    "These explain how a person encountered or regarded a work. Translate faithfully. Do not create quotations, facts, titles, or motives.",
  relation_name:
    "These are personal names lacking an official English Wikidata label. Romanize or use the standard English form only; output only the name.",
};

function promptFor(domain, batch) {
  return `Translate the following Korean database fields into natural English for Feel&Note, a cultural archive.

${DOMAIN_GUIDE[domain]}

Rules:
- Return ONLY a valid JSON array of objects shaped exactly as {"id":"...","en":"..."}.
- Return every input id exactly once and no other ids.
- Translate only the supplied Korean text. Never add facts or explanatory notes.
- Preserve quotation status: do not turn paraphrase into a direct quotation.
- Preserve meaningful line breaks for multi-paragraph text.
- Restore established English spellings of names and well-known work titles when certain; otherwise transliterate conservatively.
- No Korean or CJK characters may remain in the English value.
- No markdown fences, preamble, commentary, or translator notes.

Input:
${JSON.stringify(batch.map((item) => ({
    id: item.id,
    ko: item.ko,
    context: item.context,
  })))}`;
}

function parseTranslationOutput(raw, batch) {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first < 0 || last < first) throw new Error(`JSON array not found: ${text.slice(0, 180)}`);
  const parsed = JSON.parse(text.slice(first, last + 1));
  if (!Array.isArray(parsed)) throw new Error("Translation response is not an array.");

  const expected = new Set(batch.map((item) => item.id));
  const result = new Map();
  for (const entry of parsed) {
    if (!entry || typeof entry.id !== "string" || typeof entry.en !== "string") {
      throw new Error("Translation entry does not match {id,en}.");
    }
    if (!expected.has(entry.id) || result.has(entry.id)) {
      throw new Error(`Unexpected or duplicate translation id: ${entry.id}`);
    }
    const en = entry.en.trim();
    if (!en) throw new Error(`Empty translation: ${entry.id}`);
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ一-鿿]/u.test(en)) throw new Error(`Korean/CJK remains: ${entry.id}`);
    const sourceLength = batch.find((item) => item.id === entry.id).ko.length;
    if (en.length > sourceLength * 6 + 160) throw new Error(`Translation expanded too far: ${entry.id}`);
    result.set(entry.id, en);
  }
  if (result.size !== expected.size) {
    const missing = [...expected].filter((id) => !result.has(id));
    throw new Error(`Missing translation ids: ${missing.join(", ")}`);
  }
  return result;
}

async function translateBatch(domain, batch) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return parseTranslationOutput(await runClaude(promptFor(domain, batch)), batch);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        console.warn(`  ↻ ${domain} batch retry ${attempt}/2: ${error.message}`);
      }
    }
  }
  throw lastError;
}

async function officialEnglishLabels(qids) {
  const labels = new Map();
  for (const group of chunks([...new Set(qids)], 50)) {
    if (group.length === 0) continue;
    const endpoint = new URL("https://www.wikidata.org/w/api.php");
    endpoint.searchParams.set("action", "wbgetentities");
    endpoint.searchParams.set("ids", group.join("|"));
    endpoint.searchParams.set("props", "labels");
    // Wikidata는 2026년 다국어 공통 인명을 mul label로 옮겼다.
    // en만 요청하면 Anne Brontë 같은 항목도 빈 labels가 오므로 mul fallback을 함께 받는다.
    endpoint.searchParams.set("languages", "en|mul");
    endpoint.searchParams.set("languagefallback", "1");
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("origin", "*");
    const response = await fetch(endpoint, {
      headers: { "user-agent": "feelandnote-i18n-backfill/1.0 (webcodur@gmail.com)" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Wikidata labels HTTP ${response.status}`);
    const json = await response.json();
    for (const qid of group) {
      const entityLabels = json.entities?.[qid]?.labels;
      const label = entityLabels?.en?.value ?? entityLabels?.mul?.value;
      if (hasText(label)) labels.set(qid, label.trim());
    }
  }
  return labels;
}

async function applyItem(item, en) {
  if (!APPLY) return;
  if (item.kind === "persona") {
    const persona = structuredClone(item.persona);
    persona.rationale_en = en;
    const { error } = await db.from("celeb_persona").update({ persona }).eq("id", item.rowId);
    if (error) throw error;
  } else {
    const { error } = await db
      .from(item.table)
      .update({ [item.column]: en })
      .eq("id", item.rowId);
    if (error) throw error;
  }
  appendFileSync(DONE_FILE, `${JSON.stringify({ id: item.id, en })}\n`);
}

async function buildTargets() {
  const profiles = await selectActiveProfiles();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const ids = profiles.map((profile) => profile.id);
  const items = [];

  const addText = ({ domain, table, rowId, column, ko, context, kind, persona }) => {
    if (!hasText(ko)) return;
    items.push({
      id: `${table}:${rowId}:${column}`,
      domain,
      table,
      rowId,
      column,
      ko: ko.trim(),
      context,
      kind,
      persona,
    });
  };

  for (const profile of profiles) {
    const context = {
      slug: profile.slug,
      person: profile.nickname_en || profile.nickname,
      tier: profile.celeb_tier,
    };
    for (const [source, target, domain] of [
      ["title", "title_en", "profile_title"],
      ["bio", "bio_en", "profile_bio"],
      // cultural_journey(_en)은 consumption_philosophy(_en)의 generated alias라 직접 쓰지 않는다.
      ["consumption_philosophy", "consumption_philosophy_en", "profile_philosophy"],
    ]) {
      if (hasText(profile[source]) && !hasText(profile[target])) {
        addText({
          domain, table: "profiles", rowId: profile.id, column: target,
          ko: profile[source], context,
        });
      }
    }
  }

  const personaRows = await selectByIds("celeb_persona", "id,celeb_id,persona", ids);
  for (const row of personaRows) {
    if (!row.persona || !hasText(row.persona.rationale_ko) || hasText(row.persona.rationale_en)) continue;
    const profile = profileById.get(row.celeb_id);
    addText({
      domain: "persona_rationale",
      table: "celeb_persona",
      rowId: row.id,
      column: "persona.rationale_en",
      ko: row.persona.rationale_ko,
      context: { slug: profile?.slug, person: profile?.nickname_en || profile?.nickname },
      kind: "persona",
      persona: row.persona,
    });
  }

  const assignmentRows = await selectByIds(
    "celeb_tag_assignments",
    "id,celeb_id,tag_id,short_desc,short_desc_en,long_desc,long_desc_en",
    ids,
  );
  const tagIds = [...new Set(assignmentRows.map((row) => row.tag_id))];
  const tags = new Map();
  for (const group of chunks(tagIds, 100)) {
    for (const tag of await expect(
      db.from("celeb_tags").select("id,name,name_en").in("id", group),
      "celeb_tags",
    )) tags.set(tag.id, tag);
  }
  for (const row of assignmentRows) {
    const profile = profileById.get(row.celeb_id);
    const tag = tags.get(row.tag_id);
    const context = {
      slug: profile?.slug,
      person: profile?.nickname_en || profile?.nickname,
      faction: tag?.name_en || tag?.name,
    };
    if (hasText(row.short_desc) && !hasText(row.short_desc_en)) {
      addText({
        domain: "faction_short", table: "celeb_tag_assignments", rowId: row.id,
        column: "short_desc_en", ko: row.short_desc, context,
      });
    }
    if (hasText(row.long_desc) && !hasText(row.long_desc_en)) {
      addText({
        domain: "faction_long", table: "celeb_tag_assignments", rowId: row.id,
        column: "long_desc_en", ko: row.long_desc, context,
      });
    }
  }

  const reviewRows = await selectByIds(
    "user_contents",
    "id,user_id,content_id,review,review_en",
    ids,
    "user_id",
  );
  for (const row of reviewRows) {
    if (!hasText(row.review) || hasText(row.review_en)) continue;
    const profile = profileById.get(row.user_id);
    addText({
      domain: "content_review", table: "user_contents", rowId: row.id,
      column: "review_en", ko: row.review,
      context: {
        slug: profile?.slug,
        person: profile?.nickname_en || profile?.nickname,
        contentId: row.content_id,
      },
    });
  }

  const relationRows = await selectByIds(
    "celeb_relations_external",
    "id,from_id,qid,name_ko,name_en",
    ids,
    "from_id",
  );
  const missingNames = relationRows.filter((row) => hasText(row.name_ko) && !hasText(row.name_en));
  const labels = await officialEnglishLabels(missingNames.map((row) => row.qid).filter(Boolean));
  let officialCount = 0;
  for (const row of missingNames) {
    const official = labels.get(row.qid);
    if (official) {
      officialCount += 1;
      if (APPLY) {
        const { error } = await db
          .from("celeb_relations_external")
          .update({ name_en: official })
          .eq("id", row.id);
        if (error) throw error;
      }
      continue;
    }
    const profile = profileById.get(row.from_id);
    addText({
      domain: "relation_name", table: "celeb_relations_external", rowId: row.id,
      column: "name_en", ko: row.name_ko,
      context: { relatedTo: profile?.nickname_en || profile?.nickname, qid: row.qid },
    });
  }

  return { profiles, items, officialCount, missingNames: missingNames.length };
}

async function main() {
  const { profiles, items, officialCount, missingNames } = await buildTargets();
  const done = completedIds();
  let targets = items.filter((item) => !done.has(item.id));
  if (Number.isFinite(LIMIT)) targets = targets.slice(0, LIMIT);

  const byDomain = new Map();
  for (const item of targets) {
    const list = byDomain.get(item.domain) ?? [];
    list.push(item);
    byDomain.set(item.domain, list);
  }
  const jobs = [];
  for (const [domain, domainItems] of byDomain) {
    for (const batch of chunks(domainItems, BATCH_SIZE)) jobs.push({ domain, batch });
  }

  console.log(
    `활성 셀럽 ${profiles.length} | 번역 대상 ${targets.length}`
    + ` | Wikidata 관계명 ${officialCount}/${missingNames}`
    + ` | ${APPLY ? "DB 적용" : "dry-run"} | ${jobs.length} batches`,
  );
  for (const [domain, domainItems] of byDomain) {
    console.log(`  ${domain}: ${domainItems.length}`);
  }
  if (!APPLY) {
    console.log("\n※ 실제 번역·적재는 --apply를 붙여 실행한다.");
    return;
  }

  let cursor = 0;
  let completed = 0;
  let failed = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (true) {
      const jobIndex = cursor;
      cursor += 1;
      const job = jobs[jobIndex];
      if (!job) return;
      const started = Date.now();
      try {
        const translated = await translateBatch(job.domain, job.batch);
        for (const item of job.batch) {
          await applyItem(item, translated.get(item.id));
        }
        completed += job.batch.length;
        console.log(
          `✓ ${job.domain} ${job.batch.length}건`
          + ` (${completed}/${targets.length}, ${Math.round((Date.now() - started) / 1000)}s)`,
        );
      } catch (error) {
        failed += job.batch.length;
        failures.push({ domain: job.domain, ids: job.batch.map((item) => item.id), error: error.message });
        console.error(`✗ ${job.domain} ${job.batch.length}건: ${error.message}`);
      }
    }
  });
  await Promise.all(workers);

  if (failures.length > 0) {
    const file = resolve(STATE_DIR, "failures.json");
    writeFileSync(file, `${JSON.stringify(failures, null, 2)}\n`);
    throw new Error(`번역 실패 ${failed}건. ${file} 확인 후 --resume으로 재실행한다.`);
  }
  console.log(`완료: 번역 ${completed}건 + Wikidata 관계명 ${officialCount}건`);
}

await main();
