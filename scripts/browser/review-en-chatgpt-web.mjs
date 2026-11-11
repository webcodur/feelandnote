// Standard ChatGPT web composer; public review text only, no API calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {AsideClient} from '../../.agents/skills/aside-browser/scripts/aside-client.mjs';
import {sessionDirectory,textOf} from '../../.agents/skills/aside-browser/scripts/browser-helpers.mjs';
import {openedTabInWindow,translationPrompt,parseTranslation} from './review-en-gemini.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function stitchTranslationContinuation(packet,partial,continuation){
  const header=`[[REQ:${packet.request_id}]]`;
  const clean=s=>s.trim().replace(/\r\n?/g,'\n');
  partial=clean(partial);continuation=clean(continuation);
  if(!partial.startsWith(header)||partial.endsWith('[[CHECKED]]')||!continuation.startsWith(header))throw Error('Continuation request mismatch');
  const numbers=[...partial.matchAll(/^\[\[(\d+)\]\]/gm)];
  if(!numbers.length||numbers.some((n,i)=>Number(n[1])!==i+1))throw Error('Invalid partial paragraph order');
  const last=numbers.at(-1),body=continuation.slice(header.length).trim();
  if(!body.startsWith(`[[${last[1]}]]`))throw Error('Continuation must restart its last partial paragraph');
  return partial.slice(0,last.index).trimEnd()+'\n\n'+body;
}

export async function translateChatGPTWeb(packet,work,{
  profile='u2',expectedWindowId,anchorTargetId,expectedIdentity='feelnnote',pollMs=15000,openLock=operation=>operation(),
  parseResult=(packet,text)=>parseTranslation(packet,text,{restoreParagraphLayout:true,isolateItems:true}),
}={}){
  if(!Number.isInteger(expectedWindowId)||!anchorTargetId||!expectedIdentity)throw Error('Owned window and signed-in identity required');
  if(!Number.isInteger(pollMs)||pollMs<5000||pollMs>30000)throw Error('Invalid polling interval');
  const prompt=translationPrompt(packet).prompt.replace('화자, 인칭, 주어, 행위자, 영향을 받은 사람, 직접 인용과 수치를 정확히 보존하세요.','화자, 인칭, 주어, 행위자, 영향을 받은 사람, 직접 인용과 수치를 정확히 보존하세요. 성별이 밝혀지지 않은 일반인에게 임의의 성별을 붙이지 말고 they/their를 쓰세요. 외적 규모의 성장을 국제적 성장으로 바꾸는 식의 사실 추가도 금지합니다.').replace('마크다운 코드블록이나 설명은 쓰지 마세요.','번호·본문·검수 표시 전체를 하나의 text 코드블록 안에 출력하세요. 코드블록 밖의 설명은 쓰지 마세요.'),client=new AsideClient({account:profile});
  let complete=false,sent=false;
  try{
    await client.ready;
    const session=await sessionDirectory(client),input=path.join(session,packet.request_id+'.txt');
    const response=path.join(session,packet.request_id+'.response.txt');
    await fs.writeFile(input,prompt,{flag:'wx'});
    const repl=async code=>textOf(await client.callRepl(code,'Translate public book reviews in standard ChatGPT web'));
    const json=async expression=>{
      const out=await repl(`console.log('__WEB_CHAT__'+JSON.stringify(await (${expression})));`);
      const line=out.split(/\r?\n/).findLast(x=>x.startsWith('__WEB_CHAT__'));
      if(!line)throw Error('Missing web chat state');
      return JSON.parse(line.slice('__WEB_CHAT__'.length));
    };
    await openLock(async()=>{
      const before=await json('listBrowserTabs()');
      if(!before.some(t=>t.targetId===anchorTargetId&&t.windowId===expectedWindowId))throw Error('Owned chat window anchor disappeared');
      await repl(`await attachBrowserTab(${JSON.stringify(anchorTargetId)});var webReviewPage=await openTab('https://chatgpt.com/');await sleep(1500);`);
      openedTabInWindow(before,await json('listBrowserTabs()'),expectedWindowId,await json('webReviewPage.evaluate(()=>location.href)'));
    let mode;
    for(let attempt=0;attempt<20;attempt++){
      mode=await json(`webReviewPage.evaluate(()=>({url:location.href,profile:[...document.querySelectorAll('button[aria-label="프로필 메뉴 열기"]')].filter(e=>e.getClientRects().length).map(e=>e.textContent).join(' '),think:[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&e.textContent.trim()==='Think')?.getAttribute('aria-pressed'),work:[...document.querySelectorAll('button,[role="radio"]')].some(e=>e.getClientRects().length&&e.textContent.trim()==='Work'),composer:!!document.querySelector('[contenteditable="true"][role="textbox"][aria-label="ChatGPT에게 물어보세요"]')}))`);
      if(mode.url!=='https://chatgpt.com/')throw Error('ChatGPT requires account attention; nothing submitted');
      if(mode.profile.includes(expectedIdentity)&&mode.profile.includes('Free')&&mode.think==='false'&&!mode.work&&mode.composer)break;
      await sleep(1000);
    }
    // The verified Free web UI has no Work selector. Require its native chat
    // composer, signed-in Free profile and unpressed Think control together.
    if(!mode.profile.includes(expectedIdentity)||!mode.profile.includes('Free')||mode.think!=='false'||mode.work||!mode.composer){
      await fs.writeFile(path.join(work,packet.request_id+'.account-state.json'),JSON.stringify(mode),{flag:'wx'});
      throw Error('Standard signed-in Free chat not confirmed; nothing submitted');
    }
    const cooldown=await json(`webReviewPage.evaluate(()=>document.querySelector('main')?.innerText.match(/ChatGPT 안정성을 위해 간단한 확인[^\\n]*(?:\\n[^\\n]*)?/i)?.[0]||null)`);
    if(cooldown)throw Error('Web Chat limit/verification: '+cooldown);
    await repl(`var webReviewPrompt=(await fs.readFile(${JSON.stringify(input)},'utf8')).replace(/[\\r\\n]+/g,' ');try{await webReviewPage.locator('[contenteditable="true"][role="textbox"]').fill(webReviewPrompt);}catch(e){if(!String(e).includes('Fill did not set the expected contenteditable value'))throw e;}`);
    const ready=await json(`webReviewPage.evaluate(()=>({input:document.querySelector('[contenteditable="true"][role="textbox"]')?.innerText,send:[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='보내기'&&!e.disabled&&e.getClientRects().length)}))`);
    const normalize=t=>t.replace(/\s+/g,' ').trim();
    if(!ready.input||normalize(ready.input)!==normalize(prompt)||!ready.send)throw Error('Chat input not ready; nothing submitted');
    await fs.writeFile(path.join(work,packet.request_id+'.delivery.json'),JSON.stringify({session,responsePath:response,profile,windowId:expectedWindowId,request_id:packet.request_id,provider:'chatgpt-web',mode:'standard-free-chat'}),{flag:'wx'});
    sent=true;
    let receipt;
    for(let attempt=0;attempt<3;attempt++){
      await repl("await webReviewPage.getByRole('button',{name:'보내기',exact:true}).click();");
      await sleep(5000);
      receipt=await json(`webReviewPage.evaluate(()=>({url:location.href,input:document.querySelector('[contenteditable="true"][role="textbox"]')?.innerText||'',busy:[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='중지')}))`);
      if(receipt.url.startsWith('https://chatgpt.com/c/')||receipt.busy||!receipt.input.trim())break;
      if(receipt.url!=='https://chatgpt.com/'||normalize(receipt.input)!==normalize(prompt))throw Error('Web chat submission state changed; existing tab retained');
    }
    if(!receipt.url.startsWith('https://chatgpt.com/c/')&&!receipt.busy&&receipt.input.trim())throw Error('Web chat submission not accepted; existing draft retained');
    await fs.writeFile(path.join(work,packet.request_id+'.submitted.json'),JSON.stringify({url:receipt.url,busy:receipt.busy}),{flag:'wx'});
    });
    let previous='',stable=0,lastChange=Date.now(),partialRaw='',continuations=0;
    for(let attempt=0;attempt<80;attempt++){
      await sleep(attempt===0?5000:pollMs);
      const state=await json(`webReviewPage.evaluate(header=>{const r=document.querySelector('[role="region"][aria-label="대화"]');const all=r?[...r.querySelectorAll('pre,code')].filter(e=>e.innerText?.trim().startsWith(header)):[];const latest=all.at(-1)?.innerText?.trim()||'';const alerts=[...document.querySelectorAll('[role="alert"],[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText).join(' ');return{url:location.href,busy:[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='중지'),chars:latest.includes('[[CHECKED]]')?latest.length:0,partialChars:latest.length,blocked:/사용 한도에 도달|메시지 한도에 도달|비정상적인 트래픽|unusual traffic|usage limit reached|로봇이 아닙니다/i.test(alerts),login:[...document.querySelectorAll('button')].some(e=>e.getClientRects().length&&e.textContent.trim()==='로그인')};},${JSON.stringify('[[REQ:'+packet.request_id+']]')})`);
      await fs.writeFile(path.join(work,packet.request_id+'.state.json'),JSON.stringify(state));
      if(state.blocked||state.login||!(state.url==='https://chatgpt.com/'||state.url.startsWith('https://chatgpt.com/c/')))throw Error('Web Chat limit/verification; stopped without account switching');
      const key=state.url+':'+state.chars+':'+state.partialChars+':'+state.busy;
      if(key!==previous){lastChange=Date.now();stable=0;}else if(!state.busy&&state.partialChars)stable++;
      previous=key;
      if(!state.busy&&!state.chars&&state.partialChars&&stable>=2){
        if(continuations>=2)throw Error('Web Chat response repeatedly truncated; saved partial retained');
        const raw=await json(`webReviewPage.evaluate(header=>[...document.querySelector('[role="region"][aria-label="대화"]').querySelectorAll('pre,code')].filter(e=>e.innerText?.trim().startsWith(header)).at(-1)?.innerText.trim(),${JSON.stringify('[[REQ:'+packet.request_id+']]')})`);
        partialRaw=partialRaw?stitchTranslationContinuation(packet,partialRaw,raw):raw;
        const markers=[...partialRaw.matchAll(/^\[\[(\d+)\]\]/gm)];
        if(!markers.length||markers.some((m,i)=>Number(m[1])!==i+1))throw Error('Invalid truncated response; nothing resubmitted');
        await fs.writeFile(path.join(work,packet.request_id+'.partial-response.txt'),partialRaw);
        const restart=Number(markers.at(-1)[1]),last=translationPrompt(packet).blocks.length;
        const followup=`직전 응답이 중간에서 끊겼습니다. 원래 입력을 확인하여 [[${restart}]] 문단을 첫 문장부터 다시 쓰고 [[${last}]]까지 번역을 완성하세요. 번호·TITLE 자리표시자·화자·인칭을 보존하고 원문과 대조 검수 후 [[CHECKED]]로 끝내세요. 첫 줄은 [[REQ:${packet.request_id}]], 전체 응답은 하나의 text 코드블록으로 쓰세요.`;
        await openLock(async()=>{
          const inputState=await json(`webReviewPage.evaluate(()=>({url:location.href,input:document.querySelector('[contenteditable="true"][role="textbox"]')?.innerText||'',composer:!!document.querySelector('[contenteditable="true"][role="textbox"]')}))`);
          if(!inputState.url.startsWith('https://chatgpt.com/c/')||inputState.input.trim()||!inputState.composer)throw Error('Continuation input not ready; existing tab retained');
          await repl(`var webContinue=${JSON.stringify(followup)};try{await webReviewPage.locator('[contenteditable="true"][role="textbox"]').fill(webContinue);}catch(e){if(!String(e).includes('Fill did not set the expected contenteditable value'))throw e;}`);
          const actual=await json(`webReviewPage.evaluate(()=>({input:document.querySelector('[contenteditable="true"][role="textbox"]')?.innerText,send:[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='보내기'&&!e.disabled)}))`);
          if(!actual.input||normalize(actual.input)!==normalize(followup)||!actual.send)throw Error('Continuation draft mismatch; nothing submitted');
          await repl("await webReviewPage.getByRole('button',{name:'보내기',exact:true}).click();");
          await sleep(1500);
          const receipt=await json(`webReviewPage.evaluate(()=>({input:document.querySelector('[contenteditable="true"][role="textbox"]')?.innerText||'',busy:[...document.querySelectorAll('button')].some(e=>e.getAttribute('aria-label')==='중지')}))`);
          if(receipt.input.trim()&&!receipt.busy)throw Error('Continuation submission not accepted; existing draft retained');
          await fs.writeFile(path.join(work,packet.request_id+'.continuation-'+(++continuations)+'.json'),JSON.stringify({restart,last}),{flag:'wx'});
        });
        previous='';stable=0;lastChange=Date.now();continue;
      }
      if(!state.busy&&stable>=1){
        await repl(`var webAnswer=await webReviewPage.evaluate(header=>{const r=document.querySelector('[role="region"][aria-label="대화"]');const nodes=[...r.querySelectorAll('div,section,pre,code')].filter(e=>e.innerText?.trim().startsWith(header)&&e.innerText.includes('[[CHECKED]]')).sort((a,b)=>a.innerText.length-b.innerText.length);if(!nodes.length)throw Error('Current assistant answer missing');const text=nodes[0].innerText.trim();return text.slice(0,text.lastIndexOf('[[CHECKED]]')+'[[CHECKED]]'.length);},${JSON.stringify('[[REQ:'+packet.request_id+']]')});await fs.writeFile(${JSON.stringify(response)},webAnswer);`);
        const raw=await fs.readFile(response,'utf8');
        await fs.writeFile(path.join(work,packet.request_id+'.response.txt'),raw,{flag:'wx'});
        complete=true;
        const combined=partialRaw?stitchTranslationContinuation(packet,partialRaw,raw):raw;
        if(partialRaw)await fs.writeFile(path.join(work,packet.request_id+'.combined-response.txt'),combined,{flag:'wx'});
        const result=parseResult(packet,combined);
        await fs.writeFile(path.join(work,packet.request_id+'.result.json'),JSON.stringify(result),{flag:'wx'});
        return result;
      }
      if(Date.now()-lastChange>10*60*1000)throw Error('Web Chat stalled; existing conversation retained');
    }
    throw Error('Web Chat incomplete; no result applied');
  }finally{
    if(complete||!sent)await openLock(()=>client.callRepl('await closeTab(webReviewPage);')).catch(()=>{});
    await client.close();
  }
}
