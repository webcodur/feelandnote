/**
 * 올라간 글의 본문을 초안과 **순서까지** 대조한다. 고치지 않고 읽기만 한다.
 *
 * `verify-blurbs.mjs` 는 소개·라벨·감상이 「있는가」만 봤다. 그래서 다른 책의 감상이
 * 끼어들거나 라벨이 두 번 나오는 사고를 놓쳤다(26.09.04 한강 편). 여기서는 초안의
 * 텍스트 단락 순서를 그대로 늘어놓고 편집기 단락과 한 줄씩 맞춰 본다.
 *
 * 예약 상태인 글(posts.json 의 scheduledAt 이 미래)은 글쓰기 화면의 「예약 발행」 목록에서 불러온다.
 * PostUpdateForm 으로 예약글을 열면 공개·검색 설정이 비어 보이고 본문도 다를 수 있다.
 * 인용구([q]) 안의 단락과 인물 사진([avatar:]) 표시까지 최종 양식 그대로 대조한다.
 * 통합 원고가 현행이 아니거나 초안이 없는 글은 restyle-body가 저장·재열기로 검증해 posts.json bodyStyle에 남긴
 * 단락 지문과 대조하고, 인물 안내·책 소개·독서 방식·감상 본문의 강조·굵기도 함께 확인한다.
 *
 * 사용: node scripts/naver-blog/verify-body.mjs [logNo] [--all]   (sw/web-bo 에서)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { getBrowser, getNaverPage, ensureLoggedIn } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import {compileUnifiedArticle} from './lib/unified-article.mjs';
import {assertUnifiedSnapshot,assertTypography} from './apply-unified-article.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {sameReservation} from './lib/same-reservation.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {BODY_STYLE_VERSION} from './lib/formatted-text.mjs';
import {EDITOR_SELECTOR, bodyStyleProblems, openTarget} from './restyle-body.mjs';
import {textsDigest} from './lib/body-baseline.mjs';

const DRAFTS = path.join(ASSETS, 'naver-blog/celeb-drafts.json');
const POSTS = path.join(ASSETS, 'naver-blog/posts.json');
const args = process.argv.slice(2);
const one = args.find((a) => /^\d{9,}$/.test(a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 인용구 안의 단락도 본문 순서에 들어 있으므로 인용구까지 포함해 읽는다. 자리표 글자는 뺀다.
const paras = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component:not(.se-documentTitle) .se-text-paragraph')]
    .map((e) => { const c = e.cloneNode(true); c.querySelectorAll('.se-placeholder').forEach((n) => n.remove()); return c.textContent.replace(/​/g, '').trim(); })
    .filter(Boolean));

const isDivider = (l) => /^[━─—–-]{3,}$/.test(l);
const isPicture = (l) => l.startsWith('[img:') || l.startsWith('[avatar:');
/** 초안 본문에서 글자 있는 줄만 순서대로 뽑는다(이미지·인물 사진·구분선·빈 줄 제외). */
const wantLines = (row) => row.body.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !isPicture(l) && !isDivider(l))
  .map((l) => l.replace(/\*\*/g, '').replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').replace(/^\[q\]/, '').replace(/\[\/q\]$/, '').trim());

const BROKEN = /[�]/;

const raw = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const rows = Array.isArray(raw) ? raw : raw.items ?? raw.drafts ?? [];
const posts = fs.existsSync(POSTS) ? JSON.parse(fs.readFileSync(POSTS, 'utf8')) : [];
// 활성 인물·기관 글 전체를 본다. 초안이 없거나 낡은 글은 재서식 때 검증한 본문 지문(bodyStyle)으로 대조한다.
const active = (p) => ['celeb', 'curated'].includes(p?.kind) && ['ok', 'check'].includes(p?.link);
const ids = one ? [String(one)] : [...new Set([...posts.filter(active).map((p) => String(p.logNo)), ...rows.filter((r) => r.logNo).map((r) => String(r.logNo))])];
const targets = ids.map((id) => ({ post: posts.find((p) => String(p.logNo) === id), row: rows.find((r) => String(r.logNo) === id) }))
  .filter(({ post, row }) => (post ? active(post) || one : row));
console.log(`검사 대상 ${targets.length}편\n`);

const { browser, launched } = await getBrowser({ protocolTimeout: 300000, background:true });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await ensureLoggedIn(page);
const editor = createExistingEditor(page);

/** 예약 시각이 미래면 예약 목록에서, 아니면 수정 화면으로 연다. 본문 단락·사진 수·구분선 수를 돌려준다. */
async function open(row) {
  const post = posts.find((p) => String(p.logNo) === String(row.logNo));
  const m = post?.scheduledAt?.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})/);
  const reserved = m && new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:00+09:00`).getTime() > Date.now();
  if (reserved) {
    // openTarget 은 [img:] 줄 수로 사진 로딩을 기다린다. 인물 사진까지 세도록 표시를 바꿔 넘긴다.
    const r = await editor.openTarget({ ...row, scheduledAt: post.scheduledAt, body: row.body.replace(/^\[avatar:/gm, '[img:') });
    // openTarget 의 본문 읽기는 사진 설명 자리표(「사진 설명을 입력하세요.」)를 거르지 않는다. 자리표를 뺀 단락을 다시 읽는다.
    return { got: await paras(page), images: r.content.images, dividers: r.content.dividers, reserved: true, when: r.reservation?.row?.split('\n').at(-1)?.trim() ?? null };
  }
  await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${row.logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
  await wait(4000);
  const [images, dividers] = await page.evaluate(() => [document.querySelectorAll('.se-component.se-image').length, document.querySelectorAll('.se-component.se-horizontalLine').length]);
  return { got: await paras(page), images, dividers, reserved: false, when: null };
}

const bad = [];
for (const { post, row } of targets) {
  const logNo = String(post?.logNo ?? row.logNo);
  const slug = row ? (row.target || '').replace('/celeb/', '') : post.title;
  try {
    const article = row?.format === 'unified' ? compileUnifiedArticle(row.unifiedMaterial) : null;
    const unifiedCurrent = article && article.articleHash === row.unifiedArticle?.articleHash && article.articleHash === post?.unified?.articleHash && row.unifiedImages;
    if (article && !unifiedCurrent && !post?.bodyStyle?.textsSha256) throw Error('현재 통합 원고·대장·업로드 원본 대조 불가');
    if (!unifiedCurrent && post?.bodyStyle?.textsSha256) {
      // 재서식·전체 입력 때 저장·재열기로 검증한 단락 목록과 지금 편집기 단락을 비교하고, 본문 강조·굵기도 함께 본다.
      const opened = await openTarget(page, post); await closePublishPanel(page, editor);
      const style = await page.evaluate(readParagraphPresentation, EDITOR_SELECTOR), now = textsDigest(style.map((p) => p.text));
      const problems = [];
      if (now.textsSha256 !== post.bodyStyle.textsSha256) problems.push(`본문 단락이 검증 기준과 다름 (편집기 ${now.paragraphs}단락 / 기준 ${post.bodyStyle.paragraphs}단락)`);
      for (const p of bodyStyleProblems(style).slice(0, 4)) problems.push(`본문 서식 다름 — ${p}`);
      if (post.bodyStyle.version !== BODY_STYLE_VERSION) problems.push(`서식 버전 ${post.bodyStyle.version} (현행 ${BODY_STYLE_VERSION})`);
      const where = opened.reservation ? '예약' : '발행';
      if (problems.length) { bad.push({ slug, logNo, problems }); console.log(`손상 ${slug} (${logNo}, ${where})`); problems.forEach((p) => console.log(`   · ${p}`)); }
      else console.log(`정상 ${slug} (${logNo}, ${where}) — 검증 본문 ${now.paragraphs}단락·본문 서식 일치`);
      if (opened.reservation) await page.goto('https://blog.naver.com/dmx777', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      continue;
    }
    if (!row) throw Error('대조 기준 없음 — restyle-body.mjs로 검증 본문을 기록하라');
    if(unifiedCurrent){
      const opened=await editor.openTarget({...post,body:undefined});await assertPublishOptions(page);await closePublishPanel(page,editor);
      const snapshot=await readSnapshot(page),table=await page.$$eval('.se-component.se-table tr',rs=>rs.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
      assertUnifiedSnapshot(article,snapshot,table,row.unifiedImages);await assertTypography(page,article);
      if(opened.reservation&&!sameReservation(opened.reservation,{...opened.reservation,row:article.title+'\n'+post.scheduledAt}))throw Error('예약 시각 불일치');
      console.log(`정상 ${slug} (${row.logNo}) — 공통 통합 원고·사진·서식·예약 시각 일치`);continue;
    }
    await page.bringToFront();
    const opened = await open(row);
    const got = opened.got;
    const want = wantLines(row);
    const problems = [];
    const lines = row.body.split('\n').map((l) => l.trim());
    const wantImages = lines.filter(isPicture).length, wantDividers = lines.filter(isDivider).length;
    if (opened.images !== wantImages) problems.push(`사진 수 ${opened.images} (초안 ${wantImages})`);
    if (opened.dividers !== wantDividers) problems.push(`구분선 수 ${opened.dividers} (초안 ${wantDividers})`);
    // 순서까지 같은지 — 있는가만 보던 검사가 놓친 사고를 여기서 잡는다.
    const firstDiff = got.findIndex((t, i) => t !== want[i]);
    if (got.length !== want.length || firstDiff >= 0) problems.push(`순서 불일치 [${firstDiff < 0 ? got.length : firstDiff}] 편집기 ${got.length}줄 / 초안 ${want.length}줄: ${String(got[firstDiff] ?? '').slice(0, 30)} ≠ ${String(want[firstDiff] ?? '').slice(0, 30)}`);

    // 글자가 깨진 줄
    got.forEach((t, i) => { if (BROKEN.test(t)) problems.push(`깨진 글자 [${i}] ${t.slice(0, 30)}`); });

    // 초안보다 더 많이 나오는 줄 — 라벨 중복·감상 끼어듦이 여기서 잡힌다.
    // 초안 자체에 같은 줄이 여럿일 수 있다(세 권이 같은 자리에서 온 감상이면 라벨이 세 번이다).
    const count = (arr) => arr.reduce((m, t) => (t.length > 12 ? m.set(t, (m.get(t) ?? 0) + 1) : m), new Map());
    const gotN = count(got), wantN = count(want);
    for (const [t, n] of gotN) {
      const w = wantN.get(t) ?? 0;
      if (n > w) problems.push(`${n}번 나옴(초안은 ${w}번): ${t.slice(0, 30)}`);
    }

    // 초안에 없는 줄이 끼어 있는지 (다른 책의 감상이 들어온 경우)
    const wantSet = new Set(want);
    const stray = got.filter((t) => t.length > 20 && !wantSet.has(t));
    for (const t of stray.slice(0, 4)) problems.push(`초안에 없는 줄: ${t.slice(0, 34)}`);

    // 초안에 있는데 글에 없는 줄
    const gotSet = new Set(got);
    const missing = want.filter((t) => t.length > 20 && !gotSet.has(t));
    for (const t of missing.slice(0, 4)) problems.push(`빠진 줄: ${t.slice(0, 34)}`);

    const where = opened.reserved ? `예약 ${opened.when}` : '발행';
    if (problems.length) { bad.push({ slug, logNo: row.logNo, problems }); console.log(`손상 ${slug} (${row.logNo}, ${where})`); problems.forEach((p) => console.log(`   · ${p}`)); }
    else console.log(`정상 ${slug} (${row.logNo}, ${where}) — 단락 ${got.length}·사진 ${opened.images}·구분선 ${opened.dividers} 초안과 순서까지 일치`);
    // 저장하지 않고 나간다. 열어 둔 발행 패널의 이탈 확인창은 dialog 핸들러가 수락한다.
    if (opened.reserved) await page.goto('https://blog.naver.com/dmx777', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  } catch (e) {
    bad.push({slug,logNo,problems:[String(e)]});
    console.log(`확인실패 ${slug}: ${String(e).split('\n')[0].slice(0, 100)}`);
  }
}

console.log(`\n손상 ${bad.length}편 / 검사 ${targets.length}편`);
if (bad.length) console.log(bad.map((b) => `${b.logNo} ${b.slug}`).join('\n'));
if (bad.length) process.exitCode=1;
if (launched) await browser.close(); else browser.disconnect();
