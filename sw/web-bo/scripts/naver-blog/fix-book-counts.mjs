// 권수 불일치 인물 글의 제목 「읽은 책 N권」과 하단 안내 문장만 서비스 권수로 고친다.
// pnpm naver:audit-book-counts --json > <counts.json>
// node scripts/naver-blog/fix-book-counts.mjs --counts=<counts.json 절대경로> --work=<임시 작업 절대경로> [--only=logNo,…] [--apply]
// 안내 문장이 없는 글(소개 권수 = 책장 권수였던 글)은 일반 안내 문장을 「이 글에서 소개한 N권 외에 M권…」으로 바꾼다.
// 결과는 <work>/counts-results.jsonl. 저장·재열기까지 끝난 글은 재실행에서 건너뛴다.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const COUNTS = arg('counts'), WORK = arg('work'), APPLY = process.argv.includes('--apply'), only = arg('only')?.split(',');
if (!COUNTS || !WORK) throw Error('--counts=와 --work=가 필요하다');
const CWD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const run = args => execFileSync('node', args, {cwd: CWD, encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe']});
const R = path.join(WORK, 'counts-results.jsonl');
const done = new Set(fs.existsSync(R) ? fs.readFileSync(R, 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(j => j.ok && j.applied).map(j => j.logNo) : []);
const rows = JSON.parse(fs.readFileSync(COUNTS, 'utf8')).results.filter(r => r.status === 'mismatch' && !done.has(r.logNo) && (!only || only.includes(r.logNo)));
const TAIL = /^이 글에서 소개한 \d+권 외에 \d+권의 도서 기록은/;
const GEN = '소개한 책의 감상 기록과 작품별 정보를 필앤노트에서 함께 살펴볼 수 있습니다.';

for (const r of rows) {
  const dir = path.join(WORK, 'cnt', r.logNo); fs.mkdirSync(dir, {recursive: true});
  let res = {logNo: r.logNo, name: r.name, expected: r.expected};
  try {
    run(['scripts/naver-blog/capture-editorial-original.mjs', `--log=${r.logNo}`, `--out=${dir}/original.json`]);
    const o = JSON.parse(fs.readFileSync(`${dir}/original.json`, 'utf8')), title = o.snapshot.title;
    if ([...title.matchAll(/읽은 책 (\d+)권/g)].length !== 1) throw Error('제목의 권수가 하나가 아니다: ' + title);
    const newTitle = title.replace(/읽은 책 \d+권/, `읽은 책 ${r.expected}권`);
    const paras = [].concat(o.snapshot.text).flatMap(x => String(x).split('\n'));
    const tail = paras.filter(p => TAIL.test(p));
    let before, intro;
    if (tail.length === 1) { before = tail[0]; intro = Number(before.match(/소개한 (\d+)권/)[1]); }
    else if (!tail.length && paras.filter(p => p === GEN).length === 1) {
      before = GEN; intro = paras.filter(p => /^0[1-9]\s*·\s*『/.test(p)).length;
      if (!intro) throw Error('소개 책 머리줄을 찾지 못했다');
    } else throw Error('안내 문장 수 ' + tail.length);
    if (r.expected <= intro) throw Error('서비스 권수가 소개 권수보다 크지 않다');
    const after = `이 글에서 소개한 ${intro}권 외에 ${r.expected - intro}권의 도서 기록은 필앤노트에서 확인할 수 있습니다.`;
    if (before !== GEN && before.replace(/외에 \d+권의/, `외에 ${r.expected - intro}권의`) !== after) throw Error('안내 문장 문구가 다르다: ' + before);
    fs.writeFileSync(`${dir}/plan.json`, JSON.stringify({logNo: r.logNo, originalFile: `${dir}/original.json`, title: newTitle, edits: [{before, after}]}, null, 1));
    res = {...res, title: newTitle, before, after};
    if (APPLY) {
      const out = run(['scripts/naver-blog/apply-editorial-changes.mjs', `--plan=${dir}/plan.json`, '--apply']);
      res.last = out.trim().split('\n').pop().slice(0, 300); res.applied = /saved-and-reopened/.test(out);
    }
    res.ok = true;
  } catch (e) { res.ok = false; res.error = String(e.stderr || e.message).slice(-500); }
  fs.appendFileSync(R, JSON.stringify(res) + '\n');
  console.log(r.logNo, r.name, res.ok ? 'OK' : 'FAIL', res.title || '', res.after || '', res.error || res.last || '');
}
