// New posts use exactly the same compiled body, input and checks as existing posts.
// --material=<prepared JSON> [--apply] [--review]. No model calls.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {validateNewUnifiedMaterial,finalizeNewUnifiedMaterial} from './lib/new-unified-post.mjs';
import {buildReservationSlots} from './lib/reservation-slots.mjs';
import {sameReservation} from './lib/same-reservation.mjs';
import {sameSavedPublishSettings} from './lib/preserve-native-tags.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {prepareImages,replaceTitle,clearBody} from './apply-institution-revisions.mjs';
import {populateUnifiedEditor,assertUnifiedSnapshot,assertTypography} from './apply-unified-article.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {selectCategory,addTags,enableSharing,setSchedule} from './publish-drafts.mjs';
import {savePreparedPreview} from './lib/unified-preview.mjs';
const args=process.argv.slice(2),file=args.find(a=>a.startsWith('--material='))?.slice(11);
if(!file||!path.isAbsolute(file)||args.some(a=>!a.startsWith('--material=')&&!['--apply','--review'].includes(a)))throw Error('--material=<absolute JSON> [--apply] [--review]');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)),wait=ms=>new Promise(r=>setTimeout(r,ms));
const base=path.dirname(file),checkpoint=path.join(base,'new-post-saved.json'),registry=path.join(ASSETS,'naver-blog/posts.json'),draftFile=path.join(ASSETS,'naver-blog/celeb-drafts.json');
if(fs.existsSync(checkpoint))throw Error('A saved new-post transaction already exists. Verify it instead of publishing again.');
const material=read(file),article=validateNewUnifiedMaterial(material,{posts:read(registry),drafts:read(draftFile)}),config=material.newPost;
const dir=path.join(base,'new-native-'+Date.now());fs.mkdirSync(dir);write(path.join(base,'0-article.json'),article);
const post={logNo:'0',title:article.title,kind:'celeb',slug:config.slug,url:article.serviceUrl,link:'check'};
const prepared=await prepareImages({post,plan:{images:article.operations.filter(o=>o.kind==='image')}},dir);savePreparedPreview(article,prepared.images,base);
const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let submitted=false,savedPost=null,step='blank-editor';
page.on('dialog',d=>d.type()==='beforeunload'?d.accept().catch(()=>{}):d.dismiss().catch(()=>{}));await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
const editor=createExistingEditor(page),table=()=>page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
try{
 await editor.blankEditor();let occupied=[];
 if(await page.$('button[class*=reserve_btn]')){await editor.click('button[class*=reserve_btn]');const count=await page.$eval('button[class*=reserve_btn]',b=>Number(b.textContent.match(/(\d+)\s*건/)?.[1]));if(!Number.isInteger(count))throw Error('Actual reservation count missing');if(count){await page.waitForSelector('button[class*=article_button]');occupied=await page.$$eval('button[class*=article_button]',bs=>bs.map(b=>b.innerText.replace(/\u200b/g,'').trim()));if(occupied.length!==count)throw Error('Complete actual reservation list required');}await editor.click('button[class*=close_button]');}
 if(occupied.some(row=>row.slice(0,row.lastIndexOf('\n')).trim()===article.title))throw Error('Exact title already exists in actual reservations');
 const start=new Date(Date.now()+9*3600000).toISOString().slice(0,10),when=buildReservationSlots({count:1,start,time:'09:00',occupied:[...occupied,...read(registry).filter(p=>!['deleted','private','replaced','skip'].includes(p.link)).map(p=>p.scheduledAt??'') ]})[0];
 // Calendar helper uses local Date getters; this publisher's dates are always Korean.
 if(when.getTimezoneOffset()!==-540)throw Error('Run new-post writer with TZ=Asia/Seoul');
 await page.waitForSelector('.se-documentTitle .se-text-paragraph');await replaceTitle(page,'',article.title);await clearBody(page,article.title);
 step='native-input';await populateUnifiedEditor(page,article,prepared,dir);const ready=await readSnapshot(page);assertUnifiedSnapshot(article,ready,await table(),prepared.images);await assertTypography(page,article);
 await editor.click('button[class*=publish_btn]');if(!await selectCategory(page,config.category))throw Error('Exact category unavailable');await addTags(page,config.tags);await enableSharing(page);const scheduledAt=await setSchedule(page,when);await assertPublishOptions(page);const expected=await editor.settings();
 if(!expected.inputs.some(x=>x.value==='pre'&&x.checked))throw Error('New reservation mode differs');
 write(path.join(dir,'before-submit.json'),{articleHash:article.articleHash,scheduledAt,settings:expected,occupied});await closePublishPanel(page,editor);
 await page.$eval('.se-documentTitle',n=>n.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-top.png')});await page.$$eval('.se-text-paragraph',ps=>ps.find(p=>p.textContent.trim()==='감상 배경')?.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-reading.png')});
 const token=crypto.randomBytes(16).toString('hex');write(path.join(base,'new-native-ready.json'),{dir,token,articleHash:article.articleHash,scheduledAt,reviewRequired:args.includes('--review')});console.log(JSON.stringify({stage:'new-ready',slug:config.slug,dir,scheduledAt,reviewRequired:args.includes('--review')}));
 if(!args.includes('--apply'))process.exitCode=0;
 else{
  if(args.includes('--review')){const until=Date.now()+600000;while(!fs.existsSync(path.join(dir,'screen-reviewed'))&&Date.now()<until)await wait(500);if(!fs.existsSync(path.join(dir,'screen-reviewed'))||fs.readFileSync(path.join(dir,'screen-reviewed'),'utf8')!==token)throw Error('Native screen review missing');}
  validateNewUnifiedMaterial(material,{posts:read(registry),drafts:read(draftFile)});await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:expected});if(JSON.stringify(await editor.settings())!==JSON.stringify(expected))throw Error('Publish panel changed before submit');
  step='submit';submitted=true;await editor.click('button[class*=confirm_btn]');await page.waitForFunction(()=>/logNo=\d+/.test(location.href)&&!location.pathname.includes('postwrite'),{timeout:30000});const id=new URL(page.url()).searchParams.get('logNo');if(!/^[1-9]\d+$/.test(id??''))throw Error('Actual saved post number unavailable');
  const final=finalizeNewUnifiedMaterial(material,id);savedPost={...post,logNo:id,scheduledAt,date:new Date(Date.now()+9*3600000).toISOString().slice(0,10).replaceAll('-','. ')+'.'};
  write(checkpoint,{post:savedPost,dir,material:final.material,article:final.article,uploadLogNo:'0',submittedAt:new Date().toISOString()});write(path.join(dir,'before.json'),{post:savedPost,original:{state:expected,reservation:{row:article.title+'\n'+scheduledAt,count:occupied.length+1}}});write(path.join(base,id+'-material.json'),final.material);write(path.join(base,id+'-article.json'),final.article);savePreparedPreview(final.article,prepared.images,base);
  const posts=read(registry),drafts=read(draftFile);if(posts.some(p=>String(p.logNo)===id))throw Error('New post number already recorded');posts.push(savedPost);drafts.push({kind:'celeb',slug:config.slug,target:'/celeb/'+config.slug,title:article.title,category:config.category,tags:config.tags,status:'check',logNo:id,scheduledAt,format:'unified',unifiedMaterial:final.material,unifiedArticle:final.article,unifiedImages:prepared.images.map(({file,...image})=>image)});write(registry,posts);write(draftFile,drafts);
  step='reopen';const opened=await editor.openTarget(savedPost);await assertPublishOptions(page,{preserve:expected});if(!sameSavedPublishSettings(opened.state,expected,final.article)||!sameReservation(opened.reservation,{row:article.title+'\n'+scheduledAt,count:occupied.length+1}))throw Error('Saved reservation/settings differ');await closePublishPanel(page,editor);const snapshot=await readSnapshot(page);assertUnifiedSnapshot(final.article,snapshot,await table(),prepared.images);await assertTypography(page,final.article);
  const receipt={logNo:id,articleHash:final.article.articleHash,saved:true,verified:true,snapshot,table:await table(),settings:opened.state,reservation:opened.reservation,anchorTargets:{},publicResult:{status:'reserved-not-public'},dir,uploadLogNo:'0',modelCalls:0};write(path.join(base,id+'-native-verified.json'),receipt);
  const current=read(registry),index=current.findIndex(p=>String(p.logNo)===id);if(index<0||current[index].title!==savedPost.title)throw Error('New registry identity changed');current[index]={...current[index],unified:{articleHash:final.article.articleHash,version:final.article.version,verifiedAt:new Date().toISOString(),reserved:true}};write(registry,current);const currentDrafts=read(draftFile),d=currentDrafts.find(d=>String(d.logNo)===id);d.status='check';d.unifiedVerified=true;write(draftFile,currentDrafts);console.log(JSON.stringify({stage:'new-saved-and-reopened',slug:config.slug,logNo:id,scheduledAt,modelCalls:0}));
 }
}catch(error){write(path.join(dir,'failure.json'),{step,submitted,saved:!!savedPost,savedPost,uploadLogNo:'0',error:String(error)});await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;}
finally{await focus.detach().catch(()=>{});await page.close().catch(()=>{});await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
