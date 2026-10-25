// Recover verification of a saved transaction. This script never rewrites a post.
import fs from 'node:fs';import path from 'node:path';
import {ASSETS} from '../blog-assets.mjs';import {getBrowser} from './lib/browser.mjs';import {createExistingEditor} from './lib/existing-editor.mjs';
import {compileUnifiedArticle} from './lib/unified-article.mjs';import {verifyUnifiedPublic} from './lib/unified-public.mjs';
import {assertUnifiedSnapshot,assertTypography} from './apply-unified-article.mjs';import {prepareImages} from './apply-institution-revisions.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';import {assertPublishOptions} from './lib/publish-options.mjs';import {editorialReservation} from './apply-editorial-changes.mjs';
const args=process.argv.slice(2),file=args.find(a=>a.startsWith('--article='))?.slice(10),dir=args.find(a=>a.startsWith('--transaction='))?.slice(14),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
if(!file||!dir||![file,dir].every(path.isAbsolute)||args.some(a=>!a.startsWith('--article=')&&!a.startsWith('--transaction=')))throw Error('--article=<absolute file> --transaction=<absolute directory>');
const article=read(file),material=read(path.join(path.dirname(file),article.logNo+'-material.json')),before=read(path.join(dir,'before.json')),failure=read(path.join(dir,'failure.json'));
if(!same(compileUnifiedArticle(material),article)||!failure.saved||String(before.post.logNo)!==article.logNo)throw Error('Exact saved transaction required');
const assetDir=path.join(dir,'verification-assets-'+Date.now());fs.mkdirSync(assetDir);const prepared=await prepareImages({post:before.post,plan:{images:article.operations.filter(o=>o.kind==='image').map(o=>({...o,role:o.role==='logo'?'portrait':o.role}))}},assetDir);
const {browser,launched}=await getBrowser({background:true}),page=await browser.newPage();page.on('dialog',d=>d.type()==='beforeunload'?d.accept():d.dismiss());
try{
 await page.setViewport({width:1440,height:1000});const editor=createExistingEditor(page),opened=await editor.openTarget({...before.post,title:article.title,body:undefined});await assertPublishOptions(page,{preserve:before.original.state});
 if(!same(opened.state,before.original.state)||!same(opened.reservation,editorialReservation(before.original.reservation,before.post.title,article.title)))throw Error('Saved settings or reservation differ');await closePublishPanel(page,editor);
 const snapshot=await readSnapshot(page),table=await page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
 const anchorTargets=await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph',(nodes,article)=>Object.fromEntries(article.operations.filter(o=>o.anchor).map(o=>{const ps=nodes.filter(p=>p.textContent.replace(/\u200b/g,'').trim()===o.text);if(ps.length!==1)throw Error('Unique saved anchor required');return['#'+o.anchor,'https://blog.naver.com/PostView.naver?blogId=dmx777&logNo='+article.logNo+'#'+ps[0].closest('.se-component').id];})),article);
 assertUnifiedSnapshot(article,snapshot,table,prepared.images,anchorTargets);await assertTypography(page,article);
 const publicResult=opened.reservation?{status:'reserved-not-public'}:await verifyUnifiedPublic(browser,article,{anchorTargets,nativeImages:snapshot.images,dir});
 const receipt={logNo:article.logNo,articleHash:article.articleHash,verified:true,saved:true,snapshot,table,settings:opened.state,reservation:opened.reservation,anchorTargets,publicResult,dir,modelCalls:0};
 const registry=path.join(ASSETS,'naver-blog/posts.json'),posts=read(registry),index=posts.findIndex(p=>String(p.logNo)===article.logNo);if(index<0||!same(posts[index],before.post))throw Error('Registry row changed since the saved transaction');posts[index]={...posts[index],title:article.title,unified:{articleHash:article.articleHash,version:article.version,verifiedAt:new Date().toISOString(),reserved:!!opened.reservation}};
 fs.writeFileSync(registry,JSON.stringify(posts,null,2));fs.writeFileSync(path.join(path.dirname(file),article.logNo+'-native-verified.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({stage:'saved-verification-recovered',logNo:article.logNo,publicVerified:!opened.reservation,modelCalls:0}));
}finally{await page.close();if(launched)await browser.close();else await browser.disconnect();}
