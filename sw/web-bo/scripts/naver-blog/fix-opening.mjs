/**
 * 글머리를 새 구조로 바꾼다.
 *
 * 옛 구조는 정중체와 간결체가 아무 표시 없이 맞붙어 덜컹거렸다. 도입은 글과 이어지지 않는
 * 장면 하나를 던져 놓고 시작해 무슨 글인지 알 수 없었고, 넘어가는 줄도 안내가 아니라
 * 또 꾸미는 문장이라 역할이 흐려졌다.
 *
 *   전                                    후
 *   [c]노벨의 서재에는 바이런 전집…[/c]     [c]오늘 만나볼 인물은 알프레드 노벨입니다.[/c]
 *   알프레드 노벨은 다이너마이트를…         [q]알프레드 노벨은 다이너마이트를…[/q]
 *   노벨이 서재에 두고 아끼던 책 다섯…      알프레드 노벨이 읽은 책들을 살펴볼까요?
 *
 * 나레이터 두 줄은 고정 문구다. LLM 이 지어낼 여지를 없애 뜬금없는 문장이 나오지 않는다.
 * 인물 정리는 인용구로 감싸 간결체 덩어리를 눈으로 갈라 둔다.
 *
 * 사용: node scripts/naver-blog/fix-opening.mjs [--dry]   (sw/web-bo 에서)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const dry = process.argv.includes('--dry');

const loadEnv = (p) => {
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
};
loadEnv(path.join(ROOT, '.env'));
loadEnv(path.join(ROOT, 'sw/web-bo/.env'));
loadEnv(path.join(ROOT, 'sw/web/.env'));
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY ?? process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY);

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];

/**
 * 인물 이름. 제목 앞머리에는 「『사피엔스』 저자」·「노벨문학상 수상 작가」 같은 수식어가 붙으므로
 * 제목에서 뽑으면 그것까지 딸려 온다. 사이트 주소(target)에는 이름만 있으니 DB 값을 쓴다.
 */
const nameOf = (row, byslug) => byslug.get((row.target || '').replace('/celeb/', ''));
/** 받침이 있으면 「이」, 없으면 「가」 */
const particle = (w) => {
  const c = String(w ?? '').trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(c) || c < 0xac00 || c > 0xd7a3) return '가';
  return (c - 0xac00) % 28 === 0 ? '가' : '이';
};

// 인물 이름은 DB 에서 가져온다 — 제목 수식어가 섞이지 않는다
const byslug = new Map();
{
  const slugs = rows.map((r) => (r.target || '').replace('/celeb/', '')).filter(Boolean);
  for (let i = 0; i < slugs.length; i += 200) {
    const { data } = await db.from('celebs').select('slug,nickname').in('slug', slugs.slice(i, i + 200));
    for (const r of data ?? []) byslug.set(r.slug, r.nickname);
  }
}

let ok = 0, skip = 0;
const failed = [];
for (const row of rows) {
  const slug = (row.target || '').replace('/celeb/', '');
  const name = nameOf(row, byslug);
  if (!name) { failed.push(`${slug} — DB 에 이름이 없다`); continue; }
  if (row.openingFixed) { skip++; continue; }

  const lines = row.body.split('\n');
  const ci = lines.findIndex((l) => /^\[c\].*\[\/c\]$/.test(l.trim()));
  if (ci < 0) { failed.push(`${slug} — 도입을 찾지 못했다`); continue; }

  // 도입 다음 글줄이 인물 정리, 그다음 글줄이 넘어가는 문장이다
  const after = lines.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.i > ci && x.l);
  const profile = after[0];
  const bridge = after[1];
  if (!profile || !bridge || profile.l.startsWith('---') || bridge.l.startsWith('---')) {
    failed.push(`${slug} — 인물 정리·넘어가는 줄을 찾지 못했다`);
    continue;
  }

  console.log(`${slug}`);
  console.log(`   도입   ${lines[ci].trim().slice(3, -4).slice(0, 46)}`);
  console.log(`     → 오늘 만나볼 인물은 ${name}입니다.`);
  console.log(`   넘어감 ${bridge.l.slice(0, 46)}`);
  console.log(`     → ${name}${particle(name)} 읽은 책들을 살펴볼까요?\n`);

  if (!dry) {
    lines[ci] = `[c]오늘 만나볼 인물은 ${name}입니다.[/c]`;
    lines[profile.i] = `[q]${profile.l}[/q]`;
    lines[bridge.i] = `${name}${particle(name)} 읽은 책들을 살펴볼까요?`;
    row.body = lines.join('\n');
    row.openingFixed = true;
  }
  ok++;
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`${dry ? '[점검만] ' : ''}바꿈 ${ok} / 이미 바뀜 ${skip} / 못 바꿈 ${failed.length}`);
failed.forEach((f) => console.log(`  ${f}`));
