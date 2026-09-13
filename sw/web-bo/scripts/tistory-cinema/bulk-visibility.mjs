/**
 * 글 목록 화면의 **일괄 변경**으로 공개 상태를 바꾼다.
 *
 *   node scripts/tistory-cinema/bulk-visibility.mjs --private          계획만
 *   node scripts/tistory-cinema/bulk-visibility.mjs --private --run    실제 전환
 *
 * `set-visibility.mjs` 와 목적은 같지만 경로가 다르다. 그쪽은 글을 하나씩 편집기로 열어
 * 저장하므로 **저장마다 캡차가 걸리고**, 54편이면 54번을 사람이 풀어야 한다. 이쪽은 목록에서
 * 체크하고 한 번 바꾸므로 캡차가 없다.
 *
 * 대신 이쪽은 **본문 대조를 못 한다.** 편집기를 열지 않으니 저장 전후 원고 비교가 없다.
 * 공개 상태만 바꾸는 작업에는 그것으로 충분하지만, 본문·제목·태그를 손대는 작업은 반드시
 * `fill-body.mjs` 나 `set-visibility.mjs` 를 쓴다.
 *
 * 🔴 **대장의 `at` 은 지우지 않는다.** 비공개로 내리면 예약이 풀리지만, 그 값을 대장에서도
 *    지우면 되돌릴 수단이 사라진다. 화면 상태만 `visibility` 로 적는다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getTistoryPage, ensureLoggedIn, BLOG, takeDialog } from './lib/browser.mjs';
import { loadPosts, savePostsAtomic } from './lib/post-state.mjs';

const DIR = path.join(ASSETS, 'tistory-cinema');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LABEL = { open0: '비공개', open20: '공개' };

export function parseArgs(argv) {
  const supported = new Set(['--private', '--run']);
  for (const arg of argv) if (arg.startsWith('--') && !supported.has(arg)) throw new Error(`지원하지 않는 옵션: ${arg}`);
  if (!argv.includes('--private')) throw new Error('--private 가 필요하다');
  // 되돌리기(공개+예약 복원)는 예약 시각을 글마다 다시 넣어야 해서 이 경로로 할 수 없다.
  return { to: 'open0', run: argv.includes('--run') };
}

/**
 * 목록에 보이는 글.
 *
 * 🔴 **목록 링크에는 글 번호가 없다.** href 가 공개 주소(`/entry/슬러그`)라 숫자를 뽑으면
 *    엉뚱한 값이 나온다. 대장의 `url` 과 맞춰 번호를 찾는다. 제목 앞의 `[예약]` 표가
 *    아직 공개 예정이라는 뜻이다.
 */
const normUrl = (u) => { try { return decodeURI(new URL(u).pathname); } catch { return String(u ?? ''); } };

async function readList(page) {
  return page.evaluate(() => [...document.querySelectorAll('a.link_cont')].map((el) => ({
    url: el.href,
    title: el.textContent.trim(),
  })));
}

/** 대장과 대조해 목록 줄에 실제 글 번호를 붙인다. */
function withIds(rows, posts) {
  const byUrl = new Map(posts.filter((p) => p.url).map((p) => [normUrl(p.url), p.id]));
  return rows.map((row) => ({ ...row, id: byUrl.get(normUrl(row.url)) ?? null })).filter((row) => row.id != null);
}

/** 주소로 그 줄의 체크박스만 켠다. 다른 줄은 건드리지 않는다. */
async function checkOnly(page, urls) {
  return page.evaluate((wanted) => {
    const norm = (u) => { try { return decodeURI(new URL(u).pathname); } catch { return String(u ?? ''); } };
    const want = new Set(wanted.map(norm));
    let hit = 0;
    for (const box of document.querySelectorAll('input[type=checkbox]')) {
      const row = box.closest('li,tr,div[class*=item]');
      const link = row?.querySelector('a.link_cont');
      if (!link) continue;
      const on = want.has(norm(link.href));
      if (box.checked !== on) (box.closest('label') ?? box).click();
      if (on) hit += 1;
    }
    return hit;
  }, urls);
}

async function applyChange(page, to) {
  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((el) => el.getClientRects().length && el.textContent.trim() === '변경' && /btn_opt/.test(el.className));
    if (!btn) return false;
    btn.click(); return true;
  });
  if (!opened) throw new Error('「변경」 단추를 찾지 못했다');
  await wait(1200);
  /**
   * 🔴 **눌러야 하는 것은 `label` 이 아니라 그 안의 `input[type=button]` 이다.**
   *    레이어는 `<label class="lab_btn">비공개<input type="button" value="비공개"></label>`
   *    꼴이라, 바깥 `li` 나 `label` 을 클릭하면 아무 일도 일어나지 않는다. 선택이 된 것처럼
   *    보이는데 상태는 그대로여서, 20회차를 헛돌고서야 알았다(26.09.07).
   */
  const picked = await page.evaluate((label) => {
    const layer = document.querySelector('div.layer_double');
    const input = layer?.querySelector(`input.btn_g[value="${label}"]`);
    if (!input) return false;
    input.click(); return true;
  }, LABEL[to]);
  if (!picked) throw new Error(`「${LABEL[to]}」 선택지를 찾지 못했다`);
  await wait(3000);
}

export async function main(argv = process.argv.slice(2)) {
  const { to, run } = parseArgs(argv);
  const statePath = path.join(DIR, '_posts.json');
  const posts = loadPosts(statePath);
  const targets = posts.filter((post) => post.id != null && post.visibility !== to);

  console.log(`대장 ${posts.length}편 중 ${LABEL[to]}로 바꿀 글 ${targets.length}편`);
  if (!targets.length) { console.log('바꿀 것이 없다.'); return; }
  if (!run) {
    targets.forEach((post) => console.log(` #${post.id} ${post.name} · 대장 ${post.at ?? '예약 없음'}`));
    console.log('미리보기다. --run 을 붙이면 목록에서 골라 한 번에 바꾼다.');
    return;
  }

  const { browser } = await getBrowser();
  try {
    const page = await getTistoryPage(browser);
    await ensureLoggedIn(page);
    const wanted = new Set(targets.map((post) => post.id));
    let changed = 0;

    /**
     * 목록은 쪽으로 나뉘고, 상태를 바꾼 글은 다음 조회에서 자리가 바뀐다. 한 쪽을 처리하고
     * 목록을 다시 읽는 것을 남은 대상이 없을 때까지 되풀이한다.
     */
    let sheet = 1;
    for (let round = 1; round <= 40 && wanted.size; round += 1) {
      await page.goto(`https://${BLOG}.tistory.com/manage/posts/?page=${sheet}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await wait(2500);
      const rows = withIds(await readList(page), posts);
      const here = rows.filter((row) => wanted.has(row.id));
      if (!here.length) {
        /**
         * 이 쪽에 대상이 없으면 다음 쪽으로 넘어간다. 목록은 15편씩 끊기고, 상태를 바꾼 글은
         * 자리가 밀리므로 **한 쪽을 비운 뒤에 넘기는 것이 아니라** 없으면 그때 넘긴다.
         * 줄이 아예 없으면 마지막 쪽을 지난 것이라 처음으로 되돌아간다.
         */
        if (!rows.length) { console.log(`${sheet}쪽에 글이 없다. 처음 쪽으로 되돌아간다`); sheet = 1; continue; }
        console.log(`${sheet}쪽 — 남은 대상 없음. 다음 쪽으로`);
        sheet += 1;
        continue;
      }

      const hit = await checkOnly(page, here.map((row) => row.url));
      if (hit !== here.length) throw new Error(`체크한 수(${hit})가 대상(${here.length})과 다르다`);
      console.log(`${round}회차 — ${here.length}편 선택: ${here.map((r) => '#' + r.id).join(' ')}`);

      takeDialog();
      await applyChange(page, to);
      const dialog = takeDialog();
      if (dialog) console.log(`   [알림] ${dialog.slice(0, 80)}`);

      // 바뀐 것만 대장에 적는다. 화면을 다시 읽어 확인한 뒤 기록한다.
      await wait(1500);
      const after = withIds(await readList(page), posts);
      const stillOpen = new Set(after.filter((row) => /^\[예약\]/.test(row.title)).map((row) => row.id));
      const latest = loadPosts(statePath);
      for (const { id } of here) {
        if (stillOpen.has(id)) { console.log(`   #${id} 아직 예약 상태다. 다음 회차에 다시 시도한다`); continue; }
        const row = latest.find((post) => post.id === id);
        if (row) Object.assign(row, { visibility: to, verified_at: new Date().toISOString() });
        wanted.delete(id);
        changed += 1;
      }
      savePostsAtomic(statePath, latest);
    }

    console.log(`\n${changed}편 ${LABEL[to]} 전환. 남은 대상 ${wanted.size}편`);
    if (wanted.size) console.log(`확인 필요: ${[...wanted].join(', ')}`);
  } finally { browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
