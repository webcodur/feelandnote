// 기관 안내서 글의 제목 끝과 본문 맨 위에 확인 일자를 적는다(양식: docs/continuous/blog-naver-book.md 「확인 일자」).
// node scripts/naver-blog/stamp-curated-date.mjs --date=YY.MM.DD --work=<임시 작업 절대경로> [--only=logNo,…] [--titles=<{logNo:제목}> JSON] [--cells=<{logNo:[[옛 칸,새 칸]]}> JSON] [--apply]
// 대상은 원장에서 curatedGuide가 있는 글. 날짜 줄이 이미 있으면 그 줄을, 제목 끝 옛 날짜는 새 날짜로 바꾼다.
// 결과는 <work>/stamp-results.jsonl. 적용한 글은 재실행에서 건너뛰고, --only로 고른 글은 다시 돈다(통째 재저장 뒤 날짜 줄을 되살릴 때).
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DATE = arg('date'), WORK = arg('work'), APPLY = process.argv.includes('--apply'), only = arg('only')?.split(',');
if (!/^\d{2}\.\d{2}\.\d{2}$/.test(DATE ?? '') || !WORK) throw Error('--date=YY.MM.DD와 --work=가 필요하다');
const readJson = f => f ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
const TITLES = readJson(arg('titles')), CELLS = readJson(arg('cells'));
const LINE = `${DATE} 기준으로 확인한 정보입니다.`, ANY_LINE = /^\d{2}\.\d{2}\.\d{2} 기준으로 확인한 정보입니다\.$/;
const CWD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REG = 'D:/feelandnote/blog-assets/naver-blog/posts.json';
const run = args => execFileSync('node', args, {cwd: CWD, encoding: 'utf8', timeout: 900000, stdio: ['ignore', 'pipe', 'pipe']});

// 제목: 「| …」「/ …」「(최신)」 꼬리와 옛 확인 일자를 떼고 (YY.MM.DD)를 붙인다. 회차 연도가 든 제목(퓰리처상 1918~2026)은 날짜를 붙이지 않는다.
function stampTitle(t, date = DATE) {
  const s = t.replace(/\s*\(\d{2}\.\d{2}\.\d{2}\)$/, '').replace(/\s*\|.*$/, '').replace(/\s*\/.*$/, '').replace(/\s*\(최신\)/, '').trim();
  return /\b(1[89]|20)\d{2}\b/.test(s) ? s : `${s} (${date})`;
}

const R = path.join(WORK, 'stamp-results.jsonl');
const done = new Set(fs.existsSync(R) ? fs.readFileSync(R, 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(j => j.ok && j.applied && j.date === DATE).map(j => j.logNo) : []);
const rows = JSON.parse(fs.readFileSync(REG, 'utf8')).filter(p => p.kind === 'curated' && p.curatedGuide && (only ? only.includes(p.logNo) : !done.has(p.logNo)));

for (const r of rows) {
  const dir = path.join(WORK, 'stamp', r.logNo); fs.mkdirSync(dir, {recursive: true});
  const res = {logNo: r.logNo, date: DATE};
  try {
    run(['scripts/naver-blog/capture-editorial-original.mjs', `--log=${r.logNo}`, `--out=${dir}/original.json`]);
    const o = JSON.parse(fs.readFileSync(`${dir}/original.json`, 'utf8')), paras = o.snapshot.flow.flatMap(f => f.paragraphs ?? []);
    const old = paras.filter(p => ANY_LINE.test(p));
    let edits;
    if (old.length > 1) throw Error('확인 일자 줄이 둘 이상이다');
    if (old.length === 1) edits = old[0] === LINE ? [] : [{before: old[0], after: LINE}];
    else {
      // 맨 위 「…전체 보기 →」 링크 다음의 첫 글줄을 「확인 일자 줄 + 그 글줄」로 나눈다.
      const li = paras.findIndex(p => /전체 보기 →$/.test(p)); if (li < 0 || li > 2) throw Error('맨 위 링크를 찾지 못했다');
      const head = paras.slice(li + 1).find(p => p.trim()), at = paras.indexOf(head, li + 1);
      const occ = paras.slice(0, at).filter(p => p === head).length;
      edits = [{before: head, after: `${LINE}\n${head}`, ...(paras.filter(p => p === head).length > 1 ? {occurrence: occ} : {})}];
    }
    const skipped = [];
    for (const [b, a] of CELLS[r.logNo] ?? []) {
      const n = paras.filter(p => p === b).length, t = o.table.flat().filter(c => c === b).length;
      if (n === 1 && t === 1) edits.push({before: b, after: a}); else skipped.push({b, a, n, t});
    }
    const title = TITLES[r.logNo] ?? stampTitle(o.snapshot.title);
    if (!edits.length && title === o.snapshot.title) { Object.assign(res, {ok: true, applied: true, last: 'already stamped'}); }
    else {
      const plan = {logNo: r.logNo, originalFile: `${dir}/original.json`, ...(title !== o.snapshot.title ? {title} : {}), edits, formats: [{text: LINE, size: 13, align: 'center'}]};
      fs.writeFileSync(`${dir}/plan.json`, JSON.stringify(plan, null, 1));
      Object.assign(res, {oldTitle: o.snapshot.title, title, edits: edits.length, skipped});
      const out = run(['scripts/naver-blog/apply-editorial-changes.mjs', `--plan=${dir}/plan.json`, ...(APPLY ? ['--apply'] : [])]);
      res.last = out.trim().split('\n').pop().slice(0, 300); res.applied = APPLY && /saved-and-reopened/.test(out); res.ok = true;
    }
  } catch (e) { res.ok = false; res.error = String(e.stderr || e.message).slice(-600); }
  fs.appendFileSync(R, JSON.stringify(res) + '\n');
  console.log(r.logNo, res.ok ? 'OK' : 'FAIL', res.title || '', res.edits ?? '', res.error?.slice(-200) || res.last || '');
}
