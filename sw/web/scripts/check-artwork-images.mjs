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
  import Avatar from './src/components/ui/CelebAvatarImage';
  import Title from './src/components/features/user/explore/myth/MythTitleImage';
  const root = createRoot(document.getElementById('root'));
  window.renderArtwork = ({kind,src,hidden=false,width=240,height=300,native=false}) => flushSync(() => root.render(
    <StrictMode><div id="frame" style={{position:'relative',width,height,display:hidden?'none':'block'}}>
      {kind==='title' ? <Title src={src} alt="title" priority /> : kind==='avatar'
        ? <Avatar src={src} alt="avatar" sizes={native ? Math.max(width,height)+'px' : undefined} />
        : <Portrait src={src} alt="portrait" priority sizes={native ? Math.max(width,height)+'px' : undefined} style={{objectPosition:'35% 20%'}} />}
    </div></StrictMode>));
  window.clearArtwork = () => flushSync(() => root.unmount());
` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_DEPLOYMENT_ID': '""' } });
const photo = 'https://assets.feelandnote.com/celebs/person/photo.webp?v=test';
const avatar = 'https://assets.feelandnote.com/celebs/person/avatar.webp?v=test';
const {outputFiles:ssrFiles} = await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'tsx',contents:`
  import {renderToStaticMarkup} from 'react-dom/server';
  import Portrait from './src/components/ui/ResponsivePortraitImage';
  import Avatar from './src/components/ui/CelebAvatarImage';
  export const render = (src, avatar=false, native=true) => renderToStaticMarkup(avatar
    ? <Avatar src={src} alt="person" sizes={native ? '176px' : undefined} />
    : <Portrait src={src} alt="person" priority sizes={native ? '300px' : undefined} />);
  import Media from './src/components/shared/CelebProfileMedia';
  import {NextIntlClientProvider} from 'next-intl';
  export const renderMedia = (photoUrl, avatarUrl) => renderToStaticMarkup(
    <NextIntlClientProvider locale="ko" timeZone="Asia/Seoul" messages={{celebPage:{serviceDialogueVoice:'대사',servicePreparing:'준비 중'}}}>
      <Media photoUrl={photoUrl} avatarUrl={avatarUrl} nickname="인물" onZoom={()=>{}} zoomLabel="확대"
        hasVoice={false} avatarSize="h-28 w-28" initialSize="text-2xl" imageSizes="112px" />
    </NextIntlClientProvider>);
`},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom/server']});
const ssrModule={exports:{}};
new Function('require','module','exports',ssrFiles[0].text)(require,ssrModule,ssrModule.exports);
for(const [src,isAvatar] of [[photo,false],[avatar,true]]) {
  const html=ssrModule.exports.render(src,isAvatar);
  assert.ok(html.includes('src="'+src+'"'), 'initial HTML includes the person image URL');
  assert.ok(html.includes('srcSet='), 'initial HTML includes responsive sources');
  assert.ok(!html.includes('rel="preload"'), 'CSS-hidden hero does not preload');
}
assert.ok(!ssrModule.exports.render(avatar,true,false).includes('src="'), 'list avatars still wait for measurement');
const withPhoto=ssrModule.exports.renderMedia(photo,avatar);
assert.ok(withPhoto.includes('src="'+photo+'"')&&!withPhoto.includes('src="'+avatar+'"'), 'portrait has priority over avatar');
assert.ok(ssrModule.exports.renderMedia(null,avatar).includes('src="'+avatar+'"'), 'missing portrait uses avatar in initial HTML');
const withoutImages=ssrModule.exports.renderMedia(null,null);
assert.ok(!withoutImages.includes('<img')&&withoutImages.includes('인'), 'missing images retain name initial');
console.log('PASS initial HTML for portrait and avatar without JavaScript');
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
    if (missing && (/\.display-\d+\.webp/.test(url) || /avatar-(?:sm|md)\.webp/.test(url) || path.startsWith('/api/myth-title/'))) {
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
  for (const [name,dpr,kind,src,width,height,expected] of [
    ['native portrait DPR 1',1,'portrait',photo,240,300,'display-480'],
    ['native portrait DPR 2',2,'portrait',photo,240,300,'display-768'],
    ['native avatar DPR 2',2,'avatar',avatar,176,176,'avatar-md'],
    ['native avatar DPR 3',3,'avatar',avatar,176,176,'avatar.webp'],
  ]) await scenario(name,dpr,async({requests,render,loaded})=>{
    await render({kind,src,width,height,native:true});await loaded(expected);assert.equal(requests.length,1);
  });
  await scenario('native CSS-hidden portrait avoids request until shown',2,async({page,requests,render,loaded})=>{
    await render({src:photo,native:true,hidden:true});await page.evaluate(()=>new Promise(r=>setTimeout(r,100)));
    assert.deepEqual(requests,[]);await page.$eval('#frame',e=>e.style.display='block');await loaded('display-768');
  });
  for (const [kind,src,expected] of [['portrait',photo,'photo.webp'],['avatar',avatar,'avatar.webp']]) {
    await scenario('native '+kind+' missing variant falls back once',2,async({requests,render,loaded})=>{
      await render({kind,src,native:true,width:176,height:176});await loaded(expected);assert.equal(requests.length,2);
      await render({kind,src:src.replace('person','other'),native:true,width:176,height:176});await loaded('/other/'+expected);assert.equal(requests.length,4);
    },true);
  }
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
