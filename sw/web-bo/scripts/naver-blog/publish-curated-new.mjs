// 블로그에 아직 글이 없는 기관 목록의 안내서를 새 예약 글로 저장한다(26.11.16 사용자 지시: 신규 해외 대학 목록).
// 원고는 기존 기관 글과 같은 compileCuratedGuide 결과(글 번호 0)를 쓰고, 입력·대조는 셀럽 새 글(publish-unified-new.mjs)과 같은 함수를 쓴다.
// node scripts/naver-blog/publish-curated-new.mjs --material=<절대경로 0-material.json> --post=<절대경로 new-post.json> [--apply]
// new-post.json: {title, url, category, tags[], slot:"YYYY-MM-DD HH:MM"}. 지정 칸이 차 있으면 다른 칸으로 가지 않고 멈춘다.
import fs from 'node:fs';import path from 'node:path';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {compileCuratedGuide} from './lib/curated-guide-article.mjs';
import {sameReservation} from './lib/same-reservation.mjs';
import {sameSavedPublishSettings} from './lib/preserve-native-tags.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {prepareImages,replaceTitle,clearBody} from './apply-institution-revisions.mjs';
import {populateUnifiedEditor,assertUnifiedSnapshot,assertTypography} from './apply-unified-article.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {selectCategory,addTags,enableSharing,setSchedule} from './publish-drafts.mjs';
import {savePreparedPreview} from './lib/unified-preview.mjs';
import {BODY_STYLE_VERSION} from './lib/formatted-text.mjs';
import {textsDigest,articleTexts} from './lib/body-baseline.mjs';

const args=process.argv.slice(2),arg=k=>args.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
const materialFile=arg('material'),postFile=arg('post');
if(!materialFile||!postFile||![materialFile,postFile].every(f=>path.isAbsolute(f))||args.some(a=>!/^--(material|post)=/.test(a)&&a!=='--apply'))throw Error('--material=<절대경로> --post=<절대경로> [--apply]');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2));
const writeAtomic=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const base=path.dirname(materialFile),checkpoint=path.join(base,'new-post-saved.json'),registry=path.join(ASSETS,'naver-blog/posts.json');
if(fs.existsSync(checkpoint))throw Error('A saved new-post transaction already exists. Verify it instead of publishing again.');
const material=read(materialFile),config=read(postFile);
const m=String(config.slot??'').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
if(!m||!config.title||!config.url||!config.category||!Array.isArray(config.tags)||config.tags.length<3||config.tags.some(t=>typeof t!=='string'||!t.trim()||/\s/.test(t)))throw Error('new-post.json needs title, url, category, compact tags and slot');
if(material.kind!=='curated'||String(material.logNo)!=='0'||material.title!==config.title||material.serviceUrl!==config.url)throw Error('Material must be the new (logNo 0) guide for this new-post.json');
const article=compileCuratedGuide(material);
const active=p=>!['deleted','private','replaced','skip'].includes(p.link);
const slotText=`${m[1]}. ${m[2]}. ${m[3]} ${m[4]}:${m[5]}`;
const guard=()=>{const posts=read(registry);if(posts.some(p=>p.kind==='curated'&&active(p)&&(p.url===config.url||p.title===config.title)))throw Error('This institution list already has a post in the registry');if(posts.some(p=>active(p)&&p.scheduledAt===slotText))throw Error('Registry slot is taken: '+slotText);};
guard();
const when=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
if(when.getTimezoneOffset()!==-540)throw Error('Run new-post writer with TZ=Asia/Seoul');
if(when<=new Date())throw Error('Slot must be in the future');
const dir=path.join(base,'new-native-'+Date.now());fs.mkdirSync(dir);write(path.join(base,'0-article.json'),article);
const post={logNo:'0',title:article.title,kind:'curated',url:config.url,link:'check'};
// 로고는 일반 첫 사진으로 준비한다. 옛 도우미의 로고 전용 분기를 타지 않게 하는 것으로, apply-unified-article.mjs와 같다.
const prepared=await prepareImages({post,revision:{target:new URL(config.url).pathname},plan:{images:article.operations.filter(o=>o.kind==='image').map(o=>({...o,role:o.role==='logo'?'portrait':o.role}))}},dir);savePreparedPreview(article,prepared.images,base);
const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let submitted=false,savedPost=null,step='blank-editor';
page.on('dialog',d=>d.type()==='beforeunload'?d.accept().catch(()=>{}):d.dismiss().catch(()=>{}));await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
const editor=createExistingEditor(page),table=()=>page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/​/g,'').trim())));
try{
 await editor.blankEditor();let occupied=[];
 if(await page.$('button[class*=reserve_btn]')){await editor.click('button[class*=reserve_btn]');const count=await page.$eval('button[class*=reserve_btn]',b=>Number(b.textContent.match(/(\d+)\s*건/)?.[1]));if(!Number.isInteger(count))throw Error('Actual reservation count missing');if(count){await page.waitForSelector('button[class*=article_button]');occupied=await page.$$eval('button[class*=article_button]',bs=>bs.map(b=>b.innerText.replace(/​/g,'').trim()));if(occupied.length!==count)throw Error('Complete actual reservation list required');}await editor.click('button[class*=close_button]');}
 if(occupied.some(row=>row.slice(0,row.lastIndexOf('\n')).trim()===article.title))throw Error('Exact title already exists in actual reservations');
 if(occupied.some(row=>row.slice(row.lastIndexOf('\n')+1).replace(/\s/g,'')===slotText.replace(/\s/g,'')))throw Error('Actual reservation slot is taken: '+slotText);
 await page.waitForSelector('.se-documentTitle .se-text-paragraph');await replaceTitle(page,'',article.title);await clearBody(page,article.title);
 step='native-input';await populateUnifiedEditor(page,article,prepared,dir);const ready=await readSnapshot(page);assertUnifiedSnapshot(article,ready,await table(),prepared.images);await assertTypography(page,article);
 await editor.click('button[class*=publish_btn]');if(!await selectCategory(page,config.category))throw Error('Exact category unavailable: '+config.category);await addTags(page,config.tags);await enableSharing(page);const scheduledAt=await setSchedule(page,when);await assertPublishOptions(page);const expected=await editor.settings();
 if(!expected.inputs.some(x=>x.value==='pre'&&x.checked))throw Error('New reservation mode differs');
 write(path.join(dir,'before-submit.json'),{articleHash:article.articleHash,scheduledAt,settings:expected,occupied});await closePublishPanel(page,editor);
 await page.$eval('.se-documentTitle',n=>n.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-top.png')});
 console.log(JSON.stringify({stage:'new-ready',url:config.url,dir,scheduledAt}));
 if(args.includes('--apply')){
  guard();await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:expected});if(JSON.stringify(await editor.settings())!==JSON.stringify(expected))throw Error('Publish panel changed before submit');
  step='submit';submitted=true;await editor.click('button[class*=confirm_btn]');await page.waitForFunction(()=>/logNo=\d+/.test(location.href)&&!location.pathname.includes('postwrite'),{timeout:30000});const id=new URL(page.url()).searchParams.get('logNo');if(!/^[1-9]\d+$/.test(id??''))throw Error('Actual saved post number unavailable');
  const finalMaterial={...material,logNo:id},finalArticle=compileCuratedGuide(finalMaterial);
  savedPost={...post,logNo:id,scheduledAt,category:config.category,date:new Date(Date.now()+9*3600000).toISOString().slice(0,10).replaceAll('-','. ')+'.'};
  write(checkpoint,{post:savedPost,dir,submittedAt:new Date().toISOString()});write(path.join(base,id+'-material.json'),finalMaterial);write(path.join(base,id+'-article.json'),finalArticle);savePreparedPreview(finalArticle,prepared.images,base);
  const posts=read(registry);if(posts.some(p=>String(p.logNo)===id))throw Error('New post number already recorded');posts.push(savedPost);writeAtomic(registry,posts);
  step='reopen';const opened=await editor.openTarget(savedPost);await assertPublishOptions(page,{preserve:expected});if(!sameSavedPublishSettings(opened.state,expected,finalArticle)||!sameReservation(opened.reservation,{row:article.title+'\n'+scheduledAt,count:occupied.length+1}))throw Error('Saved reservation/settings differ');await closePublishPanel(page,editor);const snapshot=await readSnapshot(page);assertUnifiedSnapshot(finalArticle,snapshot,await table(),prepared.images);await assertTypography(page,finalArticle);
  write(path.join(base,id+'-native-verified.json'),{logNo:id,articleHash:finalArticle.articleHash,saved:true,verified:true,snapshot,table:await table(),settings:opened.state,reservation:opened.reservation,publicResult:{status:'reserved-not-public'},dir,modelCalls:0});
  const current=read(registry),index=current.findIndex(p=>String(p.logNo)===id);if(index<0||current[index].title!==savedPost.title)throw Error('New registry identity changed');
  // 기존 기관 글 저장(apply-unified-article.mjs)과 같은 기록 형식이다.
  current[index]={...current[index],curatedGuide:{articleHash:finalArticle.articleHash,version:finalArticle.version,verifiedAt:new Date().toISOString(),reserved:true},bodyStyle:{version:BODY_STYLE_VERSION,verifiedAt:new Date().toISOString(),...textsDigest(articleTexts(finalArticle))}};writeAtomic(registry,current);
  console.log(JSON.stringify({stage:'new-saved-and-reopened',url:config.url,logNo:id,scheduledAt,modelCalls:0}));
 }
}catch(error){write(path.join(dir,'failure.json'),{step,submitted,saved:!!savedPost,savedPost,error:String(error)});await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;}
finally{await focus.detach().catch(()=>{});await page.close().catch(()=>{});await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
