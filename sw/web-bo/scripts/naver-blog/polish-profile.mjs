/**
 * 인물 소개를 정중체로 바꾼다.
 *
 * 구분선 위는 나레이터가 말하는 안내 구간이라 정중체, 아래는 DB 에서 온 사실 기록이라 간결체다.
 * 그런데 안내 구간 한복판에 있는 인물 소개만 간결체여서 문체가 덜컹거렸다.
 * 사실은 한 글자도 바꾸지 않고 문말만 고친다.
 *
 * 사용: node scripts/naver-blog/polish-profile.mjs [--slug a,b] [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugArg = (args[args.indexOf('--slug') + 1] ?? '').split(',').filter(Boolean);

const load = () => {
  const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
  return Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
};

function withLock(fn) {
  const LOCK = `${DRAFTS}.lock`;
  const nap = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 + Math.random() * 60);
  for (let i = 0; i < 400; i++) {
    let fd;
    try { fd = fs.openSync(LOCK, 'wx'); } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 60000) fs.rmSync(LOCK, { force: true }); } catch {}
      nap(); continue;
    }
    try { return fn(); } finally { fs.closeSync(fd); fs.rmSync(LOCK, { force: true }); }
  }
  throw new Error('초안 파일 잠금을 얻지 못했다');
}

/** 도입([c]…[/c]) 다음 글줄이 인물 소개다 */
function profileAt(body) {
  const lines = body.split('\n');
  const ci = lines.findIndex((l) => /^\[c\].*\[\/c\]$/.test(l.trim()));
  if (ci < 0) return null;
  const hit = lines.map((l, i) => ({ l: l.trim(), i })).find((x) => x.i > ci && x.l && !x.l.startsWith('---'));
  return hit && hit.l.length > 40 ? hit : null;
}

const prompt = (text) => `아래 인물 소개를 **정중체로만** 바꿔라.

## 규칙
- **사실을 한 글자도 바꾸지 마라.** 연도·숫자·책 제목·인명·사건을 그대로 둔다.
- 더하지도 빼지도 마라. 문장 수와 순서를 그대로 지킨다.
- 바꾸는 것은 **문말뿐**이다. ~다 → ~습니다 / ~이다 → ~입니다 / ~했다 → ~했습니다.
- 「~です」투나 번역투로 늘어뜨리지 마라. 원문의 간결함을 지킨다.
- 큰따옴표 안의 말은 그대로 둔다. 본인 발언이다.

## 원문
${text}

## 출력
바꾼 글만 출력한다. 설명·머리말·따옴표를 붙이지 마라.`;

const rows = load();
const targets = (slugArg.length
  ? rows.filter((r) => slugArg.includes((r.target || '').replace('/celeb/', '')))
  : rows.filter((r) => !r.profilePolished));
console.log(`대상 ${targets.length}편`);

let ok = 0, skip = 0, fail = 0;
for (const row of targets) {
  const slug = (row.target || '').replace('/celeb/', '');
  const hit = profileAt(row.body);
  if (!hit) { skip++; console.log(`건너뜀 ${slug} — 인물 소개를 찾지 못했다`); continue; }
  if (/(습니다|입니다|셨습니다)[.」』"]?$/.test(hit.l)) { skip++; console.log(`건너뜀 ${slug} — 이미 정중체`); continue; }

  try {
    const out = String(await agyCall(prompt(hit.l), { timeoutMs: 900000 })).trim()
      .split('\n').map((x) => x.trim()).filter(Boolean).join(' ');
    if (out.length < hit.l.length * 0.7 || out.length > hit.l.length * 1.6) throw new Error(`길이가 크게 달라졌다(${hit.l.length}→${out.length})`);
    if (!/(습니다|입니다)[.」』"]?$/.test(out)) throw new Error(`정중체로 끝나지 않는다: ${out.slice(-24)}`);
    // 큰따옴표 인용이 살아 있는지
    const q = (s) => [...String(s).matchAll(/["“”]([^"“”]{6,200})["“”]/g)].map((m) => m[1].trim());
    for (const one of q(out)) if (!hit.l.includes(one)) throw new Error(`없던 인용이 생겼다: ${one.slice(0, 20)}`);

    console.log(`${slug}\n   전: ${hit.l.slice(0, 70)}\n   후: ${out.slice(0, 70)}\n`);
    if (!dry) {
      withLock(() => {
        const live = load();
        const t = live.find((x) => x.target === row.target);
        if (!t) throw new Error('그 사이 사라졌다');
        const lines = t.body.split('\n');
        const at = profileAt(t.body);
        if (!at) throw new Error('인물 소개 자리를 다시 찾지 못했다');
        lines[at.i] = out;
        t.body = lines.join('\n');
        t.profilePolished = true;
        fs.writeFileSync(DRAFTS, JSON.stringify(live, null, 1));
      });
    }
    ok++;
  } catch (e) {
    fail++;
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 160)}`);
  }
}
console.log(`\n${dry ? '[점검만] ' : ''}바꿈 ${ok} / 건너뜀 ${skip} / 실패 ${fail}`);
