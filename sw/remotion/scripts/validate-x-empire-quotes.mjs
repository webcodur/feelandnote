/**
 * Validates X-Empire faction cast quotes (shipped data path).
 * Run: node scripts/validate-x-empire-quotes.mjs
 * Exit 0 only if all acceptance checks pass against the real JSON file.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(
  __dirname,
  "../public/factions/X-Empire/faction-data.json",
);

/**
 * 합쇼체 정중 종결 — Social-Network 목록 + ㅂ 불규칙(만듭니다·올립니다·드러납니다 등)용 니다.
 * 단독 /니다/만 두지 않고, 실제 합쇼 어미 묶음으로 잡는다.
 */
const POLITE =
  /(습니다|입니다|합니다|겁니다|됩니다|없습니다|있습니다|십시오|됐습니다|었습니다|였습니다|습니까|만듭니다|올립니다|지킵니다|드러납니다|바꿉니다|옮깁니다|돌립니다|깨웁니다|세웁니다|붙입니다|엽니다|따릅니다|깁니다|남깁니다|닦습니다|말합니다|일합니다|버립니다|멈춥니다|삼킵니다|긋습니다|납니다|둡니다|짭니다|닿습니다|밀습니다|묶습니다|뜁니다|삽니다|줍니다|큽니다|적습니다|맞먹습니다|돌아갑니다|올라갑니다|내려갑니다|나갑니다|들어갑니다)\.?/;

const BANNED = [
  [/바로 압니다/, "해체 혼용: 바로 압니다"],
  [/(?<![가-힣])압니다/, "해체 혼용: 압니다 (알 수 있습니다 등으로)"],
  [/지배 서사/, "meta/report: 지배 서사"],
  [/^한 번도 실수하지 않는다면,/, "해체 조건 개문: 않는다면,"],
  [/로 하여금/, "calque 로 하여금"],
  [/에 있어서/, "calque 에 있어서"],
  [/되어졌/, "이중 수동"],
  [/밝혀습니다|밝혔습니다/, "report 밝혔습니다"],
  [/의 철학은/, "meta ~의 철학은"],
];

const X_BRAND_SLUGS = new Set([
  "devendra-singh-chaplot",
  "andrew-milich",
  "jason-ginsberg",
]);

function collectPeople(data) {
  const out = [];
  for (const g of data.groups ?? []) {
    for (const c of g.clusters ?? []) {
      for (const p of c.people ?? []) {
        out.push({ person: p, group: g.name?.split("\n")[0] });
      }
    }
  }
  return out;
}

function norm(s) {
  return (s || "").replace(/\s+/g, "");
}

function flagsFor(quote) {
  const flags = [];
  if (!POLITE.test(quote || "")) flags.push("not 정중체");
  for (const [re, lab] of BANNED) {
    if (re.test(quote || "")) flags.push(lab);
  }
  return flags;
}

function main() {
  // self-check: skeptic known-bads must be caught
  const knownBad = [
    {
      label: "Bier 압니다 혼용",
      q: "제품은 픽셀에서 살고 죽습니다. 먹히면 바로 압니다. 조금이라도 불확실하다면, 그건 이미 안 먹히는 겁니다.",
      need: /압니다|해체/,
    },
    {
      label: "Denholm 않는다면 개문",
      q: "한 번도 실수하지 않는다면, 충분히 밀어붙이지 않은 겁니다. 동의하지 않는 일에는 내일 당장 등을 돌릴 수 있어야, 이사회가 살아 있습니다.",
      need: /않는다면/,
    },
    {
      label: "Gracias 지배 서사",
      q: "더 나은 세상을 만들려면 도덕적 용기가 있어야 합니다. AI가 끔찍할 거라는 말이 지배 서사입니다. 나는 그게 사실이 되지 않도록 일하겠습니다.",
      need: /지배 서사/,
    },
  ];
  for (const kb of knownBad) {
    const f = flagsFor(kb.q);
    if (f.length === 0) {
      console.error("FAIL: known-bad not caught:", kb.label);
      process.exit(1);
    }
    console.log("self-check", kb.label, "→", f.join("; "));
  }

  if (!fs.existsSync(DATA)) {
    console.error("FAIL: missing", DATA);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  } catch (e) {
    console.error("FAIL: JSON parse", e.message);
    process.exit(1);
  }

  const rows = collectPeople(data);
  const fails = [];

  if (rows.length !== 35) fails.push(`cast count ${rows.length} !== 35`);

  const groupNames = (data.groups ?? []).map((g) => g.name?.split("\n")[0]);
  if (groupNames.some((n) => n === "xAI")) {
    fails.push("xAI must remain SpaceX internal cluster, not top-level group");
  }
  const spacex = (data.groups ?? []).find((g) => g.name?.startsWith("SpaceX"));
  if (!spacex || (spacex.clusters?.length ?? 0) < 2) {
    fails.push("SpaceX should have ≥2 clusters (core + xAI)");
  }

  const musk = rows.find((r) => r.person.slug === "elon-musk")?.person;
  if (!musk) fails.push("Musk missing");
  if (musk && !/인공지능|AI/.test(musk.quote)) {
    fails.push("Musk monologue must keep AI spine");
  }

  for (const { person: p } of rows) {
    const tag = p.name;
    if (!p.quote?.trim()) fails.push(`${tag}: empty quote`);
    if (!Array.isArray(p.quoteChunks) || p.quoteChunks.length < 2) {
      fails.push(`${tag}: quoteChunks < 2`);
    }

    if (norm(p.quote) !== norm((p.quoteChunks || []).join(""))) {
      fails.push(`${tag}: KO chunk drift`);
    }

    if (p.quote && p.quote.length < 40) {
      fails.push(`${tag}: quote too short (${p.quote.length})`);
    }
    if (p.quote && p.quote.length > 200) {
      fails.push(`${tag}: quote too long (${p.quote.length})`);
    }

    for (const f of flagsFor(p.quote || "")) {
      fails.push(`${tag}: ${f}`);
    }

    if (X_BRAND_SLUGS.has(p.slug)) {
      if (!p.quote.includes("X는")) {
        fails.push(`${tag}: xAI brand monologue must use X는`);
      }
      if (/xAI는/.test(p.quote)) {
        fails.push(`${tag}: forced xAI는 brand rewrite forbidden`);
      }
    }
  }

  const bier = rows.find((r) => r.person.slug === "nikita-bier")?.person;
  const den = rows.find((r) => r.person.slug === "robyn-denholm")?.person;
  const gra = rows.find((r) => r.person.slug === "antonio-gracias")?.person;
  if (bier && /압니다/.test(bier.quote)) fails.push("Bier still has 압니다");
  if (den && /않는다면,/.test(den.quote)) {
    fails.push("Denholm still has 않는다면,");
  }
  if (gra && /지배 서사/.test(gra.quote)) {
    fails.push("Gracias still has 지배 서사");
  }

  if (fails.length) {
    console.error("FAIL count", fails.length);
    for (const f of fails) console.error(" -", f);
    process.exit(1);
  }

  console.log("PASS X-Empire quotes");
  console.log("cast", rows.length);
  console.log("groups", groupNames.join(" | "));
  console.log(
    "xAI brand:",
    rows
      .filter((r) => X_BRAND_SLUGS.has(r.person.slug))
      .map((r) => r.person.name)
      .join(", "),
  );
  console.log("bier:", bier.quote);
  console.log("denholm:", den.quote);
  console.log("gracias:", gra.quote);
  console.log("musk:", musk.quote.slice(0, 60) + "…");
  process.exit(0);
}

main();
