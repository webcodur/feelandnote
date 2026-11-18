// 표지 설명란의 「YES24에서 찾기」(검색)를 서비스가 지금 확인한 상품 주소 「YES24에서 보기」로 바꾼다.
// node scripts/naver-blog/relink-yes24-captions.mjs --log=<글번호> --work=<임시 작업 절대경로> [--apply]
// 규칙: docs/continuous/blog-naver-book.md. 한 번에 한 글이다. 설명란 밖 글자·사진·링크·발행 설정·예약은 저장 전후와 재열기에서 대조한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
import {compileUnifiedArticle} from './lib/unified-article.mjs';
import {fragment} from './apply-unified-article.mjs';
import {EDITOR_SELECTOR} from './restyle-body.mjs';

export const SEARCH_TEXT='YES24에서 찾기',PRODUCT_TEXT='YES24에서 보기';
const LINKS='.se-component:not(.se-documentTitle) a[href], .se-component:not(.se-documentTitle) .se-link[data-href]';
const UUID=/^https:\/\/feelandnote\.com\/content\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[?#]|$)/i;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/** 문서 순서의 링크 [{componentId, caption, text, href}]에서 검색 설명란과 그 책의 「작품 상세」 작품 번호를 짝짓는다 */
export function captionTargets(anchors){
  const targets=[];
  anchors.forEach((a,index)=>{
    if(!a.caption||a.text!==SEARCH_TEXT)return;
    let contentId=null;
    for(const next of anchors.slice(index+1)){
      if(next.caption&&/^YES24에서/.test(next.text))break;
      const m=next.text==='작품 상세'&&next.href?.match(UUID);
      if(m){contentId=m[1].toLowerCase();break;}
    }
    if(!contentId)throw Error('설명란 뒤에 작품 상세 링크가 없다: '+a.componentId);
    if(targets.some(t=>t.componentId===a.componentId))throw Error('한 사진에 검색 링크가 둘이다: '+a.componentId);
    targets.push({componentId:a.componentId,index,searchHref:a.href,contentId});
  });
  return targets;
}

/** 저장 뒤 있어야 할 전체 상태 — 대상 설명란의 글자·주소만 바뀐다 */
export function relinkedSnapshot(before,anchors,changes){
  if(anchors.length!==before.links.length||anchors.some((a,i)=>a.text!==before.links[i].text||a.href!==before.links[i].href))throw Error('링크 목록 읽기가 서로 다르다');
  const byIndex=new Map(changes.map(c=>[c.index,c]));
  const links=before.links.map((l,i)=>byIndex.has(i)?{text:PRODUCT_TEXT,href:byIndex.get(i).productHref}:l);
  const ids=new Set(changes.map(c=>c.componentId));
  const images=before.images.map(img=>ids.has(img.id)?{...img,caption:[PRODUCT_TEXT]}:img);
  return {...before,links,images};
}

/** 서비스 구매 연결을 두 번까지 묻는다. 첫 응답은 낡은 캐시일 수 있다 */
export async function serviceProduct(contentId,{fetcher=fetch,wait=sleep}={}){
  let last=null;
  for(let attempt=0;attempt<2;attempt++){
    if(attempt)await wait(3000);
    const res=await fetcher(`https://feelandnote.com/api/books/purchase/${contentId}?locale=ko&seller=yes24`,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const location=res.headers.get('location');last=location;
    if(!location)continue;
    const url=new URL(location,'https://feelandnote.com');
    if(url.protocol==='https:'&&url.hostname==='www.yes24.com'&&/^\/product\/goods\/\d+$/i.test(url.pathname)&&!url.search&&!url.hash)return url.href;
  }
  return null;
}

function compareSnapshot(actual,expected,label){
  for(const key of ['title','text','links','flow','dividers'])if(!same(actual[key],expected[key]))throw Error(`${label}: 전체 글이 다르다 — ${key}`);
  const identity=i=>({id:i.id,componentKind:i.componentKind,src:i.src,width:i.width,height:i.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,caption:i.caption,representative:i.representative,align:i.align});
  if(!same(actual.images.map(identity),expected.images.map(identity)))throw Error(`${label}: 사진·설명란·대표사진이 다르다`);
}

async function main(){
  const args=process.argv.slice(2),log=args.find(a=>a.startsWith('--log='))?.slice(6),work=args.find(a=>a.startsWith('--work='))?.slice(7),apply=args.includes('--apply');
  if(!/^\d+$/.test(log??'')||!work||!path.isAbsolute(work)||args.some(a=>!/^--(log|work)=/.test(a)&&a!=='--apply'))throw Error('--log=<글번호> --work=<임시 작업 절대경로> [--apply]');
  const dir=path.join(work,log);fs.mkdirSync(dir,{recursive:true});
  const registry=path.join(ASSETS,'naver-blog','posts.json'),posts=JSON.parse(fs.readFileSync(registry,'utf8')),post=posts.find(p=>String(p.logNo)===log);
  if(!post||!['ok','check'].includes(post.link))throw Error('활성 글이 아니다: '+log);
  for(const f of [path.join(import.meta.dirname,'../../.env')])if(fs.existsSync(f))for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
  const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);

  const {browser,launched}=await getBrowser({background:true}),page=await browser.newPage();let step='open',saved=false;
  page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
  const anchors=()=>page.$$eval(LINKS,nodes=>nodes.map(a=>({componentId:a.closest('.se-component')?.id??null,caption:!!a.closest('.se-caption'),text:a.textContent.replace(/​/g,'').trim(),href:a.getAttribute('href')??a.getAttribute('data-href')})));
  const captionStyle=id=>page.evaluate(readParagraphPresentation,`.se-component[id="${id}"] .se-caption .se-text-paragraph`);
  const editorTexts=async()=>textsDigest((await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR)).map(p=>p.text));
  async function copiedSelection(){await page.evaluate(async()=>{try{await navigator.clipboard.writeText('');}catch{}});await sleep(250);await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await sleep(500);for(let i=0;i<10;i++){const v=await page.evaluate(async()=>(await navigator.clipboard.readText()).replace(/​/g,'').trim());if(v)return v;await sleep(200);}return '';}
  try{
    await page.setViewport({width:1440,height:1000});
    const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await focus.detach();
    await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
    const editor=createExistingEditor(page),opened=await editor.openTarget({...post,body:undefined});
    await assertPublishOptions(page,{preserve:opened.state});await closePublishPanel(page,editor);
    step='read';const before=await readSnapshot(page),beforeAnchors=await anchors(),beforeTexts=await editorTexts();
    const targets=captionTargets(beforeAnchors),changes=[],skipped=[];
    for(const t of targets){
      const ko=(await db.from('content_locales').select('content_id,isbn,title').eq('content_id',t.contentId).eq('locale','ko').maybeSingle()).data;
      const query=new URL(t.searchHref).searchParams.get('query')??'';
      if(/^97[89]\d{10}$/.test(query)&&query!==String(ko?.isbn??'').replace(/[-\s]/g,'')){skipped.push({...t,why:'블로그 검색 ISBN과 현재 저장 ISBN이 다르다 — 판본 확인 필요',storedIsbn:ko?.isbn??null});continue;}
      const productHref=await serviceProduct(t.contentId);
      if(!productHref){skipped.push({...t,why:'서비스가 두 번 모두 상품을 주지 않았다'});continue;}
      changes.push({...t,productHref,title:ko?.title??null,captionStyle:await captionStyle(t.componentId)});
    }
    const expected=relinkedSnapshot(before,beforeAnchors,changes);
    fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify({logNo:log,title:post.title,changes:changes.map(({captionStyle,...c})=>c),skipped,before,beforeTexts,settings:opened.state,reservation:opened.reservation},null,2));
    if(!changes.length){console.log(JSON.stringify({stage:'nothing-to-change',logNo:log,skipped:skipped.length}));return;}

    for(const c of changes){
      step='relink '+c.componentId;
      const image=await page.$eval(`.se-component[id="${c.componentId}"] img.se-image-resource`,img=>{img.scrollIntoView({block:'center',behavior:'instant'});const r=img.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
      await page.mouse.click(image.x,image.y);await sleep(300);
      // 설명란 글자의 첫 글자 왼쪽 바깥에서 끝 글자 오른쪽 바깥까지 끌어 고른다(세 번 클릭은 링크 설명란을 고르지 못한다)
      const caption=await page.$eval(`.se-component[id="${c.componentId}"] .se-caption .se-text-paragraph`,p=>{
        const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())if(walker.currentNode.textContent.replace(/​/g,'').trim()&&!walker.currentNode.parentElement.closest('.se-placeholder'))nodes.push(walker.currentNode);
        if(!nodes.length)throw Error('설명란 글자가 없다');
        const range=document.createRange();range.setStart(nodes[0],nodes[0].textContent.search(/[^​]/));const last=nodes.at(-1);range.setEnd(last,last.textContent.replace(/​+$/,'').length);
        const rects=[...range.getClientRects()];if(rects.length!==1||!rects[0].height)throw Error('설명란이 한 줄로 보이지 않는다');
        const r=rects[0];return{x1:r.left-1,x2:r.right+1,y:r.top+r.height/2};
      });
      await page.mouse.click(caption.x2,caption.y);await sleep(700);
      await page.mouse.move(caption.x1,caption.y);await page.mouse.down();await page.mouse.move(caption.x2,caption.y,{steps:8});await page.mouse.up();await sleep(300);
      const selected=await copiedSelection();
      if(selected!==SEARCH_TEXT)throw Error('설명란 선택이 다르다: '+JSON.stringify(selected));
      const html=fragment([{kind:'link',text:PRODUCT_TEXT,href:c.productHref,role:'label',align:'center',placement:'cover-caption',bold:true,gapBefore:false}]);
      await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
      await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');
      await page.waitForFunction(({id,text,href})=>{const p=document.querySelector(`.se-component[id="${id}"] .se-caption .se-text-paragraph`),a=p?.querySelector('a[href],.se-link[data-href]');return p?.textContent.replace(/​/g,'').trim()===text&&(a?.getAttribute('href')??a?.getAttribute('data-href'))===href;},{timeout:8000},{id:c.componentId,text:PRODUCT_TEXT,href:c.productHref});
      const style=await captionStyle(c.componentId);
      const strip=s=>s.map(({text,runs,...rest})=>({...rest,runs:runs.map(({text,...r})=>r)}));
      if(!same(strip(style),strip(c.captionStyle)))throw Error('설명란 서식이 달라졌다: '+JSON.stringify({before:c.captionStyle,after:style}));
    }
    await page.keyboard.press('Escape');
    step='verify-ready';const ready=await readSnapshot(page);compareSnapshot(ready,expected,'저장 전');
    const readyTexts=await editorTexts();
    for(const [i,c] of changes.entries()){await page.$eval(`.se-component[id="${c.componentId}"]`,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await sleep(300);await page.screenshot({path:path.join(dir,`ready-${i}.png`)});}
    if(!apply){console.log(JSON.stringify({stage:'dry-ready',logNo:log,changes:changes.length,skipped:skipped.length}));return;}

    step='save';await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});
    if(!same(await editor.settings(),opened.state))throw Error('저장 직전 발행 설정이 달라졌다');
    await editor.click('button[class*=confirm_btn]');
    await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},log);saved=true;
    step='reopen';const reopened=await editor.openTarget({...post,body:undefined});
    await assertPublishOptions(page,{preserve:opened.state});
    if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('저장 뒤 발행 설정·예약이 다르다');
    await closePublishPanel(page,editor);
    const after=await readSnapshot(page);compareSnapshot(after,expected,'재열기');
    const afterTexts=await editorTexts();if(!same(afterTexts,readyTexts))throw Error('재열기 본문 지문이 저장 전과 다르다');

    // 원장: 검증 지문과 현행 통합 원고를 새 링크에 맞춘다. 기존 기준이 지금 글과 맞았을 때만 옮긴다.
    step='registry';const ledger={};
    const current=JSON.parse(fs.readFileSync(registry,'utf8')),row=current.find(p=>String(p.logNo)===log);
    if(!same(row,post))throw Error('작업 중 원장 행이 바뀌었다');
    fs.copyFileSync(registry,path.join(dir,'posts.before.json'));
    if(row.bodyStyle?.textsSha256===beforeTexts.textsSha256){row.bodyStyle={...row.bodyStyle,verifiedAt:new Date().toISOString(),...afterTexts};ledger.bodyStyle='updated';}
    else ledger.bodyStyle=row.bodyStyle?'baseline-differed-before-edit':'none';
    for(const name of ['celeb-drafts.json','drafts.json']){
      const file=path.join(ASSETS,'naver-blog',name),drafts=JSON.parse(fs.readFileSync(file,'utf8')),draft=drafts.find(d=>String(d.logNo)===log&&d.format==='unified'&&d.unifiedMaterial);
      if(!draft)continue;
      const compiled=compileUnifiedArticle(draft.unifiedMaterial);
      if(compiled.articleHash!==draft.unifiedArticle?.articleHash||compiled.articleHash!==row.unified?.articleHash){ledger.unified='stored-article-not-current';break;}
      for(const c of changes){const book=draft.unifiedMaterial.books?.find(b=>b.content_id===c.contentId);if(!book||book.yes24?.kind!=='search')throw Error('원고 재료에서 같은 검색 표지를 찾지 못했다: '+c.contentId);book.yes24={url:c.productHref,kind:'product',resolver:'service-purchase',resolvedAt:new Date().toISOString()};}
      const next=compileUnifiedArticle(draft.unifiedMaterial);
      for(const c of changes)if(!next.operations.some(o=>o.placement==='cover-caption'&&o.text===PRODUCT_TEXT&&o.href===c.productHref))throw Error('다시 만든 원고에 새 표지 링크가 없다');
      fs.copyFileSync(file,path.join(dir,name.replace('.json','.before.json')));
      draft.unifiedArticle=next;row.unified={...row.unified,articleHash:next.articleHash,verifiedAt:new Date().toISOString()};
      fs.writeFileSync(file+'.tmp',JSON.stringify(drafts,null,2));fs.renameSync(file+'.tmp',file);ledger.unified='updated';
    }
    fs.writeFileSync(registry+'.tmp',JSON.stringify(current,null,2));fs.renameSync(registry+'.tmp',registry);
    fs.writeFileSync(path.join(dir,'applied.json'),JSON.stringify({verified:true,logNo:log,changes:changes.map(({captionStyle,...c})=>c),skipped,ledger,snapshot:after,settings:reopened.state,reservation:reopened.reservation},null,2));
    console.log(JSON.stringify({stage:'saved-and-reopened',logNo:log,changes:changes.length,skipped:skipped.length,ledger}));
  }catch(error){
    fs.writeFileSync(path.join(dir,'failure.json'),JSON.stringify({step,saved,error:String(error)},null,2));
    await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;
  }finally{
    await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});
    await page.close().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){await main();process.exit(0);}
