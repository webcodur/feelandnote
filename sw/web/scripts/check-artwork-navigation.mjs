import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

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
  const images = [
    {url:'/cover.svg',label:'Cover'},
    {url:'/one.svg',label:'One',kind:'scene',caption:'첫 문장. 두 번째 문장. 세 번째 문장.'},
    {url:'/two.svg',label:'Two',kind:'scene',caption:'다음 문장. 마지막 문장.',ending:{title:'Ending',text:'Afterward'}},
  ];
  function App() {
    const [open,setOpen] = useState(true);
    return <NextIntlClientProvider locale="ko" timeZone="Asia/Seoul" messages={{...explore,...core}}>
      <button id="open" onClick={()=>setOpen(true)}>Open</button>
      {open && <Viewer images={images} initialIndex={1} title="Scenes" onClose={()=>setOpen(false)} />}
    </NextIntlClientProvider>;
  }
  createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', loader: { '.css': 'empty', '.module.css': 'empty' }, define: { 'process.env': '{}', 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_DEPLOYMENT_ID': '""' } });
const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(
  '@import "tailwindcss"; @source "../components/features/faction"; @theme { --color-bg-main:#121110; --color-accent:#d4af37; --color-text-primary:#fff; --color-text-secondary:#aaa; }',
  {from:root+'src/app/navigation-check.css'},
);
const server = createServer((request, response) => {
  if (request.url.endsWith('.svg')) {
    response.writeHead(200, {'Content-Type':'image/svg+xml'});
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#486785"/></svg>');
    return;
  }
  if (request.url === '/app.js') {
    response.writeHead(200, {'Content-Type':'text/javascript'}); response.end(outputFiles[0].text); return;
  }
  if (request.url === '/style.css') {
    response.writeHead(200, {'Content-Type':'text/css'});response.end(css.css);return;
  }
  response.writeHead(200, {'Content-Type':'text/html'});
  response.end('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({headless:true});
const errors = [];
const failures = [];
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
try {
  for (const width of [1440,390,320]) {
    const page = await browser.newPage();
    await page.setViewport({width,height:900,isMobile:width<768,hasTouch:width<768});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForSelector('[data-scene-caption-counter]');
    const state = () => page.evaluate(() => ({scene:document.querySelector('[data-scene-counter]').textContent.trim(),caption:document.querySelector('[data-scene-caption-counter]')?.textContent.trim() ?? null}));
    const reset = async () => {
      await page.$eval('[data-artwork-dismiss]',button=>button.click());
      await page.$eval('#open',button=>button.click());
      await page.waitForSelector('[data-scene-caption-counter]');
    };
    const check = async (name, run) => {
      await reset();
      try {await run();console.log('PASS '+name+' '+width);}
      catch(error) {failures.push(name+' '+width+': '+error.message);console.error('FAIL '+failures.at(-1));}
    };
    await check('all tools are visible and reachable on screen',async()=>{
      const blocked=await page.evaluate(()=>{
        const selectors=['[data-scene-help]','[data-scene-captions]','[data-scene-caption-size]','[data-scene-caption-height]','[data-artwork-dismiss]','[data-scene-slider]'];
        return selectors.filter(selector=>{
          const element=document.querySelector(selector);
          if(!element) return true;
          const rect=element.getBoundingClientRect();
          const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
          return rect.width===0||rect.height===0||rect.left<0||rect.right>innerWidth||rect.top<0||rect.bottom>innerHeight||!element.contains(hit);
        });
      });
      assert.deepEqual(blocked,[]);
    });
    await check('default arrows advance one caption without choosing a mode',async()=>{
      await page.keyboard.press('ArrowRight'); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'2 / 3'});
      await page.keyboard.press('ArrowLeft'); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'1 / 3'});
    });
    await check('default next button advances one caption',async()=>{
      await page.$eval('[data-scene-controls] button:has(svg.lucide-chevron-right)',button=>button.click()); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'2 / 3'});
    });
    await check('slider keyboard advances one caption',async()=>{
      await page.focus('[data-scene-slider]');
      await page.keyboard.press('ArrowRight'); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'2 / 3'});
    });
    await check('slider one step advances one caption',async()=>{
      await page.$eval('[data-scene-slider]',input=>{
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        setter.call(input,Number(input.value)+1); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));
      }); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'2 / 3'});
    });
    await check('image swipe advances one caption',async()=>{
      await page.$eval('[data-artwork-current] img',img=>{
        for(const [type,x] of [['pointerdown',300],['pointermove',200],['pointerup',200]])
          img.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',clientX:x,clientY:150}));
      }); await settle(page);
      await page.$eval('[data-artwork-current]',element=>element.parentElement.dispatchEvent(new TransitionEvent('transitionend',{bubbles:true,propertyName:'transform'})));
      await page.$eval('[data-artwork-caption] > span',element=>element.dispatchEvent(new TransitionEvent('transitionend',{bubbles:true,propertyName:'transform'})));
      await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'2 / 3'});
    });
    await check('whole captions advance an entire scene',async()=>{
      await page.$eval('[data-scene-captions]',button=>button.click()); await settle(page);
      await page.keyboard.press('ArrowRight'); await settle(page);
      assert.deepEqual(await state(),{scene:'3 / 4',caption:null});
      await page.keyboard.press('ArrowLeft'); await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:null});
    });
    await check('caption boundaries, reverse entry and ending follow reading order',async()=>{
      for (const expected of [
        {scene:'2 / 4',caption:'2 / 3'}, {scene:'2 / 4',caption:'3 / 3'},
        {scene:'3 / 4',caption:'1 / 2'}, {scene:'3 / 4',caption:'2 / 2'}, {scene:'4 / 4',caption:null},
      ]) {await page.keyboard.press('ArrowRight');await settle(page);assert.deepEqual(await state(),expected);}
      await page.keyboard.press('ArrowLeft');await settle(page);
      assert.deepEqual(await state(),{scene:'3 / 4',caption:'2 / 2'});
      await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'3 / 3'});
    });
    await check('whole mode slider advances a scene and switching back preserves a valid stop',async()=>{
      await page.$eval('[data-scene-captions]',button=>button.click()); await settle(page);
      await page.focus('[data-scene-slider]');await page.keyboard.press('ArrowRight');await settle(page);
      assert.deepEqual(await state(),{scene:'3 / 4',caption:null});
      await page.$eval('[data-scene-captions]',button=>button.click());await settle(page);
      assert.deepEqual(await state(),{scene:'3 / 4',caption:'1 / 2'});
      await page.focus('[data-scene-slider]');await page.keyboard.press('ArrowLeft');await settle(page);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'3 / 3'});
    });
    await check('text sizes are independent of caption mode and fit the header',async()=>{
      const sizes=[];
      await page.click('[data-scene-caption-size]');await page.click('[data-scene-caption-size]');
      for(const size of ['small','medium','large']) {
        await settle(page);
        assert.deepEqual(await state(),{scene:'2 / 4',caption:'1 / 3'});
        const font=await page.$eval('[data-artwork-caption]',element=>getComputedStyle(element).fontSize);
        sizes.push(parseFloat(font));
        await page.$eval('[data-scene-captions]',button=>button.click());await settle(page);
        assert.equal(await page.$eval('[data-artwork-caption]',element=>getComputedStyle(element).fontSize),font);
        assert.equal(await page.$eval('[data-scene-caption-size]',element=>element.dataset.sceneCaptionSize),size);
        await page.keyboard.press('ArrowRight');await settle(page);
        assert.deepEqual(await state(),{scene:'3 / 4',caption:null});
        await page.keyboard.press('ArrowLeft');await settle(page);
        await page.$eval('[data-scene-captions]',button=>button.click());await settle(page);
        if(size!=='large') await page.click('[data-scene-caption-size]');
      }
      assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2]);
      assert.equal(await page.$eval('[data-scene-caption-size]',element=>{const r=element.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),true);
      if(process.env.ARTWORK_CAPTURE_DIR) await page.screenshot({path:process.env.ARTWORK_CAPTURE_DIR+'/caption-size-'+width+'.png'});
    });
    await check('bare text cycles sizes immediately without opening a picker',async()=>{
      assert.equal(await page.$eval('[data-scene-caption-size]',button=>getComputedStyle(button).borderWidth),'0px');
      const sizes=[];
      for(const size of ['large','small','medium']) {
        await page.click('[data-scene-caption-size] span');await settle(page);
        assert.equal(await page.$eval('[data-scene-caption-size]',button=>button.dataset.sceneCaptionSize),size);
        sizes.push(await page.$eval('[data-scene-caption-size]',button=>parseFloat(getComputedStyle(button).fontSize)));
        assert.equal(await page.$('[data-caption-size-options]'),null);
      }
      assert.ok(sizes[0]>sizes[2]&&sizes[2]>sizes[1]);
      await page.keyboard.press('Enter');await page.keyboard.press('Space');await settle(page);
      assert.equal(await page.$eval('[data-scene-caption-size]',button=>button.dataset.sceneCaptionSize),'small');
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'1 / 3'});
    });
    await check('caption height changes independently in both caption modes',async()=>{
      const positions=[];
      const font=await page.$eval('[data-artwork-caption]',element=>getComputedStyle(element).fontSize);
      const offset=()=>page.evaluate(()=>{const viewer=document.querySelector('[data-artwork-viewer]').getBoundingClientRect(),caption=document.querySelector('[data-artwork-caption-frame]').getBoundingClientRect();return (viewer.bottom-caption.bottom)/viewer.height;});
      assert.equal(await page.$eval('[data-scene-caption-height]',button=>getComputedStyle(button).borderWidth),'0px');
      for(const [height,expected] of [['low',0],['middle',0.1],['high',0.2]]) {
        if(height!=='low') await page.click('[data-scene-caption-height]');await settle(page);
        positions.push(await offset());assert.ok(Math.abs(positions.at(-1)-expected)<0.005);
        assert.deepEqual(await state(),{scene:'2 / 4',caption:'1 / 3'});
        assert.equal(await page.$eval('[data-artwork-caption]',element=>getComputedStyle(element).fontSize),font);
        await page.$eval('[data-scene-captions]',button=>button.click());await settle(page);
        assert.ok(Math.abs((await offset())-expected)<0.005);
        await page.keyboard.press('ArrowRight');await settle(page);
        assert.equal(await page.$eval('[data-scene-caption-height]',button=>button.dataset.sceneCaptionHeight),height);
        await page.keyboard.press('ArrowLeft');await page.$eval('[data-scene-captions]',button=>button.click());await settle(page);
      }
      assert.ok(positions[0]<positions[1]&&positions[1]<positions[2]);
      await page.click('[data-scene-caption-height]');
      await settle(page);assert.equal(await page.$eval('[data-scene-caption-height]',button=>button.dataset.sceneCaptionHeight),'low');
      if(process.env.ARTWORK_CAPTURE_DIR) await page.screenshot({path:process.env.ARTWORK_CAPTURE_DIR+'/caption-height-'+width+'.png'});
      assert.equal(await page.$('[data-caption-height-options]'),null);
      assert.deepEqual(await state(),{scene:'2 / 4',caption:'1 / 3'});
    });
    await check('help icons operate the viewer and show current settings',async()=>{
      await page.click('[data-scene-help]');await settle(page);
      const help='[data-artwork-help] ';
      await page.click(help+'[data-scene-caption-size] span');await settle(page);
      assert.equal(await page.$eval('[data-artwork-caption]',element=>getComputedStyle(element).fontSize),width<768?'24px':'30px');
      assert.equal(await page.$eval(help+'[data-scene-caption-size]',element=>element.dataset.sceneCaptionSize),'large');
      assert.ok(await page.$eval(help+'ul',element=>element.textContent.includes('글자 크기: 크게')));
      await page.click(help+'[data-scene-caption-height] svg');await settle(page);
      assert.equal(await page.$eval(help+'[data-scene-caption-height]',element=>element.dataset.sceneCaptionHeight),'middle');
      assert.ok(await page.$eval(help+'ul',element=>element.textContent.includes('자막 높이: 하단 위')));
      await page.keyboard.press('Enter');await settle(page);
      assert.equal(await page.$eval(help+'[data-scene-caption-height]',element=>element.dataset.sceneCaptionHeight),'high');
      await page.click('[data-help-caption-mode] svg');await settle(page);
      assert.equal((await state()).caption,null);
      await page.click(help+'button[aria-label="다음 이미지"]');await settle(page);
      assert.deepEqual(await state(),{scene:'3 / 4',caption:null});
      await page.click('[data-help-zoom]');await settle(page);
      assert.ok(await page.$eval('[data-artwork-current]',element=>element.style.transform.includes('scale(2)')));
      await page.click('[data-help-zoom]');await settle(page);
      assert.ok(await page.$eval('[data-artwork-current]',element=>element.style.transform.includes('scale(1)')));
      await page.click('[data-help-copy]');
      await page.waitForFunction(()=>document.querySelector('[data-artwork-help]')?.textContent.includes('복사됨'));
      if(process.env.ARTWORK_CAPTURE_DIR) await page.screenshot({path:process.env.ARTWORK_CAPTURE_DIR+'/artwork-help-actions-'+width+'.png'});
      await page.click('[data-help-back]');await settle(page);
      assert.equal(await page.$('[data-artwork-help]'),null);
      assert.ok(await page.$('[data-artwork-viewer]'));
    });
    if(process.env.ARTWORK_CAPTURE_DIR) {
      await page.click('[data-scene-help]');await settle(page);
      await page.screenshot({path:process.env.ARTWORK_CAPTURE_DIR+'/artwork-help-'+width+'.png'});await page.keyboard.press('Escape');
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failures,[]);
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
