/**
 * 글 맨 앞 도입 한 문장을 다시 뽑는다.
 *
 * 도입은 목록과 접힌 미리보기에서 제목 다음에 보이는 줄이라 눌러 볼 이유를 만드는 자리다.
 * 「『사피엔스』의 방법이 어느 책에서 왔는지」처럼 **무엇이**를 빼놓고 궁금증만 걸면 실패다.
 * 본문에 이미 있는 구체적 사실 하나를 그대로 앞세운다.
 *
 * 사용: node scripts/naver-blog/fix-intro.mjs --slug a,b,c [--dry]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/celeb-drafts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugArg = (args[args.indexOf('--slug') + 1] ?? '').split(',').filter(Boolean);
if (!slugArg.length) { console.log('--slug a,b,c 로 대상을 넘겨라'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];

function prompt(row) {
  const body = row.body.replace(/\[img:[^\]]+\]/g, '').replace(/\n{3,}/g, '\n\n');
  return `아래는 블로그 글 한 편이다. 맨 앞에 놓을 **도입 한 문장**을 다시 써라.

## 도입이 하는 일
목록과 접힌 미리보기에서 제목 다음에 보이는 줄이다. 이걸 읽고 눌러 볼지 정한다.

## 규칙
- **본문에 이미 있는 구체적 사실 하나**를 앞세운다. 지어내지 마라.
- **「무엇이」를 빼놓지 마라.** 아래는 그래서 폐기한 문장들이다.
  · "『사피엔스』의 방법이 어느 책에서 왔는지 하라리 본인이 밝혀 두었습니다" — 「방법」이 뭔지 없다
  · "가사 한 줄이 어느 책에서 왔는지 확인해 보실 수 있습니다" — 어느 가사인지 없다
  · "읽은 책 한 권이 배역과 식탁을 함께 바꾼 배우입니다" — 무슨 책·무슨 배역인지 없다
- 좋은 예(그대로 쓰지 말고 결만 참고):
  · "나폴레옹은 휴가 짐에 세면도구보다 큰 책 트렁크를 챙겼습니다."
  · "십자가 대신 루소의 메달을 목에 걸었던 톨스토이의 서재를 만나보세요."
  · "안니 에르노는 노르망디 잡화점 위층에서 책을 처음 만났습니다."
- 25~45자. 정중체(~습니다/~보세요)로 끝낸다.
- 책 제목·장소·나이·매체처럼 손에 잡히는 말을 최소 하나 넣는다.

## 글
${body.slice(0, 2600)}

## 출력
문장 하나만 출력한다. 따옴표·설명·머리말을 붙이지 마라.`;
}

let ok = 0, fail = 0;
for (const slug of slugArg) {
  const row = rows.find((r) => (r.target || '').replace('/celeb/', '') === slug);
  if (!row) { console.log(`건너뜀 ${slug} — 초안에 없다`); continue; }
  const m = row.body.match(/\[c\]([^\[]+)\[\/c\]/);
  if (!m) { console.log(`건너뜀 ${slug} — 도입을 찾지 못했다`); continue; }
  try {
    const text = String(await agyCall(prompt(row), { timeoutMs: 900000 })).trim()
      .split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? '';
    // 감싼 따옴표만 벗긴다. 『』 는 작품명 표시라 문장 안에서 짝이 맞아야 한다.
    const line = text.replace(/^["']|["']$/g, '').trim();
    if (line.length < 20 || line.length > 60) throw new Error(`길이가 벗어난다(${line.length}자): ${line.slice(0, 40)}`);
    const open = (line.match(/『/g) ?? []).length, close = (line.match(/』/g) ?? []).length;
    if (open !== close) throw new Error(`작품명 표시가 짝이 안 맞는다: ${line.slice(0, 40)}`);
    console.log(`${slug}\n   전: ${m[1]}\n   후: ${line}\n`);
    if (!dry) { row.body = row.body.replace(m[0], `[c]${line}[/c]`); row.introFixed = true; }
    ok++;
  } catch (e) {
    fail++;
    console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 140)}`);
  }
}

if (!dry) fs.writeFileSync(DRAFTS, JSON.stringify(rows, null, 1));
console.log(`${dry ? '[점검만] ' : ''}다시 씀 ${ok} / 실패 ${fail}`);
