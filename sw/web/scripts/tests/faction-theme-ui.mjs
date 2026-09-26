import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {resolve} from 'node:path';
const base=process.env.THEME_TEST_URL??'http://localhost:3000';
const browser=await puppeteer.launch({headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const out=resolve('../../.next-cache/faction-ui-review',`atlas-${Date.now()}`);
await mkdir(out,{recursive:true});console.log(out);
const center=level=>`[data-atlas-level="${level}"] > button:nth-child(2)`;
const options=level=>`[data-atlas-column="${level}"] button[aria-pressed]`;
async function open(path){await page.goto(`${base}${path}`,{waitUntil:'networkidle2',timeout:90000});await page.waitForSelector('[data-person-id]');await page.$eval('[data-faction-selection]',n=>scrollTo({top:scrollY+n.getBoundingClientRect().top-90,behavior:'instant'}));}
async function clickText(selector,text){const found=await page.evaluate((s,t)=>{const n=[...document.querySelectorAll(s)].find(n=>n.textContent.includes(t)&&n.getBoundingClientRect().height>0);if(n){n.click();return true;}return false;},selector,text);assert.ok(found,`find ${text}`);}
async function close(){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));}
async function apply(){await page.click('[data-atlas-apply]');await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));}
async function count(){return page.$$eval('[data-person-id]',ns=>ns.length);}
async function pickerChecks(name){
  const counts=await page.$$eval('[data-atlas-count]',ns=>ns.map(n=>Number(n.textContent)));
  await page.screenshot({path:`${out}/${name}.png`});
  for(const level of [0,1,2]){
    await page.click(center(level));await page.waitForSelector('[data-atlas-picker]');
    assert.deepEqual(await page.$$eval('[data-atlas-column]',ns=>ns.map(n=>Number(n.dataset.atlasColumn))),[level]);
    const available=await page.$$eval(options(level),ns=>ns.filter(n=>!n.disabled).length);
    assert.equal(counts[level],available-(level===2?1:0));
    assert.equal(await page.$('[data-atlas-apply]'),null);
    assert.ok(await page.$eval('[role="dialog"]',n=>n.scrollWidth<=n.clientWidth+1));
    await page.waitForFunction(()=>[...document.querySelectorAll('.animate-modal-content, .animate-modal-overlay')].every(n=>getComputedStyle(n).opacity==='1'));
    await page.screenshot({path:`${out}/${name}-level-${level}.png`});await close();
  }
  await page.click(center(1));await page.waitForSelector('[data-atlas-picker]');
  await page.click('[data-atlas-column="1"] button[aria-pressed="true"]');
  await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));
  await page.click('[data-atlas-picker-trigger]');await page.waitForSelector('[data-atlas-picker]');
  assert.equal(await page.$$eval('[data-atlas-column]',ns=>ns.length),3);
  assert.equal(await page.$eval('[data-atlas-apply]',n=>n.textContent),'선택 완료');await close();
  console.log('PASS level-only chips, scoped counts, direct selection and combined picker',name,counts);
}
async function artworkDissolveChecks(){
  for(let attempt=0;attempt<2;attempt++){
    await page.click('[data-artwork-zoom]');await page.waitForSelector('[data-artwork-dismiss] img');
    await page.waitForFunction(()=>document.querySelector('[data-artwork-dismiss] img')?.parentElement.className.includes('transition:opacity'));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-artwork-dismiss] img').parentElement).filter==='none');
    await page.click('[data-artwork-dismiss]');await page.waitForFunction(()=>!document.querySelector('[data-artwork-viewer]'));
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.click('[data-artwork-zoom]');await page.waitForSelector('[data-artwork-dismiss] img');
  assert.equal(await page.$eval('[data-artwork-dismiss] img',n=>getComputedStyle(n.parentElement).filter),'none');await close();
  await page.emulateMediaFeatures([]);
  console.log('PASS artwork dissolve on repeated opening and reduced motion');
}
async function groupChecks(){
  const all=await count();
  await page.click(center(2));await page.waitForSelector('[data-atlas-picker]');
  const choice=await page.$$eval(options(2),ns=>({name:ns[1].firstElementChild.textContent,count:Number(ns[1].lastElementChild.textContent)}));
  await clickText(options(2),choice.name);
  await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));
  await page.waitForFunction(n=>document.querySelectorAll('[data-person-id]').length===n,{},choice.count);
  assert.ok(new URL(page.url()).searchParams.get('group'));assert.equal(await page.$eval(center(2),n=>n.querySelector('[data-atlas-value]').textContent),choice.name);
  await page.click(center(2));await clickText(options(2),choice.name);await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));
  await page.waitForFunction(n=>document.querySelectorAll('[data-person-id]').length===n,{},all);
  assert.equal(new URL(page.url()).searchParams.has('group'),false);
  await page.click('[data-atlas-level="2"] > button:last-child');await page.waitForFunction(n=>document.querySelectorAll('[data-person-id]').length===n,{},choice.count);
  await page.click('[data-atlas-level="2"] > button:first-child');await page.waitForFunction(n=>document.querySelectorAll('[data-person-id]').length===n,{},all);
  console.log('PASS immediate group selection/dismissal, reselect clear, next/previous group',choice);
}
async function modals(person){
  for(const opener of ['[data-overview-trigger]','[data-artwork-zoom]']){
    await page.focus(opener);await page.keyboard.press('Enter');await page.waitForSelector('[role="dialog"]');
    if(opener.includes('zoom')){await page.waitForSelector('[data-artwork-dismiss]');await page.click('[data-artwork-dismiss]');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));}else await close();
    assert.ok(await page.$eval(opener,n=>document.activeElement===n));
  }
  const opener=`[data-person-id][aria-label="${person}"]`;
  await page.focus(opener);const y=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');await page.waitForSelector('[data-faction-person-body]');
  assert.ok(await page.evaluate(()=>{const body=document.querySelector('[data-faction-person-body]').getBoundingClientRect(),head=document.querySelector('[data-faction-person-header]').getBoundingClientRect();return Math.abs(body.width-head.width)<2;}));
  await page.$eval('[data-faction-person-header] img',n=>n.closest('button').click());
  await page.waitForFunction(()=>document.querySelector('[data-artwork-dismiss] img')?.naturalWidth>=800);
  assert.ok(await page.$eval('[data-artwork-dismiss] img',n=>!n.currentSrc.includes('avatar-md')&&!n.currentSrc.includes('avatar-sm')));
  await page.click('[data-artwork-dismiss]');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
  await clickText('[data-faction-person-header] button','상세 이미지');await page.waitForSelector('[data-artwork-dismiss]');
  assert.equal(await page.$$eval('[role="dialog"]',ns=>ns.length),2);await page.click('[data-artwork-dismiss]');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-faction-person-header] button')].some(n=>n.textContent.includes('가상독백')));
  await clickText('[data-faction-person-header] button','가상독백');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');await close();
  assert.ok(await page.$eval(opener,n=>document.activeElement===n));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2);
  console.log('PASS overview/image separation, nested modal, focus and scroll',person);
}
async function referenceBooks(){
  const items=selector=>page.$eval(selector,n=>({works:[...n.querySelectorAll('button[aria-pressed][aria-label]')].map(n=>n.getAttribute('aria-label')),links:[...new Set([...n.querySelectorAll('a[href*="/content/"]')].map(n=>n.getAttribute('href')))]}));
  await page.click('[data-person-id="b0db9a29-e4f0-4517-871b-621e7843a27f"]');await page.waitForSelector('[data-person-books][data-books-ready=true]');
  const href=await page.$eval('[data-faction-person-header] a',n=>n.getAttribute('href'));
  const modes=await page.$$eval('[data-book-mode]',ns=>ns.map(n=>n.dataset.bookMode));assert.deepEqual(modes,['appeared','read','authored']);
  const modalBooks={};for(const key of modes){await page.click(`[data-book-mode="${key}"]`);modalBooks[key]=await items('[data-person-books] [role=tabpanel]');}
  await page.$eval('[data-person-books] button[aria-haspopup=dialog]',n=>n.click());await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');await close();
  await page.goto(`${base}${href}`,{waitUntil:'networkidle2',timeout:90000});await page.waitForSelector('#affiliate-books [role=tab]');
  const pageModes=await page.$$eval('#affiliate-books [role=tab]',ns=>ns.map(n=>n.id.replace('archive-tab-','')));assert.deepEqual(pageModes.filter(n=>modes.includes(n)),modes);
  for(const key of modes){await page.click(`#archive-tab-${key}`);await page.waitForSelector(`#archive-panel-${key}`);assert.deepEqual(await items(`#archive-panel-${key}`),modalBooks[key]);}
  console.log('PASS appeared/read/authored match profile, purchase dialog preserves person');
  await open('/explore/faction/ai-pioneers');
}
try{
  await page.setViewport({width:1920,height:911});await open('/explore/myth?myth=house-of-atreus');await pickerChecks('myth-desktop');await groupChecks();await modals('탄탈로스');await artworkDissolveChecks();
  await page.click(center(0));await clickText(options(0),'한국');await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));
  assert.equal(await page.$eval('[data-atlas-level="0"] [data-atlas-value]',n=>n.textContent),'한국');
  await open('/explore/myth?myth=house-of-atreus');
  const original=await count();await page.click('[data-atlas-picker-trigger]');await clickText(options(0),'한국');
  assert.equal(await page.$eval('[data-atlas-column="0"] button[aria-pressed="true"]',n=>n.firstElementChild.textContent),'한국');
  assert.ok(!(await page.$$eval(options(1),ns=>ns.map(n=>n.textContent))).some(n=>n.includes('아트레우스')));await close();assert.equal(await count(),original);
  await page.setViewport({width:1440,height:1000});await open('/explore/faction/ai-pioneers');
  assert.equal(await page.$('[data-celeb-reality="REAL"]'),null);await pickerChecks('faction-desktop');await groupChecks();await modals('앨런 튜링');
  await referenceBooks();
  await page.click('[data-atlas-picker-trigger]');await clickText(options(0),'산업');
  assert.ok(!(await page.$$eval(options(1),ns=>ns.map(n=>n.textContent))).some(n=>n.includes('OpenAI')));
  await clickText(options(0),'AI');await clickText(options(1),'OpenAI');
  const target=await page.$$eval(options(2),ns=>({name:ns[1].firstElementChild.textContent,count:Number(ns[1].lastElementChild.textContent)}));
  await clickText(options(2),target.name);await page.waitForFunction(()=>!document.querySelector('[data-atlas-picker]'));await page.waitForFunction(()=>location.pathname.endsWith('/openai'));
  await page.waitForFunction(t=>document.querySelector('[data-atlas-level="2"] [data-atlas-value]')?.textContent===t,{},target.name);
  assert.equal(await count(),target.count);await page.reload({waitUntil:'networkidle2'});assert.equal(await count(),target.count);
  console.log('PASS faction hierarchy, cross-route group and reload');
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await open('/explore/myth?myth=house-of-atreus');await pickerChecks('myth-mobile');await groupChecks();await modals('탄탈로스');
  await page.click('[data-atlas-picker-trigger]');await clickText(options(0),'그리스·로마');
  assert.equal(await page.$eval('[data-atlas-column="1"] h3 button',n=>n.getAttribute('aria-expanded')),'true');
  await clickText(options(1),'일리아스');assert.equal(await page.$eval('[data-atlas-column="2"] h3 button',n=>n.getAttribute('aria-expanded')),'true');
  await page.waitForFunction(()=>[...document.querySelectorAll('.animate-modal-content, .animate-modal-overlay')].every(n=>getComputedStyle(n).opacity==='1'));
  await page.screenshot({path:`${out}/mobile-cascade.png`});await apply();await page.waitForFunction(()=>new URL(location.href).searchParams.get('myth')==='homer-iliad');
  console.log('PASS mobile hierarchical expansion');
  for(const [name,path,width,height] of [
    ['english-mobile','/en/explore/myth?myth=house-of-atreus',390,844],
    ['english-tablet','/en/explore/faction/ai-pioneers',820,900],
    ['narrow-mobile','/explore/myth?myth=house-of-atreus',320,740],
  ]){
    await page.setViewport({width,height});await open(path);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name);
    assert.equal(await page.$$eval('[data-atlas-level]',ns=>ns.length),3);
    await page.click('[data-atlas-picker-trigger]');await page.waitForSelector('[data-atlas-picker]');
    assert.ok(await page.$eval('[role="dialog"]',n=>n.scrollWidth<=n.clientWidth+1));
    await page.waitForFunction(()=>[...document.querySelectorAll('.animate-modal-content, .animate-modal-overlay')].every(n=>getComputedStyle(n).opacity==='1'));
    await page.screenshot({path:`${out}/${name}-picker.png`});await close();
    await page.screenshot({path:`${out}/${name}.png`});
  }
  await page.setCacheEnabled(false);await page.setRequestInterception(true);
  page.on('request',request=>request.url().includes('/images/factions/themes/ai-pioneers-')?request.abort():request.continue());
  for(const width of [1440,390]){
    await page.setViewport({width,height:900});await open('/explore/faction/ai-pioneers');
    await page.waitForFunction(()=>document.querySelector('[data-artwork]')?.dataset.artwork==='absent');
    assert.equal(await page.$('[data-artwork-zoom]'),null);
    await page.click('[data-overview-trigger]');await page.waitForSelector('[role="dialog"]');await close();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);console.log('PASS responsive/English/broken-image checks; no page errors');
}finally{await browser.close();}
