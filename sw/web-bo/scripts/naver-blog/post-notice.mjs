// 블로그 공지 글을 쓴다. 두 단계로 나눠 사용자가 원고를 고칠 틈을 둔다.
// node scripts/naver-blog/post-notice.mjs --draft <원고.txt 절대경로>
//   원고를 편집기에 넣고 상단 「저장」(임시저장)만 누른다. 발행 창은 열지 않는다.
// node scripts/naver-blog/post-notice.mjs --publish <원고.txt 절대경로> --tags=태그,… [--category=공지사항] [--apply]
//   임시저장본을 불러와 본문을 원고와 대조하고 카테고리·태그·공유를 채운다. --apply일 때만 「현재」 발행하고 원장에 kind other로 적는다.
// 원고: 첫 줄 「제목: …」, 그다음부터 본문(빈 줄은 빈 문단). 사용자가 편집기에서 고쳤다면 원고 파일도 같은 글로 맞춘 뒤 --publish를 돌린다.
import fs from 'node:fs';
import {getBrowser} from './lib/browser.mjs';
import {typeTitle, typeLine, bodyParas, selectCategory, addTags, enableSharing} from './publish-drafts.mjs';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DRAFT = process.argv.includes('--draft'), PUBLISH = process.argv.includes('--publish'), APPLY = process.argv.includes('--apply');
const file = process.argv.slice(2).find(a => !a.startsWith('--'));
if (DRAFT === PUBLISH || !file) throw Error('--draft 또는 --publish 하나와 원고 경로가 필요하다');
const TAGS = (arg('tags') ?? '').split(',').map(t => t.trim()).filter(Boolean), CATEGORY = arg('category') ?? '공지사항';
if (PUBLISH && !TAGS.length) throw Error('--tags=가 필요하다');
const REG = 'D:/feelandnote/blog-assets/naver-blog/posts.json';
const wait = ms => new Promise(r => setTimeout(r, ms)), shot = n => file.replace(/\.txt$/, `-${n}.png`);
const [first, ...rest] = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
if (!first.startsWith('제목: ')) throw Error('첫 줄은 「제목: …」이어야 한다');
const TITLE = first.slice(4), lines = rest.join('\n').replace(/^\n+|\n+$/g, '').split('\n'), want = lines.filter(l => l.trim());
const titleNow = page => page.evaluate(() => document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/\u200b/g, '').trim() ?? '');
const clickLayerButton = (page, layerRe, buttonRe) => page.evaluate((l, b) => {
  const layer = [...document.querySelectorAll('[class*=layer],[role=dialog],[class*=popup]')].find(e => e.offsetParent && new RegExp(l).test(e.textContent));
  const btn = layer && [...layer.querySelectorAll('button')].find(x => new RegExp(b).test(x.textContent.trim()));
  btn?.click(); return Boolean(btn);
}, layerRe, buttonRe);
const assertBody = async page => {
  const got = (await bodyParas(page)).filter(Boolean), missing = want.filter(w => !got.some(g => g === w || g.startsWith(w)));
  if (missing.length) throw Error('본문이 원고와 다르다: ' + missing.map(m => m.slice(0, 30)).join(' / '));
  return got.length;
};

const {browser, launched} = await getBrowser({background: true, protocolTimeout: 120000});
const page = await browser.newPage();
page.on('dialog', d => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}));
try {
  await page.setViewport({width: 1440, height: 1700});
  await page.goto('https://blog.naver.com/dmx777/postwrite', {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForSelector('.se-documentTitle .se-text-paragraph', {timeout: 30000}); await wait(4000);
  if (DRAFT) {
    // 「작성 중인 글」 창은 불러오지 않고 닫는다(저장된 다른 원고를 건드리지 않는다).
    await clickLayerButton(page, '작성 중|임시저장|불러오', '취소|아니오|닫기'); await wait(800);
    const at = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return {x: r.left + 20, y: r.top + r.height / 2}; }, sel);
    const t = await at('.se-documentTitle .se-text-paragraph'); await page.mouse.click(t.x, t.y); await wait(300); await typeTitle(page, TITLE);
    const b = await at('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph'); await page.mouse.click(b.x, b.y); await wait(300);
    for (const ln of lines) await typeLine(page, ln);
    await wait(1500); const paragraphs = await assertBody(page);
    const saved = await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(x => x.offsetParent && /save_btn/.test(x.className) && !/publish/.test(x.className)); btn?.click(); return Boolean(btn); });
    if (!saved) throw Error('저장 버튼을 찾지 못했다'); await wait(3000);
    await page.screenshot({path: shot('editor')});
    console.log(JSON.stringify({drafted: true, title: TITLE, paragraphs, screenshot: shot('editor')}));
  } else {
    // 「작성 중인 글」 창으로 이어 쓰거나, 저장 목록에서 같은 제목을 고른다.
    await clickLayerButton(page, '작성 중|임시저장|불러오', '^(확인|예|불러오기)$'); await wait(2500);
    if ((await titleNow(page)) !== TITLE) {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.offsetParent && /save_count/.test(x.className))?.click()); await wait(1500);
      await page.evaluate(t => { const el = [...document.querySelectorAll('li,[class*=item]')].filter(e => e.offsetParent && e.textContent.includes(t)).find(e => e.querySelector('a,button')); (el?.querySelector('a,button'))?.click(); }, TITLE);
      await wait(1500); await clickLayerButton(page, '불러오|덮어|확인', '^(확인|예|불러오기)$'); await wait(3000);
    }
    if ((await titleNow(page)) !== TITLE) { await page.screenshot({path: shot('load-failed')}); throw Error('임시저장본을 불러오지 못했다: ' + (await titleNow(page)).slice(0, 40)); }
    const paragraphs = await assertBody(page);
    await page.click('button[class*=publish_btn]'); await page.waitForSelector('#publish-option-search', {timeout: 10000}); await wait(800);
    if (!(await selectCategory(page, CATEGORY))) throw Error('카테고리 선택 실패');
    const tagsNow = () => page.evaluate(() => [...new Set([...document.querySelectorAll('[class*=option_tag] [class*=tag]')].map(e => e.textContent.trim()).filter(t => t.startsWith('#')))]);
    const before = await tagsNow(); await addTags(page, TAGS.filter(t => !before.includes('#' + t))); const tags = await tagsNow();
    if (TAGS.some(t => !tags.includes('#' + t))) throw Error('태그 누락: ' + tags.join(' '));
    await enableSharing(page);
    const state = await page.evaluate(() => ({public: document.getElementById('open_public')?.checked, radios: [...document.querySelectorAll('input[type=radio]')].filter(r => r.checked).map(r => r.id)}));
    if (!state.public) throw Error('전체 공개가 아니다');
    if (state.radios.some(id => /pre|reserve|schedule/i.test(id))) throw Error('예약 발행으로 잡혀 있다: ' + state.radios.join(','));
    await page.screenshot({path: shot('panel')});
    console.log(JSON.stringify({title: TITLE, paragraphs, tags, ...state, screenshot: shot('panel')}));
    if (!APPLY) console.log('dry: 발행하지 않았다');
    else {
      await page.click('button[class*=confirm_btn]'); await page.waitForFunction(() => /logNo=\d+|\/dmx777\/\d+/.test(location.href), {timeout: 30000}); await wait(2000);
      const logNo = page.url().match(/logNo=(\d+)|\/dmx777\/(\d+)/).slice(1).find(Boolean);
      const all = JSON.parse(fs.readFileSync(REG, 'utf8'));
      if (!all.some(p => p.logNo === logNo)) {
        const d = new Date(Date.now() + 9 * 3600e3);
        all.unshift({logNo, date: `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`, title: TITLE, kind: 'other', slug: null, url: null, line: null, link: 'skip', name: null});
        fs.writeFileSync(REG + '.tmp', JSON.stringify(all, null, 2)); fs.renameSync(REG + '.tmp', REG);
      }
      console.log(JSON.stringify({published: true, logNo, url: `https://blog.naver.com/dmx777/${logNo}`}));
    }
  }
} finally { await page.close().catch(() => {}); if (launched) await browser.close(); else await browser.disconnect(); }
