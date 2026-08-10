#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      parsed[rawKey] = argv[index + 1];
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}

function findRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (
      fs.existsSync(path.join(current, "sw", "web", "package.json"))
      && fs.existsSync(path.join(current, "docs", "project", "db-celeb.md"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        "Could not find the Feel&Note repository root. Run this inside the repository.",
      );
    }
    current = parent;
  }
}

const options = parseArgs(process.argv.slice(2));
const scanAll = Boolean(options.all);
const activeOnly = Boolean(options.active);
const slugs = String(options.slugs || options.slug || (scanAll ? "" : "stanley-kubrick"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const strict = Boolean(options.strict);
const jsonOutput = Boolean(options.json);

const repoRoot = findRepoRoot(process.cwd() || scriptDir);
const webRoot = path.join(repoRoot, "sw", "web");
const requireFromWeb = createRequire(path.join(webRoot, "package.json"));
const requireFromRepo = createRequire(path.join(repoRoot, "package.json"));
const dotenv = requireFromRepo("dotenv");
const { createClient } = requireFromWeb("@supabase/supabase-js");
for (const filename of [".env.local", ".env"]) {
  const envPath = path.join(webRoot, filename);
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const findings = {
  errors: [],
  warnings: [],
  info: [],
};
const coverage = new Map();

function add(severity, code, message, context = {}) {
  findings[severity].push({ code, message, ...context });
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function noteCoverage(code, matched) {
  const current = coverage.get(code) || { checked: 0, matched: 0, missing: 0 };
  current.checked += 1;
  if (matched) current.matched += 1;
  else current.missing += 1;
  coverage.set(code, current);
}

function checkPair({
  row,
  ko,
  en,
  code,
  label,
  severity = "warnings",
  context = {},
}) {
  const koPresent = hasValue(row?.[ko]);
  if (!koPresent) return;
  const enPresent = hasValue(row?.[en]);
  noteCoverage(code, enPresent);
  if (!enPresent) {
    add(severity, code, `${label}: '${ko}' has data but '${en}' is empty.`, context);
  }
}

async function expectQuery(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data || [];
}

async function selectAllProfiles() {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    let query = supabase
        .from("celebs")
        .select([
          "id",
          "slug",
          "publication_status",
          "celeb_tier",
          "nickname",
          "nickname_en",
          "bio",
          "bio_en",
          "title",
          "title_en",
          "virtual_monologue",
          "virtual_monologue_en",
          "cultural_journey",
          "cultural_journey_en",
          "consumption_philosophy",
          "consumption_philosophy_en",
        ].join(","));
    if (activeOnly) query = query.eq("publication_status", "active");
    const page = await expectQuery(
      query
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1),
      `celebs range ${from}-${from + pageSize - 1}`,
    );
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function selectProfiles() {
  if (scanAll) return selectAllProfiles();
  let query = supabase
    .from("celebs")
    .select([
      "id",
      "slug",
      "publication_status",
      "celeb_tier",
      "nickname",
      "nickname_en",
      "bio",
      "bio_en",
      "title",
      "title_en",
      "virtual_monologue",
      "virtual_monologue_en",
      "cultural_journey",
      "cultural_journey_en",
      "consumption_philosophy",
      "consumption_philosophy_en",
    ].join(","));
  if (activeOnly) query = query.eq("publication_status", "active");
  return expectQuery(
    query
      .in("slug", slugs)
      .order("id", { ascending: true }),
    "celebs by slug",
  );
}

function chunks(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function selectByCelebIds(table, columns, ids, foreignKey = "celeb_id") {
  const rows = [];
  for (const group of chunks(ids)) {
    rows.push(...await expectQuery(
      supabase
        .from(table)
        .select(columns)
        .in(foreignKey, group),
      `${table} by ${foreignKey}`,
    ));
  }
  return rows;
}

function slugContext(profileById, celebId, extra = {}) {
  const profile = profileById.get(celebId);
  return {
    slug: profile?.slug || "(unknown)",
    celebId,
    ...extra,
  };
}

function auditProfileRows(profiles) {
  for (const profile of profiles) {
    const context = { slug: profile.slug, celebId: profile.id, tier: profile.celeb_tier };
    checkPair({
      row: profile,
      ko: "nickname",
      en: "nickname_en",
      code: "PROFILE_NICKNAME_EN_MISSING",
      label: "Profile name",
      severity: "errors",
      context,
    });
    for (const [ko, en, code, label] of [
      ["bio", "bio_en", "PROFILE_BIO_EN_MISSING", "Profile biography"],
      ["title", "title_en", "PROFILE_TITLE_EN_MISSING", "Profile epithet"],
      [
        "virtual_monologue",
        "virtual_monologue_en",
        "PROFILE_MONOLOGUE_EN_MISSING",
        "Virtual monologue",
      ],
      [
        "cultural_journey",
        "cultural_journey_en",
        "PROFILE_JOURNEY_EN_MISSING",
        "Cultural journey",
      ],
      [
        "consumption_philosophy",
        "consumption_philosophy_en",
        "PROFILE_PHILOSOPHY_EN_MISSING",
        "Consumption philosophy",
      ],
    ]) {
      checkPair({ row: profile, ko, en, code, label, context });
    }
  }
}

function flattenPersonaEntries(persona) {
  const entries = [];
  if (!persona || typeof persona !== "object") return entries;
  for (const groupName of [
    "abilities",
    "inner_virtues",
    "outer_virtues",
    "dispositions",
  ]) {
    const group = persona[groupName];
    if (!group || typeof group !== "object") continue;
    for (const [key, value] of Object.entries(group)) {
      if (value && typeof value === "object") {
        entries.push({ path: `${groupName}.${key}`, value });
      }
    }
  }
  return entries;
}

function valueShape(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function auditDialogueShape(row, context) {
  if (!hasValue(row.lines) || !hasValue(row.lines_en)) return;
  const koKeys = Object.keys(row.lines).sort();
  const enKeys = Object.keys(row.lines_en).sort();
  if (koKeys.join("|") !== enKeys.join("|")) {
    add(
      "errors",
      "DIALOGUE_KEY_MISMATCH",
      `Dialogue keys differ: ko=[${koKeys.join(", ")}], en=[${enKeys.join(", ")}].`,
      context,
    );
    return;
  }
  for (const key of koKeys) {
    const koShape = valueShape(row.lines[key]);
    const enShape = valueShape(row.lines_en[key]);
    if (koShape !== enShape) {
      add(
        "errors",
        "DIALOGUE_SHAPE_MISMATCH",
        `Dialogue '${key}' has ko=${koShape}, en=${enShape}.`,
        context,
      );
    }
  }
}

const profiles = await selectProfiles();
if (!scanAll) {
  const foundSlugs = new Set(profiles.map((profile) => profile.slug));
  for (const slug of slugs) {
    if (!foundSlugs.has(slug)) {
      add("errors", "PROFILE_NOT_FOUND", `No CELEB profile found for slug '${slug}'.`, { slug });
    }
  }
}

auditProfileRows(profiles);
const ids = profiles.map((profile) => profile.id);
const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

if (ids.length > 0) {
  const explanationRows = await selectByCelebIds(
    "celeb_explanations",
    "profile_id,plain_text,plain_text_en,interpretive_title,interpretive_title_en,interpretive_text,interpretive_text_en",
    ids,
    "profile_id",
  );
  for (const row of explanationRows) {
    const context = slugContext(profileById, row.profile_id);
    for (const [ko, en, code, label] of [
      ["plain_text", "plain_text_en", "EXPLANATION_GUIDE_EN_MISSING", "Read More guide"],
      [
        "interpretive_title",
        "interpretive_title_en",
        "EXPLANATION_TITLE_EN_MISSING",
        "Read More exploration title",
      ],
      [
        "interpretive_text",
        "interpretive_text_en",
        "EXPLANATION_TEXT_EN_MISSING",
        "Read More exploration text",
      ],
    ]) {
      checkPair({ row, ko, en, code, label, context });
    }
  }

  const influenceColumns = [
    "celeb_id",
    "political_exp",
    "political_exp_en",
    "strategic_exp",
    "strategic_exp_en",
    "tech_exp",
    "tech_exp_en",
    "social_exp",
    "social_exp_en",
    "economic_exp",
    "economic_exp_en",
    "cultural_exp",
    "cultural_exp_en",
    "transhistoricity_exp",
    "transhistoricity_exp_en",
  ].join(",");
  const influenceRows = await selectByCelebIds(
    "celeb_influence",
    influenceColumns,
    ids,
  );
  for (const row of influenceRows) {
    const context = slugContext(profileById, row.celeb_id);
    for (const axis of [
      "political",
      "strategic",
      "tech",
      "social",
      "economic",
      "cultural",
      "transhistoricity",
    ]) {
      checkPair({
        row,
        ko: `${axis}_exp`,
        en: `${axis}_exp_en`,
        code: "INFLUENCE_EXPLANATION_EN_MISSING",
        label: `Influence explanation (${axis})`,
        context: { ...context, field: axis },
      });
    }
  }

  const personaRows = await selectByCelebIds(
    "celeb_persona",
    "celeb_id,persona",
    ids,
  );
  for (const row of personaRows) {
    const context = slugContext(profileById, row.celeb_id);
    checkPair({
      row: row.persona,
      ko: "rationale_ko",
      en: "rationale_en",
      code: "PERSONA_RATIONALE_EN_MISSING",
      label: "Persona rationale",
      context,
    });
    for (const entry of flattenPersonaEntries(row.persona)) {
      checkPair({
        row: entry.value,
        ko: "reason_ko",
        en: "reason_en",
        code: "PERSONA_REASON_EN_MISSING",
        label: `Persona reason (${entry.path})`,
        context: { ...context, field: entry.path },
      });
    }
  }

  const dialogueRows = await selectByCelebIds(
    "celeb_dialogues",
    "celeb_id,lines,lines_en",
    ids,
  );
  for (const row of dialogueRows) {
    const context = slugContext(profileById, row.celeb_id);
    checkPair({
      row,
      ko: "lines",
      en: "lines_en",
      code: "DIALOGUE_EN_MISSING",
      label: "Dialogue set",
      context,
    });
    auditDialogueShape(row, context);
  }

  const timelineRows = await selectByCelebIds(
    "celeb_timeline_events",
    "id,celeb_id,title,title_en,description,description_en,place_name,place_name_en",
    ids,
  );
  for (const row of timelineRows) {
    const context = slugContext(profileById, row.celeb_id, { rowId: row.id });
    for (const [ko, en, code, label] of [
      ["title", "title_en", "TIMELINE_TITLE_EN_MISSING", "Timeline title"],
      [
        "description",
        "description_en",
        "TIMELINE_DESCRIPTION_EN_MISSING",
        "Timeline description",
      ],
      ["place_name", "place_name_en", "TIMELINE_PLACE_EN_MISSING", "Timeline place"],
    ]) {
      checkPair({ row, ko, en, code, label, context });
    }
  }

  const relationRows = await selectByCelebIds(
    "celeb_relations",
    "id,from_id,note,note_en",
    ids,
    "from_id",
  );
  for (const row of relationRows) {
    checkPair({
      row,
      ko: "note",
      en: "note_en",
      code: "RELATION_NOTE_EN_MISSING",
      label: "Relation note",
      context: slugContext(profileById, row.from_id, { rowId: row.id }),
    });
  }

  const externalRelationRows = await selectByCelebIds(
    "celeb_relations_external",
    "id,from_id,name_ko,name_en,note,note_en",
    ids,
    "from_id",
  );
  for (const row of externalRelationRows) {
    const context = slugContext(profileById, row.from_id, { rowId: row.id });
    checkPair({
      row,
      ko: "name_ko",
      en: "name_en",
      code: "EXTERNAL_RELATION_NAME_EN_MISSING",
      label: "External relation name",
      context,
    });
    checkPair({
      row,
      ko: "note",
      en: "note_en",
      code: "EXTERNAL_RELATION_NOTE_EN_MISSING",
      label: "External relation note",
      context,
    });
  }

  const assignmentRows = await selectByCelebIds(
    "celeb_tag_assignments",
    "id,celeb_id,short_desc,short_desc_en,long_desc,long_desc_en",
    ids,
  );
  for (const row of assignmentRows) {
    const context = slugContext(profileById, row.celeb_id, { rowId: row.id });
    checkPair({
      row,
      ko: "short_desc",
      en: "short_desc_en",
      code: "FACTION_SHORT_DESC_EN_MISSING",
      label: "Faction assignment summary",
      context,
    });
    checkPair({
      row,
      ko: "long_desc",
      en: "long_desc_en",
      code: "FACTION_LONG_DESC_EN_MISSING",
      label: "Faction assignment detail",
      context,
    });
  }

  const reviewRows = await selectByCelebIds(
    "celeb_contents",
    "id,celeb_id,content_id,review,review_en",
    ids,
    "celeb_id",
  );
  for (const row of reviewRows) {
    checkPair({
      row,
      ko: "review",
      en: "review_en",
      code: "CONTENT_REVIEW_EN_MISSING",
      label: "Content review",
      context: slugContext(profileById, row.celeb_id, { rowId: row.id }),
    });
  }

  const contentIds = [...new Set(reviewRows.map((row) => row.content_id).filter(Boolean))];
  const localeRows = await selectByCelebIds(
    "content_locales",
    "content_id,locale,title,creator,verified,sources",
    contentIds,
    "content_id",
  );
  const localesByContentId = new Map();
  for (const row of localeRows) {
    const localeMap = localesByContentId.get(row.content_id) || new Map();
    localeMap.set(row.locale, row);
    localesByContentId.set(row.content_id, localeMap);
  }
  const firstReviewByContentId = new Map();
  for (const row of reviewRows) {
    if (!firstReviewByContentId.has(row.content_id)) firstReviewByContentId.set(row.content_id, row);
  }
  for (const contentId of contentIds) {
    const localeMap = localesByContentId.get(contentId) || new Map();
    const reviewRow = firstReviewByContentId.get(contentId);
    const context = slugContext(profileById, reviewRow?.celeb_id, { contentId });
    for (const locale of ["ko", "en"]) {
      const localeRow = localeMap.get(locale);
      const present = Boolean(localeRow);
      const code = `CONTENT_LOCALE_${locale.toUpperCase()}_MISSING`;
      noteCoverage(code, present);
      if (!present) {
        add(
          "errors",
          code,
          `Linked content is missing its '${locale}' content_locales row.`,
          context,
        );
        continue;
      }
      if (!hasValue(localeRow.title)) {
        add(
          "errors",
          "CONTENT_LOCALE_TITLE_MISSING",
          `Linked content '${locale}' locale has an empty title.`,
          { ...context, locale },
        );
      }
    }
  }
}

const coverageSummary = Object.fromEntries(
  [...coverage.entries()].sort(([left], [right]) => left.localeCompare(right)),
);
add(
  "info",
  "CELEB_DATA_AUDIT_SUMMARY",
  `Checked ${profiles.length} celeb(s) across profile, explanation, influence, persona, dialogue, timeline, relation, faction, review, and linked content locale data.`,
);

const summary = {
  scope: scanAll ? (activeOnly ? "all-active" : "all") : slugs,
  profiles: profiles.length,
  errors: findings.errors.length,
  warnings: findings.warnings.length,
  strict,
  passed: findings.errors.length === 0 && (!strict || findings.warnings.length === 0),
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, coverage: coverageSummary, findings }, null, 2));
} else {
  console.log("Feel&Note celebrity locale data audit");
  console.log(`- scope: ${scanAll ? (activeOnly ? "all active celebs" : "all celebs") : slugs.join(", ")}`);
  console.log(`- celebs: ${profiles.length}`);

  for (const [label, entries] of [
    ["ERROR", findings.errors],
    ["WARN", findings.warnings],
    ["INFO", findings.info],
  ]) {
    if (entries.length === 0) continue;
    console.log(`\n${label} (${entries.length})`);
    for (const entry of entries.slice(0, 300)) {
      const where = [entry.slug, entry.field, entry.rowId, entry.contentId, entry.locale]
        .filter(Boolean)
        .join("/");
      console.log(`- [${entry.code}]${where ? ` ${where}` : ""} ${entry.message}`);
    }
    if (entries.length > 300) console.log(`- ... ${entries.length - 300} more`);
  }

  console.log("\nCOVERAGE");
  for (const [code, counts] of Object.entries(coverageSummary)) {
    const percent = counts.checked > 0
      ? ((counts.matched / counts.checked) * 100).toFixed(1)
      : "100.0";
    console.log(
      `- ${code}: ${counts.matched}/${counts.checked} (${percent}%), missing=${counts.missing}`,
    );
  }
  console.log(
    `\nRESULT: ${summary.passed ? "PASS" : "FAIL"}`
    + ` (errors=${summary.errors}, warnings=${summary.warnings}${strict ? ", strict" : ""})`,
  );
}

process.exitCode = summary.passed ? 0 : 1;
