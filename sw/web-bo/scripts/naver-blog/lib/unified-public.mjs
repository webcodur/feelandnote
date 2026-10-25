import fs from 'node:fs';import path from 'node:path';
import {parsePublicHtml} from '../verify-revisions-public.mjs';
import {UNIFIED_ARTICLE,canonicalHttpHref} from './unified-article.mjs';
import {readParagraphPresentation,assertParagraphPresentation} from './unified-typography.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Naver's mobile stylesheet renders the same fs13/fs16/fs19 tokens at these sizes.
const NAVER_MOBILE_FONT=Object.freeze({13:15,16:17,19:20});
const imageKey=src=>new URL(src).pathname.split('/').slice(0,-1).join('/');
export function assertUnifiedPublic(article,snapshot,anchorTargets,nativeImages){
 let image=0;const expected=article.operations.filter(o=>o.placement!=='cover-caption').map(o=>['text','link'].includes(o.kind)?{kind:'text',text:o.text}:o.kind==='image'?{kind:'image',index:image++}:o.kind==='divider'?{kind:'divider'}:{kind:'table',rows:[o.columns,...o.rows]});
 if(snapshot.title!==article.title||snapshot.titleAlignment!=='center'||!same(snapshot.flow,expected))throw Error('Public whole article differs');
 const links=article.operations.filter(o=>o.kind==='link'&&o.placement!=='cover-caption').map(o=>canonicalHttpHref(o.href.startsWith('#')?anchorTargets[o.href]:o.href));
 if(!same(snapshot.links.map(canonicalHttpHref),links))throw Error('Public links differ');
 const align=article.operations.filter(o=>['text','link'].includes(o.kind)&&o.placement!=='cover-caption').map(o=>({text:o.text,align:o.align}));
 if(!same(snapshot.textAlignment.map(p=>({...p,align:p.align==='default'?'left':p.align})),align)||snapshot.dividerAlignment.some(a=>a!=='center'))throw Error('Public alignment differs');
 const images=article.operations.filter(o=>o.kind==='image');if(snapshot.images.length!==images.length)throw Error('Public image count differs');
 for(const [i,p]of snapshot.images.entries())if(p.align!=='center'||p.width!==images[i].width||imageKey(p.src)!==imageKey(nativeImages[i].src))throw Error('Public image identity or geometry differs');
 if(!snapshot.ogImage||imageKey(snapshot.ogImage)!==imageKey(snapshot.images[0].src))throw Error('Public representative image differs');
 const url=new URL(snapshot.ogUrl);if(!['blog.naver.com','m.blog.naver.com'].includes(url.hostname)||!(url.pathname==='/dmx777/'+article.logNo||url.searchParams.get('blogId')==='dmx777'&&url.searchParams.get('logNo')===article.logNo))throw Error('Public post identity differs');
}
async function bodyFrame(page){for(let i=0;i<30;i++){for(const frame of page.frames())if(await frame.$('.se-main-container'))return frame;await new Promise(r=>setTimeout(r,500));}throw Error('Rendered public article missing');}
export async function assertRenderedImages(frame,{expectedCount,timeoutMs=10000}){
 const selector='.se-main-container img.se-image-resource',count=await frame.$$eval(selector,nodes=>nodes.length),images=[];
 if(count!==expectedCount)throw Error('Rendered image count differs');
 for(let index=0;index<count;index++){
  await frame.$$eval(selector,(nodes,index)=>nodes[index].scrollIntoView({block:'center',behavior:'instant'}),index);
  try{await frame.waitForFunction(({selector,index})=>{const n=document.querySelectorAll(selector)[index],r=n?.getBoundingClientRect(),src=n?.currentSrc||n?.src;return n?.complete&&n.naturalWidth>0&&n.naturalHeight>0&&/^https?:/.test(src)&&!/\.svg(?:[?#]|$)|[?&]type=[^&]*blur/i.test(src)&&r.width>0&&r.height>0&&getComputedStyle(n).visibility==='visible'&&getComputedStyle(n).display!=='none';},{timeout:timeoutMs},{selector,index});}
  catch{throw Error('Public image failed to load: '+(index+1)+'/'+count);}
  images.push(await frame.$$eval(selector,(nodes,index)=>{const n=nodes[index];return{index,src:n.currentSrc||n.src,naturalWidth:n.naturalWidth,naturalHeight:n.naturalHeight,loaded:true};},index));
 }
 return images;
}
export async function verifyUnifiedPublic(browser,article,{anchorTargets,nativeImages,dir}){
 const results=[];
 for(const [device,width,height]of [['desktop',1280,900],['mobile',390,844]]){
  const page=await browser.newPage();try{
   await page.setViewport({width,height,isMobile:device==='mobile',hasTouch:device==='mobile'});if(device==='mobile')await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36');
   const url=device==='mobile'?'https://m.blog.naver.com/dmx777/'+article.logNo:'https://blog.naver.com/PostView.naver?blogId=dmx777&logNo='+article.logNo;let frame;
   for(let attempt=0;attempt<3;attempt++){await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});frame=await bodyFrame(page);try{assertUnifiedPublic(article,parsePublicHtml(await frame.content()),anchorTargets,nativeImages);break;}catch(error){if(attempt===2)throw error;await new Promise(r=>setTimeout(r,1500));}}
   let loadedImages;try{loadedImages=await assertRenderedImages(frame,{expectedCount:nativeImages.length});}catch(error){await page.screenshot({path:path.join(dir,'public-'+device+'-image-failure.png')});throw error;}
   await page.screenshot({path:path.join(dir,'public-'+device+'-last-image.png')});
   const captions=await frame.$$eval('.se-main-container .se-component.se-image',nodes=>nodes.map(n=>{const p=n.querySelector('.se-caption .se-text-paragraph'),a=p?.querySelector('a[href]');return{text:p?.textContent.replace(/\u200b/g,'').trim()||'',href:a?.href||null,gap:p?p.getBoundingClientRect().top-n.querySelector('img').getBoundingClientRect().bottom:null};}));
   const imageOps=article.operations.filter(o=>o.kind==='image');for(const [i,op]of imageOps.entries()){const next=article.operations[article.operations.indexOf(op)+1],wanted=next?.placement==='cover-caption'?next:null,actual=captions[i];if(actual?.text!==(wanted?.text||'')||actual?.href!==(wanted?.href||null)||wanted&&(!(actual.gap>=0)||actual.gap>14))throw Error('Public cover caption, purchase link or proximity differs');}
   const typography=await frame.evaluate(readParagraphPresentation,'.se-main-container .se-component.se-text .se-text-paragraph, .se-main-container .se-component.se-image .se-caption .se-text-paragraph');
   assertParagraphPresentation(article,typography,{captionFont:UNIFIED_ARTICLE.font.label,font:device==='mobile'?Object.fromEntries(Object.entries(UNIFIED_ARTICLE.font).map(([role,size])=>[role,NAVER_MOBILE_FONT[size]])):UNIFIED_ARTICLE.font});
   const rendered=await frame.evaluate(()=>{const main=document.querySelector('.se-main-container');return{fits:main.scrollWidth<=main.clientWidth+1,typography:true};});
   if(!rendered.fits)throw Error('Public rendering differs: '+JSON.stringify({device,...rendered}));
   await frame.$eval('.se-component.se-text .se-text-paragraph',p=>p.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:path.join(dir,'public-'+device+'-top.png')});
   await frame.$$eval('.se-text-paragraph',ps=>ps.find(p=>p.textContent.trim()==='목차')?.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'public-'+device+'-contents.png')});
   await frame.$$eval('.se-text-paragraph',ps=>ps.find(p=>p.textContent.trim()==='감상 배경')?.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'public-'+device+'-reading.png')});
   results.push({device,url,...rendered,images:loadedImages});
  }finally{await page.close();}
 }
 fs.writeFileSync(path.join(dir,'public-verified.json'),JSON.stringify(results,null,2));return results;
}
