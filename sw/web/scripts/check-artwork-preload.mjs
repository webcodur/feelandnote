import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }));
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({ absWorkingDir: root, stdin: { resolveDir: root, loader: 'tsx', contents: `
  import { StrictMode, useState } from 'react';
  import { createRoot } from 'react-dom/client';
  import { NextIntlClientProvider } from 'next-intl';
  import Viewer from './src/components/features/faction/FactionArtworkViewer';
  import explore from './messages/ko/explore.json';
  import core from './messages/ko/core.json';
  const images = Array.from({length:8}, (_,i) => ({url:'/images/'+(i+1)+'.webp', label:'Scene '+(i+1), caption:i===5 ? 'First sentence. Second sentence.' : 'Caption', kind:'scene',
    ...(i===7 ? {ending:{title:'Ending',text:'Afterward'}} : {})}));
  function App() {
    const [open,setOpen] = useState(true);
    return <NextIntlClientProvider locale="ko" timeZone="Asia/Seoul" messages={{...explore,...core}}>
      <button id="open" onClick={()=>setOpen(true)}>Open</button>
      {open && <Viewer images={images} title="Scenes" onClose={()=>setOpen(false)} />}
    </NextIntlClientProvider>;
  }
  createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', loader: { '.css': 'empty', '.module.css': 'empty' }, define: { 'process.env': '{}', 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_DEPLOYMENT_ID': '""' } });
const body = await sharp({ create: { width: 240, height: 160, channels: 3, background: '#486785' } }).webp().toBuffer();
const requests = [];
let releaseFirst;
const firstGate = new Promise(resolve => { releaseFirst = resolve; });
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname.startsWith('/images/')) {
    requests.push(url.pathname);
    if (url.pathname === '/images/5.webp' && requests.filter(p => p === url.pathname).length === 1) {
      response.writeHead(503, { 'Cache-Control': 'no-store' }); response.end(); return;
    }
    if (url.pathname === '/images/1.webp') await firstGate;
    response.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' });
    response.end(body);
  } else if (url.pathname === '/app.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(outputFiles[0].text);
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<style>[data-artwork-viewer]{position:relative;width:600px}[data-artwork-dismiss]{position:absolute;inset:0}button{min-height:28px}.absolute{position:absolute}.inset-0{inset:0}</style><div id="root"></div><script src="/app.js"></script>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const settle = () => new Promise(resolve => setTimeout(resolve, 180));
const loaded = number => page.waitForFunction(n => {
  const img = document.querySelector('[data-artwork-current] img');
  return img?.complete && img.naturalWidth > 0 && img.src.endsWith('/'+n+'.webp');
}, { timeout: 10000 }, number);
const jump = async number => {
  await page.$eval('button[data-scene-title]', button => button.click());
  await page.waitForSelector('[data-scene-jump="'+number+'"]');
  await page.$eval('[data-scene-jump="'+number+'"]', button => button.click());
  await loaded(number); await settle();
};
try {
  await page.goto('http://127.0.0.1:'+server.address().port, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-artwork-viewer] img'), { timeout: 5000 });
  await settle();
  assert.deepEqual(requests, ['/images/1.webp'], 'prefetch waits for the visible image');
  releaseFirst();
  await loaded(1); await settle();
  assert.deepEqual([...requests].sort(), [1,2,3].map(n=>'/images/'+n+'.webp'));
  console.log('PASS initial image, then exactly two ahead (including StrictMode)');
  await page.keyboard.press('ArrowRight'); await loaded(2); await settle();
  assert.deepEqual([...requests].sort(), [1,2,3,4].map(n=>'/images/'+n+'.webp'));
  await page.keyboard.press('ArrowLeft'); await loaded(1); await settle();
  assert.equal(requests.length, 4);
  console.log('PASS advance fetches only one new image; back reuses downloaded images');
  await jump(6);
  assert.deepEqual([...requests].sort(), [1,2,3,4,6,7,8].map(n=>'/images/'+n+'.webp'));
  await jump(8);
  await page.keyboard.press('ArrowRight');
  await page.waitForSelector('[data-scene-ending]'); await settle();
  assert.equal(requests.length, 7);
  console.log('PASS numbered jump preloads its own next two; final image and ending do not wrap');
  await page.keyboard.press('Escape'); await page.click('#open'); await loaded(1); await settle();
  assert.equal(requests.length, 7);
  await page.setOfflineMode(true);
  await jump(6);
  assert.equal(requests.length, 7);
  console.log('PASS reopen and offline revisit use retained browser cache');
  await page.setOfflineMode(false);
  await jump(4);
  assert.equal(requests.filter(p => p === '/images/5.webp').length, 1);
  await jump(5);
  assert.equal(requests.filter(p => p === '/images/5.webp').length, 2);
  console.log('PASS failed preload does not block retry when the image is selected');
  for (const viewport of [{width:1440,height:900}, {width:390,height:844}]) {
    await page.setViewport(viewport);
    await jump(6);
    await page.$eval('[data-artwork-viewer]', (element, viewport) => {
      element.style.width = (viewport.width - 40) + 'px';
      element.style.height = Math.floor(viewport.height / 2) + 'px';
    }, viewport);
    const state = () => page.evaluate(() => ({
      scene: String(Number(document.querySelector('[data-scene-counter]').textContent.split('/')[0].trim()) - 1),
      caption: document.querySelector('[data-scene-caption-counter]')?.textContent,
      transform: document.querySelector('[data-artwork-current]').style.transform,
    }));
    const wheel = async (location, deltaY) => {
      await page.evaluate(({location,deltaY}) => {
        const viewer = document.querySelector('[data-artwork-viewer]');
        const r = viewer.getBoundingClientRect();
        const horizontalMargin = r.width > r.height * 1.5;
        const clientX = location === 'art' || !horizontalMargin ? r.left + r.width / 2 : r.left + 5;
        const clientY = location === 'art' || horizontalMargin ? r.top + r.height / 2 : r.top + 5;
        const target = location === 'caption' ? document.querySelector('[data-artwork-caption]') : viewer;
        target.dispatchEvent(new WheelEvent('wheel', {bubbles:true,cancelable:true,clientX,clientY,deltaY}));
      }, {location,deltaY});
      await settle();
    };
    await wheel('margin',120);
    assert.equal((await state()).scene,'5');
    assert.equal((await state()).caption,'2 / 2');
    await wheel('margin',120);
    assert.equal((await state()).scene,'6');
    await wheel('margin',-120);
    assert.equal((await state()).scene,'5');
    assert.equal((await state()).caption,'2 / 2');
    const before = await state();
    await wheel('caption',-120);
    assert.deepEqual(await state(),before,'caption scrolling must not change scene or zoom');
    await wheel('art',-120);
    assert.match((await state()).transform,/scale\(1\.35\)/);
    assert.equal((await state()).scene,'5');
    await wheel('margin',120);
    assert.match((await state()).transform,/scale\(1\)/);
    assert.equal((await state()).scene,'5','zoomed margins must zoom instead of navigating');
    await page.$eval('[data-scene-controls] button:has(svg.lucide-chevron-right)', button => button.click());
    await settle();
    assert.equal((await state()).scene,'6','button navigation must match the wheel order');
    console.log('PASS caption/scene wheel order, reverse entry, scroll exception and zoom '+viewport.width);
  }
  assert.deepEqual(errors, []);
} catch (error) {
  console.error({ requests, errors, body: await page.evaluate(() => document.body.innerText.slice(0, 700)) });
  throw error;
} finally {
  releaseFirst();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
