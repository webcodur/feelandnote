import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }));
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({ absWorkingDir: root, stdin: { resolveDir: root, loader: 'tsx', contents: `
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { flushSync } from 'react-dom';
  import Portrait from './src/components/ui/ResponsivePortraitImage';
  import Title from './src/components/features/user/explore/myth/MythTitleImage';
  const root = createRoot(document.getElementById('root'));
  window.renderArtwork = ({kind,src,hidden=false,width=240,height=300}) => flushSync(() => root.render(
    <StrictMode><div id="frame" style={{position:'relative',width,height,display:hidden?'none':'block'}}>
      {kind==='title' ? <Title src={src} alt="title" priority /> : <Portrait src={src} alt="portrait" priority style={{objectPosition:'35% 20%'}} />}
    </div></StrictMode>));
  window.clearArtwork = () => flushSync(() => root.unmount());
` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_DEPLOYMENT_ID': '""' } });
const photo = 'https://assets.feelandnote.com/celebs/person/photo.webp?v=test';
const title = 'https://assets.feelandnote.com/myth/title-art/homer-iliad-000000000000.png';
const titleBody = await sharp({create:{width:1600,height:1000,channels:3,background:'#486785'}}).png().toBuffer();
const browser = await puppeteer.launch({ headless: true });
let passed = 0;
async function scenario(name, dpr, run, missing = false) {
  const page = await browser.newPage();
  const requests = [], errors = [];
  await page.setViewport({width:390,height:844,deviceScaleFactor:dpr});
  await page.setRequestInterception(true);
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', async request => {
    const url=request.url(); requests.push(url);
    const parsed=new URL(url), path=parsed.pathname;
    if (missing && (/\.display-\d+\.webp/.test(url) || path.startsWith('/api/myth-title/'))) {
      await request.respond({status:404,body:''}); return;
    }
    const titleVariant=path.startsWith('/api/myth-title/');
    const body=titleVariant
      ? await sharp(titleBody).resize({width:Number(parsed.searchParams.get('w'))}).webp().toBuffer()
      : path.startsWith('/myth/title-art/') ? titleBody
      : await sharp({create:{width:Number(/display-(\d+)/.exec(url)?.[1]??1080),height:Math.round(Number(/display-(\d+)/.exec(url)?.[1]??1080)*1.25),channels:3,background:'#487890'}}).webp().toBuffer();
    await request.respond({status:200,contentType:!titleVariant && path.endsWith('.png')?'image/png':'image/webp',body});
  });
  try {
    await page.setContent('<base href="https://feelandnote.com"><style>.object-cover{object-fit:cover}</style><div id="root"></div>');
    await page.addScriptTag({content:outputFiles[0].text});
    const render = data => page.evaluate(data=>window.renderArtwork(data),data);
    const loaded = part => page.waitForFunction(part => {const i=document.querySelector('img');return i?.complete&&i.naturalWidth>0&&i.currentSrc.includes(part);},{timeout:6000},part);
    try { await run({page,requests,render,loaded}); }
    catch (error) {
      console.error(name, {requests, errors, image: await page.$eval('img', i => ({src:i.src,currentSrc:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth})).catch(() => null)});
      throw error;
    }
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>window.clearArtwork());
    console.log('PASS '+name);passed++;
  } finally {await page.close();}
}
try {
  for(const [dpr,width]of [[2,768],[3,1024]]) await scenario('mobile title DPR '+dpr,dpr,async({requests,render,loaded})=>{
    await render({kind:'title',src:title,width:332,height:221});await loaded('w='+width);
    assert.equal(requests.length,1);assert.ok(new URL(requests[0]).pathname.startsWith('/api/myth-title/'));
  });
  await scenario('desktop portrait selects display image without original request',2,async({page,requests,render,loaded})=>{
    await render({src:photo});await loaded('display-768');assert.equal(requests.length,1);
    assert.equal(await page.$eval('img',i=>i.style.objectPosition),'35% 20%');
  });
  await scenario('mobile high density is capped at display size; original remains for zoom',3,async({requests,render,loaded})=>{
    await render({src:photo,width:332,height:500});await loaded('display-1024');assert.equal(requests.length,1);
  });
  await scenario('CSS-hidden desktop portrait makes no mobile request',2,async({page,requests,render,loaded})=>{
    await render({src:photo,hidden:true});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(requests,[]);await page.$eval('#frame',e=>e.style.display='block');await loaded('display-768');
  });
  await scenario('missing portrait variant falls back once; replacement resets',2,async({requests,render,loaded})=>{
    await render({src:photo});await loaded('photo.webp');assert.equal(requests.length,2);
    await render({src:photo,width:300});await loaded('photo.webp');assert.equal(requests.length,2);
    await render({src:photo.replace('person','other')});await loaded('/other/photo.webp');assert.equal(requests.length,4);
  },true);
  await scenario('missing title falls back to original once',2,async({requests,render,loaded})=>{
    await render({kind:'title',src:title});await loaded('.png');assert.equal(requests.length,2);
  },true);
  await scenario('external portrait URL is not rewritten',2,async({requests,render,loaded})=>{
    await render({src:'https://external.test/portrait.jpg'});await loaded('portrait.jpg');assert.equal(requests.length,1);
  });
  console.log('All '+passed+' artwork browser checks passed.');
} finally {await browser.close();}
