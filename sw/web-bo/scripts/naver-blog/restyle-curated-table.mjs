// 기관 글 「전체 선정 목록」 표에 목록 표 서식(테두리·머리줄 배경·열 너비)을 입힌다. 칸 내용은 그대로 옮긴다.
// 표를 지우고 같은 칸의 서식 표를 붙인 뒤, 글·사진·링크·구분선·서식·예약·발행 설정이 그대로인지 저장 전후로 대조한다.
// --logs=<글번호,글번호> --work=<절대경로> [--apply]
import fs from 'node:fs';import path from 'node:path';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {replaceTableAfter} from './lib/replace-table.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {listTableHtml} from './lib/person-full-list.mjs';
import {openTarget,EDITOR_SELECTOR} from './restyle-body.mjs';

const REGISTRY='D:/feelandnote/blog-assets/naver-blog/posts.json',HEADING='전체 선정 목록';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),wait=ms=>new Promise(r=>setTimeout(r,ms));
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:/(^| )se-table( |$)/.test(f.kind)?[{kind:'table'}]:[{kind:f.kind}]);
const stable=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
const tableState=page=>page.$$eval('.se-component.se-table',ts=>ts.map(t=>{const cells=[...t.querySelectorAll('td,th')],first=cells[0];return{id:t.id,
 rows:[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())),
 styled:Boolean(first)&&getComputedStyle(first).backgroundColor==='rgb(238, 238, 238)'&&parseFloat(getComputedStyle(first).borderTopWidth)>0,
 afterHeading:[...(t.previousElementSibling?.querySelectorAll('.se-text-paragraph')??[])].map(p=>p.textContent.replace(/\u200b/g,'').trim()).filter(Boolean).at(-1)??null};}));

export async function restyleCuratedTable(browser,post,dir,{apply}){
 fs.mkdirSync(dir,{recursive:true});const page=await browser.newPage();let saved=false;
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 try{
  await page.setViewport({width:1440,height:1700});const editor=createExistingEditor(page),opened=await openTarget(page,post);await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),tables=await tableState(page);
  if(tables.length!==1||tables[0].afterHeading!==HEADING)throw Error('Exactly one table right after the selection-list heading required: '+JSON.stringify(tables.map(t=>t.afterHeading)));
  const [table]=tables;if(table.styled)return{changed:false,already:true};
  const [columns,...rows]=table.rows;if(!columns?.length||!rows.length||rows.some(r=>r.length!==columns.length))throw Error('Irregular selection table');
  write(path.join(dir,'before.json'),{post,opened,snapshot:before,style:beforeStyle,table});
  await replaceTableAfter(page,{tableId:table.id,previousText:HEADING,html:listTableHtml({kind:'table',columns,rows})});
  const check=async()=>{
   const current=await readSnapshot(page),style=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),now=await tableState(page);
   if(current.title!==before.title||!same(current.links,before.links)||current.dividers!==before.dividers||!same(flow(current),flow(before)))throw Error('Title, text order, links or dividers changed');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Photos changed');
   if(!same(stable(style),stable(beforeStyle)))throw Error('Typography outside the table changed');
   if(now.length!==1||!same(now[0].rows,table.rows)||!now[0].styled||now[0].afterHeading!==HEADING)throw Error('Restyled table differs: '+JSON.stringify({styled:now[0]?.styled,after:now[0]?.afterHeading}));
   return{current};
  };
  await check();await page.evaluate(()=>document.querySelector('.se-component.se-table').scrollIntoView({block:'start'}));await page.screenshot({path:path.join(dir,'editor-ready.png')});
  if(!apply)return{changed:false,dryRun:true,rows:rows.length};
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},post.logNo);saved=true;
  const reopened=await openTarget(page,post);await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');
  await closePublishPanel(page,editor);await check();write(path.join(dir,'saved.json'),{verified:true,rows:table.rows});
  return{changed:true,rows:rows.length,reserved:Boolean(reopened.reservation),table:table.rows};
 }catch(error){await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});error.saved=saved;throw error;}
 finally{await page.close().catch(()=>{});}
}

async function verifyPublic(browser,post,rows){
 const page=await browser.newPage();try{
  await page.setViewport({width:390,height:1100});await page.setCacheEnabled(false);
  for(let attempt=0;attempt<3;attempt++){
   await page.goto(`https://m.blog.naver.com/dmx777/${post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.se-main-container .se-table',{timeout:20000});
   const t=await page.$eval('.se-main-container .se-table',t=>{const c=t.querySelector('td');return{rows:[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())),border:parseFloat(getComputedStyle(c).borderTopWidth),bg:getComputedStyle(c).backgroundColor};});
   if(same(t.rows,rows)&&t.border>0&&t.bg==='rgb(238, 238, 238)')return'public';if(attempt<2){await wait(1500);continue;}throw Error('Published table differs: '+JSON.stringify({border:t.border,bg:t.bg}));
  }
 }finally{await page.close();}
}

export async function main(args=process.argv.slice(2)){
 const arg=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),logs=arg('logs'),work=arg('work'),apply=args.includes('--apply');
 if(!logs||!work||!path.isAbsolute(work)||args.some(a=>!/^--(logs|work)=/.test(a)&&a!=='--apply'))throw Error('--logs and an absolute --work are required');
 const posts=read(REGISTRY),wanted=logs.split(',').map(id=>{const p=posts.find(p=>p.logNo===id&&p.kind==='curated'&&['ok','check'].includes(p.link));if(!p)throw Error('Active institution post not found: '+id);return p;});
 fs.mkdirSync(work,{recursive:true});const stateFile=path.join(work,'state.json'),state=fs.existsSync(stateFile)?read(stateFile):{completed:[],deferred:[]};
 const done=new Set([...state.completed,...state.deferred].map(t=>t.logNo));
 const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
 await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 try{for(const post of wanted.filter(p=>!done.has(p.logNo))){
  if(fs.existsSync(path.join(work,'stop')))break;
  try{
   const r=await restyleCuratedTable(browser,post,path.join(work,post.logNo),{apply});
   const visibility=r.dryRun?'dry-run':r.already?'already':r.reserved?'reserved':await verifyPublic(browser,post,r.table);
   if(apply){if(r.changed){const all=read(REGISTRY),p=all.find(p=>p.logNo===post.logNo);p.curatedTable={verifiedAt:new Date().toISOString(),rows:r.rows};write(REGISTRY,all);}state.completed.push({logNo:post.logNo,title:post.title,changed:r.changed,visibility});}
   console.log(JSON.stringify({event:'completed',logNo:post.logNo,title:post.title,changed:r.changed,visibility,done:state.completed.length,total:wanted.length}));
  }catch(error){
   if(error.saved){state.failed={logNo:post.logNo,error:String(error)};write(stateFile,state);throw error;}
   if(apply)state.deferred.push({logNo:post.logNo,title:post.title,error:String(error).slice(0,300)});console.log(JSON.stringify({event:'deferred',logNo:post.logNo,error:String(error).slice(0,200)}));
  }
  write(stateFile,state);
 }}finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
 console.log(JSON.stringify({event:'finished',completed:state.completed.length,deferred:state.deferred.length,total:wanted.length}));
}
if(process.argv[1]?.endsWith('restyle-curated-table.mjs'))await main();
