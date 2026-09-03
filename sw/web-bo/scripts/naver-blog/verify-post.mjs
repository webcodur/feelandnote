// 발행(예약 포함)된 글의 서식이 원고대로 들어갔는지 편집기에서 센다. 글을 고치지 않는다.
// 사용: node scripts/naver-blog/verify-post.mjs <logNo> [logNo...]   (sw/web-bo 에서)
import puppeteer from 'puppeteer';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ids = process.argv.slice(2).filter((a) => /^\d{9,}$/.test(a));
if (!ids.length) { console.log('글 번호를 넘겨라'); process.exit(1); }

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null, protocolTimeout: 60000 });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes('blog.naver.com')) ?? pages[0];
page.on('dialog', (d) => { d.accept().catch(() => {}); });

for (const logNo of ids) {
  await page.bringToFront();
  await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${logNo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 30000 });
  await wait(4500);

  const r = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')];
    const rows = ps.map((e) => ({
      t: e.textContent.replace(/​/g, '').trim(),
      center: [...e.classList].some((k) => k.includes('align-center')),
      bold: !!e.querySelector('b,strong,[style*="font-weight"]'),
    }));
    const title = document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/​/g, '').trim() ?? '';
    return {
      title,
      rows: rows.filter((x) => x.t),
      hr: document.querySelectorAll('.se-component.se-horizontalLine').length,
      img: document.querySelectorAll('.se-component.se-image').length,
    };
  });

  const centered = r.rows.filter((x) => x.center);
  const bolds = r.rows.filter((x) => x.bold);
  console.log(`\n${logNo}  ${r.title}`);
  console.log(`  단락 ${r.rows.length} · 구분선 ${r.hr} · 이미지 ${r.img} · 가운데 ${centered.length} · 굵게 ${bolds.length}`);
  console.log('  가운데 정렬된 줄');
  centered.forEach((x) => console.log(`    · ${x.t.slice(0, 60)}`));
  const leaked = centered.length > 3;
  const noHr = r.hr === 0;
  const noImg = r.img === 0;
  if (leaked) console.log('  ⚠ 가운데 정렬이 번졌다(도입·마무리 두 줄이어야 한다)');
  if (noHr) console.log('  ⚠ 구분선이 하나도 없다 — 표시가 글자로 박혔을 수 있다');
  if (noImg) console.log('  ⚠ 이미지가 없다');
  const rawHr = r.rows.filter((x) => /^[━─—–-]{3,}$/.test(x.t.replace(/\s/g, '')));
  if (rawHr.length) console.log(`  ⚠ 구분선 표시가 글자로 남았다 ${rawHr.length}줄`);
  const rawMark = r.rows.filter((x) => /\*\*|\[c\]|\[img:/.test(x.t));
  if (rawMark.length) { console.log(`  ⚠ 마크업이 글자로 남았다 ${rawMark.length}줄`); rawMark.slice(0, 3).forEach((x) => console.log(`    · ${x.t.slice(0, 60)}`)); }
  if (!leaked && !noHr && !noImg && !rawHr.length && !rawMark.length) console.log('  ○ 서식 이상 없음');
}
await browser.disconnect();
