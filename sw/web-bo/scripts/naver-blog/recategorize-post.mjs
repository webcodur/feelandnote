// 올라간 글·예약 글 하나의 블로그 카테고리만 바꾼다. 본문·카테고리 외 발행 설정(예약 시각 포함)은 저장 전후로 대조하고, 다시 열어 새 카테고리를 확인한다.
// 사용(sw/web-bo): node scripts/naver-blog/recategorize-post.mjs --log=<글번호> --to=<카테고리> [--apply]
// 수정 화면 주소로 바로 연 예약 글은 저장해도 예약본에 반영되지 않는다(26.11.14 apply-category 실측). 그래서 existing-editor의 openTarget으로 연다.
import fs from 'node:fs';
import { getBrowser } from './lib/browser.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const log = arg('log'), to = arg('to'), apply = process.argv.includes('--apply');
if (!log || !to) throw new Error('--log=<글번호> --to=<카테고리> 가 필요하다');
const post = JSON.parse(fs.readFileSync('D:/feelandnote/blog-assets/naver-blog/posts.json', 'utf8')).find(p => String(p.logNo) === log);
if (!post?.title) throw new Error(`원장에 글이 없다: ${log}`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s ?? '').replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim();
const { browser } = await getBrowser({ background: true }), page = await browser.newPage();
const editor = createExistingEditor(page);
const strip = s => { const { category, ...rest } = s; return JSON.stringify(rest); };
try {
  const opened = await editor.openTarget({ ...post, body: undefined, allowPrivate: post.link === 'private' });
  const from = norm(opened.state.category);
  console.log(JSON.stringify({ log, title: post.title, from, to, reservation: !!opened.reservation, apply }));
  if (from === to) { console.log(JSON.stringify({ stage: 'already', log })); process.exit(0); }
  if (!apply) process.exit(0);
  await page.click('[class*=option_category] [class*=selectbox_button]');
  await page.waitForFunction(() => [...document.querySelectorAll('[class*=option_category] li')].some(e => e.offsetParent));
  const item = await page.evaluateHandle(n => [...document.querySelectorAll('[class*=option_category] li')].find(e => e.textContent.replace(/하위 카테고리/g, '').replace(/\s+/g, ' ').trim() === n), to);
  if (!item.asElement()) throw new Error(`카테고리 선택지 없음: ${to}`);
  await item.asElement().evaluate(e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await item.asElement().click(); await item.dispose(); await wait(700);
  const now = await editor.settings();
  if (norm(now.category) !== to) throw new Error(`선택 후 카테고리가 다르다: ${now.category}`);
  if (strip(now) !== strip(opened.state)) throw new Error('카테고리 외 발행 설정이 바뀌었다');
  if (JSON.stringify(await editor.content()) !== JSON.stringify(opened.content)) throw new Error('본문이 바뀌었다');
  await editor.click('button[class*=confirm_btn]');
  // 예약 글은 logNo= 주소로, 공개 글은 /dmx777/<글번호> 주소로 돌아온다.
  await page.waitForFunction(id => location.href.includes(id) && !location.href.includes('PostUpdateForm'), { timeout: 30000 }, log);
  const reopened = await editor.openTarget({ ...post, body: undefined, allowPrivate: post.link === 'private' });
  if (norm(reopened.state.category) !== to) throw new Error(`다시 연 카테고리가 다르다: ${reopened.state.category}`);
  if (strip(reopened.state) !== strip(opened.state)) throw new Error('다시 연 발행 설정이 다르다');
  if (JSON.stringify(reopened.content) !== JSON.stringify(opened.content)) throw new Error('다시 연 본문이 다르다');
  console.log(JSON.stringify({ stage: 'recategorized', log, category: to }));
} finally { await page.close(); await browser.disconnect(); }
process.exit(0);
