// 인물 페이지 좋아요 초기 시드. 조회수 대비 1/15(인기)~1/22(평범) 비율을 인물마다 랜덤 적용한다.
// 표는 celeb_likes(visitor_hash, votes) 행으로 쪼개 넣는다 — 5시간 쿨다운을 넘긴 재투표가
// 자연스럽게 섞이도록 대부분 1표, 일부 2~3표를 둔다.
// 실행:  node --env-file=.env scripts/seed-celeb-likes.mjs [--dry-run]
import { randomBytes } from "node:crypto";
import { createClient } from "@feelandnote/db";

const url = process.env.NEXT_PUBLIC_DB_API_URL;
const key = process.env.DB_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 필요");
  process.exit(1);
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const DRY = process.argv.includes("--dry-run");
const SPREAD_DAYS = 45; // 좋아요가 최근 N일에 걸쳐 찍힌 것처럼 분산
const hash = () => randomBytes(32).toString("hex");
const likedAt = () => new Date(Date.now() - Math.random() * SPREAD_DAYS * 86400_000).toISOString();

async function must(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

const celebs = await must(
  db.from("celebs")
    .select("id, slug, nickname, view_count")
    .eq("publication_status", "active")
    .gt("view_count", 0)
    .order("view_count", { ascending: false }),
);

// 이미 표가 있는 인물은 건너뛴다 — 재실행해도 이중으로 쌓이지 않게 한다
const existing = new Set(
  (await must(db.from("celeb_likes").select("celeb_id"))).map((r) => r.celeb_id),
);

let totalLikes = 0;
const plan = [];
for (const c of celebs) {
  if (existing.has(c.id)) continue;
  const ratio = 15 + Math.random() * 7; // 15~22 조회수당 좋아요 1
  const likes = Math.max(1, Math.floor(c.view_count / ratio));
  totalLikes += likes;
  plan.push({ celeb: c, likes });
}

const rows = [];
for (const { celeb, likes } of plan) {
  let remaining = likes;
  while (remaining > 0) {
    const r = Math.random();
    const want = r < 0.82 ? 1 : r < 0.95 ? 2 : 3;
    const votes = Math.min(remaining, want);
    rows.push({ celeb_id: celeb.id, visitor_hash: hash(), votes, last_liked_at: likedAt() });
    remaining -= votes;
  }
}

console.log(`대상 ${plan.length}명 (기존 표 보유 ${existing.size}명 제외) · 총 ${totalLikes}표 · 방문자 행 ${rows.length}개`);
for (const { celeb, likes } of plan.slice(0, 15)) {
  console.log(`  ${celeb.nickname} (${celeb.slug}) — 조회 ${celeb.view_count} → 좋아요 ${likes}`);
}

if (DRY) {
  console.log("--dry-run: 쓰지 않는다");
  process.exit(0);
}

for (let i = 0; i < rows.length; i += 500) {
  await must(db.from("celeb_likes").insert(rows.slice(i, i + 500)));
}
console.log(`완료: ${rows.length}행 삽입`);
