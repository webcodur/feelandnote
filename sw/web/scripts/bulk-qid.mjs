/**
 * Wikidata QID 일괄 배정 스크립트
 * - nickname_en으로 Wikidata Search API 검색
 * - 첫 번째 결과(human)의 QID를 profiles.wikidata_qid에 저장
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wouqtpvfctednlffross.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 환경변수 필요");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 100;
const DELAY_MS = 200; // Wikidata rate limit 방지

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchQid(name) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=5&type=item`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FeelandnoteBot/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.search || [];

    // 이름이 정확히 일치하는 것 우선
    const exact = results.find(
      (r) => r.label?.toLowerCase() === name.toLowerCase()
    );
    if (exact) return exact.id;

    // 없으면 첫 번째 결과
    return results[0]?.id || null;
  } catch {
    return null;
  }
}

async function main() {
  // QID 없는 셀럽 전부 조회
  const { data: celebs, error } = await sb
    .from("profiles")
    .select("id, nickname_en")
    .eq("profile_type", "CELEB")
    .eq("status", "active")
    .is("wikidata_qid", null)
    .order("nickname_en");

  if (error) {
    console.error("조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`대상: ${celebs.length}명`);

  let matched = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < celebs.length; i++) {
    const c = celebs[i];
    const qid = await searchQid(c.nickname_en);

    if (qid) {
      const { error: upErr } = await sb
        .from("profiles")
        .update({ wikidata_qid: qid })
        .eq("id", c.id);

      if (upErr) {
        console.log(`  ❌ ${c.nickname_en} — DB 저장 실패: ${upErr.message}`);
        failed++;
      } else {
        matched++;
        if ((i + 1) % 50 === 0 || i === celebs.length - 1) {
          console.log(
            `[${i + 1}/${celebs.length}] ${c.nickname_en} → ${qid} (누적 ${matched})`
          );
        }
      }
    } else {
      failed++;
      failures.push(c.nickname_en);
      console.log(`  ⚠️  ${c.nickname_en} — QID 미발견`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n완료: ${matched}명 매칭 / ${failed}명 실패`);
  if (failures.length > 0) {
    console.log(`\n미매칭 목록:\n${failures.join("\n")}`);
  }
}

main();
