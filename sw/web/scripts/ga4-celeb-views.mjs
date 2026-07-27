/*
  파일명: scripts/ga4-celeb-views.mjs
  기능: GA4에서 인물 화면 실측 페이지뷰를 뽑는다 (열람 전용, 의존성 없음)
  책임: 서비스계정 JWT로 Data API(runReport)를 직접 호출해 /celeb/{slug} 경로의
        페이지뷰·순 방문자·접속 수를 인물별로 합산한다.

  용도: DB에 쌓는 조회수(celeb_views_daily)가 맞는지 독립 출처로 대조할 때 쓴다.
        2026-07-27 대조 결과 두 값이 거의 일치했다(GA4 1,144 / DB 1,200).

  실행:  node scripts/ga4-celeb-views.mjs [시작일] [종료일]
  예시:  node scripts/ga4-celeb-views.mjs 2026-06-26 2026-07-27

  주의:  크리덴셜(credentials/ga-service-account.json)은 추적 대상 밖이다.
         GA4는 열람만 가능하다 — Admin API가 꺼져 있어 설정 변경은 안 된다.
         상세는 docs/project/traffic-audit-2026-07-25.md 「조회 수단」 참조.
*/

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CRED = resolve(HERE, "../credentials/ga-service-account.json");
const PROPERTY = "526353156";

const [, , startDate = "30daysAgo", endDate = "today"] = process.argv;

const cred = JSON.parse(readFileSync(CRED, "utf8"));

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: cred.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(cred.private_key));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${sig}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`토큰 발급 실패: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function runReport(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) throw new Error(`runReport 실패: ${JSON.stringify(json.error)}`);
  return json;
}

const token = await getToken();

const report = await runReport(token, {
  dateRanges: [{ startDate, endDate }],
  dimensions: [{ name: "pagePath" }],
  metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "sessions" }],
  dimensionFilter: {
    filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS", value: "/celeb/" } },
  },
  limit: 5000,
});

// /ko/celeb/{slug}, /en/celeb/{slug}를 slug 하나로 합친다
const bySlug = new Map();
for (const row of report.rows ?? []) {
  const path = row.dimensionValues[0].value.split("?")[0];
  const m = path.match(/\/celeb\/([^/]+)/);
  if (!m) continue;
  const slug = decodeURIComponent(m[1]);
  const cur = bySlug.get(slug) ?? { views: 0, users: 0, sessions: 0 };
  cur.views += Number(row.metricValues[0].value);
  cur.users += Number(row.metricValues[1].value);
  cur.sessions += Number(row.metricValues[2].value);
  bySlug.set(slug, cur);
}

const list = [...bySlug.entries()].sort((a, b) => b[1].views - a[1].views);
const totals = list.reduce((a, [, v]) => ({
  views: a.views + v.views, users: a.users + v.users, sessions: a.sessions + v.sessions,
}), { views: 0, users: 0, sessions: 0 });

console.log(JSON.stringify({
  기간: `${startDate} ~ ${endDate}`,
  인물수: list.length,
  합계: totals,
  상위20: list.slice(0, 20).map(([slug, v]) => ({ slug, ...v })),
}, null, 2));
