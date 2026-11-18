// apply-editorial-changes의 originalFile(편집기에서 연 원본 스냅숏)을 만든다. 글을 열어 읽기만 하고 저장하지 않는다.
// node scripts/naver-blog/capture-editorial-original.mjs --log=<글 번호> --out=<절대경로 JSON>
import fs from 'node:fs';
import path from 'node:path';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';

const arg=k=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
const logNo=arg('log'),out=arg('out');
if(!/^\d+$/.test(logNo??'')||!out||!path.isAbsolute(out))throw new Error('--log=<글 번호> --out=<절대경로 JSON>');
const active=JSON.parse(fs.readFileSync(path.join(ASSETS,'naver-blog','posts.json'),'utf8')).filter(p=>String(p.logNo)===logNo);
if(active.length!==1||!['ok','check'].includes(active[0].link))throw new Error('Active registry post required: '+logNo);
const {browser,launched}=await getBrowser({background:true}),page=await browser.newPage();
page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
try{
 await page.setViewport({width:1440,height:1000});
 const editor=createExistingEditor(page),opened=await editor.openTarget({...active[0],body:undefined});await closePublishPanel(page,editor);
 const snapshot=await readSnapshot(page),table=await page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/​/g,'').trim())));
 fs.writeFileSync(out,JSON.stringify({post:active[0],snapshot,table,original:{state:opened.state,reservation:opened.reservation}},null,1));
 console.log(JSON.stringify({stage:'captured',logNo,out,paragraphs:snapshot.flow?.length??0,tableRows:table.length}));
}finally{await page.close().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
