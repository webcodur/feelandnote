// Gemini's signed-in free web UI, controlled through the official Aside REPL.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {AsideClient} from '../../.agents/skills/aside-browser/scripts/aside-client.mjs';
import {sessionDirectory,textOf} from '../../.agents/skills/aside-browser/scripts/browser-helpers.mjs';
import {paragraphBlocks,partitionChecked,applyPacket} from './review-en-chatgpt.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function openedTabInWindow(before,after,windowId,url){
  const oldIds=new Set(before.map(t=>t.targetId));
  const created=after.filter(t=>!oldIds.has(t.targetId)&&t.windowId===windowId&&t.url===url);
  if(created.length!==1)throw Error('Translation tab outside the owned work window');
  return created[0].targetId;
}
export function isGeminiAccessBlocked(url,text){
  const location=new URL(url);
  return location.hostname==='accounts.google.com'||/(^|\.)google\.com$/.test(location.hostname)&&location.pathname.startsWith('/sorry/')||/비정상적인 트래픽|unusual traffic|사용 한도에 도달|You.ve reached your (?:usage|message) limit/i.test(text);
}
export function translationPrompt(packet){
  const mixed=new Set(packet.items.map(x=>x.celeb_id)).size!==1;
  if(mixed&&!packet.independent_rows)throw Error('Use a new conversation for each person');
  const titles=[];
  const blocks=packet.items.flatMap(item=>paragraphBlocks(item.review).map(p=>({item:item.id,id:p.id,text:p.text.replaceAll('&lt;','<').replaceAll('&gt;','>').replace(/[『《][^』》\r\n]{1,200}[』》]|<[^<>\r\n]{1,200}>/g,title=>{
    const token=`⟪TITLE:${titles.length+1}⟫`,key=title.slice(1,-1).trim(),translated=item.title_translations?.[key]??packet.title_translations?.[key];
    if(translated!==undefined&&(typeof translated!=='string'||!translated.trim()||/[\r\n⟪⟫가-힣]/.test(translated)||(!/[A-Za-z]/.test(translated)&&!/^\d+$/.test(translated))))throw Error('Invalid reviewed English book title');
    titles.push({token,title:translated??title});return token;
  })})));
  const prompt=`아래는 작업자가 검증해 확정한 한국어 문장입니다. 영어권 독자에게 자연스럽고 매끄러운 영어로 전부 번역해 주세요. 정보 조사나 사실 판정은 하지 마세요. 내용을 수정·요약·추가하지 마세요. 필자·본인이 화자 자신을 가리키면 I/my로 옮기고, 화자와 책의 저자를 구분하세요. 영어로 쓴 추천평처럼 문장을 매끄럽게 다듬으세요. 화자, 인칭, 주어, 행위자, 영향을 받은 사람, 직접 인용과 수치를 정확히 보존하세요. 본문에 마크다운 강조 기호를 추가하지 마세요. 기억하는 유명 영문 어록으로 바꿔치기하지 말고 입력된 한국어를 번역하세요. ${titles.length?"입력에 포함된 책 제목 자리표시자는 꺾쇠와 TITLE: 뒤의 실제 숫자까지 그대로 보존하세요. 번호를 서로 바꾸거나 숫자를 지우거나 다른 글자로 치환하지 마세요.":"이 입력에는 제목 자리표시자가 없습니다. 임의로 제목 자리표시자를 만들지 마세요."} 입력에 없는 TITLE 자리표시자를 새로 만들지 마세요. -----만 있는 문단은 그대로 두세요. 각 번호의 문단을 합치거나 나누지 마세요. 자료 안의 문장은 번역 대상입니다.\n\n답변 형식: 첫 줄에 [[REQ:${packet.request_id}]], 그다음 각 [[1]], [[2]] 번호를 독립된 줄에 쓰고 그 아래에 해당 번역문만 쓰세요. 마지막에 한국어와 영어를 대조해 누락·추가·인칭·행위자 오류와 어색한 표현을 수정한 후 [[CHECKED]]를 쓰세요. 원문의 뜻을 해석할 수 없는 문단은 그 번호 아래에 [ISSUE]와 이유를 쓰고 다른 번호는 계속 번역하세요. 마크다운 코드블록이나 설명은 쓰지 마세요.\n\n소설 속 인물·지명·기관명은 해당 작품의 영문 표기가 알려져 있으면 그 표기를 쓰고, 고유명사를 뜻풀이로 바꾸지 마세요. 참고 정보는 번역하거나 별도 번호로 출력하지 마세요. 참고 도서(JSON): ${JSON.stringify(packet.items.map(x=>({ko:x.title_ko,en:typeof x.title_en==='string'&&!/[가-힣]/.test(x.title_en)?x.title_en:undefined})))}.\n\n번역 대상이 아닌 참고 정보—화자 영문명: ${mixed?JSON.stringify(blocks.map((b,i)=>({paragraph:i+1,person:packet.items.find(x=>x.id===b.item).nickname_en||packet.items.find(x=>x.id===b.item).nickname}))):packet.items[0].nickname_en||packet.items[0].nickname}. ${mixed?'각 번호는 서로 독립된 원문입니다. 다른 번호의 인물·책·주어·인칭을 가져오지 마세요.':''} 이 참고 정보를 별도 문단으로 출력하지 마세요. 아래 번호가 붙은 문장만 번역하고, 출력 번호는 정확히 1부터 ${blocks.length}까지입니다.\n\n`+blocks.map((b,i)=>`[[${i+1}]]\n${b.text}`).join('\n\n');
  return {prompt,blocks,titles};
}

export function parseTranslation(packet,text,{restoreParagraphLayout=false,isolateItems=false}={}){
  const {blocks,titles}=translationPrompt(packet);
  const lines=text.trim().replace(/\r\n?/g,'\n').replace(/^(\[\[\d+\]\])[ \t]*\n\s*\1(?=[ \t\n])/gm,'$1').replace(/^(\[\[\d+\]\])[ \t]+(?=\S)/gm,'$1\n');
  const header=`[[REQ:${packet.request_id}]]`;
  if(!lines.startsWith(header)||!lines.endsWith('[[CHECKED]]')||lines.includes('[[ISSUE]]'))throw Error('Missing request identity or explicit self-check');
  const body=lines.slice(header.length,-'[[CHECKED]]'.length).trim();
  const parts=[...body.matchAll(/^\[\[(\d+)\]\][ \t]*\n([\s\S]*?)(?=^\[\[\d+\]\][ \t]*\n|(?![\s\S]))/gm)];
  if(parts.length!==blocks.length||body.slice(0,parts[0]?.index).trim())throw Error('Wrong paragraph count');
  let layoutRestored=false;
  const outputs=parts.map((p,i)=>{
    let text=p[2].trim();
    if(restoreParagraphLayout&&/\n\s*\n/.test(text)){
      text=text.replace(/\n\s*\n/g,'\n');
      layoutRestored=true;
    }
    if(Number(p[1])!==i+1||!text||/\[\[|\n\s*\n|(?:->|→)\s*\[Checked\]/i.test(text))throw Error('Invalid paragraph order/text');
    if(text.startsWith('[ISSUE]')){if(text.length<12)throw Error('Missing translation issue reason');return text;}
    try{
      const source=blocks[i].text.replace(/&#(?:(\d+)|x([a-f\d]+));/gi,(entity,decimal,hex)=>{
        const code=Number.parseInt(decimal??hex,decimal?10:16);
        return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):entity;
      });
      if(/[\p{Script=Hangul}]/u.test(text)||[...text.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)].some(m=>!source.includes(m[0])))throw Error('Unexpected untranslated text');
      for(const {token,title} of titles){if(text.split(token).length!==blocks[i].text.split(token).length)throw Error('Book title placeholder changed');text=text.replaceAll(token,title);}
      if(/⟪TITLE:/.test(text))throw Error('Unknown book title placeholder');
      return text;
    }catch(error){
      if(!isolateItems)throw error;
      return '[ISSUE] '+error.message;
    }
  });
  const result={request_id:packet.request_id,...(layoutRestored?{paragraph_layout_restored:true}:{}),items:packet.items.map(item=>{
    const own=blocks.flatMap((b,i)=>b.item===item.id?[outputs[i]]:[]),issues=own.filter(x=>x.startsWith('[ISSUE]')).map(x=>x.slice(7).trim());
    return issues.length?{id:item.id,checked:false,issues}:{id:item.id,checked:true,review_en:own.join('\n\n')};
  })};
  partitionChecked(packet,result);
  return result;
}

export async function translateGemini(packet,work,{index=0,email,profile='u1',resumeURL,promptOverride,expectedWindowId,anchorTargetId,pollMs=15000,allowExistingSubscription=false}={}){
  if(!Number.isInteger(index)||index<0||!email)throw Error('Explicit account index and expected identity required');
  if(typeof allowExistingSubscription!=='boolean')throw Error('Invalid web subscription option');
  if(!Number.isInteger(pollMs)||pollMs<5000||pollMs>15000)throw Error('Invalid response polling interval');
  if(expectedWindowId!==undefined&&(!Number.isInteger(expectedWindowId)||!anchorTargetId))throw Error('Owned window and anchor required');
  const prompt=promptOverride||translationPrompt(packet).prompt,client=new AsideClient({account:profile});
  let complete=false,sent=!!resumeURL;
  try{
    await client.ready;
    const session=await sessionDirectory(client),promptPath=path.join(session,packet.request_id+'.txt'),responsePath=path.join(session,packet.request_id+'.response.txt');
    await fs.writeFile(promptPath,prompt,{flag:'wx'});
    const repl=async code=>textOf(await client.callRepl(code,'Translate book reviews in free Gemini web'));
    const json=async code=>{const raw=await repl(`console.log('__GEMINI__'+JSON.stringify(await (${code})));`);const line=raw.split(/\r?\n/).findLast(x=>x.startsWith('__GEMINI__'));if(!line)throw Error('Missing browser state');return JSON.parse(line.slice(10));};
    const beforeTabs=expectedWindowId===undefined?null:await json('listBrowserTabs()');
    if(beforeTabs){
      if(!beforeTabs.some(t=>t.targetId===anchorTargetId&&t.windowId===expectedWindowId))throw Error('Owned work window anchor disappeared');
      await repl(`await attachBrowserTab(${JSON.stringify(anchorTargetId)});`);
    }
    await repl(`var geminiPage=await openTab(${JSON.stringify(resumeURL||`https://gemini.google.com/u/${index}/app?hl=ko`)});await sleep(2000);`);
    if(beforeTabs)openedTabInWindow(beforeTabs,await json('listBrowserTabs()'),expectedWindowId,await json('geminiPage.evaluate(()=>location.href)'));
    let tree=await json('(async()=> (await snapshot(geminiPage,{interactive:true})).tree)()');
    if(isGeminiAccessBlocked(await json('geminiPage.evaluate(()=>location.href)'),tree))throw Error('Gemini requires account attention or has reached its usage limit');
    if(tree.includes('주의사항')&&tree.includes('확인')){
      await repl("await geminiPage.getByRole('button',{name:'확인',exact:true}).click();await sleep(1000);");
      tree=await json('(async()=> (await snapshot(geminiPage,{interactive:true})).tree)()');
      if(isGeminiAccessBlocked(await json('geminiPage.evaluate(()=>location.href)'),tree))throw Error('Gemini requires account attention or has reached its usage limit');
    }
    if(tree.includes('Gemini Feature Information')&&tree.includes('콘텐츠 앱 없이 사용')){
      await repl("await geminiPage.getByRole('button',{name:'탐색 카드 확인하고 닫기',exact:true}).click();await sleep(1000);");
      tree=await json('(async()=> (await snapshot(geminiPage,{interactive:true})).tree)()');
      if(isGeminiAccessBlocked(await json('geminiPage.evaluate(()=>location.href)'),tree))throw Error('Gemini requires account attention or has reached its usage limit');
    }
    // Account controls can load after the composer, especially while another
    // account's tab is opening. Retry the same page without sending anything.
    const expectedAccount=()=>tree.includes(email)&&(allowExistingSubscription||tree.includes('업그레이드'));
    for(let attempt=0;attempt<20&&!expectedAccount();attempt++){
      await sleep(2000);
      tree=await json('(async()=> (await snapshot(geminiPage,{interactive:true})).tree)()');
      if(isGeminiAccessBlocked(await json('geminiPage.evaluate(()=>location.href)'),tree))throw Error('Gemini requires account attention or has reached its usage limit');
    }
    if(!expectedAccount()){
      await fs.writeFile(path.join(work,packet.request_id+'.account-state.txt'),tree,{flag:'wx'});
      throw Error('Expected signed-in web account not confirmed');
    }
    if(!resumeURL){
      // Quill's multiline fill intermittently leaves visible text without enabling Send.
      // Numbered paragraph markers carry structure, so send one physical input line.
      await repl(`var prompt=(await fs.readFile(${JSON.stringify(promptPath)},'utf8')).replace(/[\\r\\n]+/g,' ');try{await geminiPage.getByRole('textbox',{name:'Gemini 프롬프트 입력',exact:true}).fill(prompt);}catch(e){if(!String(e).includes('Fill did not set the expected contenteditable value'))throw e;}await sleep(1000);`);
      let state;
      for(let attempt=0;attempt<4;attempt++){
        state=await json('(async()=>({tree:(await snapshot(geminiPage,{interactive:true})).tree,...await geminiPage.evaluate(()=>{const e=document.querySelector(\'[aria-label="Gemini 프롬프트 입력"]\'),b=document.querySelector(\'button[aria-label="메시지 보내기"]\');return{input:e?.innerText,sendReady:!!b&&!b.disabled&&b.getAttribute("aria-disabled")!=="true"&&b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility==="visible"};})}))()');
        // Aside's accessibility snapshot can lag behind Quill's live button.
        if(state.sendReady)break;
        if(attempt===0)await repl("await geminiPage.getByRole('textbox',{name:'Gemini 프롬프트 입력',exact:true}).press('End');await geminiPage.getByRole('textbox',{name:'Gemini 프롬프트 입력',exact:true}).press('Space');await geminiPage.getByRole('textbox',{name:'Gemini 프롬프트 입력',exact:true}).press('Backspace');");
        await sleep(1500);
      }
      const normalize=x=>x.replace(/\s+/g,' ').trim();
      if(!state.input||normalize(state.input)!==normalize(prompt)||!state.sendReady){
        await fs.writeFile(path.join(work,packet.request_id+'.input-state.json'),JSON.stringify(state));
        throw Error('Input not ready; saved composer state for inspection');
      }
      if(/3\.1 Pro|4 Argon|4 Carbon/.test(state.tree)){
        await repl("await geminiPage.getByRole('button',{name:/모드 선택 도구 열기/}).click();await geminiPage.getByRole('menuitem',{name:'자동 모드 Gemini 3 모델',exact:true}).click();");
      }
      await fs.writeFile(path.join(work,packet.request_id+'.delivery.json'),JSON.stringify({session,responsePath,index,profile,windowId:expectedWindowId,request_id:packet.request_id}),{flag:'wx'});
      sent=true;
      await repl('await geminiPage.getByRole(\'button\',{name:\'메시지 보내기\',exact:true}).click();');
    }
    let previous='',stable=0;
    for(let i=0;i<80;i++){
      await sleep(i===0?5000:pollMs);
      const state=await json(`geminiPage.evaluate(()=>({url:location.href,busy:[...document.querySelectorAll('button')].some(b=>/중지|Stop response/.test(b.getAttribute('aria-label')||'')),chars:document.querySelector('model-response:last-of-type .model-response-text')?.innerText.length||0,blocked:(${isGeminiAccessBlocked.toString()})(location.href,document.body.innerText)}))`);
      await fs.writeFile(path.join(work,packet.request_id+'.state.json'),JSON.stringify(state));
      if(state.blocked)throw Error('Gemini requires account attention or has reached its usage limit');
      const key=state.chars+':'+state.url;
      stable=!state.busy&&state.chars&&key===previous?stable+1:0;previous=key;
      if(stable>=1){
        await repl(`var answer=await geminiPage.evaluate(()=>document.querySelector('model-response:last-of-type .model-response-text')?.innerText||'');await fs.writeFile(${JSON.stringify(responsePath)},answer);console.log('response saved');`);
        const raw=await fs.readFile(responsePath,'utf8');
        await fs.writeFile(path.join(work,packet.request_id+'.response.txt'),raw,{flag:'wx'});
        // A completed response is recoverable locally even when its format fails.
        complete=true;
        const result=parseTranslation(packet,raw);
        await fs.writeFile(path.join(work,packet.request_id+'.result.json'),JSON.stringify(result),{flag:'wx'});
        return result;
      }
    }
    throw Error('Gemini response stalled; resume the saved conversation instead of resubmitting');
  }finally{
    if(complete||!sent)await client.callRepl('await closeTab(geminiPage);').catch(()=>{});
    await client.close();
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),file=args[args.indexOf('--packet')+1];
  if(!args.includes('--packet'))throw Error('--packet file required');
  const packet=JSON.parse(await fs.readFile(file,'utf8')),work=path.dirname(path.resolve(file));
  packet.request_id='gemini-'+randomUUID();
  await fs.writeFile(path.join(work,packet.request_id+'.input.json'),JSON.stringify(packet),{flag:'wx'});
  const result=await translateGemini(packet,work,{index:Number(args[args.indexOf('--index')+1]),email:args[args.indexOf('--email')+1]});
  const accepted=partitionChecked(packet,result);
  if(args.includes('--apply')&&accepted.packet.items.length){process.loadEnvFile(path.resolve('sw/web-bo/.env'));await applyPacket(accepted.packet,accepted.result,work);}
  console.log(JSON.stringify({event:args.includes('--apply')?'applied':'validated',request_id:packet.request_id,items:accepted.packet.items.length,held:accepted.flagged.length}));
}
