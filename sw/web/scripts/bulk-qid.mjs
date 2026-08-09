/**
 * Wikidata QID 일괄 배정 + 검증 통합 스크립트
 *
 * 3단계 자동 검증:
 *   1) wbsearchentities로 후보 검색
 *   2) P31 = Q5(인간) 확인 — 분화구·소행성·건물 등 제거
 *   3) P569(생년) vs DB birth_date 대조 (±3년 허용)
 *
 * BC 인물: Wikidata 연도 절삭(-384 → -0384) 보정
 * 듀오/그룹: P31 ≠ Q5이지만 description에 단서 있으면 수동 확인 목록에 추가
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wouqtpvfctednlffross.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 환경변수 필요");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const BIRTH_TOLERANCE = 3; // ±3년
const UA = { "User-Agent": "FeelandnoteBot/1.0" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- DB birth_date → 연도 추출 ---
function parseDbYear(birthDate) {
  if (!birthDate) return null;
  const s = String(birthDate).trim();

  // BC: "-340", "-0384" 등
  if (s.startsWith("-")) {
    const num = parseInt(s.replace(/-/g, "").split("-")[0] || s.slice(1), 10);
    // "-340" → 340, "-0384-01-01" → 384
    const parts = s.slice(1).split("-");
    return -Math.abs(parseInt(parts[0], 10));
  }

  // AD: "1821-12-12", "973", "0617"
  const parts = s.split("-");
  return parseInt(parts[0], 10);
}

// --- Wikidata P569 시간값 → 연도 추출 ---
function parseWdYear(timeValue) {
  if (!timeValue) return null;
  // "+1821-12-12T00:00:00Z" or "-0384-01-01T00:00:00Z"
  const m = timeValue.match(/^([+-]?\d+)-/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

// --- 1단계: 후보 검색 ---
async function searchCandidates(name) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=5&type=item`;
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return [];
    const data = await res.json();
    return data.search || [];
  } catch {
    return [];
  }
}

// --- 2+3단계: P31=Q5 확인 + 생년 대조 ---
async function verifyCandidate(qid) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}` +
    `&props=claims&format=json`;
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return { isHuman: false, birthYear: null };
    const data = await res.json();
    const claims = data.entities?.[qid]?.claims || {};

    // P31 (instance of)
    const p31 = claims.P31 || [];
    const p31Ids = p31.map(
      (c) => c.mainsnak?.datavalue?.value?.id
    ).filter(Boolean);
    const isHuman = p31Ids.includes("Q5");

    // P569 (date of birth)
    const p569 = claims.P569?.[0]?.mainsnak?.datavalue?.value?.time || null;
    const birthYear = parseWdYear(p569);

    return { isHuman, birthYear, p31Ids };
  } catch {
    return { isHuman: false, birthYear: null };
  }
}

// --- 통합 매칭 ---
async function findVerifiedQid(name, dbBirthYear) {
  const candidates = await searchCandidates(name);
  if (candidates.length === 0) return { qid: null, reason: "검색 결과 없음" };

  // 이름 정확 일치 우선 정렬
  const sorted = [...candidates].sort((a, b) => {
    const aExact = a.label?.toLowerCase() === name.toLowerCase() ? 0 : 1;
    const bExact = b.label?.toLowerCase() === name.toLowerCase() ? 0 : 1;
    return aExact - bExact;
  });

  for (const candidate of sorted) {
    await sleep(100); // Wikidata API 부하 방지
    const { isHuman, birthYear, p31Ids } = await verifyCandidate(candidate.id);

    if (!isHuman) continue; // 인간 아니면 스킵

    // 생년 대조
    if (dbBirthYear != null && birthYear != null) {
      const diff = Math.abs(dbBirthYear - birthYear);
      if (diff > BIRTH_TOLERANCE) continue; // 생년 불일치 → 동명이인
    }

    // 통과
    return { qid: candidate.id, reason: "verified" };
  }

  // 인간 후보가 하나도 없으면 — 듀오/그룹 가능성
  const first = sorted[0];
  const desc = first.description || "";
  const groupHints = ["duo", "band", "group", "brothers", "partnership"];
  if (groupHints.some((h) => desc.toLowerCase().includes(h))) {
    return { qid: null, reason: `수동확인(그룹): ${first.id} — ${desc}` };
  }

  return { qid: null, reason: `P31≠Q5 또는 생년 불일치 (후보: ${sorted.map((c) => c.id).join(", ")})` };
}

// --- 메인 ---
async function main() {
  const { data: celebs, error } = await sb
    .from("celebs")
    .select("id, nickname, nickname_en, birth_date")
    .eq("publication_status", "active")
    .is("wikidata_qid", null)
    .not("nickname_en", "is", null)
    .order("nickname_en");

  if (error) {
    console.error("조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`\n=== QID 일괄 배정 + 검증 ===`);
  console.log(`대상: ${celebs.length}명\n`);

  let assigned = 0;
  const manual = []; // 수동 확인 필요
  const notFound = []; // 검색 결과 없음

  for (let i = 0; i < celebs.length; i++) {
    const c = celebs[i];
    const dbYear = parseDbYear(c.birth_date);
    const { qid, reason } = await findVerifiedQid(c.nickname_en, dbYear);

    if (qid) {
      const { error: upErr } = await sb
        .from("celebs")
        .update({ wikidata_qid: qid })
        .eq("id", c.id);

      if (upErr) {
        console.log(`  ❌ ${c.nickname_en} — DB 저장 실패: ${upErr.message}`);
      } else {
        assigned++;
        console.log(`  ✅ ${c.nickname_en} (${c.nickname}) → ${qid}  [DB ${dbYear || "?"}]`);
      }
    } else {
      if (reason.startsWith("수동확인")) {
        manual.push({ name: c.nickname_en, ko: c.nickname, reason });
        console.log(`  🔍 ${c.nickname_en} (${c.nickname}) — ${reason}`);
      } else {
        notFound.push({ name: c.nickname_en, ko: c.nickname, dbYear, reason });
        console.log(`  ⚠️  ${c.nickname_en} (${c.nickname}) — ${reason}`);
      }
    }

    // 진행률 (25명마다)
    if ((i + 1) % 25 === 0) {
      console.log(`--- [${i + 1}/${celebs.length}] 배정 ${assigned}명 ---`);
    }

    await sleep(DELAY_MS);
  }

  // --- 결과 요약 ---
  console.log(`\n${"=".repeat(50)}`);
  console.log(`결과: ${assigned}명 배정 / ${manual.length}명 수동확인 / ${notFound.length}명 미발견`);

  if (manual.length > 0) {
    console.log(`\n🔍 수동 확인 필요 (${manual.length}명):`);
    manual.forEach((m) => console.log(`  ${m.name} (${m.ko}) — ${m.reason}`));
  }

  if (notFound.length > 0) {
    console.log(`\n⚠️  미발견/불일치 (${notFound.length}명):`);
    notFound.forEach((m) =>
      console.log(`  ${m.name} (${m.ko}) [DB ${m.dbYear || "?"}] — ${m.reason}`)
    );
  }
}

main();
